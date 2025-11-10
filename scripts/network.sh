#!/bin/bash
echo "🔍 MeoCRM Database Diagnostics"
echo "=============================="
echo ""

# Check current directory
echo "📂 Current directory:"
pwd
echo ""

# Check .env file
echo "📄 DATABASE_URL from .env:"
if [ -f .env ]; then
    grep DATABASE_URL .env
else
    echo "❌ .env file not found in current directory"
    echo "Looking in common locations..."
    find ~/projects/meocrm -name ".env" -path "*/apps/api/*" 2>/dev/null
fi
echo ""

# Check Docker containers
echo "🐳 Docker containers:"
docker ps --filter "name=meocrm" --format "table .Names\t.Status\t.Ports"
echo ""

# Test port accessibility
echo "🔌 Testing port 2001:"
if nc -zv 127.0.0.1 2001 2>&1 | grep -q succeeded; then
    echo "✅ Port 2001 is accessible"
else
    echo "❌ Port 2001 is not accessible"
fi
echo ""

# Test database connection
echo "💾 Testing database connection:"
if psql "postgresql://meocrm_user:meocrm_dev_password@127.0.0.1:2001/meocrm_dev" -c "SELECT version();" &>/dev/null; then
    echo "✅ Database connection successful"
    psql "postgresql://meocrm_user:meocrm_dev_password@127.0.0.1:2001/meocrm_dev" -c "SELECT version();" 2>/dev/null | head -3
else
    echo "❌ Cannot connect to database"
fi
echo ""

# Test Prisma connection
echo "🔧 Testing Prisma connection:"
cd ~/projects/meocrm/apps/api
if pnpm prisma db pull &>/dev/null; then
    echo "✅ Prisma can connect"
else
    echo "❌ Prisma cannot connect"
fi
echo ""

echo "=============================="
echo "✅ Diagnostic complete"
