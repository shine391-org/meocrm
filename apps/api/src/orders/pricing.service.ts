import { Injectable } from '@nestjs/common';
import { SettingsService } from '../modules/settings/settings.service';

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

@Injectable()
export class PricingService {
  constructor(private readonly settingsService: SettingsService) {}

  async calculateTotals(orderDraft: OrderDraft): Promise<PricingResult> {
    const freeShipThreshold =
      (await this.settingsService.get<number>('shipping.freeShipThreshold', 0)) ?? 0;
    const applyChannels =
      (await this.settingsService.get<string[]>('shipping.applyChannels', [])) ?? [];

    const fallbackShippingFee = 30000;
    const configuredShippingFee =
      (await this.settingsService.get<number>('shipping.baseFee', fallbackShippingFee)) ??
      fallbackShippingFee;

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
