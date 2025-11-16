import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('UsersService', () => {
  let service: UsersService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockDeep<PrismaService>(),
        },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
    prisma = moduleRef.get(PrismaService);
    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
  });

  describe('create', () => {
    it('hashes password, enforces unique email, and sanitizes response', async () => {
      prisma.user.create.mockResolvedValue({
        id: 'user_1',
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test',
        role: UserRole.STAFF,
      } as any);

      const result = await service.create(
        { email: 'test@example.com', password: 'secret123', name: 'Test', role: UserRole.ADMIN },
        'org_1',
      );

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: { id: true },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('secret123', 10);
      expect(result).toEqual(
        expect.objectContaining({
          id: 'user_1',
          email: 'test@example.com',
        }),
      );
      expect(result).not.toHaveProperty('password');
    });

    it('throws if email already taken', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' } as any);
      await expect(
        service.create({ email: 'dup@example.com', password: '123456', name: 'Dup' }, 'org_1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('throws if invalid pagination params are provided', async () => {
      await expect(service.findAll('org_1', { page: 0, limit: 10 })).rejects.toThrow(BadRequestException);
    });

    it('caps page size, applies filters, and sanitizes data', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'user_1', email: 'one@example.com', password: 'secret', name: 'One' } as any,
      ]);
      prisma.user.count.mockResolvedValue(250);

      const result = await service.findAll('org_1', { limit: 500, search: 'one', role: UserRole.ADMIN });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
          where: expect.objectContaining({
            organizationId: 'org_1',
            role: UserRole.ADMIN,
            OR: expect.any(Array),
          }),
        }),
      );
      expect(result.meta.limit).toBe(100);
      expect(result.meta.totalPages).toBe(Math.ceil(250 / 100));
      expect(result.data[0]).not.toHaveProperty('password');
    });
  });

  describe('findOne', () => {
    it('throws when user is not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.findOne('missing', 'org_1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('returns sanitized user when no changes provided', async () => {
      const existing = { id: 'user_1', email: 'test@example.com', name: 'Old', role: UserRole.STAFF } as any;
      prisma.user.findFirst.mockResolvedValueOnce(existing);

      const result = await service.update('user_1', {}, 'org_1');

      expect(prisma.user.updateMany).not.toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ email: 'test@example.com' }));
    });

    it('hashes password and updates email when provided', async () => {
      const existing = { id: 'user_1', email: 'old@example.com', name: 'Old', role: UserRole.STAFF } as any;
      prisma.user.findFirst
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({ ...existing, email: 'new@example.com', name: 'New Name' });
      prisma.user.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce({
        ...existing,
        email: 'new@example.com',
      });

      const result = await service.update(
        'user_1',
        { email: 'new@example.com', password: 'newpass', name: 'New Name' },
        'org_1',
      );

      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: 'user_1', organizationId: 'org_1' },
        data: expect.objectContaining({
          email: 'new@example.com',
          password: 'hashed-password',
          name: 'New Name',
        }),
      });
      expect(result.email).toBe('new@example.com');
    });

    it('throws when attempting to update missing user', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(
        service.update('user_missing', { name: 'Nope' }, 'org_1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('prevents self-deletion', async () => {
      await expect(service.remove('user_1', 'org_1', 'user_1')).rejects.toThrow(ForbiddenException);
    });

    it('throws when deleteMany affects no records', async () => {
      prisma.user.deleteMany.mockResolvedValue({ count: 0 });
      await expect(service.remove('user_2', 'org_1', 'user_1')).rejects.toThrow(NotFoundException);
    });
  });
});
