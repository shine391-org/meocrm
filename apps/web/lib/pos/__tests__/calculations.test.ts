import { calculatePosTotals, clampNumber } from '@/lib/pos/calculations';
import { CartLine } from '@/lib/pos/types';

const demoLines: CartLine[] = [
  {
    id: 'line-1',
    productId: 'PRD-001',
    name: 'Sữa tươi',
    sku: 'MILK',
    price: 38000,
    quantity: 2,
    unit: 'chai',
  },
  {
    id: 'line-2',
    productId: 'PRD-002',
    name: 'Gạo thơm',
    sku: 'RICE',
    price: 25000,
    quantity: 1,
    unit: 'kg',
  },
];

describe('calculatePosTotals', () => {
  it('returns aggregated totals with discount and surcharge', () => {
    const totals = calculatePosTotals(demoLines, 10000, 5000);
    expect(totals.subtotal).toBe(101000);
    expect(totals.discount).toBe(10000);
    expect(totals.surcharge).toBe(5000);
    expect(totals.total).toBe(96000);
    expect(totals.itemCount).toBe(3);
  });

  it('clamps the discount to subtotal and floors surcharge at zero', () => {
    const totals = calculatePosTotals(demoLines, 999999, -4000);
    expect(totals.subtotal).toBe(101000);
    expect(totals.discount).toBe(101000);
    expect(totals.surcharge).toBe(0);
    expect(totals.total).toBe(0);
  });
});

describe('clampNumber', () => {
  it('respects min/max boundaries', () => {
    expect(clampNumber(10, 0, 5)).toBe(5);
    expect(clampNumber(-3, 0, 5)).toBe(0);
    expect(clampNumber(3, 0, 5)).toBe(3);
  });
});
