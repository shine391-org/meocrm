import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async generateSKU(organizationId: string, prefix: string = 'PRD'): Promise<string> {
    const lastProduct = await this.prisma.product.findFirst({
      where: { 
        organizationId,
        sku: { startsWith: prefix },
        deletedAt: null
      },
      orderBy: { sku: 'desc' },
      select: { sku: true },
    });
    if (!lastProduct) return `${prefix}001`;
    const codeNumber = lastProduct.sku.substring(prefix.length);
    const lastNumber = parseInt(codeNumber, 10);
    if (isNaN(lastNumber)) return `${prefix}001`;
    return `${prefix}${(lastNumber + 1).toString().padStart(3, '0')}`;
  }

  async generateVariantSKU(productSKU: string, organizationId: string): Promise<string> {
    const prefix = `${productSKU}-V`;
    const lastVariant = await this.prisma.productVariant.findFirst({
      where: { organizationId, sku: { startsWith: prefix }, deletedAt: null },
      orderBy: { sku: 'desc' },
      select: { sku: true },
    });
    if (!lastVariant) return `${prefix}01`;
    const codeNumber = lastVariant.sku.substring(prefix.length);
    const lastNumber = parseInt(codeNumber, 10);
    if (isNaN(lastNumber)) return `${prefix}01`;
    return `${prefix}${(lastNumber + 1).toString().padStart(2, '0')}`;
  }

  async create(dto: CreateProductDto, organizationId: string) {
    const sku = await this.generateSKU(organizationId);
    return this.prisma.product.create({
      data: {
        sku,
        name: dto.name,
        categoryId: dto.categoryId,
        description: dto.description,
        sellPrice: dto.basePrice,
        costPrice: dto.costPrice ?? 0,
        minStock: dto.minStock ?? 0,
        isActive: dto.isActive ?? true,
        organizationId,
      },
      include: { category: true },
    });
  }

  async findAll(
    page: number,
    limit: number,
    organizationId: string,
    filters?: QueryProductsDto,
  ) {
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      organizationId,
      deletedAt: null,  // ⚠️ CRITICAL: Soft delete filter
    };

    // Task 2: Filters
    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
      where.sellPrice = {};
      if (filters.minPrice !== undefined) {
        where.sellPrice.gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        where.sellPrice.lte = filters.maxPrice;
      }
    }

    if (filters?.inStock === true) {
      where.stock = { gt: 0 };
    }

    // Task 3: Search
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Task 4: Sorting
    const orderBy: any = {};
    const sortBy = filters?.sortBy || 'createdAt';
    const sortOrder = filters?.sortOrder || 'desc';

    orderBy[sortBy] = sortOrder;

    // Execute queries
    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: true,
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async findOne(id: string, organizationId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        category: true,
        variants: {
          where: { deletedAt: null },
        },
      },
    });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async update(id: string, dto: UpdateProductDto, organizationId: string) {
    await this.findOne(id, organizationId);
    const updateData: any = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.basePrice !== undefined) updateData.sellPrice = dto.basePrice;
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
    const product = await this.prisma.product.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { variants: true },
    });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    if (product.variants.length > 0) {
      throw new ConflictException('Cannot delete product with existing variants');
    }
    await this.prisma.product.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Product deleted successfully' };
  }

  async createVariant(productId: string, dto: CreateVariantDto, organizationId: string) {
    const product = await this.findOne(productId, organizationId);
    const sku = await this.generateVariantSKU(product.sku, organizationId);
    return this.prisma.productVariant.create({
      data: {
        sku,
        productId,
        organizationId,
        name: dto.name,
        sellPrice: dto.price,
        stock: dto.inStock ?? 0,
        isActive: dto.isActive ?? true,
        attributes: (dto.attributes ?? undefined) as Prisma.InputJsonValue | undefined,
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
    });
    if (!variant) throw new NotFoundException(`Variant ${id} not found`);
    const updateData: any = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.price !== undefined) updateData.sellPrice = dto.price;
    if (dto.inStock !== undefined) updateData.stock = dto.inStock;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.attributes !== undefined) {
      updateData.attributes = dto.attributes as Prisma.InputJsonValue;
    }
    return this.prisma.productVariant.update({ where: { id }, data: updateData });
  }

  async removeVariant(id: string, organizationId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!variant) throw new NotFoundException(`Variant ${id} not found`);
    await this.prisma.productVariant.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { message: 'Variant deleted successfully' };
  }
}
