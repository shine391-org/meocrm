
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, CreateOrderItemDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { Prisma, Order, OrderStatus } from '@prisma/client';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

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
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrderDto, organizationId: string) {
    return this.prisma.$transaction(async (prisma) => {
      const customer = await prisma.customer.findFirst({
        where: { id: dto.customerId, organizationId, deletedAt: null },
      });
      if (!customer) {
        throw new NotFoundException(`Customer with ID ${dto.customerId} not found`);
      }

      const { itemsData, subtotal, tax } = await this.calculateOrderTotals(
        dto.items,
        organizationId,
        prisma,
      );

      let shipping = dto.shipping ?? 0;
      // TODO: Replace with actual SettingsService.get('shipping', { organizationId })
      const shippingSettings = { freeShipThreshold: 500000 };
      if (
        (dto as any).isOnlineOrder && // Temporary flag until channel is implemented
        subtotal >= shippingSettings.freeShipThreshold &&
        dto.shipping === undefined
      ) {
        shipping = 0;
      }

      const total = subtotal + tax + shipping - (dto.discount || 0);

      // ... (rest of create logic)

      const code = await this.generateOrderCode(organizationId, prisma);

      const order = await prisma.order.create({
        data: {
          code,
          customerId: dto.customerId,
          subtotal,
          tax,
          shipping,
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
        include: { customer: true, items: true },
      });

      // ... (update customer stats)

      return order;
    });
  }

  async update(id: string, dto: UpdateOrderDto, organizationId: string) {
    const order = await this.findOne(id, organizationId);
    if (order.status !== 'PENDING') {
      throw new BadRequestException('Cannot update order with status ' + order.status);
    }
    // ... (Full update logic will be restored here)
    return order;
  }

  async remove(id: string, organizationId: string) {
    const order = await this.findOne(id, organizationId);
    // ... (Full remove logic will be restored here)
    return await this.prisma.order.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findAll(organizationId: string, query: QueryOrdersDto) {
    // ... (Full findAll logic will be restored here)
    const [orders, total] = await this.prisma.$transaction([
        this.prisma.order.findMany({ where: { organizationId, deletedAt: null } }),
        this.prisma.order.count({ where: { organizationId, deletedAt: null } }),
    ]);
    return { data: orders, meta: { total, page: 1, limit: total, lastPage: 1 } };
  }

  async findOne(id: string, organizationId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { customer: true, items: true },
    });
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto, organizationId: string) {
    const order = await this.findOne(id, organizationId);
    // ... (Full updateStatus logic will be restored here)
    return await this.prisma.order.update({
        where: { id },
        data: { status: dto.status }
    });
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
    if (!lastOrder) return 'ORD001';
    const lastNum = parseInt(lastOrder.code.substring(3), 10);
    return `ORD${(lastNum + 1).toString().padStart(3, '0')}`;
  }

  private async calculateOrderTotals(
    items: CreateOrderItemDto[],
    organizationId: string,
    prisma: PrismaTransactionalClient,
  ) {
    let subtotal = 0;
    const itemsData = [];
    for (const item of items) {
      const product = await prisma.product.findFirst({
        where: { id: item.productId, organizationId },
        include: { variants: true },
      });
      if (!product) throw new NotFoundException(`Product ${item.productId} not found`);
      let unitPrice = Number(product.sellPrice);
      if (item.variantId) {
        const variant = product.variants.find(v => v.id === item.variantId);
        if (!variant) throw new NotFoundException(`Variant ${item.variantId} not found`);
        unitPrice = Number(variant.sellPrice);
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
    return { itemsData, subtotal, tax: subtotal * 0.1 };
  }

  private calculateOrderFinancials(data: OrderFinancialInput) {
      // ...
      return { totalAmount: 0, outstanding: 0 };
  }
}
