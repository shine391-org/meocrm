import { Test, TestingModule } from '@nestjs/testing';
import { RefundsService } from './refunds.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { SettingsService } from '../modules/settings/settings.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { User, Order, OrderStatus, ProductVariant, OrderItem, UserRole } from '@prisma/client';
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

  const mockOrder = {
    id: 'order-1',
    code: 'ORD-001',
    status: OrderStatus.COMPLETED,
    total: 100,
    userId: 'user-1',
    organizationId: 'org-1',
    branchId: 'branch-1',
    completedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
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
        createdAt: new Date(),
        updatedAt: new Date(),
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
      },
    ],
  } as unknown as Order & { items: (OrderItem & { variant: ProductVariant | null })[] };

  beforeEach(async () => {
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

    prisma.order.findUnique.mockResolvedValue(mockOrder);
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
          entityId: 'order-1',
          newValues: { reason: 'test' },
        }),
      );
      expect(notifications.sendToStaff).toHaveBeenCalled();
    });
  });

  describe('rejectRefund', () => {
    it('should create an audit log and send a notification', async () => {
      await service.rejectRefund('order-1', { reason: 'test reject' }, mockUser);
      expect(auditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser,
          action: 'refund.rejected',
          entityId: 'order-1',
          newValues: { reason: 'test reject' },
        }),
      );
      expect(notifications.sendToStaff).toHaveBeenCalled();
    });
  });

  describe('approveRefund', () => {
    it('should throw BadRequestException if refund window is exceeded', async () => {
      const oldOrder = { ...mockOrder, completedAt: new Date('2023-01-01') };
      prisma.order.findUnique.mockResolvedValue(oldOrder);
      await expect(service.approveRefund('order-1', mockUser)).rejects.toThrow(BadRequestException);
    });

    it('should successfully process a refund, update stock, and emit event', async () => {
      prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma));

      await service.approveRefund('order-1', mockUser);

      expect(prisma.productVariant.update).toHaveBeenCalledWith({
        where: { id: 'variant-1' },
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
          newValues: { restocked: true },
        }),
      );

      expect(notifications.sendToStaff).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('order.refunded', expect.any(Object));
    });
  });
});
