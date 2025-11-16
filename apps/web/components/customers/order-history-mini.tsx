// apps/web/components/customers/order-history-mini.tsx
'use client';

import useSWR from 'swr';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { getBrowserToken } from '@/lib/auth/token';

// Mock fetcher for now, replace with actual API call
// The real fetcher will need auth headers.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:2003';
const fetchOrders = async (url: string) => {
  const headers: HeadersInit = {};
  const token = getBrowserToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error('Không thể tải lịch sử đơn hàng');
  }
  return response.json();
};

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';
const getStatusVariant = (status: string): BadgeVariant => {
  switch (status) {
    case 'PENDING':
      return 'outline';
    case 'CONFIRMED':
    case 'PROCESSING':
    case 'SHIPPED':
    case 'DELIVERED':
      return 'secondary';
    case 'CANCELLED':
      return 'destructive';
    default:
      return 'default';
  }
};

interface OrderHistoryMiniTableProps {
  customerId: string;
}

const OrderHistoryMiniTable = ({ customerId }: OrderHistoryMiniTableProps) => {
  const router = useRouter();
  // As per our discussion, a separate API call is needed for orders.
  const { data: ordersResponse, error, isLoading } = useSWR(
    `${API_BASE_URL}/orders?customerId=${customerId}&limit=10`,
    fetchOrders
  );

  if (isLoading) return <div>Đang tải lịch sử đơn hàng...</div>;
  if (error || !ordersResponse || !ordersResponse.data) return <div>Không thể tải lịch sử đơn hàng.</div>;

  const orders = ordersResponse.data;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mã ĐH</TableHead>
          <TableHead>Ngày</TableHead>
          <TableHead>Tổng tiền</TableHead>
          <TableHead>Trạng thái</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center">
              Khách hàng chưa có đơn hàng nào.
            </TableCell>
          </TableRow>
        ) : (
          orders.map((order: any) => (
            <TableRow key={order.id} className="cursor-pointer" onClick={() => router.push(`/orders/${order.id}`)}>
              <TableCell className="font-medium">{order.code}</TableCell>
              <TableCell>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</TableCell>
              <TableCell>{formatCurrency(order.total)}</TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};

export default OrderHistoryMiniTable;
