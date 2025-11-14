'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import CustomerTable from '@/components/customers/customer-table';
import useSWR from 'swr';
import { useDebounce } from 'use-debounce';
import { getCustomers } from '@/lib/api/customers';

type CustomersFetcherArgs = [number, string];
const fetcher = ([page, search]: CustomersFetcherArgs) => getCustomers(page, 20, search);

export default function CustomersPage() {
  return (
    <Suspense fallback={<div>Đang tải khách hàng...</div>}>
      <CustomersPageContent />
    </Suspense>
  );
}

function CustomersPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [debouncedSearch] = useDebounce(searchTerm, 500);

  const { data, error, isLoading } = useSWR([page, debouncedSearch], fetcher, {
    keepPreviousData: true,
  });

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (page > 1) {
      params.set('page', String(page));
    } else {
      params.delete('page');
    }
    if (debouncedSearch) {
      params.set('search', debouncedSearch);
      // Reset to page 1 when search term changes
      if (page !== 1) setPage(1);
    } else {
      params.delete('search');
    }
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  }, [page, debouncedSearch, pathname, router, searchParams]);


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý Khách hàng</h1>
          <p className="text-muted-foreground">
            Xem, tìm kiếm, và quản lý danh sách khách hàng của bạn.
          </p>
        </div>
        <Button onClick={() => router.push('/customers/new')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Tạo mới
        </Button>
      </div>

      <div className="bg-background p-4 border rounded-lg">
        <Input
          placeholder="Tìm theo tên, SĐT, email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <CustomerTable
        data={data}
        isLoading={isLoading}
        error={error}
        page={page}
        setPage={setPage}
      />
    </div>
  );
}
