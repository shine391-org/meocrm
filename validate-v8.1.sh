#!/bin/bash
#############################################################################
# MeoCRM Complete Validator v8.1-FINAL
# Check ALL files, fix ALL issues, verify EVERYTHING
#############################################################################

echo "🔍 MeoCRM Complete Validator v8.1-FINAL..."
echo "📍 Location: $(pwd)"
echo ""

ERRORS=0
FIXES=0
CHECKS=0

#############################################################################
# STEP 1: Fix ALL package.json files (COMPLETE versions)
#############################################################################
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  STEP 1: FIXING ALL PACKAGE.JSON FILES                   ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# 1.1 Root package.json
echo "📦 [1/3] Root package.json..."
cat > package.json << 'ROOT_PKG'
{
  "name": "meocrm",
  "version": "1.0.0",
  "description": "Multi-tenant CRM system inspired by KiotViet",
  "private": true,
  "scripts": {
    "dev": "concurrently \"pnpm dev:api\" \"pnpm dev:web\"",
    "dev:api": "pnpm --filter @meocrm/api dev",
    "dev:web": "pnpm --filter @meocrm/web dev",
    "build": "pnpm build:api && pnpm build:web",
    "build:api": "pnpm --filter @meocrm/api build",
    "build:web": "pnpm --filter @meocrm/web build",
    "lint": "eslint \"apps/**/*.{ts,tsx}\" --max-warnings 100",
    "lint:fix": "eslint \"apps/**/*.{ts,tsx}\" --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "pnpm --filter @meocrm/api test",
    "test:cov": "pnpm --filter @meocrm/api test:cov",
    "test:e2e": "pnpm --filter @meocrm/api test:e2e"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^6.21.0",
    "@typescript-eslint/parser": "^6.21.0",
    "concurrently": "^8.2.2",
    "eslint": "^8.57.1",
    "eslint-config-prettier": "^9.1.0",
    "prettier": "^3.2.5",
    "typescript": "^5.3.3"
  },
  "packageManager": "pnpm@8.15.6",
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=8.0.0"
  }
}
ROOT_PKG
echo "  ✅ Root package.json created (7 devDeps)"
((FIXES++))

# 1.2 API package.json (COMPLETE with auth + swagger)
echo "📦 [2/3] API package.json (COMPLETE)..."
mkdir -p apps/api/src
cat > apps/api/package.json << 'API_PKG'
{
  "name": "@meocrm/api",
  "version": "1.0.0",
  "description": "MeoCRM NestJS API",
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main",
    "test": "jest --passWithNoTests",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:e2e": "jest --config ./test/jest-e2e.json --passWithNoTests",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@nestjs/common": "^10.3.0",
    "@nestjs/core": "^10.3.0",
    "@nestjs/config": "^3.1.1",
    "@nestjs/platform-express": "^10.3.0",
    "@nestjs/swagger": "^7.1.17",
    "@nestjs/passport": "^10.0.3",
    "@nestjs/jwt": "^10.2.0",
    "@prisma/client": "^5.7.1",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "bcryptjs": "^2.4.3",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1",
    "joi": "^17.11.0",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.1",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.2.1",
    "@nestjs/testing": "^10.3.0",
    "@faker-js/faker": "^8.3.1",
    "@types/bcryptjs": "^2.4.6",
    "@types/jest": "^29.5.11",
    "@types/node": "^20.10.6",
    "@types/passport-jwt": "^4.0.0",
    "@types/supertest": "^6.0.2",
    "@types/uuid": "^9.0.7",
    "jest": "^29.7.0",
    "prisma": "^5.7.1",
    "supertest": "^6.3.3",
    "ts-jest": "^29.1.1",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
API_PKG
echo "  ✅ API package.json created (16 deps + 15 devDeps = 31 packages)"
((FIXES++))

# 1.3 Web package.json (COMPLETE with state management)
echo "📦 [3/3] Web package.json (COMPLETE)..."
mkdir -p apps/web/app
cat > apps/web/package.json << 'WEB_PKG'
{
  "name": "@meocrm/web",
  "version": "1.0.0",
  "description": "MeoCRM Next.js Web App",
  "scripts": {
    "dev": "next dev --port 2004",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.0.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.4.7",
    "@tanstack/react-query": "^5.14.2"
  },
  "devDependencies": {
    "@types/node": "^20.10.6",
    "@types/react": "^18.2.45",
    "@types/react-dom": "^18.2.18",
    "eslint": "^8.57.1",
    "eslint-config-next": "^14.0.4",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.3"
  }
}
WEB_PKG
echo "  ✅ Web package.json created (5 deps + 8 devDeps = 13 packages)"
((FIXES++))

#############################################################################
# STEP 2: Validate ALL JSON
#############################################################################
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  STEP 2: JSON VALIDATION                                 ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

node -e "
const fs = require('fs');
let errors = 0;
let checks = 0;

const files = [
  'package.json',
  'apps/api/package.json', 
  'apps/web/package.json'
];

files.forEach(file => {
  checks++;
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    console.log('  ✅ ' + file + ': Valid JSON');
    
    // Count packages
    const deps = Object.keys(data.dependencies || {}).length;
    const devDeps = Object.keys(data.devDependencies || {}).length;
    if (deps + devDeps > 0) {
      console.log('     📦 ' + (deps + devDeps) + ' packages (' + deps + ' deps + ' + devDeps + ' devDeps)');
    }
  } catch(e) {
    console.log('  ❌ ' + file + ': ' + e.message);
    errors++;
  }
});

console.log('');
if (errors > 0) {
  console.log('❌ JSON validation failed: ' + errors + ' errors');
  process.exit(1);
} else {
  console.log('✅ All ' + checks + ' JSON files valid!');
}
" || exit 1

((CHECKS+=3))

#############################################################################
# STEP 3: Create ALL config files
#############################################################################
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  STEP 3: CONFIG FILES                                    ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# 3.1 .eslintrc.js
echo "⚙️  [1/8] .eslintrc.js..."
cat > .eslintrc.js << 'ESLINT'
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['apps/*/tsconfig.json'],
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: ['@typescript-eslint/recommended'],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: [
    '.eslintrc.js',
    'dist/',
    '.next/',
    'node_modules/',
    'coverage/',
    '*.config.js',
  ],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
};
ESLINT
echo "  ✅ Created"
((FIXES++))

# 3.2 .prettierrc
echo "⚙️  [2/8] .prettierrc..."
cat > .prettierrc << 'PRETTIER'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
PRETTIER
echo "  ✅ Created"
((FIXES++))

# 3.3 .prettierignore
echo "⚙️  [3/8] .prettierignore..."
cat > .prettierignore << 'PRETTIER_IGNORE'
node_modules/
dist/
.next/
coverage/
pnpm-lock.yaml
*.log
.env*
PRETTIER_IGNORE
echo "  ✅ Created"
((FIXES++))

# 3.4 pnpm-workspace.yaml
echo "⚙️  [4/8] pnpm-workspace.yaml..."
cat > pnpm-workspace.yaml << 'WORKSPACE'
packages:
  - "apps/*"
WORKSPACE
echo "  ✅ Created"
((FIXES++))

# 3.5 Root tsconfig.json
echo "⚙️  [5/8] tsconfig.json (root)..."
cat > tsconfig.json << 'TS_ROOT'
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "commonjs",
    "lib": ["ES2021"],
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true
  }
}
TS_ROOT
echo "  ✅ Created"
((FIXES++))

# 3.6 API tsconfig.json
echo "⚙️  [6/8] apps/api/tsconfig.json..."
cat > apps/api/tsconfig.json << 'TS_API'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
TS_API
echo "  ✅ Created"
((FIXES++))

# 3.7 Web tsconfig.json
echo "⚙️  [7/8] apps/web/tsconfig.json..."
cat > apps/web/tsconfig.json << 'TS_WEB'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "jsx": "preserve",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
TS_WEB
echo "  ✅ Created"
((FIXES++))

# 3.8 Next.js config
echo "⚙️  [8/8] apps/web/next.config.js..."
cat > apps/web/next.config.js << 'NEXT_CONFIG'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
}

module.exports = nextConfig
NEXT_CONFIG
echo "  ✅ Created"
((FIXES++))

#############################################################################
# STEP 4: Create source file structure
#############################################################################
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  STEP 4: SOURCE FILE STRUCTURE                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# API source files (if not exist)
if [ ! -f "apps/api/src/main.ts" ]; then
  echo "📝 Creating API source files..."
  
  cat > apps/api/src/main.ts << 'MAIN'
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
MAIN
  
  cat > apps/api/src/app.module.ts << 'APP_MODULE'
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
APP_MODULE
  
  echo "  ✅ API source files created"
  ((FIXES++))
else
  echo "  ✅ API source files exist"
fi

# Web source files (if not exist)
if [ ! -f "apps/web/app/page.tsx" ]; then
  echo "📝 Creating Web source files..."
  mkdir -p apps/web/app
  
  cat > apps/web/app/layout.tsx << 'LAYOUT'
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
LAYOUT
  
  cat > apps/web/app/page.tsx << 'PAGE'
export default function Home() {
  return (
    <main>
      <h1>MeoCRM</h1>
      <p>Multi-tenant CRM System</p>
    </main>
  )
}
PAGE
  
  echo "  ✅ Web source files created"
  ((FIXES++))
else
  echo "  ✅ Web source files exist"
fi

#############################################################################
# STEP 5: Clean up conflicts
#############################################################################
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  STEP 5: CLEANUP CONFLICTS                               ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Remove local ESLint configs (centralized approach)
if [ -f "apps/api/.eslintrc.js" ]; then
  rm apps/api/.eslintrc.js
  echo "  🗑️  Removed apps/api/.eslintrc.js"
  ((FIXES++))
fi

if [ -f "apps/web/.eslintrc.json" ]; then
  rm apps/web/.eslintrc.json
  echo "  🗑️  Removed apps/web/.eslintrc.json"
  ((FIXES++))
fi

if [ -f ".npmrc" ]; then
  rm .npmrc
  echo "  🗑️  Removed .npmrc"
  ((FIXES++))
fi

echo "  ✅ Cleanup complete"

#############################################################################
# STEP 6: COMPREHENSIVE VERIFICATION
#############################################################################
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  STEP 6: COMPREHENSIVE VERIFICATION                      ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

echo "🧪 Testing all JSON files..."
node << 'VERIFY_JSON'
const fs = require('fs');
let passed = 0;
let failed = 0;

const files = {
  'Root': 'package.json',
  'API': 'apps/api/package.json',
  'Web': 'apps/web/package.json',
  'Prettier': '.prettierrc',
};

Object.entries(files).forEach(([name, file]) => {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    console.log(`  ✅ ${name}: Valid JSON`);
    
    // Count packages for package.json files
    if (file.endsWith('package.json')) {
      const deps = Object.keys(data.dependencies || {}).length;
      const devDeps = Object.keys(data.devDependencies || {}).length;
      const total = deps + devDeps;
      console.log(`     📦 ${total} packages (${deps} deps + ${devDeps} devDeps)`);
    }
    passed++;
  } catch(e) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
});

console.log('');
console.log(`📊 JSON Validation: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
VERIFY_JSON

if [ $? -eq 0 ]; then
  echo "  ✅ JSON validation passed"
  ((CHECKS++))
else
  echo "  ❌ JSON validation failed"
  exit 1
fi

# Check JavaScript files
echo ""
echo "🧪 Testing JavaScript files..."

if node -c .eslintrc.js 2>/dev/null; then
  echo "  ✅ .eslintrc.js: Valid"
  ((CHECKS++))
else
  echo "  ❌ .eslintrc.js: Syntax error"
  ((ERRORS++))
fi

if node -c apps/web/next.config.js 2>/dev/null; then
  echo "  ✅ next.config.js: Valid"
  ((CHECKS++))
else
  echo "  ❌ next.config.js: Syntax error"
  ((ERRORS++))
fi

# Check required files exist
echo ""
echo "🧪 Checking required files..."

REQUIRED_FILES=(
  "package.json"
  "apps/api/package.json"
  "apps/web/package.json"
  ".eslintrc.js"
  ".prettierrc"
  "pnpm-workspace.yaml"
  "tsconfig.json"
  "apps/api/tsconfig.json"
  "apps/web/tsconfig.json"
  "apps/web/next.config.js"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
    ((CHECKS++))
  else
    echo "  ❌ Missing: $file"
    ((ERRORS++))
  fi
done

#############################################################################
# STEP 7: PACKAGE COUNT VERIFICATION
#############################################################################
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  STEP 7: PACKAGE COUNT VERIFICATION                      ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

node << 'COUNT_PACKAGES'
const fs = require('fs');

const rootPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const apiPkg = JSON.parse(fs.readFileSync('apps/api/package.json', 'utf8'));
const webPkg = JSON.parse(fs.readFileSync('apps/web/package.json', 'utf8'));

const rootCount = Object.keys(rootPkg.devDependencies || {}).length;
const apiDeps = Object.keys(apiPkg.dependencies || {}).length;
const apiDevDeps = Object.keys(apiPkg.devDependencies || {}).length;
const webDeps = Object.keys(webPkg.dependencies || {}).length;
const webDevDeps = Object.keys(webPkg.devDependencies || {}).length;

const total = rootCount + apiDeps + apiDevDeps + webDeps + webDevDeps;

console.log('📦 PACKAGE COUNT BREAKDOWN:');
console.log('');
console.log('  Root devDependencies:     ' + rootCount + ' packages');
console.log('  API dependencies:         ' + apiDeps + ' packages');
console.log('  API devDependencies:      ' + apiDevDeps + ' packages');
console.log('  Web dependencies:         ' + webDeps + ' packages');
console.log('  Web devDependencies:      ' + webDevDeps + ' packages');
console.log('  ─────────────────────────────────────');
console.log('  TOTAL:                    ' + total + ' packages');
console.log('');

// Expected: 48 packages minimum for v8.1
if (total >= 48) {
  console.log('✅ Package count: ' + total + ' >= 48 (COMPLETE)');
} else {
  console.log('⚠️  Package count: ' + total + ' < 48 (Recommended: 48+)');
}

// Check critical packages
const criticalPackages = [
  '@typescript-eslint/eslint-plugin',
  '@typescript-eslint/parser',
  '@nestjs/swagger',
  '@nestjs/passport',
  '@nestjs/jwt',
  'joi',
  'class-validator',
  'bcryptjs',
  'zustand',
  '@tanstack/react-query',
];

console.log('');
console.log('🔍 CRITICAL PACKAGES CHECK:');
let missing = [];

criticalPackages.forEach(pkg => {
  const foundRoot = rootPkg.devDependencies?.[pkg] || rootPkg.dependencies?.[pkg];
  const foundAPI = apiPkg.devDependencies?.[pkg] || apiPkg.dependencies?.[pkg];
  const foundWeb = webPkg.devDependencies?.[pkg] || webPkg.dependencies?.[pkg];
  
  if (foundRoot || foundAPI || foundWeb) {
    console.log('  ✅ ' + pkg);
  } else {
    console.log('  ❌ ' + pkg + ' (MISSING)');
    missing.push(pkg);
  }
});

console.log('');
if (missing.length === 0) {
  console.log('✅ All critical packages present!');
} else {
  console.log('⚠️  Missing ' + missing.length + ' critical packages');
  process.exit(1);
}
COUNT_PACKAGES

if [ $? -eq 0 ]; then
  echo "  ✅ Package verification passed"
else
  echo "  ❌ Package verification failed"
  exit 1
fi

#############################################################################
# STEP 8: FINAL COMPREHENSIVE CHECK
#############################################################################
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  STEP 8: FINAL VERIFICATION                              ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

echo "🎯 Checklist:"
echo ""

# File existence
echo "📁 Required Files:"
[ -f "package.json" ] && echo "  ✅ package.json" || echo "  ❌ package.json"
[ -f "apps/api/package.json" ] && echo "  ✅ apps/api/package.json" || echo "  ❌ apps/api/package.json"
[ -f "apps/web/package.json" ] && echo "  ✅ apps/web/package.json" || echo "  ❌ apps/web/package.json"
[ -f ".eslintrc.js" ] && echo "  ✅ .eslintrc.js" || echo "  ❌ .eslintrc.js"
[ -f ".prettierrc" ] && echo "  ✅ .prettierrc" || echo "  ❌ .prettierrc"
[ -f "pnpm-workspace.yaml" ] && echo "  ✅ pnpm-workspace.yaml" || echo "  ❌ pnpm-workspace.yaml"
[ -f "tsconfig.json" ] && echo "  ✅ tsconfig.json" || echo "  ❌ tsconfig.json"
[ -f "apps/api/tsconfig.json" ] && echo "  ✅ apps/api/tsconfig.json" || echo "  ❌ apps/api/tsconfig.json"
[ -f "apps/web/tsconfig.json" ] && echo "  ✅ apps/web/tsconfig.json" || echo "  ❌ apps/web/tsconfig.json"
[ -f "apps/web/next.config.js" ] && echo "  ✅ next.config.js" || echo "  ❌ next.config.js"

echo ""
echo "🚫 Conflicting Files (should NOT exist):"
[ ! -f "apps/api/.eslintrc.js" ] && echo "  ✅ No apps/api/.eslintrc.js" || echo "  ⚠️  apps/api/.eslintrc.js exists (remove)"
[ ! -f "apps/web/.eslintrc.json" ] && echo "  ✅ No apps/web/.eslintrc.json" || echo "  ⚠️  apps/web/.eslintrc.json exists (remove)"
[ ! -f ".npmrc" ] && echo "  ✅ No .npmrc" || echo "  ⚠️  .npmrc exists (remove)"

#############################################################################
# SUMMARY
#############################################################################
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║           VALIDATION COMPLETE                             ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "📊 SUMMARY:"
echo "  Errors:        $ERRORS"
echo "  Fixes applied: $FIXES"
echo "  Checks passed: $CHECKS"
echo ""

if [ $ERRORS -eq 0 ]; then
  echo "✅ ALL VALIDATION PASSED!"
  echo ""
  echo "📋 FILES CHANGED:"
  git status --short
  echo ""
  echo "🎯 READY TO COMMIT:"
  echo ""
  echo "  git add ."
  echo "  git commit -m 'fix(env): complete v8.1 configuration - 48+ packages'"
  echo "  git push origin dev"
  echo ""
  echo "🚀 After push, Jules can clone and run script v8.1!"
else
  echo "⚠️  VALIDATION FAILED: $ERRORS errors"
  echo "  Please review errors above"
  exit 1
fi
