'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OrderStatusBadge } from './order-status-badge';
import type { OrderListItem, OrdersMeta } from '@/lib/api/orders';
import { formatCurrency } from '@/lib/utils';
import { getPaymentMethodLabel } from '@/lib/orders';

type OrdersTableProps = {
  orders?: OrderListItem[];
  meta?: OrdersMeta;
  isLoading?: boolean;
  error?: unknown;
  page: number;
  onPageChange: (nextPage: number) => void;
};

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export function OrdersTable({
  orders = [],
  meta,
  isLoading,
  error,
  page,
  onPageChange,
}: OrdersTableProps) {
  const hasError = Boolean(error);
  const errorMessage =
    error instanceof Error
      ? error.message
      : 'Không thể tải danh sách đơn hàng.';

  return (
    <Card className="mt-6">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã đơn</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Chi nhánh</TableHead>
              <TableHead className="text-right">Sản phẩm</TableHead>
              <TableHead className="text-right">Tổng tiền</TableHead>
              <TableHead>Thanh toán</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`order-skeleton-${index}`}>
                  <TableCell colSpan={9} className="p-4">
                    <div className="h-6 w-full animate-pulse rounded bg-muted" />
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading && hasError && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-destructive">
                  {errorMessage}
                </TableCell>
              </TableRow>
            )}

            {!isLoading && !hasError && orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                  Chưa có đơn hàng nào phù hợp với bộ lọc.
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              !hasError &&
              orders.map((order) => (
                <TableRow key={order.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{order.code}</span>
                      <span className="text-xs text-muted-foreground">
                        #{order.id.slice(0, 8)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{order.customer?.name ?? 'Khách lẻ'}</span>
                      <span className="text-xs text-muted-foreground">{order.customer?.phone}</span>
                    </div>
                  </TableCell>
                  <TableCell>{order.branch?.name ?? 'Chưa phân chi nhánh'}</TableCell>
                  <TableCell className="text-right">
                    {order.itemsCount ?? '-'}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(order.total ?? 0)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant="secondary" className="w-fit">
                        {getPaymentMethodLabel(order.paymentMethod)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {order.isPaid ? 'Đã thanh toán' : `Đã thu ${formatCurrency(order.paidAmount ?? 0)}`}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {dateFormatter.format(new Date(order.createdAt))}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/orders/${order.id}`}>Xem</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t p-4">
          <div className="text-sm text-muted-foreground">
            Trang {meta?.page ?? page} trên {meta?.lastPage ?? 1} · {meta?.total ?? orders.length} đơn
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
            >
              Trang trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={meta ? page >= meta.lastPage : false}
            >
              Trang sau
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
