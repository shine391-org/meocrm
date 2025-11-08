import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
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
      where: { organizationId, sku: { startsWith: prefix } },
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

  async findAll(page: number, limit: number, organizationId: string, categoryId?: string) {
    const skip = (page - 1) * limit;
    const where: any = { organizationId, deletedAt: null };
    if (categoryId) where.categoryId = categoryId;
    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { category: true, variants: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
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
    await this.findOne(id, organizationId);
    const updateData: any = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.basePrice) updateData.sellPrice = dto.basePrice;
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
        name: dto.name,
        sellPrice: dto.price,
        stock: dto.inStock ?? 0,
        organizationId,
      },
    });
  }

  async findVariants(productId: string, organizationId: string) {
    await this.findOne(productId, organizationId);
    return this.prisma.productVariant.findMany({
      where: { productId, organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateVariant(id: string, dto: UpdateVariantDto, organizationId: string) {
    const variant = await this.prisma.productVariant.findFirst({ where: { id, organizationId } });
    if (!variant) throw new NotFoundException(`Variant ${id} not found`);
    const updateData: any = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.price) updateData.sellPrice = dto.price;
    if (dto.inStock !== undefined) updateData.stock = dto.inStock;
    return this.prisma.productVariant.update({ where: { id }, data: updateData });
  }

  async removeVariant(id: string, organizationId: string) {
    const variant = await this.prisma.productVariant.findFirst({ where: { id, organizationId } });
    if (!variant) throw new NotFoundException(`Variant ${id} not found`);
    await this.prisma.productVariant.delete({ where: { id } });
    return { message: 'Variant deleted successfully' };
  }
}
