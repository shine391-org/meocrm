import { getAuthHeaders } from './shared';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:2003/api').replace(/\/$/, '');

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organization: {
    id: string;
    name: string;
    code: string;
  };
}

interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  let data;
  try {
    data = await response.json();
  } catch (e) {
    const text = await response.text();
    const error = new Error(`Failed to parse JSON response: ${text}`) as Error & { body?: unknown; status?: number };
    error.body = text;
    error.status = response.status;
    throw error;
  }

  if (!response.ok) {
    const message = (data as { message?: string })?.message ?? 'Có lỗi xảy ra';
    const error = new Error(message) as Error & { body?: unknown; status?: number };
    error.body = data;
    error.status = response.status;
    throw error;
  }
  return data as T;
};

export async function loginApi(payload: { email: string; password: string }): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  return handleResponse<AuthResponse>(response);
}

export async function registerApi(payload: {
  name: string;
  email: string;
  password: string;
  organizationCode: string;
}): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  return handleResponse<AuthResponse>(response);
}

export async function refreshSessionApi() {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  return handleResponse<{ accessToken: string; refreshToken: string }>(response);
}

export async function fetchCurrentUser() {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: getAuthHeaders({ includeJson: false }),
  });
  return handleResponse<AuthUser>(response);
}

export async function logoutApi() {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  return handleResponse<{ message: string }>(response);
}
