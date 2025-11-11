'use client';

import { useEffect, useState } from 'react';
import { OpenAPI, OrdersService, Order } from '@meocrm/api-client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

OpenAPI.BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    OrdersService.getOrders().then(setOrders);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold">Orders</h1>
      <div className="mt-4">
        {orders.map((order) => (
          <div key={order.id} className="border p-4 my-2 rounded-md">
            <p>Order #{order.id}</p>
            <p>Status: {order.status}</p>
            <p>Total: {order.total}</p>
            <Link href={`/orders/${order.id}`}>
              <Button>View Details</Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
