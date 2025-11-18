import { Injectable } from '@nestjs/common';
import { SettingsService } from '../modules/settings/settings.service';

export interface ShippingFeeInput {
  organizationId: string;
  weight?: number; // grams
  channel?: string;
  partnerId?: string;
  overrideFee?: number;
}

export interface ShippingFeeResult {
  shippingFee: number;
  weightSurcharge: number;
  channelMultiplier: number;
}

@Injectable()
export class ShippingFeeService {
  constructor(private readonly settingsService: SettingsService) {}

  async calculate(input: ShippingFeeInput): Promise<ShippingFeeResult> {
    if (Number.isFinite(input.overrideFee) && input.overrideFee! >= 0) {
      return {
        shippingFee: input.overrideFee!,
        weightSurcharge: 0,
        channelMultiplier: 1,
      };
    }

    const baseFee = (await this.settingsService.get<number>('shipping.baseFee', 30000)) ?? 30000;
    const perKgFee = (await this.settingsService.get<number>('shipping.weightRate', 10000)) ?? 10000;
    const freeThreshold = (await this.settingsService.get<number>('shipping.freeThreshold', 0)) ?? 0;
    const channelMultipliers =
      (await this.settingsService.get<Record<string, number>>('shipping.channelMultipliers', {})) ?? {};

    const weight = Math.max(0, Number(input.weight ?? 0));
    const weightKg = Math.ceil(weight / 1000);
    const weightSurcharge = weightKg * perKgFee;
    const channelMultiplier = input.channel && channelMultipliers[input.channel]
      ? channelMultipliers[input.channel]
      : 1;

    let calculated = baseFee + weightSurcharge;

    if (channelMultiplier !== 1) {
      calculated = Math.round(calculated * channelMultiplier);
    }

    if (input.channel && freeThreshold > 0 && channelMultipliers[input.channel]) {
      // the freeThreshold is treated as an override for channels with mapping
      if (calculated >= freeThreshold) {
        calculated = 0;
      }
    }

    return {
      shippingFee: calculated,
      weightSurcharge,
      channelMultiplier,
    };
  }
}
