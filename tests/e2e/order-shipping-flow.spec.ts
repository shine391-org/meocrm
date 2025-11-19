import { test, expect } from '@playwright/test';
import { OrderInventoryReservationStatus, PrismaClient } from '@prisma/client';
import { loginViaApi, apiGet, apiPost, apiPatch } from './utils/api';

type OrderResponse = { data: any };
type ShippingResponse = { data: any };

const COD_TRACKING_PREFIX = 'TRK-COD';
const RETURN_TRACKING_PREFIX = 'TRK-FAIL';
const prisma = new PrismaClient();
let shippingPartnerId: string;

test.beforeAll(async () => {
  const partner = await prisma.shippingPartner.findFirst({
    orderBy: { createdAt: 'asc' },
  });
  if (!partner) {
    throw new Error('Seed missing shipping partner');
  }
  shippingPartnerId = partner.id;
  console.log('[E2E] shipping partner id:', shippingPartnerId);
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

async function getFirstItem<T>(
  request: Parameters<typeof apiGet>[0],
  token: string,
  path: string,
) {
  const payload: any = await apiGet(request, path, token);
  if (Array.isArray(payload)) {
    return payload[0];
  }
  if (Array.isArray(payload?.data)) {
    return payload.data[0];
  }
  return payload?.data ?? payload;
}

test.describe.configure({ mode: 'serial' });

test.describe('Order automation flow (API)', () => {
  test('completes COD order when shipping delivered', async ({ request }) => {
    const auth = await loginViaApi(request);
    const token = auth.accessToken;

    const branch = await getFirstItem(request, token, '/branches');
    const customer = await getFirstItem(request, token, '/customers?limit=1');
    const product = await getFirstItem(request, token, '/products?limit=1');

    expect(branch?.id, 'branch seeded').toBeTruthy();
    expect(customer?.id, 'customer seeded').toBeTruthy();
    expect(product?.id, 'product seeded').toBeTruthy();

    const orderPayload = {
      branchId: branch.id,
      customerId: customer.id,
      items: [
        {
          productId: product.id,
          quantity: 1,
        },
      ],
      paymentMethod: 'COD',
      channel: 'POS',
      discount: 0,
      shipping: 15000,
      notes: 'E2E COD order',
      isPaid: false,
      paidAmount: 0,
    };

    const createdOrder = (await apiPost<OrderResponse>(
      request,
      '/orders',
      token,
      orderPayload,
    )).data;

    expect(createdOrder.status).toBe('PENDING');

    await apiPatch(
      request,
      `/orders/${createdOrder.id}/status`,
      token,
      { status: 'PROCESSING' },
    );

    const shippingPayload = {
      orderId: createdOrder.id,
      partnerId: shippingPartnerId,
      trackingCode: `${COD_TRACKING_PREFIX}-${Date.now()}`,
      recipientName: customer.name ?? 'E2E Customer',
      recipientPhone: customer.phone ?? '0900000000',
      recipientAddress: customer.address ?? '123 Playwright St',
      shippingFee: 30000,
      codAmount: Number(createdOrder.total),
      weight: 500,
      notes: 'E2E flow',
    };

    const shippingOrder = (await apiPost<ShippingResponse>(
      request,
      '/shipping/orders',
      token,
      shippingPayload,
    )).data;

    await apiPatch(
      request,
      `/shipping/orders/${shippingOrder.id}/status`,
      token,
      { status: 'DELIVERED', collectedCodAmount: Number(createdOrder.total) },
    );

    const refreshedOrder = (await apiGet<OrderResponse>(
      request,
      `/orders/${createdOrder.id}`,
      token,
    )).data;

    expect(refreshedOrder.status).toBe('COMPLETED');
    expect(refreshedOrder.isPaid).toBe(true);
    expect(Number(refreshedOrder.paidAmount)).toBe(Number(createdOrder.total));
  });

  test('rolls order back to pending when shipping fails', async ({ request }) => {
    const auth = await loginViaApi(request);
    const token = auth.accessToken;

    const branch = await getFirstItem(request, token, '/branches');
    const customer = await getFirstItem(request, token, '/customers?limit=1');
    const product = await getFirstItem(request, token, '/products?limit=1');

    const orderPayload = {
      branchId: branch.id,
      customerId: customer.id,
      items: [
        {
          productId: product.id,
          quantity: 1,
        },
      ],
      paymentMethod: 'CASH',
      channel: 'POS',
      discount: 0,
      shipping: 12000,
      notes: 'E2E fail order',
      isPaid: false,
      paidAmount: 0,
    };

    const createdOrder = (await apiPost<OrderResponse>(
      request,
      '/orders',
      token,
      orderPayload,
    )).data;

    await apiPatch(
      request,
      `/orders/${createdOrder.id}/status`,
      token,
      { status: 'PROCESSING' },
    );

    const shippingOrder = (await apiPost<ShippingResponse>(
      request,
      '/shipping/orders',
      token,
      {
        orderId: createdOrder.id,
        partnerId: shippingPartnerId,
        trackingCode: `${RETURN_TRACKING_PREFIX}-${Date.now()}`,
        recipientName: customer.name ?? 'E2E Customer',
        recipientPhone: customer.phone ?? '0900000000',
        recipientAddress: customer.address ?? '123 Playwright St',
        shippingFee: 20000,
        codAmount: 0,
        weight: 400,
        notes: 'E2E fail flow',
      },
    )).data;

    await apiPatch(
      request,
      `/shipping/orders/${shippingOrder.id}/status`,
      token,
      { status: 'FAILED', failedReason: 'Courier lost package' },
    );

    const refreshedOrder = (await apiGet<OrderResponse>(
      request,
      `/orders/${createdOrder.id}`,
      token,
    )).data;

    expect(refreshedOrder.status).toBe('PENDING');
    expect(refreshedOrder.isPaid).toBe(false);
  });

  test('monitors reservations across consecutive shipping failures', async ({ request }) => {
    const auth = await loginViaApi(request);
    const token = auth.accessToken;

    const branch = await getFirstItem(request, token, '/branches');
    const customer = await getFirstItem(request, token, '/customers?limit=1');
    const product = await getFirstItem(request, token, '/products?limit=1');

    const orderPayload = {
      branchId: branch.id,
      customerId: customer.id,
      items: [
        {
          productId: product.id,
          quantity: 2,
        },
      ],
      paymentMethod: 'CASH',
      channel: 'POS',
      discount: 0,
      shipping: 15000,
      notes: 'E2E repeated fail flow',
      isPaid: false,
      paidAmount: 0,
    };

    const createdOrder = (await apiPost<OrderResponse>(
      request,
      '/orders',
      token,
      orderPayload,
    )).data;

    await apiPatch(
      request,
      `/orders/${createdOrder.id}/status`,
      token,
      { status: 'PROCESSING' },
    );

    const firstShipping = (await apiPost<ShippingResponse>(
      request,
      '/shipping/orders',
      token,
      {
        orderId: createdOrder.id,
        partnerId: shippingPartnerId,
        trackingCode: `${RETURN_TRACKING_PREFIX}-${Date.now()}`,
        recipientName: customer.name ?? 'E2E Customer',
        recipientPhone: customer.phone ?? '0900000000',
        recipientAddress: customer.address ?? '123 Retry St',
        shippingFee: 25000,
        codAmount: 0,
        weight: 300,
        notes: 'Retry flow',
      },
    )).data;

    await apiPatch(
      request,
      `/shipping/orders/${firstShipping.id}/status`,
      token,
      { status: 'FAILED', failedReason: 'Courier delay' },
    );

    const alertsAfterFirstFail = await apiGet<{ data: any[] }>(
      request,
      `/inventory/reservation-alerts?orderId=${createdOrder.id}`,
      token,
    );
    expect(alertsAfterFirstFail.data.length).toBe(0);

    await apiPatch(
      request,
      `/orders/${createdOrder.id}/status`,
      token,
      { status: 'PROCESSING' },
    );

    const secondShipping = (await apiPost<ShippingResponse>(
      request,
      '/shipping/orders',
      token,
      {
        orderId: createdOrder.id,
        partnerId: shippingPartnerId,
        trackingCode: `${RETURN_TRACKING_PREFIX}-SECOND-${Date.now()}`,
        recipientName: customer.name ?? 'E2E Customer',
        recipientPhone: customer.phone ?? '0900000000',
        recipientAddress: customer.address ?? '123 Retry St',
        shippingFee: 26000,
        codAmount: 0,
        weight: 400,
        notes: 'Second attempt',
      },
    )).data;

    await apiPatch(
      request,
      `/shipping/orders/${secondShipping.id}/status`,
      token,
      { status: 'FAILED', failedReason: 'Customer not home' },
    );

    const alertsAfterSecondFail = await apiGet<{ data: any[] }>(
      request,
      `/inventory/reservation-alerts?orderId=${createdOrder.id}`,
      token,
    );
    expect(alertsAfterSecondFail.data.length).toBe(0);

    const dbOrder = await prisma.order.findUnique({
      where: { id: createdOrder.id },
      include: { items: true },
    });
    if (!dbOrder?.items?.length) {
      throw new Error('Order items not found for leak test');
    }

    let leakReservationId: string | null = null;
    try {
      const leakReservation = await prisma.orderInventoryReservation.create({
        data: {
          organizationId: dbOrder.organizationId,
          orderId: dbOrder.id,
          orderItemId: dbOrder.items[0].id,
          branchId: dbOrder.branchId!,
          productId: dbOrder.items[0].productId,
          quantity: 1,
          variantReservedQuantity: 0,
          status: OrderInventoryReservationStatus.RESERVED,
        },
      });
      leakReservationId = leakReservation.id;

      await apiPost(
        request,
        '/inventory/reservation-alerts/scan',
        token,
        { orderId: createdOrder.id, minAgeMinutes: 0 },
      );

      const leakAlerts = await apiGet<{ data: any[] }>(
        request,
        `/inventory/reservation-alerts?orderId=${createdOrder.id}`,
        token,
      );
      expect(leakAlerts.data.length).toBeGreaterThan(0);

      await prisma.orderInventoryReservation.update({
        where: { id: leakReservation.id },
        data: { status: OrderInventoryReservationStatus.RETURNED },
      });

      await apiPost(
        request,
        '/inventory/reservation-alerts/scan',
        token,
        { orderId: createdOrder.id, minAgeMinutes: 0 },
      );

      const clearedAlerts = await apiGet<{ data: any[] }>(
        request,
        `/inventory/reservation-alerts?orderId=${createdOrder.id}`,
        token,
      );
      expect(clearedAlerts.data.length).toBe(0);
    } finally {
      if (leakReservationId) {
        await prisma.orderInventoryReservation.delete({ where: { id: leakReservationId } }).catch(() => undefined);
      }
    }
  });
});
