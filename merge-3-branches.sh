#!/bin/bash
#
# MeoCRM - Merge 3 Branches Workflow
# Branches: Products → Orders → Customers
# Pattern: Merge → Test → Merge → Test
#
# Usage: bash merge-3-branches.sh
# Or with Codex: codex exec --script merge-3-branches.sh
#

set -e  # Exit on any error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Test function
run_tests() {
    local test_name=$1
    log_info "Running tests: $test_name"
    
    cd apps/api
    
    # Install dependencies (if needed)
    if [ ! -d "node_modules" ]; then
        log_info "Installing dependencies..."
        pnpm install
    fi
    
    # Build
    log_info "Building API..."
    pnpm build
    
    # Run tests with coverage
    log_info "Running test suite..."
    pnpm test:cov
    
    # Check coverage threshold
    coverage=$(grep -oP '(?<=Lines\s+:\s)\d+\.\d+' coverage/coverage-summary.json | head -1)
    threshold=80
    
    if (( $(echo "$coverage < $threshold" | bc -l) )); then
        log_error "Coverage ($coverage%) is below threshold ($threshold%)"
        exit 1
    fi
    
    log_info "Coverage: $coverage% (≥$threshold%) ✅"
    
    cd ../..
}

# Rollback function
rollback() {
    local branch_name=$1
    log_error "Rolling back merge of $branch_name"
    git reset --hard HEAD^
    git push origin dev --force
    exit 1
}

# Main workflow
main() {
    log_info "🚀 Starting merge workflow for MeoCRM Phase 5"
    log_info "Branches: Products → Orders → Customers"
    echo ""
    
    # Verify we're in the right directory
    if [ ! -f "package.json" ] || [ ! -d "apps/api" ]; then
        log_error "Not in MeoCRM root directory!"
        exit 1
    fi
    
    # Verify git repo
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Not a git repository!"
        exit 1
    fi
    
    # ========================================
    # STEP 1: Merge Products (PR #17)
    # ========================================
    echo ""
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "STEP 1/3: Merging Products (PR #17)"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Checkout dev
    log_info "Checking out dev branch..."
    git checkout dev
    git pull origin dev
    
    # Fetch remote branch
    log_info "Fetching feat-products-advanced-filtering..."
    git fetch origin feat-products-advanced-filtering
    
    # Merge
    log_info "Merging feat-products-advanced-filtering..."
    if ! git merge --no-ff origin/feat-products-advanced-filtering \
        -m "merge: Products Advanced Filtering (PR #17)

- Add QueryProductsDto with 8 filter params
- Implement search/filter/sort functionality
- Add pagination with count query
- Unit tests with 100% coverage
- Backward compatible with existing API"; then
        log_error "Merge conflict! Please resolve manually."
        exit 1
    fi
    
    # Push
    log_info "Pushing to origin/dev..."
    git push origin dev
    
    # Test
    run_tests "Products Integration"
    
    log_info "✅ Products merge completed successfully!"
    
    
    # ========================================
    # STEP 2: Merge Orders (PR #16)
    # ========================================
    echo ""
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "STEP 2/3: Merging Orders (PR #16)"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Wait for Jules to finish fixing PR #16
    log_warning "Checking if Orders branch is ready..."
    
    # Fetch remote branch
    log_info "Fetching feature-orders-backend..."
    git fetch origin feature-orders-backend
    
    # Check if branch has recent commits (Jules fix)
    last_commit_time=$(git log -1 --format=%ct origin/feature-orders-backend)
    current_time=$(date +%s)
    time_diff=$((current_time - last_commit_time))
    
    if [ $time_diff -gt 3600 ]; then
        log_warning "Orders branch hasn't been updated in $((time_diff/60)) minutes"
        log_warning "Make sure Jules has pushed fixes for isPaid/paidAmount"
        read -p "Continue with merge? [y/N] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Merge cancelled. Fix Orders branch first."
            exit 0
        fi
    fi
    
    # Merge
    log_info "Merging feature-orders-backend..."
    if ! git merge --no-ff origin/feature-orders-backend \
        -m "merge: Orders Backend with payment tracking (PR #16)

- Add isPaid and paidAmount fields to Order model
- Implement Customer.debt calculation
- Update CreateOrderDto with payment params
- Add unit tests for payment scenarios
- Schema applied via prisma db push"; then
        log_error "Merge conflict! Please resolve manually."
        rollback "Orders"
    fi
    
    # Push
    log_info "Pushing to origin/dev..."
    git push origin dev
    
    # Test
    run_tests "Orders Integration"
    
    log_info "✅ Orders merge completed successfully!"
    
    
    # ========================================
    # STEP 3: Merge Customers (PR #15)
    # ========================================
    echo ""
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "STEP 3/3: Merging Customers (PR #15)"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Fetch remote branch
    log_info "Fetching feature-frontend-customers-1..."
    git fetch origin feature-frontend-customers-1
    
    # Merge
    log_info "Merging feature-frontend-customers-1..."
    if ! git merge --no-ff origin/feature-frontend-customers-1 \
        -m "merge: Customers Frontend UI (PR #15)

- Complete CRUD operations
- Search and pagination
- Inline detail view
- Create/edit forms with validation
- Responsive design
- Minor TODOs documented for Phase 6"; then
        log_warning "Merge conflict detected. Likely in docs/README."
        log_info "Auto-resolving with 'ours' strategy for docs..."
        
        # Auto-resolve docs conflicts (keep both changes)
        git checkout --ours docs/ || true
        git add docs/ || true
        
        # If still conflicts, manual required
        if git diff --check; then
            log_error "Cannot auto-resolve conflicts. Please resolve manually."
            rollback "Customers"
        fi
        
        git commit --no-edit
    fi
    
    # Push
    log_info "Pushing to origin/dev..."
    git push origin dev
    
    # Test backend
    run_tests "Full Backend Integration"
    
    # Test frontend build
    log_info "Testing frontend build..."
    cd apps/web
    if [ ! -d "node_modules" ]; then
        pnpm install
    fi
    pnpm build
    cd ../..
    
    log_info "✅ Customers merge completed successfully!"
    
    
    # ========================================
    # FINAL VALIDATION
    # ========================================
    echo ""
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "FINAL VALIDATION"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Full integration test
    log_info "Running full integration test suite..."
    pnpm --filter @meocrm/api test:cov
    pnpm --filter @meocrm/web build
    
    # Summary
    echo ""
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "🎉 ALL MERGES COMPLETED SUCCESSFULLY!"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    log_info "Merged branches:"
    log_info "  ✅ feat-products-advanced-filtering (PR #17)"
    log_info "  ✅ feature-orders-backend (PR #16)"
    log_info "  ✅ feature-frontend-customers-1 (PR #15)"
    echo ""
    log_info "Next steps:"
    log_info "  1. Tag version: git tag v0.5.0-phase5-integration"
    log_info "  2. Push tag: git push origin v0.5.0-phase5-integration"
    log_info "  3. Merge dev → staging: git checkout staging && git merge dev"
    log_info "  4. Deploy staging for QA testing"
    echo ""
    log_info "Dev branch is ready for staging deployment! 🚀"
}

# Run main workflow
main "$@"

