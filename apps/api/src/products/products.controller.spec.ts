import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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
      const mockUser = { organizationId: 'org1' };
      const queryDto = {};
      mockProductsService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(queryDto as any, mockUser);

      expect(result).toEqual(mockResult);
      expect(service.findAll).toHaveBeenCalledWith(queryDto, 'org1');
    });
  });

  describe('findOne', () => {
    it('should return a product', async () => {
      const mockProduct = { id: '1', name: 'Product 1' };
      const mockUser = { organizationId: 'org1' };
      mockProductsService.findOne.mockResolvedValue(mockProduct);

      const result = await controller.findOne('1', mockUser);
      expect(result).toEqual(mockProduct);
    });
  });
});
