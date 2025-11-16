'use client';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ModeSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const isPOS = pathname === '/pos';

  return (
    <div className="flex items-center gap-2 rounded-lg bg-gray-100 p-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/')}
        className={cn(
          'gap-2',
          !isPOS &&
            'bg-white text-blue-600 shadow-sm hover:bg-white hover:text-blue-600'
        )}
      >
        <LayoutDashboard className="h-4 w-4" />
        <span>Quản lý</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/pos')}
        className={cn(
          'gap-2',
          isPOS &&
            'bg-white text-blue-600 shadow-sm hover:bg-white hover:text-blue-600'
        )}
      >
        <CreditCard className="h-4 w-4" />
        <span>Bán hàng</span>
      </Button>
    </div>
  );
}
