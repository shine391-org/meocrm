import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'apps/api/src/prisma/prisma.service';
import { setupTestApp } from 'apps/api/src/test-utils';
import request from 'supertest';
import { Customer, Product, UserRole } from '@prisma/client';
import { AuthService } from 'apps/api/src/auth/auth.service';
import * as bcrypt from 'bcryptjs';

describe('OrdersController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let organizationId: string;

  // Test data
  let customer: Customer;
  let product1: Product;
  let product2: Product;

  beforeAll(async () => {
    ({ app, prisma, accessToken, organizationId } = await setupTestApp());
    await app.init();

    // Seed test data
    customer = await prisma.customer.create({
      data: {
        name: 'E2E Test Customer',
        phone: '9998887776',
        code: 'KH999999',
        organizationId,
      },
    });

    product1 = await prisma.product.create({
      data: {
        name: 'E2E Test Product 1',
        sku: 'E2E-P-001',
        sellPrice: 100000,
        stock: 100,
        organizationId,
      },
    });

    product2 = await prisma.product.create({
      data: {
        name: 'E2E Test Product 2',
        sku: 'E2E-P-002',
        sellPrice: 50000,
        stock: 50,
        organizationId,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.order.deleteMany({ where: { organizationId } });
    await prisma.customer.deleteMany({ where: { organizationId } });
    await prisma.product.deleteMany({ where: { organizationId } });
    await app.close();
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
  });

  describe('Order Lifecycle', () => {
    let orderId: string;

    it('POST /orders -> should create a new order', async () => {
      const createOrderDto = {
        customerId: customer.id,
        items: [{ productId: product1.id, quantity: 1 }],
        paymentMethod: 'CASH',
        shipping: 0,
        discount: 0,
      };

      const { body } = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createOrderDto)
        .expect(201);

      expect(body.code).toMatch(/^ORD\d{3}$/);
      expect(body.total).toBe(110000); // 100k (subtotal) + 10k (tax)
      orderId = body.id;
    });

    it('should have updated customer stats', async () => {
      const updatedCustomer = await prisma.customer.findUnique({
        where: { id: customer.id },
      });
      expect(updatedCustomer?.totalSpent).toBe(110000);
      expect(updatedCustomer?.lastOrderAt).not.toBeNull();
    });

    it('PATCH /orders/:id/status -> should allow a valid status transition', async () => {
      await request(app.getHttpServer())
        .patch(`/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'CONFIRMED' })
        .expect(200);
    });

    it('PATCH /orders/:id/status -> should reject an invalid status transition', async () => {
      await request(app.getHttpServer())
        .patch(`/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'DELIVERED' }) // Invalid: CONFIRMED -> DELIVERED
        .expect(400);
    });
  });

  describe('Calculation Logic', () => {
    it('should calculate order totals correctly', async () => {
      const dto = {
        customerId: customer.id,
        items: [
          { productId: product1.id, quantity: 2 }, // 100k * 2 = 200k
          { productId: product2.id, quantity: 1 }, // 50k * 1 = 50k
        ],
        paymentMethod: 'CASH',
        shipping: 30000,
        discount: 10000,
      };

      const { body } = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(dto)
        .expect(201);

      // subtotal = 200k + 50k = 250k
      // tax = 250k * 0.1 = 25k
      // total = 250k + 25k + 30k - 10k = 295k
      expect(body.subtotal).toBe(250000);
      expect(body.tax).toBe(25000);
      expect(body.total).toBe(295000);
    });
  });

  describe('Multi-Tenancy', () => {
    let orgBToken: string;
    let orgBCustomer: Customer;

    beforeAll(async () => {
      // Create a second organization and user
      const authService = app.get<AuthService>(AuthService);
      const orgB = await prisma.organization.create({
        data: { name: 'Org B E2E', code: `E2E_B_${Date.now()}` },
      });
      const hashedPassword = await bcrypt.hash('passwordB', 10);
      const userB = await prisma.user.create({
        data: {
          email: `user-b-${Date.now()}@e2e.com`,
          name: 'User B',
          password: hashedPassword,
          organizationId: orgB.id,
          role: UserRole.OWNER,
        },
      });
      const { accessToken } = await authService.login({
        email: userB.email,
        password: 'passwordB',
      } as any);
      orgBToken = accessToken;

      orgBCustomer = await prisma.customer.create({
        data: {
          name: 'Customer in Org B',
          phone: '1112223334',
          code: 'KHB999',
          organizationId: orgB.id,
        },
      });
    });

    it('should NOT allow creating an order in Org B using a product from Org A', async () => {
      const dto = {
        customerId: orgBCustomer.id,
        items: [{ productId: product1.id, quantity: 1 }], // product1 belongs to Org A
        paymentMethod: 'CASH',
      };

      const { body } = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${orgBToken}`) // Authenticated as Org B user
        .send(dto)
        .expect(404);

      expect(body.message).toContain(`Product ${product1.id} not found`);
    });
  });
});
