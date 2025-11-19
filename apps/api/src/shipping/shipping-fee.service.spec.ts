import { Test, TestingModule } from '@nestjs/testing';
import { ShippingFeeService } from './shipping-fee.service';
import { SettingsService } from '../modules/settings/settings.service';

describe('ShippingFeeService', () => {
  let service: ShippingFeeService;
  let settings: { get: jest.Mock };

  beforeEach(async () => {
    settings = { get: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShippingFeeService,
        {
          provide: SettingsService,
          useValue: settings,
        },
      ],
    }).compile();

    service = module.get<ShippingFeeService>(ShippingFeeService);
  });

  it('respects override fee when provided', async () => {
    const result = await service.calculate({ organizationId: 'o1', overrideFee: 12000 });
    expect(result.shippingFee).toBe(12000);
    expect(result.weightSurcharge).toBe(0);
    expect(result.breakdown.baseFee).toBe(12000);
  });

  it('applies weight surcharge and multiplier', async () => {
    settings.get.mockImplementation((key: string) => {
      const map: Record<string, any> = {
        'shipping.baseFee': 20000,
        'shipping.weightRate': 8000,
        'shipping.partners': undefined,
        'shipping.channelMultipliers': { express: 1.5 },
      };
      return Promise.resolve(map[key]);
    });

    const result = await service.calculate({ organizationId: 'o1', weight: 2000, channel: 'express', distanceKm: 5 });
    expect(result.shippingFee).toBeGreaterThan(0);
    expect(result.channelMultiplier).toBe(1.5);
    expect(result.breakdown.distanceFee).toBe(0);
  });

  it('applies partner-specific rules and service multiplier', async () => {
    settings.get.mockImplementation((key: string) => {
      const map: Record<string, any> = {
        'shipping.baseFee': 15000,
        'shipping.weightRate': 5000,
        'shipping.partners': {
          'partner-1': {
            baseFee: 10000,
            weightRate: 2000,
            distanceRate: 1000,
            serviceTypes: {
              express: { multiplier: 2 },
            },
          },
        },
        'shipping.channelMultipliers': {},
      };
      return Promise.resolve(map[key]);
    });

    const result = await service.calculate({
      organizationId: 'o1',
      partnerId: 'partner-1',
      weight: 3000,
      distanceKm: 3,
      serviceType: 'express',
    });

    expect(result.breakdown.baseFee).toBe(10000);
    expect(result.breakdown.distanceFee).toBe(3000);
    expect(result.shippingFee).toBeGreaterThan(result.breakdown.baseFee);
  });
});
