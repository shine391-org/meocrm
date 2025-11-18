import { CartLine } from '@/lib/pos/types';

export interface CartTotals {
  subtotal: number;
  discount: number;
  surcharge: number;
  total: number;
  itemCount: number;
}

export function calculatePosTotals(
  cart: CartLine[],
  discount: number,
  surcharge: number,
): CartTotals {
  const subtotal = cart.reduce(
    (sum, line) => sum + line.price * line.quantity,
    0,
  );

  const normalizedDiscount = clampNumber(discount, 0, subtotal);
  const normalizedSurcharge = Math.max(0, surcharge);
  const total = subtotal - normalizedDiscount + normalizedSurcharge;
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  return {
    subtotal,
    discount: normalizedDiscount,
    surcharge: normalizedSurcharge,
    total,
    itemCount,
  };
}

export function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}
