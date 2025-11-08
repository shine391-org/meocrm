import { Test, TestingModule } from '@nestjs/testing';
import { SuppliersService } from './suppliers.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

const mockPrismaService = {
  supplier: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  purchaseOrder: {
    count: jest.fn(),
  }
};

const mockSupplier = {
    id: 'clxza91z10000a400b1c2d3e4',
    organizationId: 'org_123',
    code: 'DT000001',
    name: 'Test Supplier',
    phone: '0123456789',
    email: 'test@supplier.com',
    address: '123 Test St',
    taxCode: '1234567890',
    totalPurchased: new Decimal(0),
    totalOrders: 0,
    debt: new Decimal(0),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
};


describe('SuppliersService', () => {
  let service: SuppliersService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateCode', () => {
    it('should generate DT000001 if no suppliers exist', async () => {
      prisma.supplier.findFirst.mockResolvedValue(null);
      const code = await service['generateCode']('org_123');
      expect(code).toBe('DT000001');
      expect(prisma.supplier.findFirst).toHaveBeenCalledWith({
        where: { organizationId: 'org_123', deletedAt: null },
        orderBy: { code: 'desc' },
        select: { code: true },
      });
    });

    it('should generate next code (DT000002) if suppliers exist', async () => {
      prisma.supplier.findFirst.mockResolvedValue({ code: 'DT000001' });
      const code = await service['generateCode']('org_123');
      expect(code).toBe('DT000002');
    });
  });

  describe('create', () => {
    it('should create a new supplier successfully', async () => {
      prisma.supplier.findFirst.mockResolvedValue(null); // No duplicates
      prisma.supplier.create.mockResolvedValue(mockSupplier);

      const dto = {
        name: 'Test Supplier',
        phone: '0123456789',
        taxCode: '1234567890',
      };
      const result = await service.create('org_123', dto);

      expect(prisma.supplier.create).toHaveBeenCalledWith({
        data: { ...dto, code: 'DT000001', organizationId: 'org_123' },
      });
      expect(result).toEqual(mockSupplier);
    });

    it('should throw BadRequestException if phone number already exists', async () => {
      prisma.supplier.findFirst.mockImplementation(({ where }: any) => {
        if (where.phone) {
          return Promise.resolve(mockSupplier); // Found duplicate phone
        }
        return Promise.resolve(null);
      });

      const dto = { name: 'Test', phone: '0123456789' };
      await expect(service.create('org_123', dto)).rejects.toThrow('Phone number already exists for this organization');
    });

    it('should throw BadRequestException if tax code already exists', async () => {
      prisma.supplier.findFirst.mockImplementation(({ where }: any) => {
        if (where.taxCode) {
          return Promise.resolve(mockSupplier); // Found duplicate tax code
        }
        return Promise.resolve(null); // No duplicate phone
      });

      const dto = {
        name: 'Test Supplier',
        phone: '0987654321',
        taxCode: '1234567890',
      };

      await expect(service.create('org_123', dto)).rejects.toThrow(
        'Tax code already exists for this organization',
      );
    });
  });

  describe('remove', () => {
    it('should soft delete a supplier', async () => {
        prisma.supplier.findFirst.mockResolvedValue(mockSupplier);
        prisma.purchaseOrder.count.mockResolvedValue(0);
        prisma.supplier.update.mockResolvedValue({ ...mockSupplier, deletedAt: new Date() });

        await service.remove('org_123', mockSupplier.id);
        expect(prisma.supplier.update).toHaveBeenCalledWith({
            where: { id: mockSupplier.id },
            data: { deletedAt: expect.any(Date) }
        });
    });

    it('should throw NotFoundException if supplier not found', async () => {
        prisma.supplier.findFirst.mockResolvedValue(null);
        await expect(service.remove('org_123', 'invalid-id')).rejects.toThrow(NotFoundException);
    });

    // it('should throw BadRequestException if supplier has purchase orders', async () => {
    //     prisma.supplier.findFirst.mockResolvedValue(mockSupplier);
    //     prisma.purchaseOrder.count.mockResolvedValue(1);
    //     await expect(service.remove('org_123', mockSupplier.id)).rejects.toThrow(BadRequestException);
    // });
  });

  describe('findOne', () => {
    it('should return a supplier if found', async () => {
      prisma.supplier.findFirst.mockResolvedValue(mockSupplier);
      const result = await service.findOne('org_123', mockSupplier.id);
      expect(result).toEqual(mockSupplier);
    });

    it('should throw NotFoundException if supplier not found', async () => {
      prisma.supplier.findFirst.mockResolvedValue(null);
      await expect(service.findOne('org_123', 'invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a supplier successfully', async () => {
      prisma.supplier.findFirst.mockResolvedValue(mockSupplier);
      prisma.supplier.update.mockResolvedValue({ ...mockSupplier, name: 'Updated Name' });
      const dto = { name: 'Updated Name' };
      const result = await service.update('org_123', mockSupplier.id, dto);
      expect(result.name).toBe('Updated Name');
    });

    it('should throw BadRequestException if tax code already exists on another supplier', async () => {
      prisma.supplier.findFirst.mockResolvedValue(mockSupplier);
      prisma.supplier.findFirst.mockResolvedValueOnce(mockSupplier); // for findOne call
      prisma.supplier.findFirst.mockResolvedValueOnce({ ...mockSupplier, id: 'another-id' }); // for duplicate check
      const dto = { taxCode: '111222333' };
      await expect(service.update('org_123', mockSupplier.id, dto)).rejects.toThrow('Tax code already exists for another supplier');
    });
  });
});
