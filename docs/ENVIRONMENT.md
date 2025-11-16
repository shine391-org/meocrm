# Environment & Tooling

## ⚡ Jules VM Snapshot Environment (Production Dev Mirror)
> Mặc định cho tất cả agent đang làm việc trong Jules/Codex VM.

- **Infra**: Postgres 17 + Redis 8 chạy bằng `sudo docker compose -f /tmp/meocrm-compose.yaml up -d db redis`. Ports: `2001` & `2002`.
- **Runtime**: Node 20.x LTS, pnpm 10.x, Docker 27 đã cài sẵn trong snapshot.
- **Env**: Được load từ Jules GUI profile; không commit `.env` và không chỉnh tay khi đang ở trong VM.
- **API Client**: `@meocrm/api-client` đã build sẵn, nhưng hãy chạy lại `pnpm --filter @meocrm/api-client build` nếu kiểu TS đổi.
- **Warning**: **Không chạy** `setup-jules-vm.sh`, không cài thêm PostgreSQL/Redis hệ thống; snapshot đã chuẩn hóa mọi thứ.

### Snapshot Checklist
1. `sudo docker ps` → đảm bảo containers `db` & `redis` lên.
2. Nếu thiếu, `sudo docker compose -f /tmp/meocrm-compose.yaml up -d db redis`.
3. `pnpm install`
4. `pnpm --filter @meocrm/api-client build`
5. `pnpm dev:api` + `pnpm dev:web`

### Canonical Jules VM ENV Block
Được cấu hình trong GUI, nhưng ghi lại ở đây để tham chiếu nhanh:

```env
DATABASE_URL=postgresql://meocrm_user:meocrm_dev_password@127.0.0.1:2001/meocrm_dev?schema=public
DB_NAME=meocrm_dev
DB_USER=meocrm_user
DB_PASSWORD=meocrm_dev_password
DB_PORT=2001

REDIS_HOST=localhost
REDIS_PORT=2002
REDIS_URL=redis://localhost:2002

PORT=2003
NEXT_PUBLIC_API_URL=http://localhost:2003
CORS_ORIGIN=http://localhost:2004
API_PREFIX=api
API_VERSION=v1
PRISMA_HIDE_UPDATE_MESSAGE=true

JWT_SECRET=dev-secret-jules-vm
JWT_REFRESH_SECRET=dev-refresh-secret-jules-vm
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

## Local Setup
> Dành cho dev chạy trên máy cá nhân (ngoài Jules). Nếu bạn đang ở Jules VM, **đừng** chạy các bước dưới.

1. Chạy `./setup-jules-vm.sh`. *(Skip trong Jules VM vì snapshot đã thực hiện sẵn.)*
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
