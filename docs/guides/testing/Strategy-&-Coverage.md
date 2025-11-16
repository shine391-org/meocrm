# Testing Strategy & Coverage

## Coverage Targets
- **Statements ≥ 80%** (hard gate on CI).\
  `pnpm -w test -- --coverage` chạy trong pipeline → nếu thấp hơn phải viết thêm unit/e2e.
- Critical modules (Orders, Commission, Lead Priority, Settings) cần ≥85%.

## Test Pyramid
1. **Unit:** services/helpers (Prisma mocked).
2. **Integration:** NestJS + Prisma test DB (spin up via docker-compose).
3. **E2E:** Playwright (web) + Jest Supertest (API).

## Golden E2E Scenario
1. Login (owner role) → get JWT.
2. Create product + stock seed.
3. Create POS order → verify:
   - Stock giảm tương ứng.
   - Commission event queued (POS immediate).
4. Trigger COD order (optional) → ensure shipping webhook flips status.

## Jest Skeletons (chạy với `pnpm --filter @meocrm/api test`)
- **Lead Priority:**
  - `decays HIGH→MEDIUM→LOW→INACTIVE` theo `settings.leadPriority.thresholds`.
  - `reset on activity` update `lastActivityAt`.
  - `manual override` tôn trọng `allowManualOverride`.
- **Commission:**
  - Tier split, rounding (owner nhận phần dư).
  - Refund tạo adjustment âm (`isAdjustment=true`).
  - Payout chuyển `PENDING→APPROVED→PAID`.
- **Error contract:** mọi mock API trả `{code,message,details?,traceId}`; test fail nếu thiếu trường.

Chạy nhanh:
```bash
pnpm -w test            # toàn bộ
pnpm --filter @meocrm/api test -- lead-priority-commission # suite cụ thể
```
