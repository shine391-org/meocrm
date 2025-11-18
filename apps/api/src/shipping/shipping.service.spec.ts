import { Test, TestingModule } from '@nestjs/testing';
import { ShippingService } from './shipping.service';
import { PrismaService } from '../prisma/prisma.service';
import { ShippingStatus, OrderStatus } from '@prisma/client';
import { ShippingFeeService } from './shipping-fee.service';

describe('ShippingService', () => {
  let service: ShippingService;
  let prisma: any;
  let shippingFeeService: { calculate: jest.Mock };

  const createMockPrisma = () => ({
    $transaction: jest.fn(),
    shippingOrder: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    shippingPartner: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    order: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  });

  beforeEach(async () => {
    prisma = createMockPrisma();
    shippingFeeService = { calculate: jest.fn().mockResolvedValue({ shippingFee: 22000, weightSurcharge: 0, channelMultiplier: 1 }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShippingService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: ShippingFeeService,
          useValue: shippingFeeService,
        },
      ],
    }).compile();

    service = module.get<ShippingService>(ShippingService);
  });

  it('creates a shipping order and updates order/partner stats', async () => {
    const mockTx = {
      ...prisma,
      shippingOrder: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 's1', orderId: 'order-1' }),
      },
    };

    prisma.$transaction.mockImplementation(async (cb: any) => cb(mockTx));
    mockTx.shippingPartner.findFirst.mockResolvedValue({ id: 'partner-1' });
    mockTx.order.findFirst.mockResolvedValue({ id: 'order-1', status: OrderStatus.PENDING });
    mockTx.shippingPartner.update.mockResolvedValue({});
    mockTx.order.update.mockResolvedValue({});

    const result = await service.create('org-1', {
      orderId: 'order-1',
      partnerId: 'partner-1',
      trackingCode: 'TRACK-123',
      recipientName: 'Tên',
      recipientPhone: '0900000000',
      recipientAddress: 'HCM',
      shippingFee: undefined,
    } as any);

    expect(shippingFeeService.calculate).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-1' }),
    );
    expect(result.data.id).toBe('s1');
    expect(mockTx.shippingPartner.update).toHaveBeenCalledWith({
      where: { id: 'partner-1' },
      data: expect.objectContaining({ totalOrders: expect.any(Object) }),
    });
    expect(mockTx.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: OrderStatus.SHIPPED },
    });
  });

  it('delivers shipping order and settles COD', async () => {
    const shippingOrder = {
      id: 's1',
      orderId: 'order-1',
      partnerId: 'partner-1',
      status: ShippingStatus.IN_TRANSIT,
      codAmount: 50000,
    };
    prisma.shippingOrder.findFirst.mockResolvedValue({ ...shippingOrder, partner: { id: 'partner-1' }, order: { id: 'order-1' } });

    const txContext = {
      shippingOrder: {
        update: jest.fn()
          .mockResolvedValueOnce({
            ...shippingOrder,
            status: ShippingStatus.DELIVERED,
            partner: { id: 'partner-1' },
            orderId: 'order-1',
          })
          .mockResolvedValueOnce({
            ...shippingOrder,
            codAmount: 40000,
            partner: { id: 'partner-1' },
            orderId: 'order-1',
          }),
      },
      shippingPartner: {
        update: jest.fn().mockResolvedValue({}),
      },
      order: {
        update: jest.fn().mockResolvedValue({ status: OrderStatus.DELIVERED }),
      },
    };

    prisma.$transaction.mockImplementation(async (cb: any) => cb(txContext));

    const result = await service.updateStatus('org-1', 's1', {
      status: ShippingStatus.DELIVERED,
      collectedCodAmount: 40000,
    });

    expect(result.data.status).toBe(ShippingStatus.DELIVERED);
    expect(txContext.shippingPartner.update).toHaveBeenCalledWith({
      where: { id: 'partner-1' },
      data: { debtBalance: { decrement: 40000 } },
    });
  });

  it('fails shipping order and returns order to processing', async () => {
    prisma.shippingOrder.findFirst.mockResolvedValue({
      id: 's1',
      partner: { id: 'partner-1' },
      status: ShippingStatus.PICKING_UP,
      orderId: 'order-1',
    });

    const txContext = {
      shippingOrder: {
        update: jest.fn().mockResolvedValue({
          id: 's1',
          status: ShippingStatus.FAILED,
          partner: { id: 'partner-1' },
          order: { id: 'order-1' },
          orderId: 'order-1',
        }),
      },
      shippingPartner: {
        update: jest.fn(),
      },
      order: {
        update: jest.fn().mockResolvedValue({ status: OrderStatus.PROCESSING }),
      },
    };

    prisma.$transaction.mockImplementation(async (cb: any) => cb(txContext));

    await service.updateStatus('org-1', 's1', { status: ShippingStatus.FAILED });

    expect(txContext.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: OrderStatus.PROCESSING },
    });
  });

  it('returns shipping order and cancels the linked order', async () => {
    prisma.shippingOrder.findFirst.mockResolvedValue({
      id: 's2',
      partner: { id: 'partner-1' },
      status: ShippingStatus.IN_TRANSIT,
      orderId: 'order-2',
      order: { id: 'order-2' },
    });

    const txContext = {
      shippingOrder: {
        update: jest.fn().mockResolvedValue({
          id: 's2',
          status: ShippingStatus.RETURNED,
          partner: { id: 'partner-1' },
          orderId: 'order-2',
          order: { id: 'order-2' },
        }),
      },
      shippingPartner: { update: jest.fn() },
      order: {
        update: jest.fn().mockResolvedValue({ status: OrderStatus.CANCELLED }),
      },
    };

    prisma.$transaction.mockImplementation(async (cb: any) => cb(txContext));

    await service.updateStatus('org-1', 's2', { status: ShippingStatus.RETURNED });

    expect(txContext.order.update).toHaveBeenCalledWith({
      where: { id: 'order-2' },
      data: { status: OrderStatus.CANCELLED },
    });
  });
});
