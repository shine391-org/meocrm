import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-cyan-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-20 right-10 w-40 h-40 bg-yellow-400/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        ></div>
        <div
          className="absolute top-1/2 left-1/3 w-24 h-24 bg-pink-400/20 rounded-full blur-2xl animate-pulse"
          style={{ animationDelay: '0.5s' }}
        ></div>
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md px-4 sm:px-6">
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
          {/* Logo/Title */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              LANO CRM
            </h1>
          </div>

          {/* Login Form */}
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
