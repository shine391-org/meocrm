import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { GetInventoryDto } from './dto/get-inventory.dto';
import { AdjustStockDto, StockAdjustmentReason } from './dto/adjust-stock.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

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
          i."productId",
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
      // Get or create inventory record
      let inventory = await tx.inventory.findUnique({
        where: {
          productId_branchId: {
            productId,
            branchId,
          },
        },
      });

      if (!inventory) {
        inventory = await tx.inventory.create({
          data: {
            productId,
            branchId,
            quantity: 0,
          },
        });
      }

      const newQuantity = inventory.quantity + quantity;

      // INV-007: Prevent negative stock
      if (newQuantity < 0) {
        throw new BadRequestException(
          `Insufficient stock. Current: ${inventory.quantity}, Requested deduction: ${Math.abs(quantity)}`,
        );
      }

      // Update inventory
      const updatedInventory = await tx.inventory.update({
        where: {
          productId_branchId: {
            productId,
            branchId,
          },
        },
        data: {
          quantity: newQuantity,
        },
        include: {
          product: true,
          branch: true,
        },
      });

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
                oldQuantity: inventory.quantity,
                newQuantity,
                difference: quantity,
              },
            ],
          },
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
      // Get source inventory
      let sourceInventory = await tx.inventory.findUnique({
        where: {
          productId_branchId: {
            productId,
            branchId: fromBranchId,
          },
        },
      });

      if (!sourceInventory) {
        sourceInventory = await tx.inventory.create({
          data: {
            productId,
            branchId: fromBranchId,
            quantity: 0,
          },
        });
      }

      // INV-007: Prevent negative stock
      if (sourceInventory.quantity < quantity) {
        throw new BadRequestException(
          `Insufficient stock at source branch. Available: ${sourceInventory.quantity}, Requested: ${quantity}`,
        );
      }

      // Get or create destination inventory
      let destInventory = await tx.inventory.findUnique({
        where: {
          productId_branchId: {
            productId,
            branchId: toBranchId,
          },
        },
      });

      if (!destInventory) {
        destInventory = await tx.inventory.create({
          data: {
            productId,
            branchId: toBranchId,
            quantity: 0,
          },
        });
      }

      // Deduct from source
      const updatedSource = await tx.inventory.update({
        where: {
          productId_branchId: {
            productId,
            branchId: fromBranchId,
          },
        },
        data: {
          quantity: sourceInventory.quantity - quantity,
        },
      });

      // Add to destination
      const updatedDest = await tx.inventory.update({
        where: {
          productId_branchId: {
            productId,
            branchId: toBranchId,
          },
        },
        data: {
          quantity: destInventory.quantity + quantity,
        },
      });

      // Create transfer record
      const transferValue = Number(product.sellPrice) * quantity;

      const transfer = await tx.transfer.create({
        data: {
          code: `TRF-${Date.now()}`,
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
      const uniqueSuffix = randomUUID().split('-')[0].toUpperCase();

      await Promise.all([
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
                  oldQuantity: sourceInventory.quantity,
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
                  oldQuantity: destInventory.quantity,
                  newQuantity: updatedDest.quantity,
                  difference: quantity,
                },
              ],
            },
          },
        }),
      ]);

      return { data: transfer };
    });
  }

  /**
   * INV-006: Stock return on order cancellation
   * Called by OrdersService when order status changes to CANCELLED
   */
  async returnStockOnOrderCancel(orderId: string, organizationId: string, userId: string) {
    // Get order with items
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, organizationId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // TODO: Order model needs branchId field for proper inventory integration
    // For now, this method returns success without performing stock operations
    // When Order model includes branchId, implement the full transaction logic

    return { message: 'Stock return functionality pending Order-Branch integration' };
  }

  /**
   * Deduct stock when order moves to PROCESSING status
   * Called by OrdersService
   */
  async deductStockOnOrderProcessing(orderId: string, organizationId: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, organizationId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // TODO: Order model needs branchId field for proper inventory integration
    // For now, this method returns success without performing stock operations
    // When Order model includes branchId, implement the full transaction logic

    return { message: 'Stock deduction functionality pending Order-Branch integration' };
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
      [StockAdjustmentReason.OTHER]: 'Other reason',
    };
    return reasonMap[reason] || reason;
  }
}
