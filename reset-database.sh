#!/bin/bash
set -e

cd ~/projects/meocrm

echo "🗑️  Step 1: Xóa hết container + volumes cũ..."
docker-compose -f docker-compose.dev.yml down -v
docker rm -f meocrm-postgres-dev meocrm-redis-dev 2>/dev/null || true
docker volume rm meocrm_postgres_dev_data meocrm_redis_dev_data 2>/dev/null || true

echo ""
echo "🚀 Step 2: Start containers mới..."
docker-compose -f docker-compose.dev.yml up -d

echo ""
echo "⏳ Step 3: Chờ PostgreSQL ready (15 giây)..."
sleep 15

echo ""
echo "👤 Step 4: Tạo meocrm_user với password đúng..."
docker exec -i meocrm-postgres-dev psql -U postgres -d meocrm_dev <<'SQL'
CREATE USER meocrm_user WITH PASSWORD 'meocrm_dev_password';
ALTER ROLE meocrm_user WITH CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE meocrm_dev TO meocrm_user;
ALTER SCHEMA public OWNER TO meocrm_user;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO meocrm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO meocrm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO meocrm_user;
SQL

echo ""
echo "✅ Step 5: Test connection..."
PGPASSWORD='meocrm_dev_password' psql -h localhost -p 2001 -U meocrm_user -d meocrm_dev -c "SELECT current_user, version();"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   ✅ DONE! Database ready với credentials đúng           ║"
echo "║   User: meocrm_user                                       ║"
echo "║   Password: meocrm_dev_password                           ║"
echo "║   Database: meocrm_dev                                    ║"
echo "║   Port: 2001                                              ║"
echo "╚═══════════════════════════════════════════════════════════╝"
