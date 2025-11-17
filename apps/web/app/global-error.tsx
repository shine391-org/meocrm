'use client';

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error boundary caught:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <div className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-6">
            <h2 className="mb-4 text-2xl font-bold text-red-600">
              Something went wrong
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              An unexpected error occurred. Please try again or contact support if the problem persists.
            </p>
            {error.digest && (
              <p className="mb-4 text-xs text-gray-500">
                Error ID: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
