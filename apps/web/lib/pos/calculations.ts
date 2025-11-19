import { CartLine } from '@/lib/pos/types';

const DEFAULT_TAX_RATE = Number(process.env.NEXT_PUBLIC_POS_TAX_RATE ?? '0.1');

export interface CartTotals {
  subtotal: number;
  discount: number;
  surcharge: number;
  total: number;
  itemCount: number;
  taxableSubtotal: number;
  itemDiscountTotal: number;
  taxRate: number;
  taxEstimate: number;
  lossSaleLineIds: string[];
}

export function calculatePosTotals(
  cart: CartLine[],
  discount: number,
  surcharge: number,
  taxRate: number = DEFAULT_TAX_RATE,
): CartTotals {
  let subtotal = 0;
  let itemDiscountTotal = 0;
  let taxableSubtotal = 0;
  const lossSaleLineIds: string[] = [];

  cart.forEach((line) => {
    const lineSubtotal = line.price * line.quantity;
    subtotal += lineSubtotal;

    const unitDiscount = resolveUnitDiscount(line);
    const lineDiscount = Math.min(lineSubtotal, unitDiscount * line.quantity);
    itemDiscountTotal += lineDiscount;

    const netUnitPrice = Math.max(0, line.price - unitDiscount);
    const costPrice = Number(line.costPrice ?? 0);
    if (costPrice > 0 && netUnitPrice < costPrice) {
      lossSaleLineIds.push(line.id);
    }

    if (!line.taxExempt) {
      taxableSubtotal += Math.max(0, lineSubtotal - lineDiscount);
    }
  });

  const normalizedDiscount = clampNumber(discount, 0, subtotal);
  const normalizedSurcharge = Math.max(0, surcharge);
  const total = subtotal - normalizedDiscount + normalizedSurcharge;
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const taxBase = Math.max(0, taxableSubtotal);
  const taxEstimate = taxBase * taxRate;

  return {
    subtotal,
    discount: normalizedDiscount,
    surcharge: normalizedSurcharge,
    total,
    itemCount,
    taxableSubtotal: taxBase,
    itemDiscountTotal,
    taxRate,
    taxEstimate,
    lossSaleLineIds,
  };
}

export function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

export function resolveUnitDiscount(line: CartLine): number {
  if (!line.discountType || line.discountValue === undefined) {
    return 0;
  }
  if (line.discountType === 'PERCENT') {
    const percent = Math.max(0, Math.min(100, line.discountValue));
    return Math.min(line.price, (line.price * percent) / 100);
  }
  return Math.min(line.price, Math.max(0, line.discountValue));
}
