
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupTestApp } from '../src/test-utils';
import { ReportsService } from '../src/modules/reports/reports.service';
import { Organization } from '@prisma/client';

describe('ReportsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let organizationId: string;
  let customerId: string;

  beforeAll(async () => {
    const {
      app: nestApp,
      prisma: prismaService,
      accessToken,
      organizationId: orgId
    } = await setupTestApp();

    app = nestApp;
    prisma = prismaService;
    authToken = accessToken;
    organizationId = orgId;

    const customer = await prisma.customer.create({
        data: {
            organizationId,
            code: `CUST-${Date.now()}`,
            name: 'Test Customer for Report',
            phone: '987654321'
        }
    });
    customerId = customer.id;

    // Seed an order to create some debt
    await prisma.order.create({
        data: {
            organizationId,
            customerId,
            code: `ORD-${Date.now()}`,
            subtotal: 100,
            total: 100,
            paidAmount: 50, // 50 debt
            paymentMethod: 'CASH',
            status: 'COMPLETED',
        }
    });
  });

  afterAll(async () => {
    // The cleanup is handled by setupTestApp in the next run,
    // but we can do a partial cleanup here.
    await prisma.customerDebtSnapshot.deleteMany({});
    await app.close();
  });

  it('should create snapshots via service and fetch them via API', async () => {
    // Manually trigger snapshot creation for the test organization
    const reportsService = app.get<ReportsService>(ReportsService);
    const mockOrg: Organization = {
        id: organizationId,
        name: 'Test Org',
        slug: 'test-org',
        code: 'TEST',
        createdAt: new Date(),
        updatedAt: new Date()
    };
    await reportsService['createDebtSnapshotForOrganization'](mockOrg);

    // Verify snapshot was created in DB
    const snapshots = await prisma.customerDebtSnapshot.findMany({
        where: { organizationId, customerId }
    });
    expect(snapshots.length).toBe(1);
    expect(snapshots[0].customerId).toBe(customerId);
    expect(Number(snapshots[0].debtValue)).toBe(50);

    // Fetch via API
    const response = await request(app.getHttpServer())
      .get('/reports/debt-snapshots')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ customerId: customerId })
      .expect(200);

    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.data.length).toBe(1);
    expect(response.body.data[0].customerId).toBe(customerId);
    expect(Number(response.body.data[0].debtValue)).toBe(50);
  });
});
