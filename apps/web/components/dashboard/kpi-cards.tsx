'use client';

import type { ElementType } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export interface KPIData {
  title: string;
  value: string;
  change?: number;
  trend?: 'up' | 'down';
  subtitle?: string;
  subtitleValue?: string;
  icon?: ElementType;
  bgColor?: string;
  iconColor?: string;
}

interface KPICardsProps {
  data: KPIData[];
}

const LIGHT_BACKGROUND_PATTERN = /(bg-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200))|bg-white|bg-slate-50/;

const resolveIconColor = (bgClass?: string, overrideColor?: string) => {
  if (overrideColor) {
    return overrideColor;
  }
  if (!bgClass || LIGHT_BACKGROUND_PATTERN.test(bgClass)) {
    return 'text-slate-700';
  }
  return 'text-white';
};

export function KPICards({ data }: KPICardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {data.map((kpi, index) => {
        const TrendIcon = kpi.trend === 'up' ? ArrowUpRight : ArrowDownRight;
        const hasChange = kpi.change !== undefined && kpi.change !== null;
        const Icon = kpi.icon;
        const iconBackground = kpi.bgColor || 'bg-blue-100';
        const iconColor = resolveIconColor(iconBackground, kpi.iconColor);

        return (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {Icon && (
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBackground}`}
                      >
                        <Icon className={`h-5 w-5 ${iconColor}`} />
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
