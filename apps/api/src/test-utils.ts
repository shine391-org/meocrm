/* istanbul ignore file */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { AuthService } from './auth/auth.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

export const DEFAULT_TEST_ORG_PREFIX = 'E2E_';

export async function cleanupTestOrganizations(
  prisma: PrismaService,
  prefix: string = DEFAULT_TEST_ORG_PREFIX,
) {
  const normalizedPrefix = prefix.toUpperCase();
  const orgs = await prisma.organization.findMany({
    where: { code: { startsWith: normalizedPrefix } },
    select: { id: true },
  });

  const orgIds = orgs.map((org) => org.id);

  if (!orgIds.length) {
    return;
  }

  await prisma.shippingOrder.deleteMany({
    where: { order: { organizationId: { in: orgIds } } },
  });
  await prisma.orderItem.deleteMany({ where: { organizationId: { in: orgIds } } });
  await prisma.order.deleteMany({ where: { organizationId: { in: orgIds } } });
  await prisma.inventory.deleteMany({
    where: { product: { organizationId: { in: orgIds } } },
  });
  await prisma.productVariant.deleteMany({ where: { organizationId: { in: orgIds } } });
  await prisma.product.deleteMany({ where: { organizationId: { in: orgIds } } });
  await prisma.category.deleteMany({ where: { organizationId: { in: orgIds } } });
  await prisma.branch.deleteMany({ where: { organizationId: { in: orgIds } } });
  await prisma.customer.deleteMany({ where: { organizationId: { in: orgIds } } });
  await prisma.supplier.deleteMany({ where: { organizationId: { in: orgIds } } });
  await prisma.refreshToken.deleteMany({
    where: { user: { organizationId: { in: orgIds } } },
  });
  await prisma.user.deleteMany({ where: { organizationId: { in: orgIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
}

/**
 * Sets up and returns a fully initialized NestJS application instance for E2E testing.
 * This includes creating a mock organization and user, and generating a valid JWT access token.
 */
export async function setupTestApp(): Promise<{
  app: INestApplication;
  prisma: PrismaService;
  accessToken: string;
  organizationId: string;
  userId: string;
}> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const prisma = app.get<PrismaService>(PrismaService);
  const authService = app.get<AuthService>(AuthService);

  await cleanupTestOrganizations(prisma);

  const organization = await prisma.organization.create({
    data: {
      name: 'Test Organization E2E',
      slug: `test-org-${Date.now()}`,
      code: `${DEFAULT_TEST_ORG_PREFIX}${Date.now()}`,
    },
  });
  const organizationId = organization.id;

  const hashedPassword = await bcrypt.hash('password', 10);
  const user = await prisma.user.create({
    data: {
      email: `test-user-${Date.now()}@e2e.com`,
      name: 'E2E Test User',
      password: hashedPassword,
      organizationId,
      role: UserRole.OWNER,
    },
  });
  const userId = user.id;

  const { accessToken } = await authService.login({
    email: user.email,
    password: 'password',
  } as any);

  return { app, prisma, accessToken, organizationId, userId };
}

export async function createOrganization(prisma: PrismaService) {
  return prisma.organization.create({
    data: {
      name: 'Test Organization E2E',
      slug: `test-org-${Date.now()}`,
      code: `${DEFAULT_TEST_ORG_PREFIX}${Date.now()}`,
    },
  });
}

export async function cleanupDatabase(prisma: PrismaService) {
  // Order matters due to foreign key constraints
  await prisma.customerDebtSnapshot.deleteMany({});
  await prisma.commission.deleteMany({});
  await prisma.orderReturnItem.deleteMany({});
  await prisma.orderReturn.deleteMany({});
  await prisma.shippingOrder.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.productVariant.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.branch.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.webhook.deleteMany({});
  await prisma.setting.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.organization.deleteMany({});
}

export async function getAdminAccessToken(app: INestApplication, organizationId: string): Promise<string> {
  const prisma = app.get<PrismaService>(PrismaService);
  const authService = app.get<AuthService>(AuthService);

  const hashedPassword = await bcrypt.hash('password', 10);
  const email = `test-admin-${Date.now()}@e2e.com`;

  await prisma.user.create({
    data: {
      email,
      name: 'E2E Test Admin',
      password: hashedPassword,
      organizationId,
      role: UserRole.OWNER,
    },
  });

  const { accessToken } = await authService.login({ email, password: 'password' } as any);
  return accessToken;
}

export async function createOrder(
  prisma: PrismaService,
  organizationId: string,
  customerId: string,
  productId: string,
  data: { total?: number; paidAmount?: number; isPaid?: boolean } = {},
) {
  const quantity = 2;
  const unitPrice = data.total ? data.total / quantity : 150000;

  return prisma.order.create({
    data: {
      organizationId,
      customerId,
      code: `ORD-TEST-${Date.now()}`,
      subtotal: data.total || 300000,
      total: data.total || 300000,
      paidAmount: data.paidAmount || 0,
      isPaid: data.isPaid || false,
      paymentMethod: 'CASH',
      items: {
        create: {
          organizationId,
          productId,
          quantity,
          unitPrice,
          subtotal: data.total || 300000,
        },
      },
    },
  });
}

export async function createProduct(
  prisma: PrismaService,
  organizationId: string,
  data: { sellPrice?: number } = {},
) {
  return prisma.product.create({
    data: {
      organizationId,
      name: `Test Product ${Date.now()}`,
      sku: `SKU-${Date.now()}`,
      sellPrice: data.sellPrice || 10000,
      costPrice: 5000,
    },
  });
}

export async function createCustomer(prisma: PrismaService, organizationId: string) {
  return prisma.customer.create({
    data: {
      organizationId,
      name: `Test Customer ${Date.now()}`,
      code: `CUST-${Date.now()}`,
      phone: `+1${Date.now()}`,
    },
  });
}
