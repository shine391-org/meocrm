import { Test } from '@nestjs/testing';
import { PricingService } from './pricing.service';
import { SettingsService } from '../modules/settings/settings.service';

describe('PricingService', () => {
  let service: PricingService;
  const settings = {
    get: jest.fn(),
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
    settings.get.mockResolvedValueOnce(500000).mockResolvedValueOnce(['ONLINE']);

    const result = await service.calculateTotals({
      channel: 'ONLINE',
      subtotal: 600000,
    });

    expect(result).toEqual({ shippingFee: 0, freeShipApplied: true });
  });

  it('returns default shipping fee when threshold not met', async () => {
    settings.get.mockResolvedValueOnce(500000).mockResolvedValueOnce(['ONLINE']);

    const result = await service.calculateTotals({
      channel: 'POS',
      subtotal: 400000,
    });

    expect(result).toEqual({ shippingFee: 30000, freeShipApplied: false });
  });
});
