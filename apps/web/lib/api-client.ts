import { OpenAPI } from '@meocrm/api-client';
import { getBrowserToken, getOrganizationId } from '@/lib/auth/token';

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

  const organizationId = getOrganizationId();
  if (organizationId) {
    headers['x-organization-id'] = organizationId;
  }

  return headers;
};

export * from '@meocrm/api-client';
export { OpenAPI };
