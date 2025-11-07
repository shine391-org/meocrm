#!/bin/bash
set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   MeoCRM Jules VM Setup v11.0 - COMPLETE WITH TESTING    ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "📅 Started: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo ""

#############################################################################
# PHASE 1: POSTGRESQL
#############################################################################
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  PHASE 1: PostgreSQL Installation                        ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

echo "📦 Installing PostgreSQL 15..."
sudo apt-get update -qq
sudo apt-get install -y postgresql postgresql-contrib

echo "🚀 Starting PostgreSQL..."
sudo service postgresql start
sleep 3

echo "🗄️  Creating database and user..."
sudo -u postgres psql <<EOF
CREATE DATABASE meocrm_dev;
CREATE USER meocrm_user WITH PASSWORD 'meocrm_dev_password';
ALTER ROLE meocrm_user WITH CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE meocrm_dev TO meocrm_user;
\q
EOF

echo "✅ PostgreSQL ready at localhost:5432"
echo ""

#############################################################################
# PHASE 2: ENVIRONMENT VARIABLES
#############################################################################
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  PHASE 2: Environment Variables                          ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

cat > apps/api/.env <<EOF
DATABASE_URL="postgresql://meocrm_user:meocrm_dev_password@localhost:5432/meocrm_dev?schema=public"
PORT=2003
NODE_ENV=development
JWT_SECRET="dev-secret-jules-vm-snapshot"
JWT_EXPIRES_IN=7d
EOF

cat > apps/web/.env.local <<EOF
NEXT_PUBLIC_API_URL=http://localhost:2003
EOF

echo "✅ Environment files created"
echo ""

#############################################################################
# PHASE 3: NODE DEPENDENCIES
#############################################################################
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  PHASE 3: Node.js Dependencies & Global Tools            ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

if ! command -v pnpm &>/dev/null; then
  echo "📥 Installing pnpm@8.15.6..."
  npm install -g pnpm@8.15.6
else
  echo "✅ pnpm: $(pnpm -v)"
fi

if ! command -v concurrently &>/dev/null; then
  echo "📥 Installing concurrently@8.2.2..."
  npm install -g concurrently@8.2.2
else
  echo "✅ concurrently installed"
fi

echo ""
echo "📦 Installing project dependencies..."
pnpm install

echo "✅ Dependencies installed"
echo ""

#############################################################################
# PHASE 4: PLAYWRIGHT (CRITICAL FOR FRONTEND E2E TESTS)
#############################################################################
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  PHASE 4: Playwright Installation (Frontend E2E)         ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

echo "📦 Installing Playwright browsers..."
npx playwright install --with-deps chromium

echo "✅ Playwright ready for E2E tests"
echo ""

#############################################################################
# PHASE 5: PRISMA SETUP
#############################################################################
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  PHASE 5: Prisma Client & Migrations                     ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

echo "🔄 Generating Prisma Client..."
pnpm --filter @meocrm/api prisma generate

if [ -d "apps/api/prisma/migrations" ]; then
  echo "🔄 Applying migrations..."
  pnpm --filter @meocrm/api prisma migrate deploy
  echo "✅ Migrations applied"
else
  echo "⚠️  No migrations yet (will be created by Jules)"
fi

echo ""

#############################################################################
# PHASE 6: VERIFICATION (TEST ALL COMMANDS)
#############################################################################
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  PHASE 6: Environment Verification                       ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

echo "🔍 Tool Versions:"
echo "  Node.js:    $(node -v)"
echo "  pnpm:       $(pnpm -v)"
echo "  TypeScript: $(pnpm exec tsc --version)"
echo "  ESLint:     $(pnpm exec eslint --version)"
echo "  Jest:       $(pnpm exec jest --version)"
echo "  Prisma:     $(pnpm exec prisma --version | head -1)"
echo "  Playwright: $(npx playwright --version)"
echo "  PostgreSQL: $(psql --version | head -1)"
echo ""

echo "🔍 Database Connection:"
pnpm --filter @meocrm/api prisma db pull --force || echo "⚠️  No tables yet (OK)"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║         ✅ COMPLETE ENVIRONMENT READY FOR JULES          ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "🎉 Jules can now:"
echo "  ✅ Write NestJS backend code"
echo "  ✅ Write Next.js frontend code"
echo "  ✅ Run unit tests (Jest)"
echo "  ✅ Run backend E2E tests (Supertest)"
echo "  ✅ Run frontend E2E tests (Playwright)"
echo "  ✅ Access PostgreSQL database"
echo "  ✅ Generate Prisma migrations"
echo ""
echo "🚀 Snapshot ready - All systems GO!"
