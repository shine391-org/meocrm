const ORGANIZATION_ID_KEY = 'organizationId';

const isBrowser = () => typeof window !== 'undefined';

// In-memory storage for access token (not persisted to localStorage)
let accessTokenMemory: string | null = null;

/**
 * Get the access token from memory.
 * Access tokens are NOT persisted to localStorage for security.
 * They are stored in memory and cleared on page refresh.
 */
export const getBrowserToken = (): string | null => {
  if (!isBrowser()) {
    return null;
  }
  return accessTokenMemory;
};

/**
 * Store access token in memory only (cookie+memory pattern).
 * The refresh token is stored in an HttpOnly cookie by the backend.
 * Access token is ephemeral and will be cleared on page refresh.
 */
export const persistSession = ({
  accessToken,
  organizationId,
}: {
  accessToken: string;
  organizationId?: string;
}) => {
  if (!isBrowser()) {
    return;
  }
  // Store access token in memory only (NOT in localStorage)
  accessTokenMemory = accessToken;

  // Organization ID can be stored in localStorage as it's not sensitive
  if (organizationId) {
    window.localStorage.setItem(ORGANIZATION_ID_KEY, organizationId);
  }
};

/**
 * Clear the in-memory access token and organization ID.
 * The HttpOnly refresh token cookie is cleared by the backend on logout.
 */
export const clearSession = (): void => {
  if (!isBrowser()) {
    return;
  }
  accessTokenMemory = null;
  window.localStorage.removeItem(ORGANIZATION_ID_KEY);
};

export const setOrganizationId = (organizationId: string) => {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.setItem(ORGANIZATION_ID_KEY, organizationId);
};

export const getOrganizationId = (): string | null => {
  if (!isBrowser()) {
    return null;
  }
  return window.localStorage.getItem(ORGANIZATION_ID_KEY);
};
