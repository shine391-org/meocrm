'use client';

import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { getCustomer } from '@/lib/api/customers';
import { Button } from '@/components/ui/button';
import CustomerStatsCards from '@/components/customers/customer-stats-cards';
import OrderHistoryMiniTable from '@/components/customers/order-history-mini';
import { Badge } from '@/components/ui/badge';
import { Edit } from 'lucide-react';
import { formatAddress, getSegmentVariant } from '@/lib/utils';

const fetcher = (id: string) => getCustomer(id);

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: customerResponse, error, isLoading } = useSWR(params.id, fetcher);

  if (isLoading) {
    // TODO: Use a proper Skeleton component
    return <div>Đang tải...</div>;
  }

  if (error || !customerResponse || !customerResponse.data) {
    // TODO: Use a proper Not Found or Error component
    return <div>Không tìm thấy khách hàng.</div>;
  }

  const customer = customerResponse.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {customer.name}
            <Badge variant={getSegmentVariant(customer.segment)}>{customer.segment}</Badge>
          </h1>
          <p className="text-muted-foreground">Mã khách hàng: {customer.code}</p>
        </div>
        <Button onClick={() => router.push(`/customers/${customer.id}/edit`)}>
          <Edit className="mr-2 h-4 w-4" />
          Chỉnh sửa
        </Button>
      </div>

      {/* Stats Cards */}
      <CustomerStatsCards stats={customer} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info */}
        <div className="lg:col-span-1 p-6 border rounded-lg bg-background space-y-2">
           <h3 className="font-semibold text-lg mb-4">Thông tin liên hệ</h3>
           <p><strong>SĐT:</strong> <a href={`tel:${customer.phone}`} className="text-blue-600 hover:underline">{customer.phone}</a></p>
           {customer.email && (
             <p><strong>Email:</strong> <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">{customer.email}</a></p>
           )}
           <p><strong>Địa chỉ:</strong> {formatAddress(customer)}</p>
           {/* TODO: Add other fields like gender, birthday once backend supports them */}
        </div>

        {/* Order History */}
        <div className="lg:col-span-2 p-6 border rounded-lg bg-background">
          <h3 className="font-semibold text-lg mb-4">Lịch sử đơn hàng</h3>
          <OrderHistoryMiniTable customerId={customer.id} />
          {/* TODO: Add a link to view all orders */}
        </div>
      </div>
    </div>
  );
}
