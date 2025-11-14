import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueryProductsDto } from './dto/query-products.dto';
import { CreateProductDto } from './dto/create-product.dto';

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
    },
    $transaction: jest.fn().mockImplementation((promises) => Promise.all(promises)),
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

  describe('findAll with filters', () => {
    it('should filter by categoryId', async () => {
      const filters = { categoryId: 'cat-1' };
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      await service.findAll(1, 20, 'org-1', filters);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ categoryId: 'cat-1' }),
        }),
      );
    });

    it('should filter by price range', async () => {
      const filters = { minPrice: 1000, maxPrice: 5000 };
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      await service.findAll(1, 20, 'org-1', filters);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sellPrice: { gte: 1000, lte: 5000 },
          }),
        }),
      );
    });

    it('should filter by inStock', async () => {
      const filters = { inStock: true };
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      await service.findAll(1, 20, 'org-1', filters);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ stock: { gt: 0 } }),
        }),
      );
    });

    it('should search by name and SKU', async () => {
      const filters = { search: 'test' };
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      await service.findAll(1, 20, 'org-1', filters);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'test', mode: 'insensitive' } },
              { sku: { contains: 'test', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should sort by stock descending', async () => {
      const filters: QueryProductsDto = { sortBy: 'stock', sortOrder: 'desc' };
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      await service.findAll(1, 20, 'org-1', filters);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { stock: 'desc' },
        }),
      );
    });

    it('should work without filters (backward compatible)', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      const result = await service.findAll(1, 20, 'org-1', {});

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });

    it('should calculate hasNext and hasPrev correctly', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(50);

      const result = await service.findAll(2, 20, 'org-1', {});

      expect(result.meta.hasNext).toBe(true);  // page 2/3
      expect(result.meta.hasPrev).toBe(true);  // page 2/3
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
      const createDto: CreateProductDto = {
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
  });

  describe('remove', () => {
    it('should soft delete product', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue({ id: '1', variants: [] });
      mockPrismaService.product.update.mockResolvedValue({ deletedAt: new Date() });

      const result = await service.remove('1', 'org1');
      expect(result).toEqual({ message: 'Product deleted successfully' });
    });
  });

  describe('inventory helpers', () => {
    it('generates SKU defaults when no previous product exists', async () => {
      mockPrismaService.product.findFirst.mockResolvedValueOnce(null);
      const sku = await service.generateSKU('org-1');
      expect(sku).toBe('PRD001');
    });

    it('handles invalid numeric suffixes when generating SKU', async () => {
      mockPrismaService.product.findFirst.mockResolvedValueOnce({ sku: 'PRDABC' });
      const sku = await service.generateSKU('org-1');
      expect(sku).toBe('PRD001');
    });

    it('generates variant SKUs with sequential suffixes', async () => {
      mockPrismaService.productVariant.findFirst.mockResolvedValueOnce({ sku: 'PRD001-V01' });
      const variantSku = await service.generateVariantSKU('PRD001', 'org-1');
      expect(variantSku).toBe('PRD001-V02');
    });
  });

  describe('variants', () => {
    it('creates variant with generated SKU and defaults', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValueOnce({ id: 'prod-1', sku: 'PRD001' } as any);
      jest.spyOn(service, 'generateVariantSKU').mockResolvedValueOnce('PRD001-V01');
      mockPrismaService.productVariant.create.mockResolvedValue({ id: 'variant-1' });

      const result = await service.createVariant('prod-1', { name: 'Size L', price: 100000 }, 'org-1');
      expect(service.generateVariantSKU).toHaveBeenCalledWith('PRD001', 'org-1');
      expect(result).toEqual({ id: 'variant-1' });
    });

    it('throws NotFoundException when updating missing variant', async () => {
      mockPrismaService.productVariant.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.updateVariant('variant-404', { name: 'new' }, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('soft deletes variant when removeVariant is called', async () => {
      const variant = { id: 'variant-1' };
      mockPrismaService.productVariant.findFirst.mockResolvedValueOnce(variant as any);
      mockPrismaService.productVariant.update.mockResolvedValue({ deletedAt: new Date() });

      const result = await service.removeVariant('variant-1', 'org-1');
      expect(mockPrismaService.productVariant.update).toHaveBeenCalledWith({
        where: { id: 'variant-1' },
        data: { deletedAt: expect.any(Date), isActive: false },
      });
      expect(result).toEqual({ message: 'Variant deleted successfully' });
    });
  });

  describe('remove guards', () => {
    it('throws ConflictException when product has variants', async () => {
      mockPrismaService.product.findFirst.mockResolvedValueOnce({
        id: 'prod-1',
        variants: [{ id: 'var-1' }],
      });

      await expect(service.remove('prod-1', 'org-1')).rejects.toThrow(ConflictException);
    });
  });
});
