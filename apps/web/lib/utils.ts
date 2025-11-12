// apps/web/lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string | null | undefined, fallback = 'N/A'): string {
  if (amount === null || amount === undefined) {
    return fallback;
  }

  const numericAmount = typeof amount === 'string' ? Number(amount) : amount;
  if (typeof numericAmount !== 'number' || Number.isNaN(numericAmount)) {
    return fallback;
  }

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(numericAmount);
}

export function getSegmentVariant(segment: string | null | undefined): "default" | "secondary" | "outline" | "destructive" | null | undefined {
  switch (segment) {
    case 'VIP':
      return 'default';
    case 'Wholesale':
      return 'secondary';
    case 'Regular':
    default:
      return 'outline';
  }
}

export function formatAddress(customer: any): string {
  if (!customer) return 'Chưa có địa chỉ';
  const parts = [customer.address, customer.ward, customer.district, customer.province];
  return parts.filter(Boolean).join(', ') || 'Chưa có địa chỉ';
}
