import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class UsersService {
  private static readonly MAX_PAGE_LIMIT = 100;

  constructor(private readonly prisma: PrismaService) {}

  private sanitize<T extends { password?: string }>(user: T) {
    const { password, ...rest } = user;
    return rest;
  }

  private async ensureEmailAvailable(email: string, excludeUserId?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing && existing.id !== excludeUserId) {
      throw new ConflictException('Email already in use');
    }
  }

  async create(dto: CreateUserDto, organizationId: string) {
    await this.ensureEmailAvailable(dto.email);
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        role: dto.role ?? 'STAFF',
        organizationId,
      },
    });

    return this.sanitize(user);
  }

  async findAll(organizationId: string, query: ListUsersDto) {
    const page = query.page ?? 1;
    const requestedLimit = query.limit ?? 20;
    if (page < 1 || requestedLimit < 1) {
      throw new BadRequestException('Pagination params must be positive integers');
    }
    const limit = Math.min(requestedLimit, UsersService.MAX_PAGE_LIMIT);
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = { organizationId };

    if (query.role) {
      where.role = query.role;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((user) => this.sanitize(user)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitize(user);
  }

  async update(id: string, dto: UpdateUserDto, organizationId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const data: Prisma.UserUpdateManyMutationInput = {};

    if (dto.email && dto.email !== user.email) {
      await this.ensureEmailAvailable(dto.email, id);
      data.email = dto.email;
    }

    if (dto.name) {
      data.name = dto.name;
    }

    if (dto.role) {
      data.role = dto.role;
    }

    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    if (Object.keys(data).length === 0) {
      return this.sanitize(user);
    }

    const { count } = await this.prisma.user.updateMany({
      where: { id, organizationId },
      data,
    });

    if (count === 0) {
      throw new NotFoundException('User not found');
    }

    return this.findOne(id, organizationId);
  }

  async remove(id: string, organizationId: string, requesterId: string) {
    if (id === requesterId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    const { count } = await this.prisma.user.deleteMany({
      where: { id, organizationId },
    });

    if (count === 0) {
      throw new NotFoundException('User not found');
    }

    return { message: 'User removed' };
  }
}
