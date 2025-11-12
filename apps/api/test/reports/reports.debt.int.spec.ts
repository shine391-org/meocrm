import { Test } from '@nestjs/testing';
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

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    debtSnapshotService = moduleRef.get(DebtSnapshotService);
    reportsService = moduleRef.get(ReportsService);
    requestContext = moduleRef.get(RequestContextService);
  });

  beforeEach(async () => {
    await cleanupDatabase(prisma);
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
});
