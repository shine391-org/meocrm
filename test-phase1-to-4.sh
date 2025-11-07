#!/bin/bash
# Script: test-phase1-to-4.sh
# Mục đích: Test toàn bộ Phase 1-4 từ đầu
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

cd ~/projects/meocrm

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     MeoCRM - Complete Test Phase 1-4 (End-to-End)         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

PASS=0
TOTAL=0
FAILED_TESTS=()

check() {
    TOTAL=$((TOTAL + 1))
    if eval "$1" >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $2"
        PASS=$((PASS + 1))
        return 0
    else
        echo -e "${RED}✗${NC} $2"
        FAILED_TESTS+=("$2")
        return 1
    fi
}

check_with_output() {
    TOTAL=$((TOTAL + 1))
    OUTPUT=$(eval "$1" 2>&1)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
        PASS=$((PASS + 1))
        return 0
    else
        echo -e "${RED}✗${NC} $2"
        echo -e "${YELLOW}   Error: $OUTPUT${NC}"
        FAILED_TESTS+=("$2")
        return 1
    fi
}

# ═══════════════════════════════════════════════════════════
# PHASE 1: FOUNDATION
# ═══════════════════════════════════════════════════════════
echo -e "${CYAN}━━━ 📦 PHASE 1: Foundation ━━━${NC}"

echo -e "${BLUE}1.1 Monorepo Structure${NC}"
check "test -f package.json" "Root package.json"
check "test -f pnpm-workspace.yaml" "pnpm workspace config"
check "test -d apps/api" "API app directory"
check "test -d apps/web" "Web app directory"
check "test -f apps/api/package.json" "API package.json"

echo ""
echo -e "${BLUE}1.2 Configuration Files${NC}"
check "test -f .gitignore" ".gitignore"
check "test -f .eslintrc.js" "ESLint config"
check "test -f .prettierrc" "Prettier config"
check "test -f commitlint.config.js" "Commitlint config"
check "test -f tsconfig.json" "Root tsconfig"

echo ""
echo -e "${BLUE}1.3 Database Setup${NC}"
check "test -f apps/api/prisma/schema.prisma" "Prisma schema"
check "test -d apps/api/prisma/migrations" "Prisma migrations"
check "ls apps/api/prisma/migrations | grep -q 2025" "Migration exists"
check "test -f apps/api/prisma/seed.ts" "Seed script"

echo ""
echo -e "${BLUE}1.4 Dependencies Installed${NC}"
check "test -d node_modules" "Root node_modules"
check "test -d apps/api/node_modules" "API node_modules"
check "command -v pnpm" "pnpm installed"

# ═══════════════════════════════════════════════════════════
# PHASE 2: AUTHENTICATION
# ═══════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}━━━ 🔐 PHASE 2: Authentication ━━━${NC}"

echo -e "${BLUE}2.1 Auth Module Files${NC}"
check "test -f apps/api/src/auth/auth.module.ts" "AuthModule"
check "test -f apps/api/src/auth/auth.service.ts" "AuthService"
check "test -f apps/api/src/auth/auth.controller.ts" "AuthController"
check "test -f apps/api/src/auth/strategies/jwt.strategy.ts" "JWT Strategy"
check "test -f apps/api/src/auth/guards/jwt-auth.guard.ts" "JWT Guard"

echo ""
echo -e "${BLUE}2.2 Auth DTOs${NC}"
check "test -f apps/api/src/auth/dto/login.dto.ts" "Login DTO"
check "test -f apps/api/src/auth/dto/register.dto.ts" "Register DTO"

# ═══════════════════════════════════════════════════════════
# PHASE 3: BUSINESS MODULES
# ═══════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}━━━ 📦 PHASE 3: Business Modules ━━━${NC}"

echo -e "${BLUE}3.1 Categories Module${NC}"
check "test -f apps/api/src/categories/categories.module.ts" "CategoriesModule"
check "test -f apps/api/src/categories/categories.service.ts" "CategoriesService"
check "test -f apps/api/src/categories/categories.controller.ts" "CategoriesController"
check "test -d apps/api/src/categories/dto" "Categories DTOs"

echo ""
echo -e "${BLUE}3.2 Products Module${NC}"
check "test -f apps/api/src/products/products.module.ts" "ProductsModule"
check "test -f apps/api/src/products/products.service.ts" "ProductsService"
check "test -f apps/api/src/products/products.controller.ts" "ProductsController"
check "test -d apps/api/src/products/dto" "Products DTOs"

echo ""
echo -e "${BLUE}3.3 Prisma Service${NC}"
check "test -f apps/api/src/prisma/prisma.service.ts" "PrismaService"
check "test -f apps/api/src/prisma/prisma.module.ts" "PrismaModule"

# ═══════════════════════════════════════════════════════════
# PHASE 4: INFRASTRUCTURE
# ═══════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}━━━ 🐳 PHASE 4: Infrastructure ━━━${NC}"

echo -e "${BLUE}4.1 Docker Compose Files${NC}"
check "test -f docker-compose.dev.yml" "docker-compose.dev.yml"
check "test -f docker-compose.staging.yml" "docker-compose.staging.yml"
check "test -f docker-compose.prod.yml" "docker-compose.prod.yml"

echo ""
echo -e "${BLUE}4.2 Environment Files${NC}"
check "test -f .env.dev" ".env.dev"
check "test -f .env.dev.example" ".env.dev.example"
check "test -f apps/api/.env" "apps/api/.env"

echo ""
echo -e "${BLUE}4.3 Docker Services${NC}"
if docker ps >/dev/null 2>&1; then
    check "docker ps | grep -q meocrm-postgres-dev" "PostgreSQL container running"
    check "docker ps | grep -q meocrm-redis-dev" "Redis container running"
    
    echo ""
    echo -e "${BLUE}4.4 Service Health${NC}"
    check "timeout 5 docker exec meocrm-postgres-dev pg_isready -U postgres" "PostgreSQL healthy"
    check "docker inspect -f '{{.State.Health.Status}}' meocrm-redis-dev | grep -q 'healthy'" "Redis healthy"
else
    echo -e "${YELLOW}⚠️  Docker not running - skipping service checks${NC}"
fi

echo ""
echo -e "${BLUE}4.5 Scripts & Docs${NC}"
check "test -d scripts" "scripts/ directory"
check "test -d docs" "docs/ directory"

# ═══════════════════════════════════════════════════════════
# INTEGRATION TESTS
# ═══════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}━━━ 🧪 INTEGRATION TESTS ━━━${NC}"

if docker ps | grep -q meocrm-postgres-dev; then
    echo -e "${BLUE}5.1 Database Connection${NC}"
    check "timeout 5 docker exec meocrm-postgres-dev psql -U postgres -d meocrm_dev -c 'SELECT 1'" "DB Connection"
    
    echo ""
    echo -e "${BLUE}5.2 Tables Exist${NC}"
    check "timeout 5 docker exec meocrm-postgres-dev psql -U postgres -d meocrm_dev -tAc 'SELECT 1 FROM users LIMIT 1'" "users table"
    check "timeout 5 docker exec meocrm-postgres-dev psql -U postgres -d meocrm_dev -tAc 'SELECT 1 FROM organizations LIMIT 1'" "organizations table"
    check "timeout 5 docker exec meocrm-postgres-dev psql -U postgres -d meocrm_dev -tAc 'SELECT 1 FROM products LIMIT 1'" "products table"
    check "timeout 5 docker exec meocrm-postgres-dev psql -U postgres -d meocrm_dev -tAc 'SELECT 1 FROM categories LIMIT 1'" "categories table"
fi

echo ""
echo -e "${BLUE}5.3 Build Test${NC}"
if check_with_output "cd apps/api && pnpm build" "API builds successfully"; then
    check "test -d apps/api/dist" "Dist folder created"
fi

# ═══════════════════════════════════════════════════════════
# API ENDPOINT TESTS (if running)
# ═══════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}━━━ 🌐 API TESTS (if running) ━━━${NC}"

if timeout 2 bash -c "echo > /dev/tcp/localhost/2001" 2>/dev/null; then
    echo -e "${BLUE}6.1 API Endpoints${NC}"
    
    # Test login
    LOGIN_RESULT=$(timeout 5 curl -s -X POST http://localhost:2001/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@lanoleather.vn","password":"Admin@123"}' 2>&1)
    
    if echo "$LOGIN_RESULT" | grep -q "accessToken"; then
        echo -e "${GREEN}✓${NC} Login endpoint works"
        PASS=$((PASS + 1))
        TOTAL=$((TOTAL + 1))
        
        # Extract token
        TOKEN=$(echo "$LOGIN_RESULT" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
        
        # Test protected endpoint
        ME_RESULT=$(timeout 5 curl -s http://localhost:2001/api/auth/me \
            -H "Authorization: Bearer $TOKEN" 2>&1)
        
        if echo "$ME_RESULT" | grep -q "email"; then
            echo -e "${GREEN}✓${NC} Protected endpoint works (JWT)"
            PASS=$((PASS + 1))
        else
            echo -e "${RED}✗${NC} Protected endpoint fails"
            FAILED_TESTS+=("Protected endpoint")
        fi
        TOTAL=$((TOTAL + 1))
        
        # Test Categories
        CATEGORIES=$(timeout 5 curl -s http://localhost:2001/api/categories \
            -H "Authorization: Bearer $TOKEN" 2>&1)
        
        if echo "$CATEGORIES" | grep -q "id"; then
            echo -e "${GREEN}✓${NC} Categories endpoint works"
            PASS=$((PASS + 1))
        else
            echo -e "${RED}✗${NC} Categories endpoint fails"
            FAILED_TESTS+=("Categories endpoint")
        fi
        TOTAL=$((TOTAL + 1))
        
        # Test Products
        PRODUCTS=$(timeout 5 curl -s "http://localhost:2001/api/products?page=1&limit=5" \
            -H "Authorization: Bearer $TOKEN" 2>&1)
        
        if echo "$PRODUCTS" | grep -q "data"; then
            echo -e "${GREEN}✓${NC} Products endpoint works"
            PASS=$((PASS + 1))
        else
            echo -e "${RED}✗${NC} Products endpoint fails"
            FAILED_TESTS+=("Products endpoint")
        fi
        TOTAL=$((TOTAL + 1))
    else
        echo -e "${RED}✗${NC} Login endpoint fails"
        FAILED_TESTS+=("Login endpoint")
        TOTAL=$((TOTAL + 4))
    fi
else
    echo -e "${YELLOW}⚠️  API not running on port 2001 - skipping API tests${NC}"
fi

# ═══════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

RATE=$((PASS * 100 / TOTAL))
FAIL=$((TOTAL - PASS))

echo -e "Result: ${GREEN}$PASS${NC}/${BLUE}$TOTAL${NC} (${GREEN}$RATE%${NC})"

if [ $RATE -ge 90 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  🎉 ALL PHASES (1-4): EXCELLENT! Ready for Phase 5!      ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
elif [ $RATE -ge 75 ]; then
    echo -e "${YELLOW}⚠️  $FAIL checks failed (${RATE}%)${NC}"
    echo -e "${YELLOW}   Some optional features may not work${NC}"
else
    echo -e "${RED}❌ $FAIL checks failed (${RATE}%)${NC}"
    echo -e "${RED}   Critical issues detected!${NC}"
fi

if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}Failed Tests:${NC}"
    for test in "${FAILED_TESTS[@]}"; do
        echo -e "${RED}  ✗ $test${NC}"
    done
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}📋 Next Steps:${NC}"
echo "   1. If all passed → Start Phase 5 (CustomersModule)"
echo "   2. If API not running → cd apps/api && pnpm dev"
echo "   3. Check logs if any fails"

