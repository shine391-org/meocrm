import { Test, TestingModule } from '@nestjs/testing';
import { RefundsService } from './refunds.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { SettingsService } from '../modules/settings/settings.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import {
  User,
  Order,
  OrderStatus,
  ProductVariant,
  OrderItem,
  UserRole,
  Prisma,
  CommissionSource,
  AuditAction,
  ReturnStatus,
} from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CustomerStatsService } from '../customers/services/customer-stats.service';

describe('RefundsService', () => {
  let service: RefundsService;
  let prisma: DeepMockProxy<PrismaService>;
  let auditLog: DeepMockProxy<AuditLogService>;
  let notifications: DeepMockProxy<NotificationsService>;
  let settings: DeepMockProxy<SettingsService>;
  let eventEmitter: DeepMockProxy<EventEmitter2>;
  let customerStatsService: DeepMockProxy<CustomerStatsService>;

  const mockUser: User = {
    id: 'user-1',
    email: 'staff@example.com',
    name: 'Staff',
    role: UserRole.STAFF,
    organizationId: 'org-1',
    password: 'hashedpassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const approveDto = { refundMethod: 'CASH' } as any;

  const buildOrder = (
    overrides: Partial<
      Order & {
        items: (OrderItem & { variant: ProductVariant | null })[];
        commissions: any[];
        orderReturns: any[];
      }
    > = {},
  ) => {
    const baseOrder: Order & {
      items: (OrderItem & { variant: ProductVariant | null })[];
      commissions: any[];
      orderReturns: any[];
    } = {
      id: 'order-1',
      code: 'ORD-001',
      status: OrderStatus.COMPLETED,
      customerId: 'cust-1',
      subtotal: 100 as any,
      tax: 0 as any,
      shipping: 0 as any,
      discount: 0 as any,
      taxableSubtotal: 100 as any,
      taxBreakdown: null,
      paymentMethod: 'CASH' as any,
      isPaid: false,
      paidAmount: 0 as any,
      notes: null,
      total: 100 as any,
      organizationId: 'org-1',
      branchId: 'branch-1',
      createdBy: 'user-1',
      completedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      paidAt: null,
      commissions: [],
      items: [
        {
          id: 'item-1',
          orderId: 'order-1',
          productId: 'prod-1',
          variantId: 'variant-1',
          quantity: 2,
          unitPrice: 50 as any,
          subtotal: 100 as any,
          netTotal: 100 as any,
          discountType: null,
          discountValue: 0 as any,
          discountAmount: 0 as any,
          isTaxExempt: false,
          organizationId: 'org-1',
          variant: {
            id: 'variant-1',
            productId: 'prod-1',
            sku: 'SKU-001',
            name: 'Variant',
            additionalPrice: 0 as any,
            stock: 10,
            images: [],
            organizationId: 'org-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
          } as ProductVariant,
        },
      ],
      orderReturns: [
        {
          id: 'return-1',
          code: 'RET-0001',
          organizationId: 'org-1',
          orderId: 'order-1',
          reason: 'test',
          notes: null,
          refundAmount: 100 as any,
          refundMethod: 'CASH',
          status: ReturnStatus.PENDING,
          approvedBy: null,
          approvedAt: null,
          createdBy: mockUser.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          items: [
            {
              id: 'return-item-1',
              returnId: 'return-1',
              orderItemId: 'item-1',
              productId: 'prod-1',
              quantity: 2,
              refundPrice: 50 as any,
              lineTotal: 100 as any,
            },
          ],
        },
      ],
    };
    return { ...baseOrder, ...overrides };
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundsService,
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
        { provide: AuditLogService, useValue: mockDeep<AuditLogService>() },
        { provide: NotificationsService, useValue: mockDeep<NotificationsService>() },
        { provide: SettingsService, useValue: mockDeep<SettingsService>() },
        { provide: EventEmitter2, useValue: mockDeep<EventEmitter2>() },
        { provide: CustomerStatsService, useValue: mockDeep<CustomerStatsService>() },
      ],
    }).compile();

    service = module.get<RefundsService>(RefundsService);
    prisma = module.get(PrismaService);
    auditLog = module.get(AuditLogService);
    notifications = module.get(NotificationsService);
    settings = module.get(SettingsService);
    eventEmitter = module.get(EventEmitter2);
    customerStatsService = module.get(CustomerStatsService);

    prisma.order.findFirst.mockResolvedValue(buildOrder());
    prisma.orderReturn.create.mockResolvedValue({
      id: 'return-mock',
      code: 'RET-0009',
      items: [],
    } as any);
    settings.getForOrganization
      .calledWith(mockUser.organizationId, 'refund.windowDays', 7)
      .mockResolvedValue(7 as any);
    settings.getForOrganization
      .calledWith(mockUser.organizationId, 'refund.restockOnRefund', true)
      .mockResolvedValue(true as any);
  });

  describe('requestRefund', () => {
    it('should create order return rows, audit log and notification', async () => {
      prisma.order.findFirst.mockResolvedValueOnce(
        buildOrder({
          orderReturns: [],
        }) as any,
      );

      await service.requestRefund('order-1', { reason: 'test' }, mockUser, mockUser.organizationId);
      expect(prisma.orderReturn.create).toHaveBeenCalled();
      expect(auditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser,
          action: 'refund.requested',
          auditAction: AuditAction.UPDATE,
          entityId: 'order-1',
          newValues: expect.objectContaining({ reason: 'test' }),
        }),
      );
      expect(notifications.sendToStaff).toHaveBeenCalled();
    });

    it('throws NotFoundException if order is missing', async () => {
      prisma.order.findFirst.mockResolvedValueOnce(null as any);

      await expect(
        service.requestRefund('missing', { reason: 'no-order' }, mockUser, mockUser.organizationId),
      ).rejects.toThrow(NotFoundException);
      expect(auditLog.log).not.toHaveBeenCalled();
    });

    it('rejects refund requests for non-completed orders', async () => {
      prisma.order.findFirst.mockResolvedValueOnce(
        buildOrder({ status: OrderStatus.PENDING, completedAt: null, orderReturns: [] }) as any,
      );

      await expect(
        service.requestRefund('order-1', { reason: 'pending' }, mockUser, mockUser.organizationId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectRefund', () => {
    it('should create an audit log and send a notification', async () => {
      await service.rejectRefund('order-1', { reason: 'test reject' }, mockUser, mockUser.organizationId);
      expect(auditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser,
          action: 'refund.rejected',
          auditAction: AuditAction.UPDATE,
          entityId: 'order-1',
          newValues: { reason: 'test reject' },
        }),
      );
      expect(notifications.sendToStaff).toHaveBeenCalled();
      expect(prisma.orderReturn.update).toHaveBeenCalled();
    });

    it('throws NotFoundException if order not found during reject', async () => {
      prisma.order.findFirst.mockResolvedValueOnce(null as any);

      await expect(
        service.rejectRefund('missing', { reason: 'fail' }, mockUser, mockUser.organizationId),
      ).rejects.toThrow(NotFoundException);
      expect(auditLog.log).not.toHaveBeenCalled();
    });
  });

  describe('approveRefund', () => {
    it('should throw BadRequestException if refund window is exceeded', async () => {
      const oldOrder = buildOrder({ completedAt: new Date('2023-01-01') }) as any;
      prisma.order.findFirst.mockResolvedValue(oldOrder);
      await expect(service.approveRefund('order-1', approveDto, mockUser, mockUser.organizationId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when order is missing', async () => {
      prisma.order.findFirst.mockResolvedValueOnce(null as any);
      await expect(service.approveRefund('missing', approveDto, mockUser, mockUser.organizationId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws when order is not completed yet', async () => {
      prisma.order.findFirst.mockResolvedValueOnce(
        buildOrder({
          completedAt: null,
          status: OrderStatus.SHIPPED,
        }) as any,
      );

      await expect(service.approveRefund('order-1', approveDto, mockUser, mockUser.organizationId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should successfully process a refund, update stock, and emit event', async () => {
      prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma));

      await service.approveRefund('order-1', approveDto, mockUser, mockUser.organizationId);

      expect(prisma.productVariant.update).toHaveBeenCalledWith({
        where: { id: 'variant-1' },
        data: { stock: { increment: 2 } },
      });
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stock: { increment: 2 } },
      });

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1', organizationId: mockUser.organizationId },
        data: { status: OrderStatus.CANCELLED },
      });

      expect(auditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser,
          action: 'refund.approved',
          entityId: 'order-1',
          newValues: expect.objectContaining({ restocked: true }),
        }),
      );

      expect(notifications.sendToStaff).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('order.refunded', expect.any(Object));
      expect(customerStatsService.revertStatsOnOrderCancel).toHaveBeenCalled();
      expect(customerStatsService.updateDebt).toHaveBeenCalled();
    });

    it('creates commission adjustment entries referencing the original commission', async () => {
      const commission = {
        id: 'cms-1',
        organizationId: 'org-1',
        ruleId: 'rule-1',
        orderId: 'order-1',
        customerId: 'cust-1',
        valueGross: new Prisma.Decimal(100),
        valueNet: new Prisma.Decimal(80),
        ratePercent: new Prisma.Decimal(5),
        amount: new Prisma.Decimal(20),
        currency: 'VND',
        status: 'PENDING',
        periodMonth: '2025-01',
        source: CommissionSource.POS,
        split: {},
      } as any;
      prisma.order.findFirst.mockResolvedValueOnce(
        buildOrder({
          commissions: [commission],
        }) as any,
      );
      prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma));

      await service.approveRefund('order-1', approveDto, mockUser, mockUser.organizationId);

      expect(prisma.commission.create).toHaveBeenCalled();
      const adjustmentPayload = prisma.commission.create.mock.calls[0][0].data;
      expect(adjustmentPayload.adjustsCommissionId).toBe(commission.id);
      expect(adjustmentPayload.isAdjustment).toBe(true);
      const grossValue = new Prisma.Decimal(adjustmentPayload.valueGross as Prisma.Decimal.Value);
      const amountValue = new Prisma.Decimal(adjustmentPayload.amount as Prisma.Decimal.Value);
      expect(grossValue.equals(new Prisma.Decimal(-100))).toBe(true);
      expect(amountValue.equals(new Prisma.Decimal(-20))).toBe(true);
    });

    it('skips restocking when refund.restockOnRefund is false', async () => {
      prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma));
      settings.getForOrganization
        .calledWith(mockUser.organizationId, 'refund.restockOnRefund', true)
        .mockResolvedValueOnce(false as any);
      prisma.product.update.mockClear();
      prisma.productVariant.update.mockClear();

      await service.approveRefund('order-1', approveDto, mockUser, mockUser.organizationId);

      expect(prisma.product.update).not.toHaveBeenCalled();
      expect(prisma.productVariant.update).not.toHaveBeenCalled();
    });
  });
});
