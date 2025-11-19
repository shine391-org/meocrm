import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InventoryService } from '../inventory/inventory.service';
import { OrdersService } from './orders.service';
import { OrderStatus } from '@prisma/client';
import { OrderStatusChangedEvent } from './orders.types';

@Injectable()
export class OrderAutomaticActionsService {
  private readonly logger = new Logger(OrderAutomaticActionsService.name);

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly ordersService: OrdersService,
  ) {}

  @OnEvent('orders.status.changed')
  async handleStatusChanged(event: OrderStatusChangedEvent) {
    if (!event) {
      return;
    }

    const actorId = event.userId ?? 'system-order-automation';

    if (event.nextStatus === OrderStatus.PROCESSING) {
      await this.safeExecute(
        'deductStockOnOrderProcessing',
        () =>
          this.inventoryService.deductStockOnOrderProcessing(
            event.orderId,
            event.organizationId,
            {
              userId: actorId,
              traceId: event.traceId,
            },
          ),
      );
    }

    if (
      event.nextStatus === OrderStatus.CANCELLED &&
      event.previousStatus === OrderStatus.PROCESSING
    ) {
      await this.safeExecute(
        'returnStockOnOrderCancel',
        () =>
          this.inventoryService.returnStockOnOrderCancel(
            event.orderId,
            event.organizationId,
            {
              userId: actorId,
              traceId: event.traceId,
            },
          ),
      );
    }

    if (event.nextStatus === OrderStatus.COMPLETED) {
      await this.safeExecute('finalizeOrderCompletion', () =>
        this.ordersService.finalizeOrderCompletion(
          event.orderId,
          event.organizationId,
        ),
      );
    }
  }

  private async safeExecute(
    label: string,
    handler: () => Promise<unknown>,
  ) {
    try {
      await handler();
    } catch (error) {
      this.logger.error(
        `Order automation error (${label})`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
