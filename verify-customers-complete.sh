#!/bin/bash
# Script: verify-customers-complete.sh
# Description: Kiểm tra toàn bộ CustomersModule sau khi setup
# Run: ./verify-customers-complete.sh
set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     VERIFY CustomersModule - Complete Check               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

pass() {
    echo -e "${GREEN}✓${NC} $1"
    PASS=$((PASS + 1))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    FAIL=$((FAIL + 1))
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    WARN=$((WARN + 1))
}

info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

section() {
    echo ""
    echo -e "${CYAN}━━━ $1 ━━━${NC}"
    echo ""
}

# ============================================================
# 1. CHECK GIT BRANCH
# ============================================================

section "1. Git Branch & Status"

CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" == "feature/customers" ]]; then
    pass "On correct branch: feature/customers"
else
    fail "Wrong branch: $CURRENT_BRANCH (expected: feature/customers)"
fi

# Check uncommitted changes
CHANGES=$(git status -s | wc -l)
if [[ $CHANGES -gt 0 ]]; then
    pass "Uncommitted changes found: $CHANGES files (ready to commit)"
else
    warn "No uncommitted changes - already committed?"
fi

# ============================================================
# 2. CHECK FILE STRUCTURE
# ============================================================

section "2. File Structure Check"

MODULE_DIR="apps/api/src/customers"

# Check main directory
if [[ -d "$MODULE_DIR" ]]; then
    pass "CustomersModule directory exists"
else
    fail "CustomersModule directory NOT FOUND"
fi

# Check required files
REQUIRED_FILES=(
    "$MODULE_DIR/dto/create-customer.dto.ts"
    "$MODULE_DIR/dto/update-customer.dto.ts"
    "$MODULE_DIR/dto/list-customers.dto.ts"
    "$MODULE_DIR/customers.service.ts"
    "$MODULE_DIR/customers.controller.ts"
    "$MODULE_DIR/customers.module.ts"
    "$MODULE_DIR/entities/customer.entity.ts"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        SIZE=$(wc -c < "$file")
        if [[ $SIZE -gt 100 ]]; then
            pass "$(basename $file) exists ($SIZE bytes)"
        else
            fail "$(basename $file) too small ($SIZE bytes)"
        fi
    else
        fail "$(basename $file) NOT FOUND"
    fi
done

# ============================================================
# 3. CHECK PRISMA SCHEMA
# ============================================================

section "3. Prisma Schema Check"

SCHEMA_FILE="apps/api/prisma/schema.prisma"

if [[ ! -f "$SCHEMA_FILE" ]]; then
    fail "Prisma schema not found"
else
    pass "Prisma schema exists"
    
    # Check deletedAt field
    if grep -A 30 "model Customer" "$SCHEMA_FILE" | grep -q "deletedAt"; then
        pass "deletedAt field exists in Customer model"
        
        # Check correct mapping
        if grep -A 30 "model Customer" "$SCHEMA_FILE" | grep "deletedAt" | grep -q '@map("deleted_at")'; then
            pass "deletedAt has correct @map annotation"
        else
            fail "deletedAt missing @map annotation"
        fi
    else
        fail "deletedAt field NOT FOUND in Customer model"
    fi
fi

# ============================================================
# 4. CHECK CODE CONTENT - Critical
# ============================================================

section "4. Code Content Validation"

SERVICE_FILE="$MODULE_DIR/customers.service.ts"

if [[ -f "$SERVICE_FILE" ]]; then
    # CRITICAL: Check prisma.customer (not product!)
    if grep -q "prisma\.customer\." "$SERVICE_FILE"; then
        pass "Service uses prisma.customer (CORRECT)"
    else
        fail "Service does NOT use prisma.customer"
    fi
    
    if grep -q "prisma\.product\." "$SERVICE_FILE"; then
        fail "Service WRONGLY uses prisma.product"
    else
        pass "Service does not use prisma.product (GOOD)"
    fi
    
    # Check code generation
    if grep -q "KH0000" "$SERVICE_FILE"; then
        pass "Customer code generation (KH) found"
    else
        fail "Customer code generation NOT FOUND"
    fi
    
    # Check response format
    if grep -q "data.*meta" "$SERVICE_FILE"; then
        pass "Response format { data, meta } found"
    else
        warn "Response format may not match Products pattern"
    fi
    
    # Check ConflictException
    if grep -q "ConflictException" "$SERVICE_FILE"; then
        pass "ConflictException used for duplicates"
    else
        warn "ConflictException not found"
    fi
    
    # Check soft delete
    if grep -q "deletedAt: null" "$SERVICE_FILE"; then
        pass "Soft delete filter implemented"
    else
        fail "Soft delete filter MISSING"
    fi
fi

# ============================================================
# 5. CHECK CONTROLLER
# ============================================================

section "5. Controller Validation"

CONTROLLER_FILE="$MODULE_DIR/customers.controller.ts"

if [[ -f "$CONTROLLER_FILE" ]]; then
    # Check JWT Guard
    if grep -q "UseGuards(JwtAuthGuard)" "$CONTROLLER_FILE"; then
        pass "JwtAuthGuard applied - SECURITY OK"
    else
        fail "JwtAuthGuard MISSING - SECURITY ISSUE!"
    fi
    
    # Check Swagger tags
    if grep -q "@ApiTags" "$CONTROLLER_FILE"; then
        pass "Swagger @ApiTags found"
    else
        warn "Swagger tags missing"
    fi
    
    # Check all routes
    ROUTES=("@Post()" "@Get()" "@Get(':id')" "@Patch(':id')" "@Delete(':id')")
    for route in "${ROUTES[@]}"; do
        if grep -q "$route" "$CONTROLLER_FILE"; then
            pass "Route $route exists"
        else
            fail "Route $route MISSING"
        fi
    done
    
    # Check @CurrentUser
    if grep -q "@CurrentUser()" "$CONTROLLER_FILE"; then
        pass "@CurrentUser decorator used"
    else
        fail "@CurrentUser NOT used"
    fi
fi

# ============================================================
# 6. CHECK MODULE
# ============================================================

section "6. Module Validation"

MODULE_FILE="$MODULE_DIR/customers.module.ts"

if [[ -f "$MODULE_FILE" ]]; then
    # Check exports (CRITICAL for Orders module!)
    if grep -q "exports:.*CustomersService" "$MODULE_FILE"; then
        pass "CustomersService exported (IMPORTANT for Orders!)"
    else
        fail "CustomersService NOT exported - Orders module will fail!"
    fi
    
    # Check imports
    if grep -q "imports:.*PrismaModule" "$MODULE_FILE"; then
        pass "PrismaModule imported"
    else
        fail "PrismaModule NOT imported"
    fi
    
    # Check providers
    if grep -q "providers:.*CustomersService" "$MODULE_FILE"; then
        pass "CustomersService provided"
    else
        fail "CustomersService NOT provided"
    fi
fi

# ============================================================
# 7. CHECK DTO CONTENT
# ============================================================

section "7. DTO Validation"

CREATE_DTO="$MODULE_DIR/dto/create-customer.dto.ts"

if [[ -f "$CREATE_DTO" ]]; then
    # Check province/district/ward fields
    LOCATION_FIELDS=("province" "district" "ward")
    for field in "${LOCATION_FIELDS[@]}"; do
        if grep -q "$field" "$CREATE_DTO"; then
            pass "DTO has $field field"
        else
            fail "DTO MISSING $field field"
        fi
    done
    
    # Check phone validation
    if grep -q "@Matches" "$CREATE_DTO"; then
        pass "Phone validation with @Matches"
    else
        warn "Phone validation may be missing"
    fi
    
    # Check decorators
    if grep -q "class-validator" "$CREATE_DTO"; then
        pass "class-validator imported"
    else
        fail "class-validator NOT imported"
    fi
fi

# ============================================================
# 8. CHECK APP.MODULE.TS
# ============================================================

section "8. App Module Integration"

APP_MODULE="apps/api/src/app.module.ts"

if [[ -f "$APP_MODULE" ]]; then
    # Check import
    if grep -q "import.*CustomersModule.*from.*customers" "$APP_MODULE"; then
        pass "CustomersModule imported in app.module.ts"
    else
        fail "CustomersModule import MISSING in app.module.ts"
    fi
    
    # Check in imports array
    if grep -q "CustomersModule" "$APP_MODULE"; then
        pass "CustomersModule in imports array"
    else
        fail "CustomersModule NOT in imports array"
    fi
fi

# ============================================================
# 9. CHECK TYPESCRIPT COMPILATION
# ============================================================

section "9. TypeScript Compilation Check"

cd apps/api

info "Running TypeScript compiler..."
if pnpm tsc --noEmit > /tmp/tsc_check.log 2>&1; then
    pass "TypeScript compilation successful"
else
    if grep -q "error TS" /tmp/tsc_check.log; then
        fail "TypeScript compilation errors found:"
        cat /tmp/tsc_check.log | grep "error TS" | head -10
    else
        warn "TypeScript check completed with warnings"
    fi
fi

cd ../..

# ============================================================
# 10. CHECK BUILD
# ============================================================

section "10. Build Check"

cd apps/api

info "Running NestJS build..."
if pnpm build > /tmp/build_check.log 2>&1; then
    pass "Build successful"
else
    fail "Build failed - check /tmp/build_check.log"
fi

cd ../..

# ============================================================
# FINAL SUMMARY
# ============================================================

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                  VERIFICATION COMPLETE                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

echo -e "${GREEN}✓ Passed:  $PASS checks${NC}"
echo -e "${YELLOW}⚠ Warnings: $WARN checks${NC}"
echo -e "${RED}✗ Failed:  $FAIL checks${NC}"
echo ""

TOTAL=$((PASS + WARN + FAIL))
SCORE=$((PASS * 100 / TOTAL))

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [[ $FAIL -eq 0 ]]; then
    echo -e "${GREEN}🎉 ALL CRITICAL CHECKS PASSED! (Score: $SCORE/100)${NC}"
    echo ""
    echo "✅ CustomersModule is ready to commit!"
    echo ""
    echo "Next steps:"
    echo "  git add ."
    echo "  git commit -m 'feat(customers): add CustomersModule'"
    echo "  git push origin feature/customers"
    echo ""
    exit 0
elif [[ $FAIL -le 3 ]]; then
    echo -e "${YELLOW}⚠️  MINOR ISSUES FOUND (Score: $SCORE/100)${NC}"
    echo ""
    echo "Review failed checks above and fix if needed."
    echo "You may proceed to commit if issues are minor."
    echo ""
    exit 1
else
    echo -e "${RED}❌ MAJOR ISSUES FOUND (Score: $SCORE/100)${NC}"
    echo ""
    echo "CRITICAL: Do NOT commit yet!"
    echo "Fix all failed checks above before committing."
    echo ""
    exit 2
fi
