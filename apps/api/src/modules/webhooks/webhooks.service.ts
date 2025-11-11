import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { OrdersService } from '../../orders/orders.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly axiosInstance: AxiosInstance;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {
    this.axiosInstance = axios.create();
    this.axiosInstance.interceptors.response.use(
      (response: any) => response,
      async (error: any) => {
        const config = error.config;
        config.retryCount = config.retryCount || 0;

        if (config.retryCount < 5) {
          config.retryCount += 1;
          const backoff = Math.pow(2, config.retryCount) * 1000;
          this.logger.warn(`Retrying webhook to ${config.url} in ${backoff}ms...`);
          await new Promise((resolve) => setTimeout(resolve, backoff));
          return this.axiosInstance(config);
        }

        return Promise.reject(error);
      },
    );
  }

  @OnEvent('shipping.delivered')
  async handleShippingDelivered(payload: any) {
    this.logger.log('Handling shipping.delivered event', payload);
    const { orderId, organizationId } = payload.data;
    if (orderId && organizationId) {
      await this.prisma.order.update({
        where: { id: orderId, organizationId },
        data: {
          status: OrderStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
    }
  }

  async testWebhook(webhookId: string): Promise<{ success: boolean; message: string; deliveryId?: string }> {
    const webhook = await this.prisma.webhook.findUnique({ where: { id: webhookId } });
    if (!webhook) {
      return { success: false, message: 'Webhook not found' };
    }

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

    const secret = webhook.secret || this.configService.get<string>('WEBHOOK_SECRET');
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
}
