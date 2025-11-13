import { Test, TestingModule } from '@nestjs/testing';
import { VariantsService } from './variants.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

const mockPrismaService = {
  product: {
    findFirst: jest.fn(),
  },
  productVariant: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a variant with auto-generated SKU', async () => {
      const productId = 'product-id';
      const organizationId = 'org-id';
      const createDto = { name: 'D' };
      const product = { id: productId, sku: 'VDNT09' };
      const expectedSku = 'VDNT09-D';
      const expectedVariant = { id: 'variant-id', sku: expectedSku, ...createDto };

      prisma.product.findFirst.mockResolvedValue(product);
      prisma.productVariant.findFirst.mockResolvedValue(null);
      prisma.productVariant.create.mockResolvedValue(expectedVariant);

      const result = await service.create(productId, createDto, organizationId);

      expect(prisma.product.findFirst).toHaveBeenCalledWith({
        where: { id: productId, organizationId, deletedAt: null },
      });
      expect(prisma.productVariant.findFirst).toHaveBeenCalledWith({
        where: { sku: expectedSku, organizationId },
      });
      expect(prisma.productVariant.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          sku: expectedSku,
          productId,
          organizationId,
        },
        include: { product: true },
      });
      expect(result).toEqual(expectedVariant);
    });

    it('should create a variant with manual SKU', async () => {
        const productId = 'product-id';
        const organizationId = 'org-id';
        const createDto = { name: 'D', sku: 'CUSTOM-SKU' };
        const product = { id: productId, sku: 'VDNT09' };
        const expectedVariant = { id: 'variant-id', ...createDto };

        prisma.product.findFirst.mockResolvedValue(product);
        prisma.productVariant.findFirst.mockResolvedValue(null);
        prisma.productVariant.create.mockResolvedValue(expectedVariant);

        const result = await service.create(productId, createDto, organizationId);

        expect(result.sku).toBe('CUSTOM-SKU');
      });

    it('should throw ConflictException if variant SKU already exists', async () => {
      const productId = 'product-id';
      const organizationId = 'org-id';
      const createDto = { name: 'D' };
      const product = { id: productId, sku: 'VDNT09' };
      const expectedSku = 'VDNT09-D';

      prisma.product.findFirst.mockResolvedValue(product);
      prisma.productVariant.findFirst.mockResolvedValue({ id: 'existing-variant' });

      await expect(service.create(productId, createDto, organizationId)).rejects.toThrow(
        ConflictException
      );
    });

    it('should throw NotFoundException if product not found', async () => {
      const productId = 'product-id';
      const organizationId = 'org-id';
      const createDto = { name: 'D' };

      prisma.product.findFirst.mockResolvedValue(null);

      await expect(service.create(productId, createDto, organizationId)).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
