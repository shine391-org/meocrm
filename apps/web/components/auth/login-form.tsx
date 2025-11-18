'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { toast } from 'sonner';
import { BarChart3, ShoppingCart, Eye, EyeOff } from 'lucide-react';

// Map error codes to user-friendly messages
const ERROR_MESSAGES: Record<string, string> = {
  'INVALID_CREDENTIALS': 'Sai email hoặc mật khẩu. Vui lòng thử lại.',
  'USER_NOT_FOUND': 'Không tìm thấy tài khoản với email này.',
  'ACCOUNT_LOCKED': 'Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.',
  'NETWORK_ERROR': 'Không thể kết nối. Vui lòng kiểm tra kết nối internet.',
  'UNAUTHORIZED': 'Sai email hoặc mật khẩu. Vui lòng thử lại.',
};

const getErrorMessage = (err: any): string => {
  const errorCode = err.body?.code || err.code;
  if (errorCode && ERROR_MESSAGES[errorCode]) {
    return ERROR_MESSAGES[errorCode];
  }

  const status = err.status || err.statusCode;
  if (status === 401) {
    return ERROR_MESSAGES.INVALID_CREDENTIALS;
  }
  if (status === 429) {
    return 'Quá nhiều lần đăng nhập. Vui lòng thử lại sau.';
  }
  if (status >= 500) {
    return 'Lỗi máy chủ. Vui lòng thử lại sau.';
  }

  return 'Đăng nhập thất bại. Vui lòng thử lại.';
};

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (redirectTo: string) => {
    if (!email || !password) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setIsLoading(true);

    try {
      await login({ email, password });
      // Successful login will redirect via useAuth hook
      // But we can override the redirect here
      router.push(redirectTo);
    } catch (err: any) {
      toast.error('Đăng nhập thất bại', {
        description: getErrorMessage(err),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Username Input */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-gray-700">
          Email
        </Label>
        <Input
          id="email"
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="trung"
          className="h-11 text-base"
          disabled={isLoading}
        />
      </div>

      {/* Password Input */}
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium text-gray-700">
          Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••"
            className="h-11 text-base pr-10"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            disabled={isLoading}
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Remember Me & Forgot Password */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="remember"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked as boolean)}
            disabled={isLoading}
          />
          <label
            htmlFor="remember"
            className="text-sm font-medium text-gray-700 cursor-pointer"
          >
            Duy trì đăng nhập
          </label>
        </div>
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
        >
          Quên mật khẩu?
        </Link>
      </div>

      {/* Dual Login Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        {/* Quản lý Button */}
        <Button
          type="button"
          onClick={() => handleLogin('/')}
          disabled={isLoading}
          className="h-12 bg-slate-700 hover:bg-slate-800 text-white font-medium text-base transition-all duration-200 hover:scale-105"
          aria-label="Đăng nhập vào quản lý"
        >
          <BarChart3 className="mr-2 h-5 w-5" />
          Quản lý
        </Button>

        {/* Bán hàng Button */}
        <Button
          type="button"
          onClick={() => handleLogin('/pos')}
          disabled={isLoading}
          className="h-12 bg-purple-600 hover:bg-purple-700 text-white font-medium text-base transition-all duration-200 hover:scale-105"
        >
          <ShoppingCart className="mr-2 h-5 w-5" />
          Bán hàng
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center text-sm text-gray-600">
          Đang đăng nhập...
        </div>
      )}
    </div>
  );
}
