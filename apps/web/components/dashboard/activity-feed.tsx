'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  Clock,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ActivityType =
  | 'order_created'
  | 'order_completed'
  | 'order_cancelled'
  | 'product_added'
  | 'product_updated'
  | 'customer_created'
  | 'inventory_updated';

export interface Activity {
  id: string;
  type: ActivityType;
  message: string;
  details?: string;
  timestamp: Date;
  amount?: number;
}

interface ActivityFeedProps {
  activities: Activity[];
  title?: string;
  maxHeight?: string;
}

const activityConfig: Record<
  ActivityType,
  {
    icon: React.ElementType;
    color: string;
    bgColor: string;
  }
> = {
  order_created: {
    icon: ShoppingCart,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  order_completed: {
    icon: ArrowUpCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  order_cancelled: {
    icon: ArrowDownCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  product_added: {
    icon: Package,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  product_updated: {
    icon: TrendingUp,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  customer_created: {
    icon: Users,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
  },
  inventory_updated: {
    icon: Package,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
};

const formatTime = (date: Date) => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value);
};

export function ActivityFeed({
  activities,
  title = 'Hoạt động gần đây',
  maxHeight = 'h-[600px]',
}: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className={cn(maxHeight, 'px-6 pb-6')}>
          <div className="space-y-4">
            {activities.map((activity, index) => {
              const config = activityConfig[activity.type];
              const Icon = config.icon;

              return (
                <div
                  key={activity.id}
                  className={cn(
                    'flex gap-3 pb-4',
                    index !== activities.length - 1 && 'border-b'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                      config.bgColor
                    )}
                  >
                    <Icon className={cn('h-5 w-5', config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.message}
                    </p>
                    {activity.details && (
                      <p className="text-xs text-gray-600 mt-1">
                        {activity.details}
                      </p>
                    )}
                    {activity.amount !== undefined && (
                      <p className="text-sm font-semibold text-blue-600 mt-1">
                        {formatCurrency(activity.amount).replace('₫', 'đ')}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
