import { Injectable } from '@nestjs/common';
import { SettingsService } from '../modules/settings/settings.service';

export interface ShippingFeeInput {
  organizationId: string;
  weight?: number; // grams
  distanceKm?: number;
  serviceType?: string;
  channel?: string;
  partnerId?: string;
  overrideFee?: number;
}

export interface ShippingFeeResult {
  shippingFee: number;
  weightSurcharge: number;
  channelMultiplier: number;
  breakdown: ShippingFeeBreakdown;
}

interface ShippingPartnerRule {
  baseFee?: number;
  weightRate?: number;
  distanceRate?: number;
  serviceTypes?: Record<string, { multiplier?: number }>;
}

export interface ShippingFeeBreakdown {
  baseFee: number;
  weightSurcharge: number;
  distanceFee: number;
  serviceMultiplier: number;
  channelMultiplier: number;
  partnerId?: string;
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
        breakdown: {
          baseFee: input.overrideFee!,
          weightSurcharge: 0,
          distanceFee: 0,
          serviceMultiplier: 1,
          channelMultiplier: 1,
          partnerId: input.partnerId,
        },
      };
    }

    const defaultBaseFee =
      (await this.settingsService.get<number>('shipping.baseFee', 30000)) ?? 30000;
    const defaultWeightRate =
      (await this.settingsService.get<number>('shipping.weightRate', 10000)) ?? 10000;
    const partnerRules =
      (await this.settingsService.get<Record<string, ShippingPartnerRule>>(
        'shipping.partners',
        {},
      )) ?? {};
    const partnerRule = input.partnerId
      ? partnerRules[input.partnerId]
      : undefined;

    const baseFee = partnerRule?.baseFee ?? defaultBaseFee;
    const weightRate = partnerRule?.weightRate ?? defaultWeightRate;
    const distanceRate = partnerRule?.distanceRate ?? 0;

    const weightKg = Math.ceil(Math.max(0, Number(input.weight ?? 0)) / 1000);
    const weightSurcharge = weightKg * weightRate;
    const distanceFee = Math.max(0, Number(input.distanceKm ?? 0)) * distanceRate;

    let calculated = baseFee + weightSurcharge + distanceFee;

    const serviceType = input.serviceType ?? 'standard';
    const serviceMultiplier =
      partnerRule?.serviceTypes?.[serviceType]?.multiplier ?? 1;
    calculated *= serviceMultiplier;

    const channelMultipliers =
      (await this.settingsService.get<Record<string, number>>(
        'shipping.channelMultipliers',
        {},
      )) ?? {};
    const channelMultiplier =
      input.channel && channelMultipliers[input.channel]
        ? channelMultipliers[input.channel]
        : 1;

    calculated *= channelMultiplier;

    const shippingFee = Math.max(0, Math.round(calculated));

    return {
      shippingFee,
      weightSurcharge,
      channelMultiplier,
      breakdown: {
        baseFee,
        weightSurcharge,
        distanceFee,
        serviceMultiplier,
        channelMultiplier,
        partnerId: input.partnerId,
      },
    };
  }
}
