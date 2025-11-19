'use client';

import { Badge } from '@/components/ui/badge';
import { getOrderStatusLabel, getOrderStatusVariant } from '@/lib/orders';

type OrderStatusBadgeProps = {
  status?: string | null;
  className?: string;
};

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  return (
    <Badge variant={getOrderStatusVariant(status)} className={className}>
      {getOrderStatusLabel(status)}
    </Badge>
  );
}
