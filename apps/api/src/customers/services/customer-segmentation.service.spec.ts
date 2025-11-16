import { Test, TestingModule } from '@nestjs/testing';
import { CustomerSegmentationService, DEFAULT_SEGMENTATION_SETTINGS } from './customer-segmentation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../../modules/settings/settings.service';

describe('CustomerSegmentationService', () => {
  let service: CustomerSegmentationService;
  let prisma: {
    customer: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let settings: { getForOrganization: jest.Mock };

  const createSnapshot = (overrides: Record<string, any> = {}) => ({
    id: 'cust-1',
    organizationId: 'org-1',
    totalSpent: 0,
    totalOrders: 0,
    lastOrderAt: null,
    createdAt: new Date(),
    segment: null,
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerSegmentationService,
        {
          provide: PrismaService,
          useValue: {
            customer: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
          },
        },
        {
          provide: SettingsService,
          useValue: {
            getForOrganization: jest.fn().mockResolvedValue(DEFAULT_SEGMENTATION_SETTINGS),
          },
        },
      ],
    }).compile();

    service = module.get<CustomerSegmentationService>(CustomerSegmentationService);
    prisma = module.get(PrismaService) as any;
    settings = module.get(SettingsService) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateSegment', () => {
    it('should segment as VIP for high spending', () => {
      const segment = (service as any).determineSegment(
        createSnapshot({ totalSpent: 15_000_000 }),
        DEFAULT_SEGMENTATION_SETTINGS,
      );
      expect(segment).toBe('VIP');
    });

    it('should segment as Loyal for high order count but not VIP spending', () => {
      const segment = (service as any).determineSegment(
        createSnapshot({ totalSpent: 5_000_000, totalOrders: 15 }),
        DEFAULT_SEGMENTATION_SETTINGS,
      );
      expect(segment).toBe('Loyal');
    });

    it('should segment as Active for recent orders', () => {
      const lastOrder = new Date();
      lastOrder.setDate(lastOrder.getDate() - 15); // 15 days ago
      const segment = (service as any).determineSegment(
        createSnapshot({ totalSpent: 1_000_000, totalOrders: 3, lastOrderAt: lastOrder }),
        DEFAULT_SEGMENTATION_SETTINGS,
      );
      expect(segment).toBe('Active');
    });

    it('should segment as Inactive for old orders', () => {
      const lastOrder = new Date();
      lastOrder.setDate(lastOrder.getDate() - 100); // 100 days ago
      const segment = (service as any).determineSegment(
        createSnapshot({ totalSpent: 1_000_000, totalOrders: 3, lastOrderAt: lastOrder }),
        DEFAULT_SEGMENTATION_SETTINGS,
      );
      expect(segment).toBe('Inactive');
    });

    it('should segment as Regular for new customers or low activity', () => {
      const lastOrder = new Date();
      lastOrder.setDate(lastOrder.getDate() - 45); // 45 days ago
      const segment = (service as any).determineSegment(
        createSnapshot({ totalSpent: 500_000, totalOrders: 1, lastOrderAt: lastOrder }),
        DEFAULT_SEGMENTATION_SETTINGS,
      );
      expect(segment).toBe('Regular');
    });

    it('should default to Regular if no order history', () => {
      const segment = (service as any).determineSegment(
        createSnapshot({ lastOrderAt: null }),
        DEFAULT_SEGMENTATION_SETTINGS,
      );
      expect(segment).toBe('Regular');
    });

    it('should prioritize VIP over Loyal', () => {
      const segment = (service as any).determineSegment(
        createSnapshot({ totalSpent: 12_000_000, totalOrders: 20 }),
        DEFAULT_SEGMENTATION_SETTINGS,
      );
      expect(segment).toBe('VIP');
    });
  });

  describe('updateSegment', () => {
    it('should find a customer, calculate segment, and update them in DB', async () => {
      const customerData = createSnapshot({
        totalSpent: 12_000_000,
        totalOrders: 20,
        lastOrderAt: new Date(),
      });
      prisma.customer.findFirst.mockResolvedValue(customerData);
      prisma.customer.updateMany.mockResolvedValue({ count: 1 });

      const newSegment = await service.updateSegment('cust-1');

      expect(prisma.customer.findFirst).toHaveBeenCalledWith({
        where: { id: 'cust-1', deletedAt: null },
        select: expect.any(Object),
      });
      expect(settings.getForOrganization).toHaveBeenCalledWith(
        customerData.organizationId,
        'customerSegmentation',
        DEFAULT_SEGMENTATION_SETTINGS,
        expect.any(Function),
      );
      expect(prisma.customer.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'cust-1',
          organizationId: customerData.organizationId,
          deletedAt: null,
        },
        data: { segment: 'VIP' },
      });
      expect(newSegment).toBe('VIP');
    });

    it('should return null if customer is not found', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);
      const result = await service.updateSegment('non-existent');
      expect(result).toBeNull();
      expect(prisma.customer.updateMany).not.toHaveBeenCalled();
    });
  });
});
