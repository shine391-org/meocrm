import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShippingOrderDto } from './dto/create-shipping-order.dto';
import { QueryShippingOrdersDto } from './dto/query-shipping-orders.dto';
import { UpdateShippingStatusDto } from './dto/update-shipping-status.dto';
import { Prisma, OrderStatus, ShippingStatus } from '@prisma/client';
import { ShippingFeeService } from './shipping-fee.service';

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
  ) {}

  async create(organizationId: string, dto: CreateShippingOrderDto) {
    return this.prisma.$transaction(async (tx) => {
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
        },
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

      return { data: shippingOrder };
    });
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
      const updated = await tx.shippingOrder.update({
        where: { id },
        data: {
          status: dto.status,
        },
        include: { partner: true, order: true },
      });

      await this.applyStatusSideEffects(tx, updated, dto);

      return updated;
    });

    return { data: updated };
  }

  private async applyStatusSideEffects(
    tx: Prisma.TransactionClient,
    shippingOrder: any,
    dto: UpdateShippingStatusDto,
  ) {
    if (dto.status === ShippingStatus.DELIVERED) {
      await this.settleCod(tx, shippingOrder, dto.collectedCodAmount);
      if (shippingOrder.orderId) {
        await tx.order.update({
          where: { id: shippingOrder.orderId },
          data: { status: OrderStatus.DELIVERED },
        });
      }
    }

    if (dto.status === ShippingStatus.FAILED) {
      if (shippingOrder.orderId) {
        await tx.order.update({
          where: { id: shippingOrder.orderId },
          data: { status: OrderStatus.PROCESSING },
        });
      }
    }

    if (dto.status === ShippingStatus.RETURNED) {
      if (shippingOrder.orderId) {
        await tx.order.update({
          where: { id: shippingOrder.orderId },
          data: { status: OrderStatus.CANCELLED },
        });
      }
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
}
