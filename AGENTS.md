# MeoCRM Agent Instructions

This is the operations manual for Jules/Codex/Gemini when làm việc trên MeoCRM.

## 1. Onboarding / Environment
1. `./setup-jules-vm.sh`
2. Copy env:
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.local.example apps/web/.env.local
   ```
3. Refer `docs/ENVIRONMENT.md` để biết port, Postgres, Redis, Prisma workflow (reset chỉ local).

## 2. Knowledge Base

| Thứ tự | File | Nội dung |
| --- | --- | --- |
| 1 | [docs/Documentation-Map.md](./docs/Documentation-Map.md) | Lộ trình & link. |
| 2 | [docs/settings/README.md](./docs/settings/README.md) | Precedence Default→Plan→Tenant→Branch→Role→User→Object, feature flags, config JSON. |
| 3 | [docs/01_BUSINESS_LOGIC.md](./docs/01_BUSINESS_LOGIC.md) | Luật Lead Priority, Commission, Refund, Debt, Shipping, ví dụ I/O. |
| 4 | [docs/integration/README.md](./docs/integration/README.md) | REST/Webhook/MCP/WS, Telegram/Zalo lưu ý VN. |
| 5 | [docs/testing/Strategy-&-Coverage.md](./docs/testing/Strategy-&-Coverage.md) | Coverage ≥80%, golden E2E, Jest skeleton. |
| 6 | [docs/03_DATABASE_SCHEMA.md](./docs/03_DATABASE_SCHEMA.md) | Data dictionary, PII, soft delete/purge, @@unique rules. |

Module-specific hướng dẫn xem `apps/*/AGENTS.md`.

## 3. Testing Expectations
- `pnpm -w test` trước khi push; thêm `-- --runInBand` nếu cần.
- Golden E2E: login → create product → POS order → stock giảm (tham khảo docs/testing).
- Viết/giữ skeleton cho decay/reset/override/tier/refund/error.
- Coverage tối thiểu 80% (CI fail nếu thấp).

## 4. Guardrails, Workflow & Events
- **Multi-tenant:** không query nếu thiếu `organizationId`. Prisma middleware đã inject; raw SQL phải tự filter.
- **Error shape:** luôn `{code,message,details?,traceId}` (OpenAPI `components.schemas.Error`).
- **Events:** dùng prefix canonical `order.*`, `shipping.*`, `inventory.*`, `commission.*` như trong docs/integration.
- **Settings-driven:** mọi quyết định #34–#48 đọc từ Settings (leadPriority, commission, refund, shipping, notifications). Không hard-code 7/30/60 hay 500k.
- **Workflow chuẩn:**
  1. Đọc Documentation Map → Settings → Business Logic → Integration → Testing.
  2. Mapping config (nếu cần override) từ Admin Settings console.
  3. Code + test.
  4. Update docs (nếu logic đổi) rồi PR.

### Prompt Templates & MEOW
- **MEOW (Mission, Evidence, Output, Warnings):**
  - *Mission*: mô tả yêu cầu + mục tiêu.
  - *Evidence*: link/tài liệu đã đọc (Documentation Map anchors).
  - *Output*: định dạng mong muốn (code, doc, PR note).
  - *Warnings*: constraint (multi-tenant, feature flag, error schema).
- Khi viết prompt/PR comment, đảm bảo 4 phần này để teammate/agent khác takeover nhanh.

### Where to configure?
- Settings console (Admin UI) hoặc seed config `docs/settings/README.md`.
- Sample JSON (Lead/Commission/Refund/Shipping/Notifications/Audit) nằm ngay trong docs/settings – trích dẫn khi mở PR.
- Nếu cần override tạm thời (tenant-specific), ghi rõ scope trong PR (vd: `scope: { tenantId: org_01, branchId: br_02 }`).

## 5. Troubleshooting
Xem [docs/06_TROUBLESHOOTING.md](./docs/06_TROUBLESHOOTING.md) cho lỗi môi trường, Postgres, Redis, hoặc docker.

## 6. Pull Request Checklist
- [ ] Trích dẫn doc anchor (Business Logic / Settings / Integration) trong mô tả PR.
- [ ] Nêu rõ settings/feature flag nào ảnh hưởng (default + override path).
- [ ] Nếu đụng DB schema: mô tả migration + rollback (nhắc migrate reset chỉ local, prod dùng migrate deploy).
- [ ] Tests: `pnpm -w build`, `pnpm -w test` (đính kèm log chính).
- [ ] Error contract + multi-tenant guardrails giữ nguyên.
- [ ] Update Documentation Map nếu thêm file mới.
- [ ] Link tới config mẫu (hoặc note “no config change”).
