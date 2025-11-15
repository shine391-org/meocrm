import { OpenAPI } from '@meocrm/api-client';
import { getBrowserToken, getOrganizationId } from '@/lib/auth/token';

const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
if (!rawBaseUrl) {
  throw new Error('NEXT_PUBLIC_API_URL is not defined. Please set it in your environment.');
}
try {
  // Validate that the URL is well-formed.
  new URL(rawBaseUrl);
} catch (error) {
  throw new Error(`NEXT_PUBLIC_API_URL is invalid: ${(error as Error).message}`);
}

if (OpenAPI.BASE !== rawBaseUrl) {
  OpenAPI.BASE = rawBaseUrl;
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
