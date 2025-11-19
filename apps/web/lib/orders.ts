import type { BadgeProps } from '@/components/ui/badge';

export const ORDER_STATUSES = [
  { value: 'PENDING', label: 'Chờ xử lý' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'PROCESSING', label: 'Đang chuẩn bị' },
  { value: 'SHIPPED', label: 'Đã xuất kho' },
  { value: 'DELIVERED', label: 'Đã giao' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã hủy' },
] as const;

export const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Tiền mặt' },
  { value: 'CARD', label: 'Thẻ' },
  { value: 'E_WALLET', label: 'Ví điện tử' },
  { value: 'BANK_TRANSFER', label: 'Chuyển khoản' },
  { value: 'COD', label: 'COD' },
] as const;

const ORDER_STATUS_BADGE: Record<string, BadgeProps['variant']> = {
  PENDING: 'outline',
  CONFIRMED: 'secondary',
  PROCESSING: 'default',
  SHIPPED: 'secondary',
  DELIVERED: 'secondary',
  COMPLETED: 'default',
  CANCELLED: 'destructive',
};

export const getOrderStatusLabel = (status?: string | null) => {
  if (!status) return 'Không xác định';
  return ORDER_STATUSES.find((item) => item.value === status)?.label ?? status;
};

export const getPaymentMethodLabel = (method?: string | null) => {
  if (!method) return 'Không xác định';
  return PAYMENT_METHODS.find((item) => item.value === method)?.label ?? method;
};

export const getOrderStatusVariant = (status?: string | null): BadgeProps['variant'] => {
  if (!status) return 'outline';
  return ORDER_STATUS_BADGE[status] ?? 'outline';
};

export const isOrderTerminalStatus = (status?: string | null) => {
  if (!status) return false;
  return status === 'COMPLETED' || status === 'CANCELLED';
};
