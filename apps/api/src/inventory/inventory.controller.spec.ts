import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../common/guards/organization.guard';
import { UserRole } from '@prisma/client';
import { StockAdjustmentReason } from './dto/adjust-stock.dto';

describe('InventoryController', () => {
  let controller: InventoryController;
  let service: InventoryService;

  const mockInventoryService = {
    getInventoryByBranch: jest.fn(),
    adjustStock: jest.fn(),
    getLowStockAlerts: jest.fn(),
    createTransfer: jest.fn(),
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedpassword',
    role: UserRole.OWNER,
    organizationId: 'org-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRequest = {
    user: mockUser,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [{ provide: InventoryService, useValue: mockInventoryService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(OrganizationGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<InventoryController>(InventoryController);
    service = module.get<InventoryService>(InventoryService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getInventoryByBranch', () => {
    it('should return paginated inventory for a branch', async () => {
      const queryDto = {
        branchId: 'branch-1',
        page: 1,
        limit: 20,
      };

      const mockResult = {
        data: [
          {
            id: 'inv-1',
            productId: 'prod-1',
            branchId: 'branch-1',
            quantity: 100,
            product: {
              id: 'prod-1',
              name: 'Product 1',
              sku: 'SKU001',
            },
          },
        ],
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      };

      mockInventoryService.getInventoryByBranch.mockResolvedValue(mockResult);

      const result = await controller.getInventoryByBranch(queryDto as any, 'org-1');

      expect(result).toEqual(mockResult);
      expect(service.getInventoryByBranch).toHaveBeenCalledWith(queryDto, 'org-1');
    });

    it('should pass search and filter parameters', async () => {
      const queryDto = {
        branchId: 'branch-1',
        search: 'test',
        categoryId: 'cat-1',
        lowStockOnly: true,
        page: 1,
        limit: 20,
      };

      const mockResult = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
      mockInventoryService.getInventoryByBranch.mockResolvedValue(mockResult);

      await controller.getInventoryByBranch(queryDto as any, 'org-1');

      expect(service.getInventoryByBranch).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'test',
          categoryId: 'cat-1',
          lowStockOnly: true,
        }),
        'org-1',
      );
    });
  });

  describe('adjustStock', () => {
    it('should adjust stock for a product', async () => {
      const adjustDto = {
        productId: 'prod-1',
        branchId: 'branch-1',
        quantity: 10,
        reason: StockAdjustmentReason.MANUAL_ADJUSTMENT,
        notes: 'Test adjustment',
      };

      const mockResult = {
        data: {
          id: 'inv-1',
          productId: 'prod-1',
          branchId: 'branch-1',
          quantity: 110,
        },
      };

      mockInventoryService.adjustStock.mockResolvedValue(mockResult);

      const result = await controller.adjustStock(
        adjustDto as any,
        'org-1',
        mockRequest as any,
      );

      expect(result).toEqual(mockResult);
      expect(service.adjustStock).toHaveBeenCalledWith(adjustDto, 'org-1', 'user-1');
    });

    it('should handle negative quantity adjustments', async () => {
      const adjustDto = {
        productId: 'prod-1',
        branchId: 'branch-1',
        quantity: -5,
        reason: StockAdjustmentReason.DAMAGED,
      };

      const mockResult = {
        data: {
          id: 'inv-1',
          quantity: 95,
        },
      };

      mockInventoryService.adjustStock.mockResolvedValue(mockResult);

      await controller.adjustStock(adjustDto as any, 'org-1', mockRequest as any);

      expect(service.adjustStock).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: -5 }),
        'org-1',
        'user-1',
      );
    });
  });

  describe('getLowStockAlerts', () => {
    it('should return low stock alerts for a branch', async () => {
      const mockResult = {
        data: [
          {
            id: 'inv-1',
            quantity: 5,
            product: {
              id: 'prod-1',
              name: 'Product 1',
              minStock: 10,
            },
            severity: 'CRITICAL',
          },
        ],
        meta: {
          total: 1,
          criticalCount: 1,
          warningCount: 0,
        },
      };

      mockInventoryService.getLowStockAlerts.mockResolvedValue(mockResult);

      const result = await controller.getLowStockAlerts('branch-1', 'org-1');

      expect(result).toEqual(mockResult);
      expect(service.getLowStockAlerts).toHaveBeenCalledWith('branch-1', 'org-1');
    });

    it('should call service with correct parameters', async () => {
      mockInventoryService.getLowStockAlerts.mockResolvedValue({
        data: [],
        meta: { total: 0, criticalCount: 0, warningCount: 0 },
      });

      await controller.getLowStockAlerts('branch-2', 'org-2');

      expect(service.getLowStockAlerts).toHaveBeenCalledWith('branch-2', 'org-2');
    });
  });

  describe('createTransfer', () => {
    it('should create inter-branch transfer', async () => {
      const transferDto = {
        productId: 'prod-1',
        fromBranchId: 'branch-1',
        toBranchId: 'branch-2',
        quantity: 10,
        notes: 'Test transfer',
      };

      const mockResult = {
        data: {
          id: 'transfer-1',
          productId: 'prod-1',
          fromBranchId: 'branch-1',
          toBranchId: 'branch-2',
          quantity: 10,
          status: 'RECEIVED',
        },
      };

      mockInventoryService.createTransfer.mockResolvedValue(mockResult);

      const result = await controller.createTransfer(
        transferDto as any,
        'org-1',
        mockRequest as any,
      );

      expect(result).toEqual(mockResult);
      expect(service.createTransfer).toHaveBeenCalledWith(transferDto, 'org-1', 'user-1');
    });

    it('should pass user ID for audit trail', async () => {
      const transferDto = {
        productId: 'prod-1',
        fromBranchId: 'branch-1',
        toBranchId: 'branch-2',
        quantity: 5,
      };

      mockInventoryService.createTransfer.mockResolvedValue({ data: {} });

      await controller.createTransfer(transferDto as any, 'org-1', mockRequest as any);

      expect(service.createTransfer).toHaveBeenCalledWith(
        transferDto,
        'org-1',
        expect.stringMatching('user-1'),
      );
    });
  });
});
