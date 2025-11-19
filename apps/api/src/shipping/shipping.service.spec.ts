import { Test, TestingModule } from '@nestjs/testing';
import { ShippingService } from './shipping.service';
import { PrismaService } from '../prisma/prisma.service';
import { ShippingStatus, OrderStatus } from '@prisma/client';
import { ShippingFeeService } from './shipping-fee.service';
import { OrdersService } from '../orders/orders.service';
import { InventoryService } from '../inventory/inventory.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RequestContextService } from '../common/context/request-context.service';

describe('ShippingService', () => {
  let service: ShippingService;
  let prisma: any;
  let shippingFeeService: { calculate: jest.Mock };
  let ordersService: { updateStatus: jest.Mock; markCodPaid: jest.Mock };
  let inventoryService: {
    returnStockOnOrderCancel: jest.Mock;
    checkReservationHealth: jest.Mock;
  };
  let auditLogService: { log: jest.Mock };
  let requestContextService: { getTraceId: jest.Mock };

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
    shippingFeeService = { calculate: jest.fn().mockResolvedValue({ shippingFee: 22000, weightSurcharge: 0, channelMultiplier: 1, breakdown: { baseFee: 22000, weightSurcharge: 0, distanceFee: 0, serviceMultiplier: 1, channelMultiplier: 1 } }) };
    ordersService = {
      updateStatus: jest.fn().mockResolvedValue({}),
      markCodPaid: jest.fn().mockResolvedValue({}),
    };
    inventoryService = {
      returnStockOnOrderCancel: jest.fn().mockResolvedValue(undefined),
      checkReservationHealth: jest.fn().mockResolvedValue({ alertCreated: false }),
    };
    auditLogService = { log: jest.fn().mockResolvedValue(undefined) };
    requestContextService = { getTraceId: jest.fn().mockReturnValue('trace-shipping') };

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
        {
          provide: OrdersService,
          useValue: ordersService,
        },
        {
          provide: InventoryService,
          useValue: inventoryService,
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
    expect(mockTx.shippingOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ feeBreakdown: expect.anything() }),
      }),
    );
    expect(auditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'shipping.order.created' }),
    );
  });

  it('delivers shipping order and settles COD', async () => {
    const shippingOrder = {
      id: 's1',
      orderId: 'order-1',
      partnerId: 'partner-1',
      status: ShippingStatus.IN_TRANSIT,
      codAmount: 50000,
      partner: { id: 'partner-1', organizationId: 'org-1' },
      order: { id: 'order-1', paymentMethod: 'COD' },
    };
    prisma.shippingOrder.findFirst.mockResolvedValue(shippingOrder);

    const txContext = {
      shippingOrder: {
        update: jest.fn().mockResolvedValue({
          ...shippingOrder,
          status: ShippingStatus.DELIVERED,
        }),
      },
      shippingPartner: {
        update: jest.fn().mockResolvedValue({}),
      },
    };

    prisma.$transaction.mockImplementation(async (cb: any) => cb(txContext));

    const result = await service.updateStatus('org-1', 's1', {
      status: ShippingStatus.DELIVERED,
      collectedCodAmount: 40000,
    });

    expect(result.data.status).toBe(ShippingStatus.DELIVERED);
    expect(ordersService.updateStatus).toHaveBeenCalledWith(
      'order-1',
      { status: OrderStatus.DELIVERED },
      'org-1',
      expect.any(Object),
    );
    expect(ordersService.updateStatus).toHaveBeenCalledWith(
      'order-1',
      { status: OrderStatus.COMPLETED },
      'org-1',
      expect.any(Object),
    );
    expect(ordersService.markCodPaid).toHaveBeenCalledWith(
      'order-1',
      'org-1',
      40000,
      expect.any(Object),
    );
  });

  it('fails shipping order and returns order to processing', async () => {
    prisma.shippingOrder.findFirst.mockResolvedValue({
      id: 's1',
      status: ShippingStatus.PICKING_UP,
      orderId: 'order-1',
      order: { id: 'order-1', paymentMethod: 'CASH' },
      partnerId: 'partner-1',
      partner: { id: 'partner-1', organizationId: 'org-1' },
    });

    const txContext = {
      shippingOrder: {
        update: jest.fn().mockResolvedValue({
          id: 's1',
          status: ShippingStatus.FAILED,
          partner: { id: 'partner-1', organizationId: 'org-1' },
          order: { id: 'order-1', paymentMethod: 'CASH' },
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

    expect(ordersService.updateStatus).toHaveBeenCalledWith(
      'order-1',
      { status: OrderStatus.PENDING },
      'org-1',
      expect.any(Object),
    );
    expect(inventoryService.returnStockOnOrderCancel).toHaveBeenCalledWith(
      'order-1',
      'org-1',
      expect.any(Object),
    );
    expect(inventoryService.checkReservationHealth).toHaveBeenCalledWith(
      'order-1',
      'org-1',
      expect.objectContaining({
        triggeredBy: 'shipping',
        shippingStatus: ShippingStatus.FAILED,
      }),
    );
  });

  it('returns shipping order and cancels the linked order', async () => {
    prisma.shippingOrder.findFirst.mockResolvedValue({
      id: 's2',
      status: ShippingStatus.IN_TRANSIT,
      orderId: 'order-2',
      order: { id: 'order-2', paymentMethod: 'CASH' },
      partnerId: 'partner-1',
      partner: { id: 'partner-1', organizationId: 'org-1' },
    });

    const txContext = {
      shippingOrder: {
        update: jest.fn().mockResolvedValue({
          id: 's2',
          status: ShippingStatus.RETURNED,
          partner: { id: 'partner-1', organizationId: 'org-1' },
          orderId: 'order-2',
          order: { id: 'order-2', paymentMethod: 'CASH' },
        }),
      },
      shippingPartner: { update: jest.fn() },
      order: {
        update: jest.fn().mockResolvedValue({ status: OrderStatus.CANCELLED }),
      },
    };

    prisma.$transaction.mockImplementation(async (cb: any) => cb(txContext));

    await service.updateStatus('org-1', 's2', { status: ShippingStatus.RETURNED });

    expect(ordersService.updateStatus).toHaveBeenCalledWith(
      'order-2',
      { status: OrderStatus.PENDING },
      'org-1',
      expect.any(Object),
    );
    expect(inventoryService.returnStockOnOrderCancel).toHaveBeenCalledWith(
      'order-2',
      'org-1',
      expect.any(Object),
    );
    expect(inventoryService.checkReservationHealth).toHaveBeenCalledWith(
      'order-2',
      'org-1',
      expect.objectContaining({ shippingStatus: ShippingStatus.RETURNED }),
    );
  });
});
