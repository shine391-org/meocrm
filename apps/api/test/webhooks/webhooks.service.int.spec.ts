import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../../src/prisma/prisma.service';
import { WebhooksService } from '../../src/modules/webhooks/webhooks.service';
import { WebhookHMACGuard } from '../../src/modules/webhooks/webhook-hmac.guard';
import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { WebhooksModule } from '../../src/modules/webhooks/webhooks.module';

const axiosMockFactory = () => ({
  post: jest.fn().mockResolvedValue({ status: 200 }),
  interceptors: {
    response: {
      use: jest.fn((success, error) => ({ success, error })),
    },
  },
});

jest.mock('axios', () => ({
  create: jest.fn(() => axiosMockFactory()),
}));

const SECRET = 'test-webhook-secret';

async function resetDatabase(prisma: PrismaService) {
  await prisma.customerDebtSnapshot.deleteMany({});
  await prisma.commission.deleteMany({});
  await prisma.orderReturnItem.deleteMany({});
  await prisma.orderReturn.deleteMany({});
  await prisma.shippingOrder.deleteMany({});
  await prisma.shippingPartner.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.productVariant.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.branch.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.webhook.deleteMany({});
  await prisma.setting.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.organization.deleteMany({});
}

describe('WebhooksService + HMAC guard integration', () => {
  let prisma: PrismaService;
  let webhooksService: WebhooksService;
  let guard: WebhookHMACGuard;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    process.env.WEBHOOK_SECRET = SECRET;
    process.env.WEBHOOK_SECRET_KEY =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    process.env.WEBHOOK_DISABLE_RETRY = 'true';
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['apps/api/.env.test', 'apps/api/.env'],
        }),
        WebhooksModule,
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    webhooksService = moduleRef.get(WebhooksService);
    guard = moduleRef.get(WebhookHMACGuard);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await moduleRef.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  const seedOrder = async (code: string, overrides: Partial<{ status: OrderStatus }> = {}) => {
    const organization = await prisma.organization.create({
      data: {
        name: `Org ${code}`,
        slug: `${code.toLowerCase()}-slug`,
        code,
      },
    });

    const order = await prisma.order.create({
      data: {
        organizationId: organization.id,
        code: `ORD-${Date.now()}`,
        subtotal: 100000,
        tax: 0,
        shipping: 0,
        discount: 0,
        total: 100000,
        paymentMethod: 'CASH',
        status: overrides.status ?? OrderStatus.PROCESSING,
      },
    });

    return { organization, order };
  };

  const createWebhookInput = () => ({
    url: 'https://hooks.example.com/order',
    events: ['order.completed'],
    secret: 'whsec_test',
    isActive: true,
  });

  it('creates webhook records with encrypted secret and hides plaintext', async () => {
    const { organization } = await seedOrder('WEBHOOK-CRUD');

    const webhook = await webhooksService.createWebhook(createWebhookInput(), organization.id);

    expect(webhook.hasSecret).toBe(true);
    expect(webhook.url).toBe('https://hooks.example.com/order');

    const stored = await prisma.webhook.findUnique({ where: { id: webhook.id } });
    const encrypted = stored?.secretEncrypted as Record<string, unknown> | null;
    expect(encrypted).toHaveProperty('version', 'aes-256-gcm');
    expect(encrypted).not.toHaveProperty('legacySecret');
  });

  it('lists webhooks without exposing plaintext secrets', async () => {
    const { organization } = await seedOrder('WEBHOOK-LIST');
    await webhooksService.createWebhook(createWebhookInput(), organization.id);

    const webhooks = await webhooksService.listWebhooks(organization.id);
    expect(webhooks).toHaveLength(1);
    expect(webhooks[0].hasSecret).toBe(true);
    expect((webhooks[0] as any).secret).toBeUndefined();
  });

  it('updates webhook metadata and rotates secret when provided', async () => {
    const { organization } = await seedOrder('WEBHOOK-UPDATE');
    const webhook = await webhooksService.createWebhook(createWebhookInput(), organization.id);

    const updated = await webhooksService.updateWebhook(
      webhook.id,
      {
        events: ['order.completed', 'inventory.low'],
        isActive: false,
        secret: 'whsec_rotated',
      },
      organization.id,
    );

    expect(updated.events).toContain('inventory.low');
    expect(updated.isActive).toBe(false);
    expect(updated.hasSecret).toBe(true);

    const stored = await prisma.webhook.findUnique({ where: { id: webhook.id } });
    const encrypted = stored?.secretEncrypted as Record<string, unknown> | null;
    expect(encrypted).toHaveProperty('version', 'aes-256-gcm');
  });

  it('returns failure when webhook secret payload is missing fields', async () => {
    const { organization } = await seedOrder('WEBHOOK-INVALID-PAYLOAD');
    const webhook = await webhooksService.createWebhook(createWebhookInput(), organization.id);

    await prisma.webhook.update({
      where: { id: webhook.id },
      data: {
        secretEncrypted: { invalid: true } as any,
      },
    });

    const result = await webhooksService.testWebhook(webhook.id, organization.id);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Webhook secret is not configured');
  });

  it('handles decrypt failures gracefully and reports failure', async () => {
    const { organization } = await seedOrder('WEBHOOK-DECRYPT-FAIL');
    const webhook = await webhooksService.createWebhook(createWebhookInput(), organization.id);

    await prisma.webhook.update({
      where: { id: webhook.id },
      data: {
        secretEncrypted: {
          version: 'aes-256-gcm',
          iv: '',
          authTag: '',
          ciphertext: '',
        } as any,
      },
    });

    const result = await webhooksService.testWebhook(webhook.id, organization.id);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Webhook secret is not configured');
  });

  it('rejects organization mismatches when testing webhook deliveries', async () => {
    const { organization: orgA } = await seedOrder('WEBHOOK-ORG-A');
    const { organization: orgB } = await seedOrder('WEBHOOK-ORG-B');
    const webhook = await webhooksService.createWebhook(createWebhookInput(), orgA.id);

    await expect(webhooksService.testWebhook(webhook.id, orgB.id)).rejects.toThrow(NotFoundException);
  });

  it('re-encrypts legacy secrets before sending test payloads', async () => {
    const { organization } = await seedOrder('WEBHOOK-LEGACY');
    const webhook = await webhooksService.createWebhook(createWebhookInput(), organization.id);
    await prisma.webhook.update({
      where: { id: webhook.id },
      data: {
        secretEncrypted: { legacySecret: 'legacy-secret' } as any,
      },
    });

    const axiosSpy = jest
      .spyOn((webhooksService as any).axiosInstance, 'post')
      .mockResolvedValue({ data: { ok: true } });

    const result = await webhooksService.testWebhook(webhook.id, organization.id);
    expect(result.success).toBe(true);

    const stored = await prisma.webhook.findUnique({ where: { id: webhook.id } });
    expect((stored?.secretEncrypted as Record<string, unknown>).version).toBe('aes-256-gcm');

    axiosSpy.mockRestore();
  });

  it('reports outbound webhook delivery failures with sanitized messages', async () => {
    const { organization } = await seedOrder('WEBHOOK-DELIVERY-FAIL');
    const webhook = await webhooksService.createWebhook(createWebhookInput(), organization.id);
    const axiosSpy = jest
      .spyOn((webhooksService as any).axiosInstance, 'post')
      .mockRejectedValue(new Error('network down'));

    const result = await webhooksService.testWebhook(webhook.id, organization.id);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to send test webhook');

    axiosSpy.mockRestore();
  });

  it('completes orders only when organization matches payload', async () => {
    const { organization, order } = await seedOrder('WEBHOOK-OK');

    await webhooksService.handleShippingDelivered({
      event: 'shipping.delivered',
      data: { orderId: order.id, organizationId: organization.id },
    });

    const updated = await prisma.order.findUnique({ where: { id: order.id } });
    expect(updated?.status).toBe(OrderStatus.COMPLETED);
    expect(updated?.completedAt).toBeTruthy();

    await webhooksService.handleShippingDelivered({
      event: 'shipping.delivered',
      data: { orderId: order.id, organizationId: 'other-org' },
    });

    const stillCompleted = await prisma.order.findUnique({ where: { id: order.id } });
    expect(stillCompleted?.status).toBe(OrderStatus.COMPLETED);
  });

  it('warns when order is not in PROCESSING state', async () => {
    const { organization, order } = await seedOrder('WEBHOOK-WARN', { status: OrderStatus.COMPLETED });
    const warnSpy = jest.spyOn((webhooksService as any).logger, 'warn');

    await webhooksService.handleShippingDelivered({
      event: 'shipping.delivered',
      data: { orderId: order.id, organizationId: organization.id },
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('skipped'),
    );

    warnSpy.mockRestore();
  });

  it('validates HMAC signatures using the raw body buffer', async () => {
    const payload = JSON.stringify({ ping: true });
    const signature = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');

    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-meocrm-signature': signature },
          rawBody: payload,
        }),
      }),
    } as ExecutionContext;

    expect(await guard.canActivate(context)).toBe(true);
  });

  it('rejects webhook deliveries missing the signature header', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
          rawBody: 'body',
        }),
      }),
    } as ExecutionContext;

    expect(await guard.canActivate(context)).toBe(false);
  });

  it('rejects mismatched HMAC signatures', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-meocrm-signature': 'invalid' },
          rawBody: 'body',
        }),
      }),
    } as ExecutionContext;

    expect(await guard.canActivate(context)).toBe(false);
  });
});
