'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ORDER_STATUSES, PAYMENT_METHODS } from '@/lib/orders';
import type { BranchSummary } from '@/lib/api/branches';

export type OrdersFilterState = {
  status?: string;
  paymentMethod?: string;
  branchId?: string;
  fromDate?: string;
  toDate?: string;
};

type OrdersFiltersProps = {
  value: OrdersFilterState;
  onChange: (nextValue: OrdersFilterState) => void;
  onReset: () => void;
  branches?: BranchSummary[];
};

export function OrdersFilters({ value, onChange, onReset, branches }: OrdersFiltersProps) {
  const isDirty = useMemo(
    () =>
      Boolean(
        value.status ||
          value.paymentMethod ||
          value.branchId ||
          value.fromDate ||
          value.toDate,
      ),
    [value],
  );

  const handleFieldChange = (field: keyof OrdersFilterState, fieldValue?: string) => {
    const next: OrdersFilterState = {
      ...value,
      [field]: fieldValue || undefined,
    };
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 md:flex-row md:items-end md:flex-wrap">
      <div className="flex flex-1 flex-col gap-2 min-w-[180px]">
        <label className="text-sm font-medium text-muted-foreground">Trạng thái</label>
        <Select
          value={value.status ?? 'ALL'}
          onValueChange={(next) => handleFieldChange('status', next === 'ALL' ? undefined : next)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tất cả" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả</SelectItem>
            {ORDER_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-1 flex-col gap-2 min-w-[180px]">
        <label className="text-sm font-medium text-muted-foreground">Phương thức thanh toán</label>
        <Select
          value={value.paymentMethod ?? 'ALL'}
          onValueChange={(next) =>
            handleFieldChange('paymentMethod', next === 'ALL' ? undefined : next)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Tất cả" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả</SelectItem>
            {PAYMENT_METHODS.map((method) => (
              <SelectItem key={method.value} value={method.value}>
                {method.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-1 flex-col gap-2 min-w-[220px]">
        <label className="text-sm font-medium text-muted-foreground">Chi nhánh xử lý</label>
        <Select
          value={value.branchId ?? 'ALL'}
          onValueChange={(next) => handleFieldChange('branchId', next === 'ALL' ? undefined : next)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tất cả chi nhánh" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả</SelectItem>
            {(branches ?? []).map((branch) => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-1 flex-col gap-2 min-w-[200px]">
        <label className="text-sm font-medium text-muted-foreground">Từ ngày</label>
        <Input
          type="date"
          value={value.fromDate ?? ''}
          onChange={(event) => handleFieldChange('fromDate', event.target.value || undefined)}
          max={value.toDate}
        />
      </div>

      <div className="flex flex-1 flex-col gap-2 min-w-[200px]">
        <label className="text-sm font-medium text-muted-foreground">Đến ngày</label>
        <Input
          type="date"
          value={value.toDate ?? ''}
          onChange={(event) => handleFieldChange('toDate', event.target.value || undefined)}
          min={value.fromDate}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onReset} disabled={!isDirty}>
          Xóa lọc
        </Button>
      </div>
    </div>
  );
}
