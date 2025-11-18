import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { QueryProductsDto } from './dto/query-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);

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
      } as any);
      prisma.product.findFirst.mockResolvedValueOnce({
        id: 'prod-123',
        sku: 'TEST001',
        sellPrice: 150,
        variants: [{ id: 'variant-1' }],
      } as any);
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
      prisma.product.findFirst.mockResolvedValue({ id: 'existing' } as any);

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
      prisma.product.findMany.mockResolvedValue([{ id: 'prod-1' }] as any);
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
      prisma.product.findFirst
        .mockResolvedValueOnce({
          id: 'prod-1',
          sku: 'TEST',
          sellPrice: 200,
          categoryId: null,
          variants: [],
        })
        .mockResolvedValueOnce({ id: 'prod-1', sku: 'TEST', sellPrice: 200, variants: [] });

      await service.update('prod-1', { name: 'Updated' }, 'org-1');

      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prod-1' },
          data: expect.objectContaining({ name: 'Updated' }),
        }),
      );
    });

  });

  describe('remove', () => {
    it('soft deletes product scoped by org', async () => {
      prisma.product.updateMany.mockResolvedValue({ count: 1 });
      await service.remove('prod-1', 'org-1');
      expect(prisma.product.updateMany).toHaveBeenCalledWith({
        where: { id: 'prod-1', organizationId: 'org-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('throws when product cannot be removed', async () => {
      prisma.product.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.remove('missing', 'org-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('variants', () => {
    it('creates variant with generated SKU and defaults', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValueOnce({
        id: 'prod-1',
        sku: 'PRD001',
        sellPrice: 100000,
      } as any);
      prisma.productVariant.findFirst.mockResolvedValueOnce(null);
      prisma.productVariant.create.mockResolvedValue({ id: 'variant-1' });

      const result = await service.createVariant(
        'prod-1',
        { name: 'Size L', additionalPrice: 10000 },
        'org-1',
      );

      expect(prisma.productVariant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sku: 'PRD001-Size L',
            additionalPrice: 10000,
            stock: 0,
          }),
        }),
      );
      expect(result).toEqual({ id: 'variant-1' });
    });

    it('throws NotFoundException when updating missing variant', async () => {
      prisma.productVariant.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.updateVariant('variant-404', { name: 'new' }, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('soft deletes variant when removeVariant is called', async () => {
      const variant = { id: 'variant-1' };
      prisma.productVariant.findFirst.mockResolvedValueOnce(variant as any);
      prisma.productVariant.update.mockResolvedValue({ deletedAt: new Date() });

      const result = await service.removeVariant('variant-1', 'org-1');
      expect(prisma.productVariant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'variant-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
      expect(result).toEqual({ message: 'Variant deleted successfully' });
    });
  });

});
