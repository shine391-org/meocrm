import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupTestOrganizations, setupTestApp, TestContext } from '../../src/test-utils';

describe('Suppliers E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testContext: TestContext;

  beforeAll(async () => {
    testContext = await setupTestApp();
    app = testContext.app;
    prisma = testContext.prisma;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanupTestOrganizations(prisma);
  });

  it('should create supplier with auto-code', async () => {
    const { token } = await testContext.createUserAndOrg();
    const response = await request(app.getHttpServer())
      .post('/suppliers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Công ty ABC',
        phone: '0281234567',
        email: 'abc@example.com',
        address: '123 Main St',
        taxCode: '0123456789',
      })
      .expect(201);
    expect(response.body.code).toMatch(/^DT\\d{6}$/);
    expect(response.body.name).toBe('Công ty ABC');
  });

  it('should enforce tenant isolation', async () => {
    const { token: tokenA } = await testContext.createUserAndOrg('orgA');
    const { token: tokenB } = await testContext.createUserAndOrg('orgB');

    await request(app.getHttpServer())
      .post('/suppliers')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Supplier A', phone: '111' })
      .expect(201);

    const { body: suppliersInB } = await request(app.getHttpServer())
      .get('/suppliers')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(suppliersInB.data).toHaveLength(0);
  });

  it('should search suppliers', async () => {
    const { token } = await testContext.createUserAndOrg();
    await request(app.getHttpServer())
      .post('/suppliers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'ABC Corp', phone: '111' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/suppliers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'XYZ Ltd', phone: '222' })
      .expect(201);

    const results = await request(app.getHttpServer())
      .get('/suppliers?search=ABC')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(results.body.data).toHaveLength(1);
    expect(results.body.data[0].name).toBe('ABC Corp');
  });

  it('should soft delete a supplier', async () => {
    const { token } = await testContext.createUserAndOrg();

    const { body: supplier } = await request(app.getHttpServer())
      .post('/suppliers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'To be deleted', phone: '123' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/suppliers/${supplier.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    const { body: suppliers } = await request(app.getHttpServer())
      .get('/suppliers')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(suppliers.data.find((s: any) => s.id === supplier.id)).toBeUndefined();
  });
});
