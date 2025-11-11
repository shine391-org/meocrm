
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { setupTestApp } from '../src/test-utils';
import * as crypto from 'crypto';
import { OrdersService } from '../src/orders/orders.service';
import { mock, mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { OrderStatus } from '@prisma/client';

describe('ShippingWebhooksController (e2e)', () => {
  let app: INestApplication;
  const secret = process.env.SHIPPING_WEBHOOK_SECRET || 'default-secret';
  let ordersService: DeepMockProxy<OrdersService>;

  beforeAll(async () => {
    // Using the standard setupTestApp to ensure consistency
    const { app: nestApp } = await setupTestApp();
    app = nestApp;

    // We need to mock the OrdersService for this test
    ordersService = mockDeep<OrdersService>();
    app.useLogger(false); // Silence logs for this test
    app.get(OrdersService); // Ensure the original instance is created before mocking
    (app as any)._instance.get(OrdersService, { each: true }).mockImplementation(() => ordersService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const payload = { order_code: 'ORD123', status: 'delivered' };
  const body = JSON.stringify(payload);

  it('should reject a request with an invalid signature', async () => {
    return request(app.getHttpServer())
      .post('/webhooks/shipping/delivered')
      .set('Content-Type', 'application/json')
      .set('X-Partner-Signature', 'invalid-signature')
      .send(body)
      .expect(401)
      .then(res => {
        expect(res.body.code).toEqual('UNAUTHORIZED');
        expect(res.body.message).toEqual('Invalid webhook signature.');
      });
  });

  it('should accept a request with a valid signature and process it', async () => {
    const signature = crypto.createHmac('sha256', secret).update(Buffer.from(body)).digest('hex');

    // Mock the service call to avoid actual DB operations
    const mockOrder = { id: 'mock-order-id', organizationId: 'mock-org-id', status: 'SHIPPED' };
    ordersService.findOne.mockResolvedValue(mockOrder as any);
    ordersService.updateStatus.mockResolvedValue({ ...mockOrder, status: OrderStatus.COMPLETED } as any);

    return request(app.getHttpServer())
      .post('/webhooks/shipping/delivered')
      .set('Content-Type', 'application/json')
      .set('X-Partner-Signature', signature)
      .send(payload) // supertest handles stringification
      .expect(201)
      .then(res => {
        expect(res.body.received).toBe(true);
        // Verify the service was called correctly
        expect(ordersService.findOne).toHaveBeenCalledWith(payload.order_code, '');
        expect(ordersService.updateStatus).toHaveBeenCalledWith(mockOrder.id, { status: OrderStatus.COMPLETED }, mockOrder.organizationId);
      });
  });
});
