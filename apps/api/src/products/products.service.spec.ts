import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QueryProductsDto, ProductSortBy, SortOrder } from './dto/query-products.dto';
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

  describe('findAll', () => {
    const organizationId = 'org1';
    const mockProducts = [{ id: '1', name: 'Product 1', sku: 'PRD001', organizationId }];

    it('should return paginated products with hasNext and hasPrev', async () => {
      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.count.mockResolvedValue(10); // 10 items total

      const query: QueryProductsDto = { page: 2, limit: 3 };
      const result = await service.findAll(query, organizationId);

      expect(result.meta.total).toBe(10);
      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(3);
      expect(result.meta.totalPages).toBe(4);
      expect(result.meta.hasNext).toBe(true);
      expect(result.meta.hasPrev).toBe(true);
    });

    it('should throw BadRequestException if minPrice > maxPrice', async () => {
      const query: QueryProductsDto = { minPrice: 100, maxPrice: 50 };
      await expect(service.findAll(query, organizationId)).rejects.toThrow(BadRequestException);
    });

    it('should filter by search term', async () => {
      const query: QueryProductsDto = { search: 'Test' };
      await service.findAll(query, organizationId);
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { name: { contains: 'Test', mode: 'insensitive' } },
            { sku: { contains: 'Test', mode: 'insensitive' } },
            { description: { contains: 'Test', mode: 'insensitive' } },
          ],
        }),
      }));
    });

    it('should filter by price range', async () => {
      const query: QueryProductsDto = { minPrice: 10, maxPrice: 100 };
      await service.findAll(query, organizationId);
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          sellPrice: { gte: 10, lte: 100 },
        }),
      }));
    });

    it('should filter by inStock', async () => {
      const query: QueryProductsDto = { inStock: true };
      await service.findAll(query, organizationId);
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          stock: { gt: 0 },
        }),
      }));
    });

    it('should sort by name ascending', async () => {
      const query: QueryProductsDto = { sortBy: ProductSortBy.name, order: SortOrder.asc };
      await service.findAll(query, organizationId);
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
        orderBy: { name: 'asc' },
      }));
    });

    it('should handle pagination correctly', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      const query: QueryProductsDto = { page: 3, limit: 15 };
      await service.findAll(query, organizationId);
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
        skip: 30,
        take: 15,
      }));
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
});
