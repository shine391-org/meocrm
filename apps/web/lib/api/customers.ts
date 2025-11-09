// apps/web/lib/api/customers.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:2003/api';

const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export async function getCustomers(page: number = 1, limit: number = 20, search: string = '') {
  const response = await fetch(`${API_BASE_URL}/customers?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, { headers: getAuthHeaders() });
  if (!response.ok) {
    throw new Error('Failed to fetch customers');
  }
  return response.json();
}

export async function getCustomer(id: string) {
  const response = await fetch(`${API_BASE_URL}/customers/${id}`, { headers: getAuthHeaders() });
  if (!response.ok) {
    throw new Error('Customer not found');
  }
  return response.json();
}

export async function createCustomer(data: any) {
  const response = await fetch(`${API_BASE_URL}/customers`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create customer');
  }
  return response.json();
}

export async function updateCustomer(id: string, data: any) {
  const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update customer');
  }
  return response.json();
}

export async function deleteCustomer(id: string) {
  const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete customer');
  }
  return response.json();
}
