import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  createOrganization,
  createCustomer,
  createProduct,
  createOrder,
  getAdminAccessToken,
  setupTestApp,
  cleanupDatabase,
} from '../src/test-utils';
import { PrismaService } from '../src/prisma/prisma.service';
import { DebtSnapshotService } from '../src/modules/cron/debt-snapshot.service';
import { format } from 'date-fns';

describe('Reports - Debt (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminAccessToken: string;
  let organizationId: string;
  let customerId: string;
  let debtSnapshotService: DebtSnapshotService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupTestApp(app);
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    debtSnapshotService = moduleFixture.get<DebtSnapshotService>(DebtSnapshotService);

    await cleanupDatabase(prisma);

    const org = await createOrganization(prisma);
    organizationId = org.id;

    adminAccessToken = await getAdminAccessToken(app, org.id);
    const customer = await createCustomer(prisma, organizationId);
    customerId = customer.id;
    const product = await createProduct(prisma, organizationId, { sellPrice: 150000 });

    // Create an order with debt
    await createOrder(prisma, organizationId, customerId, product.id, {
        total: 300000, // 2 items
        paidAmount: 100000,
        isPaid: false,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('should generate and retrieve a daily debt snapshot', async () => {
    // 1. Manually trigger the cron job to create snapshots
    await debtSnapshotService.handleCron();

    // 2. Call the API to get the snapshot for today
    const today = format(new Date(), 'yyyy-MM-dd');
    const response = await request(app.getHttpServer())
      .get(`/reports/debt/daily?date=${today}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    // 3. Assert the result
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBe(1);
    const snapshot = response.body[0];
    expect(snapshot.customerId).toBe(customerId);
    expect(snapshot.debtValue).toBe('200000.00'); // Prisma Decimal is returned as string
    expect(snapshot.customer.code).toBeDefined();
  });
});
