'use client';

import { RevenueChart } from '@/components/dashboard/revenue-chart';
import { KPICards, type KPIData } from '@/components/dashboard/kpi-cards';
import { TopProducts, type TopProduct } from '@/components/dashboard/top-products';
import { TopCustomers, type TopCustomer } from '@/components/dashboard/top-customers';
import { ActivityFeed, type Activity } from '@/components/dashboard/activity-feed';
import {
  DollarSign,
  ShoppingCart,
  Package,
  TrendingDown,
} from 'lucide-react';

export default function DashboardPage() {
  // Mock KPI data matching KiotViet interface
  const kpiData: KPIData[] = [
    {
      title: 'Doanh thu',
      value: '0',
      subtitle: 'Số đơn hàng hôm nay',
      subtitleValue: '0',
      icon: DollarSign,
      bgColor: 'bg-blue-500',
    },
    {
      title: 'Tồi hàng',
      value: '0',
      subtitle: 'Giá trị tồn kho',
      subtitleValue: '0đ',
      icon: Package,
      bgColor: 'bg-orange-500',
    },
    {
      title: 'Doanh thu thuần',
      value: '-39.08%',
      change: -39.08,
      trend: 'down',
      icon: TrendingDown,
      bgColor: 'bg-red-500',
    },
    {
      title: 'Đơn hàng',
      value: '0',
      subtitle: 'Đơn hàng hôm nay',
      subtitleValue: '0',
      icon: ShoppingCart,
      bgColor: 'bg-green-500',
    },
  ];

  // Mock top products data
  const topProducts: TopProduct[] = [
    { id: 'prod-1', name: 'Áo thun nam basic', quantity: 45, revenue: 4500000 },
    { id: 'prod-2', name: 'Quần jean nữ skinny', quantity: 38, revenue: 3800000 },
    { id: 'prod-3', name: 'Giày sneaker trắng', quantity: 32, revenue: 3200000 },
    { id: 'prod-4', name: 'Túi xách da nữ', quantity: 28, revenue: 2800000 },
    { id: 'prod-5', name: 'Áo khoác hoodie', quantity: 25, revenue: 2500000 },
    { id: 'prod-6', name: 'Váy midi công sở', quantity: 22, revenue: 2200000 },
    { id: 'prod-7', name: 'Giày cao gót 5cm', quantity: 20, revenue: 2000000 },
    { id: 'prod-8', name: 'Áo sơ mi trắng', quantity: 18, revenue: 1800000 },
    { id: 'prod-9', name: 'Quần tây nam', quantity: 15, revenue: 1500000 },
    { id: 'prod-10', name: 'Balo laptop 15 inch', quantity: 12, revenue: 1200000 },
  ];

  // Mock top customers data
  const topCustomers: TopCustomer[] = [
    { id: 'cust-1', name: 'Nguyễn Văn An', orderCount: 15, totalRevenue: 8500000 },
    { id: 'cust-2', name: 'Trần Thị Bình', orderCount: 12, totalRevenue: 7200000 },
    { id: 'cust-3', name: 'Lê Hoàng Cường', orderCount: 10, totalRevenue: 6800000 },
    { id: 'cust-4', name: 'Phạm Minh Đức', orderCount: 9, totalRevenue: 5900000 },
    { id: 'cust-5', name: 'Võ Thị Nga', orderCount: 8, totalRevenue: 5200000 },
    { id: 'cust-6', name: 'Đặng Văn Hùng', orderCount: 7, totalRevenue: 4800000 },
    { id: 'cust-7', name: 'Hoàng Thị Kim', orderCount: 6, totalRevenue: 4200000 },
    { id: 'cust-8', name: 'Bùi Văn Long', orderCount: 5, totalRevenue: 3600000 },
    { id: 'cust-9', name: 'Trương Thị Mai', orderCount: 4, totalRevenue: 3100000 },
    { id: 'cust-10', name: 'Phan Văn Nam', orderCount: 3, totalRevenue: 2500000 },
  ];

  // Mock activity data
  const activities: Activity[] = [
    {
      id: '1',
      type: 'order_created',
      message: 'Đơn hàng mới #DH001234',
      details: 'Nguyễn Văn An - 3 sản phẩm',
      timestamp: new Date(Date.now() - 11 * 60 * 1000), // 11 minutes ago
      amount: 1250000,
    },
    {
      id: '2',
      type: 'order_completed',
      message: 'Đơn hàng #DH001233 đã hoàn thành',
      details: 'Trần Thị Bình - Thanh toán COD',
      timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
      amount: 850000,
    },
    {
      id: '3',
      type: 'product_added',
      message: 'Thêm sản phẩm mới',
      details: 'Áo khoác bomber unisex - SKU: AK-001',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
    {
      id: '4',
      type: 'customer_created',
      message: 'Khách hàng mới đăng ký',
      details: 'Lê Minh Tuấn - tuanle@example.com',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    },
    {
      id: '5',
      type: 'inventory_updated',
      message: 'Cập nhật tồn kho',
      details: 'Áo thun nam basic - Nhập thêm 50 sản phẩm',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    },
    {
      id: '6',
      type: 'order_cancelled',
      message: 'Đơn hàng #DH001230 đã hủy',
      details: 'Khách hàng yêu cầu hủy - Hoàn tiền',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      amount: 650000,
    },
    {
      id: '7',
      type: 'product_updated',
      message: 'Cập nhật giá sản phẩm',
      details: 'Giày sneaker trắng - Giảm 15%',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    },
    {
      id: '8',
      type: 'order_created',
      message: 'Đơn hàng mới #DH001229',
      details: 'Phạm Văn Đức - 5 sản phẩm',
      timestamp: new Date(Date.now() - 7 * 60 * 60 * 1000), // 7 hours ago
      amount: 2100000,
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <KPICards data={kpiData} />

      {/* Revenue Chart */}
      <RevenueChart />

      {/* Top Products and Top Customers */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TopProducts products={topProducts} />
        <TopCustomers customers={topCustomers} />
      </div>

      {/* Activity Feed */}
      <ActivityFeed activities={activities} />
    </div>
  );
}
