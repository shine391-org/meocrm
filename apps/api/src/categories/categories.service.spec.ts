import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../prisma/prisma.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: PrismaService,
          useValue: mockDeep<PrismaService>(),
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a root category', async () => {
      const dto = { name: 'Root' };
      const organizationId = 'org-id';
      const category = { id: '1', name: 'Root', parentId: null, organizationId, createdAt: new Date(), updatedAt: new Date(), deletedAt: null };

      prisma.category.create.mockResolvedValue(category as any);

      await expect(service.create(dto, organizationId)).resolves.toEqual(category);
      expect(prisma.category.create).toHaveBeenCalledWith({
        data: { name: 'Root', organizationId },
        include: { parent: true, children: true },
      });
    });

    it('should create a child category', async () => {
      const dto = { name: 'Child', parentId: '1' };
      const organizationId = 'org-id';
      const parent = { id: '1', name: 'Root', parentId: null, organizationId, createdAt: new Date(), updatedAt: new Date(), deletedAt: null };
      const category = { id: '2', name: 'Child', parentId: '1', organizationId, createdAt: new Date(), updatedAt: new Date(), deletedAt: null, parent };

      prisma.category.findFirst.mockResolvedValue(parent as any);
      prisma.category.findUnique.mockResolvedValue({ parentId: null } as any);
      prisma.category.create.mockResolvedValue(category as any);

      await expect(service.create(dto, organizationId)).resolves.toEqual(category);
    });

    it('should reject creating a 4th level category', async () => {
      const dto = { name: 'Level 4', parentId: '3' };
      const organizationId = 'org-id';
      const parent = { id: '3', name: 'Level 3', parentId: '2', organizationId, createdAt: new Date(), updatedAt: new Date(), deletedAt: null };

      prisma.category.findFirst.mockResolvedValue(parent as any);
      // Mock getCategoryLevel to return 3
      jest.spyOn(service as any, 'getCategoryLevel').mockResolvedValue(3);


      await expect(service.create(dto, organizationId)).rejects.toThrow('Maximum 3 levels allowed');
    });
  });

  describe('update', () => {
    it('should prevent a category from being its own parent', async () => {
      const dto = { parentId: '1' };
      const organizationId = 'org-id';
      const category = { id: '1', name: 'Category', parentId: null, organizationId, createdAt: new Date(), updatedAt: new Date(), deletedAt: null };

      prisma.category.findFirst.mockResolvedValue(category as any);

      await expect(service.update('1', dto, organizationId)).rejects.toThrow('Category cannot be its own parent');
    });

    it('should prevent circular references', async () => {
      const dto = { parentId: '3' };
      const organizationId = 'org-id';
      const category1 = { id: '1', name: 'A', parentId: null, organizationId, createdAt: new Date(), updatedAt: new Date(), deletedAt: null };

      prisma.category.findFirst.mockResolvedValue(category1 as any);
      jest.spyOn(service as any, 'isDescendant').mockResolvedValue(true);


      await expect(service.update('1', dto, organizationId)).rejects.toThrow('Cannot move category under its own descendant');
    });
  });

  describe('remove', () => {
    it('prevents deleting categories with children', async () => {
      prisma.category.findFirst.mockResolvedValueOnce({
        id: 'cat',
        organizationId: 'org_1',
        children: [{ id: 'child' }],
        products: [],
      } as any);

      await expect(service.remove('cat', 'org_1')).rejects.toThrow(BadRequestException);
    });

    it('prevents deleting categories with products', async () => {
      prisma.category.findFirst.mockResolvedValueOnce({
        id: 'cat',
        organizationId: 'org_1',
        children: [],
        products: [{ id: 'prod' }],
      } as any);
      await expect(service.remove('cat', 'org_1')).rejects.toThrow(BadRequestException);
    });

    it('soft deletes category when it has no children or products', async () => {
      const category = {
        id: 'cat',
        organizationId: 'org_1',
        children: [],
        products: [],
      } as any;
      prisma.category.findFirst.mockResolvedValueOnce(category);
      prisma.category.update.mockResolvedValue({ ...category, deletedAt: new Date() } as any);

      await expect(service.remove('cat', 'org_1')).resolves.toEqual({ message: 'Category deleted successfully' });
      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 'cat' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('getTree', () => {
    it('should return a nested tree with product counts', async () => {
      const organizationId = 'org-id';
      const tree = [
        {
          id: '1',
          name: 'A',
          parentId: null,
          _count: { products: 1 },
          children: [{ id: '2', name: 'B', parentId: '1', _count: { products: 2 }, children: [] }],
        },
      ];
      prisma.category.findMany.mockResolvedValue(tree as any);

      const result: any = await service.findTree(organizationId);
      expect(result).toEqual(tree);
      expect(result[0]._count.products).toBe(1);
      expect(result[0].children[0]._count.products).toBe(2);
    });
  });
});
