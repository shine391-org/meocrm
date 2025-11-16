import { Test, TestingModule } from '@nestjs/testing';
import { VariantsService } from './variants.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

const mockPrismaService = {
  product: {
    findFirst: jest.fn(),
  },
  productVariant: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
};

describe('VariantsService', () => {
  let service: VariantsService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VariantsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<VariantsService>(VariantsService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  const product = { id: 'prod-1', sku: 'PROD', sellPrice: 100 } as any;

  describe('create', () => {
    it('creates variant with generated SKU and validates price', async () => {
      prisma.product.findFirst.mockResolvedValue(product);
      prisma.productVariant.findFirst.mockResolvedValueOnce(null);
      prisma.productVariant.create.mockResolvedValue({ id: 'variant-1' });

      const result = await service.create('prod-1', { name: 'S', stock: 5 }, 'org-1');

      expect(prisma.productVariant.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sku: 'PROD-S',
          additionalPrice: 0,
          productId: 'prod-1',
          organizationId: 'org-1',
        }),
        include: { product: true },
      });
      expect(result).toEqual({ id: 'variant-1' });
    });

    it('allows negative additionalPrice as long as final price > 0', async () => {
      prisma.product.findFirst.mockResolvedValue(product);
      prisma.productVariant.findFirst.mockResolvedValueOnce(null);
      prisma.productVariant.create.mockResolvedValue({ id: 'variant-2' });

      await expect(
        service.create('prod-1', { name: 'Discount', additionalPrice: -20 }, 'org-1'),
      ).resolves.toEqual({ id: 'variant-2' });
    });

    it('throws when variant price is not positive', async () => {
      prisma.product.findFirst.mockResolvedValue(product);

      await expect(
        service.create('prod-1', { name: 'Invalid', additionalPrice: -150 }, 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException on duplicate SKU', async () => {
      prisma.product.findFirst.mockResolvedValue(product);
      prisma.productVariant.findFirst.mockResolvedValueOnce({ id: 'dup' });

      await expect(service.create('prod-1', { name: 'S' }, 'org-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws when product is missing', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(service.create('missing', { name: 'S' }, 'org-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates variant with org guard and validates new price', async () => {
      prisma.product.findFirst.mockResolvedValue(product);
      prisma.productVariant.findFirst.mockResolvedValueOnce({
        id: 'variant-1',
        productId: 'prod-1',
        organizationId: 'org-1',
        sku: 'PROD-S',
        additionalPrice: 0,
      });
      prisma.productVariant.updateMany.mockResolvedValue({ count: 1 });
      prisma.productVariant.findFirst.mockResolvedValueOnce({ id: 'variant-1', sku: 'PROD-S' });

      const result = await service.update(
        'prod-1',
        'variant-1',
        { additionalPrice: 5 },
        'org-1',
      );

      expect(prisma.productVariant.updateMany).toHaveBeenCalledWith({
        where: { id: 'variant-1', organizationId: 'org-1' },
        data: { additionalPrice: 5 },
      });
      expect(result).toEqual({ id: 'variant-1', sku: 'PROD-S' });
    });

    it('throws when variant becomes non-positive after update', async () => {
      prisma.product.findFirst.mockResolvedValue(product);
      prisma.productVariant.findFirst.mockResolvedValueOnce({
        id: 'variant-1',
        productId: 'prod-1',
        organizationId: 'org-1',
        sku: 'PROD-S',
        additionalPrice: 0,
      });

      await expect(
        service.update('prod-1', 'variant-1', { additionalPrice: -200 }, 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('deletes variant scoped by organization', async () => {
      prisma.product.findFirst.mockResolvedValue(product);
      prisma.productVariant.deleteMany.mockResolvedValue({ count: 1 });

      await service.remove('prod-1', 'variant-1', 'org-1');

      expect(prisma.productVariant.deleteMany).toHaveBeenCalledWith({
        where: { id: 'variant-1', productId: 'prod-1', organizationId: 'org-1' },
      });
    });

    it('throws if deleteMany affects zero rows', async () => {
      prisma.product.findFirst.mockResolvedValue(product);
      prisma.productVariant.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.remove('prod-1', 'variant-1', 'org-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
