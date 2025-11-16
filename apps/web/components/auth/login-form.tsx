'use client';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// Map error codes to user-friendly messages
const ERROR_MESSAGES: Record<string, string> = {
  'INVALID_CREDENTIALS': 'Invalid email or password. Please try again.',
  'USER_NOT_FOUND': 'No account found with this email address.',
  'ACCOUNT_LOCKED': 'Your account has been locked. Please contact support.',
  'NETWORK_ERROR': 'Unable to connect. Please check your internet connection.',
  'UNAUTHORIZED': 'Invalid email or password. Please try again.',
};

const getErrorMessage = (err: any): string => {
  // Check for specific error codes
  const errorCode = err.body?.code || err.code;
  if (errorCode && ERROR_MESSAGES[errorCode]) {
    return ERROR_MESSAGES[errorCode];
  }

  // Check for HTTP status codes
  const status = err.status || err.statusCode;
  if (status === 401) {
    return ERROR_MESSAGES.INVALID_CREDENTIALS;
  }
  if (status === 429) {
    return 'Too many login attempts. Please try again later.';
  }
  if (status >= 500) {
    return 'Server error. Please try again later.';
  }

  // Default safe message
  return 'Login failed. Please try again.';
};

export function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login({ email, password });
    } catch (err: any) {
      toast.error('Login Failed', {
        description: getErrorMessage(err),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="email@example.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="********"
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Logging In...' : 'Login'}
      </Button>
    </form>
  );
}
