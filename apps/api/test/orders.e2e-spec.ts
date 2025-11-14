import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { Customer, Product } from '@prisma/client';
import { cleanupTestOrganizations } from '../src/test-utils';

describe('Orders E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let organizationId: string;
  const TEST_ORG_CODE_PREFIX = 'E2E-ORDERS-';

  // Test data
  let customer: Customer;
  let product1: Product;
  let product2: Product;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule], // Import FULL AppModule
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get<PrismaService>(PrismaService);

    await cleanupTestOrganizations(prisma, TEST_ORG_CODE_PREFIX);

    // Create an organization first to get a valid code
    const org = await prisma.organization.create({
      data: {
        name: 'Test Org E2E',
        slug: `test-org-orders-${Date.now()}`,
        code: `${TEST_ORG_CODE_PREFIX}${Date.now()}`,
      },
    });
    organizationId = org.id; // CRITICAL: Assign organizationId here

    // Register and login to get auth token
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `test-${Date.now()}@example.com`,
        password: 'Password123',
        name: 'Test User',
        organizationCode: org.code,
      })
      .expect(201);

    authToken = registerRes.body.accessToken;

    // Seed test data after we have organizationId
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
        costPrice: 80000,
        sellPrice: 100000,
        stock: 100,
        organizationId,
      },
    });

    product2 = await prisma.product.create({
      data: {
        name: 'E2E Test Product 2',
        sku: 'E2E-P-002',
        costPrice: 40000,
        sellPrice: 50000,
        stock: 50,
        organizationId,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up order data before each test
    await prisma.orderItem.deleteMany({ where: { organizationId } });
    await prisma.order.deleteMany({ where: { organizationId } });
    // Reset customer stats
    await prisma.customer.update({
      where: { id: customer.id },
      data: { totalSpent: 0, totalOrders: 0 },
    });
  });

  it('should fail to create order without auth token', async () => {
    await request(app.getHttpServer())
      .post('/orders')
      .send({
        customerId: customer.id,
        items: [{ productId: product1.id, quantity: 1 }],
        paymentMethod: 'CASH',
      })
      .expect(401); // Unauthorized
  });

  describe('PUT /orders/:id', () => {
    it('should update order when status is PENDING', async () => {
        const { body: order } = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            customerId: customer.id,
            items: [{ productId: product1.id, quantity: 1 }],
            paymentMethod: 'CASH',
          })
          .expect(201);

        const { body } = await request(app.getHttpServer())
          .put(`/orders/${order.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ notes: 'Updated note' })
          .expect(200);

        expect(body.notes).toBe('Updated note');
      });

      it('should NOT update order when status is not PENDING', async () => {
        const { body: order } = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            customerId: customer.id,
            items: [{ productId: product1.id, quantity: 1 }],
            paymentMethod: 'CASH',
          })
          .expect(201);

        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'CONFIRMED' },
        });

        await request(app.getHttpServer())
          .put(`/orders/${order.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ notes: 'Another update' })
          .expect(400);
      });
  });

  describe('DELETE /orders/:id', () => {
    it('should soft delete order when status is PENDING', async () => {
      const { body: order } = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: customer.id,
          items: [{ productId: product1.id, quantity: 1 }],
          paymentMethod: 'CASH',
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/orders/${order.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify soft deleted
      await request(app.getHttpServer())
        .get(`/orders/${order.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should revert customer stats on delete', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: customer.id,
          items: [{ productId: product1.id, quantity: 2 }], // 200k + 20k tax = 220k
          paymentMethod: 'CASH',
        })
        .expect(201);

      const order = await prisma.order.findFirst({ where: { customerId: customer.id }});
      const orderTotal = Number(createResponse.body.total);

      const customerBefore = await prisma.customer.findUnique({
        where: { id: customer.id },
      });

      expect(Number(customerBefore?.totalSpent)).toBe(orderTotal);
      expect(customerBefore?.totalOrders).toBe(1);

      await request(app.getHttpServer())
        .delete(`/orders/${order!.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const customerAfter = await prisma.customer.findUnique({
        where: { id: customer.id },
      });
      expect(Number(customerAfter?.totalSpent)).toBe(0);
      expect(customerAfter?.totalOrders).toBe(0);
    });
  });
});
