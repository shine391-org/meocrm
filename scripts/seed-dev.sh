#!/usr/bin/env bash

set -euo pipefail

if [[ -z "${SEED_ADMIN_EMAIL:-}" ]]; then
  echo "❌ SEED_ADMIN_EMAIL is required (ví dụ: seed@example.com)" >&2
  exit 1
fi

export SEED_ADMIN_PASSWORD="${SEED_ADMIN_PASSWORD:-Passw0rd!}"

echo "🔁 Resetting database and seeding sample data for frontend..."
pnpm --filter @meocrm/api prisma migrate reset --force --skip-generate

echo "✅ Seed complete. Admin user:"
echo "    Email: ${SEED_ADMIN_EMAIL}"
echo "    Password: ${SEED_ADMIN_PASSWORD}"
echo ""
echo "Bạn có thể chạy API bằng 'pnpm --filter @meocrm/api dev' và frontend bằng 'pnpm --filter @meocrm/web dev'."
