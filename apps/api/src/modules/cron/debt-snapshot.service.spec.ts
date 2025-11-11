import { Prisma } from '@prisma/client';
import { DebtSnapshotService } from './debt-snapshot.service';

describe('DebtSnapshotService', () => {
  it('converts Prisma Decimal sums to numeric debt values', async () => {
    const prisma = {
      order: {
        groupBy: jest.fn().mockResolvedValue([
          {
            customerId: 'cust_1',
            _sum: {
              total: new Prisma.Decimal('150.50'),
              paidAmount: new Prisma.Decimal('70.25'),
            },
          },
        ]),
      },
    };

    const service = new DebtSnapshotService(prisma as any, {} as any);

    const result = await (service as any).calculateDebtForOrganization('org_1');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      organizationId: 'org_1',
      customerId: 'cust_1',
      debtValue: 80.25,
    });
    expect(typeof result[0].debtValue).toBe('number');
  });

  it('logs sanitized errors when snapshotting fails for an organization', async () => {
    const prisma = {
      organization: {
        findMany: jest.fn().mockResolvedValue([{ id: 'org_err' }]),
      },
      order: {
        groupBy: jest.fn().mockRejectedValue(new Error('boom')),
      },
      customerDebtSnapshot: {
        createMany: jest.fn(),
      },
    };
    const requestContextService = {
      withOrganizationContext: jest
        .fn()
        .mockImplementation(async (_orgId: string, handler: () => Promise<unknown>) => handler()),
    };

    const service = new DebtSnapshotService(prisma as any, requestContextService as any);
    (service as any).logger = {
      log: jest.fn(),
      error: jest.fn(),
    };

    await service.handleCron();

    expect((service as any).logger.error).toHaveBeenCalledWith(
      'Failed to process debt snapshot for organization: org_err',
      expect.stringContaining('boom'),
    );
    expect(prisma.customerDebtSnapshot.createMany).not.toHaveBeenCalled();
  });
});
