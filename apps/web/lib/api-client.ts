import { OpenAPI } from '@meocrm/api-client';
import { getBrowserToken } from '@/lib/auth/token';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

if (API_BASE_URL && OpenAPI.BASE !== API_BASE_URL) {
  OpenAPI.BASE = API_BASE_URL;
}

OpenAPI.TOKEN = async () => {
  const token = getBrowserToken();
  return token ?? undefined;
};

OpenAPI.HEADERS = async () => {
  if (typeof window === 'undefined') {
    return {};
  }

  const organizationId = window.localStorage?.getItem('organizationId');
  return organizationId ? { 'x-organization-id': organizationId } : {};
};

export * from '@meocrm/api-client';
export { OpenAPI };
