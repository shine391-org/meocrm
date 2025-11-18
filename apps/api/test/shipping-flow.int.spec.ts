import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  cleanupDatabase,
  createCustomer,
  createOrganization,
  createProduct,
  getAdminAccessToken,
} from '../src/test-utils';
import { PrismaService } from '../src/prisma/prisma.service';
import { OrderStatus, ShippingStatus, Prisma } from '@prisma/client';

describe('Shipping flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    moduleRef = testingModule;
    app = testingModule.createNestApplication();
    await app.init();
    prisma = testingModule.get(PrismaService);
  });

  beforeEach(async () => {
    await cleanupDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
    await moduleRef.close();
  });

  const seedOrderWithPartner = async () => {
    const organization = await createOrganization(prisma);
    const organizationId = organization.id;
    const adminAccessToken = await getAdminAccessToken(app, organizationId);
    const customer = await createCustomer(prisma, organizationId);
    const product = await createProduct(prisma, organizationId, { sellPrice: 200000 });

    const branch = await prisma.branch.create({
      data: {
        organizationId,
        name: 'Main Branch',
        address: '123 Warehouse St',
        phone: '0909000000',
      },
    });

    const orderData: Prisma.OrderUncheckedCreateInput = {
      organizationId,
      customerId: customer.id,
      branchId: branch.id,
      code: `ORD-SHIP-${Date.now()}`,
      subtotal: 200000,
      tax: 0,
      shipping: 0,
      discount: 0,
      total: 200000,
      isPaid: false,
      paidAmount: 0,
      status: OrderStatus.PROCESSING,
      paymentMethod: 'CASH',
      items: {
        create: [
          {
            organizationId,
            productId: product.id,
            quantity: 1,
            unitPrice: 200000,
            subtotal: 200000,
          },
        ],
      },
    };

    const order = await prisma.order.create({
      data: orderData,
    });

    const partner = await prisma.shippingPartner.create({
      data: {
        organizationId,
        code: `GHN-${Date.now()}`,
        name: 'GHN Test',
        email: 'ops@ghn.test',
        phone: '0900111222',
      },
    });

    await prisma.setting.createMany({
      data: [
        { organizationId, key: 'shipping.baseFee', value: 15000 },
        { organizationId, key: 'shipping.weightRate', value: 2000 },
        { organizationId, key: 'shipping.freeThreshold', value: 0 },
        {
          organizationId,
          key: 'shipping.channelMultipliers',
          value: { GHN: 1 },
        },
      ],
    });

    return { organizationId, adminAccessToken, order, partner };
  };

  const createShippingOrderViaApi = async ({
    token,
    orderId,
    partnerId,
    overrides = {},
  }: {
    token: string;
    orderId: string;
    partnerId: string;
    overrides?: Record<string, unknown>;
  }) => {
    const httpServer = app.getHttpServer();
    const payload = {
      orderId,
      partnerId,
      trackingCode: `TRK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      recipientName: 'Nguyen Van A',
      recipientPhone: '0909998888',
      recipientAddress: '456 Delivery St',
      recipientProvince: 'HCM',
      codAmount: 120000,
      weight: 1500,
      channel: 'GHN',
      ...overrides,
    };

    const response = await request(httpServer)
      .post('/shipping/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);

    return response.body.data as { id: string };
  };

  it('creates shipping order, settles COD on delivery, and keeps tenant isolation', async () => {
    const { organizationId, adminAccessToken, order, partner } = await seedOrderWithPartner();
    const httpServer = app.getHttpServer();

    const createdOrder = await createShippingOrderViaApi({
      token: adminAccessToken,
      orderId: order.id,
      partnerId: partner.id,
    });
    const createdOrderId = createdOrder.id;
    expect(createdOrderId).toBeDefined();

    const partnerAfterCreate = await prisma.shippingPartner.findUnique({ where: { id: partner.id } });
    expect(Number(partnerAfterCreate?.debtBalance)).toBeCloseTo(120000);

    const orderAfterShip = await prisma.order.findUnique({ where: { id: order.id } });
    expect(orderAfterShip?.status).toBe(OrderStatus.SHIPPED);

    await request(httpServer)
      .patch(`/shipping/orders/${createdOrderId}/status`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ status: ShippingStatus.PICKING_UP })
      .expect(200);

    await request(httpServer)
      .patch(`/shipping/orders/${createdOrderId}/status`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ status: ShippingStatus.IN_TRANSIT })
      .expect(200);

    const updateResponse = await request(httpServer)
      .patch(`/shipping/orders/${createdOrderId}/status`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ status: ShippingStatus.DELIVERED, collectedCodAmount: 120000 })
      .expect(200);

    expect(updateResponse.body.data.status).toBe(ShippingStatus.DELIVERED);

    const partnerAfterDelivery = await prisma.shippingPartner.findUnique({ where: { id: partner.id } });
    expect(Number(partnerAfterDelivery?.debtBalance)).toBeCloseTo(0);

    const orderAfterDelivery = await prisma.order.findUnique({ where: { id: order.id } });
    expect(orderAfterDelivery?.status).toBe(OrderStatus.DELIVERED);

    const otherOrg = await createOrganization(prisma);
    const foreignToken = await getAdminAccessToken(app, otherOrg.id);
    await request(httpServer)
      .get(`/shipping/orders/${createdOrderId}`)
      .set('Authorization', `Bearer ${foreignToken}`)
      .expect(404);

    const listResponse = await request(httpServer)
      .get('/shipping/orders')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .query({ status: ShippingStatus.DELIVERED })
      .expect(200);

    expect(Array.isArray(listResponse.body.data)).toBe(true);
    expect(listResponse.body.data[0].status).toBe(ShippingStatus.DELIVERED);
    expect(listResponse.body.data[0].order.id).toBe(order.id);
  });

  it('reverts orders to PROCESSING when shipment fails', async () => {
    const { adminAccessToken, order, partner } = await seedOrderWithPartner();
    const httpServer = app.getHttpServer();

    const shippingOrder = await createShippingOrderViaApi({
      token: adminAccessToken,
      orderId: order.id,
      partnerId: partner.id,
      overrides: { codAmount: 50000 },
    });

    const debtAfterCreate = await prisma.shippingPartner.findUnique({ where: { id: partner.id } });
    expect(Number(debtAfterCreate?.debtBalance)).toBeCloseTo(50000);

    const failResponse = await request(httpServer)
      .patch(`/shipping/orders/${shippingOrder.id}/status`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ status: ShippingStatus.FAILED })
      .expect(200);

    expect(failResponse.body.data.status).toBe(ShippingStatus.FAILED);

    const orderAfterFail = await prisma.order.findUnique({ where: { id: order.id } });
    expect(orderAfterFail?.status).toBe(OrderStatus.PROCESSING);

    const partnerAfterFail = await prisma.shippingPartner.findUnique({ where: { id: partner.id } });
    expect(Number(partnerAfterFail?.debtBalance)).toBeCloseTo(50000);
  });

  it('cancels orders when shipments are returned', async () => {
    const { adminAccessToken, order, partner } = await seedOrderWithPartner();
    const httpServer = app.getHttpServer();

    const shippingOrder = await createShippingOrderViaApi({
      token: adminAccessToken,
      orderId: order.id,
      partnerId: partner.id,
      overrides: { codAmount: 0 },
    });

    await request(httpServer)
      .patch(`/shipping/orders/${shippingOrder.id}/status`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ status: ShippingStatus.FAILED })
      .expect(200);

    const returnedResponse = await request(httpServer)
      .patch(`/shipping/orders/${shippingOrder.id}/status`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ status: ShippingStatus.RETURNED })
      .expect(200);

    expect(returnedResponse.body.data.status).toBe(ShippingStatus.RETURNED);

    const orderAfterReturn = await prisma.order.findUnique({ where: { id: order.id } });
    expect(orderAfterReturn?.status).toBe(OrderStatus.CANCELLED);

    const shippingAfterReturn = await prisma.shippingOrder.findUnique({ where: { id: shippingOrder.id } });
    expect(shippingAfterReturn?.status).toBe(ShippingStatus.RETURNED);
  });
});
