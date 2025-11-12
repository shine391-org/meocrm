import { Test } from '@nestjs/testing';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '../prisma/prisma.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let prisma: DeepMockProxy<PrismaService>;

  const createDto = { name: 'Org', slug: '  ACME   ', code: '  ac-01 ' };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
      ],
    }).compile();

    service = moduleRef.get(OrganizationsService);
    prisma = moduleRef.get(PrismaService);
  });

  it('normalizes slug and code on create', async () => {
    prisma.organization.create.mockResolvedValue({ id: 'org_1', ...createDto } as any);

    await service.create(createDto);

    expect(prisma.organization.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        slug: 'acme',
        code: 'AC-01',
      }),
    });
  });

  it('maps Prisma unique violations to HTTP conflicts', async () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: '6.19.0',
      meta: { target: ['slug'] },
    } as any);
    prisma.organization.create.mockRejectedValue(prismaError);

    await expect(service.create(createDto)).rejects.toThrow(ConflictException);
  });

  it('throws NotFound when organization id is missing', async () => {
    prisma.organization.findUnique.mockResolvedValue(null);
    await expect(service.findById('unknown')).rejects.toThrow(NotFoundException);
  });

  it('throws NotFound when slug lookup fails', async () => {
    prisma.organization.findUnique.mockResolvedValue(null);
    await expect(service.findBySlug('missing-slug')).rejects.toThrow(NotFoundException);
  });

  it('normalizes update payload and handles unique conflicts', async () => {
    prisma.organization.update.mockResolvedValue({ id: 'org_1' } as any);

    await service.update('org_1', { name: 'New Name', slug: ' My Slug ', code: ' new ' });

    expect(prisma.organization.update).toHaveBeenCalledWith({
      where: { id: 'org_1' },
      data: {
        name: 'New Name',
        slug: 'my-slug',
        code: 'NEW',
      },
    });

    const prismaError = new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: '6.19.0',
      meta: { target: ['code'] },
    } as any);
    prisma.organization.update.mockRejectedValue(prismaError);

    await expect(service.update('org_1', { code: 'dup' })).rejects.toThrow(ConflictException);
  });
  it('rejects invalid slugs', () => {
    expect(() => (service as any).normalizeSlug('!!!')).toThrow();
  });
});
