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

  private handlePrismaUnique(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Slug đã tồn tại, vui lòng chọn slug khác');
    }
    throw error;
  }

  async create(dto: CreateOrganizationDto) {
    const slug = this.normalizeSlug(dto.slug);
    try {
      return await this.prisma.organization.create({
        data: {
          name: dto.name,
          slug,
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
