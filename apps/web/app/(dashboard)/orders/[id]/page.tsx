'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  fetchOrder,
  updateOrderStatus,
  requestOrderRefund,
  approveOrderRefund,
  rejectOrderRefund,
  type OrderDetail,
} from '@/lib/api/orders';
import { ORDER_STATUSES, getOrderStatusLabel, getPaymentMethodLabel } from '@/lib/orders';
import { formatCurrency, formatAddress } from '@/lib/utils';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { CalendarDays, CreditCard, Loader2, Phone, Store, User } from 'lucide-react';
import { getBrowserToken, getOrganizationId, setOrganizationId } from '@/lib/auth/token';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
const AUTH_ME_ENDPOINT = API_BASE_URL ? `${API_BASE_URL}/auth/me` : '/auth/me';

export default function OrderDetailsPage() {
  const params = useParams<{ id?: string | string[] }>();
  const resolvedParam = params?.id;
  const orderId = useMemo(() => {
    if (!resolvedParam) return null;
    return Array.isArray(resolvedParam) ? resolvedParam[0] : resolvedParam;
  }, [resolvedParam]);

  const [orgError, setOrgError] = useState<string | null>(null);
  const [isEnsuringOrg, setIsEnsuringOrg] = useState(!getOrganizationId());

  useEffect(() => {
    if (getOrganizationId()) {
      setIsEnsuringOrg(false);
      setOrgError(null);
      return;
    }

    const token = getBrowserToken();
    if (!token) {
      setOrgError('Bạn cần đăng nhập để xem chi tiết đơn hàng.');
      setIsEnsuringOrg(false);
      return;
    }

    let isActive = true;
    setIsEnsuringOrg(true);
    (async () => {
      try {
        const response = await fetch(AUTH_ME_ENDPOINT, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
        if (!response.ok) {
          throw new Error('Không thể xác định tổ chức.');
        }
        const payload = (await response.json()) as { organizationId?: string; organization?: { id: string } };
        const organizationId = payload.organization?.id ?? payload.organizationId;
        if (!organizationId) {
          throw new Error('Thiếu organizationId trong phản hồi.');
        }
        if (!isActive) {
          return;
        }
        setOrganizationId(organizationId);
        setOrgError(null);
      } catch (error) {
        console.error(error);
        if (isActive) {
          setOrgError('Không thể xác định tổ chức của bạn.');
        }
      } finally {
        if (isActive) {
          setIsEnsuringOrg(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

  const swrKey = orderId && !orgError ? ['order-detail', orderId] : null;
  const { data: order, error, isLoading, mutate, isValidating } = useSWR<OrderDetail>(
    swrKey,
    () => fetchOrder(orderId as string),
    {
      revalidateOnFocus: false,
    },
  );

  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [isRefundProcessing, setIsRefundProcessing] = useState(false);

  const handleStatusChange = useCallback(
    async (nextStatus: string) => {
      if (!orderId || nextStatus === order?.status) {
        return;
      }
      setIsStatusUpdating(true);
      try {
        await updateOrderStatus(orderId, nextStatus);
        toast.success(`Đã cập nhật trạng thái thành ${getOrderStatusLabel(nextStatus)}.`);
        await mutate();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Không thể cập nhật trạng thái đơn hàng.';
        toast.error(message);
      } finally {
        setIsStatusUpdating(false);
      }
    },
    [mutate, order?.status, orderId],
  );

  const runRefundAction = useCallback(
    async (action: 'request' | 'approve' | 'reject') => {
      if (!orderId) {
        toast.error('Thiếu mã đơn hàng.');
        return;
      }
      setIsRefundProcessing(true);
      try {
        if (action === 'request') {
          await requestOrderRefund(orderId);
          toast.success('Đã gửi yêu cầu hoàn tiền.');
        } else if (action === 'approve') {
          await approveOrderRefund(orderId);
          toast.success('Đã duyệt hoàn tiền.');
        } else {
          await rejectOrderRefund(orderId);
          toast.success('Đã từ chối yêu cầu hoàn tiền.');
        }
        await mutate();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Không thể xử lý yêu cầu hoàn tiền.';
        toast.error(message);
      } finally {
        setIsRefundProcessing(false);
      }
    },
    [mutate, orderId],
  );

  if (!orderId) {
    return <div className="text-destructive">Thiếu mã đơn hàng trong URL.</div>;
  }

  if (orgError) {
    return <div className="text-destructive">{orgError}</div>;
  }

  if (isLoading || isEnsuringOrg) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Đang tải đơn hàng...
      </div>
    );
  }

  if (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Không thể tải dữ liệu đơn hàng.';
    return <div className="text-destructive">{errorMessage}</div>;
  }

  if (!order) {
    return <div className="text-muted-foreground">Không tìm thấy đơn hàng.</div>;
  }

  const orderItems = order.items ?? [];
  const taxableBase = order.taxBreakdown?.taxableAmount ?? order.taxableSubtotal ?? order.subtotal;
  const taxRateLabel =
    typeof order.taxBreakdown?.rate === 'number'
      ? ` (${(order.taxBreakdown.rate * 100).toFixed(0)}%)`
      : '';

  const formatItemDiscount = (
    item: NonNullable<OrderDetail['items']>[number],
  ) => {
    if (!item.discount) {
      return '—';
    }
    const typeLabel =
      item.discountType === 'PERCENT' && item.discountValue
        ? `${item.discountValue}%`
        : item.discountType === 'FIXED' && item.discountValue
          ? formatCurrency(item.discountValue)
          : null;
    return `-${formatCurrency(item.discount)}${typeLabel ? ` (${typeLabel})` : ''}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">Đơn hàng {order.code}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-muted-foreground">
            Tạo lúc {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(order.createdAt))}{' '}
            · Chi nhánh {order.branch?.name ?? 'Chưa gán'} · {getPaymentMethodLabel(order.paymentMethod)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => runRefundAction('request')}
            disabled={isRefundProcessing || isValidating}
          >
            Gửi yêu cầu hoàn tiền
          </Button>
          <Button
            variant="outline"
            onClick={() => runRefundAction('approve')}
            disabled={isRefundProcessing || isValidating}
          >
            Duyệt hoàn tiền
          </Button>
          <Button
            variant="ghost"
            onClick={() => runRefundAction('reject')}
            disabled={isRefundProcessing || isValidating}
          >
            Từ chối
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Trạng thái & ghi chú</CardTitle>
            <CardDescription>Phù hợp với workflow PENDING → PROCESSING → COMPLETED.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-muted-foreground">Trạng thái hiện tại</span>
                <Select
                  value={order.status}
                  onValueChange={handleStatusChange}
                  disabled={isStatusUpdating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isStatusUpdating && (
                  <span className="text-xs text-muted-foreground">
                    <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
                    Đang cập nhật trạng thái...
                  </span>
                )}
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  <span>Cập nhật gần nhất</span>
                </div>
                <p className="mt-1 text-sm font-semibold">
                  {order.updatedAt
                    ? new Intl.DateTimeFormat('vi-VN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(order.updatedAt))
                    : 'Chưa cập nhật'}
                </p>
              </div>
            </div>
            {order.notes && (
              <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                <span className="font-medium text-muted-foreground">Ghi chú:</span>
                <p className="mt-1 whitespace-pre-wrap">{order.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thông tin khách hàng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{order.customer?.name ?? 'Khách lẻ'}</span>
            </div>
            {order.customer?.segment && (
              <Badge variant="secondary" className="w-fit">
                {order.customer.segment}
              </Badge>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{order.customer?.phone ?? 'Chưa có SĐT'}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Store className="h-4 w-4" />
              <span>{order.branch?.name ?? 'Chưa gán chi nhánh'}</span>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Địa chỉ</p>
              <p>{formatAddress(order.customer)}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg border p-2">
                <p className="text-xs text-muted-foreground">Tổng chi tiêu</p>
                <p className="font-semibold">
                  {formatCurrency(order.customer?.totalSpent ?? 0)}
                </p>
              </div>
              <div className="rounded-lg border p-2">
                <p className="text-xs text-muted-foreground">Tổng đơn</p>
                <p className="font-semibold">{order.customer?.totalOrders ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Chi tiết sản phẩm</CardTitle>
            <CardDescription>{orderItems.length} dòng sản phẩm</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead className="text-right">Số lượng</TableHead>
                  <TableHead className="text-right">Đơn giá</TableHead>
                  <TableHead className="text-right">Giảm giá</TableHead>
                  <TableHead className="text-right">Thành tiền (sau giảm)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Chưa có sản phẩm nào.
                    </TableCell>
                  </TableRow>
                )}
                {orderItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{item.productName ?? 'Sản phẩm'}</span>
                          {item.variantName && (
                            <span className="text-xs text-muted-foreground">Biến thể: {item.variantName}</span>
                          )}
                          {item.isTaxExempt && (
                            <Badge variant="outline" className="mt-1 w-fit text-xs">
                              Miễn VAT
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                      <TableCell className="text-right">{formatItemDiscount(item)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(item.netTotal ?? item.total)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tổng quan thanh toán</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tiền hàng</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Giá trị chịu thuế</span>
              <span>{formatCurrency(taxableBase)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Thuế{taxRateLabel}</span>
              <span>{formatCurrency(order.tax)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Phí giao hàng</span>
              <span>{formatCurrency(order.shipping)}</span>
            </div>
            {order.discount ? (
              <div className="flex items-center justify-between text-sm text-destructive">
                <span>Giảm giá</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between text-base font-semibold">
              <span>Tổng cộng</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                <span>Phương thức</span>
              </div>
              <p className="font-semibold">{getPaymentMethodLabel(order.paymentMethod)}</p>
              <p className="text-xs text-muted-foreground">
                {order.isPaid
                  ? `Đã thanh toán ${formatCurrency(order.paidAmount ?? order.total)}`
                  : `Đã thu ${formatCurrency(order.paidAmount ?? 0)} / ${formatCurrency(order.total)}`}
              </p>
              {order.paymentMethod === 'COD' && !order.isPaid && (
                <p className="text-xs text-muted-foreground">
                  Cần thu COD: {formatCurrency(Math.max(order.total - (order.paidAmount ?? 0), 0))}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
