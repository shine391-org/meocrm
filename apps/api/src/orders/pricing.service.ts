import { Injectable, BadRequestException } from '@nestjs/common';
import { SettingsService, isNumberSetting, isStringArraySetting } from '../modules/settings/settings.service';

interface OrderDraft {
  channel?: string;
  subtotal: number;
  // ... other order properties
}

interface PricingResult {
  shippingFee: number;
  freeShipApplied: boolean;
  // ... other calculated properties
}

const FALLBACK_SHIPPING_FEE = 30000;

@Injectable()
export class PricingService {
  constructor(private readonly settingsService: SettingsService) {}

  async calculateTotals(orderDraft: OrderDraft): Promise<PricingResult> {
    if (typeof orderDraft.subtotal !== 'number' || !Number.isFinite(orderDraft.subtotal) || orderDraft.subtotal < 0) {
      throw new BadRequestException('Order subtotal must be a non-negative number');
    }

    const freeShipThreshold = await this.settingsService.get<number>('shipping.freeShipThreshold', 0, isNumberSetting);
    const applyChannels = await this.settingsService.get<string[]>(
      'shipping.applyChannels',
      [],
      isStringArraySetting,
    );

    const configuredShippingFee = await this.settingsService.get<number>(
      'shipping.baseFee',
      FALLBACK_SHIPPING_FEE,
      isNumberSetting,
    );

    // Placeholder for shipping calculation from a provider like GHN/GHTK
    let calculatedShippingFee = configuredShippingFee;

    let freeShipApplied = false;

    if (
      orderDraft.channel &&
      applyChannels.includes(orderDraft.channel) &&
      orderDraft.subtotal >= freeShipThreshold
    ) {
      calculatedShippingFee = 0;
      freeShipApplied = true;
    }

    return {
      shippingFee: calculatedShippingFee,
      freeShipApplied: freeShipApplied,
    };
  }
}
