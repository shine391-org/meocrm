#!/bin/bash
# MeoCRM Database Diagnostics Script
# Usage: ./scripts/diagnose-db.sh

PROJECT_ROOT="$HOME/projects/meocrm"
API_DIR="$PROJECT_ROOT/apps/api"

echo "🔍 MeoCRM Database Diagnostics"
echo "=============================="
echo ""

# 1. Check .env file
echo "📄 Checking .env file..."
if [ -f "$API_DIR/.env" ]; then
    echo "✅ .env exists at: $API_DIR/.env"
    echo "DATABASE_URL: $(grep DATABASE_URL $API_DIR/.env | cut -d'=' -f2)"
else
    echo "❌ .env not found at: $API_DIR/.env"
    exit 1
fi
echo ""

# 2. Check Docker containers
echo "🐳 Checking Docker containers..."
MEOCRM_CONTAINERS=$(docker ps --filter "name=meocrm" --format ".Names" | wc -l)
if [ $MEOCRM_CONTAINERS -gt 0 ]; then
    echo "✅ Found $MEOCRM_CONTAINERS MeoCRM containers:"
    docker ps --filter "name=meocrm" --format "  - .Names: .Status"
else
    echo "❌ No MeoCRM containers running"
    exit 1
fi
echo ""

# 3. Test port
echo "🔌 Testing PostgreSQL port..."
if nc -zv 127.0.0.1 2001 2>&1 | grep -q succeeded; then
    echo "✅ Port 2001 is accessible"
else
    echo "❌ Port 2001 is not accessible"
    exit 1
fi
echo ""

# 4. Test database connection
echo "💾 Testing database connection..."
DB_URL="postgresql://meocrm_user:meocrm_dev_password@127.0.0.1:2001/meocrm_dev"
if psql "$DB_URL" -c "SELECT version();" &>/dev/null; then
    echo "✅ Database connection successful"
    VERSION=$(psql "$DB_URL" -t -c "SELECT version();" 2>/dev/null | head -1 | xargs)
    echo "   $VERSION"
else
    echo "❌ Cannot connect to database"
    exit 1
fi
echo ""

# 5. Test Prisma
echo "🔧 Testing Prisma connection..."
cd "$API_DIR"
if pnpm prisma db pull &>/dev/null; then
    echo "✅ Prisma can connect"
else
    echo "❌ Prisma cannot connect"
    exit 1
fi
echo ""

echo "=============================="
echo "✅ All checks passed!"
echo ""
echo "You can now run:"
echo "  cd $API_DIR"
echo "  pnpm prisma db seed"

