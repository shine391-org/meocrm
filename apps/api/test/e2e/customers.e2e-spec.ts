import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupTestApp, TestContext } from '../src/test-utils';

describe('Customers E2E', () => {
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
    await prisma.customer.deleteMany({});
    await prisma.organization.deleteMany({});
  });

  it('should create a customer and auto-generate code', async () => {
    const { token, organization } = await testContext.createUserAndOrg();

    const dto = { name: 'E2E Test', phone: '0901234567' };

    const { body: customer } = await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${token}`)
      .send(dto)
      .expect(201);

    expect(customer.name).toBe(dto.name);
    expect(customer.organizationId).toBe(organization.id);
    expect(customer.code).toMatch(/^KH\d{6}$/);
  });

  it('should enforce tenant isolation', async () => {
    const { token: tokenA, organization: orgA } = await testContext.createUserAndOrg('orgA');
    const { token: tokenB } = await testContext.createUserAndOrg('orgB');

    await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Customer A', phone: '0901111111' })
      .expect(201);

    const { body: customersInB } = await request(app.getHttpServer())
      .get('/customers')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    expect(customersInB.data).toHaveLength(0);
  });

  it('should update customer and segment', async () => {
    const { token, organization } = await testContext.createUserAndOrg();
    const statsService = app.get('CustomerStatsService');

    const { body: customer } = await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test', phone: '0901234567' })
      .expect(201);

    expect(customer.segment).toBe('Regular');

    await statsService.updateStatsOnOrderComplete(customer.id, 12_000_000);

    const { body: updated } = await request(app.getHttpServer())
        .get(`/customers/${customer.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

    expect(updated.segment).toBe('VIP');
  });

});
