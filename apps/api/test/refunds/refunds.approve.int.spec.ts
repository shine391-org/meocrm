import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { cleanupDatabase, createCustomer } from '../../src/test-utils';
import { PrismaService } from '../../src/prisma/prisma.service';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import {
  CommissionSource,
  CommissionStatus,
  OrderStatus,
  Prisma,
  User,
  UserRole,
} from '@prisma/client';
import { RefundsService } from '../../src/refunds/refunds.service';
import { RequestContextService } from '../../src/common/context/request-context.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

type SeedRefundOptions = {
  status?: OrderStatus;
  completedAt?: Date;
  restockOnRefund?: boolean;
  windowDays?: number;
  createCommission?: boolean;
};

type SeedRefundResult = {
  organizationId: string;
  orderId: string;
  productId: string;
  variantId: string;
  user: User;
  baseCommissionId?: string | null;
  quantity: number;
  initialProductStock: number;
  initialVariantStock: number;
};

const PRODUCT_STOCK = 3;
const VARIANT_STOCK = 5;
const ITEM_QUANTITY = 2;

describe('Refund approval integration', () => {
  let prisma: PrismaService;
  let refundsService: RefundsService;
  let notificationsMock: { sendToStaff: jest.Mock };
  let eventEmitterMock: { emit: jest.Mock };
  let requestContext: RequestContextService;

  beforeAll(async () => {
    process.env.WEBHOOK_SECRET_KEY =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    notificationsMock = {
      sendToStaff: jest.fn().mockResolvedValue(undefined),
    };
    eventEmitterMock = { emit: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(NotificationsService)
      .useValue(notificationsMock)
      .overrideProvider(EventEmitter2)
      .useValue(eventEmitterMock)
      .compile();

    prisma = moduleRef.get(PrismaService);
    refundsService = moduleRef.get(RefundsService);
    requestContext = moduleRef.get(RequestContextService);
  });

  beforeEach(async () => {
    await cleanupDatabase(prisma);
    notificationsMock.sendToStaff.mockClear();
    eventEmitterMock.emit.mockClear();
  });

  const runAs = async <T>(organizationId: string, user: User, handler: () => Promise<T>): Promise<T> => {
    return requestContext.run(async () => {
      requestContext.setContext({
        organizationId,
        userId: user.id,
        roles: [user.role],
      });
      return handler();
    });
  };

  const seedRefundScenario = async ({
    status = OrderStatus.COMPLETED,
    completedAt = new Date(),
    restockOnRefund = true,
    windowDays = 30,
    createCommission = true,
  }: SeedRefundOptions = {}): Promise<SeedRefundResult> => {
    const organization = await prisma.organization.create({
      data: {
        name: 'Refund Org',
        slug: `refund-org-${Date.now()}`,
        code: `REF-${Date.now()}`,
      },
    });

    const user = await prisma.user.create({
      data: {
        email: `manager-${Date.now()}@test.dev`,
        name: 'Refund Manager',
        password: 'hashed',
        organizationId: organization.id,
        role: UserRole.OWNER,
      },
    });

    const customer = await createCustomer(prisma, organization.id);

    const product = await prisma.product.create({
      data: {
        organizationId: organization.id,
        name: 'Refund Product',
        sku: `SKU-${Date.now()}`,
        sellPrice: 100000,
        costPrice: 50000,
        stock: PRODUCT_STOCK,
      },
    });

    const variant = await prisma.productVariant.create({
      data: {
        organizationId: organization.id,
        productId: product.id,
        sku: `VAR-${Date.now()}`,
        name: 'Variant',
        sellPrice: 100000,
        stock: VARIANT_STOCK,
      },
    });

    const order = await prisma.order.create({
      data: {
        organizationId: organization.id,
        customerId: customer.id,
        code: `ORD-${Date.now()}`,
        subtotal: 100000,
        total: 100000,
        tax: 0,
        shipping: 0,
        discount: 0,
        paymentMethod: 'CASH',
        status,
        completedAt: status === OrderStatus.COMPLETED ? completedAt : null,
        items: {
          create: {
            organizationId: organization.id,
            productId: product.id,
            variantId: variant.id,
            quantity: ITEM_QUANTITY,
            unitPrice: 50000,
            subtotal: 100000,
          },
        },
      },
    });

    await prisma.setting.createMany({
      data: [
        {
          organizationId: organization.id,
          key: 'refund.windowDays',
          value: windowDays,
        },
        {
          organizationId: organization.id,
          key: 'refund.restockOnRefund',
          value: restockOnRefund,
        },
      ],
    });

    let baseCommissionId: string | null = null;
    if (createCommission) {
      const periodMonth = `${completedAt.getUTCFullYear()}-${String(completedAt.getUTCMonth() + 1).padStart(2, '0')}`;
      const commission = await prisma.commission.create({
        data: {
          organizationId: organization.id,
          orderId: order.id,
          customerId: customer.id,
          valueGross: new Prisma.Decimal(50000),
          valueNet: new Prisma.Decimal(50000),
          ratePercent: new Prisma.Decimal(5),
          amount: new Prisma.Decimal(50000),
          currency: 'VND',
          status: CommissionStatus.PENDING,
          periodMonth,
          source: CommissionSource.POS,
          split: [{ assignee: user.id, percent: 100 }] as Prisma.JsonArray,
          ruleId: null,
        },
      });
      baseCommissionId = commission.id;
    }

    return {
      organizationId: organization.id,
      orderId: order.id,
      productId: product.id,
      variantId: variant.id,
      user,
      baseCommissionId,
      quantity: ITEM_QUANTITY,
      initialProductStock: PRODUCT_STOCK,
      initialVariantStock: VARIANT_STOCK,
    };
  };

  it('restocks inventory, creates adjustment commissions, and emits events on approval', async () => {
    const seed = await seedRefundScenario();

    await runAs(seed.organizationId, seed.user, () => refundsService.approveRefund(seed.orderId, seed.user));

    const product = await prisma.product.findUnique({ where: { id: seed.productId } });
    const variant = await prisma.productVariant.findUnique({ where: { id: seed.variantId } });
    expect(product?.stock).toBe(seed.initialProductStock + seed.quantity);
    expect(variant?.stock).toBe(seed.initialVariantStock + seed.quantity);

    const commissions = await prisma.commission.findMany({ where: { orderId: seed.orderId } });
    const adjustment = commissions.find((entry) => entry.isAdjustment);
    expect(adjustment).toBeDefined();
    expect(adjustment?.adjustsCommissionId).toBe(seed.baseCommissionId);
    expect(adjustment?.traceId).toBe(`refund-${seed.orderId}`);
    expect(adjustment?.amount?.toNumber()).toBeLessThan(0);

    expect(notificationsMock.sendToStaff).toHaveBeenCalledTimes(1);
    expect(eventEmitterMock.emit).toHaveBeenCalledWith(
      'order.refunded',
      expect.objectContaining({
        order: expect.objectContaining({ id: seed.orderId }),
        userId: seed.user.id,
      }),
    );
  });

  it('restocks standalone products that do not have variants', async () => {
    const organization = await prisma.organization.create({
      data: {
        name: 'Refund Org Standalone',
        slug: `refund-standalone-${Date.now()}`,
        code: `RFD-STAND-${Date.now()}`,
      },
    });
    const organizationId = organization.id;
    const user = await prisma.user.create({
      data: {
        email: `owner-${Date.now()}@test.dev`,
        name: 'Owner',
        password: 'hashed',
        organizationId,
        role: UserRole.OWNER,
      },
    });
    const product = await prisma.product.create({
      data: {
        organizationId,
        name: 'Standalone Product',
        sku: `SKU-SA-${Date.now()}`,
        sellPrice: 150000,
        costPrice: 50000,
        stock: 2,
      },
    });
    const order = await prisma.order.create({
      data: {
        organizationId,
        code: `ORD-SA-${Date.now()}`,
        subtotal: 150000,
        total: 150000,
        paymentMethod: 'CASH',
        status: OrderStatus.COMPLETED,
        completedAt: new Date(),
        items: {
          create: {
            organizationId,
            productId: product.id,
            quantity: 1,
            unitPrice: 150000,
            subtotal: 150000,
          },
        },
      },
    });
    await prisma.setting.createMany({
      data: [
        { organizationId, key: 'refund.windowDays', value: 30 },
        { organizationId, key: 'refund.restockOnRefund', value: true },
      ],
    });

    await requestContext.run(async () => {
      requestContext.setContext({
        organizationId,
        userId: user.id,
        roles: [user.role],
      });
      await refundsService.approveRefund(order.id, user);
    });

    const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(updatedProduct?.stock).toBe(3);
  });

  it('throws when requesting refunds for unknown orders', async () => {
    const seed = await seedRefundScenario({ createCommission: false });

    await expect(
      refundsService.requestRefund('missing-order', { reason: 'dup' } as any, seed.user),
    ).rejects.toThrow('Order with ID missing-order not found.');
  });

  it('throws when approving refunds for unknown orders', async () => {
    const seed = await seedRefundScenario();

    await expect(
      runAs(seed.organizationId, seed.user, () => refundsService.approveRefund('missing-order', seed.user)),
    ).rejects.toThrow('Order with ID missing-order not found.');
  });

  it('rejects approval attempts for orders that are not completed', async () => {
    const seed = await seedRefundScenario({
      status: OrderStatus.PENDING,
      createCommission: false,
    });

    await expect(
      runAs(seed.organizationId, seed.user, () => refundsService.approveRefund(seed.orderId, seed.user)),
    ).rejects.toThrow('Cannot refund an order that has not been completed.');
  });

  it('enforces refund window from settings', async () => {
    const fortyFiveDaysAgo = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
    const seed = await seedRefundScenario({
      completedAt: fortyFiveDaysAgo,
      windowDays: 7,
    });

    await expect(
      runAs(seed.organizationId, seed.user, () => refundsService.approveRefund(seed.orderId, seed.user)),
    ).rejects.toThrow('Refund window of 7 days has expired.');
  });

  it('logs audit entries and notifies staff when rejecting refunds', async () => {
    const seed = await seedRefundScenario({ createCommission: false });
    const reason = 'Duplicate request';

    const response = await runAs(seed.organizationId, seed.user, () =>
      refundsService.rejectRefund(seed.orderId, { reason }, seed.user),
    );

    expect(response.message).toContain('rejected');
    expect(notificationsMock.sendToStaff).toHaveBeenCalledTimes(1);

    const auditLogs = await prisma.auditLog.findMany({ where: { entityId: seed.orderId } });
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].newValues).toMatchObject({ reason });
  });

  it('throws a not found error when rejecting non-existing orders', async () => {
    const seed = await seedRefundScenario({ createCommission: false });

    await expect(
      runAs(seed.organizationId, seed.user, () =>
        refundsService.rejectRefund('missing-order', { reason: 'n/a' }, seed.user),
      ),
    ).rejects.toThrow('Order with ID missing-order not found.');
  });

  it('is idempotent when approveRefund is called twice', async () => {
    const seed = await seedRefundScenario();

    await runAs(seed.organizationId, seed.user, () => refundsService.approveRefund(seed.orderId, seed.user));
    const productAfterFirst = await prisma.product.findUnique({ where: { id: seed.productId } });
    const variantAfterFirst = await prisma.productVariant.findUnique({ where: { id: seed.variantId } });

    await runAs(seed.organizationId, seed.user, () => refundsService.approveRefund(seed.orderId, seed.user));

    const productAfterSecond = await prisma.product.findUnique({ where: { id: seed.productId } });
    const variantAfterSecond = await prisma.productVariant.findUnique({ where: { id: seed.variantId } });
    expect(productAfterSecond?.stock).toBe(productAfterFirst?.stock);
    expect(variantAfterSecond?.stock).toBe(variantAfterFirst?.stock);

    const adjustments = await prisma.commission.findMany({
      where: { orderId: seed.orderId, isAdjustment: true },
    });
    expect(adjustments).toHaveLength(1);
    expect(notificationsMock.sendToStaff).toHaveBeenCalledTimes(1);
    expect(eventEmitterMock.emit).toHaveBeenCalledTimes(1);
  });

  it('rolls back inventory changes when the transactional restock fails', async () => {
    const seed = await seedRefundScenario();

    const originalTransaction = prisma.$transaction.bind(prisma);
    const transactionSpy = jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any, options?: any) => {
      return originalTransaction(async (tx: any, ...rest: any[]) => {
        const proxiedTx = new Proxy(tx, {
          get(target, prop) {
            if (prop === 'productVariant') {
              return new Proxy(target.productVariant, {
                get(innerTarget, innerProp) {
                  if (innerProp === 'update') {
                    return async () => {
                      throw new Error('forced variant failure');
                    };
                  }
                  return (innerTarget as any)[innerProp];
                },
              });
            }
            return (target as any)[prop];
          },
        });
        return callback(proxiedTx, ...rest);
      }, options as any);
    });

    try {
      await expect(
        runAs(seed.organizationId, seed.user, () => refundsService.approveRefund(seed.orderId, seed.user)),
      ).rejects.toThrow('forced variant failure');
    } finally {
      transactionSpy.mockRestore();
    }

    const product = await prisma.product.findUnique({ where: { id: seed.productId } });
    expect(product?.stock).toBe(seed.initialProductStock);

    const order = await prisma.order.findUnique({ where: { id: seed.orderId } });
    expect(order?.status).toBe(OrderStatus.COMPLETED);

    const adjustments = await prisma.commission.findMany({
      where: { orderId: seed.orderId, isAdjustment: true },
    });
    expect(adjustments).toHaveLength(0);
    expect(notificationsMock.sendToStaff).not.toHaveBeenCalled();
    expect(eventEmitterMock.emit).not.toHaveBeenCalled();
  });
});
