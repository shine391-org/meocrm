import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.product.create({
      data: {
        ...createProductDto,
        organizationId,
      },
      include: {
        category: true,
      },
    });
  }

  async findAll(query: QueryProductsDto, organizationId: string) {
    const { page, limit, search, categoryId, minPrice, maxPrice, inStock, sortBy, sortOrder } = query;

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

    // Pagination
    const skip = (page - 1) * limit;

    // Execute queries
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
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
        limit,
        totalPages: Math.ceil(total / limit),
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
    // Check if product exists and belongs to organization
    await this.findOne(id, organizationId);

    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
      include: {
        category: true,
      },
    });
  }

  async remove(id: string, organizationId: string) {
    // Check if product exists and belongs to organization
    await this.findOne(id, organizationId);

    // Soft delete
    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
