import { Test } from '@nestjs/testing';
import { AuditLogService } from '../../src/audit-log/audit-log.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../../src/test-utils';

describe('AuditLogService', () => {
  let prisma: PrismaService;
  let auditLogService: AuditLogService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [PrismaService, AuditLogService],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    auditLogService = moduleRef.get(AuditLogService);
  });

  beforeEach(async () => {
    await cleanupDatabase(prisma);
  });

  it('throws if organization context is missing', async () => {
    await expect(
      auditLogService.log({
        user: { id: 'user_1', organizationId: undefined as unknown as string },
        entity: 'order',
        entityId: 'order_1',
        action: 'refund.approved',
      }),
    ).rejects.toThrow('Audit logs require organization context');
  });

  it('persists audit entries and maps unknown actions to UPDATE', async () => {
    const organization = await prisma.organization.create({
      data: { name: 'Audit Org', slug: `audit-${Date.now()}`, code: `AUD-${Date.now()}` },
    });
    const user = await prisma.user.create({
      data: {
        email: `auditor-${Date.now()}@test.dev`,
        name: 'Auditor',
        password: 'hashed',
        organizationId: organization.id,
      },
    });

    await auditLogService.log({
      user: { id: user.id, organizationId: organization.id },
      entity: 'order',
      entityId: 'order-123',
      action: 'custom.event',
      newValues: { foo: 'bar' },
    });

    const logs = await prisma.auditLog.findMany();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('UPDATE');
    expect(logs[0].newValues).toMatchObject({ event: 'custom.event', foo: 'bar' });
  });

  it('preserves known audit actions without remapping', async () => {
    const organization = await prisma.organization.create({
      data: { name: 'Audit Org 2', slug: `audit-${Date.now()}`, code: `AUD-${Date.now()}` },
    });
    const user = await prisma.user.create({
      data: {
        email: `auditor-known-${Date.now()}@test.dev`,
        name: 'Auditor Known',
        password: 'hashed',
        organizationId: organization.id,
      },
    });

    await auditLogService.log({
      user: { id: user.id, organizationId: organization.id },
      entity: 'order',
      entityId: 'order-456',
      action: 'CREATE',
    });

    const logs = await prisma.auditLog.findMany({ where: { entityId: 'order-456' } });
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('CREATE');
  });
});
