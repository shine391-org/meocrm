import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { Prisma, Order } from '@prisma/client';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

type PrismaTransactionalClient = Prisma.TransactionClient;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

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

      // 2. Validate products and calculate
      let subtotal = 0;
      const itemsData = [];

      for (const item of dto.items) {
        const product = await prisma.product.findFirst({
          where: { id: item.productId, organizationId, deletedAt: null },
          include: { variants: true },
        });

        if (!product) {
          throw new NotFoundException(`Product ${item.productId} not found`);
        }

        let unitPrice = Number(product.sellPrice);
        let selectedVariant = null;

        if (item.variantId) {
          const variant = product.variants.find((v) => v.id === item.variantId);
          if (!variant) {
            throw new NotFoundException(`Variant ${item.variantId} not found`);
          }
          unitPrice = Number(variant.sellPrice);
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

      // 3. Calculate totals
      const tax = subtotal * 0.1; // 10% VAT
      const total =
        subtotal + tax + (dto.shipping || 0) - (dto.discount || 0);

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
          shipping: dto.shipping || 0,
          discount: dto.discount || 0,
          total,
          isPaid: dto.isPaid || false,
          paidAmount: dto.paidAmount || 0,
          status: 'PENDING',
          paymentMethod: dto.paymentMethod,
          notes: dto.notes,
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

      return order;
    });
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
        return {
          ...rest,
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

    return order;
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

    const VALID_TRANSITIONS: Record<Order['status'], Order['status'][]> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PROCESSING', 'CANCELLED'],
      PROCESSING: ['SHIPPED', 'CANCELLED'],
      SHIPPED: ['DELIVERED', 'CANCELLED'],
      DELIVERED: [],
      CANCELLED: [],
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

    return this.prisma.order.update({
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
  }
}
