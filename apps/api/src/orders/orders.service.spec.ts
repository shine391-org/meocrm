import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from 'apps/api/src/prisma/prisma.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaTransactionalClient } from 'apps/api/src/prisma/prisma.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: mockDeep<PrismaService>(),
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get(PrismaService);
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
    const customer = { id: 'cust-id', totalSpent: 0 } as any;
    const product = {
      id: 'prod-id',
      sellPrice: 100,
      stock: 10,
      variants: [],
    } as any;
    const createDto = {
      customerId: 'cust-id',
      items: [{ productId: 'prod-id', quantity: 2 }],
      paymentMethod: 'CASH',
    } as any;

    it('should create an order successfully', async () => {
      prisma.customer.findFirst.mockResolvedValue(customer);
      prisma.product.findFirst.mockResolvedValue(product);
      prisma.order.findFirst.mockResolvedValue(null); // For code generation

      // Mock the transaction
      prisma.$transaction.mockImplementation(
        (callback: (prisma: PrismaTransactionalClient) => any) =>
          callback(prisma),
      );

      const result = await service.create(createDto, 'org-id');

      expect(prisma.order.create).toHaveBeenCalled();
      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: 'cust-id' },
        data: {
          totalSpent: { increment: 220 }, // 200 (subtotal) + 20 (tax)
          lastOrderAt: expect.any(Date),
        },
      });
      expect(result.code).toBe('ORD001');
      expect(result.total).toBe(220);
    });

    it('should throw NotFoundException if customer is not found', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(
        (callback: (prisma: PrismaTransactionalClient) => any) =>
          callback(prisma),
      );

      await expect(service.create(createDto, 'org-id')).rejects.toThrow(
        'Customer with ID cust-id not found',
      );
    });

    it('should throw NotFoundException if product is not found', async () => {
      prisma.customer.findFirst.mockResolvedValue(customer);
      prisma.product.findFirst.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(
        (callback: (prisma: PrismaTransactionalClient) => any) =>
          callback(prisma),
      );

      await expect(service.create(createDto, 'org-id')).rejects.toThrow(
        'Product prod-id not found',
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated orders', async () => {
      const orders = [{ id: 'order-1' }, { id: 'order-2' }] as any;
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
        expect.objectContaining({ data: { status: 'CONFIRMED' } }),
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
