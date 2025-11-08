#!/bin/bash
set -e

# Base environment check
echo "=== Base Check ==="
node -v && pnpm -v && git --version || exit 1
echo "Base OK"
echo ""

# 1. Add PostgreSQL APT Repository (CRITICAL FIX)
echo "Adding PostgreSQL repository..."
sudo apt-get update -qq
sudo apt-get install -y postgresql-common ca-certificates || {
    echo "ERROR: Cannot install postgresql-common"
    exit 1
}
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y || {
    echo "ERROR: Cannot setup PostgreSQL repo"
    exit 1
}
sudo apt-get update -qq

# 2. Install PostgreSQL 15
echo "Installing PostgreSQL 15..."
sudo apt-get install -y postgresql-15 postgresql-contrib-15 || {
    echo "ERROR: PostgreSQL 15 install failed"
    echo "Available versions: $(apt-cache search postgresql | grep '^postgresql-[0-9]')"
    exit 1
}

# 3. Install Redis
echo "Installing Redis..."
sudo apt-get install -y redis-server || {
    echo "ERROR: Redis install failed"
    exit 1
}

# 4. Configure PostgreSQL port 2001
PGCONF="/etc/postgresql/15/main/postgresql.conf"
if [ -f "$PGCONF" ]; then
    sudo sed -i "s/^#*port = .*/port = 2001/" "$PGCONF"
    sudo sed -i "s/^#*listen_addresses = .*/listen_addresses = 'localhost'/" "$PGCONF"
else
    echo "ERROR: PostgreSQL config not found at $PGCONF"
    exit 1
fi

# 5. Configure Redis port 2002 (OPTION A: Create config)
echo "Configuring Redis port 2002..."
sudo mkdir -p /etc/redis /var/run/redis /var/log/redis /var/lib/redis
sudo chown redis:redis /var/run/redis /var/log/redis /var/lib/redis 2>/dev/null || true
sudo tee /etc/redis/redis-2002.conf > /dev/null <<'REDIS_EOF'
port 2002
bind 127.0.0.1
daemonize yes
pidfile /var/run/redis/redis-2002.pid
logfile /var/log/redis/redis-2002.log
dir /var/lib/redis
supervised no
databases 16
save 900 1
save 300 10
save 60 10000
REDIS_EOF
REDISCONF="/etc/redis/redis-2002.conf"
echo "✅ Redis config created at $REDISCONF"

# 6. Restart services with fallbacks
echo "Starting services..."
sudo systemctl restart postgresql || sudo service postgresql restart || sudo pg_ctlcluster 15 main restart

# Stop any existing Redis
sudo pkill -9 redis-server 2>/dev/null || true
sudo systemctl stop redis-server 2>/dev/null || true
sleep 2

# Start Redis with custom config
sudo redis-server "$REDISCONF"
sleep 3
echo "✅ Redis started with custom config"

# 7. Database setup (idempotent)
echo "Setting up database..."
sudo -u postgres psql <<'EOF'
DROP DATABASE IF EXISTS meocrm_dev;
DROP USER IF EXISTS meocrm_user;
CREATE DATABASE meocrm_dev;
CREATE USER meocrm_user WITH PASSWORD 'meocrm_dev_password';
ALTER ROLE meocrm_user WITH CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE meocrm_dev TO meocrm_user;
\c meocrm_dev
ALTER SCHEMA public OWNER TO meocrm_user;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO meocrm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO meocrm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO meocrm_user;
\q
EOF

# 8. Global Node tools
echo "Installing global tools..."
sudo npm install -g @nestjs/cli typescript concurrently prisma || {
    echo "WARN: Global npm install may need different permissions"
    npm install -g @nestjs/cli typescript concurrently prisma
}

# 9. Project dependencies
echo "Installing project dependencies..."
pnpm install || {
    echo "ERROR: pnpm install failed"
    exit 1
}

# 10. Playwright
npx playwright install --with-deps chromium || echo "WARN: Playwright install failed (non-critical)"

# 11. Environment files
cat > apps/api/.env <<'EOF'
DATABASE_URL="postgresql://meocrm_user:meocrm_dev_password@localhost:2001/meocrm_dev?schema=public"
REDIS_URL="redis://localhost:2002"
PORT=2003
NODE_ENV=development
JWT_SECRET="dev-secret-jules-vm"
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
EOF

cat > apps/web/.env.local <<'EOF'
NEXT_PUBLIC_API_URL=http://localhost:2003
EOF

# 12. Prisma setup
pnpm --filter @meocrm/api prisma generate
[ -d "apps/api/prisma/migrations" ] && pnpm --filter @meocrm/api prisma migrate deploy || echo "No migrations yet"

# VALIDATION
echo ""
echo "=== VALIDATION ==="
psql --version && echo "✅ PostgreSQL" || { echo "❌ PostgreSQL"; exit 1; }
redis-server --version && echo "✅ Redis" || { echo "❌ Redis"; exit 1; }
nest --version && echo "✅ NestJS CLI" || { echo "❌ NestJS"; exit 1; }
PGPASSWORD='meocrm_dev_password' psql -h localhost -p 2001 -U meocrm_user -d meocrm_dev -c "SELECT 1;" >/dev/null 2>&1 && echo "✅ DB connected" || { echo "❌ DB failed"; exit 1; }
redis-cli -p 2002 ping >/dev/null 2>&1 && echo "✅ Redis connected" || { echo "❌ Redis failed"; exit 1; }
echo "================="
echo "✅ Setup complete!"
