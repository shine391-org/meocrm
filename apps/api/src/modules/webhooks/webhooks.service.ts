import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { OrdersService } from '../../orders/orders.service';
import { OrderStatus, Prisma, Webhook } from '@prisma/client';
import {
  decryptSecret,
  encryptSecret,
  isEncryptedSecretPayload,
  isLegacySecretPayload,
  loadAesKeyFromHex,
  LegacySecretPayload,
  StoredSecretPayload,
} from '../../common/crypto/crypto.util';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';

export interface WebhookResponse {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  hasSecret: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class WebhooksService implements OnModuleInit {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly webhookSecretKey: Buffer;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {
    this.axiosInstance = axios.create();
    this.axiosInstance.interceptors.response.use(
      (response: any) => response,
      async (error: any) => {
        const config = error.config || {};
        const status = error?.response?.status;
        const shouldRetry =
          (!status || status >= 500) &&
          (config.retryCount ?? 0) < 5;

        if (!shouldRetry) {
          return Promise.reject(error);
        }

        config.retryCount = (config.retryCount || 0) + 1;
        const backoff = Math.pow(2, config.retryCount) * 1000;
        this.logger.warn(`Retrying webhook to ${config.url} in ${backoff}ms (attempt ${config.retryCount})...`);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        return this.axiosInstance(config);
      },
    );

    this.webhookSecretKey = loadAesKeyFromHex(this.configService.get<string>('WEBHOOK_SECRET_KEY'));
  }

  async onModuleInit() {
    await this.backfillEncryptedSecrets();
  }

  @OnEvent('shipping.delivered')
  async handleShippingDelivered(payload: any) {
    this.logger.log('Handling shipping.delivered event', payload);
    const { orderId, organizationId } = payload.data;
    if (orderId && organizationId) {
      const result = await this.prisma.order.updateMany({
        where: { id: orderId, organizationId, status: OrderStatus.PROCESSING },
        data: {
          status: OrderStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
      if (result.count === 0) {
        this.logger.warn(
          `shipping.delivered skipped: order ${orderId} in org ${organizationId} is not in PROCESSING state`,
        );
      }
    } else {
      this.logger.warn('shipping.delivered payload missing orderId or organizationId');
    }
  }

  async listWebhooks(organizationId: string): Promise<WebhookResponse[]> {
    const webhooks = await this.prisma.webhook.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
    return webhooks.map((webhook) => this.mapWebhookResponse(webhook));
  }

  async createWebhook(dto: CreateWebhookDto, organizationId: string): Promise<WebhookResponse> {
    const webhook = await this.prisma.webhook.create({
      data: {
        organizationId,
        url: dto.url,
        events: dto.events,
        isActive: dto.isActive ?? true,
        secretEncrypted: this.encryptSecretValue(dto.secret),
      },
    });
    return this.mapWebhookResponse(webhook);
  }

  async updateWebhook(id: string, dto: UpdateWebhookDto, organizationId: string): Promise<WebhookResponse> {
    const existing = await this.findWebhookOrThrow(id, organizationId);

    const data: Prisma.WebhookUpdateInput = {
      url: dto.url,
      events: dto.events,
      isActive: dto.isActive,
    };

    if (dto.secret) {
      data.secretEncrypted = this.encryptSecretValue(dto.secret);
    }

    const updated = await this.prisma.webhook.update({
      where: { id: existing.id },
      data,
    });

    return this.mapWebhookResponse(updated);
  }

  async testWebhook(
    webhookId: string,
    organizationId: string,
  ): Promise<{ success: boolean; message: string; deliveryId?: string }> {
    const webhook = await this.findWebhookOrThrow(webhookId, organizationId);

    const deliveryId = uuidv4();
    const payload = {
      event: 'ping',
      version: '1.0',
      organizationId: webhook.organizationId,
      data: { message: 'Test webhook payload' },
      meta: {
        traceId: uuidv4(),
        sentAt: new Date().toISOString(),
      },
    };

    const secret = await this.resolveWebhookSecret(webhook);
    if (!secret) {
      this.logger.error(`No secret found for webhook ${webhookId}`);
      return { success: false, message: 'Webhook secret is not configured' };
    }
    const signature = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');

    try {
      await this.axiosInstance.post(webhook.url, payload, {
        headers: {
          'X-MeoCRM-Signature': signature,
          'X-MeoCRM-Delivery-ID': deliveryId,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });
      this.logger.log(`Successfully sent test webhook to ${webhook.url}`);
      return { success: true, message: 'Test webhook sent successfully', deliveryId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      this.logger.error(`Failed to send test webhook to ${webhook.url}`, error instanceof Error ? error.stack : error);
      this.logger.error(`Webhook delivery failed permanently for webhook ID: ${webhookId}`);
      return { success: false, message: `Failed to send test webhook: ${errorMessage}` };
    }
  }

  private async backfillEncryptedSecrets() {
    const webhooks = await this.prisma.webhook.findMany({
      select: { id: true, secretEncrypted: true },
    });

    const legacyWebhooks = webhooks.filter((webhook) =>
      isLegacySecretPayload(this.toSecretPayload(webhook.secretEncrypted)),
    );

    if (!legacyWebhooks.length) {
      return;
    }

    await Promise.all(
      legacyWebhooks.map(async (webhook) => {
        const payload = this.toSecretPayload(webhook.secretEncrypted) as LegacySecretPayload;
        const encrypted = encryptSecret(payload.legacySecret, this.webhookSecretKey);
        await this.prisma.webhook.update({
          where: { id: webhook.id },
          data: { secretEncrypted: encrypted as unknown as Prisma.InputJsonValue },
        });
      }),
    );
  }

  private async resolveWebhookSecret(webhook: Webhook): Promise<string | null> {
    const payload = this.toSecretPayload(webhook.secretEncrypted);

    if (!payload) {
      return null;
    }

    if (isLegacySecretPayload(payload)) {
      return payload.legacySecret;
    }

    if (!isEncryptedSecretPayload(payload)) {
      return null;
    }

    try {
      return decryptSecret(payload, this.webhookSecretKey);
    } catch (error) {
      this.logger.error(`Failed to decrypt secret for webhook ${webhook.id}`, error instanceof Error ? error.stack : error);
      return null;
    }
  }

  private toSecretPayload(value: Prisma.JsonValue | null): StoredSecretPayload {
    return (value as unknown as StoredSecretPayload) ?? null;
  }

  private encryptSecretValue(secret: string): Prisma.InputJsonValue {
    const payload = encryptSecret(secret, this.webhookSecretKey);
    return payload as unknown as Prisma.InputJsonValue;
  }

  private mapWebhookResponse(webhook: Webhook): WebhookResponse {
    return {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      isActive: webhook.isActive,
      hasSecret: Boolean(this.toSecretPayload(webhook.secretEncrypted)),
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt,
    };
  }

  private async findWebhookOrThrow(id: string, organizationId: string): Promise<Webhook> {
    const webhook = await this.prisma.webhook.findFirst({
      where: { id, organizationId },
    });

    if (!webhook) {
      throw new NotFoundException({
        code: 'WEBHOOK_NOT_FOUND',
        message: `Webhook ${id} not found`,
      });
    }

    return webhook;
  }
}
