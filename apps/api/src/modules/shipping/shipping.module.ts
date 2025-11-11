
import { Module } from '@nestjs/common';
import { ShippingWebhooksController } from './shipping-webhooks.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { OrdersModule } from '../../orders/orders.module';

@Module({
  imports: [PrismaModule, OrdersModule],
  controllers: [ShippingWebhooksController],
})
export class ShippingModule {}
