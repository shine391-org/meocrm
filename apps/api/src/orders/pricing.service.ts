import { Injectable, BadRequestException } from '@nestjs/common';
import { SettingsService } from '../modules/settings/settings.service';

interface OrderDraft {
  channel?: string;
  subtotal: number;
  // ... other order properties
}

interface PricingResult {
  shippingFee: number;
  freeShipApplied: boolean;
  taxRate: number;
  taxAmount: number;
  // ... other calculated properties
}

@Injectable()
export class PricingService {
  constructor(private readonly settingsService: SettingsService) {}

  async calculateTotals(orderDraft: OrderDraft): Promise<PricingResult> {
    if (typeof orderDraft.subtotal !== 'number' || !Number.isFinite(orderDraft.subtotal) || orderDraft.subtotal < 0) {
      throw new BadRequestException('Order subtotal must be a non-negative number');
    }

    const freeShipThreshold =
      (await this.settingsService.get<number>('shipping.freeShipThreshold', 0)) ?? 0;
    const applyChannels =
      (await this.settingsService.get<string[]>('shipping.applyChannels', [])) ?? [];

    const fallbackShippingFee = 30000;
    const configuredShippingFee =
      (await this.settingsService.get<number>('shipping.defaultFee')) ??
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

    const configuredTaxRate =
      (await this.settingsService.get<number>('pricing.taxRate', 0.1)) ?? 0.1;
    const taxRate = Number.isFinite(configuredTaxRate) && configuredTaxRate >= 0 ? configuredTaxRate : 0.1;
    const taxAmount = Number(orderDraft.subtotal) * taxRate;

    return {
      shippingFee: calculatedShippingFee,
      freeShipApplied: freeShipApplied,
      taxRate,
      taxAmount,
    };
  }
}
