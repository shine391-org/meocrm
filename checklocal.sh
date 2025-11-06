#!/bin/bash
echo "🔍 Checking current local setup..."

cd ~/projects/meocrm
git checkout dev

# Check 1: AGENTS.md content
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "CHECK 1: AGENTS.md Script Version"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if grep -q "npm install -g supertest" AGENTS.md; then
  echo "  ❌ OLD: Has 'npm install -g supertest'"
  echo "  ⚠️  Jules will use OLD script!"
else
  echo "  ✅ NEW: No global supertest install"
fi

if grep -q "pnpm@8.15.6" AGENTS.md; then
  echo "  ✅ Has pnpm version specified"
else
  echo "  ⚠️  Missing pnpm version"
fi

# Check 2: package.json versions
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "CHECK 2: Package Versions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "🔍 Root package.json:"
if grep -q "@typescript-eslint/eslint-plugin" package.json; then
  echo "  ✅ Has TypeScript ESLint plugin"
else
  echo "  ❌ MISSING TypeScript ESLint plugin"
fi

echo ""
echo "🔍 apps/api/package.json:"
if grep -q '"supertest"' apps/api/package.json; then
  SUPERTEST_VER=$(grep '"supertest"' apps/api/package.json)
  echo "  Supertest: $SUPERTEST_VER"
  if echo "$SUPERTEST_VER" | grep -q "8\.0\."; then
    echo "  ❌ DEPRECATED version 8.0.x"
  else
    echo "  ✅ Using stable version"
  fi
fi

if grep -q "@nestjs/swagger" apps/api/package.json; then
  echo "  ✅ Has @nestjs/swagger"
else
  echo "  ⚠️  Missing @nestjs/swagger (optional for now)"
fi

# Check 3: Config files
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "CHECK 3: Config Files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

[ -f ".eslintrc.js" ] && echo "  ✅ .eslintrc.js" || echo "  ❌ .eslintrc.js missing"
[ -f ".prettierrc" ] && echo "  ✅ .prettierrc" || echo "  ❌ .prettierrc missing"
[ -f "apps/web/next.config.js" ] && echo "  ✅ next.config.js" || echo "  ❌ next.config.js missing"

echo ""
echo "🎯 DIAGNOSIS COMPLETE"
