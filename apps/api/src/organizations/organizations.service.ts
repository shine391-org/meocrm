import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeSlug(rawSlug: string): string {
    const normalized = rawSlug
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!normalized) {
      throw new BadRequestException('Slug không hợp lệ, vui lòng dùng ký tự chữ hoặc số');
    }

    return normalized;
  }

  private normalizeCode(rawCode: string): string {
    const normalized = rawCode
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (normalized.length < 3) {
      throw new BadRequestException('Code phải có ít nhất 3 ký tự in hoa hoặc số');
    }

    return normalized;
  }

  private handlePrismaUnique(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = (error.meta?.target as string[]) ?? [];
      if (target.includes('slug')) {
        throw new ConflictException('Slug đã tồn tại, vui lòng chọn slug khác');
      }
      if (target.includes('code')) {
        throw new ConflictException('Code đã tồn tại, vui lòng chọn code khác');
      }
      throw new ConflictException('Giá trị đã tồn tại, vui lòng kiểm tra lại');
    }
    throw error;
  }

  async create(dto: CreateOrganizationDto) {
    const slug = this.normalizeSlug(dto.slug);
     const code = this.normalizeCode(dto.code);
    try {
      return await this.prisma.organization.create({
        data: {
          name: dto.name,
          slug,
          code,
        },
      });
    } catch (error) {
      this.handlePrismaUnique(error);
    }
  }

  async findById(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async findBySlug(slug: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { slug },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async update(organizationId: string, dto: UpdateOrganizationDto) {
    const data: Record<string, any> = {};

    if (dto.name) {
      data.name = dto.name;
    }

    if (dto.slug) {
      data.slug = this.normalizeSlug(dto.slug);
    }
    if (dto.code) {
      data.code = this.normalizeCode(dto.code);
    }

    try {
      return await this.prisma.organization.update({
        where: { id: organizationId },
        data,
      });
    } catch (error) {
      this.handlePrismaUnique(error);
    }
  }
}
