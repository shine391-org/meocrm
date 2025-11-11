
import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, PaymentMethod } from '@prisma/client';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: mockDeep<PrismaService>(),
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const mockCustomer = { id: 'cust-1', organizationId: 'org-1' };
    const mockProduct = { id: 'prod-1', sellPrice: 600000 };
    const baseDto: CreateOrderDto = {
      customerId: 'cust-1',
      paymentMethod: PaymentMethod.CASH,
      items: [{ productId: 'prod-1', quantity: 1 }],
    };

    beforeEach(() => {
        // Mock the transaction correctly by returning the result of the callback
        (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
            return await callback(prisma);
        });
        prisma.customer.findFirst.mockResolvedValue(mockCustomer as any);
        prisma.product.findFirst.mockResolvedValue(mockProduct as any);
        prisma.order.findFirst.mockResolvedValue(null); // For code generation
        prisma.order.create.mockResolvedValue({ id: 'order-1' } as any);
    });

    it('should apply free ship if conditions are met', async () => {
      const dto: CreateOrderDto = { ...baseDto, isOnlineOrder: true };

      await service.create(dto, 'org-1');

      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shipping: 0,
            total: 660000, // 600k subtotal + 60k tax
          }),
        }),
      );
    });

    it('should NOT apply free ship if subtotal is below threshold', async () => {
        prisma.product.findFirst.mockResolvedValue({ id: 'prod-1', sellPrice: 400000 } as any);
        const dto: CreateOrderDto = { ...baseDto, isOnlineOrder: true, shipping: 30000 };

        await service.create(dto, 'org-1');

        expect(prisma.order.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              shipping: 30000,
              total: 470000, // 400k subtotal + 40k tax + 30k shipping
            }),
          }),
        );
    });

    it('should respect manual shipping override even if free ship is applicable', async () => {
        const dto: CreateOrderDto = { ...baseDto, isOnlineOrder: true, shipping: 50000 };

        await service.create(dto, 'org-1');

        expect(prisma.order.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              shipping: 50000,
              total: 710000, // 600k subtotal + 60k tax + 50k shipping
            }),
          }),
        );
    });

    it('should not apply free ship for non-online orders', async () => {
        const dto: CreateOrderDto = { ...baseDto, isOnlineOrder: false, shipping: 25000 };

        await service.create(dto, 'org-1');

        expect(prisma.order.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              shipping: 25000,
              total: 685000, // 600k subtotal + 60k tax + 25k shipping
            }),
          }),
        );
    });
  });
});
