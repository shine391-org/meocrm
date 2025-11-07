import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async generateCustomerCode(organizationId: string): Promise<string> {
    // Get last customer to generate next code
    const lastCustomer = await this.prisma.customer.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: { code: true },
    });

    if (!lastCustomer) {
      return 'CUS001';
    }

    // Extract number from code (CUS001 -> 1)
    const lastNumber = parseInt(lastCustomer.code.replace('CUS', ''));
    const nextNumber = lastNumber + 1;
    
    // Format with leading zeros (CUS002, CUS010, etc.)
    return `CUS${nextNumber.toString().padStart(3, '0')}`;
  }

  async create(dto: CreateCustomerDto, organizationId: string) {
    // Check phone uniqueness
    const existingPhone = await this.prisma.customer.findFirst({
      where: { phone: dto.phone, organizationId },
    });

    if (existingPhone) {
      throw new ConflictException('Customer with this phone already exists');
    }

    // Check email uniqueness if provided
    if (dto.email) {
      const existingEmail = await this.prisma.customer.findFirst({
        where: { email: dto.email, organizationId },
      });

      if (existingEmail) {
        throw new ConflictException('Customer with this email already exists');
      }
    }

    // Generate customer code
    const code = await this.generateCustomerCode(organizationId);

    return this.prisma.customer.create({
      data: {
        code,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        province: dto.province,
        district: dto.district,
        ward: dto.ward,
        segment: dto.segment,
        organizationId,
        totalSpent: 0,
        totalOrders: 0,
        debt: 0,
      },
    });
  }

  async findAll(page: number, limit: number, organizationId: string) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.customer.count({
        where: { organizationId },
      }),
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
      where: { id, organizationId },
      include: {
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            code: true,
            total: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }

    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto, organizationId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, organizationId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }

    // Check phone uniqueness if changing
    if (dto.phone && dto.phone !== customer.phone) {
      const existing = await this.prisma.customer.findFirst({
        where: { phone: dto.phone, organizationId, id: { not: id } },
      });

      if (existing) {
        throw new ConflictException('Customer with this phone already exists');
      }
    }

    // Check email uniqueness if changing
    if (dto.email && dto.email !== customer.email) {
      const existing = await this.prisma.customer.findFirst({
        where: { email: dto.email, organizationId, id: { not: id } },
      });

      if (existing) {
        throw new ConflictException('Customer with this email already exists');
      }
    }

    return this.prisma.customer.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, organizationId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, organizationId },
      include: { orders: true },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }

    if (customer.orders.length > 0) {
      throw new ConflictException('Cannot delete customer with existing orders');
    }

    await this.prisma.customer.delete({ where: { id } });
    return { message: 'Customer deleted successfully' };
  }

  async search(query: string, organizationId: string) {
    return this.prisma.customer.findMany({
      where: {
        organizationId,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
          { email: { contains: query, mode: 'insensitive' } },
          { code: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 20,
      orderBy: { name: 'asc' },
    });
  }
}
