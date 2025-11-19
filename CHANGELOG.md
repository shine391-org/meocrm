# Changelog

## [Unreleased]
- feat(orders/inventory): add `OrderInventoryReservation`, stock adjustments, automation + audit logging.
- feat(orders): move customer stats/COD settlement to automation (`markCodPaid`, `taxableSubtotal`, item-level discounts, warnings).
- feat(shipping): dynamic fee breakdown, retry/failure flow, auto-complete + COD settlement hooks.
- feat(pricing): support per-item discounts + VAT exemptions via `taxBreakdown`.
- feat(security): Prisma org-scope middleware + `@OrganizationScopedModel` decorator + RequestContext trace propagation.
- feat(audit): Inventory/Shipping audit events + daily audit-log archive cron, docs refreshed.
- chore(devx): add `scripts/seed-dev.sh` + doc hướng dẫn seed dữ liệu cho frontend.
- docs: update ROADMAP, business logic & API reference to reflect new workflows.
- chore(frontend): nâng Next.js lên 16.0.3 + React 19, Tailwind CSS 4, chuyển lint sang cấu hình ESLint 9 dạng flat và loại bỏ Pages Router fallback `_error.tsx`.
- chore(api): bump NestJS 11.1.9, uuid 13 và cập nhật toàn bộ devDependencies (Jest 30, TypeScript 5.9) cho phù hợp với pnpm workspace.
- docs: README nêu rõ stack mới (Next.js 16 / React 19 / Prisma 6) và changelog ghi chú upgrade.
