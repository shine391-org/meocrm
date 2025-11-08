import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('ProductsService', () => {
  let service: ProductsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    productVariant: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      const mockProducts = [
        { id: '1', name: 'Product 1', sku: 'PRD001', organizationId: 'org1' },
      ];
      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.count.mockResolvedValue(1);

      const result = await service.findAll(1, 20, 'org1');

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org1', deletedAt: null },
        }),
      );
      expect(result).toEqual({
        data: mockProducts,
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      });
    });
  });

  describe('findOne', () => {
    it('should return a product', async () => {
      const mockProduct = { id: '1', name: 'Product 1' };
      mockPrismaService.product.findFirst.mockResolvedValue(mockProduct);

      const result = await service.findOne('1', 'org1');
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(null);
      await expect(service.findOne('999', 'org1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a product with SKU', async () => {
      const createDto = {
        name: 'New Product',
        basePrice: 100000,
        costPrice: 50000,
      };
      const mockProduct = { id: '1', sku: 'PRD002', ...createDto };
      mockPrismaService.product.findFirst.mockResolvedValue({ sku: 'PRD001' });
      mockPrismaService.product.create.mockResolvedValue(mockProduct);

      const result = await service.create(createDto, 'org1');
      expect(result.sku).toBe('PRD002');
    });

    it('should generate SKU fallback when none exist', async () => {
      mockPrismaService.product.findFirst.mockResolvedValueOnce(null);
      const code = await (service as any).generateSKU('org1');
      expect(code).toBe('PRD001');
    });
  });

  describe('variants', () => {
    it('should create and list variants', async () => {
      const product = { id: 'prod1', sku: 'PRD010', variants: [] };
      mockPrismaService.product.findFirst.mockResolvedValue(product);
      mockPrismaService.productVariant.findMany.mockResolvedValue([{ id: 'var1' }]);
      mockPrismaService.productVariant.create.mockResolvedValue({ id: 'var1', sku: 'PRD010-V01' });

      const created = await service.createVariant('prod1', { name: 'Size L', price: 10000 }, 'org1');
      expect(created.sku).toContain('PRD010-V');

      const variants = await service.findVariants('prod1', 'org1');
      expect(variants).toEqual([{ id: 'var1' }]);
    });

    it('should update and remove variant', async () => {
      mockPrismaService.productVariant.findFirst.mockResolvedValue({ id: 'var1' });
      mockPrismaService.productVariant.update.mockResolvedValue({ id: 'var1', name: 'Updated' });

      const updated = await service.updateVariant('var1', { name: 'Updated', price: 12000 }, 'org1');
      expect(updated.name).toBe('Updated');

      await service.removeVariant('var1', 'org1');
      expect(mockPrismaService.productVariant.delete).toHaveBeenCalledWith({ where: { id: 'var1' } });
    });
  });

  describe('remove', () => {
    it('should soft delete product', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue({ id: '1', variants: [] });
      mockPrismaService.product.update.mockResolvedValue({ deletedAt: new Date() });

      const result = await service.remove('1', 'org1');
      expect(result).toEqual({ message: 'Product deleted successfully' });
    });
  });

  describe('update', () => {
    it('should update product fields', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue({ id: '1', name: 'Old' });
      mockPrismaService.product.update.mockResolvedValue({ id: '1', name: 'New' });

      const result = await service.update('1', { name: 'New', basePrice: 2000 }, 'org1');
      expect(result.name).toBe('New');
    });
  });
});
