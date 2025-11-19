import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
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
});
