import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { OrganizationId } from '../../common/decorators/organization-id.decorator';
import { SettingsService } from './settings.service';

const FALLBACK_SHIPPING_FEE = 30000;
const FALLBACK_TAX_RATE = 0.1;

@UseGuards(JwtAuthGuard, OrganizationGuard)
@Controller('pos/settings')
export class PosSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getPosSettings(@OrganizationId() organizationId: string) {
    const [taxRateValue, defaultFee, baseFee] = await Promise.all([
      this.settingsService.getForOrganization<number>(
        organizationId,
        'pricing.taxRate',
        FALLBACK_TAX_RATE,
      ),
      this.settingsService.getForOrganization<number>(
        organizationId,
        'shipping.defaultFee',
        undefined,
      ),
      this.settingsService.getForOrganization<number>(
        organizationId,
        'shipping.baseFee',
        FALLBACK_SHIPPING_FEE,
      ),
    ]);

    const normalizedTaxRate =
      typeof taxRateValue === 'number' && Number.isFinite(taxRateValue) && taxRateValue >= 0
        ? taxRateValue
        : FALLBACK_TAX_RATE;
    const normalizedShipping =
      typeof defaultFee === 'number'
        ? defaultFee
        : typeof baseFee === 'number'
          ? baseFee
          : FALLBACK_SHIPPING_FEE;

    return {
      data: {
        taxRate: normalizedTaxRate,
        shippingFee: normalizedShipping,
      },
    };
  }
}
