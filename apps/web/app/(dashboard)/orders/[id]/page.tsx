'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { OrdersService, Order, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getBrowserToken } from '@/lib/auth/token';
import { formatCurrency } from '@/lib/utils';

const REFUND_REQUEST_ROLES = new Set(['CUSTOMER', 'SALES', 'STAFF']);
const REFUND_DECISION_ROLES = new Set(['MANAGER', 'ADMIN']);

type OrderWithRefundMetadata = Order & { refundStatus?: string | null };

const getRefundStatusValue = (currentOrder?: Order | null): string => {
  if (!currentOrder) {
    return 'UNKNOWN';
  }
  const candidate = currentOrder as OrderWithRefundMetadata;
  return (candidate.refundStatus ?? 'NONE').toUpperCase();
};

const isRequestEligible = (currentOrder: Order) => {
  const refundStatus = getRefundStatusValue(currentOrder);
  if (['REQUESTED', 'APPROVED', 'COMPLETED'].includes(refundStatus)) {
    return false;
  }
  return currentOrder.status !== 'CANCELLED';
};

const isDecisionEligible = (currentOrder: Order) => getRefundStatusValue(currentOrder) === 'REQUESTED';

type CurrentUserResponse = {
  organizationId?: string | null;
  organization?: { id: string };
  role?: string | null;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
const AUTH_ME_ENDPOINT = API_BASE_URL ? `${API_BASE_URL}/auth/me` : '/auth/me';

export default function OrderDetailsPage() {
  const params = useParams<{ id?: string | string[] }>();
  const resolvedParam = params?.id;
  const orderId = Array.isArray(resolvedParam) ? resolvedParam[0] : resolvedParam;
  const [order, setOrder] = useState<Order | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const ensureOrganizationContext = useCallback(async () => {
    if (organizationId) {
      return organizationId;
    }

    const token = getBrowserToken();
    if (!token) {
      if (isMountedRef.current) {
        setErrorMessage('Bạn cần đăng nhập để xem chi tiết đơn hàng.');
      }
      return null;
    }

    try {
      const response = await fetch(AUTH_ME_ENDPOINT, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load current user (${response.status})`);
      }

      const user = (await response.json()) as CurrentUserResponse;
      const tenantId = user.organization?.id ?? user.organizationId ?? null;

      if (!tenantId) {
        throw new Error('Missing organizationId on current user payload');
      }

      if (typeof window !== 'undefined') {
        window.localStorage?.setItem('organizationId', tenantId);
      }

      if (isMountedRef.current) {
        setOrganizationId(tenantId);
        setUserRole(user.role ?? null);
      }

      return tenantId;
    } catch (error) {
      console.error('Failed to resolve organization context', error);
      if (isMountedRef.current) {
        setErrorMessage('Không xác định được tổ chức của bạn.');
        setUserRole(null);
      }
      return null;
    }
  }, [organizationId]);

  const fetchOrder = useCallback(async () => {
    if (!orderId) {
      if (isMountedRef.current) {
        setErrorMessage('Thiếu mã đơn hàng.');
        setOrder(null);
      }
      return;
    }

    if (isMountedRef.current) {
      setIsLoading(true);
      setErrorMessage(null);
    }

    try {
      const tenantId = await ensureOrganizationContext();
      if (!tenantId) {
        if (isMountedRef.current) {
          setOrder(null);
        }
        return;
      }

      const latestOrder = await OrdersService.getOrdersById(orderId);
      if (!isMountedRef.current) {
        return;
      }

      if (latestOrder.organizationId == null || latestOrder.organizationId !== tenantId) {
        setOrder(null);
        setErrorMessage('Bạn không được phép xem đơn hàng này.');
        return;
      }

      setOrder(latestOrder);
    } catch (error) {
      console.error('Failed to fetch order', error);
      if (isMountedRef.current) {
        setOrder(null);
        setErrorMessage('Không thể tải thông tin đơn hàng. Vui lòng thử lại.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [ensureOrganizationContext, orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const runAction = useCallback(
    async (action: () => Promise<void>, successMessage: string, failureMessage: string) => {
      if (!orderId) {
        setErrorMessage('Thiếu mã đơn hàng.');
        return;
      }

      setIsProcessing(true);
      setStatusMessage('Đang xử lý...');
      setErrorMessage(null);
      try {
        await action();
        if (!isMountedRef.current) {
          return;
        }
        setStatusMessage(successMessage);
        await fetchOrder();
      } catch (error) {
        console.error(failureMessage, error);
        if (isMountedRef.current) {
          setStatusMessage(null);
          let message = failureMessage;
          if (error instanceof ApiError && error.status === 403) {
            message = 'Bạn không có quyền thực hiện hành động này.';
          } else if (error instanceof Error && error.message) {
            message = error.message;
          }
          setErrorMessage(message);
        }
      } finally {
        if (isMountedRef.current) {
          setIsProcessing(false);
        }
      }
    },
    [fetchOrder, orderId],
  );

  const handleRequestRefund = () => {
    if (!orderId || !order) {
      setErrorMessage('Thiếu mã đơn hàng.');
      return;
    }

    const normalizedRole = userRole?.toUpperCase() ?? '';
    if (!REFUND_REQUEST_ROLES.has(normalizedRole)) {
      setErrorMessage('Bạn không có quyền yêu cầu hoàn tiền.');
      return;
    }

    if (!isRequestEligible(order)) {
      setErrorMessage('Đơn hàng không đủ điều kiện để yêu cầu hoàn tiền.');
      return;
    }

    return runAction(
      () => OrdersService.postOrdersByIdRefund(orderId),
      'Yêu cầu hoàn tiền đã được gửi.',
      'Không thể gửi yêu cầu hoàn tiền.',
    );
  };

  const handleApproveRefund = () => {
    if (!orderId || !order) {
      setErrorMessage('Thiếu mã đơn hàng.');
      return;
    }

    const normalizedRole = userRole?.toUpperCase() ?? '';
    if (!REFUND_DECISION_ROLES.has(normalizedRole)) {
      setErrorMessage('Bạn không có quyền duyệt hoàn tiền.');
      return;
    }

    if (!isDecisionEligible(order)) {
      setErrorMessage('Chỉ có thể duyệt các yêu cầu hoàn tiền đang chờ xử lý.');
      return;
    }

    return runAction(
      () => OrdersService.postOrdersByIdRefundApprove(orderId),
      'Đã duyệt hoàn tiền.',
      'Không thể duyệt hoàn tiền.',
    );
  };

  const handleRejectRefund = () => {
    if (!orderId || !order) {
      setErrorMessage('Thiếu mã đơn hàng.');
      return;
    }

    const normalizedRole = userRole?.toUpperCase() ?? '';
    if (!REFUND_DECISION_ROLES.has(normalizedRole)) {
      setErrorMessage('Bạn không có quyền từ chối hoàn tiền.');
      return;
    }

    if (!isDecisionEligible(order)) {
      setErrorMessage('Chỉ có thể từ chối các yêu cầu hoàn tiền đang chờ xử lý.');
      return;
    }

    return runAction(
      () => OrdersService.postOrdersByIdRefundReject(orderId),
      'Đã từ chối yêu cầu hoàn tiền.',
      'Không thể từ chối yêu cầu hoàn tiền.',
    );
  };

  const normalizedRole = userRole?.toUpperCase() ?? null;
  const refundStatus = getRefundStatusValue(order);
  const canRequestRefund = Boolean(order && normalizedRole && REFUND_REQUEST_ROLES.has(normalizedRole));
  const canModerateRefund = Boolean(order && normalizedRole && REFUND_DECISION_ROLES.has(normalizedRole));
  const requestDisabled = !order || !isRequestEligible(order) || isProcessing;
  const decisionDisabled = !order || !isDecisionEligible(order) || isProcessing;

  if (isLoading) {
    return <div>Đang tải đơn hàng...</div>;
  }

  if (!order) {
    return <div>{errorMessage ?? 'Không tìm thấy đơn hàng hoặc bạn không có quyền truy cập.'}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order #{order.code ?? order.id}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Status: {order.status}</p>
        {refundStatus !== 'NONE' && refundStatus !== 'UNKNOWN' && (
          <p className="text-sm text-muted-foreground">Tình trạng hoàn tiền: {refundStatus}</p>
        )}
        <p>Tổng tiền: {formatCurrency(order.total)}</p>
        {statusMessage && <p className="mt-2 text-sm text-muted-foreground">{statusMessage}</p>}
        {errorMessage && <p className="mt-2 text-sm text-destructive">{errorMessage}</p>}
        {/* TODO: Display other order details */}
        {(canRequestRefund || canModerateRefund) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {canRequestRefund && (
              <Button onClick={handleRequestRefund} disabled={requestDisabled}>
                Yêu cầu hoàn tiền
              </Button>
            )}
            {canModerateRefund && (
              <>
                <Button onClick={handleApproveRefund} variant="secondary" disabled={decisionDisabled}>
                  Duyệt hoàn tiền
                </Button>
                <Button onClick={handleRejectRefund} variant="destructive" disabled={decisionDisabled}>
                  Từ chối hoàn tiền
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
