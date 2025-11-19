import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShippingOrderDto } from './dto/create-shipping-order.dto';
import { QueryShippingOrdersDto } from './dto/query-shipping-orders.dto';
import { UpdateShippingStatusDto } from './dto/update-shipping-status.dto';
import { Prisma, OrderStatus, PaymentMethod, ShippingStatus, AuditAction } from '@prisma/client';
import { ShippingFeeService } from './shipping-fee.service';
import { OrdersService } from '../orders/orders.service';
import { InventoryService } from '../inventory/inventory.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RequestContextService } from '../common/context/request-context.service';

const SHIPPING_TRANSITIONS: Record<ShippingStatus, ShippingStatus[]> = {
  [ShippingStatus.PENDING]: [ShippingStatus.PICKING_UP, ShippingStatus.FAILED],
  [ShippingStatus.PICKING_UP]: [ShippingStatus.IN_TRANSIT, ShippingStatus.FAILED],
  [ShippingStatus.IN_TRANSIT]: [ShippingStatus.DELIVERED, ShippingStatus.FAILED, ShippingStatus.RETURNED],
  [ShippingStatus.DELIVERED]: [],
  [ShippingStatus.FAILED]: [ShippingStatus.RETURNED],
  [ShippingStatus.RETURNED]: [],
};

@Injectable()
export class ShippingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shippingFeeService: ShippingFeeService,
    private readonly ordersService: OrdersService,
    private readonly inventoryService: InventoryService,
    private readonly auditLogService: AuditLogService,
    private readonly requestContext: RequestContextService,
  ) {}

  async create(organizationId: string, dto: CreateShippingOrderDto) {
    const shippingOrder = await this.prisma.$transaction(async (tx) => {
      const [order, partner, existing] = await Promise.all([
        tx.order.findFirst({ where: { id: dto.orderId, organizationId, deletedAt: null } }),
        tx.shippingPartner.findFirst({ where: { id: dto.partnerId, organizationId } }),
        tx.shippingOrder.findFirst({ where: { trackingCode: dto.trackingCode } }),
      ]);

      if (!order) {
        throw new NotFoundException('Order not found for shipping assignment');
      }

      if (!partner) {
        throw new NotFoundException('Shipping partner not found');
      }

      if (existing) {
        throw new BadRequestException(`Tracking code ${dto.trackingCode} already exists`);
      }

      if (order.status === OrderStatus.CANCELLED) {
        throw new BadRequestException('Cannot ship a cancelled order');
      }

      const computedFee = await this.shippingFeeService.calculate({
        organizationId,
        weight: dto.weight,
        channel: dto.channel,
        partnerId: dto.partnerId,
        distanceKm: dto.distanceKm,
        serviceType: dto.serviceType,
        overrideFee: dto.shippingFee,
      });

      const shippingOrder = await tx.shippingOrder.create({
        data: {
          orderId: dto.orderId,
          partnerId: dto.partnerId,
          trackingCode: dto.trackingCode,
          recipientName: dto.recipientName,
          recipientPhone: dto.recipientPhone,
          recipientAddress: dto.recipientAddress,
          recipientWard: dto.recipientWard,
          recipientDistrict: dto.recipientDistrict,
          recipientProvince: dto.recipientProvince,
          shippingFee: computedFee.shippingFee,
          codAmount: dto.codAmount ?? 0,
          weight: dto.weight,
          notes: dto.notes,
          serviceType: dto.serviceType,
          distanceKm: dto.distanceKm ? Math.round(dto.distanceKm) : null,
          feeBreakdown: computedFee.breakdown,
        },
        include: { partner: true, order: true },
      });

      await tx.shippingPartner.update({
        where: { id: partner.id },
        data: {
          totalOrders: { increment: 1 },
          totalFees: { increment: computedFee.shippingFee },
          totalCOD: { increment: dto.codAmount ?? 0 },
          debtBalance: { increment: dto.codAmount ?? 0 },
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.SHIPPED,
        },
      });

      return shippingOrder;
    });

    const traceId = this.requestContext.getTraceId();
    await this.auditLogService.log({
      user: {
        id: 'shipping-automation',
        organizationId,
      },
      entity: 'shippingOrder',
      entityId: shippingOrder.id,
      action: 'shipping.order.created',
      auditAction: AuditAction.CREATE,
      newValues: {
        status: shippingOrder.status,
        traceId,
      },
    });

    return { data: shippingOrder };
  }

  async findAll(organizationId: string, query: QueryShippingOrdersDto) {
    const { page = 1, limit = 20, status, search } = query;

    const where: Prisma.ShippingOrderWhereInput = {
      partner: { organizationId },
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { trackingCode: { contains: search, mode: 'insensitive' } },
        { order: { code: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.shippingOrder.findMany({
        where,
        include: { partner: true, order: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.shippingOrder.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(organizationId: string, id: string) {
    const shippingOrder = await this.prisma.shippingOrder.findFirst({
      where: { id, partner: { organizationId } },
      include: { partner: true, order: true },
    });

    if (!shippingOrder) {
      throw new NotFoundException('Shipping order not found');
    }

    return { data: shippingOrder };
  }

  async updateStatus(
    organizationId: string,
    id: string,
    dto: UpdateShippingStatusDto,
  ) {
    const shippingOrder = await this.prisma.shippingOrder.findFirst({
      where: { id, partner: { organizationId } },
      include: { order: true, partner: true },
    });

    if (!shippingOrder) {
      throw new NotFoundException('Shipping order not found');
    }

    const allowed = SHIPPING_TRANSITIONS[shippingOrder.status] ?? [];
    if (shippingOrder.status !== dto.status && allowed.length > 0 && !allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${shippingOrder.status} to ${dto.status}`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.ShippingOrderUpdateInput = {
        status: dto.status,
      };

      if (dto.status === ShippingStatus.FAILED && dto.failedReason) {
        updateData.failedReason = dto.failedReason;
      }

      if (dto.status === ShippingStatus.RETURNED && dto.returnReason) {
        updateData.returnReason = dto.returnReason;
      }

      if (
        dto.status === ShippingStatus.FAILED ||
        dto.status === ShippingStatus.RETURNED
      ) {
        updateData.retryCount = { increment: 1 };
      }

      if (dto.collectedCodAmount !== undefined) {
        updateData.codAmount = dto.collectedCodAmount;
      }

      const record = await tx.shippingOrder.update({
        where: { id },
        data: updateData,
        include: { partner: true, order: true },
      });

      await this.applyStatusSideEffects(tx, record, dto);

      return record;
    });

    await this.logShippingStatusChange(shippingOrder, updated, dto.status);
    await this.syncOrderForShippingStatus(updated, dto);

    return { data: updated };
  }

  private async applyStatusSideEffects(
    tx: Prisma.TransactionClient,
    shippingOrder: any,
    dto: UpdateShippingStatusDto,
  ) {
    if (dto.status === ShippingStatus.DELIVERED) {
      await this.settleCod(tx, shippingOrder, dto.collectedCodAmount);
    }
  }

  private async settleCod(
    tx: Prisma.TransactionClient,
    shippingOrder: any,
    collectedCodAmount?: number,
  ) {
    const currentCod = Number(shippingOrder.codAmount ?? 0);
    const targetCod = Number(collectedCodAmount ?? currentCod);

    if (targetCod !== currentCod) {
      await tx.shippingOrder.update({
        where: { id: shippingOrder.id },
        data: { codAmount: targetCod },
      });
    }

    if (targetCod > 0 && shippingOrder.partner) {
      await tx.shippingPartner.update({
        where: { id: shippingOrder.partner.id },
        data: { debtBalance: { decrement: targetCod } },
      });
    }
  }

  private async logShippingStatusChange(
    previous: any,
    updated: any,
    status: ShippingStatus,
  ) {
    const organizationId =
      previous.partner?.organizationId ?? updated.partner?.organizationId;
    if (!organizationId) {
      return;
    }

    const traceId = this.requestContext.getTraceId();
    await this.auditLogService.log({
      user: {
        id: 'shipping-automation',
        organizationId,
      },
      entity: 'shippingOrder',
      entityId: previous.id,
      action: 'shipping.status.changed',
      auditAction: AuditAction.UPDATE,
      oldValues: { status: previous.status },
      newValues: { status, traceId },
    });
  }

  private async syncOrderForShippingStatus(
    shippingOrder: any,
    dto: UpdateShippingStatusDto,
  ) {
    if (!shippingOrder.orderId || !shippingOrder.order) {
      return;
    }

    const organizationId = shippingOrder.partner?.organizationId;
    if (!organizationId) {
      return;
    }

    const actor = { id: 'shipping-automation', organizationId };

    if (dto.status === ShippingStatus.DELIVERED) {
      await this.ordersService.updateStatus(
        shippingOrder.orderId,
        { status: OrderStatus.DELIVERED },
        organizationId,
        actor,
      );

      await this.ordersService.updateStatus(
        shippingOrder.orderId,
        { status: OrderStatus.COMPLETED },
        organizationId,
        actor,
      );

      if (shippingOrder.order.paymentMethod === PaymentMethod.COD) {
        await this.ordersService.markCodPaid(
          shippingOrder.orderId,
          organizationId,
          dto.collectedCodAmount,
          actor,
        );
      }

      return;
    }

    if (
      dto.status === ShippingStatus.FAILED ||
      dto.status === ShippingStatus.RETURNED
    ) {
      await this.ordersService.updateStatus(
        shippingOrder.orderId,
        { status: OrderStatus.PENDING },
        organizationId,
        actor,
      );

      await this.inventoryService.returnStockOnOrderCancel(
        shippingOrder.orderId,
        organizationId,
        actor,
      );
    }
  }
}
