'use client';

import { KPICards } from '@/components/dashboard/kpi-cards';
import type { OrderListItem, OrdersMeta } from '@/lib/api/orders';
import { formatCurrency } from '@/lib/utils';
import { ShoppingCart, AlertTriangle, Wallet, Truck } from 'lucide-react';

type OrdersSummaryCardsProps = {
  orders: OrderListItem[];
  meta?: OrdersMeta;
};

export function OrdersSummaryCards({ orders, meta }: OrdersSummaryCardsProps) {
  const total = meta?.total ?? orders.length;
  const pendingCount = orders.filter((order) =>
    ['PENDING', 'CONFIRMED'].includes(order.status),
  ).length;
  const shippingCount = orders.filter((order) =>
    ['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status),
  ).length;
  const codAmount = orders
    .filter((order) => order.paymentMethod === 'COD')
    .reduce((acc, order) => acc + Number(order.total ?? 0), 0);
  const completedRevenue = orders
    .filter((order) => order.status === 'COMPLETED')
    .reduce((acc, order) => acc + Number(order.total ?? 0), 0);

  return (
    <KPICards
      data={[
        {
          title: 'Tổng số đơn',
          value: total.toLocaleString('vi-VN'),
          subtitle: 'Đơn trong hệ thống',
          subtitleValue: meta ? `${meta.page}/${meta.lastPage}` : '1/1',
          icon: ShoppingCart,
          bgColor: 'bg-blue-100',
        },
        {
          title: 'Đơn chờ xử lý',
          value: pendingCount.toLocaleString('vi-VN'),
          subtitle: 'Trong trang hiện tại',
          subtitleValue: `${pendingCount} đơn`,
          icon: AlertTriangle,
          bgColor: 'bg-amber-100',
        },
        {
          title: 'Đơn đang giao',
          value: shippingCount.toLocaleString('vi-VN'),
          subtitle: 'PROCESSING/SHIPPED/DELIVERED',
          subtitleValue: `${shippingCount} đơn`,
          icon: Truck,
          bgColor: 'bg-slate-100',
        },
        {
          title: 'Doanh thu đã hoàn tất',
          value: formatCurrency(completedRevenue, '₫0'),
          subtitle: 'COD hiện tại',
          subtitleValue: formatCurrency(codAmount, '₫0'),
          icon: Wallet,
          bgColor: 'bg-emerald-100',
        },
      ]}
    />
  );
}
