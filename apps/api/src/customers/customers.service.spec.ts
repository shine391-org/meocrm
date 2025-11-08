import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('CustomersService', () => {
  let service: CustomersService;
  let prisma: {
    customer: {
      findFirst: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
  };
  const organizationId = 'org-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: PrismaService,
          useValue: {
            customer: {
              findFirst: jest.fn(),
              create: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    prisma = module.get(PrismaService) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a customer with a generated code', async () => {
      const dto = { name: 'Test Customer', phone: '0987654321' };
      const expected = { id: '1', code: 'KH000001', ...dto };

      prisma.customer.findFirst.mockResolvedValueOnce(null); // generateCode
      prisma.customer.findFirst.mockResolvedValueOnce(null); // phone uniqueness
      prisma.customer.create.mockResolvedValue(expected);

      const result = await service.create(dto, organizationId);

      expect(prisma.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...dto,
          code: 'KH000001',
          organization: { connect: { id: organizationId } },
        }),
      });
      expect(result).toEqual(expected);
    });

    it('throws when phone already exists in the organization', async () => {
      const dto = { name: 'Duplicate', phone: '0123456789' };
      prisma.customer.findFirst.mockResolvedValueOnce(null); // generateCode
      prisma.customer.findFirst.mockResolvedValueOnce({ id: 'existing' }); // duplicate phone

      await expect(service.create(dto, organizationId)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('returns paginated customers with tenant + soft delete filters', async () => {
      prisma.customer.findMany.mockResolvedValue([{ id: '1', name: 'Jane' }]);
      prisma.customer.count.mockResolvedValue(1);

      const result = await service.findAll(1, 20, organizationId, 'Jane', 'name', 'asc', 'VIP');

      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId,
            deletedAt: null,
          }),
        }),
      );
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('returns the customer when present', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: '1' });

      const result = await service.findOne('1', organizationId);
      expect(result).toEqual({ id: '1' });
    });

    it('throws NotFound when customer missing', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);

      await expect(service.findOne('missing', organizationId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates customer details', async () => {
      prisma.customer.findFirst
        .mockResolvedValueOnce({ id: '1', phone: '111', organizationId }) // findOne
        .mockResolvedValueOnce(null); // duplicate phone check
      prisma.customer.update.mockResolvedValue({ id: '1', name: 'Updated' });

      const result = await service.update('1', { name: 'Updated', phone: '222' }, organizationId);

      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { name: 'Updated', phone: '222' },
      });
      expect(result).toEqual({ id: '1', name: 'Updated' });
    });

    it('throws Conflict when new phone already exists', async () => {
      prisma.customer.findFirst
        .mockResolvedValueOnce({ id: '1', phone: '111', organizationId }) // findOne
        .mockResolvedValueOnce({ id: '2' }); // duplicate

      await expect(service.update('1', { phone: '222' }, organizationId)).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('soft deletes customers without orders', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: '1', orders: [] });
      prisma.customer.update.mockResolvedValue({ id: '1', deletedAt: new Date() });

      const result = await service.remove('1', organizationId);

      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(result.message).toBe('Customer deleted successfully');
    });

    it('throws when customer still has orders', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: '1', orders: [{ id: 'order-1' }] });

      await expect(service.remove('1', organizationId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateCode', () => {
    it('returns KH000001 when no customers exist', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);

      const code = await (service as any).generateCode(organizationId);
      expect(code).toBe('KH000001');
    });

    it('generates sequential codes without NaN for 100 iterations', async () => {
      for (let i = 0; i < 100; i += 1) {
        prisma.customer.findFirst.mockResolvedValueOnce({ code: `KH${(i + 1).toString().padStart(6, '0')}` });
        const code = await (service as any).generateCode(organizationId);
        expect(code).toBe(`KH${(i + 2).toString().padStart(6, '0')}`);
      }
    });
  });
});
