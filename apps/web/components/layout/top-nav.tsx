'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  BarChart3,
  Settings,
} from 'lucide-react';

const navItems = [
  {
    href: '/',
    label: 'Tổng quan',
    icon: LayoutDashboard,
  },
  {
    href: '/products',
    label: 'Hàng hóa',
    icon: Package,
  },
  {
    href: '/orders',
    label: 'Đơn hàng',
    icon: ShoppingCart,
  },
  {
    href: '/customers',
    label: 'Khách hàng',
    icon: Users,
  },
  {
    href: '/finance',
    label: 'Sổ quỹ',
    icon: DollarSign,
  },
  {
    href: '/reports',
    label: 'Báo cáo',
    icon: BarChart3,
  },
  {
    href: '/settings',
    label: 'Cài đặt',
    icon: Settings,
  },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="flex h-14 items-center gap-1 border-b bg-blue-600 px-4">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isRoot = item.href === '/';
        const isActive = isRoot
          ? pathname === '/'
          : pathname === item.href || pathname?.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2 rounded-t-md px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-blue-700 hover:text-white',
              isActive && 'bg-blue-700 text-white'
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
