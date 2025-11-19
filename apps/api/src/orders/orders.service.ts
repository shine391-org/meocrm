import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, CreateOrderItemDto, ItemDiscountType } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import {
  Prisma,
  OrderStatus,
  PaymentMethod,
  User,
  OrderInventoryReservationStatus,
  AuditAction,
} from '@prisma/client';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PricingService } from './pricing.service';
import { CustomerStatsService } from '../customers/services/customer-stats.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderWarning, OrderStatusChangedEvent } from './orders.types';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RequestContextService } from '../common/context/request-context.service';

type PrismaTransactionalClient = Prisma.TransactionClient;
type OrderFinancialInput = {
  subtotal: Prisma.Decimal | number;
  tax: Prisma.Decimal | number;
  shipping: Prisma.Decimal | number;
  discount: Prisma.Decimal | number;
  paidAmount: Prisma.Decimal | number;
};

type OrderActor = Pick<User, 'id' | 'organizationId'> | undefined;

const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [
    OrderStatus.CONFIRMED,
    OrderStatus.PROCESSING,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [
    OrderStatus.SHIPPED,
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
    OrderStatus.PENDING,
  ],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.PENDING],
  [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

const CANCELLABLE_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.PROCESSING,
];

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
    private readonly eventEmitter: EventEmitter2,
    private readonly customerStatsService: CustomerStatsService,
    private readonly auditLogService: AuditLogService,
    private readonly requestContextService: RequestContextService,
  ) {}

  private readonly logger = new Logger(OrdersService.name);

  async generateOrderCode(
    organizationId: string,
    prisma?: PrismaTransactionalClient,
  ): Promise<string> {
    const db = prisma || this.prisma;
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: { code: true },
    });

    const rawToken =
      organization?.code?.replace(/[^A-Z0-9]/gi, '').toUpperCase() ||
      organizationId.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const orgSegment = rawToken.slice(-6) || 'ORG';
    const prefix = `ORD-${orgSegment}`;

    const lastOrder = await db.order.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });

    const nextNumber = lastOrder
      ? (parseInt(lastOrder.code.replace(`${prefix}-`, ''), 10) || 0) + 1
      : 1;

    return `${prefix}-${nextNumber.toString().padStart(4, '0')}`;
  }

  async create(dto: CreateOrderDto, organizationId: string, user: User) {
    if (!dto.items?.length) {
      throw new BadRequestException('Order must include at least one item');
    }

    return this.prisma.$transaction(async (prisma) => {
      const customer = await prisma.customer.findFirst({
        where: { id: dto.customerId, organizationId, deletedAt: null },
      });
      if (!customer) {
        throw new NotFoundException(
          `Customer with ID ${dto.customerId} not found`,
        );
      }

      const branch = await prisma.branch.findFirst({
        where: { id: dto.branchId, organizationId },
      });
      if (!branch) {
        throw new NotFoundException(
          `Branch with ID ${dto.branchId} not found`,
        );
      }

      const {
        itemsData,
        subtotal,
        warnings,
        taxableSubtotal,
        itemDiscountTotal,
      } = await this.calculateOrderTotals(
        dto.items,
        organizationId,
        prisma,
      );

      const discount = Number(dto.discount ?? 0);

      const pricingResult = await this.pricingService.calculateTotals({
        channel: dto.channel,
        subtotal,
        taxableSubtotal,
        orderDiscount: discount,
        itemDiscountTotal,
      });
      if (discount < 0) {
        throw new BadRequestException('Discount must be zero or positive');
      }
      if (discount > subtotal) {
        throw new BadRequestException('Discount cannot exceed subtotal');
      }

      const tax = Number(pricingResult.taxAmount ?? 0);
      const shipping = Number(pricingResult.shippingFee ?? 0);
      const total = subtotal - discount + tax + shipping;

      if (total <= 0) {
        throw new BadRequestException('Order total must be greater than zero');
      }

      const basePaidAmount = Number(dto.paidAmount ?? 0);
      const wantsPaid = Boolean(dto.isPaid);

      if (basePaidAmount < 0) {
        throw new BadRequestException('paidAmount cannot be negative');
      }

      if (wantsPaid && basePaidAmount !== total) {
        throw new BadRequestException(
          `When isPaid is true, paidAmount must equal total (${total})`,
        );
      }

      if (!wantsPaid && basePaidAmount > 0) {
        throw new BadRequestException('Partial payments are not supported');
      }

      if (dto.paymentMethod === PaymentMethod.COD && wantsPaid) {
        throw new BadRequestException('COD orders cannot be marked as paid upfront');
      }

      const paidAmount = wantsPaid ? total : 0;
      const isPaid = wantsPaid;

      const status =
        dto.channel?.toUpperCase() === 'POS' && isPaid
          ? OrderStatus.COMPLETED
          : OrderStatus.PENDING;

      const order = await prisma.order.create({
        data: {
          code: await this.generateOrderCode(organizationId, prisma),
          customerId: dto.customerId,
          branchId: dto.branchId,
          subtotal,
          tax,
          shipping,
          discount,
          total,
          isPaid,
          paidAmount,
          paymentMethod: dto.paymentMethod,
          notes: dto.notes ?? null,
          status,
          completedAt: status === OrderStatus.COMPLETED ? new Date() : undefined,
          organizationId,
          taxableSubtotal: pricingResult.taxBreakdown.taxableAmount,
          taxBreakdown: pricingResult.taxBreakdown,
          items: { create: itemsData },
        },
        include: {
          customer: true,
          items: {
            include: {
              product: true,
              variant: true,
            },
          },
          branch: true,
        },
      });

      if (status === OrderStatus.COMPLETED) {
        await this.finalizeOrderCompletion(
          order.id,
          organizationId,
          prisma,
        );
      }
      const traceId = this.requestContextService.getTraceId();
      const normalized = this.mapOrderResponse(order);

      this.eventEmitter.emit('orders.created', {
        orderId: order.id,
        organizationId,
        userId: user?.id,
        warnings,
      });

      await this.auditLogService.log({
        user: this.resolveAuditUser(user, organizationId),
        entity: 'order',
        entityId: order.id,
        action: 'order.created',
        auditAction: AuditAction.CREATE,
        newValues: {
          order: {
            id: order.id,
            status: order.status,
            total: Number(order.total),
          },
          traceId,
        },
      });

      return {
        data: normalized,
        warnings,
      };
    });
  }

  async update(
    id: string,
    dto: UpdateOrderDto,
    organizationId: string,
    _user?: User,
  ) {
    const { data: order } = await this.findOne(id, organizationId);
    const previousFinancials = this.calculateOrderFinancials(order);

    // ⚠️ Only allow update if status = PENDING
    if (order.status !== 'PENDING') {
      throw new BadRequestException(
        'Cannot update order with status ' + order.status,
      );
    }

    // If items changed, recalculate totals inside transaction
    return this.prisma.$transaction(async (prisma) => {
      let subtotal = Number(order.subtotal);
      let tax = Number(order.tax);
      let itemsData: any[] | undefined = undefined;

      // Delete old items if items provided
      if (dto.items) {
        await prisma.orderItem.deleteMany({ where: { orderId: id } });
        const calculated = await this.calculateOrderTotals(
          dto.items,
          organizationId,
          prisma,
        );
        subtotal = calculated.subtotal;
        itemsData = calculated.itemsData;

        const pricingTotals = await this.pricingService.calculateTotals({
          channel: undefined,
          subtotal,
        });
        tax = Number(pricingTotals.taxAmount ?? subtotal * pricingTotals.taxRate);
      }

      const shipping = Number(dto.shipping ?? order.shipping);
      const discount = Number(dto.discount ?? order.discount);
      const total = subtotal + tax + shipping - discount;
      const nextFinancials = this.calculateOrderFinancials({
        subtotal,
        tax,
        shipping,
        discount,
        paidAmount: order.paidAmount,
      });

      const orderUpdate = await prisma.order.update({
        where: { id },
        data: {
          customerId: dto.customerId,
          items: dto.items ? { create: itemsData } : undefined,
          paymentMethod: dto.paymentMethod,
          subtotal: dto.items ? subtotal : undefined,
          tax: dto.items ? tax : undefined,
          shipping,
          discount,
          total,
          notes: dto.notes,
          updatedAt: new Date(),
        },
        include: {
          customer: true,
          items: true,
          branch: true,
        },
      });

      const totalDelta =
        nextFinancials.totalAmount - previousFinancials.totalAmount;
      const debtDelta = order.isPaid
        ? 0
        : nextFinancials.outstanding - previousFinancials.outstanding;

      if (totalDelta !== 0 || debtDelta !== 0) {
        await prisma.customer.updateMany({
          where: {
            id: order.customerId!,
            organizationId,
            deletedAt: null,
          },
          data: {
            ...(totalDelta !== 0 && {
              totalSpent: { increment: totalDelta },
            }),
            ...(!order.isPaid && debtDelta !== 0 && {
              debt: { increment: debtDelta },
            }),
          },
        });
      }

      return { data: this.mapOrderResponse(orderUpdate) };
    });
  }

  async remove(id: string, organizationId: string, _user?: User) {
    const { data: order } = await this.findOne(id, organizationId);

    // ⚠️ Only allow delete if status = PENDING or CANCELLED
    const removableStatuses: OrderStatus[] = [
      OrderStatus.PENDING,
      OrderStatus.CANCELLED,
    ];
    if (!removableStatuses.includes(order.status)) {
      throw new BadRequestException(
        `Cannot delete order with status ${order.status}. Only PENDING or CANCELLED orders can be deleted.`,
      );
    }

    return this.prisma.$transaction(async (prisma) => {
      // Revert customer stats if order was counted
      if (order.status === OrderStatus.PENDING && order.customerId) {
        const { totalAmount, outstanding } = this.calculateOrderFinancials({
          subtotal: order.subtotal,
          tax: order.tax,
          shipping: order.shipping,
          discount: order.discount,
          paidAmount: order.paidAmount,
        });

        const debtBefore = Number(order.customer?.debt ?? 0);
        const debtDecrement = order.isPaid
          ? 0
          : Math.min(outstanding, debtBefore);

        await this.customerStatsService.revertStatsOnOrderCancel(
          order.customerId,
          totalAmount,
          prisma,
          organizationId,
        );

        if (debtDecrement > 0) {
          await this.customerStatsService.updateDebt(
            order.customerId,
            -debtDecrement,
            prisma,
            organizationId,
          );
        }
      }

      // Soft delete
      const deleted = await prisma.order.update({
        where: { id },
        data: { deletedAt: new Date() },
        include: {
          customer: true,
          items: {
            include: {
              product: true,
              variant: true,
            },
          },
          branch: true,
        },
      });

      return { data: this.mapOrderResponse(deleted) };
    });
  }

  private calculateOrderFinancials(data: OrderFinancialInput) {
    const subtotal = Number(data.subtotal) || 0;
    const tax = Number(data.tax) || 0;
    const shipping = Number(data.shipping) || 0;
    const discount = Number(data.discount) || 0;
    const paidAmount = Number(data.paidAmount) || 0;

    const totalAmount = subtotal + tax + shipping - discount;
    const outstanding = Math.max(totalAmount - paidAmount, 0);

    return { totalAmount, outstanding };
  }

  private async calculateOrderTotals(
    items: CreateOrderItemDto[],
    organizationId: string,
    prisma: PrismaTransactionalClient,
  ): Promise<{
    itemsData: any[];
    subtotal: number;
    warnings: OrderWarning[];
    taxableSubtotal: number;
    itemDiscountTotal: number;
  }> {
    let subtotal = 0;
    let taxableSubtotal = 0;
    let itemDiscountTotal = 0;
    const itemsData: any[] = [];
    const warnings: OrderWarning[] = [];

    for (const item of items) {
      const product = await prisma.product.findFirst({
        where: { id: item.productId, organizationId, deletedAt: null },
        include: { variants: true },
      });

      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }

      const basePrice = Number(product.sellPrice);
      let unitPrice = basePrice;
      let selectedVariant: { id: string; additionalPrice: Prisma.Decimal | number; stock: number; sku?: string | null } | null =
        null;

      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant) {
          throw new NotFoundException(`Variant ${item.variantId} not found`);
        }
        const variantPrice = basePrice + Number(variant.additionalPrice ?? 0);
        if (variantPrice <= 0) {
          throw new BadRequestException('Variant price must be greater than zero');
        }
        unitPrice = variantPrice;
        selectedVariant = variant;
      }

      const availableStock = Number(
        selectedVariant ? selectedVariant.stock : product.stock,
      );

      if (availableStock <= 0) {
        throw new BadRequestException(
          `Product ${product.name} is out of stock`,
        );
      }

      if (availableStock < item.quantity) {
        warnings.push({
          type: 'LOW_STOCK',
          productId: product.id,
          variantId: selectedVariant?.id,
          sku: selectedVariant?.sku ?? product.sku,
          available: availableStock,
          requested: item.quantity,
          message: `Only ${availableStock} units available for ${product.name}, requested ${item.quantity}`,
        });
      }

      const unitDiscount = this.resolveUnitDiscount(item, unitPrice);
      const lineSubtotal = unitPrice * item.quantity;
      const lineDiscount = Math.min(lineSubtotal, unitDiscount * item.quantity);
      const netLineTotal = Math.max(0, lineSubtotal - lineDiscount);
      const netUnitPrice = unitPrice - unitDiscount;

      subtotal += lineSubtotal;
      itemDiscountTotal += lineDiscount;

      if (!item.taxExempt) {
        taxableSubtotal += netLineTotal;
      }

      const costPrice = Number(product.costPrice ?? 0);
      if (netUnitPrice < costPrice) {
        warnings.push({
          type: 'LOSS_SALE',
          productId: product.id,
          variantId: selectedVariant?.id,
          sku: selectedVariant?.sku ?? product.sku,
          available: availableStock,
          requested: item.quantity,
          message: `Net price ${netUnitPrice.toFixed(2)} is lower than cost ${costPrice.toFixed(2)}`,
        });
      }

      itemsData.push({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice,
        subtotal: lineSubtotal,
        discountType: item.discountType ?? null,
        discountValue: item.discountValue ?? null,
        discountAmount: lineDiscount,
        netTotal: netLineTotal,
        isTaxExempt: Boolean(item.taxExempt),
        organizationId,
      });
    }

    return { itemsData, subtotal, warnings, taxableSubtotal, itemDiscountTotal };
  }

  async findAll(organizationId: string, query: QueryOrdersDto) {
    const {
      page,
      limit,
      status,
      customerId,
      fromDate,
      toDate,
      paymentMethod,
      branchId,
    } = query;
    const where: Prisma.OrderWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }
    if (customerId) {
      where.customerId = customerId;
    }
    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }
    if (branchId) {
      where.branchId = branchId;
    }
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        where.createdAt.gte = new Date(fromDate);
      }
      if (toDate) {
        where.createdAt.lte = new Date(toDate);
      }
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          customer: {
            select: { name: true, phone: true },
          },
          branch: {
            select: { id: true, name: true },
          },
          _count: {
            select: { items: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders.map((order) => {
        const { _count, ...rest } = order;
        const normalized = this.mapOrderResponse(rest);
        return {
          ...normalized,
          itemsCount: _count.items,
        };
      }),
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, organizationId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        branch: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return { data: this.mapOrderResponse(order) };
  }

  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
    organizationId: string,
    actor?: OrderActor,
  ) {
    const traceId = this.requestContextService.getTraceId();
    const result = await this.prisma.$transaction(async (prisma) => {
      const order = await prisma.order.findFirst({
        where: { id, organizationId, deletedAt: null },
        include: {
          customer: true,
          items: {
            include: {
              product: true,
              variant: true,
            },
          },
          branch: true,
        },
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      if (order.status === dto.status) {
        throw new BadRequestException('Order already in the requested status');
      }

      const allowedTransitions = ORDER_STATUS_TRANSITIONS[order.status] ?? [];
      if (!allowedTransitions.includes(dto.status)) {
        throw new BadRequestException(
          `Cannot transition from ${order.status} to ${
            dto.status
          }. Valid transitions: ${allowedTransitions.join(', ')}`,
        );
      }

      const shippingStatusGuard: OrderStatus[] = [
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
        OrderStatus.COMPLETED,
      ];

      if (
        order.paymentMethod === PaymentMethod.COD &&
        shippingStatusGuard.includes(dto.status)
      ) {
        const shippingOrder = await prisma.shippingOrder.findFirst({
          where: { orderId: order.id },
          select: { id: true },
        });

        if (!shippingOrder) {
          throw new BadRequestException(
            'COD orders require a shipping order before advancing to shipping statuses',
          );
        }
      }

      if (
        dto.status === OrderStatus.CANCELLED &&
        !CANCELLABLE_STATUSES.includes(order.status)
      ) {
        throw new BadRequestException(
          'Only pending or processing orders can be cancelled',
        );
      }

      const updateData: Prisma.OrderUpdateInput = {
        status: dto.status,
        updatedAt: new Date(),
      };

      if (dto.notes) {
        updateData.notes = order.notes
          ? `${order.notes}\n${dto.notes}`
          : dto.notes;
      }

      if (dto.status === OrderStatus.COMPLETED) {
        updateData.completedAt = new Date();
        if (order.paymentMethod === PaymentMethod.COD && !order.isPaid) {
          updateData.isPaid = true;
          updateData.paidAmount = order.total;
          updateData.paidAt = new Date();
        }
      }

      const updated = await prisma.order.update({
        where: { id: order.id },
        data: updateData,
        include: {
          customer: true,
          items: {
            include: {
              product: true,
              variant: true,
            },
          },
          branch: true,
        },
      });

      if (dto.status === OrderStatus.COMPLETED) {
        await this.finalizeOrderCompletion(updated.id, organizationId, prisma);
      }

      if (
        dto.status === OrderStatus.CANCELLED &&
        order.customerId &&
        order.completedAt
      ) {
        const { totalAmount, outstanding } = this.calculateOrderFinancials({
          subtotal: order.subtotal,
          tax: order.tax,
          shipping: order.shipping,
          discount: order.discount,
          paidAmount: order.paidAmount,
        });

        await this.customerStatsService.revertStatsOnOrderCancel(
          order.customerId,
          totalAmount,
          prisma,
          organizationId,
        );

        const debtBefore = Number(order.customer?.debt ?? 0);
        const debtDecrement = Math.min(outstanding, debtBefore);
        if (debtDecrement > 0) {
          await this.customerStatsService.updateDebt(
            order.customerId,
            -debtDecrement,
            prisma,
            organizationId,
          );
        }
      }

      return {
        updated,
        previousStatus: order.status,
      };
    });

    this.eventEmitter.emit('orders.status.changed', {
      orderId: result.updated.id,
      organizationId,
      previousStatus: result.previousStatus,
      nextStatus: dto.status,
      userId: actor?.id,
      traceId,
    } satisfies OrderStatusChangedEvent);

    await this.auditLogService.log({
      user: this.resolveAuditUser(actor, organizationId),
      entity: 'order',
      entityId: result.updated.id,
      action: 'order.status.changed',
      auditAction: AuditAction.UPDATE,
      oldValues: { status: result.previousStatus },
      newValues: { status: dto.status, traceId },
    });

    return { data: this.mapOrderResponse(result.updated) };
  }

  async markCodPaid(
    id: string,
    organizationId: string,
    collectedCodAmount?: number,
    actor?: OrderActor,
  ) {
    const traceId = this.requestContextService.getTraceId();
    const outcome = await this.prisma.$transaction(async (prisma) => {
      const order = await prisma.order.findFirst({
        where: { id, organizationId, deletedAt: null },
        include: { customer: true },
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      if (order.paymentMethod !== PaymentMethod.COD) {
        throw new BadRequestException('COD payment confirmation only applies to COD orders');
      }

      if (order.status !== OrderStatus.COMPLETED) {
        throw new BadRequestException('COD payment can only be confirmed once the order is completed');
      }

      if (order.isPaid) {
        return { updated: order, previous: order, appliedAmount: 0 };
      }

      const outstanding = Math.max(
        Number(order.total) - Number(order.paidAmount ?? 0),
        0,
      );

      if (outstanding <= 0) {
        throw new BadRequestException('Order has no outstanding COD amount');
      }

      const appliedAmount = Math.min(outstanding, collectedCodAmount ?? outstanding);

      if (appliedAmount <= 0) {
        throw new BadRequestException('Collected COD amount must be greater than zero');
      }

      const newPaidAmount = Number(order.paidAmount ?? 0) + appliedAmount;
      const isFullyPaid = newPaidAmount >= Number(order.total);

      const updated = await prisma.order.update({
        where: { id: order.id },
        data: {
          paidAmount: newPaidAmount,
          isPaid: isFullyPaid,
          paidAt: isFullyPaid ? new Date() : order.paidAt,
        },
        include: {
          customer: true,
          items: {
            include: {
              product: true,
              variant: true,
            },
          },
          branch: true,
        },
      });

      if (order.customerId) {
        await this.customerStatsService.updateDebt(
          order.customerId,
          -appliedAmount,
          prisma,
          organizationId,
        );
      }

      return { updated, previous: order, appliedAmount };
    });

    if (outcome.appliedAmount > 0) {
      await this.auditLogService.log({
        user: this.resolveAuditUser(actor, organizationId),
        entity: 'order',
        entityId: outcome.updated.id,
        action: 'order.cod_paid',
        auditAction: AuditAction.UPDATE,
        oldValues: { paidAmount: Number(outcome.previous.paidAmount ?? 0) },
        newValues: { paidAmount: Number(outcome.updated.paidAmount ?? 0), traceId },
      });
    }

    return { data: this.mapOrderResponse(outcome.updated) };
  }

  async finalizeOrderCompletion(
    orderId: string,
    organizationId: string,
    prisma?: PrismaTransactionalClient,
  ) {
    const db = prisma || this.prisma;
    const order = await db.order.findFirst({
      where: { id: orderId, organizationId, deletedAt: null },
      select: {
        id: true,
        total: true,
        paidAmount: true,
        customerId: true,
      },
    });

    if (!order) {
      this.logger.warn(`Order ${orderId} not found when finalizing completion`);
      return;
    }

    if (order.customerId) {
      await this.customerStatsService.updateStatsOnOrderComplete(
        order.customerId,
        Number(order.total),
        db,
        organizationId,
      );

      const outstanding = Math.max(
        Number(order.total) - Number(order.paidAmount ?? 0),
        0,
      );

      if (outstanding > 0) {
        await this.customerStatsService.updateDebt(
          order.customerId,
          outstanding,
          db,
          organizationId,
        );
      }
    }

    await db.orderInventoryReservation.updateMany({
      where: {
        orderId,
        organizationId,
        status: OrderInventoryReservationStatus.RESERVED,
      },
      data: {
        status: OrderInventoryReservationStatus.RELEASED,
      },
    });
  }

  private resolveAuditUser(user: OrderActor | undefined, organizationId: string) {
    if (user?.id && user.organizationId) {
      return { id: user.id, organizationId: user.organizationId };
    }

    return {
      id: user?.id ?? 'system-order-automation',
      organizationId,
    };
  }

  private resolveUnitDiscount(item: CreateOrderItemDto, unitPrice: number) {
    if (!item.discountType || item.discountValue === undefined || item.discountValue === null) {
      return 0;
    }

    if (item.discountType === ItemDiscountType.PERCENT) {
      const percent = Math.max(0, Math.min(100, Number(item.discountValue)));
      return Math.min(unitPrice, (unitPrice * percent) / 100);
    }

    return Math.min(unitPrice, Number(item.discountValue));
  }

  private mapOrderResponse(order: any) {
    return {
      ...order,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      shipping: Number(order.shipping),
      discount: Number(order.discount),
      total: Number(order.total),
      taxableSubtotal: Number(order.taxableSubtotal ?? order.subtotal),
      taxBreakdown: order.taxBreakdown ?? undefined,
      paidAmount: Number(order.paidAmount),
      branch: order.branch
        ? {
            id: order.branch.id,
            name: order.branch.name,
          }
        : undefined,
      items: order.items?.map((item: any) => ({
        ...item,
        price: Number(item.unitPrice),
        quantity: Number(item.quantity),
        discount: Number(item.discountAmount ?? 0),
        netTotal: Number(item.netTotal ?? item.subtotal),
        total: Number(item.subtotal),
        isTaxExempt: Boolean(item.isTaxExempt),
      })),
      customer: order.customer
        ? {
            ...order.customer,
            totalSpent: Number(order.customer.totalSpent),
            debt: Number(order.customer.debt),
            totalOrders: Number(order.customer.totalOrders),
          }
        : undefined,
    };
  }
}
