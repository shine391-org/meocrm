import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CustomersService } from './customers.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('CustomersService', () => {
  let service: CustomersService;
  let prisma: PrismaService;

  const organizationId = 'test-org-id';

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
            $transaction: jest.fn().mockImplementation((callback) => callback),
          },
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new customer', async () => {
      const createCustomerDto = { name: 'Test Customer', phone: '123456789' };
      const expectedCustomer = { id: '1', code: 'KH000001', ...createCustomerDto };

      jest.spyOn(prisma.customer, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.customer, 'create').mockResolvedValue(expectedCustomer as any);

      const result = await service.create(organizationId, createCustomerDto);
      expect(result).toEqual(expectedCustomer);
    });

    it('should throw a ConflictException if a customer with the same phone number already exists', async () => {
      const createCustomerDto = { name: 'Test Customer', phone: '123456789' };
      jest.spyOn(prisma.customer, 'findFirst').mockResolvedValue({} as any);

      await expect(service.create(organizationId, createCustomerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return a paginated list of customers', async () => {
      const expectedCustomers = [{ id: '1', name: 'Test Customer' }];
      const expectedTotal = 1;

      jest.spyOn(prisma, '$transaction').mockResolvedValue([expectedCustomers, expectedTotal]);

      const result = await service.findAll(organizationId, 1, 10);
      expect(result.data).toEqual(expectedCustomers);
      expect(result.pagination.total).toEqual(expectedTotal);
    });
  });

  describe('findOne', () => {
    it('should return a single customer', async () => {
      const expectedCustomer = { id: '1', name: 'Test Customer' };
      jest.spyOn(prisma.customer, 'findFirst').mockResolvedValue(expectedCustomer as any);

      const result = await service.findOne(organizationId, '1');
      expect(result).toEqual(expectedCustomer);
    });

    it('should throw a NotFoundException if the customer is not found', async () => {
      jest.spyOn(prisma.customer, 'findFirst').mockResolvedValue(null);

      await expect(service.findOne(organizationId, '1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a customer', async () => {
      const updateCustomerDto = { name: 'Updated Customer' };
      const expectedCustomer = { id: '1', name: 'Updated Customer' };

      jest.spyOn(prisma.customer, 'findFirst').mockResolvedValue({ id: '1', name: 'Test Customer' } as any);
      jest.spyOn(prisma.customer, 'update').mockResolvedValue(expectedCustomer as any);

      const result = await service.update(organizationId, '1', updateCustomerDto);
      expect(result).toEqual(expectedCustomer);
    });

    it('should throw a BadRequestException when trying to update an immutable field', async () => {
      const updateCustomerDto = { code: 'NEWCODE' };
      jest.spyOn(prisma.customer, 'findFirst').mockResolvedValue({ id: '1', name: 'Test Customer' } as any);

      await expect(service.update(organizationId, '1', updateCustomerDto as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateCustomerCode', () => {
    it('should generate the first customer code', async () => {
      jest.spyOn(prisma.customer, 'findFirst').mockResolvedValue(null);
      const result = await (service as any).generateCustomerCode(organizationId);
      expect(result).toEqual('KH000001');
    });

    it('should generate the next customer code', async () => {
      jest.spyOn(prisma.customer, 'findFirst').mockResolvedValue({ code: 'KH000001' } as any);
      const result = await (service as any).generateCustomerCode(organizationId);
      expect(result).toEqual('KH000002');
    });
  });

  describe('remove', () => {
    it('should soft delete a customer', async () => {
      const expectedCustomer = { id: '1', name: 'Test Customer', orders: [] };
      jest.spyOn(prisma.customer, 'findFirst').mockResolvedValue(expectedCustomer as any);
      jest.spyOn(prisma.customer, 'update').mockResolvedValue({ ...expectedCustomer, deletedAt: new Date() } as any);

      const result = await service.remove(organizationId, '1');
      expect(result.message).toEqual('Customer deleted successfully');
    });

    it('should throw a BadRequestException if the customer has orders', async () => {
      const customerWithOrders = { id: '1', name: 'Test Customer', orders: [{ id: '1' }] };
      jest.spyOn(prisma.customer, 'findFirst').mockResolvedValue(customerWithOrders as any);

      await expect(service.remove(organizationId, '1')).rejects.toThrow(BadRequestException);
    });
  });
});
