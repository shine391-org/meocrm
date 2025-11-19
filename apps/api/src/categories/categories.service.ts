import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

    const createData: Prisma.CategoryUncheckedCreateInput = {
      name: dto.name,
      organizationId,
    };

    if (dto.parentId) {
      createData.parentId = dto.parentId;
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
      where: { id, organizationId, deletedAt: null },
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

    const updateData: Prisma.CategoryUncheckedUpdateInput = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }

    if (dto.parentId !== undefined) {
      updateData.parentId = dto.parentId ?? null;
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
      include: {
        children: { where: { deletedAt: null } },
        products: { where: { deletedAt: null } }
      },
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
    let level = 1;
    let currentId: string | null = categoryId;
    const visited = new Set<string>();
    const MAX_DEPTH = 10; // Prevent infinite loops on corrupted data

    // Iteratively traverse up the hierarchy with individual queries
    // More efficient than eager loading entire parent chain
    while (currentId) {
      // Cycle detection: check if we've seen this ID before
      if (visited.has(currentId)) {
        throw new Error(`Category hierarchy cycle detected at category ${currentId}`);
      }
      visited.add(currentId);

      // Depth limit check
      if (level > MAX_DEPTH) {
        throw new Error(`Category hierarchy depth exceeds maximum allowed depth of ${MAX_DEPTH}`);
      }

      const category = await this.prisma.category.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });

      if (!category) {
        return 0;
      }

      if (category.parentId) {
        level++;
        currentId = category.parentId;
      } else {
        currentId = null;
      }
    }

    return level;
  }

  private async isDescendant(categoryId: string, potentialDescendantId: string): Promise<boolean> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        children: {
          where: { deletedAt: null },
          include: {
            children: {
              where: { deletedAt: null },
              include: {
                children: {
                  where: { deletedAt: null },
                },
              },
            },
          },
        },
      },
    });

    if (!category) {
      return false;
    }

    const check = (cat: any): boolean => {
      if (cat.id === potentialDescendantId) {
        return true;
      }
      if (cat.children) {
        for (const child of cat.children) {
          if (check(child)) {
            return true;
          }
        }
      }
      return false;
    };

    return check(category);
  }
}
