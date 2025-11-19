import { ConflictException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto, ProductSortBy, SortOrder } from './dto/query-products.dto';
import { CreateVariantDto } from './variants/dto/create-variant.dto';
import { UpdateVariantDto } from './variants/dto/update-variant.dto';

type PrismaTx = Prisma.TransactionClient;

type ProductWithPricing = {
  id: string;
  sku: string;
  sellPrice: Prisma.Decimal | number;
};

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureCategoryBelongsToOrganization(categoryId: string, organizationId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, organizationId },
      select: { id: true },
    });

    if (!category) {
      throw new BadRequestException('Category does not belong to this organization');
    }
  }

  private assertVariantPrice(basePrice: Prisma.Decimal | number, delta?: number) {
    const finalPrice = Number(basePrice ?? 0) + Number(delta ?? 0);
    if (finalPrice <= 0) {
      throw new BadRequestException('Variant price must be greater than zero');
    }
    return finalPrice;
  }

  private normalizeVariantSku(productSku: string, variant: CreateVariantDto) {
    const rawSku = (variant.sku ?? `${productSku}-${variant.name}`).trim();
    if (!rawSku) {
      throw new BadRequestException('Variant SKU cannot be empty');
    }
    return rawSku;
  }

  private async createVariantsForProduct(
    tx: PrismaTx,
    product: ProductWithPricing,
    variants: CreateVariantDto[],
    organizationId: string,
  ) {
    if (!variants?.length) {
      return;
    }

    for (const variantDto of variants) {
      const sku = this.normalizeVariantSku(product.sku, variantDto);
      const additionalPrice = variantDto.additionalPrice ?? 0;
      this.assertVariantPrice(product.sellPrice, additionalPrice);

      const existingVariant = await tx.productVariant.findFirst({
        where: { sku, organizationId, deletedAt: null },
        select: { id: true },
      });

      if (existingVariant) {
        throw new ConflictException(`Variant SKU "${sku}" already exists`);
      }

      await tx.productVariant.create({
        data: {
          productId: product.id,
          organizationId,
          sku,
          name: variantDto.name,
          additionalPrice,
          stock: variantDto.stock ?? 0,
          images: variantDto.images ?? [],
        },
      });
    }
  }

  private async ensureExistingVariantsRemainValid(
    tx: PrismaTx,
    productId: string,
    organizationId: string,
    sellPrice: Prisma.Decimal | number,
  ) {
    const variants = await tx.productVariant.findMany({
      where: { productId, organizationId, deletedAt: null },
    });

    for (const variant of variants) {
      this.assertVariantPrice(sellPrice, Number(variant.additionalPrice ?? 0));
    }
  }

  async create(createProductDto: CreateProductDto, organizationId: string) {
    const { variants, ...productData } = createProductDto;

    if (createProductDto.categoryId) {
      await this.ensureCategoryBelongsToOrganization(createProductDto.categoryId, organizationId);
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.product.findFirst({
        where: {
          sku: createProductDto.sku,
          organizationId,
        },
      });

      if (existing) {
        throw new ConflictException(`SKU "${createProductDto.sku}" already exists`);
      }

      const product = await tx.product.create({
        data: {
          ...productData,
          organizationId,
          images: productData.images ?? [],
          stock: productData.stock ?? 0,
          minStock: productData.minStock ?? 0,
          maxStock: productData.maxStock ?? 999999,
          isActive: productData.isActive ?? true,
        },
        include: { category: true },
      });

      await this.createVariantsForProduct(tx, product, variants ?? [], organizationId);

      return tx.product.findFirst({
        where: { id: product.id, organizationId },
        include: {
          category: true,
          variants: true,
        },
      });
    });
  }

  async findAll(query: QueryProductsDto, organizationId: string) {
    const {
      page = 1,
      limit = 20,
      search,
      categoryId,
      minPrice,
      maxPrice,
      inStock,
      sortBy = ProductSortBy.CREATED_AT,
      sortOrder = SortOrder.DESC,
    } = query;

    const normalizedLimit = Math.max(1, Math.min(limit, 100));
    const skip = (page - 1) * normalizedLimit;

    const where: Prisma.ProductWhereInput = {
      organizationId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.sellPrice = {};
      if (minPrice !== undefined) {
        where.sellPrice.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.sellPrice.lte = maxPrice;
      }
    }

    if (inStock !== undefined) {
      where.stock = inStock ? { gt: 0 } : { lte: 0 };
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: normalizedLimit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          category: true,
          variants: true,
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit: normalizedLimit,
        totalPages: Math.ceil(total / normalizedLimit),
      },
    };
  }

  async findOne(id: string, organizationId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        category: true,
        variants: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto, organizationId: string) {
    await this.findOne(id, organizationId);
    const updateData: any = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.sellPrice !== undefined) updateData.sellPrice = dto.sellPrice;
    if (dto.costPrice !== undefined) updateData.costPrice = dto.costPrice;
    if (dto.minStock !== undefined) updateData.minStock = dto.minStock;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.categoryId !== undefined) updateData.categoryId = dto.categoryId;
    return this.prisma.product.update({
      where: { id },
      data: updateData,
      include: { category: true, variants: true },
    });
  }

  async remove(id: string, organizationId: string) {
    const { count } = await this.prisma.product.updateMany({
      where: { id, organizationId },
      data: { deletedAt: new Date() },
    });

    if (count === 0) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
    return { message: 'Product deleted successfully' };
  }

  async createVariant(productId: string, dto: CreateVariantDto, organizationId: string) {
    const product = await this.findOne(productId, organizationId);

    // Normalize SKU
    const sku = this.normalizeVariantSku(product.sku, dto);

    // Validate price: sellPrice + additionalPrice must be > 0
    const additionalPrice = dto.additionalPrice ?? 0;
    this.assertVariantPrice(product.sellPrice, additionalPrice);

    // Check for duplicate SKU
    const existingVariant = await this.prisma.productVariant.findFirst({
      where: { sku, organizationId, deletedAt: null },
      select: { id: true },
    });

    if (existingVariant) {
      throw new ConflictException(`Variant SKU "${sku}" already exists`);
    }

    return this.prisma.productVariant.create({
      data: {
        sku,
        productId,
        organizationId,
        name: dto.name,
        additionalPrice,
        stock: dto.stock ?? 0,
        images: dto.images || [],
      },
    });
  }

  async findVariants(productId: string, organizationId: string) {
    await this.findOne(productId, organizationId);
    return this.prisma.productVariant.findMany({
      where: { productId, organizationId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateVariant(id: string, dto: UpdateVariantDto, organizationId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { product: true },
    });
    if (!variant) throw new NotFoundException(`Variant ${id} not found`);

    // Validate price if additionalPrice is being updated
    if (dto.additionalPrice !== undefined) {
      this.assertVariantPrice(variant.product.sellPrice, dto.additionalPrice);
    }

    const updateData: any = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.additionalPrice !== undefined) updateData.additionalPrice = dto.additionalPrice;
    if (dto.stock !== undefined) updateData.stock = dto.stock;
    if (dto.images !== undefined) updateData.images = dto.images;
    return this.prisma.productVariant.update({ where: { id }, data: updateData });
  }

  async removeVariant(id: string, organizationId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!variant) throw new NotFoundException(`Variant ${id} not found`);
    await this.prisma.productVariant.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Variant deleted successfully' };
  }
}
