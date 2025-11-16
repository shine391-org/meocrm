# Environment & Tooling

## Local Setup
1. Chạy `./setup-jules-vm.sh`.
2. Copy env:
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.local.example apps/web/.env.local
   ```
3. Services:
   - API: `pnpm --filter @meocrm/api dev` (NestJS port `2003`).
   - Web: `pnpm --filter @meocrm/web dev` (Next.js port `2004`).
   - PostgreSQL: `localhost:2001` (user: `meocrm_user`).
   - Redis: `localhost:2002`.

## Prisma Workflow
- **Local ONLY:** `pnpm --filter @meocrm/api prisma migrate dev` hoặc `prisma migrate reset`.\
  Reset sẽ drop database → chỉ làm trên máy dev.
- **Shared/Staging/Prod:** dùng `pnpm --filter @meocrm/api prisma migrate deploy`.\
  Không được chạy `reset` trên môi trường này.
- Sau khi đổi schema: `pnpm --filter @meocrm/api prisma generate`.

## Rollback & Seed
- Nếu migration lỗi ở local → chạy `pnpm --filter @meocrm/api prisma migrate reset --force --skip-generate --skip-seed`, rồi `pnpm prisma migrate dev`.
- Seed dữ liệu demo:
  ```bash
  pnpm --filter @meocrm/api prisma db seed
  ```
- Khi rollback production: tạo migration đảo chiều hoặc restore snapshot DB (PgBackRest) → cập nhật docs/PR với hướng dẫn.

## Ports & Networking
- API `http://localhost:2003`
- Web `http://localhost:2004`
- Swagger `http://localhost:2003/api/docs`
- MCP/WS `ws://localhost:2003/ws`

## Observability
- Logs tuân thủ JSON + `traceId`.
- Khi chạy cục bộ có thể bật `DEBUG=request:*` để xem RequestContext.
