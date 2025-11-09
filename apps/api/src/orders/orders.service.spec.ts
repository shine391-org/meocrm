import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { Prisma, PrismaClient } from '@prisma/client';

type PrismaTransactionalClient = Prisma.TransactionClient;

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: mockDeep<PrismaClient>(),
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get(PrismaService) as DeepMockProxy<PrismaClient>;
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
      customerId: 'customer-1',
      items: [
        {
          productId: 'product-1',
          quantity: 2,
          unitPrice: 100,
        },
      ],
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
      total: 200,
      isPaid: false,
      paidAmount: 0,
      status: 'PENDING',
      organizationId: 'org-1',
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
      const result = await service.create(mockCreateDto as any, 'org-1');

      expect(result).toMatchObject({
        id: 'order-1',
        isPaid: false,
        paidAmount: 0,
      });

      // Verify transaction was called
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should NOT increase customer debt when isPaid=true', async () => {
      const paidDto = { ...mockCreateDto, isPaid: true, paidAmount: 220 };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const txClient = {
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

      const result = await service.create(paidDto as any, 'org-1');

      expect(result.isPaid).toBe(true);
    });

    it('should handle partial payment correctly', async () => {
      const partialDto = {
        ...mockCreateDto,
        isPaid: false,
        paidAmount: 50,
      };

      // Total = 200, paidAmount = 50 → debt increase = 150
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const txClient = {
          product: {
            findFirst: jest.fn().mockResolvedValue(mockProduct),
          },
          order: {
            create: jest.fn().mockResolvedValue({
              ...mockOrder,
              paidAmount: 50,
            }),
            findFirst: jest.fn().mockResolvedValue(null),
          },
          customer: {
            findFirst: jest.fn().mockResolvedValue({ id: 'customer-1' }),
            update: jest.fn().mockImplementation((args) => {
              // Verify debt increment is correct
              expect(args.data.debt).toEqual({ increment: 170 });
              return Promise.resolve({
                ...mockCustomer,
                debt: 170,
              });
            }),
          },
        };
        return callback(txClient);
      });

      await service.create(partialDto as any, 'org-1');
    });

    it('should throw error if product not found', async () => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const txClient = {
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
        service.create(mockCreateDto as any, 'org-1'),
      ).rejects.toThrow();
    });
  });

  describe('update', () => {
    const baseOrder = {
      id: 'order-1',
      customerId: 'customer-1',
      status: 'PENDING',
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
      jest.spyOn(service, 'findOne').mockResolvedValue(baseOrder);
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
          update: jest.fn().mockResolvedValue({ id: baseOrder.customerId }),
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

      expect(transactionContext.customer.update).toHaveBeenCalledWith({
        where: { id: baseOrder.customerId },
        data: {
          totalSpent: { increment: 10 },
          debt: { increment: 10 },
        },
      });
    });
  });

  describe('remove', () => {
    const removableOrder = {
      id: 'order-1',
      customerId: 'customer-1',
      status: 'PENDING',
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
      jest.spyOn(service, 'findOne').mockResolvedValue(removableOrder);
    });

    it('reverts customer debt using computed totals', async () => {
      const transactionContext = {
        customer: {
          update: jest.fn(),
        },
        order: {
          update: jest.fn().mockResolvedValue({ id: removableOrder.id }),
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) =>
        callback(transactionContext),
      );

      await service.remove(removableOrder.id, 'org-1');

      expect(transactionContext.customer.update).toHaveBeenCalledWith({
        where: { id: removableOrder.customerId },
        data: {
          totalSpent: { decrement: 130 },
          totalOrders: { decrement: 1 },
          debt: { decrement: 80 },
        },
      });
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
  });

  describe('findOne', () => {
    it('should return an order if found', async () => {
      const order = { id: 'order-1' } as any;
      prisma.order.findFirst.mockResolvedValue(order);

      const result = await service.findOne('order-1', 'org-id');
      expect(result).toEqual(order);
    });

    it('should throw NotFoundException if order not found', async () => {
      prisma.order.findFirst.mockResolvedValue(null);
      await expect(service.findOne('order-1', 'org-id')).rejects.toThrow(
        'Order with ID order-1 not found',
      );
    });
  });

  describe('updateStatus', () => {
    const order = { id: 'order-1', status: 'PENDING' } as any;

    it('should allow a valid status transition', async () => {
      prisma.order.findFirst.mockResolvedValue(order);
      await service.updateStatus(
        'order-1',
        { status: 'CONFIRMED' } as any,
        'org-id',
      );
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'CONFIRMED', updatedAt: expect.any(Date) },
        }),
      );
    });

    it('should reject an invalid status transition', async () => {
      prisma.order.findFirst.mockResolvedValue(order);
      await expect(
        service.updateStatus('order-1', { status: 'DELIVERED' } as any, 'org-id'),
      ).rejects.toThrow(
        'Cannot transition from PENDING to DELIVERED. Valid transitions: CONFIRMED, CANCELLED',
      );
    });

    it('should throw NotFoundException if order not found', async () => {
      prisma.order.findFirst.mockResolvedValue(null);
      await expect(
        service.updateStatus('order-1', { status: 'CONFIRMED' } as any, 'org-id'),
      ).rejects.toThrow('Order with ID order-1 not found');
    });
  });
});
