'use client';

import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export interface KPIData {
  title: string;
  value: string;
  change?: number;
  trend?: 'up' | 'down';
  subtitle?: string;
  subtitleValue?: string;
  icon?: React.ElementType;
  bgColor?: string;
}

interface KPICardsProps {
  data: KPIData[];
}

export function KPICards({ data }: KPICardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {data.map((kpi, index) => {
        const TrendIcon = kpi.trend === 'up' ? ArrowUpRight : ArrowDownRight;
        const hasChange = kpi.change !== undefined && kpi.change !== null;
        const Icon = kpi.icon;

        return (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {Icon && (
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          kpi.bgColor || 'bg-blue-100'
                        }`}
                      >
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-600 mt-2">
                    {kpi.title}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {kpi.value}
                  </p>
                  {kpi.subtitle && kpi.subtitleValue && (
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                      <span>{kpi.subtitle}</span>
                      <span className="font-semibold">{kpi.subtitleValue}</span>
                    </div>
                  )}
                  {hasChange && (
                    <div className="mt-3 flex items-center gap-1">
                      <div
                        className={`flex items-center gap-0.5 rounded px-2 py-0.5 ${
                          kpi.trend === 'up'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        <TrendIcon className="h-3 w-3" />
                        <span className="text-sm font-semibold">
                          {Math.abs(kpi.change!).toFixed(2)}%
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        so với hôm trước
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
