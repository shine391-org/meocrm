import { getAuthHeaders } from './shared';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:2003').replace(/\/$/, '');

export interface BranchSummary {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
}

export async function fetchBranches() {
  const response = await fetch(`${API_BASE_URL}/branches`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Không thể tải danh sách chi nhánh');
  }

  const payload = (await response.json()) as BranchSummary[];
  return payload;
}
