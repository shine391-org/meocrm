import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto, ProductSortBy, SortOrder } from './dto/query-products.dto';
import { Prisma } from '@prisma/client';

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

  async create(createProductDto: CreateProductDto, organizationId: string) {
    // Check SKU uniqueness within organization
    const existing = await this.prisma.product.findFirst({
      where: {
        sku: createProductDto.sku,
        organizationId,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(`SKU "${createProductDto.sku}" already exists`);
    }

    if (createProductDto.categoryId) {
      await this.ensureCategoryBelongsToOrganization(createProductDto.categoryId, organizationId);
    }

    return this.prisma.product.create({
      data: {
        ...createProductDto,
        organizationId,
        images: createProductDto.images ?? [],
      },
      include: {
        category: true,
      },
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

    // Build where clause
    const where: Prisma.ProductWhereInput = {
      organizationId,
      deletedAt: null,
    };

    // Search by name or SKU
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter by category
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Filter by price range
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.sellPrice = {};
      if (minPrice !== undefined) {
        where.sellPrice.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.sellPrice.lte = maxPrice;
      }
    }

    // Filter by stock
    if (inStock !== undefined) {
      where.stock = inStock ? { gt: 0 } : { lte: 0 };
    }

    // Execute queries
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: normalizedLimit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          category: true,
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
        deletedAt: null,
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

  async update(id: string, updateProductDto: UpdateProductDto, organizationId: string) {
    const existing = await this.findOne(id, organizationId);

    if (
      updateProductDto.categoryId &&
      updateProductDto.categoryId !== existing.categoryId
    ) {
      await this.ensureCategoryBelongsToOrganization(updateProductDto.categoryId, organizationId);
    }

    const { count } = await this.prisma.product.updateMany({
      where: { id, organizationId },
      data: updateProductDto,
    });

    if (count === 0) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return this.findOne(id, organizationId);
  }

  async remove(id: string, organizationId: string) {
    const { count } = await this.prisma.product.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (count === 0) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
  }
}
