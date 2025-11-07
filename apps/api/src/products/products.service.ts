import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    // Check SKU uniqueness
    const existingSku = await this.prisma.product.findFirst({
      where: {
        sku: dto.sku,
        deletedAt: null,
      },
    });

    if (existingSku) {
      throw new ConflictException('SKU already exists');
    }

    // If categoryId provided, verify it exists
    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });

      if (!category) {
        throw new BadRequestException('Category not found');
      }
    }

    return this.prisma.product.create({
      data: {
        sku: dto.sku,
        name: dto.name,
        description: dto.description,
        categoryId: dto.categoryId,
        costPrice: dto.costPrice,
        sellPrice: dto.sellPrice,
        stock: dto.stock ?? 0,
        minStock: dto.minStock ?? 0,
        maxStock: dto.maxStock ?? 999999,
        images: dto.images ?? [],
        weight: dto.weight,
        isActive: dto.isActive ?? true,
      },
      include: {
        category: true,
        variants: true,
      },
    });
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { deletedAt: null },
        include: {
          category: true,
          variants: true,
          _count: {
            select: { variants: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({
        where: { deletedAt: null },
      }),
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

  async findOne(id: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        category: true,
        variants: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Check SKU uniqueness if changing
    if (dto.sku && dto.sku !== product.sku) {
      const existingSku = await this.prisma.product.findFirst({
        where: {
          sku: dto.sku,
          deletedAt: null,
          id: { not: id },
        },
      });

      if (existingSku) {
        throw new ConflictException('SKU already exists');
      }
    }

    // Verify category if provided
    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });

      if (!category) {
        throw new BadRequestException('Category not found');
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: {
        category: true,
        variants: true,
      },
    });
  }

  async remove(id: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Soft delete
    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Product deleted successfully' };
  }

  // ==================== VARIANTS ====================

  async createVariant(productId: string, dto: CreateVariantDto) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        deletedAt: null,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Check SKU uniqueness
    const existingSku = await this.prisma.productVariant.findFirst({
      where: { sku: dto.sku },
    });

    if (existingSku) {
      throw new ConflictException('Variant SKU already exists');
    }

    return this.prisma.productVariant.create({
      data: {
        productId,
        sku: dto.sku,
        name: dto.name,
        sellPrice: dto.sellPrice,
        stock: dto.stock ?? 0,
        images: dto.images ?? [],
      },
    });
  }

  async findVariants(productId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        deletedAt: null,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    return this.prisma.productVariant.findMany({
      where: { productId },
      orderBy: { name: 'asc' },
    });
  }

  async updateVariant(variantId: string, dto: UpdateVariantDto) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      throw new NotFoundException(`Variant with ID ${variantId} not found`);
    }

    // Check SKU uniqueness if changing
    if (dto.sku && dto.sku !== variant.sku) {
      const existingSku = await this.prisma.productVariant.findFirst({
        where: {
          sku: dto.sku,
          id: { not: variantId },
        },
      });

      if (existingSku) {
        throw new ConflictException('Variant SKU already exists');
      }
    }

    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: dto,
    });
  }

  async removeVariant(variantId: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      throw new NotFoundException(`Variant with ID ${variantId} not found`);
    }

    await this.prisma.productVariant.delete({
      where: { id: variantId },
    });

    return { message: 'Variant deleted successfully' };
  }
}
