import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  AdjustmentType,
  AuditAction,
  InventoryReservationAlertStatus,
  OrderInventoryReservationStatus,
  OrderStatus,
  Prisma,
  ShippingStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { GetInventoryDto } from './dto/get-inventory.dto';
import { AdjustStockDto, StockAdjustmentReason } from './dto/adjust-stock.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { GetReservationAlertsDto } from './dto/get-reservation-alerts.dto';
import { ScanReservationAlertsDto } from './dto/scan-reservation-alerts.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RequestContextService } from '../common/context/request-context.service';

type PrismaTransactionalClient = Prisma.TransactionClient;

type ReservationActorInput = string | Partial<InventoryReservationActor> | undefined;

interface InventoryReservationActor {
  userId: string;
  traceId?: string;
}

interface ReservationMonitorContext {
  triggeredBy?: 'shipping' | 'scan' | 'manual' | 'deduction';
  shippingOrderId?: string;
  shippingStatus?: ShippingStatus;
  retryCount?: number;
  note?: string;
}

interface OrderStockAdjustmentItemInput {
  productId: string;
  oldQuantity: number;
  newQuantity: number;
  difference: number;
}

interface ReservationAlertPayload {
  organizationId: string;
  orderId: string;
  branchId?: string | null;
  reservationIds: string[];
  quantityHeld: number;
  unresolvedReservations: number;
  shippingOrderId?: string;
  shippingStatus?: ShippingStatus;
  consecutiveFailures?: number;
  triggeredBy?: string;
  note?: string;
}

const STUCK_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CANCELLED,
  OrderStatus.COMPLETED,
];

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);
  private readonly reservationAlertInclude = {
    order: { select: { id: true, code: true, status: true } },
    branch: { select: { id: true, name: true } },
    shippingOrder: {
      select: { id: true, trackingCode: true, status: true, retryCount: true },
    },
  } as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly requestContext: RequestContextService,
  ) {}

  /**
   * INV-002: Get inventory by branch with pagination and filters
   */
  async getInventoryByBranch(query: GetInventoryDto, organizationId: string) {
    const {
      branchId,
      page = 1,
      limit = 20,
      search,
      categoryId,
      lowStockOnly = false,
    } = query;

    // Verify branch belongs to organization
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, organizationId },
      select: { id: true },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const normalizedLimit = Math.max(1, Math.min(limit, 100));
    const skip = (page - 1) * normalizedLimit;

    // If lowStockOnly is enabled, use raw SQL for filtering and counting
    if (lowStockOnly) {
      // Build WHERE conditions for raw SQL
      const conditions: string[] = [
        'i."branchId" = $1',
        'p."organizationId" = $2',
        'p."deletedAt" IS NULL',
        'p."minStock" > 0',
        'i.quantity <= p."minStock"',
      ];
      const params: any[] = [branchId, organizationId];
      let paramIndex = 3;

      if (search) {
        conditions.push(
          `(p.name ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex})`,
        );
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (categoryId) {
        conditions.push(`p."categoryId" = $${paramIndex}`);
        params.push(categoryId);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');

      // Get total count
      const countResult = await this.prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*)::bigint as count
         FROM "Inventory" i
         INNER JOIN "Product" p ON i."productId" = p.id
         WHERE ${whereClause}`,
        ...params,
      );
      const total = Number(countResult[0]?.count || 0);

      // Get paginated items
      const items = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT
          i.id as "inventoryId",
          i."branchId",
          i.quantity,
          i."createdAt" as "inventoryCreatedAt",
          i."updatedAt" as "inventoryUpdatedAt",
          p.id as "productId",
          p.name as "productName",
          p.sku,
          p.description as "productDescription",
          p."categoryId",
          p."sellPrice",
          p."costPrice",
          p."minStock",
          p."organizationId",
          p."createdAt" as "productCreatedAt",
          p."updatedAt" as "productUpdatedAt",
          p."deletedAt" as "productDeletedAt",
          c.id as "categoryId",
          c.name as "categoryName",
          c.description as "categoryDescription",
          c."parentId" as "categoryParentId",
          c."organizationId" as "categoryOrganizationId",
          c."createdAt" as "categoryCreatedAt",
          c."updatedAt" as "categoryUpdatedAt",
          b.id as "branchId",
          b.name as "branchName",
          b.address as "branchAddress",
          b."organizationId" as "branchOrganizationId",
          b."createdAt" as "branchCreatedAt",
          b."updatedAt" as "branchUpdatedAt"
         FROM "Inventory" i
         INNER JOIN "Product" p ON i."productId" = p.id
         LEFT JOIN "Category" c ON p."categoryId" = c.id
         INNER JOIN "Branch" b ON i."branchId" = b.id
         WHERE ${whereClause}
         ORDER BY p.name ASC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        ...params,
        normalizedLimit,
        skip,
      );

      // Transform raw results into the expected format
      const transformedItems = items.map((item) => ({
        id: item.inventoryId,
        productId: item.productId,
        branchId: item.branchId,
        quantity: item.quantity,
        createdAt: item.inventoryCreatedAt,
        updatedAt: item.inventoryUpdatedAt,
        product: {
          id: item.productId,
          name: item.productName,
          sku: item.sku,
          description: item.productDescription,
          categoryId: item.categoryId,
          sellPrice: item.sellPrice,
          costPrice: item.costPrice,
          minStock: item.minStock,
          organizationId: item.organizationId,
          createdAt: item.productCreatedAt,
          updatedAt: item.productUpdatedAt,
          deletedAt: item.productDeletedAt,
          category: item.categoryId
            ? {
                id: item.categoryId,
                name: item.categoryName,
                description: item.categoryDescription,
                parentId: item.categoryParentId,
                organizationId: item.categoryOrganizationId,
                createdAt: item.categoryCreatedAt,
                updatedAt: item.categoryUpdatedAt,
              }
            : null,
        },
        branch: {
          id: item.branchId,
          name: item.branchName,
          address: item.branchAddress,
          organizationId: item.branchOrganizationId,
          createdAt: item.branchCreatedAt,
          updatedAt: item.branchUpdatedAt,
        },
      }));

      return {
        data: transformedItems,
        meta: {
          total,
          page,
          limit: normalizedLimit,
          totalPages: Math.ceil(total / normalizedLimit),
        },
      };
    }

    // Standard Prisma query when lowStockOnly is false
    const productWhere: Prisma.ProductWhereInput = {
      organizationId,
      deletedAt: null,
    };

    // Search by product name or SKU
    if (search) {
      productWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter by category
    if (categoryId) {
      productWhere.categoryId = categoryId;
    }

    const where: Prisma.InventoryWhereInput = {
      branchId,
      product: productWhere,
    };

    const [items, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where,
        include: {
          product: {
            include: {
              category: true,
            },
          },
          branch: true,
        },
        orderBy: { product: { name: 'asc' } },
        skip,
        take: normalizedLimit,
      }),
      this.prisma.inventory.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit: normalizedLimit,
        totalPages: Math.ceil(total / normalizedLimit),
      },
    };
  }

  /**
   * INV-003: Manual stock adjustment
   * INV-007: Negative stock prevention
   * INV-008: Inventory transaction logging (using StockAdjustment model)
   */
  async adjustStock(dto: AdjustStockDto, organizationId: string, userId: string) {
    const { productId, branchId, quantity, reason, notes } = dto;

    // Verify product belongs to organization
    const product = await this.prisma.product.findFirst({
      where: { id: productId, organizationId, deletedAt: null },
      select: { id: true, name: true, sku: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Verify branch belongs to organization
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, organizationId },
      select: { id: true, name: true },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return this.prisma.$transaction(async (tx) => {
      if (quantity < 0) {
        const existingInventory = await tx.inventory.findUnique({
          where: {
            productId_branchId: {
              productId,
              branchId,
            },
          },
          select: { id: true },
        });

        if (!existingInventory) {
          throw new BadRequestException(
            `Insufficient stock. Current: 0, Requested deduction: ${Math.abs(quantity)}`,
          );
        }
      }

      const updatedInventory = await tx.inventory.upsert({
        where: {
          productId_branchId: {
            productId,
            branchId,
          },
        },
        update: {
          quantity: {
            increment: quantity,
          },
        },
        create: {
          productId,
          branchId,
          quantity: Math.max(0, quantity),
        },
        include: {
          product: true,
          branch: true,
        },
      });

      const oldQuantity = updatedInventory.quantity - quantity;

      if (updatedInventory.quantity < 0) {
        throw new BadRequestException(
          `Insufficient stock. Current: ${oldQuantity}, Requested deduction: ${Math.abs(quantity)}`,
        );
      }

      // INV-008: Log inventory transaction using StockAdjustment
      const adjustmentType = quantity > 0 ? 'INCREASE' : 'DECREASE';
      const uniqueSuffix = randomUUID().split('-')[0].toUpperCase();

      const adjustment = await tx.stockAdjustment.create({
        data: {
          organizationId,
          code: `ADJ-${uniqueSuffix}`,
          branchId,
          type: adjustmentType,
          reason: this.mapReasonToAdjustmentReason(reason),
          notes: notes || `${reason}: ${quantity > 0 ? '+' : ''}${quantity} units`,
          adjustedBy: userId,
          adjustedAt: new Date(),
          status: 'CONFIRMED',
          items: {
            create: [
              {
                productId,
                oldQuantity,
                newQuantity: updatedInventory.quantity,
                difference: quantity,
              },
            ],
          },
        },
      });

      await this.logInventoryAudit({
        auditAction: AuditAction.CREATE,
        organizationId,
        userId,
        entityId: adjustment.id,
        entity: 'inventory.adjustment',
        payload: {
          productId,
          branchId,
          quantity,
          reason,
        },
      });

      return { data: updatedInventory };
    });
  }

  /**
   * INV-004: Get low stock alerts for a branch
   */
  async getLowStockAlerts(branchId: string, organizationId: string) {
    // Verify branch belongs to organization
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, organizationId },
      select: { id: true },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    // Get all inventory items where quantity <= minStock or quantity = 0
    const lowStockItems = await this.prisma.inventory.findMany({
      where: {
        branchId,
        product: {
          organizationId,
          deletedAt: null,
          minStock: { gt: 0 },
        },
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
        branch: true,
      },
    });

    // Filter items with low stock
    const alerts = lowStockItems
      .filter((item) => item.quantity <= item.product.minStock)
      .map((item) => ({
        ...item,
        alertLevel: item.quantity === 0 ? 'CRITICAL' : 'WARNING',
        message:
          item.quantity === 0
            ? 'Out of stock - Cannot process orders'
            : `Low stock - Only ${item.quantity} units remaining (min: ${item.product.minStock})`,
      }));

    return {
      data: alerts,
      meta: {
        total: alerts.length,
        critical: alerts.filter((a) => a.alertLevel === 'CRITICAL').length,
        warning: alerts.filter((a) => a.alertLevel === 'WARNING').length,
      },
    };
  }

  async getReservationAlerts(
    query: GetReservationAlertsDto,
    organizationId: string,
  ) {
    const { page = 1, limit = 20, orderId, status } = query;
    const normalizedLimit = Math.max(1, Math.min(limit, 100));
    const skip = (page - 1) * normalizedLimit;

    const where: Prisma.InventoryReservationAlertWhereInput = {
      organizationId,
    };

    if (orderId) {
      where.orderId = orderId;
    }

    if (status) {
      where.status = status;
    }

    const [data, total] = await Promise.all([
      this.prisma.inventoryReservationAlert.findMany({
        where,
        include: this.reservationAlertInclude,
        orderBy: { lastDetectedAt: 'desc' },
        skip,
        take: normalizedLimit,
      }),
      this.prisma.inventoryReservationAlert.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit: normalizedLimit,
        totalPages: Math.ceil(total / normalizedLimit) || 0,
      },
    };
  }

  async scanReservationLeaks(
    organizationId: string,
    dto?: ScanReservationAlertsDto,
  ) {
    const minAgeMinutes = Math.max(dto?.minAgeMinutes ?? 30, 0);
    const cutoff = new Date(Date.now() - minAgeMinutes * 60_000);
    const normalizedLimit = Math.max(1, Math.min(dto?.limit ?? 50, 200));
    const minQuantity = Math.max(dto?.minQuantity ?? 1, 1);

    const where: Prisma.OrderInventoryReservationWhereInput = {
      organizationId,
      status: OrderInventoryReservationStatus.RESERVED,
      updatedAt: { lte: cutoff },
      order: {
        status: { in: STUCK_ORDER_STATUSES },
        deletedAt: null,
      },
    };

    if (dto?.orderId) {
      where.orderId = dto.orderId;
    }

    const stuckReservations = await this.prisma.orderInventoryReservation.findMany({
      where,
      select: {
        id: true,
        orderId: true,
        branchId: true,
        quantity: true,
        variantReservedQuantity: true,
        order: {
          select: {
            branchId: true,
          },
        },
      },
      take: normalizedLimit,
    });

    const grouped = new Map<
      string,
      {
        branchId: string | null;
        reservationIds: string[];
        quantityHeld: number;
        unresolvedReservations: number;
      }
    >();

    for (const reservation of stuckReservations) {
      const baseQuantity = Number(reservation.quantity ?? 0);
      const variantQty = Number(reservation.variantReservedQuantity ?? 0);
      const current =
        grouped.get(reservation.orderId) ?? {
          branchId: reservation.branchId ?? reservation.order?.branchId ?? null,
          reservationIds: [],
          quantityHeld: 0,
          unresolvedReservations: 0,
        };
      current.reservationIds.push(reservation.id);
      current.quantityHeld += baseQuantity + variantQty;
      current.unresolvedReservations += 1;
      grouped.set(reservation.orderId, current);
    }

    const filteredEntries = [...grouped.entries()].filter(
      ([, payload]) => payload.quantityHeld >= minQuantity,
    );

    if (!filteredEntries.length) {
      if (dto?.orderId) {
        await this.resolveReservationAlerts(organizationId, dto.orderId, 'scan-no-leaks');
      }
      return {
        data: [],
        meta: {
          scanned: grouped.size,
          detected: 0,
        },
      };
    }

    const orderIds = filteredEntries.map(([orderId]) => orderId);
    const latestShippingOrders = await this.fetchLatestShippingOrders(orderIds);

    const alerts = [];
    for (const [orderId, payload] of filteredEntries) {
      const shipping = latestShippingOrders.get(orderId);
      const alert = await this.upsertReservationAlert(this.prisma, {
        organizationId,
        orderId,
        branchId: payload.branchId,
        reservationIds: payload.reservationIds,
        quantityHeld: payload.quantityHeld,
        unresolvedReservations: payload.unresolvedReservations,
        shippingOrderId: shipping?.id,
        shippingStatus: shipping?.status,
        consecutiveFailures: shipping?.retryCount,
        triggeredBy: 'scan',
      });
      alerts.push(alert);
    }

    return {
      data: alerts,
      meta: {
        scanned: grouped.size,
        detected: alerts.length,
      },
    };
  }

  /**
   * INV-005: Create inter-branch transfer
   * INV-007: Negative stock prevention
   * Note: Uses Transfer model for inter-branch transfers
   */
  async createTransfer(dto: CreateTransferDto, organizationId: string, userId: string) {
    const { productId, fromBranchId, toBranchId, quantity, notes } = dto;

    if (fromBranchId === toBranchId) {
      throw new BadRequestException('Source and destination branches cannot be the same');
    }

    // Verify product belongs to organization
    const product = await this.prisma.product.findFirst({
      where: { id: productId, organizationId, deletedAt: null },
      select: { id: true, name: true, sku: true, sellPrice: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Verify both branches belong to organization
    const [fromBranch, toBranch] = await Promise.all([
      this.prisma.branch.findFirst({
        where: { id: fromBranchId, organizationId },
        select: { id: true, name: true },
      }),
      this.prisma.branch.findFirst({
        where: { id: toBranchId, organizationId },
        select: { id: true, name: true },
      }),
    ]);

    if (!fromBranch) {
      throw new NotFoundException('Source branch not found');
    }

    if (!toBranch) {
      throw new NotFoundException('Destination branch not found');
    }

    return this.prisma.$transaction(async (tx) => {
      try {
        const sourceInventory = await tx.inventory.findUnique({
          where: {
            productId_branchId: {
              productId,
              branchId: fromBranchId,
            },
          },
        });

        if (!sourceInventory) {
          throw new BadRequestException('Source branch has no inventory for this product');
        }

        if (sourceInventory.quantity < quantity) {
          throw new BadRequestException(
            `Insufficient stock at source branch. Available: ${sourceInventory.quantity}, Requested: ${quantity}`,
          );
        }

        const updatedSource = await tx.inventory.update({
          where: {
            productId_branchId: {
              productId,
              branchId: fromBranchId,
            },
          },
          data: {
            quantity: {
              decrement: quantity,
            },
          },
        });

        const sourceOldQuantity = sourceInventory.quantity;

        if (updatedSource.quantity < 0) {
          throw new BadRequestException(
            `Insufficient stock at source branch. Available: ${sourceOldQuantity}, Requested: ${quantity}`,
          );
        }

        const updatedDest = await tx.inventory.upsert({
          where: {
            productId_branchId: {
              productId,
              branchId: toBranchId,
            },
          },
          update: {
            quantity: {
              increment: quantity,
            },
          },
          create: {
            productId,
            branchId: toBranchId,
            quantity,
          },
        });

        const destOldQuantity = updatedDest.quantity - quantity;

        // Create transfer record
        const transferValue = Number(product.sellPrice) * quantity;
        const uniqueSuffix = randomUUID().split('-')[0].toUpperCase();

        const transfer = await tx.transfer.create({
          data: {
            code: `TRF-${uniqueSuffix}`,
            fromBranchId,
            toBranchId,
            value: transferValue,
            status: 'RECEIVED', // For MVP, instant transfer. Can be extended for IN_TRANSIT status
            transferredAt: new Date(),
            receivedAt: new Date(),
          },
          include: {
            fromBranch: true,
            toBranch: true,
          },
        });

        // Log transactions for both branches using StockAdjustment

        const [sourceAdjustment, destinationAdjustment] = await Promise.all([
          // Source branch (OUT)
          tx.stockAdjustment.create({
            data: {
              organizationId,
              code: `ADJ-OUT-${transfer.id}-${uniqueSuffix}`,
              branchId: fromBranchId,
              type: 'DECREASE',
              reason: `Transfer to ${toBranch.name}${notes ? `: ${notes}` : ''}`,
              notes: `Transfer ID: ${transfer.id}`,
              adjustedBy: userId,
              adjustedAt: new Date(),
              status: 'CONFIRMED',
              items: {
                create: [
                  {
                    productId,
                    oldQuantity: sourceOldQuantity,
                    newQuantity: updatedSource.quantity,
                    difference: -quantity,
                  },
                ],
              },
            },
          }),
          // Destination branch (IN)
          tx.stockAdjustment.create({
            data: {
              organizationId,
              code: `ADJ-IN-${transfer.id}-${uniqueSuffix}`,
              branchId: toBranchId,
              type: 'INCREASE',
              reason: `Transfer from ${fromBranch.name}${notes ? `: ${notes}` : ''}`,
              notes: `Transfer ID: ${transfer.id}`,
              adjustedBy: userId,
              adjustedAt: new Date(),
              status: 'CONFIRMED',
              items: {
                create: [
                  {
                    productId,
                    oldQuantity: destOldQuantity,
                    newQuantity: updatedDest.quantity,
                    difference: quantity,
                  },
                ],
              },
            },
          }),
        ]);

        await Promise.all([
          this.logInventoryAudit({
            auditAction: AuditAction.CREATE,
            organizationId,
            userId,
            entityId: sourceAdjustment.id,
            entity: 'inventory.adjustment',
            payload: {
              transferId: transfer.id,
              productId,
              branchId: fromBranchId,
              quantity: -quantity,
            },
          }),
          this.logInventoryAudit({
            auditAction: AuditAction.CREATE,
            organizationId,
            userId,
            entityId: destinationAdjustment.id,
            entity: 'inventory.adjustment',
            payload: {
              transferId: transfer.id,
              productId,
              branchId: toBranchId,
              quantity,
            },
          }),
          this.logInventoryAudit({
            auditAction: AuditAction.CREATE,
            organizationId,
            userId,
            entityId: transfer.id,
            entity: 'inventory.transfer',
            payload: {
              productId,
              fromBranchId,
              toBranchId,
              quantity,
            },
          }),
        ]);

        return { data: transfer };
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        this.logger.error('Failed to create transfer', error instanceof Error ? error.stack : error);
        throw new InternalServerErrorException('Failed to create transfer');
      }
    });
  }

  /**
   * INV-006: Stock return on order cancellation
   * Called by OrdersService when order status changes to CANCELLED
   */
  async returnStockOnOrderCancel(
    orderId: string,
    organizationId: string,
    actorInput?: ReservationActorInput,
  ) {
    const actor = this.normalizeReservationActor(actorInput);

    const outcome = await this.prisma.$transaction(async (tx) => {
      const order = await this.loadOrderInventoryContext(tx, orderId, organizationId);

      const reservations = await tx.orderInventoryReservation.findMany({
        where: {
          orderId,
          organizationId,
          status: OrderInventoryReservationStatus.RESERVED,
        },
      });

      if (!reservations.length) {
        return { data: { restoredItems: 0 } };
      }

      const adjustmentItems: OrderStockAdjustmentItemInput[] = [];
      for (const reservation of reservations) {
        const { oldQuantity, newQuantity } = await this.applyInventoryIncrement(
          tx,
          reservation.productId,
          reservation.branchId,
          reservation.quantity,
        );

        if (reservation.variantId && reservation.variantReservedQuantity > 0) {
          await tx.productVariant.update({
            where: { id: reservation.variantId },
            data: { stock: { increment: reservation.variantReservedQuantity } },
          });
        }

        adjustmentItems.push({
          productId: reservation.productId,
          oldQuantity,
          newQuantity,
          difference: reservation.quantity,
        });
      }

      const adjustment = await tx.stockAdjustment.create({
        data: this.buildOrderStockAdjustment({
          organizationId,
          branchId: order.branchId!,
          orderCode: order.code,
          actorId: actor.userId,
          traceId: actor.traceId,
          reason: StockAdjustmentReason.ORDER_CANCELLED,
          type: 'INCREASE',
          items: adjustmentItems,
        }),
      });

      await tx.orderInventoryReservation.updateMany({
        where: {
          id: { in: reservations.map((reservation) => reservation.id) },
        },
        data: {
          status: OrderInventoryReservationStatus.RETURNED,
          releaseAdjustmentId: adjustment.id,
        },
      });

      await this.logInventoryAudit({
        auditAction: AuditAction.CREATE,
        organizationId,
        userId: actor.userId,
        entityId: adjustment.id,
        entity: 'inventory.adjustment',
        payload: {
          orderId: order.id,
          branchId: order.branchId,
          itemsRestored: reservations.length,
          action: 'return',
        },
      });

      return {
        data: {
          restoredItems: reservations.length,
          adjustmentId: adjustment.id,
        },
      };
    });

    await this.resolveReservationAlerts(organizationId, orderId, 'restock-complete');

    return outcome;
  }

  /**
   * Deduct stock when order moves to PROCESSING status
   * Called by OrdersService
   */
  async deductStockOnOrderProcessing(
    orderId: string,
    organizationId: string,
    actorInput?: ReservationActorInput,
  ) {
    const actor = this.normalizeReservationActor(actorInput);

    const result = await this.prisma.$transaction(async (tx) => {
      const order = await this.loadOrderInventoryContext(tx, orderId, organizationId);
      await this.ensureNoActiveReservation(tx, orderId, organizationId);

      if (!order.items.length) {
        throw new BadRequestException('Order has no items to reserve');
      }

      const adjustmentItems: OrderStockAdjustmentItemInput[] = [];
      const reservations: Prisma.OrderInventoryReservationCreateManyInput[] = [];

      for (const item of order.items) {
        const { oldQuantity, newQuantity } = await this.applyInventoryDecrement(
          tx,
          item.productId,
          order.branchId!,
          item.quantity,
          item.product?.name,
        );

        const variantReservedQuantity = await this.reserveVariantStock(
          tx,
          item.variantId,
          item.quantity,
          organizationId,
          order.code,
        );

        adjustmentItems.push({
          productId: item.productId,
          oldQuantity,
          newQuantity,
          difference: -item.quantity,
        });

        reservations.push({
          orderId: order.id,
          orderItemId: item.id,
          branchId: order.branchId!,
          productId: item.productId,
          variantId: item.variantId ?? undefined,
          quantity: item.quantity,
          variantReservedQuantity,
          organizationId,
          status: OrderInventoryReservationStatus.RESERVED,
        });
      }

      const adjustment = await tx.stockAdjustment.create({
        data: this.buildOrderStockAdjustment({
          organizationId,
          branchId: order.branchId!,
          orderCode: order.code,
          actorId: actor.userId,
          traceId: actor.traceId,
          reason: StockAdjustmentReason.ORDER_RESERVATION,
          type: 'DECREASE',
          items: adjustmentItems,
        }),
      });

      await tx.orderInventoryReservation.createMany({
        data: reservations.map((reservation) => ({
          ...reservation,
          reservationAdjustmentId: adjustment.id,
        })),
      });

      await this.logInventoryAudit({
        auditAction: AuditAction.CREATE,
        organizationId,
        userId: actor.userId,
        entityId: adjustment.id,
        entity: 'inventory.adjustment',
        payload: {
          orderId: order.id,
          branchId: order.branchId,
          itemsReserved: reservations.length,
          action: 'reserve',
        },
      });

      return {
        data: {
          reservedItems: reservations.length,
          adjustmentId: adjustment.id,
        },
      };
    });

    await this.resolveReservationAlerts(organizationId, orderId, 'reservation-regenerated');

    return result;
  }

  private async fetchLatestShippingOrders(orderIds: string[]) {
    if (!orderIds.length) {
      return new Map<string, { id: string; orderId: string; status: ShippingStatus; retryCount: number }>();
    }

    const shippingOrders = await this.prisma.shippingOrder.findMany({
      where: { orderId: { in: orderIds } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderId: true,
        status: true,
        retryCount: true,
      },
    });

    const latestMap = new Map<string, (typeof shippingOrders)[number]>();
    for (const record of shippingOrders) {
      if (!latestMap.has(record.orderId)) {
        latestMap.set(record.orderId, record);
      }
    }

    return latestMap;
  }

  async checkReservationHealth(
    orderId: string,
    organizationId: string,
    context?: ReservationMonitorContext,
  ) {
    const stuckReservations = await this.prisma.orderInventoryReservation.findMany({
      where: {
        orderId,
        organizationId,
        status: OrderInventoryReservationStatus.RESERVED,
        order: {
          status: { in: STUCK_ORDER_STATUSES },
          deletedAt: null,
        },
      },
      select: {
        id: true,
        branchId: true,
        quantity: true,
        variantReservedQuantity: true,
      },
    });

    if (!stuckReservations.length) {
      await this.resolveReservationAlerts(organizationId, orderId, context?.note);
      return { alertCreated: false };
    }

    const branchId = stuckReservations[0]?.branchId ?? null;
    const quantityHeld = stuckReservations.reduce((sum, reservation) => {
      return (
        sum + Number(reservation.quantity ?? 0) + Number(reservation.variantReservedQuantity ?? 0)
      );
    }, 0);

    const alert = await this.upsertReservationAlert(this.prisma, {
      organizationId,
      orderId,
      branchId,
      reservationIds: stuckReservations.map((r) => r.id),
      quantityHeld,
      unresolvedReservations: stuckReservations.length,
      shippingOrderId: context?.shippingOrderId,
      shippingStatus: context?.shippingStatus,
      consecutiveFailures: context?.retryCount,
      triggeredBy: context?.triggeredBy ?? 'manual',
      note: context?.note,
    });

    return { alertCreated: true, alert };
  }

  private async upsertReservationAlert(
    prisma: PrismaTransactionalClient | PrismaService,
    payload: ReservationAlertPayload,
  ) {
    const existing = await prisma.inventoryReservationAlert.findFirst({
      where: {
        organizationId: payload.organizationId,
        orderId: payload.orderId,
        status: InventoryReservationAlertStatus.OPEN,
      },
      include: this.reservationAlertInclude,
    });

    const details = this.buildAlertDetails(payload);
    const lastDetectedAt = new Date();
    const consecutiveFailures =
      payload.consecutiveFailures ?? existing?.consecutiveFailures ?? 0;

    const relationData: Prisma.InventoryReservationAlertUpdateInput = {
      unresolvedReservations: payload.unresolvedReservations,
      quantityHeld: payload.quantityHeld,
      consecutiveFailures,
      shippingStatus: payload.shippingStatus ?? existing?.shippingStatus,
      details,
      lastDetectedAt,
    };

    if (payload.branchId) {
      relationData.branch = { connect: { id: payload.branchId } };
    }

    if (payload.shippingOrderId) {
      relationData.shippingOrder = { connect: { id: payload.shippingOrderId } };
    }

    if (existing) {
      const updated = await prisma.inventoryReservationAlert.update({
        where: { id: existing.id },
        data: relationData,
        include: this.reservationAlertInclude,
      });

      await this.auditLogService.log({
        user: { id: 'inventory-monitor', organizationId: payload.organizationId },
        entity: 'inventoryReservationAlert',
        entityId: updated.id,
        action: 'inventory.reservation.alert.updated',
        auditAction: AuditAction.UPDATE,
        newValues: {
          orderId: payload.orderId,
          unresolvedReservations: payload.unresolvedReservations,
          quantityHeld: payload.quantityHeld,
          triggeredBy: payload.triggeredBy,
        },
      });

      return updated;
    }

    const created = await prisma.inventoryReservationAlert.create({
      data: {
        organization: { connect: { id: payload.organizationId } },
        order: { connect: { id: payload.orderId } },
        branch: payload.branchId ? { connect: { id: payload.branchId } } : undefined,
        shippingOrder: payload.shippingOrderId
          ? { connect: { id: payload.shippingOrderId } }
          : undefined,
        unresolvedReservations: payload.unresolvedReservations,
        quantityHeld: payload.quantityHeld,
        consecutiveFailures,
        shippingStatus: payload.shippingStatus,
        details,
        lastDetectedAt,
      },
      include: this.reservationAlertInclude,
    });

    await this.auditLogService.log({
      user: { id: 'inventory-monitor', organizationId: payload.organizationId },
      entity: 'inventoryReservationAlert',
      entityId: created.id,
      action: 'inventory.reservation.alert.created',
      auditAction: AuditAction.CREATE,
      newValues: {
        orderId: payload.orderId,
        unresolvedReservations: payload.unresolvedReservations,
        quantityHeld: payload.quantityHeld,
        triggeredBy: payload.triggeredBy,
      },
    });

    return created;
  }

  private buildAlertDetails(payload: ReservationAlertPayload): Prisma.JsonObject {
    const details: Record<string, unknown> = {
      reservationIds: payload.reservationIds,
      triggeredBy: payload.triggeredBy,
    };

    if (payload.note) {
      details.note = payload.note;
    }

    return details as Prisma.JsonObject;
  }

  private async resolveReservationAlerts(
    organizationId: string,
    orderId: string,
    resolutionNote?: string,
  ) {
    if (!orderId) {
      return;
    }

    const hasStuckReservations = await this.prisma.orderInventoryReservation.count({
      where: {
        organizationId,
        orderId,
        status: OrderInventoryReservationStatus.RESERVED,
        order: {
          status: { in: STUCK_ORDER_STATUSES },
          deletedAt: null,
        },
      },
    });

    if (hasStuckReservations > 0) {
      return;
    }

    const openAlert = await this.prisma.inventoryReservationAlert.findFirst({
      where: {
        organizationId,
        orderId,
        status: InventoryReservationAlertStatus.OPEN,
      },
    });

    if (!openAlert) {
      return;
    }

    await this.prisma.inventoryReservationAlert.update({
      where: { id: openAlert.id },
      data: {
        status: InventoryReservationAlertStatus.RESOLVED,
        resolvedAt: new Date(),
        resolutionNote,
      },
    });

    await this.auditLogService.log({
      user: { id: 'inventory-monitor', organizationId },
      entity: 'inventoryReservationAlert',
      entityId: openAlert.id,
      action: 'inventory.reservation.alert.resolved',
      auditAction: AuditAction.UPDATE,
      newValues: {
        orderId,
        resolutionNote,
      },
    });
  }

  private async loadOrderInventoryContext(
    prisma: PrismaTransactionalClient,
    orderId: string,
    organizationId: string,
  ) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, organizationId, deletedAt: null },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true } },
            variant: { select: { id: true, stock: true } },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!order.branchId) {
      throw new BadRequestException('Order must have branchId for inventory integration');
    }

    return order;
  }

  private normalizeReservationActor(actorInput?: ReservationActorInput): InventoryReservationActor {
    if (!actorInput) {
      return { userId: 'system' };
    }

    if (typeof actorInput === 'string') {
      return { userId: actorInput };
    }

    return {
      userId: actorInput.userId ?? 'system',
      traceId: actorInput.traceId,
    };
  }

  private async ensureNoActiveReservation(
    prisma: PrismaTransactionalClient,
    orderId: string,
    organizationId: string,
  ) {
    const activeReservations = await prisma.orderInventoryReservation.count({
      where: {
        orderId,
        organizationId,
        status: {
          in: [
            OrderInventoryReservationStatus.RESERVED,
            OrderInventoryReservationStatus.RELEASED,
          ],
        },
      },
    });

    if (activeReservations > 0) {
      throw new BadRequestException('Stock has already been reserved for this order');
    }
  }

  private async applyInventoryDecrement(
    prisma: PrismaTransactionalClient,
    productId: string,
    branchId: string,
    quantity: number,
    productName?: string,
  ) {
    const inventory = await prisma.inventory.findUnique({
      where: { productId_branchId: { productId, branchId } },
    });

    if (!inventory) {
      throw new BadRequestException(
        `Inventory not found for product ${productName ?? productId} at branch ${branchId}`,
      );
    }

    if (inventory.quantity < quantity) {
      throw new BadRequestException(
        `Insufficient stock for ${productName ?? productId}. Requested ${quantity}, available ${inventory.quantity}`,
      );
    }

    const updatedInventory = await prisma.inventory.update({
      where: { productId_branchId: { productId, branchId } },
      data: { quantity: { decrement: quantity } },
    });

    return { oldQuantity: inventory.quantity, newQuantity: updatedInventory.quantity };
  }

  private async applyInventoryIncrement(
    prisma: PrismaTransactionalClient,
    productId: string,
    branchId: string,
    quantity: number,
  ) {
    const inventory = await prisma.inventory.findUnique({
      where: { productId_branchId: { productId, branchId } },
    });

    if (!inventory) {
      const created = await prisma.inventory.create({
        data: { productId, branchId, quantity },
      });
      return { oldQuantity: 0, newQuantity: created.quantity };
    }

    const updatedInventory = await prisma.inventory.update({
      where: { productId_branchId: { productId, branchId } },
      data: { quantity: { increment: quantity } },
    });

    return { oldQuantity: inventory.quantity, newQuantity: updatedInventory.quantity };
  }

  private async reserveVariantStock(
    prisma: PrismaTransactionalClient,
    variantId: string | null | undefined,
    quantity: number,
    organizationId: string,
    orderCode: string,
  ): Promise<number> {
    if (!variantId || quantity <= 0) {
      return 0;
    }

    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, organizationId },
      select: { id: true, stock: true },
    });

    if (!variant) {
      throw new NotFoundException('Product variant not found for reservation');
    }

    const available = Number(variant.stock ?? 0);
    const reservedQuantity = Math.min(available, quantity);

    if (reservedQuantity <= 0) {
      this.logger.warn(`Variant ${variantId} has no stock for order ${orderCode}`);
      return 0;
    }

    await prisma.productVariant.update({
      where: { id: variantId },
      data: { stock: { decrement: reservedQuantity } },
    });

    if (reservedQuantity < quantity) {
      this.logger.warn(
        `Variant ${variantId} only reserved ${reservedQuantity}/${quantity} units for order ${orderCode}; falling back to branch inventory`,
      );
    }

    return reservedQuantity;
  }

  private buildOrderStockAdjustment(params: {
    organizationId: string;
    branchId: string;
    orderCode: string;
    actorId: string;
    traceId?: string;
    reason: StockAdjustmentReason;
    type: AdjustmentType;
    items: OrderStockAdjustmentItemInput[];
  }): Prisma.StockAdjustmentCreateInput {
    const uniqueSuffix = randomUUID().split('-')[0].toUpperCase();
    const traceSegment = params.traceId ? ` trace:${params.traceId}` : '';
    const actionLabel = params.type === 'DECREASE' ? 'reservation' : 'restock';

    return {
      organization: { connect: { id: params.organizationId } },
      code: `ADJ-ORD-${uniqueSuffix}`,
      branch: { connect: { id: params.branchId } },
      type: params.type,
      reason: this.mapReasonToAdjustmentReason(params.reason),
      notes: `Order ${params.orderCode} ${actionLabel} by ${params.actorId}${traceSegment}`,
      adjustedBy: params.actorId,
      adjustedAt: new Date(),
      status: 'CONFIRMED',
      items: {
        create: params.items.map((item) => ({
          product: { connect: { id: item.productId } },
          oldQuantity: item.oldQuantity,
          newQuantity: item.newQuantity,
          difference: item.difference,
        })),
      },
    };
  }

  private async logInventoryAudit(params: {
    auditAction: AuditAction;
    organizationId: string;
    userId: string;
    entity: string;
    entityId: string;
    payload?: Record<string, unknown>;
  }) {
    try {
      await this.auditLogService.log({
        user: { id: params.userId, organizationId: params.organizationId },
        entity: params.entity,
        entityId: params.entityId,
        action: params.entity,
        auditAction: params.auditAction,
        newValues: {
          ...(params.payload ?? {}),
          traceId: this.requestContext.getTraceId(),
        },
      });
    } catch (error) {
      this.logger.warn(
        `Inventory audit log failure for ${params.entityId}`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Helper: Map StockAdjustmentReason to schema reason string
   */
  private mapReasonToAdjustmentReason(reason: StockAdjustmentReason): string {
    const reasonMap: Record<StockAdjustmentReason, string> = {
      [StockAdjustmentReason.MANUAL_ADJUSTMENT]: 'Manual adjustment by admin',
      [StockAdjustmentReason.DAMAGED]: 'Damaged goods',
      [StockAdjustmentReason.LOST]: 'Lost or stolen',
      [StockAdjustmentReason.FOUND]: 'Found extra inventory',
      [StockAdjustmentReason.RECOUNT]: 'Inventory recount',
      [StockAdjustmentReason.RETURN]: 'Customer return',
      [StockAdjustmentReason.ORDER_RESERVATION]: 'Order reservation hold',
      [StockAdjustmentReason.ORDER_CANCELLED]: 'Order cancellation restock',
      [StockAdjustmentReason.OTHER]: 'Other reason',
    };
    return reasonMap[reason] || reason;
  }
}
