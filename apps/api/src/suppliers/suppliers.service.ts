import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySuppliersDto } from './dto/query-suppliers.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateSupplierDto) {
    const code = await this.generateCode(organizationId);

    const existingPhone = await this.prisma.supplier.findFirst({
      where: {
        organizationId,
        phone: dto.phone,
        deletedAt: null,
      },
    });

    if (existingPhone) {
      throw new BadRequestException('Phone number already exists for this organization');
    }

    if (dto.taxCode) {
      const existingTax = await this.prisma.supplier.findFirst({
        where: {
          organizationId,
          taxCode: dto.taxCode,
          deletedAt: null,
        },
      });

      if (existingTax) {
        throw new BadRequestException('Tax code already exists for this organization');
      }
    }

    const supplier = await this.prisma.supplier.create({
      data: {
        ...dto,
        code,
        organizationId,
      },
    });

    return { data: supplier };
  }

  async findAll(organizationId: string, query: QuerySuppliersDto) {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.SupplierWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { taxCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(organizationId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return { data: supplier };
  }

  async update(organizationId: string, id: string, dto: UpdateSupplierDto) {
    const { data: supplier } = await this.findOne(organizationId, id);

    if (dto.phone && dto.phone !== supplier.phone) {
      const existing = await this.prisma.supplier.findFirst({
        where: {
          organizationId,
          phone: dto.phone,
          deletedAt: null,
          id: { not: id },
        },
      });

      if (existing) {
        throw new BadRequestException('Phone number already exists for another supplier');
      }
    }

    if (dto.taxCode && dto.taxCode !== supplier.taxCode) {
      const existing = await this.prisma.supplier.findFirst({
        where: {
          organizationId,
          taxCode: dto.taxCode,
          deletedAt: null,
          id: { not: id },
        },
      });

      if (existing) {
        throw new BadRequestException('Tax code already exists for another supplier');
      }
    }

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: dto,
    });

    return { data: updated };
  }

  async remove(organizationId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    const purchaseOrderCount = await this.prisma.purchaseOrder.count({
      where: { supplierId: id, organizationId },
    });

    if (purchaseOrderCount > 0) {
      throw new BadRequestException('Cannot delete supplier with existing purchase orders');
    }

    const deleted = await this.prisma.supplier.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { data: deleted };
  }

  async recordPurchase(
    organizationId: string,
    supplierId: string,
    totalAmount: number,
    paidAmount: number,
  ) {
    if (totalAmount < 0 || paidAmount < 0) {
      throw new BadRequestException('Amounts must be zero or positive');
    }

    if (paidAmount > totalAmount) {
      throw new BadRequestException('Paid amount cannot exceed total');
    }

    const debtDelta = totalAmount - paidAmount;

    const result = await this.prisma.supplier.updateMany({
      where: { id: supplierId, organizationId, deletedAt: null },
      data: {
        totalPurchases: { increment: totalAmount },
        totalPaid: { increment: paidAmount },
        ...(debtDelta !== 0 && { debt: { increment: debtDelta } }),
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Supplier not found for stats update');
    }

    return result.count;
  }

  private async generateCode(organizationId: string): Promise<string> {
    const lastSupplier = await this.prisma.supplier.findFirst({
      where: {
        organizationId,
        deletedAt: null,
      },
      orderBy: { code: 'desc' },
      select: { code: true },
    });

    if (!lastSupplier) {
      return 'DT000001';
    }

    const parsed = parseInt(lastSupplier.code.substring(2), 10);
    const nextNumber = Number.isNaN(parsed) ? 1 : parsed + 1;
    return `DT${nextNumber.toString().padStart(6, '0')}`;
  }
}
