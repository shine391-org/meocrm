import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

@Injectable()
export class VariantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    productId: string,
    createDto: CreateVariantDto,
    organizationId: string
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, organizationId, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const sku = createDto.sku || `${product.sku}-${createDto.name}`;

    const existing = await this.prisma.productVariant.findFirst({
      where: { sku, organizationId },
    });
    if (existing) {
      throw new ConflictException(`Variant SKU "${sku}" already exists`);
    }

    return this.prisma.productVariant.create({
      data: {
        ...createDto,
        sku,
        productId,
        organizationId,
      },
      include: { product: true },
    });
  }

  async findAll(productId: string, organizationId: string) {
    await this.verifyProductOwnership(productId, organizationId);

    return this.prisma.productVariant.findMany({
      where: { productId, organizationId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(productId: string, variantId: string, organizationId: string) {
    await this.verifyProductOwnership(productId, organizationId);
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId, organizationId },
    });
    if (!variant) {
      throw new NotFoundException('Variant not found');
    }
    return variant;
  }

  async update(
    productId: string,
    variantId: string,
    updateDto: UpdateVariantDto,
    organizationId: string
  ) {
    await this.verifyProductOwnership(productId, organizationId);

    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId, organizationId },
    });
    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: updateDto,
    });
  }

  async remove(
    productId: string,
    variantId: string,
    organizationId: string
  ) {
    await this.verifyProductOwnership(productId, organizationId);

    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId, organizationId },
    });
    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    await this.prisma.productVariant.delete({
      where: { id: variantId },
    });
  }

  private async verifyProductOwnership(
    productId: string,
    organizationId: string
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, organizationId, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
  }
}
