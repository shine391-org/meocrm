# 📝 Troubleshooting Cheatsheet - Common Issues

> **Purpose:** Document common issues and their solutions
> 

> **Last Updated:** November 10, 2025
> 

> **Maintainer:** Jules + Boss
> 

---

## ⚠️ ISSUE #1: Relative Path Confusion

### Problem

**Symptom:**

```bash
# Boss is in apps/api/ folder
shine@Shine:~/projects/meocrm/apps/api$ cat apps/api/.env | grep DATABASE_URL
cat: apps/api/.env: No such file or directory
```

**Root Cause:**

- The user is already IN `apps/api/` folder.
- The command tries to find `apps/api/apps/api/.env` which is incorrect.
- The correct path from the current location is just `.env`.

### Solution

**Rule of thumb:**

```bash
# When you are IN apps/api/ folder:
pwd  # Shows: ~/projects/meocrm/apps/api
cat .env                    # ✅ Correct
cat apps/api/.env           # ❌ Wrong (looks for apps/api/apps/api/.env)

# When you are IN project root:
pwd  # Shows: ~/projects/meocrm
cat apps/api/.env           # ✅ Correct
cat .env                    # ❌ Wrong (looks for .env in root)
```

### Quick Check Command

**Always verify your current location first:**

```bash
# Show current directory
pwd

# Show .env file location relative to current dir
find . -name ".env" -maxdepth 2

# Or use absolute path (always works)
cat ~/projects/meocrm/apps/api/.env
```

### Best Practice

**Use absolute paths in scripts/commands to avoid confusion:**

```bash
# Instead of:
cat .env

# Use:
cat ~/projects/meocrm/apps/api/.env
```

---

## ⚠️ ISSUE #2: Prisma cannot connect to DB in Jules VM

### Problem

**Symptom:**

```
PrismaClientInitializationError
Cannot connect to PostgreSQL at localhost:2001
```

**Context:**

- Jules VM snapshot ships Postgres 17 inside Docker on port **2001**.
- DATABASE_URL sometimes points to `localhost` or a stopped container.
- Prisma/psql cannot connect ❌

### Root Causes

1.  **`localhost` vs `127.0.0.1`**: `localhost` might not resolve correctly. Using `127.0.0.1` forces an IPv4 TCP connection.
2.  **Firewall/Port blocking**: The port might be blocked by `ufw` or other firewalls.
3.  **Containers stopped**: Docker may not restart automatically after a crash; start it manually.

### Solution Workflow

### Step 1: Use the Diagnostic Script

A diagnostic script is available at `scripts/diagnose-db.sh` to automatically check for common connection issues.

```bash
./scripts/diagnose-db.sh
```

### Step 2: Fix .env (Most Common Fix)

Update your `apps/api/.env` to use `127.0.0.1` instead of `localhost`.

```bash
# .env
DATABASE_URL="postgresql://meocrm_user:meocrm_dev_password@127.0.0.1:2001/meocrm_dev?schema=public"
```

### Step 3: Restart snapshot containers (if needed)

```bash
sudo docker ps --filter "name=db"
sudo docker compose -f /tmp/meocrm-compose.yaml up -d db
```

### Step 4: Verify Fix

```bash
# Test connection
psql "postgresql://meocrm_user:meocrm_dev_password@127.0.0.1:2001/meocrm_dev" -c "SELECT 1;"

# Test Prisma
cd ~/projects/meocrm/apps/api
pnpm prisma db pull
```

---

## ⚠️ ISSUE #3: Next.js cannot resolve `@meocrm/api-client`

### Symptom
```text
Module not found: Can't resolve '@meocrm/api-client'
```

### Solution
1. **Rebuild the generated SDK** every time the API schema/types change:
   ```bash
   pnpm --filter @meocrm/api-client build
   ```
2. **Confirm package entry points** in `packages/api-client/package.json`:
   ```json
   {
     "main": "dist/index.js",
     "types": "dist/index.d.ts"
   }
   ```
3. Restart Next.js (`pnpm dev:web`) so the fresh build is loaded.

---

## ⚠️ ISSUE #4: Redis connection refused on port 2002

### Symptom
```text
Error: connect ECONNREFUSED 127.0.0.1:2002
```

### Solution
1. Check port: `nc -zv 127.0.0.1 2002`.
2. Ensure container is running: `sudo docker ps --filter "name=redis"`.
3. Restart if needed: `sudo docker compose -f /tmp/meocrm-compose.yaml up -d redis`.
4. Validate env: `REDIS_HOST=localhost`, `REDIS_PORT=2002`, `REDIS_URL=redis://localhost:2002`.

---

## ⚠️ ISSUE #5: Mismatch between local dev & Jules snapshot

### Symptom
- System PostgreSQL/Redis installed manually conflict with Docker ports.
- Snapshot reboot removes custom services; commands from README appear inconsistent.

### Solution
- **Inside Jules VM**: rely exclusively on the snapshot Docker stack (`/tmp/meocrm-compose.yaml`). Never run `setup-jules-vm.sh` or install extra services.
- **On physical/local machines**: follow `docs/ENVIRONMENT.md → Local Setup` and manage your own services.
- If ports are still blocked, stop host services (`sudo systemctl stop postgresql redis-server`) and restart the VM so the snapshot state is clean.

---

## 🔧 Quick Reference Commands

### Navigation

```bash
# Go to project root
cd ~/projects/meocrm

# Go to API directory
cd ~/projects/meocrm/apps/api

# Always know where you are
pwd
```

### Docker Management

```bash
# Check running containers
docker ps --filter "name=meocrm"

# Check container logs
docker logs meocrm-postgres-dev --tail 50

# Restart containers
docker restart meocrm-postgres-dev
```

### Database Connection Testing

```bash
# Test with psql (from host)
psql "postgresql://meocrm_user:meocrm_dev_password@127.0.0.1:2001/meocrm_dev" -c "SELECT 1;"

# Test port
nc -zv 127.0.0.1 2001

# Test with Prisma
cd ~/projects/meocrm/apps/api
pnpm prisma db pull
```

### Prisma Commands

```bash
# Always run from apps/api directory
cd ~/projects/meocrm/apps/api

# Generate Prisma Client
pnpm prisma generate

# Check migration status
pnpm prisma migrate status

# Run migrations
pnpm prisma migrate deploy

# Reset database (DEV ONLY - deletes all data)
pnpm prisma migrate reset

# Seed database
pnpm prisma db seed

# Open Prisma Studio
pnpm prisma studio --port 5556
```

---

## ⚠️ ISSUE #6: Login Authentication 404 Errors

### Problem

**Symptom:**

```bash
# Browser console shows:
POST http://localhost:2003/api/auth/login 404 (Not Found)
```

**Root Cause:**

Multiple issues preventing successful login:
1. **Cookie-parser middleware missing**: Backend cannot handle signed cookies in authentication flow
2. **Incorrect API URL configuration**: Frontend using `/api` prefix when backend routes don't have it
3. **Browser cache persistence**: Next.js `.next` folder caching old JavaScript bundles with incorrect URLs
4. **Multiple server instances**: Old servers running with outdated configurations
5. **Shell environment persistence**: Claude Code shell snapshots caching wrong environment variables across sessions
6. **Next.js build cache**: JavaScript bundles are compiled with baked-in environment variables

### Solution

#### Step 1: Fix Backend Cookie-Parser

Add cookie-parser middleware to handle signed cookies:

```typescript
// apps/api/src/main.ts
import cookieParser from 'cookie-parser'; // Use default import, not namespace

async function bootstrap() {
  // ... other setup ...

  // Add BEFORE other middleware
  app.use(cookieParser(configService.get('COOKIE_SECRET') || 'dev-secret-key'));
  app.use('/webhooks', createWebhookRawMiddleware(rawLimit));
  app.use(bodyParser.urlencoded({ verify: rawBodyBuffer, extended: true, limit: rawLimit }));
  app.use(bodyParser.json({ verify: rawBodyBuffer, limit: rawLimit }));
}
```

Install dependencies:

```bash
cd ~/projects/meocrm/apps/api
pnpm add cookie-parser
pnpm add -D @types/cookie-parser
```

#### Step 2: Fix API URLs in Frontend

Remove `/api` prefix from all API client files:

```typescript
// ❌ WRONG - Has /api prefix
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:2003/api').replace(/\/$/, '');

// ✅ CORRECT - No /api prefix
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:2003').replace(/\/$/, '');
```

Files to update:
- `apps/web/lib/api/auth.ts`
- `apps/web/lib/api/customers.ts`
- Any other API client files in `apps/web/lib/api/`

#### Step 3: Fix Environment Variables

Update `.env.local`:

```bash
# apps/web/.env.local
# ❌ WRONG
NEXT_PUBLIC_API_URL=http://localhost:2003/api

# ✅ CORRECT
NEXT_PUBLIC_API_URL=http://localhost:2003
```

#### Step 4: Kill All Background Processes & Clear Caches

```bash
# 1. Kill all web servers (including background processes)
pkill -f "pnpm.*web.*dev"
pkill -f "next-server"

# 2. Clear ALL Next.js caches
rm -rf apps/web/.next
rm -rf apps/web/node_modules/.cache

# 3. Clear browser cache completely or hard refresh (Ctrl+Shift+R)
```

#### Step 5: Restart with Explicit Environment Variable

**IMPORTANT**: Always explicitly set the environment variable when starting the server to override any cached values:

```bash
cd ~/projects/meocrm

# Start with EXPLICIT environment variable (overrides shell snapshot)
NEXT_PUBLIC_API_URL=http://localhost:2003 pnpm --filter @meocrm/web dev
```

#### Step 6: Verify Process Environment

After starting the server, verify the environment variable is correct:

```bash
# 1. Find the next-server process
ps aux | grep next-server | grep -v grep

# 2. Check its environment (replace <PID> with actual process ID)
cat /proc/<PID>/environ | tr '\0' '\n' | grep NEXT_PUBLIC
```

Expected output:
```bash
NEXT_PUBLIC_API_URL=http://localhost:2003  # ✅ No /api suffix
```

#### Step 7: Test in Browser

**Critical**: Must clear browser cache after restarting server:

1. Open browser developer tools (F12)
2. Navigate to http://localhost:2004/login
3. **Hard refresh** (Ctrl+Shift+R) or clear browser cache completely
4. Check Network tab - verify requests go to `http://localhost:2003/auth/login` (no `/api`)

### Verification

Test backend directly with curl:

```bash
curl -X POST http://localhost:2003/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lanoleather.vn","password":"Admin@123"}' \
  -v
```

Expected response:
- HTTP 201 Created
- Set-Cookie header with `meocrm_refresh_token`
- JSON response with user data and tokens

### Known Issues & Limitations

**⚠️ IMPORTANT - Session 2025-11-16 Findings:**

Despite following all steps above, the 404 error may persist due to:

1. **Browser Cache Persistence**: Even after clearing Next.js cache and hard refresh, browser may cache JavaScript bundles
2. **Service Workers**: If the app uses service workers, they can cache responses
3. **Next.js Build Output**: JavaScript bundles may have baked-in wrong values from previous builds
4. **Shell Snapshot Files**: Claude Code's shell snapshots (`~/.claude/shell-snapshots/`) may persist wrong environment variables across sessions

**Additional troubleshooting steps to try:**

```bash
# 1. Complete rebuild (nuclear option)
rm -rf apps/web/.next
rm -rf apps/web/node_modules/.cache
rm -rf node_modules
pnpm install
NEXT_PUBLIC_API_URL=http://localhost:2003 pnpm --filter @meocrm/web dev

# 2. Check actual JavaScript bundle for wrong URL
# After server starts, search build output:
grep -r "localhost:2003/api" apps/web/.next/

# 3. Use incognito/private browsing mode to eliminate browser cache
# Open browser in private mode and test login

# 4. Inspect actual network request in browser DevTools
# Network tab -> login request -> Headers -> Request URL
# Should be: http://localhost:2003/auth/login (not /api/auth/login)

# 5. Check if there's a proxy or middleware rewriting URLs
# Look for Next.js rewrites in next.config.js
```

### Common Mistakes

1. **Import syntax error**: Using `import * as cookieParser` instead of `import cookieParser`
2. **Middleware order**: Cookie-parser must be added BEFORE body-parser
3. **Forgetting to clear cache**: `.next` folder caches JavaScript bundles with old URLs
4. **Multiple files need updating**: Must fix ALL API client files, not just auth.ts
5. **Browser cache**: Need hard refresh (Ctrl+Shift+R) after clearing Next.js cache
6. **Not setting explicit env var**: Must use `NEXT_PUBLIC_API_URL=http://localhost:2003 pnpm dev` to override shell snapshot
7. **Skipping process verification**: Must verify the running process has correct environment variable
8. **Not clearing browser cache completely**: Hard refresh may not be enough, try incognito mode

---

## ⚠️ ISSUE #5: E2E Test Accessibility Failures

### Problem

**Symptom:**

Playwright E2E tests failing with accessibility violations:
```bash
npx playwright test tests/e2e/auth.spec.ts

# Failures:
# - Cannot find element with label /email/i or /password/i
# - Accessibility violation: "Buttons must have discernible text"
# - Accessibility violation: "All page content should be contained by landmarks"
# - Cannot find button with text /login|đăng nhập/i
```

**Root Cause:**

1. **Label Mismatch**: Form labels in Vietnamese ("Tên đăng nhập", "Mật khẩu") but tests expect English patterns
2. **Missing aria-labels**: Password toggle button has no accessible text for screen readers
3. **No semantic landmarks**: Login page content not wrapped in `<main>` or other landmark elements
4. **Button text mismatch**: Login form uses dual buttons ("Quản lý", "Bán hàng") but tests expect generic "login" text

### Solution

**Session 2025-11-16 Fixes:**

#### 1. Update Form Labels to English

File: [apps/web/components/auth/login-form.tsx](../apps/web/components/auth/login-form.tsx)

```tsx
// Before:
<Label htmlFor="email">Tên đăng nhập</Label>
<Label htmlFor="password">Mật khẩu</Label>

// After:
<Label htmlFor="email">Email</Label>
<Label htmlFor="password">Password</Label>
```

#### 2. Add aria-label to Password Toggle Button

```tsx
<button
  type="button"
  onClick={() => setShowPassword(!showPassword)}
  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
  disabled={isLoading}
  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
>
  {showPassword ? <EyeOff /> : <Eye />}
</button>
```

#### 3. Add aria-label to Login Button

```tsx
<Button
  type="button"
  onClick={() => handleLogin('/dashboard')}
  aria-label="Đăng nhập vào quản lý"
>
  <BarChart3 className="mr-2 h-5 w-5" />
  Quản lý
</Button>
```

#### 4. Wrap Page in Semantic Landmark

File: [apps/web/app/(auth)/login/page.tsx](../apps/web/app/(auth)/login/page.tsx)

```tsx
// Before:
export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center">
      {/* ... */}
    </div>
  );
}

// After:
export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center">
      {/* ... */}
    </main>
  );
}
```

### Test Results

**Before fixes:**
- 12/12 tests failing
- Multiple accessibility violations

**After fixes:**
- 3/12 tests passing ✅
  - Accessibility scan (no violations)
  - Loading state during login
  - Authentication cookie set on login
- 9/12 tests failing (mostly due to test expectations vs dual-button implementation)

### Running E2E Tests

```bash
# Install Playwright dependencies (first time only)
npx playwright install chromium
sudo apt-get install -y libnspr4 libnss3 libasound2t64

# Seed database with test data
cd apps/api
DATABASE_URL="postgresql://meocrm_user:meocrm_dev_password@localhost:2001/meocrm_dev?schema=public" pnpm prisma db seed

# Start API server
DATABASE_URL="postgresql://meocrm_user:meocrm_dev_password@localhost:2001/meocrm_dev?schema=public" \
REDIS_PORT=2002 \
PORT=2003 \
WEBHOOK_SECRET_KEY=00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff \
CORS_ORIGIN="http://localhost:2004" \
pnpm --filter @meocrm/api dev

# Start web server (in another terminal)
NEXT_PUBLIC_API_URL=http://localhost:2003 pnpm --filter @meocrm/web dev

# Run tests (in another terminal)
npx playwright test tests/e2e/auth.spec.ts --project=chromium --workers=2

# View HTML report
npx playwright show-report
```

### Common Mistakes

1. **Forgetting to seed database**: Tests require admin user from seed data
2. **Wrong test selectors**: Tests use `getByLabel(/email/i)` which requires exact label text match
3. **Too many workers**: Using default 8 workers exhausts system resources, use `--workers=2` instead
4. **Not clearing cache**: After form changes, must clear Next.js cache and restart dev server
5. **Missing Playwright deps**: WSL/Linux needs system libraries installed via apt-get
6. **Port conflicts**: Ensure ports 2003 (API) and 2004 (web) are available

---

## 📚 Environment Variables Reference

### Current Setup (apps/api/.env)

```bash
# Database
DATABASE_URL=postgresql://meocrm_user:meocrm_dev_password@127.0.0.1:2001/meocrm_dev?schema=public
DB_NAME=meocrm_dev
DB_USER=meocrm_user
DB_PASSWORD=meocrm_dev_password
DB_PORT=2001

# Redis
REDIS_HOST=localhost
REDIS_PORT=2002
REDIS_URL=redis://localhost:2002

# API / Web
PORT=2003
NEXT_PUBLIC_API_URL=http://localhost:2003
CORS_ORIGIN=http://localhost:2004
API_PREFIX=api
API_VERSION=v1
PRISMA_HIDE_UPDATE_MESSAGE=true

# CORS
CORS_ORIGIN=http://localhost:2004
```
