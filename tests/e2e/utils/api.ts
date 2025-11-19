import { APIRequestContext, expect } from '@playwright/test';
import { getApiBaseUrl, getTestCredentials } from './credentials';

export async function loginViaApi(request: APIRequestContext) {
  const { email, password } = getTestCredentials();
  const response = await request.post(`${getApiBaseUrl()}/auth/login`, {
    data: { email, password },
  });

  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<{
    accessToken: string;
    user: { organization: { id: string } };
  }>;
}

export function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function apiGet<T>(
  request: APIRequestContext,
  path: string,
  token: string,
) {
  const url = `${getApiBaseUrl()}${path}`;
  const response = await request.get(url, {
    headers: authHeaders(token),
  });
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`GET ${url} failed ${response.status()}: ${body}`);
  }
  return response.json() as Promise<T>;
}

export async function apiPost<T>(
  request: APIRequestContext,
  path: string,
  token: string,
  data: unknown,
) {
  const url = `${getApiBaseUrl()}${path}`;
  const response = await request.post(url, {
    headers: authHeaders(token),
    data,
  });
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`POST ${url} failed ${response.status()}: ${body}`);
  }
  return response.json() as Promise<T>;
}

export async function apiPatch<T>(
  request: APIRequestContext,
  path: string,
  token: string,
  data: unknown,
) {
  const url = `${getApiBaseUrl()}${path}`;
  const response = await request.patch(url, {
    headers: authHeaders(token),
    data,
  });
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`PATCH ${url} failed ${response.status()}: ${body}`);
  }
  return response.json() as Promise<T>;
}
