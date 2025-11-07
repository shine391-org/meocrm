import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { ListSuppliersDto } from './dto/list-suppliers.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SuppliersService {
constructor(private prisma: PrismaService) {}

async create(organizationId: string, dto: CreateSupplierDto) {
// Generate unique code
const code = await this.generateCode(organizationId);

// Check duplicate phone
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

// Check duplicate taxCode (if provided)
if (dto.taxCode) {
  const existing = await this.prisma.supplier.findFirst({
    where: {
      organizationId,
      taxCode: dto.taxCode,
      deletedAt: null,
    },
  });

  if (existing) {
    throw new BadRequestException('Tax code already exists for this organization');
  }
}

return this.prisma.supplier.create({
  data: {
    ...dto,
    code,
    organizationId,
  },
});
}

async findAll(organizationId: string, query: ListSuppliersDto) {
const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;

const where: Prisma.SupplierWhereInput = {
  organizationId,
  deletedAt: null,
};

// Search logic
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
  pagination: {
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

return supplier;
}

async update(organizationId: string, id: string, dto: UpdateSupplierDto) {
const supplier = await this.findOne(organizationId, id);

// Check duplicate phone if updating
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


// Check duplicate taxCode if updating
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

return this.prisma.supplier.update({
  where: { id },
  data: dto,
});
}

async remove(organizationId: string, id: string) {
const supplier = await this.prisma.supplier.findFirst({
where: { id, organizationId, deletedAt: null },
});

if (!supplier) {
  throw new NotFoundException('Supplier not found');
}

// TODO: Uncomment this when PurchaseOrder model is available
// const purchaseOrderCount = await this.prisma.purchaseOrder.count({
//   where: { supplierId: id },
// });
//
// if (purchaseOrderCount > 0) {
//   throw new BadRequestException(
//     'Cannot delete supplier with existing purchase orders',
//   );
// }

return this.prisma.supplier.update({
  where: { id },
  data: { deletedAt: new Date() },
});
}

private async generateCode(organizationId: string): Promise<string> {
const lastSupplier = await this.prisma.supplier.findFirst({
where: { organizationId }, // Should check all suppliers, even deleted ones, to avoid code reuse
orderBy: { code: 'desc' },
select: { code: true },
});

if (!lastSupplier) {
  return 'DT000001';
}

const lastNumber = parseInt(lastSupplier.code.substring(2));
const nextNumber = lastNumber + 1;
return `DT${nextNumber.toString().padStart(6, '0')}`;
}
}
