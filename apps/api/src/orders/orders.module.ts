import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../modules/settings/settings.module';
import { PricingService } from './pricing.service';
import { InventoryModule } from '../inventory/inventory.module';
import { OrderAutomaticActionsService } from './order-automatic-actions.service';

@Module({
  imports: [PrismaModule, SettingsModule, InventoryModule],
  controllers: [OrdersController],
  providers: [OrdersService, PricingService, OrderAutomaticActionsService],
  exports: [OrdersService],
})
export class OrdersModule {}
