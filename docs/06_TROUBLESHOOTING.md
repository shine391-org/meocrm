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

**Step 1: Use the Diagnostic Script**

A diagnostic script is available at `scripts/diagnose-db.sh` to automatically check for common connection issues.

```bash
./scripts/diagnose-db.sh
```

**Step 2: Fix .env (Most Common Fix)**

Update your `apps/api/.env` to use `127.0.0.1` instead of `localhost`.

```bash
# .env
DATABASE_URL="postgresql://meocrm_user:meocrm_dev_password@127.0.0.1:2001/meocrm_dev?schema=public"
```

**Step 3: Restart snapshot containers (if needed)**

```bash
sudo docker ps --filter "name=db"
sudo docker compose -f /tmp/meocrm-compose.yaml up -d db
```

**Step 4: Verify Fix**

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
```
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
```
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

# Auth
JWT_SECRET=dev-secret-jules-vm
JWT_REFRESH_SECRET=dev-refresh-secret-jules-vm
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```
