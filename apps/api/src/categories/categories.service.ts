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
        where: { id: dto.parentId, organizationId, deletedAt: null },
      });
      if (!parent) {
        throw new BadRequestException('Parent category not found');
      }
      const parentLevel = await this.getCategoryLevel(dto.parentId);
      if (parentLevel >= 3) {
        throw new BadRequestException('Maximum 3 levels allowed');
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
      where: { organizationId, deletedAt: null },
      include: {
        parent: true,
        children: { where: { deletedAt: null } },
        _count: { select: { products: { where: { deletedAt: null } } } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findTree(organizationId: string) {
    return this.prisma.category.findMany({
      where: { organizationId, parentId: null, deletedAt: null },
      include: {
        _count: {
          select: { products: { where: { deletedAt: null } } },
        },
        children: {
          where: { deletedAt: null },
          include: {
            _count: {
              select: { products: { where: { deletedAt: null } } },
            },
            children: {
              where: { deletedAt: null },
              include: {
                _count: {
                  select: { products: { where: { deletedAt: null } } },
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        parent: true,
        children: { where: { deletedAt: null } },
        products: {
          where: { deletedAt: null },
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
        where: { id: dto.parentId, organizationId, deletedAt: null },
      });
      if (!parent) {
        throw new BadRequestException('Parent category not found');
      }
      const parentLevel = await this.getCategoryLevel(dto.parentId);
      if (parentLevel >= 3) {
        throw new BadRequestException('Maximum 3 levels allowed');
      }
      const isDescendant = await this.isDescendant(id, dto.parentId);
      if (isDescendant) {
        throw new BadRequestException('Cannot move category under its own descendant');
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
      where: { id, organizationId, deletedAt: null },
      include: { children: { where: { deletedAt: null } }, products: { where: { deletedAt: null } } },
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

    await this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Category deleted successfully' };
  }

  private async getCategoryLevel(categoryId: string): Promise<number> {
    let level = 0;
    let currentId = categoryId;

    while (currentId) {
      const category = await this.prisma.category.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });

      if (!category) {
        break;
      }

      level++;
      currentId = category.parentId;
    }

    return level;
  }

  private async isDescendant(categoryId: string, potentialDescendantId: string): Promise<boolean> {
    const category = await this.prisma.category.findUnique({
      where: { id: potentialDescendantId },
      include: { children: true },
    });

    if (!category) {
      return false;
    }

    if (category.id === categoryId) {
      return true;
    }

    for (const child of category.children) {
      if (await this.isDescendant(categoryId, child.id)) {
        return true;
      }
    }

    return false;
  }
}
