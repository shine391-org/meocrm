'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface RevenueData {
  label: string;
  revenue: number;
  returnValue: number;
}

type TimeRange = 'daily' | 'hourly' | 'monthly';

interface RevenueApiResponse {
  data?: RevenueData[];
}

const fetchRevenueData = async (range: TimeRange): Promise<RevenueData[]> => {
  const response = await fetch(`/api/revenue?range=${range}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }
    throw new Error('Failed to fetch revenue data');
  }

  const payload: RevenueApiResponse | RevenueData[] = await response.json();

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
};

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)} tr`;
  }
  return `${(value / 1000).toFixed(0)} k`;
};

export function RevenueChart() {
  const [timeRange, setTimeRange] = useState<TimeRange>('daily');
  const { data, error, isLoading } = useSWR(['revenue', timeRange], () => fetchRevenueData(timeRange), {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  const chartData = data ?? [];
  const showEmptyState = !isLoading && !error && chartData.length === 0;

  return (
    <Card data-testid="revenue-chart">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Doanh thu thuần</CardTitle>
          <Tabs
            value={timeRange}
            onValueChange={(value) => setTimeRange(value as TimeRange)}
          >
            <TabsList>
              <TabsTrigger value="daily">Theo ngày</TabsTrigger>
              <TabsTrigger value="hourly">Theo giờ</TabsTrigger>
              <TabsTrigger value="monthly">Theo tháng</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="text-sm text-red-600" role="alert" data-testid="revenue-chart-error">
            Không thể tải dữ liệu doanh thu. Vui lòng thử lại sau.
          </p>
        )}
        {!error && showEmptyState && (
          <p className="text-sm text-muted-foreground" data-testid="revenue-chart-empty">
            Chưa có dữ liệu doanh thu cho khoảng thời gian đã chọn.
          </p>
        )}
        {!error && !showEmptyState && (
          <div className="relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-sm">
                Đang tải dữ liệu...
              </div>
            )}
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatCurrency}
                />
                <Tooltip
                  formatter={(value: number) => [
                    `${value.toLocaleString('vi-VN')}đ`,
                    '',
                  ]}
                  labelFormatter={(label) => `${label}`}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                  formatter={(value) => {
                    if (value === 'revenue') return 'Doanh thu';
                    if (value === 'returnValue') return 'Hàng trả lại';
                    return value;
                  }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="returnValue" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
