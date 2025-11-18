import { Module } from '@nestjs/common';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../modules/settings/settings.module';
import { ShippingFeeService } from './shipping-fee.service';

@Module({
  imports: [PrismaModule, SettingsModule],
  controllers: [ShippingController],
  providers: [ShippingService, ShippingFeeService],
  exports: [ShippingService],
})
export class ShippingModule {}
