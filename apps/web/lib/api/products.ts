// apps/web/lib/api/products.ts
import { getAuthHeaders } from './shared';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:2003').replace(/\/$/, '');

export interface ProductListItem {
  id: string;
  sku: string;
  name: string;
  sellPrice?: number;
  price?: number;
  stock?: number;
  unit?: string | null;
  unitOfMeasure?: string | null;
  category?: { name?: string | null };
}

interface ProductListResponse {
  data?: {
    items?: ProductListItem[];
    pagination?: unknown;
  } | ProductListItem[];
  items?: ProductListItem[];
  meta?: unknown;
  pagination?: unknown;
}

export async function searchProducts(params: { page?: number; limit?: number; search?: string } = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);

  const url = `${API_BASE_URL}/products${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await fetch(url, { headers: getAuthHeaders() });
  if (!response.ok) {
    throw new Error('Không thể tải danh sách sản phẩm');
  }

  const payload = (await response.json()) as ProductListResponse;
  return payload;
}
