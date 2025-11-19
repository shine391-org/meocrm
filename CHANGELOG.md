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
