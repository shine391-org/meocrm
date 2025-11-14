import { Test, TestingModule } from '@nestjs/testing';
import { CustomerSegmentationService } from './customer-segmentation.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CustomerSegmentationService', () => {
  let service: CustomerSegmentationService;
  let prisma: {
    customer: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerSegmentationService,
        {
          provide: PrismaService,
          useValue: {
            customer: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<CustomerSegmentationService>(CustomerSegmentationService);
    prisma = module.get(PrismaService) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateSegment', () => {
    it('should segment as VIP for high spending', () => {
      const segment = (service as any).calculateSegment(15_000_000, 5, new Date());
      expect(segment).toBe('VIP');
    });

    it('should segment as Loyal for high order count but not VIP spending', () => {
      const segment = (service as any).calculateSegment(5_000_000, 15, new Date());
      expect(segment).toBe('Loyal');
    });

    it('should segment as Active for recent orders', () => {
      const lastOrder = new Date();
      lastOrder.setDate(lastOrder.getDate() - 15); // 15 days ago
      const segment = (service as any).calculateSegment(1_000_000, 3, lastOrder);
      expect(segment).toBe('Active');
    });

    it('should segment as Inactive for old orders', () => {
      const lastOrder = new Date();
      lastOrder.setDate(lastOrder.getDate() - 100); // 100 days ago
      const segment = (service as any).calculateSegment(1_000_000, 3, lastOrder);
      expect(segment).toBe('Inactive');
    });

    it('should segment as Regular for new customers or low activity', () => {
      const lastOrder = new Date();
      lastOrder.setDate(lastOrder.getDate() - 45); // 45 days ago
      const segment = (service as any).calculateSegment(500_000, 1, lastOrder);
      expect(segment).toBe('Regular');
    });

    it('should default to Regular if no order history', () => {
      const segment = (service as any).calculateSegment(0, 0, null);
      expect(segment).toBe('Regular');
    });

    it('should prioritize VIP over Loyal', () => {
      const segment = (service as any).calculateSegment(12_000_000, 20, new Date());
      expect(segment).toBe('VIP');
    });
  });

  describe('updateSegment', () => {
    it('should find a customer, calculate segment, and update them in DB', async () => {
      const customerData = {
        id: 'cust-1',
        totalSpent: 12_000_000,
        totalOrders: 20,
        lastOrderAt: new Date(),
      };
      prisma.customer.findUnique.mockResolvedValue(customerData);
      prisma.customer.update.mockResolvedValue({ ...customerData, segment: 'VIP' });

      const newSegment = await service.updateSegment('cust-1');

      expect(prisma.customer.findUnique).toHaveBeenCalledWith({ where: { id: 'cust-1' }, select: expect.any(Object) });
      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
        data: { segment: 'VIP' },
      });
      expect(newSegment).toBe('VIP');
    });

    it('should return null if customer is not found', async () => {
        prisma.customer.findUnique.mockResolvedValue(null);
        const result = await service.updateSegment('non-existent');
        expect(result).toBeNull();
        expect(prisma.customer.update).not.toHaveBeenCalled();
    });
  });
});
