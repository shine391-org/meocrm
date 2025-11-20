import { Injectable, BadRequestException } from '@nestjs/common';
import { SettingsService } from '../modules/settings/settings.service';

interface OrderDraft {
  channel?: string;
  subtotal: number;
  taxableSubtotal?: number;
  orderDiscount?: number;
  itemDiscountTotal?: number;
}

interface PricingResult {
  shippingFee: number;
  freeShipApplied: boolean;
  taxRate: number;
  taxAmount: number;
  taxBreakdown: {
    taxableAmount: number;
    rate: number;
  };
}

@Injectable()
export class PricingService {
  constructor(private readonly settingsService: SettingsService) { }

  async calculateTotals(orderDraft: OrderDraft): Promise<PricingResult> {
    if (typeof orderDraft.subtotal !== 'number' || !Number.isFinite(orderDraft.subtotal) || orderDraft.subtotal < 0) {
      throw new BadRequestException('Order subtotal must be a non-negative number');
    }

    const fallbackShippingFee = 30000;
    const configuredShippingFee =
      (await this.settingsService.get<number>('shipping.defaultFee')) ??
      (await this.settingsService.get<number>('shipping.baseFee', fallbackShippingFee)) ??
      fallbackShippingFee;

    let calculatedShippingFee = configuredShippingFee;
    let freeShipApplied = false;

    // Check for free shipping eligibility
    const freeShipThreshold = await this.settingsService.get<number>('shipping.freeShipThreshold');
    const applyChannels = await this.settingsService.get<string[]>('shipping.applyChannels');

    if (freeShipThreshold && orderDraft.subtotal >= freeShipThreshold) {
      if (!applyChannels || applyChannels.length === 0 || (orderDraft.channel && applyChannels.includes(orderDraft.channel))) {
        calculatedShippingFee = 0;
        freeShipApplied = true;
      }
    }

    const configuredTaxRate =
      (await this.settingsService.get<number>('pricing.taxRate', 0.1)) ?? 0.1;
    const taxRate = Number.isFinite(configuredTaxRate) && configuredTaxRate >= 0 ? configuredTaxRate : 0.1;
    const itemDiscountTotal = Number(orderDraft.itemDiscountTotal ?? 0);
    const orderDiscount = Number(orderDraft.orderDiscount ?? 0);
    const computedTaxable =
      typeof orderDraft.taxableSubtotal === 'number'
        ? orderDraft.taxableSubtotal
        : Math.max(orderDraft.subtotal - itemDiscountTotal - orderDiscount, 0);
    const taxAmount = Math.max(0, Number(computedTaxable)) * taxRate;

    return {
      shippingFee: calculatedShippingFee,
      freeShipApplied: freeShipApplied,
      taxRate,
      taxAmount,
      taxBreakdown: {
        taxableAmount: Math.max(0, Number(computedTaxable)),
        rate: taxRate,
      },
    };
  }
}
