import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { UserRole } from '@prisma/client';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: ProductsService;

  const mockProductsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedpassword',
    role: UserRole.OWNER,
    organizationId: 'org1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: mockProductsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      const mockResult = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
      const queryDto = {};
      mockProductsService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(queryDto as any, 'org1');

      expect(result).toEqual(mockResult);
      expect(service.findAll).toHaveBeenCalledWith(queryDto, 'org1');
    });
  });

  describe('findOne', () => {
    it('should return a product', async () => {
      const mockProduct = { id: '1', name: 'Product 1' };
      mockProductsService.findOne.mockResolvedValue(mockProduct);

      const result = await controller.findOne('1', 'org1');
      expect(result).toEqual(mockProduct);
    });
  });

  describe('create', () => {
    it('should create a product', async () => {
      const createDto = { name: 'New Product' };
      const mockProduct = { id: '1', ...createDto };
      mockProductsService.create.mockResolvedValue(mockProduct);

      const result = await controller.create(createDto as any, 'org1');
      expect(result).toEqual(mockProduct);
    });
  });

  describe('update', () => {
    it('should update a product', async () => {
      const updateDto = { name: 'Updated Product' };
      const mockProduct = { id: '1', ...updateDto };
      mockProductsService.update.mockResolvedValue(mockProduct);

      const result = await controller.update('1', updateDto as any, 'org1');
      expect(result).toEqual(mockProduct);
    });
  });

  describe('remove', () => {
    it('should remove a product', async () => {
      mockProductsService.remove.mockResolvedValue(undefined);

      await controller.remove('1', 'org1');
      expect(service.remove).toHaveBeenCalledWith('1', 'org1');
    });
  });
});
