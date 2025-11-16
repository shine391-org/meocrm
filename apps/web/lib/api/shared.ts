// apps/web/lib/api/shared.ts
import { getBrowserToken, getOrganizationId } from '@/lib/auth/token';

export const getAuthHeaders = (options: { includeJson?: boolean } = {}) => {
  const headers: Record<string, string> = {};
  if (options.includeJson ?? true) {
    headers['Content-Type'] = 'application/json';
  }

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
