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
    settings.get
      .mockResolvedValueOnce(500000) // shipping.freeShipThreshold
      .mockResolvedValueOnce(['ONLINE']) // shipping.applyChannels
      .mockResolvedValueOnce(undefined) // shipping.defaultFee
      .mockResolvedValueOnce(30000) // shipping.baseFee
      .mockResolvedValueOnce(0.1); // pricing.taxRate

    const result = await service.calculateTotals({
      channel: 'ONLINE',
      subtotal: 600000,
      taxableSubtotal: 600000,
    });

    expect(result).toEqual({
      shippingFee: 0,
      freeShipApplied: true,
      taxRate: 0.1,
      taxAmount: 60000,
      taxBreakdown: { taxableAmount: 600000, rate: 0.1 },
    });
  });

  it('returns default shipping fee when threshold not met', async () => {
    settings.get
      .mockResolvedValueOnce(500000)
      .mockResolvedValueOnce(['ONLINE'])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(0.1);

    const result = await service.calculateTotals({
      channel: 'POS',
      subtotal: 400000,
      taxableSubtotal: 300000,
      orderDiscount: 100000,
      itemDiscountTotal: 0,
    });

    expect(result).toEqual({
      shippingFee: 30000,
      freeShipApplied: false,
      taxRate: 0.1,
      taxAmount: 30000,
      taxBreakdown: { taxableAmount: 300000, rate: 0.1 },
    });
  });
});
