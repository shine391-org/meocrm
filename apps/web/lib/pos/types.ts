export type SaleMode = 'quick' | 'standard' | 'delivery';

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  sellPrice?: number;
  costPrice?: number;
  stock: number;
  category?: string | { name: string };
  unit: string;
  unitOfMeasure?: string;
  variant?: string;
  accent?: string;
  tags?: string[];
}

export interface CartLine {
  id: string;
  productId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  unit: string;
  costPrice?: number;
  variant?: string;
  variantId?: string;
  discountType?: 'PERCENT' | 'FIXED';
  discountValue?: number;
  taxExempt?: boolean;
}

export interface CustomerSummary {
  id: string;
  name: string;
  phone?: string | null;
  tier?: string | null;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  tier: 'VIP' | 'Regular' | 'Wholesale';
  lastOrderDays: number;
  address: string;
}

export interface Invoice {
  id: string;
  label: string;
  cart: CartLine[];
  note: string;
  priceBook: 'standard' | 'vip' | 'wholesale';
  mode: SaleMode;
  customerId?: string;
  customerSummary?: CustomerSummary;
  discount: number;
  surcharge: number;
  shippingPartner?: string;
}
