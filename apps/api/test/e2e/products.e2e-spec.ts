
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { setupTestApp } from '../../src/test-utils';
import { CreateProductDto } from '../../src/products/dto/create-product.dto';

describe('Products E2E', () => {
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
    // Clean up database before each test
    await prisma.orderItem.deleteMany({ where: { organizationId } });
    await prisma.order.deleteMany({ where: { organizationId } });
    await prisma.productVariant.deleteMany({ where: { organizationId } });
    await prisma.product.deleteMany({ where: { organizationId } });
    await prisma.category.deleteMany({ where: { organizationId } });
  });

  const createProductDto = {
    sku: 'TEST-001',
    name: 'Test Product',
    description: 'A product for testing purposes',
    sellPrice: 100,
    costPrice: 50,
    stock: 10,
    isActive: true,
  };

  it('should create a new product successfully', async () => {
    const response = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(createProductDto)
      .expect(201);

    expect(response.body).toMatchObject({
      ...createProductDto,
      costPrice: String(createProductDto.costPrice),
      sellPrice: String(createProductDto.sellPrice),
      organizationId,
    });
    const productInDb = await prisma.product.findUnique({ where: { id: response.body.id } });
    expect(productInDb).not.toBeNull();
  });

  it('should get a list of products', async () => {
    await prisma.product.create({ data: { ...createProductDto, organizationId } });

    const response = await request(app.getHttpServer())
      .get('/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe(createProductDto.name);
  });

  it('should get a single product by ID', async () => {
    const product = await prisma.product.create({ data: { ...createProductDto, organizationId } });

    const response = await request(app.getHttpServer())
      .get(`/products/${product.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.id).toBe(product.id);
    expect(response.body.name).toBe(createProductDto.name);
  });

  it('should update a product successfully', async () => {
    const product = await prisma.product.create({ data: { ...createProductDto, organizationId } });
    const updatedName = 'Updated Test Product';

    const response = await request(app.getHttpServer())
      .patch(`/products/${product.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: updatedName })
      .expect(200);

    expect(response.body.name).toBe(updatedName);
    const productInDb = await prisma.product.findUnique({ where: { id: product.id } });
    expect(productInDb.name).toBe(updatedName);
  });

  it('should soft-delete a product', async () => {
    const product = await prisma.product.create({ data: { ...createProductDto, organizationId } });

    await request(app.getHttpServer())
      .delete(`/products/${product.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    const productInDb = await prisma.product.findUnique({ where: { id: product.id } });
    expect(productInDb.deletedAt).not.toBeNull();
  });

  it('should not find a soft-deleted product with findOne', async () => {
    const product = await prisma.product.create({ data: { ...createProductDto, organizationId } });
    await prisma.product.update({ where: { id: product.id }, data: { deletedAt: new Date() } });

    await request(app.getHttpServer())
      .get(`/products/${product.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('should enforce tenant isolation on findOne', async () => {
    const product = await prisma.product.create({ data: { ...createProductDto, organizationId } });
    const anotherSetup = await setupTestApp({ skipCleanup: true });

    await request(app.getHttpServer())
      .get(`/products/${product.id}`)
      .set('Authorization', `Bearer ${anotherSetup.accessToken}`)
      .expect(404);

    await anotherSetup.app.close();
  });
});
