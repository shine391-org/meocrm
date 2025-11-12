import { Prisma } from '@prisma/client';
import { DebtSnapshotService } from './debt-snapshot.service';

describe('DebtSnapshotService', () => {
  it('keeps Decimal precision for debt values', async () => {
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

    const result = await (service as any).calculateDebtForOrganization(prisma as any, 'org_1');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      organizationId: 'org_1',
      customerId: 'cust_1',
    });
    expect(result[0].debtValue.toString()).toBe('80.25');
  });

  it('logs sanitized errors when snapshotting fails for an organization', async () => {
    const prisma = {
      organization: {
        findMany: jest.fn().mockResolvedValueOnce([{ id: 'org_err' }]).mockResolvedValue([]),
      },
      $transaction: jest.fn().mockImplementation(async () => {
        throw new Error('boom');
      }),
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
      'Debt snapshot failed for organization org_err',
      expect.stringContaining('boom'),
    );
    expect(prisma.customerDebtSnapshot.createMany).not.toHaveBeenCalled();
  });

  it('logs string-based rejection reasons without crashing', async () => {
    const prisma = {
      organization: {
        findMany: jest.fn().mockResolvedValueOnce([{ id: 'org_str' }]).mockResolvedValue([]),
      },
      $transaction: jest.fn().mockImplementation(async () => {
        throw 'timeout'; // eslint-disable-line no-throw-literal
      }),
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
    (service as any).logger = { log: jest.fn(), error: jest.fn() };

    await service.handleCron();

    expect((service as any).logger.error).toHaveBeenCalledWith(
      'Debt snapshot failed for organization org_str',
      'timeout',
    );
  });

  it('creates snapshots per organization with skipDuplicates and ignores zero-debt customers', async () => {
    const orgId = 'org_batch';
    const orderGroupResult = [
      {
        customerId: 'cust_positive',
        _sum: { total: new Prisma.Decimal(300), paidAmount: new Prisma.Decimal(100) },
      },
      {
        customerId: 'cust_zero',
        _sum: { total: new Prisma.Decimal(0), paidAmount: new Prisma.Decimal(0) },
      },
    ];
    const txMock = {
      order: {
        groupBy: jest.fn().mockResolvedValue(orderGroupResult),
      },
      customerDebtSnapshot: {
        createMany: jest.fn(),
      },
    };
    const prisma = {
      organization: {
        findMany: jest.fn().mockResolvedValueOnce([{ id: orgId }]).mockResolvedValue([]),
      },
      $transaction: jest.fn().mockImplementation(async (callback: any) => callback(txMock)),
    };
    const requestContextService = {
      withOrganizationContext: jest
        .fn()
        .mockImplementation(async (_org: string, handler: () => Promise<unknown>) => handler()),
    };

    const service = new DebtSnapshotService(prisma as any, requestContextService as any);
    (service as any).logger = { log: jest.fn(), error: jest.fn() };

    await service.handleCron();

    expect(txMock.customerDebtSnapshot.createMany).toHaveBeenCalled();
    const payload = txMock.customerDebtSnapshot.createMany.mock.calls[0][0];
    expect(payload.data[0]).toMatchObject({
      organizationId: orgId,
      customerId: 'cust_positive',
    });
    expect(payload.data[0].debtValue.toString()).toBe('200');
  });

  it('skips snapshot creation when no positive debt exists for the organization', async () => {
    const orgId = 'org_empty';
    const txMock = {
      order: {
        groupBy: jest.fn().mockResolvedValue([
          {
            customerId: 'cust_free',
            _sum: { total: new Prisma.Decimal(100), paidAmount: new Prisma.Decimal(100) },
          },
        ]),
      },
      customerDebtSnapshot: {
        createMany: jest.fn(),
      },
    };
    const prisma = {
      organization: {
        findMany: jest.fn().mockResolvedValueOnce([{ id: orgId }]).mockResolvedValue([]),
      },
      $transaction: jest.fn().mockImplementation(async (callback: any) => callback(txMock)),
    };
    const requestContextService = {
      withOrganizationContext: jest
        .fn()
        .mockImplementation(async (_org: string, handler: () => Promise<unknown>) => handler()),
    };
    const service = new DebtSnapshotService(prisma as any, requestContextService as any);
    (service as any).logger = { log: jest.fn(), error: jest.fn() };

    await service.handleCron();

    expect((service as any).logger.log).toHaveBeenCalledWith(
      'No customer debt to snapshot for organization: org_empty',
    );
    expect(txMock.customerDebtSnapshot.createMany).not.toHaveBeenCalled();
  });

  it('continues processing other organizations when one transaction fails', async () => {
    const organizations = [{ id: 'org_ok' }, { id: 'org_fail' }];
    let currentOrg = '';
    const successTx = {
      order: {
        groupBy: jest.fn().mockResolvedValue([
          {
            customerId: 'cust_success',
            _sum: { total: new Prisma.Decimal(100), paidAmount: new Prisma.Decimal(0) },
          },
        ]),
      },
      customerDebtSnapshot: {
        createMany: jest.fn(),
      },
    };

    const prisma = {
      organization: {
        findMany: jest.fn().mockResolvedValueOnce(organizations).mockResolvedValue([]),
      },
      $transaction: jest.fn().mockImplementation(async (callback: any) => {
        if (currentOrg === 'org_fail') {
          throw new Error('failing org');
        }
        return callback(successTx);
      }),
    };
    const requestContextService = {
      withOrganizationContext: jest.fn().mockImplementation(async (orgId: string, handler: () => Promise<unknown>) => {
        currentOrg = orgId;
        return handler();
      }),
    };

    const service = new DebtSnapshotService(prisma as any, requestContextService as any);
    (service as any).logger = { log: jest.fn(), error: jest.fn() };

    await service.handleCron();

    expect(successTx.customerDebtSnapshot.createMany).toHaveBeenCalledTimes(1);
    expect((service as any).logger.error).toHaveBeenCalledWith(
      'Debt snapshot failed for organization org_fail',
      expect.stringContaining('failing org'),
    );
  });
});
