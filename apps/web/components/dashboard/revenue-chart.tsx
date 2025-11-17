'use client';

import { useState } from 'react';
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

const dailyData: RevenueData[] = [
  { label: '01', revenue: 3500000, returnValue: 0 },
  { label: '02', revenue: 4200000, returnValue: 200000 },
  { label: '03', revenue: 5100000, returnValue: 0 },
  { label: '04', revenue: 4800000, returnValue: 300000 },
  { label: '05', revenue: 6200000, returnValue: 100000 },
  { label: '06', revenue: 18500000, returnValue: 0 },
  { label: '07', revenue: 7200000, returnValue: 0 },
  { label: '08', revenue: 8100000, returnValue: 0 },
  { label: '09', revenue: 9500000, returnValue: 400000 },
  { label: '10', revenue: 8800000, returnValue: 0 },
  { label: '11', revenue: 7900000, returnValue: 0 },
  { label: '12', revenue: 9200000, returnValue: 0 },
  { label: '13', revenue: 10500000, returnValue: 0 },
  { label: '14', revenue: 11200000, returnValue: 200000 },
  { label: '15', revenue: 12800000, returnValue: 0 },
  { label: '16', revenue: 13500000, returnValue: 0 },
];

const hourlyData: RevenueData[] = [
  { label: '00:00', revenue: 0, returnValue: 0 },
  { label: '01:00', revenue: 0, returnValue: 0 },
  { label: '02:00', revenue: 0, returnValue: 0 },
  { label: '03:00', revenue: 0, returnValue: 0 },
  { label: '04:00', revenue: 0, returnValue: 0 },
  { label: '05:00', revenue: 0, returnValue: 0 },
  { label: '06:00', revenue: 0, returnValue: 0 },
  { label: '07:00', revenue: 0, returnValue: 0 },
  { label: '08:00', revenue: 500000, returnValue: 0 },
  { label: '09:00', revenue: 1200000, returnValue: 0 },
  { label: '10:00', revenue: 2100000, returnValue: 100000 },
  { label: '11:00', revenue: 1800000, returnValue: 0 },
  { label: '12:00', revenue: 2500000, returnValue: 0 },
  { label: '13:00', revenue: 1900000, returnValue: 0 },
  { label: '14:00', revenue: 2200000, returnValue: 50000 },
  { label: '15:00', revenue: 1600000, returnValue: 0 },
  { label: '16:00', revenue: 1400000, returnValue: 0 },
  { label: '17:00', revenue: 1800000, returnValue: 0 },
  { label: '18:00', revenue: 2300000, returnValue: 0 },
  { label: '19:00', revenue: 2600000, returnValue: 0 },
  { label: '20:00', revenue: 1500000, returnValue: 0 },
  { label: '21:00', revenue: 800000, returnValue: 0 },
  { label: '22:00', revenue: 0, returnValue: 0 },
  { label: '23:00', revenue: 0, returnValue: 0 },
];

const monthlyData: RevenueData[] = [
  { label: 'T1', revenue: 85000000, returnValue: 2000000 },
  { label: 'T2', revenue: 92000000, returnValue: 1500000 },
  { label: 'T3', revenue: 105000000, returnValue: 3000000 },
  { label: 'T4', revenue: 98000000, returnValue: 2500000 },
  { label: 'T5', revenue: 115000000, returnValue: 1800000 },
  { label: 'T6', revenue: 122000000, returnValue: 2200000 },
  { label: 'T7', revenue: 135000000, returnValue: 3500000 },
  { label: 'T8', revenue: 128000000, returnValue: 2800000 },
  { label: 'T9', revenue: 118000000, returnValue: 2100000 },
  { label: 'T10', revenue: 142000000, returnValue: 3200000 },
  { label: 'T11', revenue: 155000000, returnValue: 2600000 },
  { label: 'T12', revenue: 165000000, returnValue: 3800000 },
];

type TimeRange = 'daily' | 'hourly' | 'monthly';

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)} tr`;
  }
  return `${(value / 1000).toFixed(0)} k`;
};

export function RevenueChart() {
  const [timeRange, setTimeRange] = useState<TimeRange>('daily');

  const dataMap = {
    daily: dailyData,
    hourly: hourlyData,
    monthly: monthlyData,
  };

  const data = dataMap[timeRange];

  return (
    <Card>
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
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
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
      </CardContent>
    </Card>
  );
}
