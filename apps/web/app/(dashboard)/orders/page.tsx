'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { PlusCircle, RefreshCcw } from 'lucide-react';
import { fetchOrders as fetchOrdersApi } from '@/lib/api/orders';
import { fetchBranches } from '@/lib/api/branches';
import { OrdersFilters, type OrdersFilterState } from '@/components/orders/orders-filters';
import { OrdersSummaryCards } from '@/components/orders/orders-summary-cards';
import { OrdersTable } from '@/components/orders/orders-table';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export default function OrdersPage() {
  return (
    <Suspense fallback={<div>Đang tải đơn hàng...</div>}>
      <OrdersPageContent />
    </Suspense>
  );
}

function OrdersPageContent() {
  const router = useRouter();
  const pathname = usePathname() || '/orders';
  const searchParams = useSearchParams();

  const initialPage = useMemo(
    () => Number(searchParams?.get('page')) || 1,
    [searchParams],
  );

  const initialFilters = useMemo<OrdersFilterState>(
    () => ({
      status: searchParams?.get('status') ?? undefined,
      paymentMethod: searchParams?.get('paymentMethod') ?? undefined,
      branchId: searchParams?.get('branchId') ?? undefined,
      fromDate: searchParams?.get('fromDate') ?? undefined,
      toDate: searchParams?.get('toDate') ?? undefined,
    }),
    [searchParams],
  );

  const [page, setPage] = useState(initialPage);
  const [filters, setFilters] = useState<OrdersFilterState>(initialFilters);

  useEffect(() => {
    const nextPage = Number(searchParams?.get('page')) || 1;
    const nextFilters: OrdersFilterState = {
      status: searchParams?.get('status') ?? undefined,
      paymentMethod: searchParams?.get('paymentMethod') ?? undefined,
      branchId: searchParams?.get('branchId') ?? undefined,
      fromDate: searchParams?.get('fromDate') ?? undefined,
      toDate: searchParams?.get('toDate') ?? undefined,
    };

    setPage((current) => (current === nextPage ? current : nextPage));
    setFilters((current) => {
      const keys = Object.keys(nextFilters) as (keyof OrdersFilterState)[];
      const isSame = keys.every((key) => current[key] === nextFilters[key]);
      return isSame ? current : nextFilters;
    });
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) {
      params.set('page', String(page));
    }
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });
    const nextQuery = params.toString();
    const currentQuery = searchParams?.toString() ?? '';
    if (nextQuery === currentQuery) {
      return;
    }
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  }, [filters, page, pathname, router, searchParams]);

  const { data, error, isLoading, mutate, isValidating } = useSWR(
    ['orders', page, filters],
    () =>
      fetchOrdersApi({
        page,
        limit: PAGE_SIZE,
        status: filters.status,
        paymentMethod: filters.paymentMethod,
        branchId: filters.branchId,
        fromDate: filters.fromDate,
        toDate: filters.toDate,
      }),
    {
      keepPreviousData: true,
    },
  );

  useEffect(() => {
    if (!data?.meta) {
      return;
    }
    if (page > data.meta.lastPage && data.meta.lastPage > 0) {
      setPage(data.meta.lastPage);
    }
  }, [data?.meta, page]);

  const { data: branchOptions } = useSWR('orders-branches', fetchBranches);

  const handleFiltersChange = (nextFilters: OrdersFilterState) => {
    setFilters(nextFilters);
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters({});
    setPage(1);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(Math.max(1, nextPage));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý Đơn hàng</h1>
          <p className="text-muted-foreground">
            Theo dõi trạng thái, thanh toán và tiến độ hoàn tất theo quy trình PENDING → PROCESSING → COMPLETED.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => mutate()} disabled={isValidating}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Làm mới
          </Button>
          <Button asChild>
            <Link href="/pos">
              <PlusCircle className="mr-2 h-4 w-4" />
              + Đặt hàng
            </Link>
          </Button>
        </div>
      </div>

      <OrdersFilters value={filters} onChange={handleFiltersChange} onReset={handleResetFilters} branches={branchOptions} />

      {data && <OrdersSummaryCards orders={data.data} meta={data.meta} />}

      <OrdersTable
        orders={data?.data}
        meta={data?.meta}
        isLoading={isLoading}
        error={error}
        page={page}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
