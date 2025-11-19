import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { OrderInventoryReservationStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';
import {
  createOrganization,
  createCustomer,
  createProduct,
  getAdminAccessToken,
  cleanupDatabase,
} from '../src/test-utils';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettingsService } from '../src/modules/settings/settings.service';
import { RequestContextService } from '../src/common/context/request-context.service';

describe('Orders Shipping (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let settingsService: SettingsService;
  let requestContext: RequestContextService;
  let taxRate: number;
  let defaultShippingFee: number;
  let adminAccessToken: string;
  let organizationId: string;
  let customerId: string;
  let productId: string;
  let productPrice: number;
  let branchId: string;
  let shippingPartnerId: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    settingsService = moduleFixture.get<SettingsService>(SettingsService);
    requestContext = moduleFixture.get<RequestContextService>(RequestContextService);
    await cleanupDatabase(prisma);

    const org = await createOrganization(prisma);
    organizationId = org.id;

    adminAccessToken = await getAdminAccessToken(app, org.id);
    const customer = await createCustomer(prisma, organizationId);
    customerId = customer.id;
    const product = await createProduct(prisma, organizationId, { sellPrice: 100000 });
    productId = product.id;
    productPrice = Number(product.sellPrice);

    const branch = await prisma.branch.create({
      data: {
        organizationId,
        name: 'Shipping Branch',
        address: '789 Ship St',
        phone: '0933001122',
      },
    });
    branchId = branch.id;

    await prisma.inventory.create({
      data: {
        productId,
        branchId,
        quantity: 500,
      },
    });

    const partner = await prisma.shippingPartner.create({
      data: {
        organizationId,
        code: `SHIP-${Date.now()}`,
        name: 'E2E Logistics',
        email: 'partner@example.com',
        phone: '0909000000',
      },
    });
    shippingPartnerId = partner.id;

    // Seed settings for this organization
    await prisma.setting.createMany({
      data: [
        {
          organizationId,
          key: 'shipping.freeShipThreshold',
          value: 500000,
        },
        {
          organizationId,
          key: 'shipping.applyChannels',
          value: ['ONLINE'],
        },
        {
          organizationId,
          key: 'shipping.defaultFee',
          value: 30000,
        },
        {
          organizationId,
          key: 'pricing.taxRate',
          value: 0.1,
        },
      ],
    });

    await requestContext.run(async () => {
      requestContext.setContext({
        organizationId,
        userId: 'orders-shipping-e2e',
        roles: [],
      });
      taxRate = (await settingsService.get<number>('pricing.taxRate', 0.1)) ?? 0.1;
      defaultShippingFee =
        (await settingsService.get<number>('shipping.defaultFee', 30000)) ?? 30000;
    });
  });

  afterAll(async () => {
    await app.close();
  });

  const createOrderPayload = (
    channel: string,
    quantity: number,
    options: { productId?: string; paymentMethod?: string; branchId?: string } = {},
  ) => ({
    customerId,
    branchId: options.branchId ?? branchId,
    items: [{ productId: options.productId ?? productId, quantity }],
    paymentMethod: options.paymentMethod ?? 'CASH',
    channel,
  });

  const createStockedProduct = async (price = 150000, stock = 50) => {
    const freshProduct = await createProduct(prisma, organizationId, { sellPrice: price });
    await prisma.inventory.create({
      data: {
        productId: freshProduct.id,
        branchId,
        quantity: stock,
      },
    });
    return {
      productId: freshProduct.id,
      price: Number(freshProduct.sellPrice),
      initialQuantity: stock,
    };
  };

  it('should apply free shipping for ONLINE channel when subtotal is above threshold', async () => {
    const payload = createOrderPayload('ONLINE', 5); // subtotal = 500000
    const response = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send(payload)
      .expect(201);

    const subtotal = productPrice * payload.items[0].quantity;
    const expectedTax = subtotal * taxRate;

    expect(response.body.data.shipping).toBe(0);
    expect(response.body.data.total).toBe(subtotal + expectedTax);
  });

  it('should NOT apply free shipping for ONLINE channel when subtotal is below threshold', async () => {
    const payload = createOrderPayload('ONLINE', 4); // subtotal = 400000
    const response = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send(payload)
      .expect(201);

    const subtotal = productPrice * payload.items[0].quantity;
    const expectedTax = subtotal * taxRate;

    expect(response.body.data.shipping).toBe(defaultShippingFee);
    expect(response.body.data.total).toBe(subtotal + expectedTax + defaultShippingFee);
  });

  it('should NOT apply free shipping for POS channel even when subtotal is above threshold', async () => {
    const payload = createOrderPayload('POS', 5); // subtotal = 500000
    const response = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send(payload)
      .expect(201);

    const subtotal = productPrice * payload.items[0].quantity;
    const expectedTax = subtotal * taxRate;

    expect(response.body.data.shipping).toBe(defaultShippingFee);
    expect(response.body.data.total).toBe(subtotal + expectedTax + defaultShippingFee);
  });

  it('reserves inventory on PROCESSING and releases when shipping is delivered', async () => {
    const stockedProduct = await createStockedProduct(120000, 40);
    const quantity = 2;
    const payload = createOrderPayload('ONLINE', quantity, {
      productId: stockedProduct.productId,
      paymentMethod: 'COD',
    });
    const response = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send(payload)
      .expect(201);

    const orderId = response.body.data.id as string;
    const orderTotal = Number(response.body.data.total);

    await request(app.getHttpServer())
      .patch(`/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ status: 'PROCESSING' })
      .expect(200);

    const reservations = await prisma.orderInventoryReservation.findMany({
      where: { orderId },
    });
    expect(reservations).toHaveLength(1);
    expect(reservations[0].status).toBe(OrderInventoryReservationStatus.RESERVED);

    const inventoryAfterProcessing = await prisma.inventory.findUnique({
      where: {
        productId_branchId: {
          productId: stockedProduct.productId,
          branchId,
        },
      },
    });
    expect(inventoryAfterProcessing?.quantity).toBe(stockedProduct.initialQuantity - quantity);

    const shippingOrder = await request(app.getHttpServer())
      .post('/shipping/orders')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        orderId,
        partnerId: shippingPartnerId,
        trackingCode: `TRK-${Date.now()}`,
        recipientName: 'Người nhận',
        recipientPhone: '0909000000',
        recipientAddress: '123 Ship Street',
        channel: 'ONLINE',
        codAmount: orderTotal,
        weight: 1200,
      })
      .expect(201);

    const shippingOrderId = shippingOrder.body.data.id as string;

    await request(app.getHttpServer())
      .patch(`/shipping/orders/${shippingOrderId}/status`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        status: 'DELIVERED',
        collectedCodAmount: orderTotal,
      })
      .expect(200);

    const completedOrder = await prisma.order.findUnique({ where: { id: orderId } });
    expect(completedOrder?.status).toBe('COMPLETED');
    expect(completedOrder?.isPaid).toBe(true);

    const reservationsAfter = await prisma.orderInventoryReservation.findMany({ where: { orderId } });
    expect(
      reservationsAfter.every(
        (reservation) => reservation.status === OrderInventoryReservationStatus.RELEASED,
      ),
    ).toBe(true);
  });

  it('restores inventory and returns reservations when shipping fails', async () => {
    const stockedProduct = await createStockedProduct(90000, 60);
    const quantity = 3;
    const payload = createOrderPayload('ONLINE', quantity, {
      productId: stockedProduct.productId,
    });
    const response = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send(payload)
      .expect(201);

    const orderId = response.body.data.id as string;

    await request(app.getHttpServer())
      .patch(`/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ status: 'PROCESSING' })
      .expect(200);

    const shippingOrder = await request(app.getHttpServer())
      .post('/shipping/orders')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        orderId,
        partnerId: shippingPartnerId,
        trackingCode: `TRK-FAIL-${Date.now()}`,
        recipientName: 'Người nhận',
        recipientPhone: '0909888777',
        recipientAddress: '456 Ship Lane',
        channel: 'ONLINE',
        codAmount: 0,
        weight: 800,
      })
      .expect(201);

    const shippingOrderId = shippingOrder.body.data.id as string;

    await request(app.getHttpServer())
      .patch(`/shipping/orders/${shippingOrderId}/status`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        status: 'FAILED',
        failedReason: 'Carrier lost the package',
      })
      .expect(200);

    const pendingOrder = await prisma.order.findUnique({ where: { id: orderId } });
    expect(pendingOrder?.status).toBe('PENDING');

    const inventoryAfterFailure = await prisma.inventory.findUnique({
      where: {
        productId_branchId: {
          productId: stockedProduct.productId,
          branchId,
        },
      },
    });
    expect(inventoryAfterFailure?.quantity).toBe(stockedProduct.initialQuantity);

    const reservationsAfterFailure = await prisma.orderInventoryReservation.findMany({ where: { orderId } });
    expect(
      reservationsAfterFailure.every(
        (reservation) => reservation.status === OrderInventoryReservationStatus.RETURNED,
      ),
    ).toBe(true);
  });
});
