import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StockAdjustmentReason } from './dto/adjust-stock.dto';
import { OrderInventoryReservationStatus, ShippingStatus } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RequestContextService } from '../common/context/request-context.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: DeepMockProxy<PrismaService>;
  let auditLogService: { log: jest.Mock };
  let requestContext: { getTraceId: jest.Mock };

  beforeEach(async () => {
    auditLogService = { log: jest.fn().mockResolvedValue(undefined) };
    requestContext = { getTraceId: jest.fn().mockReturnValue('trace-inventory') } as any;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: RequestContextService, useValue: requestContext },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    prisma = module.get(PrismaService);

    // Mock $transaction to execute the callback with prisma
    prisma.$transaction.mockImplementation(async (callback: any) => {
      return callback(prisma);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInventoryByBranch', () => {
    const mockBranch = { id: 'branch-1' };
    const mockInventoryItems = [
      {
        id: 'inv-1',
        productId: 'prod-1',
        branchId: 'branch-1',
        quantity: 100,
        product: {
          id: 'prod-1',
          name: 'Product 1',
          sku: 'SKU001',
          minStock: 10,
          category: { id: 'cat-1', name: 'Category 1' },
        },
        branch: mockBranch,
      },
    ];

    it('should return paginated inventory for valid branch', async () => {
      prisma.branch.findFirst.mockResolvedValue(mockBranch as any);
      prisma.inventory.findMany.mockResolvedValue(mockInventoryItems as any);
      prisma.inventory.count.mockResolvedValue(1);

      const result = await service.getInventoryByBranch(
        { branchId: 'branch-1', page: 1, limit: 20 },
        'org-1',
      );

      expect(result.data).toEqual(mockInventoryItems);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(prisma.branch.findFirst).toHaveBeenCalledWith({
        where: { id: 'branch-1', organizationId: 'org-1' },
        select: { id: true },
      });
    });

    it('should throw NotFoundException when branch not found', async () => {
      prisma.branch.findFirst.mockResolvedValue(null);

      await expect(
        service.getInventoryByBranch({ branchId: 'invalid-branch' }, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should filter by search term (name and SKU)', async () => {
      prisma.branch.findFirst.mockResolvedValue(mockBranch as any);
      prisma.inventory.findMany.mockResolvedValue([]);
      prisma.inventory.count.mockResolvedValue(0);

      await service.getInventoryByBranch(
        { branchId: 'branch-1', search: 'test' },
        'org-1',
      );

      const findManyCall = prisma.inventory.findMany.mock.calls[0][0];
      expect(findManyCall.where.product).toHaveProperty('OR');
      expect(findManyCall.where.product.OR).toEqual([
        { name: { contains: 'test', mode: 'insensitive' } },
        { sku: { contains: 'test', mode: 'insensitive' } },
      ]);
    });

    it('should filter by categoryId', async () => {
      prisma.branch.findFirst.mockResolvedValue(mockBranch as any);
      prisma.inventory.findMany.mockResolvedValue([]);
      prisma.inventory.count.mockResolvedValue(0);

      await service.getInventoryByBranch(
        { branchId: 'branch-1', categoryId: 'cat-1' },
        'org-1',
      );

      const findManyCall = prisma.inventory.findMany.mock.calls[0][0];
      expect(findManyCall.where.product.categoryId).toBe('cat-1');
    });

    it('should filter low stock items when lowStockOnly is true', async () => {
      const now = new Date();
      prisma.branch.findFirst.mockResolvedValue(mockBranch as any);
      (prisma.$queryRawUnsafe as jest.Mock)
        .mockResolvedValueOnce([{ count: BigInt(1) }])
        .mockResolvedValueOnce([
          {
            inventoryId: 'inv-1',
            branchId: 'branch-1',
            quantity: 5,
            inventoryCreatedAt: now,
            inventoryUpdatedAt: now,
            productId: 'prod-1',
            productName: 'Product 1',
            sku: 'SKU001',
            productDescription: null,
            categoryId: 'cat-1',
            sellPrice: 100,
            costPrice: 50,
            minStock: 10,
            organizationId: 'org-1',
            productCreatedAt: now,
            productUpdatedAt: now,
            productDeletedAt: null,
            categoryName: 'Category 1',
            categoryDescription: null,
            categoryParentId: null,
            categoryOrganizationId: 'org-1',
            categoryCreatedAt: now,
            categoryUpdatedAt: now,
            branchName: 'Branch 1',
            branchAddress: '123 Street',
            branchOrganizationId: 'org-1',
            branchCreatedAt: now,
            branchUpdatedAt: now,
          },
        ]);

      const result = await service.getInventoryByBranch(
        { branchId: 'branch-1', lowStockOnly: true },
        'org-1',
      );

      expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(2);
      expect(result.meta.total).toBe(1);
      expect(result.data[0].product?.name).toBe('Product 1');
    });

    it('should normalize limit to be between 1 and 100', async () => {
      prisma.branch.findFirst.mockResolvedValue(mockBranch as any);
      prisma.inventory.findMany.mockResolvedValue([]);
      prisma.inventory.count.mockResolvedValue(0);

      await service.getInventoryByBranch(
        { branchId: 'branch-1', limit: 150 },
        'org-1',
      );

      const findManyCall = prisma.inventory.findMany.mock.calls[0][0];
      expect(findManyCall.take).toBe(100);
    });
  });

  describe('adjustStock', () => {
    const mockProduct = { id: 'prod-1', organizationId: 'org-1', sellPrice: 500000 };
    const mockBranch = { id: 'branch-1', organizationId: 'org-1' };
    const mockInventory = {
      id: 'inv-1',
      productId: 'prod-1',
      branchId: 'branch-1',
      quantity: 50,
    };

    beforeEach(() => {
      prisma.product.findFirst.mockResolvedValue(mockProduct as any);
      prisma.branch.findFirst.mockResolvedValue(mockBranch as any);
    });

    it('should increase stock with positive quantity', async () => {
      prisma.inventory.findUnique.mockResolvedValue(mockInventory as any);
      prisma.inventory.upsert.mockResolvedValue({
        ...mockInventory,
        quantity: 60,
        product: mockProduct as any,
        branch: mockBranch as any,
      } as any);
      prisma.stockAdjustment.create.mockResolvedValue({} as any);

      const result = await service.adjustStock(
        {
          productId: 'prod-1',
          branchId: 'branch-1',
          quantity: 10,
          reason: StockAdjustmentReason.MANUAL_ADJUSTMENT,
        },
        'org-1',
        'user-1',
      );

      expect(result.data.quantity).toBe(60);
      expect(prisma.inventory.upsert).toHaveBeenCalledWith({
        where: {
          productId_branchId: { productId: 'prod-1', branchId: 'branch-1' },
        },
        update: { quantity: { increment: 10 } },
        create: { productId: 'prod-1', branchId: 'branch-1', quantity: 10 },
        include: { product: true, branch: true },
      });
      expect(prisma.stockAdjustment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            branchId: 'branch-1',
            type: 'INCREASE',
            items: expect.objectContaining({
              create: [
                expect.objectContaining({
                  productId: 'prod-1',
                  oldQuantity: 50,
                  newQuantity: 60,
                  difference: 10,
                }),
              ],
            }),
          }),
        }),
      );
    });

    it('should decrease stock with negative quantity', async () => {
      prisma.inventory.findUnique.mockResolvedValue(mockInventory as any);
      prisma.inventory.upsert.mockResolvedValue({
        ...mockInventory,
        quantity: 40,
        product: mockProduct as any,
        branch: mockBranch as any,
      } as any);
      prisma.stockAdjustment.create.mockResolvedValue({} as any);

      const result = await service.adjustStock(
        {
          productId: 'prod-1',
          branchId: 'branch-1',
          quantity: -10,
          reason: StockAdjustmentReason.MANUAL_ADJUSTMENT,
        },
        'org-1',
        'user-1',
      );

      expect(result.data.quantity).toBe(40);
    });

    it('should throw BadRequestException when reducing stock below zero', async () => {
      prisma.inventory.findUnique.mockResolvedValue(mockInventory as any);
      prisma.inventory.upsert.mockResolvedValue({
        ...mockInventory,
        quantity: -10,
        product: mockProduct as any,
        branch: mockBranch as any,
      } as any);

      await expect(
        service.adjustStock(
          {
            productId: 'prod-1',
            branchId: 'branch-1',
            quantity: -60,
            reason: StockAdjustmentReason.MANUAL_ADJUSTMENT,
          },
          'org-1',
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when product not found', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.adjustStock(
          {
            productId: 'invalid',
            branchId: 'branch-1',
            quantity: 10,
            reason: StockAdjustmentReason.MANUAL_ADJUSTMENT,
          },
          'org-1',
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when branch not found', async () => {
      prisma.branch.findFirst.mockResolvedValue(null);

      await expect(
        service.adjustStock(
          {
            productId: 'prod-1',
            branchId: 'invalid',
            quantity: 10,
            reason: StockAdjustmentReason.MANUAL_ADJUSTMENT,
          },
          'org-1',
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create inventory record if not exists', async () => {
      prisma.inventory.findUnique.mockResolvedValue(null);
      prisma.inventory.upsert.mockResolvedValue({
        id: 'inv-new',
        productId: 'prod-1',
        branchId: 'branch-1',
        quantity: 10,
        product: mockProduct as any,
        branch: mockBranch as any,
      } as any);
      prisma.stockAdjustment.create.mockResolvedValue({} as any);

      const result = await service.adjustStock(
        {
          productId: 'prod-1',
          branchId: 'branch-1',
          quantity: 10,
          reason: StockAdjustmentReason.MANUAL_ADJUSTMENT,
        },
        'org-1',
        'user-1',
      );

      expect(result.data.quantity).toBe(10);
      expect(prisma.inventory.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: {
            productId: 'prod-1',
            branchId: 'branch-1',
            quantity: 10,
          },
        }),
      );
    });
  });

  describe('getLowStockAlerts', () => {
    const mockBranch = { id: 'branch-1', organizationId: 'org-1' };

    it('should return low stock alerts with severity levels', async () => {
      prisma.branch.findFirst.mockResolvedValue(mockBranch as any);
      prisma.inventory.findMany.mockResolvedValue([
        {
          id: 'inv-1',
          quantity: 0,
          product: { id: 'prod-1', name: 'Product 1', minStock: 10 },
        },
        {
          id: 'inv-2',
          quantity: 8,
          product: { id: 'prod-2', name: 'Product 2', minStock: 10 },
        },
      ] as any);

      const result = await service.getLowStockAlerts('branch-1', 'org-1');

      expect(result.data).toHaveLength(2);
      const alertLevels = result.data.map((alert) => alert.alertLevel).sort();
      expect(alertLevels).toEqual(['CRITICAL', 'WARNING']);
      expect(result.meta.critical).toBe(1);
      expect(result.meta.warning).toBe(1);
    });

    it('should throw NotFoundException when branch not found', async () => {
      prisma.branch.findFirst.mockResolvedValue(null);

      await expect(service.getLowStockAlerts('invalid', 'org-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should only return items with minStock > 0', async () => {
      prisma.branch.findFirst.mockResolvedValue(mockBranch as any);
      prisma.inventory.findMany.mockResolvedValue([]);

      await service.getLowStockAlerts('branch-1', 'org-1');

      expect(prisma.inventory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            branchId: 'branch-1',
            product: {
              organizationId: 'org-1',
              deletedAt: null,
              minStock: { gt: 0 },
            },
          },
        }),
      );
    });
  });

  describe('createTransfer', () => {
    const mockProduct = { id: 'prod-1', organizationId: 'org-1' };
    const mockFromBranch = { id: 'branch-1', organizationId: 'org-1' };
    const mockToBranch = { id: 'branch-2', organizationId: 'org-1' };
    const mockFromInventory = {
      id: 'inv-1',
      productId: 'prod-1',
      branchId: 'branch-1',
      quantity: 50,
    };

    beforeEach(() => {
      prisma.product.findFirst.mockResolvedValue(mockProduct as any);
    });

    it('should create transfer between branches successfully', async () => {
      prisma.branch.findFirst
        .mockResolvedValueOnce(mockFromBranch as any)
        .mockResolvedValueOnce(mockToBranch as any);
      prisma.inventory.findUnique.mockResolvedValueOnce(mockFromInventory as any);
      prisma.inventory.update.mockResolvedValueOnce({ ...mockFromInventory, quantity: 40 } as any);
      prisma.inventory.upsert.mockResolvedValueOnce({ id: 'inv-2', quantity: 40 } as any);
      prisma.transfer.create.mockResolvedValue({ id: 'transfer-1' } as any);
      prisma.stockAdjustment.create.mockResolvedValue({} as any);

      const result = await service.createTransfer(
        {
          productId: 'prod-1',
          fromBranchId: 'branch-1',
          toBranchId: 'branch-2',
          quantity: 10,
          notes: 'Test transfer',
        },
        'org-1',
        'user-1',
      );

      expect(result.data.id).toBe('transfer-1');
      expect(prisma.inventory.update).toHaveBeenCalledTimes(1);
      expect(prisma.inventory.upsert).toHaveBeenCalledTimes(1);
      expect(prisma.stockAdjustment.create).toHaveBeenCalledTimes(2);
      expect(prisma.transfer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fromBranchId: 'branch-1',
            toBranchId: 'branch-2',
            status: 'RECEIVED',
          }),
          include: expect.objectContaining({
            fromBranch: true,
            toBranch: true,
          }),
        }),
      );
    });

    it('should throw BadRequestException when transferring to same branch', async () => {
      await expect(
        service.createTransfer(
          {
            productId: 'prod-1',
            fromBranchId: 'branch-1',
            toBranchId: 'branch-1',
            quantity: 10,
          },
          'org-1',
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when insufficient stock', async () => {
      prisma.branch.findFirst
        .mockResolvedValueOnce(mockFromBranch as any)
        .mockResolvedValueOnce(mockToBranch as any);
      prisma.inventory.findUnique.mockResolvedValue(mockFromInventory as any);

      await expect(
        service.createTransfer(
          {
            productId: 'prod-1',
            fromBranchId: 'branch-1',
            toBranchId: 'branch-2',
            quantity: 60,
          },
          'org-1',
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when from branch not found', async () => {
      prisma.branch.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.createTransfer(
          {
            productId: 'prod-1',
            fromBranchId: 'invalid',
            toBranchId: 'branch-2',
            quantity: 10,
          },
          'org-1',
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when to branch not found', async () => {
      prisma.branch.findFirst
        .mockResolvedValueOnce(mockFromBranch as any)
        .mockResolvedValueOnce(null);

      await expect(
        service.createTransfer(
          {
            productId: 'prod-1',
            fromBranchId: 'branch-1',
            toBranchId: 'invalid',
            quantity: 10,
          },
          'org-1',
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create destination inventory if not exists', async () => {
      prisma.branch.findFirst
        .mockResolvedValueOnce(mockFromBranch as any)
        .mockResolvedValueOnce(mockToBranch as any);
      prisma.inventory.findUnique
        .mockResolvedValueOnce(mockFromInventory as any);
      prisma.inventory.update.mockResolvedValue({
        ...mockFromInventory,
        quantity: 40,
      } as any);
      prisma.inventory.upsert.mockResolvedValue({
        id: 'inv-new',
        quantity: 10,
      } as any);
      prisma.transfer.create.mockResolvedValue({ id: 'transfer-1' } as any);
      prisma.stockAdjustment.create.mockResolvedValue({} as any);

      await service.createTransfer(
        {
          productId: 'prod-1',
          fromBranchId: 'branch-1',
          toBranchId: 'branch-2',
          quantity: 10,
        },
        'org-1',
        'user-1',
      );

      expect(prisma.inventory.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: {
            productId: 'prod-1',
            branchId: 'branch-2',
            quantity: 10,
          },
        }),
      );
    });
  });

  describe('deductStockOnOrderProcessing', () => {
    const mockOrder = {
      id: 'order-1',
      code: 'ORD-001',
      organizationId: 'org-1',
      branchId: 'branch-1',
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          quantity: 3,
          product: { id: 'prod-1', name: 'Product 1', organizationId: 'org-1' },
          variantId: 'variant-1',
        },
      ],
    };

    beforeEach(() => {
      prisma.order.findFirst.mockResolvedValue(mockOrder as any);
      prisma.orderInventoryReservation.count.mockResolvedValue(0);
      prisma.inventory.findUnique.mockResolvedValue({ quantity: 10 } as any);
      prisma.inventory.update.mockResolvedValue({ quantity: 7 } as any);
      prisma.productVariant.findFirst.mockResolvedValue({ id: 'variant-1', stock: 5 } as any);
      prisma.productVariant.update.mockResolvedValue({ id: 'variant-1' } as any);
      prisma.stockAdjustment.create.mockResolvedValue({ id: 'adj-1' } as any);
      prisma.orderInventoryReservation.createMany.mockResolvedValue({ count: 1 } as any);
    });

    it('reserves inventory, logs adjustment, and creates reservation rows', async () => {
      const result = await service.deductStockOnOrderProcessing('order-1', 'org-1', 'user-1');

      expect(prisma.inventory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { productId_branchId: { productId: 'prod-1', branchId: 'branch-1' } },
          data: { quantity: { decrement: 3 } },
        }),
      );
      expect(prisma.stockAdjustment.create).toHaveBeenCalled();
      expect(prisma.orderInventoryReservation.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            orderItemId: 'item-1',
            reservationAdjustmentId: 'adj-1',
            variantReservedQuantity: 3,
          }),
        ],
      });
      expect(result.data).toEqual({ reservedItems: 1, adjustmentId: 'adj-1' });
    });

    it('throws when stock is insufficient', async () => {
      prisma.inventory.findUnique.mockResolvedValue({ quantity: 1 } as any);

      await expect(
        service.deductStockOnOrderProcessing('order-1', 'org-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when there are active reservations', async () => {
      prisma.orderInventoryReservation.count.mockResolvedValue(1);

      await expect(
        service.deductStockOnOrderProcessing('order-1', 'org-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when order does not exist', async () => {
      prisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.deductStockOnOrderProcessing('missing', 'org-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('returnStockOnOrderCancel', () => {
    const mockOrder = {
      id: 'order-1',
      code: 'ORD-001',
      organizationId: 'org-1',
      branchId: 'branch-1',
      items: [],
    };

    beforeEach(() => {
      prisma.order.findFirst.mockResolvedValue(mockOrder as any);
      prisma.orderInventoryReservation.findMany.mockResolvedValue([
        {
          id: 'res-1',
          branchId: 'branch-1',
          productId: 'prod-1',
          quantity: 2,
          variantId: 'variant-1',
          variantReservedQuantity: 1,
        },
      ] as any);
      prisma.inventory.findUnique.mockResolvedValue({ quantity: 3 } as any);
      prisma.inventory.update.mockResolvedValue({ quantity: 5 } as any);
      prisma.productVariant.update.mockResolvedValue({ id: 'variant-1' } as any);
      prisma.stockAdjustment.create.mockResolvedValue({ id: 'adj-2' } as any);
      prisma.orderInventoryReservation.updateMany.mockResolvedValue({ count: 1 } as any);
    });

    it('restores stock and marks reservations as returned', async () => {
      const result = await service.returnStockOnOrderCancel('order-1', 'org-1', 'user-1');

      expect(prisma.inventory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { productId_branchId: { productId: 'prod-1', branchId: 'branch-1' } },
          data: { quantity: { increment: 2 } },
        }),
      );
      expect(prisma.productVariant.update).toHaveBeenCalledWith({
        where: { id: 'variant-1' },
        data: { stock: { increment: 1 } },
      });
      expect(prisma.orderInventoryReservation.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['res-1'] } },
        data: {
          status: 'RETURNED',
          releaseAdjustmentId: 'adj-2',
        },
      });
      expect(result.data).toEqual({ restoredItems: 1, adjustmentId: 'adj-2' });
    });

    it('returns early when there is nothing to restore', async () => {
      prisma.orderInventoryReservation.findMany.mockResolvedValue([]);

      const result = await service.returnStockOnOrderCancel('order-1', 'org-1', 'user-1');

      expect(result.data).toEqual({ restoredItems: 0 });
      expect(prisma.inventory.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when order does not exist', async () => {
      prisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.returnStockOnOrderCancel('missing', 'org-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
