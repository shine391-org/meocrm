import { Test } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../prisma/prisma.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
      ],
    }).compile();

    service = moduleRef.get(CategoriesService);
    prisma = moduleRef.get(PrismaService);
  });

  describe('create', () => {
    it('throws when parent category is missing', async () => {
      prisma.category.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.create({ name: 'Child', parentId: 'missing' }, 'org_1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('connects parent when provided', async () => {
      prisma.category.findFirst.mockResolvedValueOnce({ id: 'parent', organizationId: 'org_1' } as any);
      prisma.category.create.mockResolvedValue({ id: 'child' } as any);

      await service.create({ name: 'Child', parentId: 'parent' }, 'org_1');

      expect(prisma.category.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Child',
          organizationId: 'org_1',
          parent: { connect: { id: 'parent' } },
        }),
        include: { parent: true, children: true },
      });
    });
  });

  describe('update', () => {
    it('throws when category is missing', async () => {
      prisma.category.findFirst.mockResolvedValueOnce(null);
      await expect(service.update('missing', { name: 'New' }, 'org_1')).rejects.toThrow(NotFoundException);
    });

    it('throws when parent loops to same category', async () => {
      prisma.category.findFirst.mockResolvedValueOnce({ id: 'cat_1', organizationId: 'org_1' } as any);
      await expect(service.update('cat_1', { parentId: 'cat_1', name: 'loop' }, 'org_1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('validates parent existence before connecting', async () => {
      prisma.category.findFirst
        .mockResolvedValueOnce({ id: 'cat_1', organizationId: 'org_1' } as any)
        .mockResolvedValueOnce(null);

      await expect(service.update('cat_1', { name: 'child', parentId: 'missing' }, 'org_1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('disconnects parent when parentId is null', async () => {
      prisma.category.findFirst.mockResolvedValueOnce({ id: 'cat_1', organizationId: 'org_1' } as any);
      prisma.category.update.mockResolvedValue({ id: 'cat_1' } as any);

      await service.update('cat_1', { name: 'Updated', parentId: null }, 'org_1');

      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 'cat_1' },
        data: {
          name: 'Updated',
          parent: { disconnect: true },
        },
        include: { parent: true, children: true },
      });
    });
  });

  describe('findOne', () => {
    it('throws NotFound when category missing', async () => {
      prisma.category.findFirst.mockResolvedValueOnce(null);
      await expect(service.findOne('missing', 'org_1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('prevents deleting categories with children or products', async () => {
      prisma.category.findFirst.mockResolvedValueOnce({
        id: 'cat',
        organizationId: 'org_1',
        children: [{ id: 'child' }],
        products: [],
      } as any);

      await expect(service.remove('cat', 'org_1')).rejects.toThrow(BadRequestException);

      prisma.category.findFirst.mockResolvedValueOnce({
        id: 'cat',
        organizationId: 'org_1',
        children: [],
        products: [{ id: 'prod' }],
      } as any);

      await expect(service.remove('cat', 'org_1')).rejects.toThrow(BadRequestException);
    });
  });
});
