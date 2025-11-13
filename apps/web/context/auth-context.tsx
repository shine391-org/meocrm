'use client';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  AuthService,
  LoginDto,
  RegisterUserDto,
  User,
} from '@/lib/api-client';
import { setBrowserToken, clearBrowserToken } from '@/lib/auth/token';
import { jwtDecode } from 'jwt-decode';

interface AuthContextType {
  user: User | null;
  login: (data: LoginDto) => Promise<void>;
  register: (data: RegisterUserDto) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      fetchUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        const decodedToken: { exp: number } = jwtDecode(accessToken);
        const buffer = 5 * 60 * 1000; // 5 minutes
        if (decodedToken.exp * 1000 < Date.now() + buffer) {
          refreshToken();
        }
      }
    }, 1 * 60 * 1000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const fetchUser = async () => {
    try {
      const me = await AuthService.authControllerGetMe();
      setUser(me);
    } catch (error) {
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (data: LoginDto) => {
    const response = await AuthService.authControllerLogin({ requestBody: data });
    setBrowserToken(response.accessToken, response.refreshToken);
    await fetchUser();
    router.push('/dashboard');
  };

  const register = async (data: RegisterUserDto) => {
    const response = await AuthService.authControllerRegister({
      requestBody: data,
    });
    setBrowserToken(response.accessToken, response.refreshToken);
    await fetchUser();
    router.push('/dashboard');
  };

  const refreshToken = async () => {
    try {
      const response = await AuthService.authControllerRefresh();
      setBrowserToken(response.accessToken, response.refreshToken);
    } catch (error) {
      logout();
    }
  };

  const logout = () => {
    clearBrowserToken();
    setUser(null);
    router.push('/login');
  };

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
