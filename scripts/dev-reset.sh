#!/bin/bash
# Reset Development Environment
# Kills all dev servers and clears caches

set -e

echo "🔄 Resetting development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Kill all pnpm dev servers
echo ""
echo "1. Killing all pnpm dev servers..."
if pgrep -f "pnpm.*dev" > /dev/null; then
    pkill -f "pnpm.*dev" && print_step "Killed pnpm dev servers" || print_warning "Some processes may not have been killed"
    sleep 2
else
    print_step "No pnpm dev servers running"
fi

# Kill Node processes on ports 2003 and 2004
echo ""
echo "2. Freeing up ports 2003 and 2004..."
for port in 2003 2004; do
    if lsof -ti:$port > /dev/null 2>&1; then
        lsof -ti:$port | xargs kill -9 2>/dev/null && print_step "Freed port $port" || print_warning "Could not free port $port"
    else
        print_step "Port $port is already free"
    fi
done

# Clear Next.js cache
echo ""
echo "3. Clearing Next.js cache..."
if [ -d "apps/web/.next" ]; then
    rm -rf apps/web/.next && print_step "Cleared apps/web/.next" || print_error "Failed to clear .next"
else
    print_step "No .next cache to clear"
fi

# Clear Node modules cache (optional - can be slow)
echo ""
echo "4. Clearing node_modules/.cache..."
if [ -d "node_modules/.cache" ]; then
    rm -rf node_modules/.cache && print_step "Cleared node_modules/.cache" || print_warning "Could not clear node_modules/.cache"
fi

if [ -d "apps/web/node_modules/.cache" ]; then
    rm -rf apps/web/node_modules/.cache && print_step "Cleared apps/web/node_modules/.cache"
fi

if [ -d "apps/api/node_modules/.cache" ]; then
    rm -rf apps/api/node_modules/.cache && print_step "Cleared apps/api/node_modules/.cache"
fi

# Clear Prisma cache (optional)
echo ""
echo "5. Clearing Prisma cache..."
if [ -d "apps/api/node_modules/.prisma" ]; then
    rm -rf apps/api/node_modules/.prisma && print_step "Cleared Prisma cache"
else
    print_step "No Prisma cache to clear"
fi

# Clear TypeScript build cache
echo ""
echo "6. Clearing TypeScript build cache..."
find apps/api -name "*.tsbuildinfo" -delete 2>/dev/null && print_step "Cleared API TS cache" || print_step "No API TS cache found"
find apps/web -name "*.tsbuildinfo" -delete 2>/dev/null && print_step "Cleared Web TS cache" || print_step "No Web TS cache found"

# Clear dist folders
echo ""
echo "7. Clearing dist folders..."
if [ -d "apps/api/dist" ]; then
    rm -rf apps/api/dist && print_step "Cleared apps/api/dist"
else
    print_step "No apps/api/dist to clear"
fi

if [ -d "packages/api-client/dist" ]; then
    rm -rf packages/api-client/dist && print_step "Cleared packages/api-client/dist"
else
    print_step "No packages/api-client/dist to clear"
fi

# Check Docker containers
echo ""
echo "8. Checking Docker containers..."
if docker ps --format '{{.Names}}' | grep -q meocrm; then
    print_step "Docker containers are running"
else
    print_warning "No MeoCRM Docker containers running - you may need to start them"
fi

echo ""
echo -e "${GREEN}✅ Environment reset complete!${NC}"
echo ""
echo "To start development servers:"
echo "  ${YELLOW}pnpm dev${NC}                    # Start both API and Web"
echo "  ${YELLOW}pnpm dev:api${NC}                # Start only API"
echo "  ${YELLOW}pnpm dev:web${NC}                # Start only Web"
echo ""
echo "Or use the custom command:"
echo "  ${YELLOW}./scripts/dev-start.sh${NC}      # Start with proper env vars"
