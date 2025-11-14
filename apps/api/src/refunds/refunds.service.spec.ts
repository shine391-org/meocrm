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
} from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('RefundsService', () => {
  let service: RefundsService;
  let prisma: DeepMockProxy<PrismaService>;
  let auditLog: DeepMockProxy<AuditLogService>;
  let notifications: DeepMockProxy<NotificationsService>;
  let settings: DeepMockProxy<SettingsService>;
  let eventEmitter: DeepMockProxy<EventEmitter2>;

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

  const buildOrder = (
    overrides: Partial<Order & { items: (OrderItem & { variant: ProductVariant | null })[]; commissions: any[] }> = {},
  ) => {
    const baseOrder = {
      id: 'order-1',
      code: 'ORD-001',
      status: OrderStatus.COMPLETED,
      total: 100 as any,
      userId: 'user-1',
      organizationId: 'org-1',
      branchId: 'branch-1',
      completedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
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
          organizationId: 'org-1',
          variant: {
            id: 'variant-1',
            productId: 'prod-1',
            sku: 'SKU-001',
            sellPrice: 50 as any,
            name: 'Variant',
            organizationId: 'org-1',
            isActive: true,
            images: [],
            attributes: null,
            deletedAt: null,
            stock: 10,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        } as unknown as OrderItem & { variant: ProductVariant | null },
      ],
    } as unknown as Order & { items: (OrderItem & { variant: ProductVariant | null })[]; commissions: any[] };
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
      ],
    }).compile();

    service = module.get<RefundsService>(RefundsService);
    prisma = module.get(PrismaService);
    auditLog = module.get(AuditLogService);
    notifications = module.get(NotificationsService);
    settings = module.get(SettingsService);
    eventEmitter = module.get(EventEmitter2);

    prisma.order.findUnique.mockResolvedValue(buildOrder());
    settings.get.calledWith('refund.windowDays').mockResolvedValue(7);
    settings.get.calledWith('refund.restockOnRefund').mockResolvedValue(true);
  });

  describe('requestRefund', () => {
    it('should create an audit log and send a notification', async () => {
      await service.requestRefund('order-1', { reason: 'test' }, mockUser);
      expect(auditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser,
          action: 'refund.requested',
          auditAction: AuditAction.UPDATE,
          entityId: 'order-1',
          newValues: { reason: 'test' },
        }),
      );
      expect(notifications.sendToStaff).toHaveBeenCalled();
    });

    it('throws NotFoundException if order is missing', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(null as any);

      await expect(service.requestRefund('missing', { reason: 'no-order' }, mockUser)).rejects.toThrow(
        NotFoundException,
      );
      expect(auditLog.log).not.toHaveBeenCalled();
    });
  });

  describe('rejectRefund', () => {
    it('should create an audit log and send a notification', async () => {
      await service.rejectRefund('order-1', { reason: 'test reject' }, mockUser);
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
    });

    it('throws NotFoundException if order not found during reject', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(null as any);

      await expect(service.rejectRefund('missing', { reason: 'fail' }, mockUser)).rejects.toThrow(
        NotFoundException,
      );
      expect(auditLog.log).not.toHaveBeenCalled();
    });
  });

  describe('approveRefund', () => {
    it('should throw BadRequestException if refund window is exceeded', async () => {
      const oldOrder = buildOrder({ completedAt: new Date('2023-01-01') }) as any;
      prisma.order.findUnique.mockResolvedValue(oldOrder);
      await expect(service.approveRefund('order-1', mockUser)).rejects.toThrow(BadRequestException);
    });

    it('throws when order is missing', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(null as any);
      await expect(service.approveRefund('missing', mockUser)).rejects.toThrow(NotFoundException);
    });

    it('throws when order is not completed yet', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(
        buildOrder({
          completedAt: null,
          status: OrderStatus.SHIPPED,
        }) as any,
      );

      await expect(service.approveRefund('order-1', mockUser)).rejects.toThrow(BadRequestException);
    });

    it('should successfully process a refund, update stock, and emit event', async () => {
      prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma));

      await service.approveRefund('order-1', mockUser);

      expect(prisma.productVariant.update).toHaveBeenCalledWith({
        where: { id: 'variant-1' },
        data: { stock: { increment: 2 } },
      });
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stock: { increment: 2 } },
      });

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
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
      prisma.order.findUnique.mockResolvedValueOnce(
        buildOrder({
          commissions: [commission],
        }) as any,
      );
      prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma));

      await service.approveRefund('order-1', mockUser);

      expect(prisma.commission.create).toHaveBeenCalled();
      const adjustmentPayload = prisma.commission.create.mock.calls[0][0].data;
      expect(adjustmentPayload.adjustsCommissionId).toBe(commission.id);
      expect(adjustmentPayload.isAdjustment).toBe(true);
      expect(Number(adjustmentPayload.valueGross)).toBe(-100);
      expect(Number(adjustmentPayload.amount)).toBe(-20);
    });

    it('skips restocking when refund.restockOnRefund is false', async () => {
      prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma));
      settings.get.calledWith('refund.restockOnRefund').mockResolvedValueOnce(false);
      prisma.product.update.mockClear();
      prisma.productVariant.update.mockClear();

      await service.approveRefund('order-1', mockUser);

      expect(prisma.product.update).not.toHaveBeenCalled();
      expect(prisma.productVariant.update).not.toHaveBeenCalled();
    });
  });
});
