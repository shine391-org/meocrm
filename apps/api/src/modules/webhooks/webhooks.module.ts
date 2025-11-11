import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebhookHMACGuard } from './webhook-hmac.guard';
import { EventsModule } from '../events/events.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { OrdersModule } from '../../orders/orders.module';

@Module({
  imports: [EventsModule, PrismaModule, OrdersModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhookHMACGuard],
  exports: [WebhooksService],
})
export class WebhooksModule {}
