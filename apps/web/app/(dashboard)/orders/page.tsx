'use client';

import { useEffect, useState } from 'react';
import { OrdersService, Order } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchOrders = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await OrdersService.getOrders();
        if (!isMounted) {
          return;
        }
        // API returns Array<Order>
        setOrders(response || []);
      } catch (error) {
        console.error('Failed to fetch orders', error);
        if (isMounted) {
          setErrorMessage('Không thể tải danh sách đơn hàng. Vui lòng thử lại.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchOrders();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold">Orders</h1>
      {isLoading && <p className="mt-4 text-muted-foreground">Đang tải danh sách đơn hàng...</p>}
      {errorMessage && <p className="mt-4 text-destructive">{errorMessage}</p>}
      {!isLoading && !errorMessage && (
        <div className="mt-4">
          {orders.length === 0 && (
            <p className="text-muted-foreground">Chưa có đơn hàng nào trong tổ chức của bạn.</p>
          )}
          {orders.map((order) => (
            <div key={order.id} className="border p-4 my-2 rounded-md">
              <p>Order #{order.code ?? order.id}</p>
              <p>Status: {order.status}</p>
              <p>Tổng tiền: {typeof order.total === 'number' ? formatCurrency(order.total) : 'N/A'}</p>
              <Link href={`/orders/${order.id}`}>
                <Button>View Details</Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
