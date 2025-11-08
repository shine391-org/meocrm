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
