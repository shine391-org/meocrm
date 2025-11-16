# CodeRabbit – Final Follow-ups

## Mission
- Address the 10 CodeRabbit review findings on branch `chore/coderabbit-final-followups` targeting `dev`.
- Hard requirements: multi-tenant Prisma guards, error envelope `{code,message,details?,traceId}`, follow ports in `docs/ENVIRONMENT.md`, keep coverage ≥ 80% (see `docs/testing/Strategy-&-Coverage.md`).

## Evidence
- [docs/Documentation-Map.md](../Documentation-Map.md) – entry points for business logic/settings/integration/testing references.
- [docs/settings/README.md](../settings/README.md) – precedence (Default→Plan→Tenant→Branch→Role→User→Object) + sample JSON for Lead Priority / Refund / Shipping overrides.
- [docs/01_BUSINESS_LOGIC.md](../01_BUSINESS_LOGIC.md) & [docs/integration/README.md](../integration/README.md) – debt workflow + event contracts (`order.*`, `shipping.*`, `inventory.*`, `commission.*`).
- [docs/testing/Strategy-&-Coverage.md](../testing/Strategy-&-Coverage.md) – Jest skeletons + ≥80% coverage target.

## Output
1. **CI** – quote `$GITHUB_OUTPUT` writes in `.github/workflows/ci-main.yml` to clear ShellCheck SC2086.
2. **Docs** – annotate architecture sequence fences with ```plaintext``` for lint compliance.
3. **ParseDate pipe** – strict regex `^(\d{4})-(\d{2})(?:-(\d{2}))?$`, normalize YYYY-MM → `YYYY-MM-01`, instantiate UTC midnight, reject extra time suffix.
4. **API bootstrap** – centralize WEBHOOK_MAX_BODY default (1mb), reuse raw limit for Express raw + body parsers, add tested `resolveApiPort` guard (1–65535) before `app.listen`.
5. **Cron debt snapshot** – cursor-based pagination (orderBy id, take=10), Decimal math (`total.minus(paid)`), filter via `debtValue.greaterThan(0)`, Promise.allSettled per batch, skip duplicates as before.
6. **PrismaService** – singleton factory `getInstance()` handles `$extends(softDelete)` once; Nest provider switched to `useFactory`; helper methods stay on prototype.
7. **Webhooks** – shipping.delivered only upgrades orders that are `PROCESSING`; warn when payload missing fields or already completed (consider optimistic locking per policy notes).
8. **Priority config** – default lead priority uses uppercase enum `HIGH` per `LeadPriority` in settings JSON.
9. **Web UI** – Orders detail/list show totals via `formatCurrency` (Intl `vi-VN`, VND) with safe fallback; refund buttons translated to Vietnamese.
10. **Docs + checklist** – this spec file plus instructions to keep Draft PR open with `needs-testing` and attach dev logs (API :2003 / Web :2004) proving webhooks/cron endpoints reachable.

## Warnings
- Always include `organizationId` filters in Prisma/raw SQL (multi-tenant guardrails) and emit errors via `{code,message,details?,traceId}`.
- Settings-driven decisions (#34–#48) must read from Settings service/config JSON; never hard-code SLA windows/amounts (see docs/settings samples).
- Shipping events must follow canonical prefixes from `docs/integration/README.md` and respect webhook secret policies.
- Prisma migrations: reset is local only; production uses `migrate deploy`.

## Tests & Verification
- `pnpm -C apps/api test -- --coverage` – covers ParseDate, server config, debt snapshot, PrismaService, webhooks.
- `pnpm -C apps/web test` – ensures updated formatting + translations keep component renders stable.
- Manual smoke: `pnpm --filter @meocrm/api dev` on port 2003 + `pnpm --filter @meocrm/web dev` on port 2004 (log results attached in PR) to validate endpoints, CORS, webhook raw body + cron wiring.

## Scope / Next Steps
- Scope limited to review follow-ups; no schema changes.
- Future work: evaluate optimistic locking/version column on orders to guard shipping.webhook races, extend currency helper to support multi-currency tenants when enabled in settings.
