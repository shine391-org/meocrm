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
  });

  it('applies weight surcharge and multiplier', async () => {
    settings.get
      .mockResolvedValueOnce(20000)
      .mockResolvedValueOnce(8000)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce({ express: 1.5 });

    const result = await service.calculate({ organizationId: 'o1', weight: 2300, channel: 'express' });
    expect(result.shippingFee).toBeGreaterThan(0);
    expect(result.channelMultiplier).toBe(1.5);
  });

  it('applies free threshold for mapped channel', async () => {
    settings.get
      .mockResolvedValueOnce(18000)
      .mockResolvedValueOnce(4000)
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce({ express: 1.5 });

    const result = await service.calculate({ organizationId: 'o1', weight: 1000, channel: 'express' });
    expect(result.shippingFee).toBe(0);
  });
});
