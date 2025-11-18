import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
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

  const createOrderPayload = (channel: string, quantity: number) => ({
    customerId,
    branchId,
    items: [{ productId, quantity }],
    paymentMethod: 'CASH',
    channel,
  });

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
});
