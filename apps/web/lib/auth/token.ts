const ACCESS_TOKEN_KEY = 'accessToken';
const ORGANIZATION_ID_KEY = 'organizationId';

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
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (organizationId) {
    window.localStorage.setItem(ORGANIZATION_ID_KEY, organizationId);
  }
};

export const clearSession = (): void => {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
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
