# Changelog

All notable changes to LANO CRM project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- OrdersModule Batch 4A (ORD-001…ORD-006) now delivers full NestJS endpoints with branch-aware validation, stock warnings, and customer stat updates.
- Business logic items (ORD-007…ORD-012) implemented, including automatic status workflow enforcement, cancellation handling, COD completion automation, and background stock deduction via `OrderAutomaticActionsService`.
- Orders API responses now expose branch metadata, pagination, and optional warning payloads for low stock scenarios.

### Changed
- POST `/orders` requires `branchId` to ensure multi-branch inventory tracking and enforces “no partial payment” + COD payment rules.
- `GET /orders` and `GET /orders/:id` return normalized `{ data, meta }` payloads used by the dashboard and API client, aligning with the shared response contract.
- Updated e2e suites (orders, debt integrity, shipping) to exercise the new workflow and response shapes, keeping coverage ≥80%.

## [2025-11-16] - E2E Accessibility Fixes & Workflow Documentation

### Fixed
- Login form labels changed from Vietnamese to English for E2E test compatibility
  - "Tên đăng nhập" → "Email"
  - "Mật khẩu" → "Password"
- Added `aria-label` to password toggle button for accessibility compliance
  - Dynamic label: "Ẩn mật khẩu" / "Hiện mật khẩu"
- Added `aria-label` to login button for screen reader support
  - Label: "Đăng nhập vào quản lý"
- Wrapped login page in semantic `<main>` landmark element
- Resolved Next.js cache corruption issue causing syntax errors

### Added
- Comprehensive [WORKFLOW.md](docs/WORKFLOW.md) document proposing optimal collaboration process
  - 4-phase workflow (Initiation, Implementation, Testing, Documentation)
  - Communication protocol between Boss and Claude
  - Testing strategy with test pyramid
  - Session management procedures
  - Documentation standards
- New troubleshooting section in [06_TROUBLESHOOTING.md](docs/06_TROUBLESHOOTING.md)
  - ISSUE #5: E2E Test Accessibility Failures
  - Complete documentation of 4 accessibility issues and solutions
  - Test results and commands for running E2E tests
  - Common mistakes to avoid

### Changed
- E2E test pass rate improved from 0/12 to 3/12
  - Passing: Accessibility scan (zero violations)
  - Passing: Loading state during login
  - Passing: Authentication cookie set on login

### Technical Details
- Files modified:
  - `apps/web/components/auth/login-form.tsx`
  - `apps/web/app/(auth)/login/page.tsx`
  - `docs/06_TROUBLESHOOTING.md`
  - `docs/WORKFLOW.md` (new)
- Test framework: Playwright with Axe accessibility scanner
- Accessibility violations reduced to zero
- Test command: `npx playwright test tests/e2e/auth.spec.ts --project=chromium --workers=2`

## [2025-11-15] - Playwright E2E Tests & Development Scripts

### Added
- Playwright E2E testing framework setup
- Authentication tests in `tests/e2e/auth.spec.ts`
- Development convenience scripts in `package.json`

### Fixed
- Login authentication 404 error issues
- Type safety improvements in AdminGuard
- Logging enhancements in authentication guards

### Technical Details
- Initial E2E test coverage for login flow
- Database seeding for test data
- Cookie-based authentication validation
