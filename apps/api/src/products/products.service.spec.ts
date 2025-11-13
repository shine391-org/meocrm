import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    product: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a product successfully', async () => {
      const createDto = {
        sku: 'TEST001',
        name: 'Test Product',
        costPrice: 100,
        sellPrice: 150,
      };
      const organizationId = 'org-123';

      mockPrismaService.product.findFirst.mockResolvedValue(null);
      mockPrismaService.product.create.mockResolvedValue({
        id: 'prod-123',
        ...createDto,
        organizationId,
      });

      const result = await service.create(createDto as any, organizationId);

      expect(result).toHaveProperty('id');
      expect(result.sku).toBe('TEST001');
      expect(prisma.product.create).toHaveBeenCalledWith({
        data: { ...createDto, organizationId },
        include: { category: true },
      });
    });

    it('should throw ConflictException if SKU exists', async () => {
      const createDto = {
        sku: 'TEST001',
        name: 'Test Product',
        costPrice: 100,
        sellPrice: 150,
      };
      const organizationId = 'org-123';

      mockPrismaService.product.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.create(createDto as any, organizationId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      const query = { page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' };
      const organizationId = 'org-123';
      const mockProducts = [{ id: '1', name: 'Product 1' }];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.count.mockResolvedValue(1);

      const result = await service.findAll(query as any, organizationId);

      expect(result.data).toEqual(mockProducts);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should filter by search term', async () => {
      const query = { page: 1, limit: 20, search: 'test', sortBy: 'name', sortOrder: 'asc' };
      const organizationId = 'org-123';

      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      await service.findAll(query as any, organizationId);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
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

    it('should filter by price range', async () => {
      const query = { page: 1, limit: 20, minPrice: 100, maxPrice: 500, sortBy: 'sellPrice', sortOrder: 'asc' };
      const organizationId = 'org-123';

      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      await service.findAll(query as any, organizationId);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sellPrice: { gte: 100, lte: 500 },
          }),
        }),
      );
    });

    it('should filter by inStock', async () => {
      const query = { page: 1, limit: 20, inStock: true, sortBy: 'stock', sortOrder: 'desc' };
      const organizationId = 'org-123';

      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      await service.findAll(query as any, organizationId);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            stock: { gt: 0 },
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a product by ID', async () => {
      const productId = 'prod-123';
      const organizationId = 'org-123';
      const mockProduct = { id: productId, name: 'Test Product' };

      mockPrismaService.product.findFirst.mockResolvedValue(mockProduct);

      const result = await service.findOne(productId, organizationId);

      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', 'org-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a product', async () => {
      const productId = 'prod-123';
      const organizationId = 'org-123';
      const updateDto = { name: 'Updated Name' };
      const existingProduct = { id: productId, name: 'Old Name' };
      const updatedProduct = { id: productId, name: 'Updated Name' };

      mockPrismaService.product.findFirst.mockResolvedValue(existingProduct);
      mockPrismaService.product.update.mockResolvedValue(updatedProduct);

      const result = await service.update(productId, updateDto, organizationId);

      expect(result.name).toBe('Updated Name');
    });
  });

  describe('remove', () => {
    it('should soft delete a product', async () => {
      const productId = 'prod-123';
      const organizationId = 'org-123';
      const existingProduct = { id: productId, name: 'Test Product' };

      mockPrismaService.product.findFirst.mockResolvedValue(existingProduct);
      mockPrismaService.product.update.mockResolvedValue({ ...existingProduct, deletedAt: new Date() });

      await service.remove(productId, organizationId);

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: productId },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
