# Architecture Overview

MeoCRM chạy dạng multi-tenant modular monolith (NestJS + Prisma). Tất cả request đi qua `RequestContext` → Prisma middleware để auto inject `organizationId` và `traceId`. Các module chính (orders, customers, commissions) dùng chung các service nền như event bus, cron scheduler và audit logger.

## Domain Building Blocks
- **Orders Service:** quản lý lifecycle POS/COD, phát event `order.completed`, `order.refunded`.
- **Commission Engine:** resolve rule config (`FLAT | TIERED | BONUS`), tạo bản ghi Commission và split payout.
- **Payout Scheduler:** cron đọc các commission APPROVED theo `periodMonth`, thực thi transfer/payout và emit event `commission.payout.completed`.

## Sequence: Order → Commission → Payout
1. `order.completed` (POS ngay tại POS / COD thông qua webhook DELIVERED). Event chứa `organizationId`, `orderId`, `paymentType`, `valueGross`, `valueNet`.
2. Commission Engine nhận event, lookup `CommissionRule` theo `code` hoặc default, tính `valueGross`, `valueNet`, `ratePercent`, `split`, rồi tạo bản ghi `Commission` (status `PENDING`, `periodMonth = YYYY-MM`).
3. Admin hoặc workflow service duyệt commission (`/admin/commission-rules` + approval UI) → status chuyển sang `APPROVED`. Nếu refund xảy ra sau đó, engine tạo thêm commission âm (`isAdjustment = true`) link `adjustsCommissionId`.
4. Cron `/commissions/payouts:run` chạy vào `payoutDayOfMonth` → gom tất cả commission APPROVED của kỳ, mark `PAID`, ghi `traceId`, đẩy job sang Payment Service. Payout summary log + webhook được gửi về BI.

## Deployment Notes
- `apps/api` build thành container NestJS đơn, chia modules. Cron runner dùng cùng codebase (`@nestjs/schedule`).
- `apps/web` là Next.js App Router, gọi API theo OpenAPI spec (`apps/api/openapi.yaml`) → generate client.
- Shared config (ví dụ `PRIORITY_CONFIG`) load qua `@meocrm/config` alias và có thể override bằng env trong tương lai.
