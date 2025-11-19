import { getAuthHeaders } from './shared';
import type { BranchSummary } from './branches';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:2003').replace(/\/$/, '');

export type OrderTaxBreakdown = {
  taxableAmount: number;
  rate: number;
};

export type OrderListItem = {
  id: string;
  code: string;
  status: string;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  taxableSubtotal?: number;
  taxBreakdown?: OrderTaxBreakdown | null;
  paymentMethod: string;
  isPaid: boolean;
  paidAmount: number;
  paidAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  branch?: BranchSummary | null;
  customer?: {
    id: string;
    name?: string | null;
    phone?: string | null;
  } | null;
  itemsCount?: number;
};

export type OrdersMeta = {
  total: number;
  page: number;
  limit: number;
  lastPage: number;
};

export type OrdersQuery = {
  page?: number;
  limit?: number;
  status?: string;
  paymentMethod?: string;
  branchId?: string;
  fromDate?: string;
  toDate?: string;
};

type OrdersResponse = {
  data: OrderListItem[];
  meta: OrdersMeta;
};

type OrderDetailResponse = {
  data: OrderListItem & {
    items?: Array<{
      id: string;
      productId: string;
      productName?: string;
      variantName?: string | null;
      quantity: number;
      price: number;
      total: number;
      netTotal?: number;
      discount?: number;
      discountType?: 'PERCENT' | 'FIXED' | null;
      discountValue?: number | null;
      isTaxExempt?: boolean;
    }>;
    notes?: string | null;
    customer?: OrderListItem['customer'] & {
      segment?: string | null;
      totalSpent?: number;
      totalOrders?: number;
      debt?: number;
      address?: string | null;
      province?: string | null;
      district?: string | null;
      ward?: string | null;
    };
  };
};

export type OrderDetail = OrderDetailResponse['data'];

export type CreatePosOrderPayload = {
  branchId: string;
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
    variantId?: string;
  }>;
  paymentMethod: 'CASH' | 'CARD' | 'E_WALLET' | 'BANK_TRANSFER' | 'COD';
  channel?: string;
  discount?: number;
  shipping?: number;
  notes?: string;
  isPaid?: boolean;
  paidAmount?: number;
};

const buildQuery = (query: OrdersQuery = {}) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    params.set(key, String(value));
  });
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
};

export async function fetchOrders(query: OrdersQuery = {}): Promise<OrdersResponse> {
  const response = await fetch(`${API_BASE_URL}/orders${buildQuery(query)}`, {
    headers: getAuthHeaders({ includeJson: false }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Không thể tải danh sách đơn hàng');
  }

  return response.json();
}

export async function fetchOrder(id: string): Promise<OrderDetail> {
  const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
    headers: getAuthHeaders({ includeJson: false }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Không thể tải chi tiết đơn hàng');
  }

  const payload = (await response.json()) as OrderDetailResponse;
  return payload.data;
}

export async function updateOrderStatus(id: string, status: string) {
  const response = await fetch(`${API_BASE_URL}/orders/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = (error as { message?: string })?.message ?? 'Không thể cập nhật trạng thái đơn hàng';
    throw new Error(message);
  }

  return response.json();
}

export async function requestOrderRefund(id: string) {
  const response = await fetch(`${API_BASE_URL}/orders/${id}/refund`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Không thể gửi yêu cầu hoàn tiền');
  }
  return response.json();
}

export async function approveOrderRefund(id: string) {
  const response = await fetch(`${API_BASE_URL}/orders/${id}/refund/approve`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Không thể duyệt hoàn tiền');
  }
  return response.json();
}

export async function rejectOrderRefund(id: string) {
  const response = await fetch(`${API_BASE_URL}/orders/${id}/refund/reject`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Không thể từ chối hoàn tiền');
  }
  return response.json();
}

export async function createPosOrder(payload: CreatePosOrderPayload) {
  const response = await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message =
      (error as { message?: string })?.message ?? 'Không thể tạo đơn POS';
    throw new Error(message);
  }

  const payloadResponse = (await response.json()) as OrderDetailResponse;
  return payloadResponse.data;
}
