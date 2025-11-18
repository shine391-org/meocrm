#!/bin/bash
# Start Development Servers
# Starts API and Web servers using environment variables or .env files (never hardcode secrets here).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "🚀 Starting MeoCRM development servers..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

load_env_file() {
  local file="$1"
  if [ -f "$file" ]; then
    # shellcheck disable=SC1090
    set -a && source "$file" && set +a
  fi
}

# Load env files (users should keep real secrets out of VCS)
load_env_file ".env.local"
load_env_file ".env"
load_env_file "apps/api/.env"
load_env_file "apps/web/.env.local"

DATABASE_URL=${DATABASE_URL:-}
WEBHOOK_SECRET_KEY=${WEBHOOK_SECRET_KEY:-}
REDIS_PORT=${REDIS_PORT:-2002}
API_PORT=${API_PORT:-${PORT:-2003}}
WEB_PORT=${WEB_PORT:-2004}
CORS_ORIGIN=${CORS_ORIGIN:-"http://localhost:${WEB_PORT}"}
NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-"http://localhost:${API_PORT}"}

if [ -z "$DATABASE_URL" ] || [ -z "$WEBHOOK_SECRET_KEY" ]; then
  echo -e "${RED}✗${NC} Missing DATABASE_URL or WEBHOOK_SECRET_KEY. Export them or place them in an ignored env file before continuing."
  exit 1
fi

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
echo -e "${GREEN}✓${NC} Starting API server on port ${API_PORT}..."
DATABASE_URL="$DATABASE_URL" \
REDIS_PORT="$REDIS_PORT" \
PORT="$API_PORT" \
WEBHOOK_SECRET_KEY="$WEBHOOK_SECRET_KEY" \
CORS_ORIGIN="$CORS_ORIGIN" \
NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
pnpm --filter @meocrm/api dev &
API_PID=$!

echo -e "${GREEN}✓${NC} Starting Web server on port ${WEB_PORT}..."
NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
PORT="$WEB_PORT" \
pnpm --filter @meocrm/web dev &
WEB_PID=$!

# Wait a bit for servers to start
sleep 3

echo ""
echo -e "${GREEN}✅ Development servers started!${NC}"
echo ""
echo "  API Server:  http://localhost:${API_PORT}"
echo "  API Docs:    http://localhost:${API_PORT}/api"
echo "  Web App:     http://localhost:${WEB_PORT}"
echo ""
echo "  API PID: $API_PID"
echo "  Web PID: $WEB_PID"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for both processes
wait
