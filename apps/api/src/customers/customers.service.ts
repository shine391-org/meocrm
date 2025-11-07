import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  private async generateCustomerCode(organizationId: string): Promise<string> {
    const lastCustomer = await this.prisma.customer.findFirst({
      where: {
        organizationId,
        deletedAt: null,
      },
      orderBy: {
        code: 'desc',
      },
      select: {
        code: true,
      },
    });

    if (!lastCustomer) {
      return 'KH000001';
    }

    const lastNumber = parseInt(lastCustomer.code.substring(2));
    const nextNumber = lastNumber + 1;

    return `KH${nextNumber.toString().padStart(6, '0')}`;
  }

  async create(organizationId: string, createCustomerDto: CreateCustomerDto) {
    const existingCustomer = await this.prisma.customer.findFirst({
      where: {
        phone: createCustomerDto.phone,
        organizationId,
        deletedAt: null,
      },
    });

    if (existingCustomer) {
      throw new ConflictException('A customer with this phone number already exists.');
    }

    const customerCode = await this.generateCustomerCode(organizationId);

    const customer = await this.prisma.customer.create({
      data: {
        ...createCustomerDto,
        code: customerCode,
        organizationId,
      },
    });

    return customer;
  }

  async findAll(
    organizationId: string,
    page: number,
    limit: number,
    search?: string,
    sortBy: string = 'name',
    sortOrder: 'asc' | 'desc' = 'asc',
    segment?: string
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

    const [data, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      this.prisma.customer.count({ where }),
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
    const customer = await this.prisma.customer.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found.');
    }

    return customer;
  }

  async update(
    organizationId: string,
    id: string,
    updateCustomerDto: UpdateCustomerDto
  ) {
    const immutableFields = ['code', 'totalSpent', 'totalOrders', 'debt', 'createdAt'];
    for (const field of immutableFields) {
      if (updateCustomerDto[field]) {
        throw new BadRequestException(`The field '${field}' cannot be updated.`);
      }
    }

    const customer = await this.findOne(organizationId, id);

    if (updateCustomerDto.phone && updateCustomerDto.phone !== customer.phone) {
      const existingCustomer = await this.prisma.customer.findFirst({
        where: {
          phone: updateCustomerDto.phone,
          organizationId,
          deletedAt: null,
        },
      });

      if (existingCustomer) {
        throw new ConflictException('A customer with this phone number already exists.');
      }
    }

    return this.prisma.customer.update({
      where: {
        id,
      },
      data: updateCustomerDto,
    });
  }

  async remove(organizationId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { orders: true },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (customer.orders && customer.orders.length > 0) {
      throw new BadRequestException('Cannot delete a customer with existing orders.');
    }

    await this.prisma.customer.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return { message: 'Customer deleted successfully' };
  }
}
