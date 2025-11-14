'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import {
  AuthUser,
  fetchCurrentUser,
  loginApi,
  logoutApi,
  refreshSessionApi,
  registerApi,
} from '@/lib/api/auth';
import {
  persistSession,
  clearSession,
  getBrowserToken,
  getRefreshToken,
  setOrganizationId,
} from '@/lib/auth/token';

interface AuthContextType {
  user: AuthUser | null;
  login: (data: { email: string; password: string }) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    organizationCode: string;
  }) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const logout = useCallback(() => {
    const refreshTokenValue = getRefreshToken();
    if (refreshTokenValue) {
      logoutApi({ refreshToken: refreshTokenValue }).catch(() => {
        // ignore logout errors so user can still leave the session
      });
    }
    clearSession();
    setUser(null);
    router.replace('/login');
  }, [router]);

  const fetchUser = useCallback(async () => {
    try {
      const me = await fetchCurrentUser();
      setUser(me);
      setOrganizationId(me.organization.id);
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  const login = useCallback(
    async (data: { email: string; password: string }) => {
      const response = await loginApi(data);
      persistSession({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        organizationId: response.user.organization.id,
      });
      setUser(response.user);
      router.replace('/');
    },
    [router],
  );

  const register = useCallback(async (data: {
    name: string;
    email: string;
    password: string;
    organizationCode: string;
  }) => {
    const response = await registerApi(data);
    persistSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      organizationId: response.user.organization.id,
    });
    setUser(response.user);
    router.replace('/');
  }, [router]);

  const refreshToken = useCallback(async () => {
    try {
      const refreshTokenValue = getRefreshToken();
      if (!refreshTokenValue) {
        logout();
        return;
      }

      const refreshed = await refreshSessionApi({ refreshToken: refreshTokenValue });
      persistSession({
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
      });
    } catch {
      logout();
    }
  }, [logout]);

  useEffect(() => {
    const token = getBrowserToken();
    if (token) {
      void fetchUser();
    } else {
      setIsLoading(false);
    }
  }, [fetchUser]);

  useEffect(() => {
    const interval = setInterval(() => {
      const accessToken = getBrowserToken();
      if (!accessToken) {
        return;
      }

      const decodedToken: { exp: number } = jwtDecode(accessToken);
      const buffer = 5 * 60 * 1000; // 5 minutes
      if (decodedToken.exp * 1000 < Date.now() + buffer) {
        void refreshToken();
      }
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshToken]);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
