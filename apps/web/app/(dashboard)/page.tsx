'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

export default function DashboardPage() {
  // Mock data - will be replaced with real API data later
  const kpiData = [
    {
      title: 'Doanh thu hôm nay',
      value: '15,450,000đ',
      change: '+12.5%',
      trend: 'up' as const,
      icon: DollarSign,
      bgColor: 'bg-blue-500',
    },
    {
      title: 'Đơn hàng hôm nay',
      value: '24',
      change: '+8.2%',
      trend: 'up' as const,
      icon: ShoppingCart,
      bgColor: 'bg-green-500',
    },
    {
      title: 'Khách hàng mới',
      value: '12',
      change: '+15.3%',
      trend: 'up' as const,
      icon: Users,
      bgColor: 'bg-purple-500',
    },
    {
      title: 'Tồn kho',
      value: '1,234',
      change: '-2.1%',
      trend: 'down' as const,
      icon: Package,
      bgColor: 'bg-orange-500',
    },
  ];

  const topProducts = [
    { name: 'Áo thun nam', quantity: 45, revenue: '4,500,000đ' },
    { name: 'Quần jean nữ', quantity: 38, revenue: '7,600,000đ' },
    { name: 'Giày thể thao', quantity: 32, revenue: '9,600,000đ' },
    { name: 'Túi xách', quantity: 28, revenue: '5,600,000đ' },
    { name: 'Áo khoác', quantity: 25, revenue: '6,250,000đ' },
  ];

  const topCustomers = [
    { name: 'Nguyễn Văn A', orders: 15, total: '12,500,000đ' },
    { name: 'Trần Thị B', orders: 12, total: '9,800,000đ' },
    { name: 'Lê Văn C', orders: 10, total: '8,200,000đ' },
    { name: 'Phạm Thị D', orders: 8, total: '6,400,000đ' },
    { name: 'Hoàng Văn E', orders: 7, total: '5,600,000đ' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi) => {
          const Icon = kpi.icon;
          const TrendIcon = kpi.trend === 'up' ? TrendingUp : TrendingDown;
          return (
            <Card key={kpi.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">
                      {kpi.title}
                    </p>
                    <p className="mt-2 text-2xl font-bold">{kpi.value}</p>
                    <div className="mt-2 flex items-center gap-1">
                      <TrendIcon
                        className={`h-4 w-4 ${
                          kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'
                        }`}
                      />
                      <span
                        className={`text-sm font-medium ${
                          kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {kpi.change}
                      </span>
                      <span className="text-sm text-gray-500">so với hôm qua</span>
                    </div>
                  </div>
                  <div className={`rounded-full ${kpi.bgColor} p-3`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Top Products and Customers */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top sản phẩm bán chạy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div
                  key={product.name}
                  className="flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-gray-500">
                        Đã bán: {product.quantity}
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-green-600">
                    {product.revenue}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle>Top khách hàng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCustomers.map((customer, index) => (
                <div
                  key={customer.name}
                  className="flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-sm font-semibold text-purple-600">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-gray-500">
                        {customer.orders} đơn hàng
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-green-600">
                    {customer.total}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity - Placeholder for charts */}
      <Card>
        <CardHeader>
          <CardTitle>Biểu đồ doanh thu 7 ngày qua</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center rounded-lg bg-gray-50">
            <p className="text-gray-500">
              Biểu đồ sẽ được thêm vào sau (Recharts/Chart.js)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
