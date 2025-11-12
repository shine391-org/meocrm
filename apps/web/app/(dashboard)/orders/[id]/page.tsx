'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { OpenAPI, OrdersService, Order } from '@meocrm/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

OpenAPI.BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export default function OrderDetailsPage() {
  const params = useParams();
  const orderId = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    setErrorMessage(null);
    try {
      const latestOrder = await OrdersService.getOrdersById(orderId);
      setOrder(latestOrder);
    } catch (error) {
      console.error('Failed to fetch order', error);
      setErrorMessage('Không thể tải thông tin đơn hàng. Vui lòng thử lại.');
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const runAction = useCallback(
    async (action: () => Promise<void>, successMessage: string, failureMessage: string) => {
      if (!orderId) return;
      setIsProcessing(true);
      setStatusMessage('Đang xử lý...');
      setErrorMessage(null);
      try {
        await action();
        setStatusMessage(successMessage);
        await fetchOrder();
      } catch (error) {
        console.error(failureMessage, error);
        setStatusMessage(null);
        setErrorMessage(failureMessage);
      } finally {
        setIsProcessing(false);
      }
    },
    [fetchOrder, orderId],
  );

  const handleRequestRefund = () =>
    runAction(
      () => OrdersService.postOrdersByIdRefund(orderId),
      'Yêu cầu hoàn tiền đã được gửi.',
      'Không thể gửi yêu cầu hoàn tiền.',
    );

  const handleApproveRefund = () =>
    runAction(
      () => OrdersService.postOrdersByIdRefundApprove(orderId),
      'Đã duyệt hoàn tiền.',
      'Không thể duyệt hoàn tiền.',
    );

  const handleRejectRefund = () =>
    runAction(
      () => OrdersService.postOrdersByIdRefundReject(orderId),
      'Đã từ chối yêu cầu hoàn tiền.',
      'Không thể từ chối yêu cầu hoàn tiền.',
    );

  if (!order) {
    return <div>{errorMessage ?? 'Đang tải đơn hàng...'}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order #{order.id}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Status: {order.status}</p>
        <p>Total: {order.total}</p>
        {statusMessage && <p className="mt-2 text-sm text-muted-foreground">{statusMessage}</p>}
        {errorMessage && <p className="mt-2 text-sm text-destructive">{errorMessage}</p>}
        {/* TODO: Display other order details */}
        <div className="mt-4 space-x-2">
          <Button onClick={handleRequestRefund} disabled={isProcessing}>
            Request Refund
          </Button>
          <Button onClick={handleApproveRefund} variant="secondary" disabled={isProcessing}>
            Approve Refund
          </Button>
          <Button onClick={handleRejectRefund} variant="destructive" disabled={isProcessing}>
            Reject Refund
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
