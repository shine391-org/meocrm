import { getAuthHeaders } from './shared';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:2003').replace(/\/$/, '');

export interface CreatePosOrderPayload {
  branchId: string;
  customerId: string;
  items: { productId: string; quantity: number; variantId?: string | null }[];
  paymentMethod: string;
  channel?: string;
  discount?: number;
  shipping?: number;
  notes?: string;
  isPaid?: boolean;
  paidAmount?: number;
}

interface OrderResponse<T = unknown> {
  data?: T;
  warnings?: unknown[];
  message?: string;
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  const parsed = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    const message = parsed?.message ?? 'Không thể tạo đơn hàng';
    throw new Error(message);
  }

  return (parsed?.data ?? parsed) as T;
};

export async function createPosOrder(payload: CreatePosOrderPayload) {
  const response = await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ ...payload, channel: payload.channel ?? 'POS' }),
  });

  return handleResponse<OrderResponse>(response);
}
