'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  DollarSign,
  BarChart3,
  Settings,
  Building,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Tổng quan' },
  { href: '/products', icon: Package, label: 'Hàng hóa' },
  { href: '/orders', icon: ShoppingCart, label: 'Đơn hàng' },
  { href: '/customers', icon: Users, label: 'Khách hàng' },
  { href: '/finance', icon: DollarSign, label: 'Sổ quỹ' },
  { href: '/reports', icon: BarChart3, label: 'Báo cáo' },
  { href: '/settings', icon: Settings, label: 'Cài đặt' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-full flex-col border-r bg-white">
      <div className="flex h-16 shrink-0 items-center border-b px-6">
        <Building className="h-8 w-8 text-blue-600" />
        <span className="ml-3 text-xl font-semibold text-gray-900">MeoCRM</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
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
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-600',
                isActive && 'bg-blue-50 text-blue-600'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
