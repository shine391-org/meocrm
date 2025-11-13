import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateProductDto, organizationId: string) {
    const existing = await this.prisma.product.findFirst({
      where: { sku: createDto.sku, organizationId, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`SKU "${createDto.sku}" already exists`);
    }

    const { variants, categoryId, ...productData } = createDto;

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          ...productData,
          costPrice: productData.costPrice ?? 0,
          minStock: productData.minStock ?? 0,
          isActive: productData.isActive ?? true,
          organization: {
            connect: {
              id: organizationId,
            },
          },
          ...(categoryId && {
            category: {
              connect: {
                id: categoryId,
              },
            },
          }),
        },
      });

      if (variants && variants.length > 0) {
        for (const variantDto of variants) {
          const variantSku =
            variantDto.sku || `${product.sku}-${variantDto.name}`;

          const existingVariant = await tx.productVariant.findFirst({
            where: { sku: variantSku, organizationId },
          });
          if (existingVariant) {
            throw new ConflictException(
              `Variant SKU "${variantSku}" already exists`
            );
          }

          await tx.productVariant.create({
            data: {
              ...variantDto,
              sku: variantSku,
              productId: product.id,
              organizationId,
            },
          });
        }
      }

      return tx.product.findUnique({
        where: { id: product.id },
        include: { variants: true, category: true },
      });
    });
  }

  async findAll(
    page: number,
    limit: number,
    organizationId: string,
    filters?: QueryProductsDto
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
      deletedAt: null,
    };

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

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    const sortBy = filters?.sortBy || 'createdAt';
    const sortOrder = filters?.sortOrder || 'desc';

    orderBy[sortBy] = sortOrder;

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: true,
          variants: true,
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
        variants: true,
      },
    });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async update(id: string, updateDto: UpdateProductDto, organizationId: string) {
    await this.findOne(id, organizationId);

    const { variants, categoryId, ...productData } = updateDto;

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id },
        data: {
          ...productData,
          ...(categoryId && {
            category: {
              connect: {
                id: categoryId,
              },
            },
          }),
        },
      });

      if (variants) {
        await tx.productVariant.deleteMany({
          where: { productId: id, organizationId },
        });

        for (const variantDto of variants) {
          const variantSku =
            variantDto.sku || `${product.sku}-${variantDto.name}`;

          const existingVariant = await tx.productVariant.findFirst({
            where: { sku: variantSku, organizationId },
          });
          if (existingVariant) {
            throw new ConflictException(
              `Variant SKU "${variantSku}" already exists`
            );
          }

          await tx.productVariant.create({
            data: {
              ...variantDto,
              sku: variantSku,
              productId: product.id,
              organizationId,
            },
          });
        }
      }

      return tx.product.findUnique({
        where: { id: product.id },
        include: { variants: true, category: true },
      });
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
}
