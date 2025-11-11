import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../../src/test-utils';
import { WebhooksService } from '../../src/modules/webhooks/webhooks.service';
import { WebhookHMACGuard } from '../../src/modules/webhooks/webhook-hmac.guard';
import { ExecutionContext } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import * as crypto from 'crypto';

const SECRET = 'test-webhook-secret';

describe('WebhooksService + HMAC guard integration', () => {
  let prisma: PrismaService;
  let webhooksService: WebhooksService;
  let guard: WebhookHMACGuard;

  beforeAll(async () => {
    process.env.WEBHOOK_SECRET = SECRET;
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    webhooksService = moduleRef.get(WebhooksService);
    guard = moduleRef.get(WebhookHMACGuard);
  });

  beforeEach(async () => {
    await cleanupDatabase(prisma);
  });

  const seedOrder = async (code: string) => {
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
        status: OrderStatus.SHIPPED,
      },
    });

    return { organization, order };
  };

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
