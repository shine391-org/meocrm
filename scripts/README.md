# Development Scripts

Collection of helper scripts for MeoCRM development workflow.

## Available Scripts

### 🔄 dev-reset.sh

Resets the development environment by killing servers and clearing caches.

**Usage:**
```bash
./scripts/dev-reset.sh
# or
pnpm dev:reset
```

**What it does:**
- Kills all pnpm dev servers
- Frees up ports 2003 and 2004
- Clears Next.js cache (`.next` folder)
- Clears node_modules cache
- Clears Prisma cache
- Clears TypeScript build cache
- Clears dist folders

### 🚀 dev-start.sh

Starts development servers with proper environment variables.

**Usage:**
```bash
./scripts/dev-start.sh
# or
pnpm dev:start
```

**What it does:**
- Checks and starts Docker containers
- Starts API server on port 2003
- Starts Web server on port 2004
- Displays server URLs and PIDs

### 📦 db-export.sh

Exports the current database to a snapshot file.

**Usage:**
```bash
./scripts/db-export.sh
# or
pnpm db:export
```

**What it does:**
- Exports database to `scripts/fixtures/db_snapshot_YYYYMMDD_HHMMSS.sql`
- Creates a symlink to latest export: `db_snapshot_latest.sql`
- Shows file size and restoration instructions

### 📥 db-import.sh

Imports a database snapshot.

**Usage:**
```bash
./scripts/db-import.sh [snapshot_file]
# or
pnpm db:import

# Import specific snapshot:
./scripts/db-import.sh scripts/fixtures/db_snapshot_20250116_120000.sql
```

**What it does:**
- Imports database from snapshot file
- Defaults to latest snapshot if no file specified
- Shows confirmation prompt before replacing data
- Provides next steps after import

## Common Workflows

### Starting Fresh

When you encounter issues with cached files or multiple server instances:

```bash
# 1. Reset environment
pnpm dev:reset

# 2. Start servers
pnpm dev:start
```

### Testing with Clean Database

```bash
# 1. Export current database (backup)
pnpm db:export

# 2. Reset database to known state
pnpm prisma migrate reset --skip-seed

# 3. Seed with test data
pnpm db:seed

# 4. Run tests
pnpm test:playwright
```

### Restoring Database

```bash
# Restore to latest snapshot
pnpm db:import

# Regenerate Prisma client
pnpm db:generate

# Restart API server
pnpm dev:api
```

## E2E Testing with Playwright

The project includes Playwright for end-to-end testing.

### Running Tests

```bash
# Run all tests (headless)
pnpm test:playwright

# Run with browser visible
pnpm test:playwright:headed

# Run with UI mode (interactive)
pnpm test:e2e:ui
```

### Test Files

- `tests/e2e/auth.spec.ts` - Authentication flow tests
  - Login page display
  - Form validation
  - Invalid credentials
  - Successful login
  - Session persistence
  - Logout
  - Protected route access
  - Accessibility testing
  - Keyboard navigation
  - Loading states
  - Network error handling
  - Cookie verification

## Notes

- All scripts require execution permissions (`chmod +x`)
- Scripts use colors for better readability
- Database scripts prompt for confirmation before destructive operations
- Export snapshots are timestamped for easy tracking
- Docker containers must be running for database operations
