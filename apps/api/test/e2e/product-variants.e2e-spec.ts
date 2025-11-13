import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { setupTestApp } from '../../src/test-utils';

describe('Product Variants E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let organizationId: string;

  beforeAll(async () => {
    const setup = await setupTestApp();
    app = setup.app;
    prisma = setup.prisma;
    accessToken = setup.accessToken;
    organizationId = setup.organizationId;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();
  });

  it('should create product with 3 variants', async () => {
    const response = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        sku: 'VDNT09',
        name: 'Ví da nam',
        costPrice: 150000,
        sellPrice: 250000,
        variants: [
          { name: 'D', additionalPrice: 0, stock: 10 },
          { name: 'NS', additionalPrice: 10000, stock: 5 },
          { name: 'xanhla', additionalPrice: 5000, stock: 8 },
        ],
      })
      .expect(201);

    expect(response.body.variants).toHaveLength(3);
    expect(response.body.variants[0].sku).toBe('VDNT09-D');

    const variantsInDb = await prisma.productVariant.findMany({
        where: { productId: response.body.id },
    });
    expect(variantsInDb).toHaveLength(3);
  });

  it('should update variant stock independently', async () => {
    const product = await prisma.product.create({
        data: {
            sku: 'PROD-01',
            name: 'Test Product',
            sellPrice: 100,
            costPrice: 50,
            organizationId,
        }
    });

    const variant = await prisma.productVariant.create({
        data: {
            sku: 'PROD-01-S',
            name: 'S',
            stock: 10,
            productId: product.id,
            organizationId,
        }
    });

    await request(app.getHttpServer())
      .patch(`/products/${product.id}/variants/${variant.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ stock: 20 })
      .expect(200);

    const updatedVariant = await prisma.productVariant.findUnique({
      where: { id: variant.id },
    });
    expect(updatedVariant.stock).toBe(20);
  });

  it('should enforce tenant isolation', async () => {
    const anotherSetup = await setupTestApp();

    const product = await prisma.product.create({
        data: {
            sku: 'PROD-02',
            name: 'Test Product 2',
            sellPrice: 100,
            costPrice: 50,
            organizationId,
        }
    });

    await request(app.getHttpServer())
      .get(`/products/${product.id}/variants`)
      .set('Authorization', `Bearer ${anotherSetup.accessToken}`)
      .expect(404);

    await anotherSetup.app.close();
  });
});
