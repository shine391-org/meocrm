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

## ⚠️ ISSUE #2: Docker Network & Connection

### Problem

**Symptom:**

```
PrismaClientInitializationError
Cannot connect to PostgreSQL at localhost:2001
```

**Context:**

- Docker containers are running and healthy ✅
- DATABASE_URL in .env looks correct ✅
- But Prisma/psql cannot connect ❌

### Root Causes

1.  **`localhost` vs `127.0.0.1`**: `localhost` might not resolve correctly. Using `127.0.0.1` forces an IPv4 TCP connection.
2.  **Firewall/Port blocking**: The port might be blocked by `ufw` or other firewalls.
3.  **Unix Socket vs TCP**: `psql` can sometimes default to using a Unix socket when the host is `localhost`.

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

**Step 3: Verify Fix**

```bash
# Test connection
psql "postgresql://meocrm_user:meocrm_dev_password@127.0.0.1:2001/meocrm_dev" -c "SELECT 1;"

# Test Prisma
cd ~/projects/meocrm/apps/api
pnpm prisma db pull
```

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
DATABASE_URL="postgresql://meocrm_user:meocrm_dev_password@127.0.0.1:2001/meocrm_dev?schema=public"

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=2002

# JWT
JWT_SECRET=jules-vm-secret-key
JWT_EXPIRES_IN=7d

# API Server
PORT=2003
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:2004
```
