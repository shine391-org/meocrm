'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <h1 className="mb-4 text-6xl font-bold text-primary">404</h1>
        <h2 className="mb-4 text-2xl font-bold">Không tìm thấy trang</h2>
        <p className="mb-8 text-muted-foreground">
          Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.
        </p>
        <Link href="/">
          <Button>
            <Home className="mr-2 h-4 w-4" />
            Về trang chủ
          </Button>
        </Link>
      </div>
    </div>
  );
}
