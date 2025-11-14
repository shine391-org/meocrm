const ACCESS_TOKEN_KEY = 'accessToken';
const ORGANIZATION_ID_KEY = 'organizationId';
const REFRESH_TOKEN_COOKIE = 'meocrm_refresh_token';

const isBrowser = () => typeof window !== 'undefined';

export const getBrowserToken = (): string | null => {
  if (!isBrowser()) {
    return null;
  }

  const token = window.localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token || token === 'null' || token === 'undefined') {
    return null;
  }
  return token;
};

const setRefreshTokenCookie = (token: string) => {
  if (!isBrowser()) {
    return;
  }
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  document.cookie = `${REFRESH_TOKEN_COOKIE}=${token}; path=/; expires=${expires.toUTCString()}; SameSite=Strict; Secure`;
};

const getCookieValue = (key: string): string | null => {
  if (!isBrowser()) {
    return null;
  }
  const cookies = document.cookie.split('; ').map((entry) => entry.split('='));
  const match = cookies.find(([name]) => name === key);
  return match?.[1] ?? null;
};

export const getRefreshToken = (): string | null => {
  return getCookieValue(REFRESH_TOKEN_COOKIE);
};

export const persistSession = ({
  accessToken,
  refreshToken,
  organizationId,
}: {
  accessToken: string;
  refreshToken?: string;
  organizationId?: string;
}) => {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (organizationId) {
    window.localStorage.setItem(ORGANIZATION_ID_KEY, organizationId);
  }
  if (refreshToken) {
    setRefreshTokenCookie(refreshToken);
  }
};

export const clearSession = (): void => {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(ORGANIZATION_ID_KEY);
  document.cookie = `${REFRESH_TOKEN_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict; Secure`;
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
