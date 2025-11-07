import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductDto, organizationId: string) {
    const existing = await this.prisma.product.findFirst({
      where: { sku: dto.sku, organizationId, deletedAt: null },
    });
    if (existing) throw new ConflictException('SKU already exists');

    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, organizationId },
      });
      if (!category) throw new BadRequestException('Category not found');
    }

    const createData: any = {
      sku: dto.sku,
      name: dto.name,
      description: dto.description,
      costPrice: dto.costPrice,
      sellPrice: dto.sellPrice,
      stock: dto.stock ?? 0,
      minStock: dto.minStock ?? 0,
      maxStock: dto.maxStock ?? 999999,
      images: dto.images ?? [],
      weight: dto.weight,
      isActive: dto.isActive ?? true,
      organizationId,
    };

    if (dto.categoryId) {
      createData.category = { connect: { id: dto.categoryId } };
    }

    return this.prisma.product.create({
      data: createData,
      include: { category: true, variants: true },
    });
  }

  async findAll(page: number, limit: number, organizationId: string) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { organizationId, deletedAt: null },
        include: {
          category: true,
          variants: true,
          _count: { select: { variants: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({
        where: { organizationId, deletedAt: null },
      }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, organizationId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { category: true, variants: true },
    });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async update(id: string, dto: UpdateProductDto, organizationId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!product) throw new NotFoundException(`Product ${id} not found`);

    if (dto.sku && dto.sku !== product.sku) {
      const existing = await this.prisma.product.findFirst({
        where: { sku: dto.sku, organizationId, deletedAt: null, id: { not: id } },
      });
      if (existing) throw new ConflictException('SKU already exists');
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, organizationId },
      });
      if (!category) throw new BadRequestException('Category not found');
    }

    const updateData: any = { ...dto };
    if (dto.categoryId) {
      delete updateData.categoryId;
      updateData.category = { connect: { id: dto.categoryId } };
    }

    return this.prisma.product.update({
      where: { id },
      data: updateData,
      include: { category: true, variants: true },
    });
  }

  async remove(id: string, organizationId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!product) throw new NotFoundException(`Product ${id} not found`);

    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Product deleted successfully' };
  }

  async createVariant(productId: string, dto: CreateVariantDto, organizationId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, organizationId, deletedAt: null },
    });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const existing = await this.prisma.productVariant.findFirst({
      where: { sku: dto.sku, organizationId },
    });
    if (existing) throw new ConflictException('Variant SKU already exists');

    return this.prisma.productVariant.create({
      data: {
        product: { connect: { id: productId } },
        organization: { connect: { id: organizationId } },
        sku: dto.sku,
        name: dto.name,
        sellPrice: dto.sellPrice,
        stock: dto.stock ?? 0,
        images: dto.images ?? [],
      },
    });
  }

  async findVariants(productId: string, organizationId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, organizationId, deletedAt: null },
    });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    return this.prisma.productVariant.findMany({
      where: { productId, organizationId },
      orderBy: { name: 'asc' },
    });
  }

  async updateVariant(variantId: string, dto: UpdateVariantDto, organizationId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, organizationId },
    });
    if (!variant) throw new NotFoundException(`Variant ${variantId} not found`);

    if (dto.sku && dto.sku !== variant.sku) {
      const existing = await this.prisma.productVariant.findFirst({
        where: { sku: dto.sku, organizationId, id: { not: variantId } },
      });
      if (existing) throw new ConflictException('Variant SKU already exists');
    }

    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: dto,
    });
  }

  async removeVariant(variantId: string, organizationId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, organizationId },
    });
    if (!variant) throw new NotFoundException(`Variant ${variantId} not found`);

    await this.prisma.productVariant.delete({ where: { id: variantId } });
    return { message: 'Variant deleted successfully' };
  }
}
