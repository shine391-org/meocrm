#!/bin/bash
# Start Development Servers
# Starts API and Web servers with proper environment variables

set -e

echo "🚀 Starting MeoCRM development servers..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker containers are running
echo "Checking Docker containers..."
if ! docker ps | grep -q meocrm-postgres-dev; then
    echo -e "${YELLOW}⚠${NC} PostgreSQL container not running. Starting..."
    docker restart meocrm-postgres-dev 2>/dev/null || echo "Please start Docker containers manually"
fi

if ! docker ps | grep -q meocrm-redis-dev; then
    echo -e "${YELLOW}⚠${NC} Redis container not running. Starting..."
    docker restart meocrm-redis-dev 2>/dev/null || echo "Please start Docker containers manually"
fi

# Wait a bit for containers to be ready
sleep 2

# Start servers in background
echo ""
echo -e "${GREEN}✓${NC} Starting API server on port 2003..."
DATABASE_URL="postgresql://meocrm_user:meocrm_dev_password@localhost:2001/meocrm_dev?schema=public" \
REDIS_PORT=2002 \
PORT=2003 \
WEBHOOK_SECRET_KEY=00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff \
CORS_ORIGIN="http://localhost:2004" \
pnpm --filter @meocrm/api dev &

API_PID=$!

echo -e "${GREEN}✓${NC} Starting Web server on port 2004..."
NEXT_PUBLIC_API_URL=http://localhost:2003 \
pnpm --filter @meocrm/web dev &

WEB_PID=$!

# Wait a bit for servers to start
sleep 3

echo ""
echo -e "${GREEN}✅ Development servers started!${NC}"
echo ""
echo "  API Server:  http://localhost:2003"
echo "  API Docs:    http://localhost:2003/api"
echo "  Web App:     http://localhost:2004"
echo ""
echo "  API PID: $API_PID"
echo "  Web PID: $WEB_PID"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for both processes
wait
