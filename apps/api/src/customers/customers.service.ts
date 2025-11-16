import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Prisma } from '@prisma/client';
import { CustomerSegmentationService } from './services/customer-segmentation.service';

const CUSTOMER_SORTABLE_FIELDS: Array<keyof Prisma.CustomerOrderByWithRelationInput> = [
  'createdAt',
  'name',
  'code',
  'totalSpent',
  'totalOrders',
  'debt',
];

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly segmentationService: CustomerSegmentationService,
  ) {}

  async create(dto: CreateCustomerDto, organizationId: string, userId: string) {
    const code = await this.generateCode(organizationId);

    const existingPhone = await this.prisma.customer.findFirst({
      where: {
        organizationId,
        phone: dto.phone,
        deletedAt: null,
      },
    });

    if (existingPhone) {
      throw new ConflictException('Phone number already exists for this organization');
    }

    const { birthday, ...rest } = dto;

    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          ...rest,
          code,
          organization: {
            connect: { id: organizationId },
          },
          birthday: birthday ? new Date(birthday) : undefined,
          creator: {
            connect: { id: userId },
          },
        },
        include: {
          group: true,
          creator: { select: { id: true, name: true, email: true } },
        },
      });

      const segment = await this.segmentationService.updateSegment(customer.id, organizationId, tx);

      return segment ? { ...customer, segment } : customer;
    });
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
    organizationId: string,
    search?: string,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
    segment?: string,
  ) {
    const where: Prisma.CustomerWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (segment) {
      where.segment = segment;
    }

    const skip = (page - 1) * limit;

    const normalizedOrder = sortOrder === 'asc' ? 'asc' : 'desc';
    const sortField = CUSTOMER_SORTABLE_FIELDS.includes(sortBy as any) ? (sortBy as keyof Prisma.CustomerOrderByWithRelationInput) : 'createdAt';
    const orderBy = { [sortField]: normalizedOrder } as Prisma.CustomerOrderByWithRelationInput;

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, organizationId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { 
        id, 
        organizationId, 
        deletedAt: null 
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }

    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto, organizationId: string) {
    const customer = await this.findOne(id, organizationId);

    if (dto.phone && dto.phone !== customer.phone) {
      const existingPhone = await this.prisma.customer.findFirst({
        where: {
          organizationId,
          phone: dto.phone,
          deletedAt: null,
          id: { not: id },
        },
      });

      if (existingPhone) {
        throw new ConflictException('Phone number already exists for another customer');
      }
    }

    const { birthday, ...rest } = dto;

    await this.prisma.customer.updateMany({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
      data: {
        ...rest,
        birthday: birthday ? new Date(birthday) : undefined,
      },
    });

    return this.findOne(id, organizationId);
  }

  async remove(id: string, organizationId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { 
        id, 
        organizationId, 
        deletedAt: null 
      },
      include: { 
        orders: {
          select: { id: true },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }

    if (customer.orders && customer.orders.length > 0) {
      throw new BadRequestException(
        `Cannot delete customer with existing orders. Customer has ${customer.orders.length} order(s) in history.`
      );
    }

    const result = await this.prisma.customer.updateMany({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });

    if (result.count === 0) {
      throw new NotFoundException(`Customer ${id} not found`);
    }

    return { message: 'Customer deleted successfully' };
  }

  private async generateCode(organizationId: string): Promise<string> {
    const lastCustomer = await this.prisma.customer.findFirst({
      where: { 
        organizationId,
        deletedAt: null,
      },
      orderBy: { code: 'desc' },
      select: { code: true },
    });

    if (!lastCustomer) {
      return 'KH000001';
    }

    const codeNumber = lastCustomer.code.substring(2);
    const lastNumber = parseInt(codeNumber, 10);
    
    if (isNaN(lastNumber)) {
      throw new Error(`Invalid customer code format: ${lastCustomer.code}`);
    }

    const nextNumber = lastNumber + 1;
    return `KH${nextNumber.toString().padStart(6, '0')}`;
  }
}
