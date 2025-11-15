import { Test } from '@nestjs/testing';
import { PricingService } from './pricing.service';
import { SettingsService } from '../modules/settings/settings.service';

describe('PricingService', () => {
  let service: PricingService;
  const settings = {
    get: jest.fn(),
  };

  const mockSettingsValues = (overrides?: {
    freeShipThreshold?: number;
    applyChannels?: string[];
    baseFee?: number;
  }) => {
    const {
      freeShipThreshold = 0,
      applyChannels = [],
      baseFee = 30000,
    } = overrides ?? {};
    settings.get.mockImplementation((key: string) => {
      if (key === 'shipping.freeShipThreshold') {
        return Promise.resolve(freeShipThreshold);
      }
      if (key === 'shipping.applyChannels') {
        return Promise.resolve(applyChannels);
      }
      if (key === 'shipping.baseFee') {
        return Promise.resolve(baseFee);
      }
      return Promise.resolve(undefined);
    });
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PricingService,
        {
          provide: SettingsService,
          useValue: settings,
        },
      ],
    }).compile();

    service = moduleRef.get(PricingService);
    settings.get.mockReset();
  });

  it('applies free shipping when channel matches and subtotal is above threshold', async () => {
    mockSettingsValues({ freeShipThreshold: 500000, applyChannels: ['ONLINE'] });

    const result = await service.calculateTotals({
      channel: 'ONLINE',
      subtotal: 600000,
    });

    expect(result).toEqual({ shippingFee: 0, freeShipApplied: true });
  });

  it('returns default shipping fee when threshold not met', async () => {
    mockSettingsValues({ freeShipThreshold: 500000, applyChannels: ['ONLINE'] });

    const result = await service.calculateTotals({
      channel: 'POS',
      subtotal: 400000,
    });

    expect(result).toEqual({ shippingFee: 30000, freeShipApplied: false });
  });
});
