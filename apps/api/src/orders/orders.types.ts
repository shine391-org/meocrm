import { OrderStatus } from '@prisma/client';

export type OrderWarningType = 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface OrderWarning {
  type: OrderWarningType;
  productId: string;
  variantId?: string | null;
  sku?: string | null;
  message: string;
  available: number;
  requested: number;
}

export interface OrderStatusChangedEvent {
  orderId: string;
  organizationId: string;
  previousStatus: OrderStatus;
  nextStatus: OrderStatus;
  userId?: string;
}

export interface OrderCreatedEvent {
  orderId: string;
  organizationId: string;
  userId?: string;
  warnings?: OrderWarning[];
}
