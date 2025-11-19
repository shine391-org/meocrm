import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  AuditAction,
  Commission,
  CommissionStatus,
  OrderStatus,
  PaymentMethod,
  Prisma,
  ReturnStatus,
  User,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { SettingsService } from '../modules/settings/settings.service';
import { RefundRequestDto } from './dto/refund-request.dto';
import { RefundRejectDto } from './dto/refund-reject.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApproveRefundDto, ApproveRefundItemDto } from './dto/approve-refund.dto';
import { CustomerStatsService } from '../customers/services/customer-stats.service';

@Injectable()
export class RefundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly notifications: NotificationsService,
    private readonly settings: SettingsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly customerStatsService: CustomerStatsService,
  ) {}

  async requestRefund(orderId: string, dto: RefundRequestDto, user: User, organizationId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, organizationId },
      include: {
        items: true,
        orderReturns: true,
      },
    });

    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: `Order with ID ${orderId} not found.`,
      });
    }

    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException({
        code: 'REFUND_ORDER_NOT_COMPLETED',
        message: 'Only completed orders can be refunded.',
      });
    }

    const existingPending = order.orderReturns?.find(
      (entry) => entry.status === ReturnStatus.PENDING || entry.status === ReturnStatus.APPROVED,
    );
    if (existingPending) {
      throw new BadRequestException({
        code: 'REFUND_ALREADY_PENDING',
        message: 'A refund request already exists for this order.',
      });
    }

    const refundItemsPayload = this.buildReturnItemsFromOrder(order.items);
    const refundAmount = refundItemsPayload.reduce(
      (sum, item) => sum.add(item.lineTotal),
      new Prisma.Decimal(0),
    );

    const returnRecord = await this.prisma.orderReturn.create({
      data: {
        organizationId,
        orderId,
        code: await this.generateReturnCode(organizationId),
        reason: dto.reason,
        notes: dto.notes,
        refundAmount,
        refundMethod: order.paymentMethod,
        status: ReturnStatus.PENDING,
        createdBy: user.id,
        items: {
          create: refundItemsPayload.map((item) => ({
            orderItemId: item.orderItemId,
            productId: item.productId,
            quantity: item.quantity,
            refundPrice: item.refundPrice,
            lineTotal: item.lineTotal,
          })),
        },
      },
      include: { items: true },
    });

    await this.auditLog.log({
      user,
      entity: 'order',
      entityId: orderId,
      action: 'refund.requested',
      auditAction: AuditAction.UPDATE,
      newValues: { reason: dto.reason, orderReturnId: returnRecord.id },
    });

    await this.notifications.sendToStaff(
      `Refund requested for Order #${order.code} (${returnRecord.code}) by ${user.email}. Reason: ${dto.reason}`,
    );

    return { data: returnRecord };
  }

  async approveRefund(
    orderId: string,
    dto: ApproveRefundDto,
    user: User,
    organizationId: string,
  ) {
    const windowDays =
      (await this.settings.getForOrganization<number>(
        organizationId,
        'refund.windowDays',
        7,
      )) ?? 7;
    const restockOnRefund =
      (await this.settings.getForOrganization<boolean>(
        organizationId,
        'refund.restockOnRefund',
        true,
      )) ?? true;

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, organizationId },
      include: {
        items: {
          include: {
            variant: true,
          },
        },
        commissions: true,
        customer: true,
        orderReturns: {
          include: { items: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: `Order with ID ${orderId} not found.`,
      });
    }

    if (!order.completedAt) {
      throw new BadRequestException({
        code: 'ORDER_NOT_COMPLETED',
        message: 'Cannot refund an order that has not been completed.',
      });
    }

    const daysSinceCompletion =
      (new Date().getTime() - new Date(order.completedAt).getTime()) /
      (1000 * 3600 * 24);
    if (daysSinceCompletion > windowDays) {
      throw new BadRequestException({
        code: 'REFUND_WINDOW_EXCEEDED',
        message: `Refund window of ${windowDays} days has expired.`,
      });
    }

    const hasRefundAdjustments = order.commissions.some(
      (commission) => commission.isAdjustment && commission.traceId?.startsWith(`refund-${order.id}`),
    );

    const pendingReturn = order.orderReturns.find(
      (entry) => entry.status === ReturnStatus.PENDING,
    );

    if (!pendingReturn) {
      if (hasRefundAdjustments) {
        return order;
      }
      throw new BadRequestException({
        code: 'REFUND_NOT_REQUESTED',
        message: 'No pending refund request found for this order.',
      });
    }

    const resolvedItems = dto.items?.length
      ? this.buildReturnItemsFromDto(dto.items, order.items)
      : pendingReturn.items.map((item) => ({
          orderItemId: item.orderItemId,
          productId: item.productId,
          quantity: item.quantity,
          refundPrice: item.refundPrice,
          lineTotal: item.lineTotal,
        }));

    const refundAmount = resolvedItems.reduce(
      (sum, item) => sum.add(item.lineTotal),
      new Prisma.Decimal(0),
    );
    const refundAmountNumber = Number(refundAmount);

    const { updatedOrder, adjustmentsCreated } = await this.prisma.$transaction(async (tx) => {
      await tx.orderReturnItem.deleteMany({ where: { returnId: pendingReturn.id } });
      await tx.orderReturnItem.createMany({
        data: resolvedItems.map((item) => ({
          returnId: pendingReturn.id,
          orderItemId: item.orderItemId,
          productId: item.productId,
          quantity: item.quantity,
          refundPrice: item.refundPrice,
          lineTotal: item.lineTotal,
        })),
      });

      await tx.orderReturn.update({
        where: { id: pendingReturn.id },
        data: {
          refundAmount,
          refundMethod: dto.refundMethod ?? pendingReturn.refundMethod ?? order.paymentMethod,
          status: ReturnStatus.COMPLETED,
          approvedBy: user.id,
          approvedAt: new Date(),
          notes: dto.notes ?? pendingReturn.notes,
        },
      });

      if (hasRefundAdjustments) {
        return { updatedOrder: order, adjustmentsCreated: 0 };
      }

      if (restockOnRefund) {
        for (const item of order.items) {
          const productId = item.productId ?? item.variant?.productId ?? null;

          if (productId) {
            await tx.product.update({
              where: { id: productId },
              data: { stock: { increment: item.quantity } },
            });
          }

          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }
      }

      const adjustmentsCreated = await this.createCommissionAdjustments(tx, order.commissions);

      const result = await tx.order.update({
        where: { id: orderId, organizationId },
        data: { status: OrderStatus.CANCELLED },
      });

      if (order.customerId) {
        await this.customerStatsService.revertStatsOnOrderCancel(
          order.customerId,
          refundAmountNumber,
          tx,
          organizationId,
        );

        if (refundAmountNumber !== 0) {
          await this.customerStatsService.updateDebt(
            order.customerId,
            -refundAmountNumber,
            tx,
            organizationId,
          );
        }
      }

      return { updatedOrder: result, adjustmentsCreated };
    });

    await this.auditLog.log({
      user,
      entity: 'order',
      entityId: orderId,
      action: 'refund.approved',
      auditAction: AuditAction.UPDATE,
      newValues: {
        restocked: Boolean(restockOnRefund),
        adjustmentsCreated,
        refundAmount: refundAmountNumber,
      },
    });

    await this.notifications.sendToStaff(
      `Refund approved for Order #${order.code} by ${user.email}. Amount: ${refundAmountNumber.toLocaleString()}`,
    );

    this.eventEmitter.emit('order.refunded', {
      order: updatedOrder,
      trigger: 'manual_refund',
      userId: user.id,
      refundAmount: refundAmountNumber,
    });

    return updatedOrder;
  }

  async rejectRefund(orderId: string, dto: RefundRejectDto, user: User, organizationId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, organizationId },
      include: {
        orderReturns: true,
      },
    });

    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: `Order with ID ${orderId} not found.`,
      });
    }

    const pendingReturn = order.orderReturns.find(
      (entry) => entry.status === ReturnStatus.PENDING,
    );
    if (pendingReturn) {
      await this.prisma.orderReturn.update({
        where: { id: pendingReturn.id },
        data: {
          status: ReturnStatus.REJECTED,
          notes: dto.reason,
        },
      });
    }

    await this.auditLog.log({
      user,
      entity: 'order',
      entityId: orderId,
      action: 'refund.rejected',
      auditAction: AuditAction.UPDATE,
      newValues: { reason: dto.reason },
    });

    await this.notifications.sendToStaff(
      `Refund request for Order #${order.code} was rejected by ${user.email}. Reason: ${dto.reason}`,
    );

    return { message: 'Refund request rejected successfully.' };
  }

  private async createCommissionAdjustments(
    tx: Prisma.TransactionClient,
    commissions: Commission[],
  ): Promise<number> {
    if (!commissions.length) {
      return 0;
    }

    const adjustedCommissionIds = new Set(
      commissions
        .filter((commission) => commission.adjustsCommissionId)
        .map((commission) => commission.adjustsCommissionId!)
        .filter(Boolean),
    );
    const commissionsToAdjust = commissions.filter(
      (commission) => !commission.isAdjustment && !adjustedCommissionIds.has(commission.id),
    );

    if (!commissionsToAdjust.length) {
      return 0;
    }

    await Promise.all(
      commissionsToAdjust.map((commission) =>
        tx.commission.create({
          data: {
            organizationId: commission.organizationId,
            ruleId: commission.ruleId,
            orderId: commission.orderId,
            customerId: commission.customerId,
            valueGross: commission.valueGross.mul(-1),
            valueNet: commission.valueNet.mul(-1),
            ratePercent: commission.ratePercent,
            amount: commission.amount.mul(-1),
            currency: commission.currency,
            status: CommissionStatus.PENDING,
            periodMonth: commission.periodMonth,
            source: commission.source,
            split: commission.split,
            isAdjustment: true,
            adjustsCommissionId: commission.id,
            traceId: `refund-${commission.orderId}`,
          },
        }),
      ),
    );

    return commissionsToAdjust.length;
  }

  private buildReturnItemsFromOrder(orderItems: { id: string; productId: string; quantity: number; unitPrice: Prisma.Decimal | number }[]) {
    return orderItems.map((item) => {
      const refundPrice = new Prisma.Decimal(item.unitPrice ?? 0);
      const lineTotal = refundPrice.mul(item.quantity);
      return {
        orderItemId: item.id,
        productId: item.productId,
        quantity: item.quantity,
        refundPrice,
        lineTotal,
      };
    });
  }

  private buildReturnItemsFromDto(
    items: ApproveRefundItemDto[],
    orderItems: { id: string; productId: string; quantity: number; unitPrice: Prisma.Decimal | number }[],
  ) {
    const map = new Map(orderItems.map((item) => [item.id, item]));
    return items.map((input) => {
      const matching = map.get(input.orderItemId);
      if (!matching) {
        throw new BadRequestException({
          code: 'REFUND_ITEM_INVALID',
          message: `Order item ${input.orderItemId} is invalid for this order`,
        });
      }
      if (input.quantity > matching.quantity) {
        throw new BadRequestException({
          code: 'REFUND_QUANTITY_INVALID',
          message: `Refund quantity cannot exceed ordered quantity for item ${input.orderItemId}`,
        });
      }

      const refundPriceDecimal = new Prisma.Decimal(
        input.refundPrice !== undefined ? input.refundPrice : matching.unitPrice ?? 0,
      );
      const lineTotal = refundPriceDecimal.mul(input.quantity);
      return {
        orderItemId: matching.id,
        productId: matching.productId,
        quantity: input.quantity,
        refundPrice: refundPriceDecimal,
        lineTotal,
      };
    });
  }

  private async generateReturnCode(organizationId: string): Promise<string> {
    const prefix = 'RET';
    const lastReturn = await this.prisma.orderReturn.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: { code: true },
    });

    const lastNumber = lastReturn?.code?.split('-').pop();
    const seq = lastNumber ? Number(lastNumber) + 1 : 1;
    return `${prefix}-${seq.toString().padStart(4, '0')}`;
  }
}
