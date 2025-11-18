import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import {
  cleanupDatabase,
  createCustomer,
  createOrganization,
  createOrder,
  createProduct,
} from '../../src/test-utils';
import { PrismaService } from '../../src/prisma/prisma.service';
import { DebtSnapshotService } from '../../src/modules/cron/debt-snapshot.service';
import { ReportsService } from '../../src/modules/reports/reports.service';
import { RequestContextService } from '../../src/common/context/request-context.service';
import { UserRole } from '@prisma/client';

describe('Reports /reports/debt (integration)', () => {
  let prisma: PrismaService;
  let debtSnapshotService: DebtSnapshotService;
  let reportsService: ReportsService;
  let requestContext: RequestContextService;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    debtSnapshotService = moduleRef.get(DebtSnapshotService);
    reportsService = moduleRef.get(ReportsService);
    requestContext = moduleRef.get(RequestContextService);
  });

  afterAll(async () => {
    await moduleRef?.close();
  });

  beforeEach(async () => {
    await cleanupDatabase(prisma);
  });

  it('throws when organization context is missing', async () => {
    await expect(reportsService.getDebtReport({ groupBy: 'day' })).rejects.toThrow(
      'Organization context is not set.',
    );
  });

  it('returns closing debt grouped by day for the tenant', async () => {
    const organization = await createOrganization(prisma);
    const organizationId = organization.id;

    const reportingUser = await prisma.user.create({
      data: {
        email: `reports-${Date.now()}@test.dev`,
        name: 'Reporter',
        password: 'hashed',
        organizationId,
        role: UserRole.OWNER,
      },
    });

    const customer = await createCustomer(prisma, organizationId);
    const product = await createProduct(prisma, organizationId, { sellPrice: 150000 });

    await createOrder(prisma, organizationId, customer.id, product.id, {
      total: 300000,
      paidAmount: 100000,
      isPaid: false,
    });

    await debtSnapshotService.handleCron();

    const result = await requestContext.run(async () => {
      requestContext.setContext({
        organizationId,
        userId: reportingUser.id,
        roles: [reportingUser.role],
      });
      return reportsService.getDebtReport({ groupBy: 'day' });
    });

    const entries = result as Array<any>;
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThan(0);
    const snapshot = entries[0];
    expect(snapshot.customerId).toBe(customer.id);
    expect(snapshot.capturedAt).toBeDefined();
    const closingDebt = Number(snapshot.closingDebt);
    expect(closingDebt).toBeGreaterThan(0);
    expect(closingDebt).toBeCloseTo(200000);
  });

  it('isolates debt snapshots per tenant and respects month grouping', async () => {
    const orgA = await createOrganization(prisma);
    const orgB = await createOrganization(prisma);
    const customerA = await createCustomer(prisma, orgA.id);
    const customerB = await createCustomer(prisma, orgB.id);
    const productA = await createProduct(prisma, orgA.id, { sellPrice: 50000 });
    const productB = await createProduct(prisma, orgB.id, { sellPrice: 75000 });

    await createOrder(prisma, orgA.id, customerA.id, productA.id, {
      total: 200000,
      paidAmount: 0,
      isPaid: false,
    });
    await createOrder(prisma, orgB.id, customerB.id, productB.id, {
      total: 100000,
      paidAmount: 50000,
      isPaid: false,
    });

    await debtSnapshotService.handleCron();

    const reportingUser = await prisma.user.create({
      data: {
        email: `reports-tenant-${Date.now()}@test.dev`,
        name: 'Reporter',
        password: 'hashed',
        organizationId: orgA.id,
        role: UserRole.ADMIN,
      },
    });

    const result = await requestContext.run(async () => {
      requestContext.setContext({
        organizationId: orgA.id,
        userId: reportingUser.id,
        roles: [reportingUser.role],
      });
      return reportsService.getDebtReport({ groupBy: 'month' });
    });

    const entries = result as Array<any>;
    expect(entries).toHaveLength(1);
    expect(entries[0].customerId).toBe(customerA.id);
    expect(Number(entries[0].closingDebt)).toBeCloseTo(200000);
    expect(entries[0].period).toBeDefined();
  });

  it('applies customer and date filters when generating debt reports', async () => {
    const organization = await createOrganization(prisma);
    const organizationId = organization.id;
    const targetCustomer = await createCustomer(prisma, organizationId);
    const otherCustomer = await createCustomer(prisma, organizationId);
    const reportingUser = await prisma.user.create({
      data: {
        email: `reports-filter-${Date.now()}@test.dev`,
        name: 'Reporter',
        password: 'hashed',
        organizationId,
        role: UserRole.MANAGER,
      },
    });

    await prisma.customerDebtSnapshot.createMany({
      data: [
        {
          organizationId,
          customerId: targetCustomer.id,
          debtValue: 500000,
          capturedAt: new Date('2025-01-20T00:00:00Z'),
        },
        {
          organizationId,
          customerId: otherCustomer.id,
          debtValue: 100000,
          capturedAt: new Date('2025-03-01T00:00:00Z'),
        },
      ],
    });

    const result = await requestContext.run(async () => {
      requestContext.setContext({
        organizationId,
        userId: reportingUser.id,
        roles: [reportingUser.role],
      });
      return reportsService.getDebtReport({
        groupBy: 'month',
        customerId: targetCustomer.id,
        fromDate: new Date('2025-01-01T00:00:00Z'),
        toDate: new Date('2025-02-01T00:00:00Z'),
      });
    });

    const entries = result as Array<any>;
    expect(entries).toHaveLength(1);
    expect(entries[0].customerId).toBe(targetCustomer.id);
    expect(Number(entries[0].closingDebt)).toBeCloseTo(500000);
  });

  it('rejects invalid grouping parameters', async () => {
    const organization = await createOrganization(prisma);
    const reportingUser = await prisma.user.create({
      data: {
        email: `reports-invalid-${Date.now()}@test.dev`,
        name: 'Reporter',
        password: 'hashed',
        organizationId: organization.id,
        role: UserRole.ADMIN,
      },
    });

    await expect(
      requestContext.run(async () => {
        requestContext.setContext({
          organizationId: organization.id,
          userId: reportingUser.id,
          roles: [reportingUser.role],
        });
        return reportsService.getDebtReport({ groupBy: 'year' as any });
      }),
    ).rejects.toThrow('Invalid groupBy value. Must be "day" or "month".');
  });
});
