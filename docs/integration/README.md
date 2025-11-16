# Integration Guide

MeoCRM expose nhiều bề mặt tích hợp: REST, Webhook, MCP, WebSocket streaming. Tất cả phải tôn trọng chuẩn lỗi `{code,message,details?,traceId}` và HMAC ký payload.

## 1. REST APIs
- Swagger/OpenAPI: `apps/api/openapi.yaml`.
- Authentication: Bearer JWT.
- Idempotency: header `Idempotency-Key`. Server lưu 24h, trả lại response cũ nếu trùng.

## 2. Webhooks
- Canonical events (prefix bằng domain):
  - `order.created`, `order.completed`, `order.cancelled`, `order.refunded`.
  - `shipping.label.created`, `shipping.delivered`, `shipping.failed`.
  - `inventory.low_stock`, `inventory.adjusted`.
  - `commission.payout.completed`.
- Payload mẫu:

```json
{
  "event": "order.completed",
  "version": 1,
  "organizationId": "org_01",
  "data": {
    "orderId": "ord_001",
    "channel": "POS",
    "valueGross": "1500000.00",
    "valueNet": "1300000.00"
  },
  "meta": {
    "traceId": "order-ord_001",
    "sentAt": "2025-11-11T05:00:00.000Z"
  }
}
```

- HMAC: header `X-MeoCRM-Signature = sha256(secret, rawBody)`. Client phải verify trước khi xử lý.
- Retry/backoff: exponential `2s, 8s, 32s, 2m`. Sau 5 lần thất bại → gửi email + hiển thị cảnh báo UI.
- Idempotency: `deliveryId` trong header, partners lưu để tránh xử lý trùng.

## 3. MCP (Meo Control Protocol)
- Dùng cho automation nội bộ (Jules/Codex/Gemini). Cung cấp lệnh:
  - `mcp orders.sync`
  - `mcp lead-priority.recalculate`
- Mọi lệnh đều cần scope token và audit.

## 4. WebSocket / Streaming
- Kênh `wss://api.meocrm.com/ws` cung cấp sự kiện realtime cho dashboard (orders, inventory, staff alerts).
- Mỗi tenant có namespace riêng; subscribe phải kèm JWT.

## Staff Notifications (VN Channels)

| Channel | Use-case | Ghi chú |
| --- | --- | --- |
| Telegram Bot | Ops/CS nội bộ | Rate-limit: ~1 msg/s/chat, 30 msg/s tổng, 20 msg/min/group. Token phải giữ trong secrets, worker có queue + backoff. |
| Zalo OA (ZNS) | CSKH/customer (Phase 2) | Cần OA + Zalo Cloud API (ZCA). Template phải được duyệt trước, có webhook delivery, phù hợp gửi transactional (đơn hàng, COD). Không cần khách follow OA. |

- Staff notifications đọc từ `settings.notifications.staff`. Có thể bật/tắt từng provider bằng feature flag.
- Customer notifications mặc định off (`Decision #42`). Khi bật, template mapping nằm trong `ZALO_TEMPLATE` secret store.

## Operational Notes (VN Market)
- **Telegram:** traffic bot qua HTTPS (TLS) – không phải MTProto end-to-end. Luôn rotate token nếu nghi rò rỉ.
- **Zalo Cloud:** tuân thủ hạn mức API (xem <https://developers.zalo.me/docs/api>). Template approval thường 1-2 ngày làm việc. Tránh spam; dùng retry có exponential backoff tối đa 3 lần.
- **HMAC Secret Management:** lưu trong Secret Manager, retrieve qua env `WEBHOOK_SECRET`. Không embed vào code.
