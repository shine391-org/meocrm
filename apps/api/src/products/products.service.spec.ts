import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

const mockPrismaService = {
  $transaction: jest.fn(),
  product: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
  },
  category: {
    findFirst: jest.fn(),
  },
  productVariant: {
    findFirst: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get<typeof mockPrismaService>(PrismaService);

    jest.clearAllMocks();
    const mockTransactionClient = {
      product: prisma.product,
      category: prisma.category,
      productVariant: prisma.productVariant,
    };
    prisma.$transaction.mockImplementation((callback: any) => callback(mockTransactionClient));
    prisma.productVariant.findMany.mockResolvedValue([]);
  });

  describe('create', () => {
    it('creates product with optional variants', async () => {
      prisma.product.findFirst.mockResolvedValueOnce(null);
      prisma.category.findFirst.mockResolvedValueOnce(null);
      prisma.product.create.mockResolvedValue({
        id: 'prod-123',
        sku: 'TEST001',
        sellPrice: 150,
        variants: [],
      });
      prisma.product.findFirst.mockResolvedValueOnce({
        id: 'prod-123',
        sku: 'TEST001',
        sellPrice: 150,
        variants: [{ id: 'variant-1' }],
      });
      prisma.productVariant.findFirst.mockResolvedValue(null);

      const result = await service.create(
        {
          sku: 'TEST001',
          name: 'Test Product',
          costPrice: 100,
          sellPrice: 150,
          variants: [{ name: 'Default', additionalPrice: 0 }],
        } as any,
        'org-123',
      );

      expect(prisma.product.create).toHaveBeenCalled();
      expect(prisma.productVariant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productId: 'prod-123',
            organizationId: 'org-123',
          }),
        }),
      );
      expect(result).toMatchObject({ id: 'prod-123', sku: 'TEST001' });
      expect(result?.variants).toEqual([{ id: 'variant-1' }]);
    });

    it('rejects duplicate SKU inside organization', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create({ sku: 'DUP', name: 'Dup', costPrice: 1, sellPrice: 2 } as any, 'org-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('validates category ownership', async () => {
      prisma.product.findFirst.mockResolvedValueOnce(null);
      prisma.category.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.create({ sku: 'NEWSKU', name: 'Test', costPrice: 1, sellPrice: 2, categoryId: 'cat-x' } as any, 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('returns paginated results respecting filters', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: 'prod-1' }]);
      prisma.product.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 } as any, 'org-1');

      expect(result.meta.total).toBe(1);
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ organizationId: 'org-1' }) }),
      );
    });
  });

  describe('findOne', () => {
    it('throws when product missing', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.findOne('missing', 'org-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      prisma.product.findFirst.mockResolvedValue({
        id: 'prod-1',
        sku: 'TEST',
        sellPrice: 200,
        categoryId: null,
        variants: [],
      });
      prisma.product.updateMany.mockResolvedValue({ count: 1 });
      prisma.product.findFirst.mockResolvedValueOnce({
        id: 'prod-1',
        sku: 'TEST',
        sellPrice: 200,
        variants: [],
      });
    });

    it('updates product metadata', async () => {
      prisma.product.findFirst.mockResolvedValueOnce({
        id: 'prod-1',
        sku: 'TEST',
        sellPrice: 200,
        categoryId: null,
        variants: [],
      });
      prisma.product.findFirst.mockResolvedValueOnce({ id: 'prod-1', sku: 'TEST', sellPrice: 200, variants: [] });

      await service.update('prod-1', { name: 'Updated' }, 'org-1');

      expect(prisma.product.updateMany).toHaveBeenCalledWith({
        where: { id: 'prod-1', organizationId: 'org-1' },
        data: expect.objectContaining({ name: 'Updated' }),
      });
    });

    it('replaces variants when payload includes them', async () => {
      prisma.product.findFirst.mockResolvedValueOnce({
        id: 'prod-1',
        sku: 'TEST',
        sellPrice: 200,
        categoryId: null,
        variants: [],
      });
      prisma.product.findFirst.mockResolvedValueOnce({
        id: 'prod-1',
        sku: 'TEST',
        sellPrice: 200,
        variants: [],
      });
      prisma.productVariant.findFirst.mockResolvedValue(null);

      await service.update(
        'prod-1',
        { variants: [{ name: 'Red', additionalPrice: 10 }] } as any,
        'org-1',
      );

      expect(prisma.productVariant.deleteMany).toHaveBeenCalledWith({
        where: { productId: 'prod-1', organizationId: 'org-1' },
      });
      expect(prisma.productVariant.create).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('soft deletes product scoped by org', async () => {
      prisma.product.updateMany.mockResolvedValue({ count: 1 });
      await service.remove('prod-1', 'org-1');
      expect(prisma.product.updateMany).toHaveBeenCalledWith({
        where: { id: 'prod-1', organizationId: 'org-1', deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('throws when product cannot be removed', async () => {
      prisma.product.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.remove('missing', 'org-1')).rejects.toThrow(NotFoundException);
    });
  });
});
