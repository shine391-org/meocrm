import { Test, TestingModule } from '@nestjs/testing';
import { SuppliersService } from './suppliers.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

const createMockPrisma = () => ({
  supplier: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  purchaseOrder: {
    count: jest.fn(),
  },
});

const mockSupplier = {
  id: 'clxza91z10000a400b1c2d3e4',
  organizationId: 'org_123',
  code: 'DT000001',
  name: 'Test Supplier',
  phone: '0123456789',
  email: 'test@supplier.com',
  address: '123 Test St',
  taxCode: '1234567890',
  totalPurchases: new Decimal(0),
  totalPaid: new Decimal(0),
  debt: new Decimal(0),
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe('SuppliersService', () => {
  let service: SuppliersService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    prisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliersService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateCode', () => {
    it('should return DT000001 when no supplier exists', async () => {
      prisma.supplier.findFirst.mockResolvedValue(null);
      const code = await service['generateCode']('org_123');
      expect(code).toBe('DT000001');
    });

    it('should increment existing code', async () => {
      prisma.supplier.findFirst.mockResolvedValue({ code: 'DT000010' });
      const code = await service['generateCode']('org_123');
      expect(code).toBe('DT000011');
    });
  });

  describe('create', () => {
    it('creates a supplier', async () => {
      prisma.supplier.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      prisma.supplier.create.mockResolvedValue(mockSupplier);

      const dto = { name: 'Test Supplier', phone: '0123456789', taxCode: '1234567890' };
      const result = await service.create('org_123', dto);

      expect(prisma.supplier.create).toHaveBeenCalledWith({
        data: { ...dto, code: 'DT000001', organizationId: 'org_123' },
      });
      expect(result).toEqual({ data: mockSupplier });
    });

    it('throws when phone duplicate', async () => {
      prisma.supplier.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockSupplier);

      await expect(
        service.create('org_123', { name: 'Test', phone: '0123456789' }),
      ).rejects.toThrow('Phone number already exists for this organization');
    });

    it('throws when tax code duplicate', async () => {
      prisma.supplier.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockSupplier);

      await expect(
        service.create('org_123', {
          name: 'Test',
          phone: '0987654321',
          taxCode: '1234567890',
        }),
      ).rejects.toThrow('Tax code already exists for this organization');
    });
  });

  describe('findAll', () => {
    it('returns paginated suppliers', async () => {
      const list = [mockSupplier];
      prisma.supplier.findMany.mockResolvedValue(list);
      prisma.supplier.count.mockResolvedValue(1);

      const result = await service.findAll('org_123', { page: 1, limit: 10 });

      expect(result.data).toEqual(list);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('returns supplier data', async () => {
      prisma.supplier.findFirst.mockResolvedValue(mockSupplier);
      const result = await service.findOne('org_123', mockSupplier.id);
      expect(result).toEqual({ data: mockSupplier });
    });

    it('throws when supplier missing', async () => {
      prisma.supplier.findFirst.mockResolvedValue(null);
      await expect(service.findOne('org_123', 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates successfully', async () => {
      prisma.supplier.findFirst
        .mockResolvedValueOnce(mockSupplier)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      prisma.supplier.update.mockResolvedValue({ ...mockSupplier, name: 'Updated' });

      const result = await service.update('org_123', mockSupplier.id, { name: 'Updated' });
      expect(result.data.name).toBe('Updated');
    });

    it('throws when tax code used by another supplier', async () => {
      prisma.supplier.findFirst
        .mockResolvedValueOnce(mockSupplier)
        .mockResolvedValueOnce({ ...mockSupplier, id: 'other' });

      await expect(
        service.update('org_123', mockSupplier.id, { taxCode: '111222333' }),
      ).rejects.toThrow('Tax code already exists for another supplier');
    });
  });

  describe('remove', () => {
    it('soft deletes when no purchase orders exist', async () => {
      prisma.supplier.findFirst.mockResolvedValue(mockSupplier);
      prisma.purchaseOrder.count.mockResolvedValue(0);
      prisma.supplier.update.mockResolvedValue({ ...mockSupplier, deletedAt: new Date() });

      const result = await service.remove('org_123', mockSupplier.id);
      expect(prisma.supplier.update).toHaveBeenCalled();
      expect(result).toEqual({ data: expect.objectContaining({ id: mockSupplier.id }) });
    });

    it('throws when purchase orders exist', async () => {
      prisma.supplier.findFirst.mockResolvedValue(mockSupplier);
      prisma.purchaseOrder.count.mockResolvedValue(2);

      await expect(service.remove('org_123', mockSupplier.id)).rejects.toThrow(
        'Cannot delete supplier with existing purchase orders',
      );
    });

    it('throws when supplier missing', async () => {
      prisma.supplier.findFirst.mockResolvedValue(null);
      await expect(service.remove('org_123', 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('recordPurchase', () => {
    it('increments stats and debt', async () => {
      prisma.supplier.updateMany.mockResolvedValue({ count: 1 });

      await service.recordPurchase('org_123', mockSupplier.id, 1000, 600);

      expect(prisma.supplier.updateMany).toHaveBeenCalledWith({
        where: { id: mockSupplier.id, organizationId: 'org_123', deletedAt: null },
        data: {
          totalPurchases: { increment: 1000 },
          totalPaid: { increment: 600 },
          debt: { increment: 400 },
        },
      });
    });

    it('throws when paid greater than total', async () => {
      await expect(
        service.recordPurchase('org_123', mockSupplier.id, 500, 600),
      ).rejects.toThrow('Paid amount cannot exceed total');
    });

    it('throws when supplier missing', async () => {
      prisma.supplier.updateMany.mockResolvedValue({ count: 0 });
      await expect(
        service.recordPurchase('org_123', mockSupplier.id, 100, 50),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
