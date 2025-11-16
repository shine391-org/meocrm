import { OpenAPI } from '@meocrm/api-client';
import { getBrowserToken } from '@/lib/auth/token';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

if (API_BASE_URL && OpenAPI.BASE !== API_BASE_URL) {
  OpenAPI.BASE = API_BASE_URL;
}

OpenAPI.HEADERS = async () => {
  const headers: Record<string, string> = {};
  const token = getBrowserToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (typeof window !== 'undefined') {
    const organizationId = window.localStorage?.getItem('organizationId');
    if (organizationId) {
      headers['x-organization-id'] = organizationId;
    }
  }

  return headers;
};

export * from '@meocrm/api-client';
export { OpenAPI };
