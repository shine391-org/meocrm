import { OpenAPI } from '@meocrm/api-client';
import { getBrowserToken, getOrganizationId } from '@/lib/auth/token';

// Delay validation until runtime to allow build-time SSG
// The API URL will be validated when making actual API calls (see OpenAPI.HEADERS below)
OpenAPI.BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '';

OpenAPI.HEADERS = async () => {
  // Validate at runtime when actually making API calls
  if (!OpenAPI.BASE) {
    throw new Error('NEXT_PUBLIC_API_URL is not defined. Please set it in your environment.');
  }

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
