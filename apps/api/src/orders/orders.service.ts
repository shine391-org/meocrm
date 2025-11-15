import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, CreateOrderItemDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { Prisma, OrderStatus } from '@prisma/client';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PricingService } from './pricing.service';

type PrismaTransactionalClient = Prisma.TransactionClient;
type OrderFinancialInput = {
  subtotal: Prisma.Decimal | number;
  tax: Prisma.Decimal | number;
  shipping: Prisma.Decimal | number;
  discount: Prisma.Decimal | number;
  paidAmount: Prisma.Decimal | number;
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
  ) {}

  private mapOrderResponse<T extends { subtotal: any; tax: any; shipping: any; discount: any; total: any; paidAmount: any; items?: any[] }>(
    order: T,
  ): T {
    if (!order) {
      return order;
    }

    const normalize = (value: Prisma.Decimal | number) =>
      typeof value === 'number' ? value : Number(value);

    return {
      ...order,
      subtotal: normalize(order.subtotal),
      tax: normalize(order.tax),
      shipping: normalize(order.shipping),
      discount: normalize(order.discount),
      total: normalize(order.total),
      paidAmount: normalize(order.paidAmount),
      items: Array.isArray(order.items)
        ? order.items.map((item) => ({
            ...item,
            unitPrice: normalize(item.unitPrice),
            subtotal: normalize(item.subtotal),
          }))
        : order.items,
    };
  }

  async generateOrderCode(
    organizationId: string,
    prisma?: PrismaTransactionalClient,
  ): Promise<string> {
    const db = prisma || this.prisma;
    const lastOrder = await db.order.findFirst({
      where: { organizationId, code: { startsWith: 'ORD' } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });

    if (!lastOrder) {
      return 'ORD001';
    }

    const codeNumber = lastOrder.code.substring(3);
    const lastNumber = parseInt(codeNumber, 10);
    return `ORD${(lastNumber + 1).toString().padStart(3, '0')}`;
  }

  async create(dto: CreateOrderDto, organizationId: string) {
    return this.prisma.$transaction(async (prisma) => {
      // 1. Validate customer
      const customer = await prisma.customer.findFirst({
        where: { id: dto.customerId, organizationId, deletedAt: null },
      });
      if (!customer) {
        throw new NotFoundException(
          `Customer with ID ${dto.customerId} not found`,
        );
      }

      // 2. Validate products and calculate totals
      const { itemsData, subtotal, tax } = await this.calculateOrderTotals(
        dto.items,
        organizationId,
        prisma,
      );

      // 3. Calculate shipping and apply promotions (e.g., free ship)
      const pricingResult = await this.pricingService.calculateTotals({
        channel: dto.channel,
        subtotal: subtotal,
      });
      const finalShippingFee = pricingResult.shippingFee;

      // 4. Calculate final total
      const total = subtotal + tax + finalShippingFee - (dto.discount || 0);

      if (dto.paidAmount && dto.paidAmount > total) {
        throw new BadRequestException(
          `paidAmount (${dto.paidAmount}) cannot exceed order total (${total})`,
        );
      }

      if (dto.isPaid === true && dto.paidAmount !== total) {
        throw new BadRequestException(
          `When isPaid is true, paidAmount must equal total (${total})`,
        );
      }

      // 4. Generate code
      const code = await this.generateOrderCode(organizationId, prisma);

      // 5. Create order
      const order = await prisma.order.create({
        data: {
          code,
          customerId: dto.customerId,
          subtotal,
          tax,
          shipping: finalShippingFee,
          discount: dto.discount || 0,
          total,
          isPaid: dto.isPaid || false,
          paidAmount: dto.paidAmount || 0,
          status: OrderStatus.PENDING,
          paymentMethod: dto.paymentMethod,
          notes: dto.notes ?? null,
          organizationId,
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
        },
      });

      // 6. Update customer stats
      await prisma.customer.update({
        where: { id: dto.customerId },
        data: {
          totalSpent: { increment: total },
          totalOrders: { increment: 1 },
          debt: {
            increment: dto.isPaid ? 0 : total - (dto.paidAmount || 0),
          },
          lastOrderAt: new Date(),
        },
      });

      return this.mapOrderResponse(order);
    });
  }

  async update(id: string, dto: UpdateOrderDto, organizationId: string) {
    const order = await this.findOne(id, organizationId);
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
        tax = calculated.tax;
        itemsData = calculated.itemsData;
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
        include: { customer: true, items: true },
      });

      const totalDelta =
        nextFinancials.totalAmount - previousFinancials.totalAmount;
      const debtDelta = order.isPaid
        ? 0
        : nextFinancials.outstanding - previousFinancials.outstanding;

      if (totalDelta !== 0 || debtDelta !== 0) {
        await prisma.customer.update({
          where: { id: order.customerId! },
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

      return orderUpdate;
    });
  }

  async remove(id: string, organizationId: string) {
    const order = await this.findOne(id, organizationId);

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
        const totalSpentDecrement = Math.max(totalAmount, 0);

        await prisma.customer.update({
          where: { id: order.customerId },
          data: {
            ...(totalSpentDecrement > 0 && {
              totalSpent: { decrement: totalSpentDecrement },
            }),
            totalOrders: { decrement: 1 },
            ...(debtDecrement > 0 && {
              debt: { decrement: debtDecrement },
            }),
          },
        });
      }

      // Soft delete
      return prisma.order.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
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
    tax: number;
  }> {
    let subtotal = 0;
    const itemsData = [];

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
      let selectedVariant = null;

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

      // Stock check (log warning only)
      const availableStock = selectedVariant
        ? selectedVariant.stock
        : product.stock;
      if (availableStock < item.quantity) {
        console.warn(
          `Low stock warning: Product SKU ${product.sku}, Available: ${availableStock}, Requested: ${item.quantity}`,
        );
      }

      const itemSubtotal = unitPrice * item.quantity;
      subtotal += itemSubtotal;

      itemsData.push({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice,
        subtotal: itemSubtotal,
        organizationId,
      });
    }

    const tax = subtotal * 0.1; // 10% VAT
    return { itemsData, subtotal, tax };
  }

  async findAll(organizationId: string, query: QueryOrdersDto) {
    const { page, limit, status, customerId, fromDate, toDate } = query;
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
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return this.mapOrderResponse(order);
  }

  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
    organizationId: string,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.COMPLETED]: [],
    };

    const validTransitions = VALID_TRANSITIONS[order.status];
    if (!validTransitions.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${
          dto.status
        }. Valid transitions: ${validTransitions.join(', ')}`,
      );
    }

    // Customer stats are not adjusted for CANCELLED orders per clarification

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes
          ? `${order.notes || ''}\n[${new Date().toISOString()}] ${dto.notes}`
          : order.notes,
        updatedAt: new Date(),
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    return this.mapOrderResponse(updated);
  }
}
