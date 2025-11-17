# Testing Strategy & Coverage

## Coverage Targets
- **Statements ≥ 80%** (hard gate on CI)
- Current coverage: **85.25%** ✅
- `pnpm -w test -- --coverage` chạy trong pipeline → nếu thấp hơn phải viết thêm unit/e2e
- Critical modules (Orders, Commission, Lead Priority, Settings) cần ≥85%

## Test Pyramid
1. **Unit:** services/helpers (Prisma mocked)
2. **Integration:** NestJS + Prisma test DB (spin up via docker-compose)
3. **E2E:** Playwright (web) + Jest Supertest (API)

## E2E Testing Status

### Playwright E2E Tests - ✅ IMPLEMENTED
**Test Suite:** 50 tests across 6 files
**Status:** 22 passing (44%), 28 require UI implementation
**Run command:** `pnpm test:playwright`

#### Test Files:
1. **tests/e2e/auth.spec.ts** (12 tests)
   - Login/logout flow
   - Session persistence
   - Validation errors
   - Cookie handling
   - Accessibility checks

2. **tests/e2e/dashboard.spec.ts** (10 tests)
   - KPI cards display
   - Revenue charts
   - Top products/customers
   - Navigation

3. **tests/e2e/customers.spec.ts** (9 tests)
   - Customer list
   - Search functionality
   - Pagination

4. **tests/e2e/orders.spec.ts** (7 tests)
   - Orders list/empty state
   - API error handling

5. **tests/e2e/navigation.spec.ts** (10 tests)
   - Sidebar navigation
   - Active link highlighting
   - User menu

6. **tests/e2e/error-pages.spec.ts** (5 tests)
   - 404 page
   - Error boundaries
   - Network errors

#### Known Issues:
- 28 tests failing due to unimplemented UI (customers/orders pages)
- 2 tests with strict mode violations (toast messages)
- Login flow working correctly ✅

### Golden E2E Scenario
1. Login (owner role) → get JWT ✅
2. Create product + stock seed
3. Create POS order → verify:
   - Stock giảm tương ứng
   - Commission event queued (POS immediate)
4. Trigger COD order (optional) → ensure shipping webhook flips status

## Jest Unit Tests (Backend)

### Run Commands:
```bash
# All tests
pnpm -w test

# With coverage
pnpm -w test -- --coverage

# Specific suite
pnpm --filter @meocrm/api test -- lead-priority-commission

# E2E tests
pnpm test:playwright

# Watch mode
pnpm --filter @meocrm/api test:watch
```

### Test Suites:
- **Lead Priority:**
  - `decays HIGH→MEDIUM→LOW→INACTIVE` theo `settings.leadPriority.thresholds`
  - `reset on activity` update `lastActivityAt`
  - `manual override` tôn trọng `allowManualOverride`

- **Commission:**
  - Tier split, rounding (owner nhận phần dư)
  - Refund tạo adjustment âm (`isAdjustment=true`)
  - Payout chuyển `PENDING→APPROVED→PAID`

- **Inventory:**
  - Stock deduction/addition
  - Low stock alerts
  - Inter-branch transfers
  - Negative stock prevention

- **Authentication:**
  - JWT token generation
  - Password hashing
  - Session management

### Error Contract:
Mọi mock API trả `{code,message,details?,traceId}`; test fail nếu thiếu trường

## Test Environment Setup

### Prerequisites:
```bash
# Install dependencies
pnpm install

# Install Playwright browsers (first time only)
pnpm exec playwright install

# Setup test database
pnpm --filter @meocrm/api prisma:migrate
pnpm --filter @meocrm/api prisma db seed
```

### Environment Variables:
Tests use ports 2001-2004:
- Database: `localhost:2001`
- Redis: `localhost:2002`
- API: `localhost:2003`
- Web: `localhost:2004`

See `playwright.config.ts` for full configuration.

## CI/CD Integration

Tests run automatically on:
- Pull requests to `main`/`dev`
- Push to `main`/`dev`

**Test Gates:**
- Unit tests must pass (≥80% coverage)
- E2E tests informational only (UI incomplete)
- TypeScript compilation must succeed
- ESLint must pass

## Next Steps

1. **Implement Missing UI Pages:**
   - Customers list/search
   - Orders list/details
   - Navigation components

2. **Fix Remaining E2E Tests:**
   - Strict mode violations (2 tests)
   - Page content assertions (26 tests)

3. **Add More E2E Scenarios:**
   - POS flow end-to-end
   - Order creation → stock update
   - Commission calculation
