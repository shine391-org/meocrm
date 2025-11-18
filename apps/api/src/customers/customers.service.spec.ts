import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerSegmentationService } from './services/customer-segmentation.service';
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
      updateMany: jest.Mock;
    };
  };
  let segmentationService: {
    updateSegment: jest.Mock;
  };
  const organizationId = 'org-123';
  const userId = 'user-123';

  beforeEach(async () => {
    const customerMock = {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: PrismaService,
          useValue: {
            customer: customerMock,
            $transaction: jest.fn((cb: any) => cb({ customer: customerMock })),
          },
        },
        {
          provide: CustomerSegmentationService,
          useValue: {
            updateSegment: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    prisma = module.get(PrismaService) as any;
    segmentationService = module.get(CustomerSegmentationService) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a customer, saves creator, and calls segmentation', async () => {
      const dto = { name: 'Test Customer', phone: '0987654321' };
      const created = { id: '1', code: 'KH000001', ...dto, segment: null };

      prisma.customer.findFirst.mockResolvedValueOnce(null); // generateCode
      prisma.customer.findFirst.mockResolvedValueOnce(null); // phone uniqueness
      prisma.customer.create.mockResolvedValue(created);
      segmentationService.updateSegment.mockResolvedValue('Regular');

      const result = await service.create(dto, organizationId, userId);

      expect(prisma.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: dto.name,
          phone: dto.phone,
          code: 'KH000001',
          organization: { connect: { id: organizationId } },
          creator: { connect: { id: userId } },
        }),
        include: expect.any(Object),
      });
      expect(segmentationService.updateSegment).toHaveBeenCalledWith('1', organizationId, expect.anything());
      expect(result).toEqual({ ...created, segment: 'Regular' });
    });

    it('throws when phone already exists', async () => {
      const dto = { name: 'Duplicate', phone: '0123456789' };
      prisma.customer.findFirst.mockResolvedValueOnce(null); // generateCode
      prisma.customer.findFirst.mockResolvedValueOnce({ id: 'existing' }); // duplicate phone

      await expect(service.create(dto, organizationId, userId)).rejects.toThrow(ConflictException);
    });
  });

  // Keep other tests the same as they are not affected by the changes

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
      expect(result).toEqual({ data: { id: '1' } });
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
        .mockResolvedValueOnce(null) // duplicate phone check
        .mockResolvedValueOnce({ id: '1', name: 'Updated' }); // findOne after update
      prisma.customer.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.update('1', { name: 'Updated', phone: '222' }, organizationId);

      expect(prisma.customer.updateMany).toHaveBeenCalledWith({
        where: { id: '1', organizationId, deletedAt: null },
        data: { name: 'Updated', phone: '222' },
      });
      expect(segmentationService.updateSegment).toHaveBeenCalledWith('1', organizationId);
      expect(result).toEqual({ data: { id: '1', name: 'Updated' } });
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
      prisma.customer.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.remove('1', organizationId);

      expect(prisma.customer.updateMany).toHaveBeenCalledWith({
        where: { id: '1', organizationId, deletedAt: null },
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

    it('generates sequential codes correctly', async () => {
        prisma.customer.findFirst.mockResolvedValueOnce({ code: 'KH000009' });
        const code = await (service as any).generateCode(organizationId);
        expect(code).toBe('KH000010');
    });
  });

  describe('birthday validation', () => {
    it('accepts valid birthday in ISO string format (create)', async () => {
      const dto = {
        name: 'Test Customer',
        phone: '0987654321',
        birthday: '1990-05-15T00:00:00.000Z'
      };
      const created = { id: '1', code: 'KH000001', ...dto, segment: null };

      prisma.customer.findFirst.mockResolvedValueOnce(null); // generateCode
      prisma.customer.findFirst.mockResolvedValueOnce(null); // phone uniqueness
      prisma.customer.create.mockResolvedValue(created);
      segmentationService.updateSegment.mockResolvedValue('Regular');

      await service.create(dto, organizationId, userId);

      expect(prisma.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          birthday: expect.any(Date),
        }),
        include: expect.any(Object),
      });
    });

    it('rejects future birthday (create)', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const dto = {
        name: 'Test Customer',
        phone: '0987654321',
        birthday: futureDate.toISOString()
      };

      prisma.customer.findFirst.mockResolvedValueOnce(null); // generateCode
      prisma.customer.findFirst.mockResolvedValueOnce(null); // phone uniqueness

      await expect(service.create(dto, organizationId, userId))
        .rejects.toThrow(BadRequestException);
      await expect(service.create(dto, organizationId, userId))
        .rejects.toThrow('Birthday cannot be in the future');
    });

    it('rejects unrealistic old birthday (create)', async () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 151);

      const dto = {
        name: 'Test Customer',
        phone: '0987654321',
        birthday: oldDate.toISOString()
      };

      prisma.customer.findFirst.mockResolvedValueOnce(null); // generateCode
      prisma.customer.findFirst.mockResolvedValueOnce(null); // phone uniqueness

      await expect(service.create(dto, organizationId, userId))
        .rejects.toThrow(BadRequestException);
      await expect(service.create(dto, organizationId, userId))
        .rejects.toThrow('Birthday cannot be more than 150 years ago');
    });

    it('accepts valid birthday in update', async () => {
      const dto = { birthday: '1985-03-20T00:00:00.000Z' };

      prisma.customer.findFirst
        .mockResolvedValueOnce({ id: '1', phone: '111', organizationId }) // findOne
        .mockResolvedValueOnce({ id: '1', birthday: new Date(dto.birthday) }); // findOne after update
      prisma.customer.updateMany.mockResolvedValue({ count: 1 });

      await service.update('1', dto, organizationId);

      expect(prisma.customer.updateMany).toHaveBeenCalledWith({
        where: { id: '1', organizationId, deletedAt: null },
        data: { birthday: expect.any(Date) },
      });
    });

    it('rejects future birthday in update', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const dto = { birthday: futureDate.toISOString() };

      prisma.customer.findFirst.mockResolvedValue({ id: '1', phone: '111', organizationId });

      await expect(service.update('1', dto, organizationId))
        .rejects.toThrow('Birthday cannot be in the future');
    });

    it('rejects invalid date format', async () => {
      const dto = {
        name: 'Test Customer',
        phone: '0987654321',
        birthday: 'invalid-date'
      };

      prisma.customer.findFirst.mockResolvedValueOnce(null); // generateCode
      prisma.customer.findFirst.mockResolvedValueOnce(null); // phone uniqueness

      await expect(service.create(dto, organizationId, userId))
        .rejects.toThrow(BadRequestException);
      await expect(service.create(dto, organizationId, userId))
        .rejects.toThrow('Invalid birthday format');
    });
  });
});
