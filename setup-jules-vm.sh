#!/bin/bash
set -e

echo "=== Jules VM Setup Script v27.0 - Zero Working Tree Impact ==="
echo ""

# ============================================
# PHASE 0: Reset Working Tree
# ============================================
echo "🔄 Phase 0: Reset Working Tree"
echo "--------------------------------------------"

git reset --hard HEAD
echo "✅ HEAD is now at $(git rev-parse --short HEAD)"

echo ""

# ============================================
# PHASE 1: Verify
# ============================================
echo "📋 Phase 1: Verify"
echo "--------------------------------------------"

if ! sudo -n true 2>/dev/null; then
    sudo true || { echo "❌ sudo required"; exit 1; }
fi

echo "✅ Node: $(node -v)"
echo "✅ pnpm: $(pnpm -v)"

echo ""

# ============================================
# PHASE 2: pnpm upgrade
# ============================================
echo "🚀 Phase 2: pnpm upgrade"
echo "--------------------------------------------"

PNPM_MAJOR=$(pnpm -v | cut -d. -f1)
if [ "$PNPM_MAJOR" -lt 10 ]; then
    pnpm self-update
    echo "✅ Upgraded: $(pnpm -v)"
else
    echo "✅ Already v10: $(pnpm -v)"
fi

pnpm config set --global onlyBuiltDependencies '["prisma"," @prisma/client"," @prisma/engines","esbuild"," @esbuild/linux-x64","sharp"," @swc/core","playwright"]'
echo "✅ Global config set"

echo ""

# ============================================
# PHASE 3: Global Tools
# ============================================
echo "🔧 Phase 3: Global Tools"
echo "--------------------------------------------"

npm install -g @nestjs/cli typescript prisma

echo "✅ nest: $(nest --version 2>/dev/null || echo 'OK')"
echo "✅ tsc: $(tsc --version 2>/dev/null || echo 'OK')"
echo "✅ prisma: $(prisma --version | head -n 1)"

echo ""

# ============================================
# PHASE 4: PostgreSQL 17
# ============================================
echo "🐘 Phase 4: PostgreSQL 17"
echo "--------------------------------------------"

if command -v psql &> /dev/null; then
    echo "✅ Already: $(psql --version | awk '{print $3}')"
else
    sudo apt-get update -qq
    sudo apt-get install -y curl ca-certificates postgresql-common
    sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y
    sudo apt-get update -qq
    sudo apt-get install -y postgresql-17 postgresql-client-17
    echo "✅ Installed"
fi

sudo systemctl stop postgresql || true
PG_CONF="/etc/postgresql/17/main/postgresql.conf"
if [ -f "$PG_CONF" ]; then
    sudo sed -i "s/^#*port = .*/port = 2001/" "$PG_CONF"
    sudo sed -i "s/^#*listen_addresses = .*/listen_addresses = 'localhost'/" "$PG_CONF"
fi
sudo systemctl start postgresql
sudo systemctl enable postgresql
sleep 3

echo "✅ Port 2001"

echo ""

# ============================================
# PHASE 5: Redis 8
# ============================================
echo "🔴 Phase 5: Redis 8"
echo "--------------------------------------------"

if command -v redis-server &> /dev/null; then
    echo "✅ Already installed"
else
    sudo apt-get install -y lsb-release gpg
    curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
    sudo chmod 644 /usr/share/keyrings/redis-archive-keyring.gpg
    echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list
    sudo apt-get update -qq
    sudo apt-get install -y redis
    echo "✅ Installed"
fi

sudo systemctl stop redis-server || true

sudo tee /etc/redis/redis-2002.conf > /dev/null <<'REDIS_CONF'
port 2002
bind 127.0.0.1
protected-mode yes
supervised systemd
pidfile /var/run/redis/redis-server-2002.pid
loglevel notice
logfile /var/log/redis/redis-server-2002.log
dir /var/lib/redis
appendonly yes
REDIS_CONF

sudo tee /etc/systemd/system/redis-2002.service > /dev/null <<'REDIS_SERVICE'
[Unit]
Description=Redis (port 2002)
After=network.target

[Service]
Type=notify
ExecStart=/usr/bin/redis-server /etc/redis/redis-2002.conf
ExecStop=/bin/redis-cli -p 2002 shutdown
Restart=always
User=redis
Group=redis

[Install]
WantedBy=multi-user.target
REDIS_SERVICE

sudo systemctl daemon-reload
sudo systemctl start redis-2002
sudo systemctl enable redis-2002
sleep 2

redis-cli -p 2002 ping
echo "✅ Port 2002"

echo ""

# ============================================
# PHASE 6: Database
# ============================================
echo "🗄️ Phase 6: Database"
echo "--------------------------------------------"

sudo -u postgres psql -p 2001 <<SQL 2>/dev/null || true
DROP DATABASE IF EXISTS meocrm_dev;
DROP USER IF EXISTS meocrm_user;
CREATE USER meocrm_user WITH PASSWORD 'meocrm_dev_password';
CREATE DATABASE meocrm_dev OWNER meocrm_user;
GRANT ALL PRIVILEGES ON DATABASE meocrm_dev TO meocrm_user;
\c meocrm_dev
GRANT ALL ON SCHEMA public TO meocrm_user;
ALTER SCHEMA public OWNER TO meocrm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO meocrm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO meocrm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO meocrm_user;
SQL

echo "✅ meocrm_dev"

echo ""

# ============================================
# PHASE 7: Project Dependencies & Schema
# ============================================
echo "📦 Phase 8: Project Setup"
echo "--------------------------------------------"

# Install all dependencies (including local Prisma, TypeScript, etc)
pnpm install

# Push database schema
pnpm --filter @meocrm/api prisma db push --accept-data-loss

# Verify setup
pnpm --filter @meocrm/api build
pnpm --filter @meocrm/api test

echo "✅ Project ready"

# ============================================
# PHASE 8: Verify Clean State
# ============================================
echo "📊 Phase 7: Verify Working Tree"
echo "--------------------------------------------"

GIT_STATUS=$(git status --porcelain 2>/dev/null || echo "")
if [ -z "$GIT_STATUS" ]; then
    echo "✅ Working tree is CLEAN"
else
    echo "❌ Working tree is DIRTY:"
    git status --short
    echo ""
    echo "Resetting again..."
    git reset --hard HEAD
    echo "✅ Cleaned"
fi

echo ""

# ============================================
# DONE
# ============================================
echo "🎉 Setup Complete!"
echo "============================================"
echo ""
echo "📊 Services Ready:"
echo "  - PostgreSQL 17: port 2001 ✅"
echo "  - Redis 8: port 2002 ✅"
echo ""
echo "🔧 Tools Installed:"
echo "  - Node: $(node -v)"
echo "  - pnpm: $(pnpm -v) (v10 with global config)"
echo "  - nest: $(nest --version)"
echo "  - tsc: $(tsc --version)"
echo "  - prisma: $(prisma --version | head -n 1)"
echo ""
echo "⚠️ Manual Steps Needed:"
echo "  1. Copy .env files from examples:"
echo "     cp apps/api/.env.example apps/api/.env"
echo "     cp apps/web/.env.local.example apps/web/.env.local"
echo ""
echo "  2. Jules will then run:"
echo "     pnpm install"
echo "     pnpm prisma generate"
echo "     pnpm prisma migrate deploy"
echo ""
echo "✅ Working tree: CLEAN (zero repo files touched)"
echo ""