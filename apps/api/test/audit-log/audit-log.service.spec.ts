import { Test } from '@nestjs/testing';
import { AuditLogService } from '../../src/audit-log/audit-log.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { cleanupDatabase } from '../../src/test-utils';
import { AuditAction } from '@prisma/client';

describe('AuditLogService', () => {
  let prisma: PrismaService;
  let auditLogService: AuditLogService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [AuditLogService],
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

  it('rejects unknown audit actions', async () => {
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

    await expect(
      auditLogService.log({
        user: { id: user.id, organizationId: organization.id },
        entity: 'order',
        entityId: 'order-123',
        action: 'custom.event',
        newValues: { foo: 'bar' },
      }),
    ).rejects.toThrow('Invalid audit action: custom.event');
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
      action: 'order.created',
      auditAction: AuditAction.CREATE,
    });

    const logs = await prisma.auditLog.findMany({ where: { entityId: 'order-456' } });
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('CREATE');
  });
});
