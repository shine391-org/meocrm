import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCategoryDto, organizationId: string) {
    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parentId, organizationId },
      });
      if (!parent) {
        throw new BadRequestException('Parent category not found');
      }
    }

    const createData: any = {
      name: dto.name,
      organizationId,
    };

    if (dto.parentId) {
      createData.parent = { connect: { id: dto.parentId } };
    }

    return this.prisma.category.create({
      data: createData,
      include: { parent: true, children: true },
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.category.findMany({
      where: { organizationId },
      include: {
        parent: true,
        children: true,
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findTree(organizationId: string) {
    return this.prisma.category.findMany({
      where: { organizationId, parentId: null },
      include: {
        children: { include: { children: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, organizationId },
      include: {
        parent: true,
        children: true,
        products: {
          take: 10,
          select: { id: true, sku: true, name: true, sellPrice: true, stock: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto, organizationId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, organizationId },
    });

    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }

    if (dto.parentId === id) {
      throw new BadRequestException('Category cannot be its own parent');
    }

    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parentId, organizationId },
      });
      if (!parent) {
        throw new BadRequestException('Parent category not found');
      }
    }

    const updateData: any = { name: dto.name };

    if (dto.parentId !== undefined) {
      updateData.parent = dto.parentId
        ? { connect: { id: dto.parentId } }
        : { disconnect: true };
    }

    return this.prisma.category.update({
      where: { id },
      data: updateData,
      include: { parent: true, children: true },
    });
  }

  async remove(id: string, organizationId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, organizationId },
      include: { children: true, products: true },
    });

    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }
    if (category.children.length > 0) {
      throw new BadRequestException('Cannot delete category with sub-categories');
    }
    if (category.products.length > 0) {
      throw new BadRequestException('Cannot delete category with products');
    }

    await this.prisma.category.delete({ where: { id } });
    return { message: 'Category deleted successfully' };
  }
}
