import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { Prisma } from '@prisma/client';

type PrismaTx = Prisma.TransactionClient;

@Injectable()
export class VariantsService {
  constructor(private readonly prisma: PrismaService) {}

  private assertVariantPrice(basePrice: Prisma.Decimal | number, additionalPrice: number) {
    const price = Number(basePrice ?? 0) + Number(additionalPrice ?? 0);
    if (price <= 0) {
      throw new BadRequestException('Variant price must be greater than zero');
    }
    return price;
  }

  private normalizeVariantSku(productSku: string, variant: CreateVariantDto) {
    const rawSku = (variant.sku ?? `${productSku}-${variant.name}`).trim();
    if (!rawSku) {
      throw new BadRequestException('Variant SKU cannot be empty');
    }
    return rawSku;
  }

  private async verifyProductOwnership(productId: string, organizationId: string, tx?: PrismaTx) {
    const client = tx ?? this.prisma;
    const product = await client.product.findFirst({
      where: { id: productId, organizationId, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async create(productId: string, createDto: CreateVariantDto, organizationId: string) {
    const product = await this.verifyProductOwnership(productId, organizationId);
    const basePrice = Number(product.sellPrice);
    const sku = this.normalizeVariantSku(product.sku, createDto);
    const additionalPrice = createDto.additionalPrice ?? 0;
    this.assertVariantPrice(basePrice, additionalPrice);

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
        additionalPrice,
        stock: createDto.stock ?? 0,
        images: createDto.images ?? [],
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
    organizationId: string,
  ) {
    const product = await this.verifyProductOwnership(productId, organizationId);
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId, organizationId },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    const existingAdditional = variant.additionalPrice ? Number(variant.additionalPrice) : 0;
    const nextAdditionalPrice = updateDto.additionalPrice ?? existingAdditional;
    this.assertVariantPrice(Number(product.sellPrice), nextAdditionalPrice);

    const { count } = await this.prisma.productVariant.updateMany({
      where: { id: variantId, organizationId },
      data: {
        ...updateDto,
        additionalPrice: nextAdditionalPrice,
      },
    });

    if (count === 0) {
      throw new NotFoundException('Variant not found');
    }

    return this.prisma.productVariant.findFirst({ where: { id: variantId, organizationId } });
  }

  async remove(productId: string, variantId: string, organizationId: string) {
    await this.verifyProductOwnership(productId, organizationId);
    const { count } = await this.prisma.productVariant.deleteMany({
      where: { id: variantId, productId, organizationId },
    });

    if (count === 0) {
      throw new NotFoundException('Variant not found');
    }
  }
}
