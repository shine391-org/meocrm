import { Module } from '@nestjs/common';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../modules/settings/settings.module';
import { ShippingFeeService } from './shipping-fee.service';
import { OrdersModule } from '../orders/orders.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [PrismaModule, SettingsModule, OrdersModule, InventoryModule, CommonModule],
  controllers: [ShippingController],
  providers: [ShippingService, ShippingFeeService],
  exports: [ShippingService],
})
export class ShippingModule {}
