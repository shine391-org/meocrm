# Architecture Primer

MeoCRM là modular monolith NestJS + Next.js chạy đa-tenant. Request flow chuẩn:

```plaintext
Client → API Gateway (NestJS) → Guards (JWT) → RequestContext → Service → Prisma → PostgreSQL
                                        ↘ Event Bus / Cron / Notification Workers
```

Tầng config/settings quyết định hành vi (Lead Priority, Commission, Refund, Shipping, Notifications). Tuyệt đối không rẽ nhánh logic bằng hard-code, tất cả đọc từ `SettingsService`.

## Sequence 1 — Auth Handshake
1. Client gọi `POST /auth/login`.
2. NestJS AuthModule dùng `LocalStrategy` xác thực, trả JWT + refresh token.
3. `JwtAuthGuard` kiểm tra token cho request tiếp theo, attach `{ userId, organizationId, roles }`.
4. RequestContext lưu thông tin + traceId → mọi service downstream lấy từ đây.
5. Nếu token hết hạn, client dùng refresh endpoint (có throttling và device binding).

## Sequence 2 — Multi-tenant Request (Guardrail)
1. Controller gọi service mà **không truyền organizationId**.
2. Prisma middleware (global) intercept mọi query, tự inject `organizationId` từ RequestContext + `deletedAt: null`.
3. Nếu developer cố gắng filter tay organizationId khác → middleware ghi nhận và block.
4. Event/Cron: phải lặp từng organization (`withOrganizationContext`) trước khi chạy service để guard hoạt động.

> ⚠️ **Không bypass Prisma middleware.** Raw SQL phải tự thêm `organization_id = ctx.organizationId` + test isolation.

## Sequence 3 — Order → Commission → Payout
1. `order.completed` (POS ngay, COD qua webhook shipping) phát sự kiện `order.completed` với `organizationId`, `channel`, `valueGross`, `valueNet`.
2. Commission engine đọc `settings.commission`:
   - Resolve rule (FLAT/TIERED/BONUS) → tính `ratePercent`, `amount`, `split`.
   - Lưu `Commission` (status `PENDING`, `periodMonth = YYYY-MM`, `source = POS|COD`).
3. Khi admin duyệt hoặc workflow tự động → status `APPROVED`.
4. Cron `payout-runner` tới `settings.commission.payoutDayOfMonth`:
   - Gom tất cả commission APPROVED của kỳ.
   - Đặt status `PAID`, log `traceId`, phát webhook `commission.payout.completed`.
   - Notifications (Telegram/Zalo) gửi job theo feature flag.

## Deployment & Components
- **apps/api**: NestJS (REST, Webhook receiver, Cron). Build thành 1 container; background jobs qua `@nestjs/schedule` + Bull queue khi cần.
- **apps/web**: Next.js App Router, gọi API dựa trên `apps/api/openapi.yaml`.
- **Datastore**: PostgreSQL (Prisma). Soft delete 6 tháng + purge cron.
- **Cache**: Redis cho sessions/queues/feature flags snapshot.
- **Observability**: traceId xuyên suốt (được đưa vào error schema `{code,message,details?,traceId}`).
