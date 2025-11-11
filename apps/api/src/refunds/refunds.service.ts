import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { OrderStatus, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { SettingsService } from '../modules/settings/settings.service';
import { RefundRequestDto } from './dto/refund-request.dto';
import { RefundRejectDto } from './dto/refund-reject.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class RefundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly notifications: NotificationsService,
    private readonly settings: SettingsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async requestRefund(
    orderId: string,
    dto: RefundRequestDto,
    user: User,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: `Order with ID ${orderId} not found.`,
      });
    }

    await this.auditLog.log({
      user,
      entity: 'order',
      entityId: orderId,
      action: 'refund.requested',
      newValues: { reason: dto.reason },
    });

    await this.notifications.sendToStaff(
      `Refund requested for Order #${order.code} by ${user.email}. Reason: ${dto.reason}`,
    );

    return { message: 'Refund request submitted successfully.' };
  }

  async approveRefund(orderId: string, user: User) {
    const windowDays =
      (await this.settings.get<number>('refund.windowDays')) ?? 7;
    const restockOnRefund =
      (await this.settings.get<boolean>('refund.restockOnRefund')) ?? true;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            variant: true,
          },
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

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      if (restockOnRefund) {
        for (const item of order.items) {
          if (!item.variantId) {
            continue;
          }

          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      // TODO: Create negative commission adjustment

      const result = await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
      });

      await this.auditLog.log({
        user,
        entity: 'order',
        entityId: orderId,
        action: 'refund.approved',
        newValues: { restocked: Boolean(restockOnRefund) },
      });

      return result;
    });

    await this.notifications.sendToStaff(
      `Refund approved for Order #${order.code} by ${user.email}.`,
    );

    this.eventEmitter.emit('order.refunded', {
      order: updatedOrder,
      trigger: 'manual_refund',
      userId: user.id,
    });

    return updatedOrder;
  }

  async rejectRefund(
    orderId: string,
    dto: RefundRejectDto,
    user: User,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: `Order with ID ${orderId} not found.`,
      });
    }

    await this.auditLog.log({
      user,
      entity: 'order',
      entityId: orderId,
      action: 'refund.rejected',
      newValues: { reason: dto.reason },
    });

    await this.notifications.sendToStaff(
      `Refund request for Order #${order.code} was rejected by ${user.email}. Reason: ${dto.reason}`,
    );

    return { message: 'Refund request rejected successfully.' };
  }
}
