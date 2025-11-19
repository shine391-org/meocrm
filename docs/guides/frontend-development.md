# Frontend Development Guidelines

## Framework: Next.js (App Router)

## Key Rules:
- **UI Components:** Use shadcn/ui components from `components/ui`
- **State Management:** React Query for server state
- **API Communication:** Functions in `lib/api/`
- **Server Actions:** Use for mutations (Lesson #8 from `DEVELOPMENT_LESSONS_LEARNED.md`)
- **No client redirects:** Server-side only (Lesson #4 from `DEVELOPMENT_LESSONS_LEARNED.md`)

## Architecture:
```
Page (App Router)
    ↓
Server Actions (Mutations)
    ↓
API Client (lib/api/)
    ↓
Backend API
```

## Testing:
```bash
pnpm --filter @meocrm/web test
```

## Key docs:
- [docs/reference/04_API_REFERENCE.md](../../reference/04_API_REFERENCE.md) (API endpoints)

---

## Seed dữ liệu cho Frontend

1. Đảm bảo Postgres/Redis dev đang chạy (`docker compose` trong Jules snapshot hoặc cấu hình riêng).
2. Xuất các biến môi trường seed:
   ```bash
   export SEED_ADMIN_EMAIL=seed@example.com
   export SEED_ADMIN_PASSWORD=Passw0rd!
   ```
3. Chạy script tiện ích:
   ```bash
   ./scripts/seed-dev.sh
   ```
   Script sẽ reset DB, apply migration mới nhất và chạy `prisma db seed`. Nếu không cung cấp `SEED_ADMIN_PASSWORD`, script mặc định `Passw0rd!`.
4. Khởi động dịch vụ:
   ```bash
   pnpm --filter @meocrm/api dev     # API port 2003
   pnpm --filter @meocrm/web dev     # Frontend port 2004
   ```
5. Đăng nhập frontend bằng tài khoản đã seed (`seed@example.com / Passw0rd!`) để kiểm tra các luồng Orders, Shipping, POS.
