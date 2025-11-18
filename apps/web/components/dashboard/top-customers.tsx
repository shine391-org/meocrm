'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { User } from 'lucide-react';

export interface TopCustomer {
  id: string;
  name: string;
  orderCount: number;
  totalRevenue: number;
}

interface TopCustomersProps {
  customers: TopCustomer[];
  title?: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value);
};

export function TopCustomers({
  customers,
  title = 'Top 10 khách mua nhiều nhất',
}: TopCustomersProps) {
  // Calculate max revenue for progress bar scaling
  const maxRevenue = customers.length ? Math.max(...customers.map((c) => c.totalRevenue)) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {customers.map((customer, index) => {
            const progressPercentage = maxRevenue > 0 ? (customer.totalRevenue / maxRevenue) * 100 : 0;

            return (
              <div key={customer.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-gray-500 shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-600 shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                      <span className="font-medium truncate">
                        {customer.name}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-gray-600 text-xs">
                      {customer.orderCount} đơn
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Progress
                    value={progressPercentage}
                    className="flex-1 h-2"
                  />
                  <span className="text-sm font-semibold text-blue-600 shrink-0 min-w-[80px] text-right">
                    {formatCurrency(customer.totalRevenue).replace('₫', 'đ')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
