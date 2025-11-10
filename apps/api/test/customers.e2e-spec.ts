import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { DEFAULT_TEST_ORG_PREFIX, cleanupTestOrganizations, setupTestApp } from '../src/test-utils';

describe('Customers E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let organizationId: string;

  const uniqueSuffix = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const uniqueCode = () => `KH${uniqueSuffix().slice(-6).padStart(6, '0')}`;
  const uniquePhone = () => `09${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;

  beforeAll(async () => {
    ({ app, prisma, accessToken, organizationId } = await setupTestApp());
    await app.init();
  });

  afterAll(async () => {
    await cleanupTestOrganizations(prisma);
    await app.close();
  });

  beforeEach(async () => {
    await prisma.customer.deleteMany({ where: { organizationId } });
  });

  const createCustomer = async (overrides: Partial<{ organizationId: string; name: string }> = {}) => {
    return prisma.customer.create({
      data: {
        name: overrides.name ?? `E2E Customer ${uniqueSuffix()}`,
        phone: uniquePhone(),
        code: uniqueCode(),
        organizationId: overrides.organizationId ?? organizationId,
      },
    });
  };

  it('returns customers scoped to the authenticated organization', async () => {
    await createCustomer({ name: 'Tenant Customer 1' });
    await createCustomer({ name: 'Tenant Customer 2' });

    const otherOrg = await prisma.organization.create({
      data: {
        name: 'Isolated Org',
        code: `${DEFAULT_TEST_ORG_PREFIX}${Date.now()}-ALT`,
      },
    });
    await createCustomer({ organizationId: otherOrg.id, name: 'Other Tenant Customer' });

    const { body } = await request(app.getHttpServer())
      .get('/customers')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(body.data).toHaveLength(2);
    expect(body.data.every((customer: any) => customer.organizationId === organizationId)).toBe(true);
    expect(body.meta.total).toBe(2);

    await prisma.customer.deleteMany({ where: { organizationId: otherOrg.id } });
    await prisma.organization.delete({ where: { id: otherOrg.id } });
  });
});
