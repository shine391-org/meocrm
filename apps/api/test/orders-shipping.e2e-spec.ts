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

describe('Orders Shipping (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminAccessToken: string;
  let organizationId: string;
  let customerId: string;
  let productId: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await cleanupDatabase(prisma);

    const org = await createOrganization(prisma);
    organizationId = org.id;

    adminAccessToken = await getAdminAccessToken(app, org.id);
    const customer = await createCustomer(prisma, organizationId);
    customerId = customer.id;
    const product = await createProduct(prisma, organizationId, { sellPrice: 100000 });
    productId = product.id;

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
      ],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  const createOrderPayload = (channel: string, quantity: number) => ({
    customerId,
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

    expect(response.body.shipping).toBe(0);
    expect(response.body.total).toBe(500000 + (500000 * 0.1)); // subtotal + tax
  });

  it('should NOT apply free shipping for ONLINE channel when subtotal is below threshold', async () => {
    const payload = createOrderPayload('ONLINE', 4); // subtotal = 400000
    const response = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send(payload)
      .expect(201);

    // Default shipping fee from placeholder is 30000
    expect(response.body.shipping).toBe(30000);
    expect(response.body.total).toBe(400000 + (400000 * 0.1) + 30000); // subtotal + tax + shipping
  });

  it('should NOT apply free shipping for POS channel even when subtotal is above threshold', async () => {
    const payload = createOrderPayload('POS', 5); // subtotal = 500000
    const response = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send(payload)
      .expect(201);

    expect(response.body.shipping).toBe(30000);
    expect(response.body.total).toBe(500000 + (500000 * 0.1) + 30000); // subtotal + tax + shipping
  });
});
