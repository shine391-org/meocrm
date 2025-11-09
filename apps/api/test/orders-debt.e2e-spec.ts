import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { cleanupTestOrganizations } from '../src/test-utils';

describe('Orders Debt Integrity E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let customerId: string;
  let productId: string;
  let organizationId: string;
  const TEST_ORG_PREFIX = 'E2E-DEBT-';
  const RELATED_PREFIXES = ['E2E-ORDERS-'];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    await cleanupTestOrganizations(prisma, TEST_ORG_PREFIX);
    for (const prefix of RELATED_PREFIXES) {
      await cleanupTestOrganizations(prisma, prefix);
    }

    const organization = await prisma.organization.create({
      data: {
        name: 'Debt Test Org',
        code: `${TEST_ORG_PREFIX}${Date.now()}`,
      },
    });
    organizationId = organization.id;

    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `debt-${Date.now()}@example.com`,
        password: 'Password123',
        name: 'Debt Tester',
        organizationCode: organization.code,
      })
      .expect(201);

    authToken = registerRes.body.accessToken;

    const customer = await prisma.customer.create({
      data: {
        name: 'Debt Customer',
        phone: '0999888777',
        code: 'DEBT-001',
        organizationId: organization.id,
      },
    });
    customerId = customer.id;

    const product = await prisma.product.create({
      data: {
        name: 'Debt Product',
        sku: `DEBT-P-${Date.now()}`,
        costPrice: 10000,
        sellPrice: 20000,
        stock: 10,
        organizationId: organization.id,
      },
    });
    productId = product.id;
  });

  afterAll(async () => {
    await cleanupTestOrganizations(prisma, TEST_ORG_PREFIX);
    for (const prefix of RELATED_PREFIXES) {
      await cleanupTestOrganizations(prisma, prefix);
    }
    await app.close();
  });

  beforeEach(async () => {
    await prisma.orderItem.deleteMany({ where: { organizationId } });
    await prisma.order.deleteMany({ where: { organizationId } });
    await prisma.customer.update({
      where: { id: customerId },
      data: { debt: 0, totalSpent: 0, totalOrders: 0 },
    });
  });

  const createBaselineOrder = async () => {
    const response = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId,
        items: [{ productId, quantity: 2 }],
        paymentMethod: 'CASH',
      })
      .expect(201);
    return response.body;
  };

  const deleteOrder = async (orderId: string) => {
    await request(app.getHttpServer())
      .delete(`/orders/${orderId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
  };

  const expectCustomerReset = async () => {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    expect(Number(customer?.debt)).toBe(0);
    expect(Number(customer?.totalSpent)).toBe(0);
    expect(customer?.totalOrders).toBe(0);
  };

  it('restores debt correctly after shipping increase', async () => {
    const order = await createBaselineOrder();

    await request(app.getHttpServer())
      .put(`/orders/${order.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ shipping: 50000 })
      .expect(200);

    await deleteOrder(order.id);
    await expectCustomerReset();
  });

  it('restores debt correctly after discount update', async () => {
    const order = await createBaselineOrder();

    await request(app.getHttpServer())
      .put(`/orders/${order.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ discount: 15000 })
      .expect(200);

    await deleteOrder(order.id);
    await expectCustomerReset();
  });

  it('restores debt after combined shipping and discount changes', async () => {
    const order = await createBaselineOrder();

    await request(app.getHttpServer())
      .put(`/orders/${order.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ shipping: 60000, discount: 10000 })
      .expect(200);

    await deleteOrder(order.id);
    await expectCustomerReset();
  });
});
