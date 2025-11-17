'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
  maxRevenue?: number;
}

interface TopProductsProps {
  products: TopProduct[];
  title?: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value);
};

export function TopProducts({ products, title = 'Top 10 hàng bán chạy' }: TopProductsProps) {
  // Calculate max revenue for progress bar scaling
  const maxRevenue = Math.max(...products.map((p) => p.revenue));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {products.map((product, index) => {
            const progressPercentage = (product.revenue / maxRevenue) * 100;

            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-gray-500 shrink-0">
                      {index + 1}
                    </span>
                    <span className="font-medium truncate">
                      {product.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-gray-600 text-xs">
                      {product.quantity} sp
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Progress
                    value={progressPercentage}
                    className="flex-1 h-2"
                  />
                  <span className="text-sm font-semibold text-blue-600 shrink-0 min-w-[80px] text-right">
                    {formatCurrency(product.revenue).replace('₫', 'đ')}
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
