'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { OpenAPI, OrdersService, Order } from '@meocrm/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

OpenAPI.BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export default function OrderDetailsPage() {
  const params = useParams();
  const orderId = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);

  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (orderId) {
      OrdersService.getOrdersById(orderId).then(setOrder);
    }
  }, [orderId]);

  const handleRequestRefund = async () => {
    setMessage('Requesting refund...');
    try {
      await OrdersService.postOrdersByIdRefund(orderId);
      setMessage('Refund request successful!');
    } catch (error) {
      setMessage('Refund request failed.');
    }
  };

  const handleApproveRefund = async () => {
    setMessage('Approving refund...');
    try {
      await OrdersService.postOrdersByIdRefundApprove(orderId);
      setMessage('Refund approved!');
    } catch (error) {
      setMessage('Refund approval failed.');
    }
  };

  const handleRejectRefund = async () => {
    setMessage('Rejecting refund...');
    try {
      await OrdersService.postOrdersByIdRefundReject(orderId);
      setMessage('Refund rejected!');
    } catch (error) {
      setMessage('Refund rejection failed.');
    }
  };

  if (!order) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order #{order.id}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Status: {order.status}</p>
        <p>Total: {order.total}</p>
        {/* TODO: Display other order details */}
        <div className="mt-4 space-x-2">
          <Button onClick={handleRequestRefund}>Request Refund</Button>
          <Button onClick={handleApproveRefund} variant="secondary">
            Approve Refund
          </Button>
          <Button onClick={handleRejectRefund} variant="destructive">
            Reject Refund
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
