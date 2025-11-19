import { getAuthHeaders } from './shared';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:2003').replace(/\/$/, '');

export type PosSettings = {
  taxRate: number;
  shippingFee: number;
};

type PosSettingsResponse = {
  data: PosSettings;
};

export async function fetchPosSettings(): Promise<PosSettings> {
  const response = await fetch(`${API_BASE_URL}/pos/settings`, {
    headers: getAuthHeaders(),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Không thể tải cấu hình POS');
  }

  const payload = (await response.json()) as PosSettingsResponse;
  return payload.data;
}
