import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { Prisma, PrismaClient, OrderStatus } from '@prisma/client';
import { PricingService } from './pricing.service';
import { SettingsService } from '../modules/settings/settings.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CustomerStatsService } from '../customers/services/customer-stats.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RequestContextService } from '../common/context/request-context.service';

type PrismaTransactionalClient = Prisma.TransactionClient;

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: DeepMockProxy<PrismaClient>;
  let eventEmitter: { emit: jest.Mock };
  let customerStatsService: {
    updateStatsOnOrderComplete: jest.Mock;
    revertStatsOnOrderCancel: jest.Mock;
    updateDebt: jest.Mock;
  };
  let auditLogService: { log: jest.Mock };
  let requestContextService: { getTraceId: jest.Mock };

  beforeEach(async () => {
    auditLogService = { log: jest.fn().mockResolvedValue(undefined) };
    requestContextService = { getTraceId: jest.fn().mockReturnValue('trace-test') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: mockDeep<PrismaClient>(),
        },
        {
          provide: PricingService,
          useValue: {
            calculateTotals: jest.fn().mockResolvedValue({
              shippingFee: 10, // Default mock shipping fee
              freeShipApplied: false,
              taxRate: 0.1,
              taxAmount: 5,
              taxBreakdown: { taxableAmount: 50, rate: 0.1 },
            }),
          },
        },
        {
          provide: SettingsService,
          useValue: mockDeep<SettingsService>(),
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
        {
          provide: CustomerStatsService,
          useValue: {
            updateStatsOnOrderComplete: jest.fn().mockResolvedValue(undefined),
            revertStatsOnOrderCancel: jest.fn().mockResolvedValue(undefined),
            updateDebt: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: AuditLogService,
          useValue: auditLogService,
        },
        {
          provide: RequestContextService,
          useValue: requestContextService,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get(PrismaService) as DeepMockProxy<PrismaClient>;
    eventEmitter = module.get(EventEmitter2) as any;
    eventEmitter.emit.mockReset();
    customerStatsService = module.get(CustomerStatsService) as any;

    (prisma.$transaction as unknown as jest.Mock).mockImplementation(
      async (callback: (tx: PrismaTransactionalClient) => Promise<any>) =>
        callback(prisma as unknown as PrismaTransactionalClient),
    );

    prisma.branch.findFirst.mockResolvedValue({
      id: 'branch-1',
      name: 'Branch 1',
      organizationId: 'org-1',
    } as any);
  });

  describe('calculateOrderTotals (variants)', () => {
    it('adds additionalPrice to base product price for variants', async () => {
      const items = [
        { productId: 'product-1', quantity: 2, variantId: 'variant-1' },
      ] as any;
      const mockTx: any = {
        product: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'product-1',
            sellPrice: 100,
            stock: 10,
            variants: [{ id: 'variant-1', additionalPrice: 25, stock: 5 }],
          }),
        },
      };

      const result = await (service as any).calculateOrderTotals(
        items,
        'org-1',
        mockTx,
      );

      expect(result.itemsData[0].unitPrice).toBe(125);
      expect(result.subtotal).toBe(250);
    });

    it('throws when variant price would be non-positive', async () => {
      const items = [
        { productId: 'product-1', quantity: 1, variantId: 'variant-1' },
      ] as any;
      const mockTx: any = {
        product: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'product-1',
            sellPrice: 100,
            stock: 10,
            variants: [{ id: 'variant-1', additionalPrice: -200, stock: 5 }],
          }),
        },
      };

      await expect(
        (service as any).calculateOrderTotals(items, 'org-1', mockTx),
      ).rejects.toThrow(BadRequestException);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateOrderCode', () => {
    it('should generate ORD001 for the first order', async () => {
      prisma.order.findFirst.mockResolvedValue(null);
      const code = await service.generateOrderCode('org-id');
      expect(code).toBe('ORD001');
    });

    it('should increment from the last order code', async () => {
      prisma.order.findFirst.mockResolvedValue({ code: 'ORD009' } as any);
      const code = await service.generateOrderCode('org-id');
      expect(code).toBe('ORD010');
    });

    it('should handle codes with larger numbers correctly', async () => {
      prisma.order.findFirst.mockResolvedValue({ code: 'ORD123' } as any);
      const code = await service.generateOrderCode('org-id');
      expect(code).toBe('ORD124');
    });
  });

  describe('create', () => {
    const mockCreateDto = {
      branchId: 'branch-1',
      customerId: 'customer-1',
      items: [
        {
          productId: 'product-1',
          quantity: 2,
          unitPrice: 100,
        },
      ],
      paymentMethod: 'CASH',
    };

    const mockProduct = {
      id: 'product-1',
      sellPrice: 100,
      stock: 10,
      organizationId: 'org-1',
      variants: [],
    };

    const mockOrder = {
      id: 'order-1',
      code: 'ORD-001',
      customerId: 'customer-1',
      subtotal: 200,
      tax: 5,
      shipping: 10,
      discount: 0,
      total: 215,
      isPaid: false,
      paidAmount: 0,
      status: OrderStatus.PENDING,
      organizationId: 'org-1',
      items: [],
      customer: {
        id: 'customer-1',
        totalSpent: 0,
        debt: 0,
        totalOrders: 0,
      },
      branch: {
        id: 'branch-1',
        name: 'Branch 1',
      },
    };

    const mockCustomer = {
      id: 'customer-1',
      debt: 200,
      totalSpent: 200,
      totalOrders: 1,
    };

    beforeEach(() => {
      // Mock transaction with callback pattern
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        // Create a mock transaction client
        const txClient = {
          branch: {
            findFirst: jest.fn().mockResolvedValue({
              id: 'branch-1',
              name: 'Branch 1',
            }),
          },
          product: {
            findFirst: jest.fn().mockResolvedValue(mockProduct),
            update: jest.fn().mockResolvedValue(mockProduct),
          },
          order: {
            create: jest.fn().mockResolvedValue(mockOrder),
            findFirst: jest.fn().mockResolvedValue(null),
          },
          customer: {
            findFirst: jest.fn().mockResolvedValue({ id: 'customer-1' }),
            update: jest.fn().mockResolvedValue(mockCustomer),
          },
        };

        // Execute the callback with mock transaction client
        return callback(txClient);
      });
    });

    it('should create order and increase customer debt when isPaid=false', async () => {
      const result = await service.create(
        mockCreateDto as any,
        'org-1',
        { id: 'user-1', organizationId: 'org-1' } as any,
      );

      expect(result.data).toMatchObject({
        id: 'order-1',
        isPaid: false,
        paidAmount: 0,
      });

      // Verify transaction was called
      expect(prisma.$transaction).toHaveBeenCalled();

      expect(customerStatsService.updateStatsOnOrderComplete).not.toHaveBeenCalled();
      expect(customerStatsService.updateDebt).not.toHaveBeenCalled();
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'order.created' }),
      );
    });

    it('respects immediate payment when allowed', async () => {
      const paidDto = {
        ...mockCreateDto,
        isPaid: true,
        paidAmount: 215,
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const txClient = {
          branch: {
            findFirst: jest.fn().mockResolvedValue({
              id: 'branch-1',
              name: 'Branch 1',
            }),
          },
          product: {
            findFirst: jest.fn().mockResolvedValue(mockProduct),
          },
          order: {
            create: jest.fn().mockResolvedValue({ ...mockOrder, isPaid: true }),
            findFirst: jest.fn().mockResolvedValue(null),
          },
          customer: {
            findFirst: jest.fn().mockResolvedValue({ id: 'customer-1' }),
            update: jest.fn().mockResolvedValue({ ...mockCustomer, debt: 0 }),
          },
        };
        return callback(txClient);
      });

      const result = await service.create(
        paidDto as any,
        'org-1',
        { id: 'user-1', organizationId: 'org-1' } as any,
      );

      expect(result.data.isPaid).toBe(true);

      expect(customerStatsService.updateStatsOnOrderComplete).toHaveBeenCalled();
      const [[createdCustomerId, createdTotal, createdTx, createdOrg]] =
        customerStatsService.updateStatsOnOrderComplete.mock.calls;
      expect(createdCustomerId).toBe(mockCreateDto.customerId);
      expect(createdTotal).toBe(result.data.total);
      expect(createdTx).toBeDefined();
      expect(createdOrg).toBe('org-1');
      expect(customerStatsService.updateDebt).not.toHaveBeenCalled();
    });

    it('should throw error if product not found', async () => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const txClient = {
          branch: {
            findFirst: jest.fn().mockResolvedValue({
              id: 'branch-1',
              name: 'Branch 1',
            }),
          },
          product: {
            findFirst: jest.fn().mockResolvedValue(null),
          },
          order: { create: jest.fn(), findFirst: jest.fn().mockResolvedValue(null) },
          customer: {
            findFirst: jest.fn().mockResolvedValue({ id: 'customer-1' }),
            update: jest.fn(),
          },
        };
        return callback(txClient);
      });

      await expect(
        service.create(
          mockCreateDto as any,
          'org-1',
          { id: 'user-1', organizationId: 'org-1' } as any,
        ),
      ).rejects.toThrow();
    });
  });

  describe('update', () => {
    const baseOrder = {
      id: 'order-1',
      customerId: 'customer-1',
      status: OrderStatus.PENDING,
      subtotal: new Prisma.Decimal(100),
      tax: new Prisma.Decimal(10),
      shipping: new Prisma.Decimal(5),
      discount: new Prisma.Decimal(0),
      total: new Prisma.Decimal(115),
      paidAmount: new Prisma.Decimal(20),
      isPaid: false,
      customer: { id: 'customer-1' },
      items: [],
    } as any;

    beforeEach(() => {
      jest.spyOn(service, 'findOne').mockResolvedValue({ data: baseOrder });
    });

    it('updates customer stats when shipping changes', async () => {
      const transactionContext = {
        orderItem: { deleteMany: jest.fn() },
        order: {
          update: jest.fn().mockResolvedValue({
            ...baseOrder,
            shipping: new Prisma.Decimal(15),
            total: new Prisma.Decimal(125),
          }),
        },
        customer: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) =>
        callback(transactionContext),
      );

      await service.update(
        baseOrder.id,
        { shipping: 15 } as any,
        'org-1',
      );

      expect(transactionContext.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shipping: 15,
            total: 125,
          }),
        }),
      );

      expect(transactionContext.customer.updateMany).toHaveBeenCalledWith({
        where: {
          id: baseOrder.customerId,
          organizationId: 'org-1',
          deletedAt: null,
        },
        data: expect.objectContaining({
          debt: { increment: 10 },
        }),
      });
    });
  });

  describe('remove', () => {
    const removableOrder = {
      id: 'order-1',
      customerId: 'customer-1',
      status: OrderStatus.PENDING,
      subtotal: new Prisma.Decimal(100),
      tax: new Prisma.Decimal(10),
      shipping: new Prisma.Decimal(20),
      discount: new Prisma.Decimal(0),
      total: new Prisma.Decimal(130),
      paidAmount: new Prisma.Decimal(30),
      isPaid: false,
      customer: { id: 'customer-1', debt: new Prisma.Decimal(80) },
    } as any;

    beforeEach(() => {
      jest.spyOn(service, 'findOne').mockResolvedValue({ data: removableOrder });
    });

    it('reverts customer debt using computed totals', async () => {
      const transactionContext = {
        order: {
          update: jest.fn().mockResolvedValue({ id: removableOrder.id }),
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) =>
        callback(transactionContext),
      );

      await service.remove(removableOrder.id, 'org-1');

      expect(customerStatsService.revertStatsOnOrderCancel).toHaveBeenCalled();
      const [[revertCustomerId, revertAmount, revertTx, revertOrg]] =
        customerStatsService.revertStatsOnOrderCancel.mock.calls;
      expect(revertCustomerId).toBe(removableOrder.customerId);
      expect(revertAmount).toBe(130);
      expect(revertTx).toBeDefined();
      expect(revertOrg).toBe('org-1');

      expect(customerStatsService.updateDebt).toHaveBeenCalled();
      const [[debtCustomerId, debtAmount, debtTx, debtOrg]] = customerStatsService.updateDebt.mock.calls;
      expect(debtCustomerId).toBe(removableOrder.customerId);
      expect(debtAmount).toBe(-80);
      expect(debtTx).toBeDefined();
      expect(debtOrg).toBe('org-1');
    });
  });

  describe('findAll', () => {
    it('should return paginated orders', async () => {
      const orders = [
        { id: 'order-1', _count: { items: 1 } },
        { id: 'order-2', _count: { items: 2 } },
      ] as any;
      prisma.order.findMany.mockResolvedValue(orders);
      prisma.order.count.mockResolvedValue(2);

      const result = await service.findAll('org-id', { page: 1, limit: 10 } as any);
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('applies branch filters when provided', async () => {
      prisma.order.findMany.mockResolvedValue([]);
      prisma.order.count.mockResolvedValue(0);

      await service.findAll('org-id', { page: 1, limit: 20, branchId: 'branch-1' } as any);

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            branchId: 'branch-1',
            organizationId: 'org-id',
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return an order if found', async () => {
      const order = {
        id: 'order-1',
        subtotal: new Prisma.Decimal(100),
        tax: new Prisma.Decimal(10),
        shipping: new Prisma.Decimal(5),
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(115),
        paidAmount: new Prisma.Decimal(20),
        customer: null,
        items: [],
        branch: null,
      } as any;
      prisma.order.findFirst.mockResolvedValue(order);

      const result = await service.findOne('order-1', 'org-id');
      expect(result.data).toMatchObject({
        id: 'order-1',
        subtotal: 100,
        tax: 10,
        shipping: 5,
        total: 115,
        paidAmount: 20,
      });
    });

    it('should throw NotFoundException if order not found', async () => {
      prisma.order.findFirst.mockResolvedValue(null);
      await expect(service.findOne('order-1', 'org-id')).rejects.toThrow(
        'Order with ID order-1 not found',
      );
    });
  });

  describe('updateStatus', () => {
    const order = {
      id: 'order-1',
      status: OrderStatus.PENDING,
      organizationId: 'org-id',
      customerId: 'cust-1',
      code: 'ORD-1',
      subtotal: new Prisma.Decimal(100),
      tax: new Prisma.Decimal(10),
      shipping: new Prisma.Decimal(5),
      discount: new Prisma.Decimal(0),
      total: new Prisma.Decimal(115),
      paidAmount: new Prisma.Decimal(0),
      paymentMethod: 'CASH',
      isPaid: false,
      items: [],
      customer: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      deletedAt: null,
      branchId: null,
      branch: null,
      notes: null,
    } as any;

    it('should allow a valid status transition', async () => {
      prisma.order.findFirst.mockResolvedValue(order);
      prisma.order.update.mockResolvedValue({
        ...order,
        subtotal: new Prisma.Decimal(100),
        tax: new Prisma.Decimal(10),
        shipping: new Prisma.Decimal(5),
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(115),
        paidAmount: new Prisma.Decimal(0),
        customer: null,
        items: [],
        branch: null,
      } as any);
      await service.updateStatus(
        'order-1',
        { status: OrderStatus.CONFIRMED } as any,
        'org-id',
      );
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: OrderStatus.CONFIRMED,
            updatedAt: expect.any(Date),
          }),
        }),
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'orders.status.changed',
        expect.objectContaining({
          orderId: 'order-1',
          previousStatus: OrderStatus.PENDING,
          nextStatus: OrderStatus.CONFIRMED,
        }),
      );
    });

    it('should reject an invalid status transition', async () => {
      prisma.order.findFirst.mockResolvedValue(order);
      await expect(
        service.updateStatus('order-1', { status: OrderStatus.DELIVERED } as any, 'org-id'),
      ).rejects.toThrow(
        'Cannot transition from PENDING to DELIVERED. Valid transitions: CONFIRMED, PROCESSING, CANCELLED',
      );
    });

    it('blocks COD orders from advancing without shipping order', async () => {
      const codOrder = { ...order, paymentMethod: 'COD' } as any;
      prisma.order.findFirst.mockResolvedValue(codOrder);
      prisma.shippingOrder.findFirst.mockResolvedValue(null);

      await expect(
        service.updateStatus('order-1', { status: OrderStatus.SHIPPED } as any, 'org-id'),
      ).rejects.toThrow('COD orders require a shipping order before advancing to shipping statuses');
    });

    it('should throw NotFoundException if order not found', async () => {
      prisma.order.findFirst.mockResolvedValue(null);
      await expect(
        service.updateStatus('order-1', { status: OrderStatus.CONFIRMED } as any, 'org-id'),
      ).rejects.toThrow('Order with ID order-1 not found');
    });

    it('reverts stats via service when cancelling order', async () => {
      const cancelOrder = {
        ...order,
        completedAt: new Date(),
        customer: { id: order.customerId, debt: 70 },
      } as any;

      prisma.order.findFirst.mockResolvedValue(cancelOrder);
      prisma.order.update.mockResolvedValue({
        ...cancelOrder,
        status: OrderStatus.CANCELLED,
      } as any);

      await service.updateStatus(
        'order-1',
        { status: OrderStatus.CANCELLED } as any,
        'org-id',
      );

      const outstanding = Math.max(
        Number(cancelOrder.total) - Number(cancelOrder.paidAmount),
        0,
      );
      const expectedDebt = -Math.min(outstanding, cancelOrder.customer.debt);

      expect(customerStatsService.revertStatsOnOrderCancel).toHaveBeenCalled();
      const [[revertCustomerId, revertTotal, revertTx, revertOrg]] =
        customerStatsService.revertStatsOnOrderCancel.mock.calls;
      expect(revertCustomerId).toBe(cancelOrder.customerId);
      expect(revertTotal).toBe(Number(cancelOrder.total));
      expect(revertTx).toBeDefined();
      expect(revertOrg).toBe('org-id');

      expect(customerStatsService.updateDebt).toHaveBeenCalled();
      const [[debtCustomerId, debtAmount, debtTx, debtOrg]] = customerStatsService.updateDebt.mock.calls;
      expect(debtCustomerId).toBe(cancelOrder.customerId);
      expect(debtAmount).toBe(expectedDebt);
      expect(debtTx).toBeDefined();
      expect(debtOrg).toBe('org-id');
    });
  });

  describe('markCodPaid', () => {
    it('marks COD order as paid and reduces debt', async () => {
      const codOrder = {
        id: 'order-1',
        organizationId: 'org-1',
        paymentMethod: 'COD',
        status: OrderStatus.COMPLETED,
        total: new Prisma.Decimal(500),
        paidAmount: new Prisma.Decimal(0),
        isPaid: false,
        customerId: 'cust-1',
        customer: { id: 'cust-1' },
      } as any;

      prisma.order.findFirst.mockResolvedValue(codOrder);
      prisma.order.update.mockResolvedValue({
        ...codOrder,
        isPaid: true,
        paidAmount: new Prisma.Decimal(500),
        customer: { id: 'cust-1' },
        items: [],
        branch: null,
      } as any);

      const result = await service.markCodPaid('order-1', 'org-1', undefined, {
        id: 'user-1',
        organizationId: 'org-1',
      } as any);

      expect(result.data.isPaid).toBe(true);
      expect(customerStatsService.updateDebt).toHaveBeenCalledWith(
        'cust-1',
        -500,
        expect.anything(),
        'org-1',
      );
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'order.cod_paid' }),
      );
    });

    it('throws when COD order is not completed', async () => {
      prisma.order.findFirst.mockResolvedValue({
        id: 'order-1',
        organizationId: 'org-1',
        paymentMethod: 'COD',
        status: OrderStatus.PROCESSING,
        total: new Prisma.Decimal(200),
        paidAmount: new Prisma.Decimal(0),
        isPaid: false,
      } as any);

      await expect(
        service.markCodPaid('order-1', 'org-1'),
      ).rejects.toThrow('COD payment can only be confirmed once the order is completed');
    });
  });
});
