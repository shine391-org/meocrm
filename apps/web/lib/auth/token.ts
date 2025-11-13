export const getBrowserToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const token = localStorage.getItem('accessToken');
  if (token === 'null' || token === 'undefined') {
    return null;
  }
  return token;
};

export const setBrowserToken = (
  accessToken: string,
  refreshToken?: string
): void => {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem('accessToken', accessToken);
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  }
};

export const clearBrowserToken = (): void => {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};
