# MeoCRM v4.0

> Multi-tenant CRM inspired by KiotViet, optimized for 10-50 concurrent users per organization.

## Table of Contents
1. Project Snapshot
2. Why MeoCRM
3. Badges & Metrics
4. Quick Facts
   Jules VM Snapshot Environment (Recommended Setup)
5. Version & Change Log
6. Getting Started Checklist
7. Environment Verification
8. Toolchain Auto-Setup
9. Installation & Bootstrap
10. Quick Start Workflow
11. Project Structure
12. Documentation Map
13. Tech Stack Overview
14. Multi-Tenant Security Highlights
15. Architecture Primer
16. Request Lifecycle (Step-by-Step)
17. Database Schema Overview
18. Product & Inventory Domain
19. CRM & Customer Intelligence
20. Orders, Payments & Shipping
21. Inventory & Transfer Workflows
22. Frontend Experience
23. Backend Modules
24. Testing Strategy & Coverage
25. DevOps & Automation
26. Environment Configuration
27. Available Commands
28. Operational Playbooks
29. Troubleshooting Matrix
30. Implementation Status
31. Roadmap (Phase-by-Phase)
32. Lessons Learned Snapshot
33. Contribution Guidelines
34. Commit & Branching Standards
35. FAQ
36. Glossary
37. Support & Contact
38. Appendix A: Ports
39. Appendix B: Sample Env File
40. Appendix C: ASCII Architecture Diagram

---

## 1. Project Snapshot
- **Name**: MeoCRM v4.0
- **Focus**: Vietnamese retail CRM with SKU-heavy catalogs and shipping integrations.
- **Audience**: Organizations running 10-50 concurrent users per tenant.
- **Architecture**: Monorepo (NestJS API + Next.js Web) with multi-tenant enforcement.
- **Progress**: 91/187 tasks complete (49%) - See [ROADMAP.md](./ROADMAP.md)

### 📚 Documentation Guide

**For Claude/AI Agents:**
- **Start here:** [docs/00_START_HERE.md](docs/00_START_HERE.md) - Fast context loading guide
- **Every session:** Read [WORKFLOW-SIMPLE.md](WORKFLOW-SIMPLE.md) + [ROADMAP.md](ROADMAP.md)
- **Operations manual:** [AGENTS.md](AGENTS.md) - Complete workflow & coding rules
- **Coding rules:** [DEVELOPMENT_LESSONS_LEARNED.md](DEVELOPMENT_LESSONS_LEARNED.md) - 10 essential lessons

**For Humans:**
- **Quick start:** This README → Setup → Run
- **Business logic:** [docs/essential/01_BUSINESS_LOGIC.md](docs/essential/01_BUSINESS_LOGIC.md)
- **Database schema:** [docs/essential/03_DATABASE_SCHEMA.md](docs/essential/03_DATABASE_SCHEMA.md)
- **API reference:** [docs/reference/04_API_REFERENCE.md](docs/reference/04_API_REFERENCE.md)
- **Troubleshooting:** [docs/reference/06_TROUBLESHOOTING.md](docs/reference/06_TROUBLESHOOTING.md)

## 2. Why MeoCRM
- Built after studying KiotViet patterns and retail workflows in Vietnam.
- Emphasizes **tenant isolation**, **inventory accuracy**, and **COD tracking**.
- Designed to keep GitHub as the Single Source of Truth for code + docs.

## 3. Badges & Metrics (textual)
- `Coverage: 85.25% statements / 88.73% lines`
- `TypeScript: v5 (strict)`
- `Prisma ORM: v5`
- `Node.js: 18+`
- `pnpm workspace`

## 4. Quick Facts
- **Multi-Tenant Security**: RequestContext + Prisma middleware.
- **Soft Delete**: `deletedAt` enforced globally.
- **Token Strategy**: 15 min access token + 7 day refresh.
- **Ports**: API 2003, Web 2004, PostgreSQL 2001, Redis 2002 (dev).
- **Toolchain**: Node.js 20.x + pnpm 10.x + Docker 27 (bundled in Jules snapshot).

## Jules VM Snapshot Environment (Recommended Setup)
This is the default workflow for Codex/Jules agents. The VM boot image already includes Dockerized infra, dependencies, and env values so you can ship features without re-provisioning anything.

### Snapshot Overview
- **Postgres 17** + **Redis 8** run inside Docker on ports **2001** and **2002**. The compose file lives in `/tmp/meocrm-compose.yaml` and is restored on every snapshot boot.
- **Node 20** and **pnpm 10** are globally available; no need to install nvm or npm.
- `@meocrm/api-client` is **prebuilt** once per snapshot. Re-run the build command when TypeScript types change to avoid Next.js resolution errors.
- All sensitive **env vars are injected via the Jules GUI**. Do not commit `.env` files; just confirm the GUI profile is active for your VM session.

### Daily Dev Loop (inside Jules VM)
1. `pnpm install`
2. `pnpm --filter @meocrm/api-client build` (ensures Next.js picks up generated client)
3. `pnpm dev:api` (NestJS API on port 2003)
4. `pnpm dev:web` (Next.js app on port 2004) — safe to run in parallel tab

> 💡 **Check infra first**: `sudo docker ps` should show `meocrm-postgres` and `meocrm-redis`. If missing, run `sudo docker compose -f /tmp/meocrm-compose.yaml up -d db redis`.

### Canonical Jules VM Env Values
These are managed in the Jules GUI → Environment tab and must match for parity:

```bash
DATABASE_URL=postgresql://meocrm_user:<YOUR_SECURE_DB_PASSWORD>@127.0.0.1:2001/meocrm_dev?schema=public
DB_NAME=meocrm_dev
DB_USER=meocrm_user
DB_PASSWORD=<YOUR_SECURE_DB_PASSWORD>
DB_PORT=2001

REDIS_HOST=localhost
REDIS_PORT=2002
REDIS_URL=redis://localhost:2002

PORT=2003
NEXT_PUBLIC_API_URL=http://localhost:2003
CORS_ORIGIN=http://localhost:2004

JWT_SECRET=<YOUR_SECURE_JWT_SECRET>
JWT_REFRESH_SECRET=<YOUR_SECURE_JWT_REFRESH_SECRET>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

API_PREFIX=api
API_VERSION=v1
PRISMA_HIDE_UPDATE_MESSAGE=true
```

> ⚠️ **Security Warning**: The placeholders above must be replaced with cryptographically secure values. Generate secrets using:
> ```bash
> # Generate a secure JWT secret (32+ characters)
> openssl rand -base64 32
>
> # Or use Node.js
> node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
> ```
> **NEVER commit real secrets to version control!**

> ❗ **Do NOT run `setup-jules-vm.sh`, install PostgreSQL/Redis manually, or change Docker networking inside Jules VM.** The snapshot is already configured; manual installs break parity. Use the legacy local instructions below only if you are on your own workstation outside Jules.

## 5. Version & Change Log
| Version | Date | Notes |
| --- | --- | --- |
| v4.0 | 2025-11-08 | Security hardening, docs sync, ≥85% coverage |
| v3.x | 2025-09 | Added suppliers & shipping partners |
| v2.x | 2025-06 | Introduced CRM segments & debt tracking |
| v1.x | 2025-03 | Core auth + organization scaffolding |

## 6. Getting Started Checklist
- [ ] Confirm Node.js 20.x and pnpm 10.x (`node -v`, `pnpm -v`). Jules snapshot already satisfies this.
- [ ] Verify Postgres/Redis are running: `sudo docker ps` → look for `db` + `redis` containers (Jules) or start your own services if on a personal machine.
- [ ] Install workspace dependencies with `pnpm install`.
- [ ] Configure env via Jules GUI profile (or Appendix B template for local machines). Never run `setup-jules-vm.sh` inside the VM.
- [ ] Prebuild the API client with `pnpm --filter @meocrm/api-client build`.
- [ ] Run `pnpm db:generate`, `pnpm db:push`, `pnpm db:seed`.
- [ ] Start dev servers via `pnpm dev` (or split into `pnpm dev:api` / `pnpm dev:web`).

## 7. Environment Verification
```bash
node -v                                   # Expect v20.x (Jules snapshot ships 20 LTS)
pnpm -v                                   # Expect v10.x (workspace uses pnpm@10)
sudo docker ps --filter "name=meocrm"     # Containers db + redis should be healthy
sudo docker compose -f /tmp/meocrm-compose.yaml up -d db redis  # Restart infra if needed
psql "postgresql://meocrm_user:meocrm_dev_password@127.0.0.1:2001/meocrm_dev" -c "SELECT 1;"
```

## 8. Toolchain Auto-Setup
```bash
echo "🔧 Checking required development tools..."
command -v nest >/dev/null || npm install -g @nestjs/cli
command -v prisma >/dev/null || npm install -g prisma
command -v tsc >/dev/null || npm install -g typescript
command -v pnpm >/dev/null || npm install -g pnpm
command -v jest >/dev/null || npm install -g jest
command -v eslint >/dev/null || npm install -g eslint
command -v prettier >/dev/null || npm install -g prettier
command -v concurrently >/dev/null || npm install -g concurrently
command -v nodemon >/dev/null || npm install -g nodemon
command -v supertest >/dev/null || npm install -g supertest
command -v create-next-app >/dev/null || npm install -g create-next-app
npm install -g @types/jest @types/supertest 2>/dev/null || true
echo "✅ All required tools available"
```

## 9. Installation & Bootstrap
```bash
pnpm install            # Install dependencies (monorepo aware)
pnpm docker:dev         # Start PostgreSQL + Redis (containers only if needed)
pnpm db:generate        # Generate Prisma client
pnpm db:push            # Sync schema
pnpm db:seed            # Seed development data
```
> 🔔 Jules VM snapshot already runs PostgreSQL + Redis inside Docker. Do **not** install system services or rerun `setup-jules-vm.sh`; restart the provided containers if they stop.

## 10. Quick Start Workflow
```bash
pnpm dev        # Run API (2003) + Web (2004)
pnpm dev:api    # Run NestJS API only
pnpm dev:web    # Run Next.js web only
pnpm build      # Build API + Web
pnpm test       # Run unit + integration tests
pnpm test:e2e   # Run Playwright/HTTP e2e suites
pnpm lint       # ESLint across packages
pnpm db:studio  # Open Prisma Studio (GUI)
```

## 11. Project Structure
```
apps/
  api/
    src/
      auth/
      common/context/
      prisma/
      products/
      customers/
      orders/
      inventory/
      shipping/
  web/
    app/(auth)/
    app/(dashboard)/
        products/
        customers/
        pos/
        reports/
docs/
  AGENTS.md
  architecture/README.md
  LESSONS_LEARNED.md
  IMPLEMENTATION_STATUS.md
  technical/
```

## 12. Documentation Map
| File | Purpose |
| --- | --- |
| `README.md` | Quick start + project overview |
| `AGENTS.md` | Agent ops manual & guardrails |
| `docs/architecture/README.md` | In-depth architecture & flows |
| `docs/01_BUSINESS_LOGIC.md` | Canonical business rules (Lead Priority, Commission, etc.) |
| `docs/LESSONS_LEARNED.md` | Team knowledge base (45+ lessons) |
| `docs/IMPLEMENTATION_STATUS.md` | Progress tracker & roadmap |
| `docs/technical/coding-standards.md` | Coding standards |
| `docs/ENVIRONMENT.md` | Environment variables & setup |
| `docs/TROUBLESHOOTING.md` | Common fixes |
| `apps/api/openapi.yaml` | OpenAPI for lead priority + commission endpoints |

## 13. Tech Stack Overview
### Backend
- NestJS 10
- Prisma ORM 5+
- PostgreSQL 15
- JWT Auth (15m access / 7d refresh)
- bcrypt hashing (10 rounds)
- class-validator for DTOs

### Frontend
- Next.js 14 (App Router)
- React 18
- Tailwind CSS + Shadcn components
- Zustand for client-side state
- TanStack Query for server state

### Testing
- Jest + Supertest for API
- Playwright for end-to-end web
- Coverage 85.25% statements (goal ≥80%)

### DevOps
- pnpm workspaces
- Docker (services)
- GitHub Actions pipelines
- ESLint + Prettier

## 14. Multi-Tenant Security Highlights
- RequestContext middleware captures `organizationId` once.
- Prisma middleware injects `organizationId` + `deletedAt: null` into every query.
- Controllers decorated with `@UseGuards(JwtAuthGuard)` by default.
- `@Public()` decorator opt-out for auth endpoints only.
- Soft delete ensures deleted entities never leak.
- E2E tests validate tenant isolation by creating two organizations per suite.

## 15. Architecture Primer
- Modular monolith with clear module boundaries.
- Multi-tenant enforcement lives in shared infrastructure, not feature code.
- Frontend communicates via REST (GraphQL optional later).
- Redis available for queues/cache when needed.

## 16. Request Lifecycle (Step-by-Step)
1. **Client** sends request with JWT.
2. **JWT Guard** validates token, attaches `{ userId, organizationId }`.
3. **RequestContext** stores `organizationId` and user details.
4. **Controller** retrieves `CurrentUser` decorator to pass org to service.
5. **Service** issues Prisma query without manual filtering.
6. **Prisma Middleware** augments query with `organizationId` + `deletedAt: null`.
7. **PostgreSQL** returns tenant-safe result set.
8. **Response** flows back to client.

## 17. Database Schema Overview
- 14 tenant-aware models: Organization, Branch, User, Product, ProductVariant, Category, Customer, CustomerGroup (embedded), Supplier, Order, OrderItem, ShippingOrder, Inventory, Transfer.
- 5 enums: `UserRole`, `OrderStatus`, `PaymentMethod`, `ShippingStatus`, `TransferStatus`.
- `organizationId` present on all tenant data.
- `deletedAt` used for soft delete.
- Monetary fields use `Decimal(12,2)`.
- Primary keys are UUIDs for distributed deployment.

## 18. Product & Inventory Domain Highlights
- SKU patterns like `VDNT09-D`, `VDNT09-xanhla` for variant colors.
- `Category` supports 3-level hierarchy (VÍ DA >> Ví thiết kế >> Ví ngắn).
- `Product` stores cost, sell price, min/max stock thresholds, variant arrays.
- `Inventory` ties products to branches with `quantity` and unique constraint.
- `Transfer` handles inter-branch stock flows with statuses (PENDING → IN_TRANSIT → RECEIVED).

## 19. CRM & Customer Intelligence
- Auto-generated codes (`KH000001`…).
- Tracks address details down to ward, enabling Vietnam-specific logistics.
- Segments (e.g., "Đang Giao Hàng", "Đã mua hàng").
- Debt tracking (`debt Decimal(12,2)`) and lifetime value metrics.
- Relations to `CustomerGroup` and `User` for createdBy metadata.

## 20. Orders, Payments & Shipping
- Multi-payment support: Cash, Card, E-wallet, Bank Transfer, COD.
- Status workflow: `PENDING → PROCESSING → COMPLETED/CANCELLED`.
- `ShippingOrder` integrates with 9+ partners (GHN, GHTK, AhaMove, VNPost, etc.).
- COD tracking fields (`codAmount`, `shippingFee`).
- `OrderItem` captures product snapshots per line item.

## 21. Inventory & Transfer Workflows
- Branch-level inventory ensures physical location accuracy.
- Transfers recorded with `fromBranchId`, `toBranchId`, timestamps, and statuses.
- Soft delete ensures historical visibility without data loss.

## 22. Frontend Experience
- Next.js App Router organizes `app/(auth)` and `app/(dashboard)` partitions.
- Tailwind CSS + Shadcn components maintain consistent UI.
- Zustand handles UI toggles; TanStack Query caches API responses.
- API client automatically attaches JWT; tenant scope enforced server-side.

## 23. Backend Modules
- `apps/api/src/auth`: JWT guards, refresh tokens, `@Public` decorator.
- `apps/api/src/common/context`: RequestContext service + middleware.
- `apps/api/src/prisma`: PrismaService with middleware for tenant + soft delete.
- `apps/api/src/products`, `/customers`, `/orders`, `/inventory`, `/shipping`: feature modules.
- DTOs validated with `class-validator`; tests co-located.

## 24. Testing Strategy & Coverage
- Unit tests for services and guards using Jest.
- Integration tests with Supertest hitting Nest application context.
- E2E tests create multiple organizations to validate isolation.
- Coverage config excludes `/node_modules/`, `/dist/`, `/prisma/` to focus on `/src`.
- Current coverage: 85.25% statements (goal ≥80%).

## 25. DevOps & Automation
- GitHub Actions pipeline ensures lint, build, tests.
- Scripts: `pnpm docker:dev`, `pnpm db:generate`, `pnpm db:push`.
- Backup schema script: `cp apps/api/prisma/schema.prisma apps/api/prisma/schema.prisma.backup.$(date +%Y%m%d)`.
- `*.backup` files ignored by Git.

## 26. Environment Configuration
```bash
# Database
DATABASE_URL="postgresql://meocrm_user:meocrm_dev_password@localhost:2001/meocrm_dev"
REDIS_URL="redis://localhost:2002"

# API
PORT=2003
API_URL="http://localhost:2003"
CORS_ORIGIN="http://localhost:2004"

# Frontend
WEB_PORT=2004
NEXT_PUBLIC_API_URL="http://localhost:2003"

# Auth
JWT_SECRET="your-jwt-secret-key"
JWT_REFRESH_SECRET="your-jwt-refresh-secret"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
```

> ⚠️ **Security Warning**: Replace all `<YOUR_SECURE_*>` placeholders with cryptographically secure random values. See Appendix B for generation commands.

## 27. Available Commands (pnpm)
| Command | Description |
| --- | --- |
| `pnpm install` | Install dependencies |
| `pnpm dev` | Run API + Web concurrently |
| `pnpm dev:api` | Run NestJS API only |
| `pnpm dev:web` | Run Next.js only |
| `pnpm build` | Build all packages |
| `pnpm test` | Run unit/integration tests |
| `pnpm test:e2e` | Run E2E suites |
| `pnpm lint` | Lint all workspaces |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Apply schema |
| `pnpm db:seed` | Seed data |
| `pnpm db:studio` | Open Prisma Studio |

## 28. Operational Playbooks
- **Pre-commit**: `pnpm lint && pnpm test`.
- **Schema Changes**: Update Prisma schema, run `pnpm db:generate`, `pnpm db:push`, document in README.
- **Deployment**: Use `prisma db push` for dev, `prisma migrate deploy` for staging/prod.
- **Incident Response**: Use RequestContext logs to trace tenant-specific events.

## 29. Troubleshooting Matrix
| Issue | Symptom | Fix |
| --- | --- | --- |
| Missing Prisma client | `Cannot find module @prisma/client` | Run `pnpm db:generate` |
| Port conflict 2003 | API fails to boot | Stop process on 2003 or adjust `.env` |
| Data leak suspicion | Cross-tenant data appears | Verify Prisma middleware registered + RequestContext storing org |
| Soft delete records visible | Deleted data still returned | Confirm `deletedAt: null` filter active |
| Tests show low coverage | Coverage <80% | Ensure Jest ignores generated folders |
| Docker DB conflict | `docker compose up` fails on Jules VM | Use snapshot stack: `sudo docker compose -f /tmp/meocrm-compose.yaml up -d db redis` |

### Jules VM Troubleshooting Guide

#### Check Docker Services Status
```bash
# List all running containers
sudo docker ps

# Expected output: meocrm-postgres and meocrm-redis should be running
# If missing, start them:
sudo docker compose -f /tmp/meocrm-compose.yaml up -d db redis

# View container logs
sudo docker logs meocrm-postgres
sudo docker logs meocrm-redis

# Restart a specific service
sudo docker restart meocrm-postgres
sudo docker restart meocrm-redis
```

#### Database Connection Issues
```bash
# Test PostgreSQL connection
psql "postgresql://meocrm_user:meocrm_dev_password@127.0.0.1:2001/meocrm_dev" -c "SELECT 1;"

# If connection fails, check if container is running
sudo docker ps --filter "name=meocrm-postgres"

# Check PostgreSQL logs for errors
sudo docker logs meocrm-postgres --tail 50

# Verify port binding
sudo netstat -tlnp | grep 2001
```

#### Redis Connection Issues
```bash
# Test Redis connection
redis-cli -h localhost -p 2002 ping
# Expected output: PONG

# If redis-cli not available, use docker exec
sudo docker exec -it meocrm-redis redis-cli ping

# Check Redis logs
sudo docker logs meocrm-redis --tail 50
```

#### Database Reset & Recovery
```bash
# Backup current database before reset
sudo docker exec meocrm-postgres pg_dump -U meocrm_user meocrm_dev > backup_$(date +%Y%m%d_%H%M%S).sql

# Option 1: Reset database schema (keeps container)
pnpm --filter @meocrm/api run prisma:db:push --force-reset
pnpm --filter @meocrm/api run db:seed

# Option 2: Full container reset (nuclear option)
sudo docker compose -f /tmp/meocrm-compose.yaml down -v
sudo docker compose -f /tmp/meocrm-compose.yaml up -d db redis
# Wait 10 seconds for DB to initialize
pnpm --filter @meocrm/api run prisma:db:push
pnpm --filter @meocrm/api run db:seed

# Restore from backup
cat backup_YYYYMMDD_HHMMSS.sql | sudo docker exec -i meocrm-postgres psql -U meocrm_user meocrm_dev
```

#### Verify Jules GUI Environment Profile
```bash
# Check if environment variables are loaded
echo $DATABASE_URL
echo $REDIS_HOST
echo $JWT_SECRET

# If empty, ensure Jules GUI Environment profile is active:
# 1. Open Jules GUI
# 2. Navigate to Environment tab
# 3. Verify "MeoCRM Dev" profile is selected and active
# 4. Restart your terminal/shell session
```

#### Prisma Client Generation Issues
```bash
# Clean and regenerate Prisma client
rm -rf node_modules/.prisma
rm -rf apps/api/node_modules/.prisma
pnpm --filter @meocrm/api run prisma:generate

# If schema changes aren't reflected
pnpm --filter @meocrm/api run prisma:db:push

# Verify generated client exists
ls -la node_modules/.prisma/client/
```

#### Port Conflicts
```bash
# Check what's running on API port 2003
sudo lsof -i :2003
# Or
sudo netstat -tlnp | grep 2003

# Kill process if needed
sudo kill -9 <PID>

# Check web port 2004
sudo lsof -i :2004

# Check database port 2001
sudo lsof -i :2001

# Check Redis port 2002
sudo lsof -i :2002
```

#### Common Jules VM Issues

**Issue: Docker containers not starting**
```bash
# Check Docker daemon status
sudo systemctl status docker

# Restart Docker daemon if needed
sudo systemctl restart docker

# Verify compose file exists
cat /tmp/meocrm-compose.yaml

# Start services with verbose logging
sudo docker compose -f /tmp/meocrm-compose.yaml up db redis
```

**Issue: API fails to connect to database**
- Verify DATABASE_URL matches the container configuration
- Ensure PostgreSQL container is healthy: `sudo docker ps`
- Check if Prisma client is generated: `pnpm db:generate`
- Verify schema is pushed: `pnpm db:push`

**Issue: Next.js can't find API client**
```bash
# Rebuild API client package
pnpm --filter @meocrm/api-client build

# Verify package.json exports
cat packages/api-client/package.json

# Clear Next.js cache
rm -rf apps/web/.next
pnpm --filter @meocrm/web run build
```

**Issue: Tests fail with database errors**
- Ensure TEST_DATABASE_URL is set in environment or .env.test
- Run: `pnpm --filter @meocrm/api run prisma:generate`
- Verify test database is accessible

**Issue: Environment variables not loading**
- Jules GUI profile must be active (check GUI Environment tab)
- Restart terminal after changing environment profiles
- For local development outside Jules, use .env files (never commit them)

## 30. Implementation Status

**Last Updated:** 2025-11-16
**Current Progress:** 56/187 tasks (30%) | 150/400 story points (38%)

### Quick Stats:
- ✅ **Completed:** 56 tasks (30%)
- 🔄 **In Progress:** 40 tasks (21%)
- 📋 **Pending:** 91 tasks (49%)
- 🎯 **Test Coverage:** 85.25% (Target: ≥80%)
- ✅ **Tests Passing:** 281 tests
- ⚠️ **Tests Failing:** 28 tests (response format issues)

### Module Status:
- ✅ **Infrastructure:** 78% complete (32/41 tasks)
- ✅ **Authentication:** 53% complete (8/15 tasks)
- ✅ **Security:** Multi-tenant + Soft Delete ✅
- 🔄 **Products:** 15% complete (5/33 tasks) - In Progress
- 🔄 **Customers:** 21% complete (3/14 tasks) - In Progress
- 🔄 **Suppliers:** 33% complete (2/6 tasks) - In Progress
- 📋 **Orders:** 0% complete - Planned
- 📋 **POS:** 0% complete - Planned
- 📋 **Finance:** 0% complete - Planned

**Detailed Progress:** See [ROADMAP.md](./ROADMAP.md) for complete task breakdown and timeline.

## 31. Roadmap (Phase-by-Phase)

For detailed roadmap with all 187 tasks, dependencies, and timeline, see **[ROADMAP.md](./ROADMAP.md)**.

### Phase Summary:

| Phase | Focus | Progress | Tasks | Status |
| --- | --- | --- | --- | --- |
| **Phase 1** | Foundation & Auth | 78% | 56 tasks | ✅ Mostly Complete |
| **Phase 2** | Products & Inventory | 15% | 49 tasks | 🔄 In Progress |
| **Phase 3** | CRM Core | 25% | 20 tasks | 🔄 In Progress |
| **Phase 4** | POS & Orders | 0% | 34 tasks | 📋 Blocked on Phase 2 |
| **Phase 5** | Finance | 0% | 16 tasks | 📋 Planned |
| **Phase 6** | Reports | 0% | 3 tasks | 📋 Planned |
| **Phase 7** | Integrations | 5% | 20 tasks | 📋 Partial |
| **Phase 8** | Testing & QA | 20% | 10 tasks | 🔄 Ongoing |

### Critical Path (Currently Blocking):
1. 🔴 **Frontend Auth (Batch 1C)** - 7 tasks - Waiting on design screenshots
2. 🔴 **Products CRUD (Batch 2A)** - 10 tasks - In Progress (Jules)
3. 🔴 **Categories (Batch 2B)** - 4 tasks - In Progress (Jules)
4. 🔴 **Product Variants (Batch 2C)** - 4 tasks - In Progress (Jules)

### Timeline Estimate:
- **Phase 2 Complete:** 1 week (Products + Inventory)
- **Phase 3 Complete:** 1.5 weeks (CRM modules)
- **Phase 4 Complete:** 2 weeks (Orders + POS)
- **Phase 5 Complete:** 2.5 weeks (Finance)
- **v4.0 Release:** 3-4 weeks (All features functional)

**📊 For complete breakdown:** [ROADMAP.md](./ROADMAP.md)

## 32. Lessons Learned Snapshot
- Multi-tenant security belongs at ORM level.
- Soft delete enforcement must be systemic.
- Verify environment (service vs Docker) before running commands.
- Understand downstream dependencies before implementing modules.
- Commit early & often; emergency commit `c2957da` saved Task A.
- Coverage must target real code, not generated assets.
- Tests must create multiple tenants to verify isolation.

## 33. Contribution Guidelines
1. **Branch Naming**: `feature/<module>-<feature>`, `fix/<module>-<bug>`, `docs/<topic>`.
2. **Commit Format**: `type(scope): description` (e.g., `feat(products): add variants`).
3. **Pre-PR Checklist**:
   - `pnpm test`
   - `pnpm lint`
   - `pnpm build`
   - Update docs (README, architecture, lessons) if behavior changes.
4. **Security**: Never bypass RequestContext or Prisma middleware; tests must cover tenant isolation.

## 34. Commit & Branching Standards
- Feature branches off `dev`.
- Rebase or merge latest `dev` before PR.
- Provide self-review summary referencing relevant docs.
- Tag commits with scope: `feat`, `fix`, `docs`, `test`, `chore`.

## 35. FAQ
- **Q: Why not rely solely on controller filters?**
  - A: Middleware-level enforcement prevents human error.
- **Q: Can Redis be skipped locally?**
  - A: Yes if feature unused, but recommended for parity.
- **Q: How to reset database?**
  - A: Drop schema, rerun `pnpm db:push` + `pnpm db:seed`.
- **Q: Where is API documentation?**
  - A: Swagger available at `http://localhost:2003/api` when API is running.
- **Q: How often to commit?**
  - A: Every 30-45 minutes; avoid large uncommitted batches.

## 36. Glossary
- **Tenant**: Organization using MeoCRM.
- **Branch**: Physical storefront linked to an organization.
- **SKU**: Stock Keeping Unit (e.g., `VDNT09`).
- **Soft Delete**: Marking with `deletedAt` for recoverability.
- **RequestContext**: Async storage containing per-request metadata.
- **ORM Enforcement**: Automatic query rewriting in Prisma.
- **COD**: Cash on Delivery (common in VN retail).

## 37. Support & Contact
- **Docs**: `docs/` directory in repo.
- **Issues**: Use GitHub Issues for bugs/enhancements.
- **Knowledge Base**: `docs/LESSONS_LEARNED.md` and AGENTS instructions.

## 38. Appendix A: Ports
| Service | Dev | Staging | Prod |
| --- | --- | --- | --- |
| API | 2003 | 3001 | 3002 |
| Web | 2004 | 3101 | 3102 |
| PostgreSQL | 2001 | 5432 | 5432 |
| Redis | 2002 | 6379 | 6379 |
| Swagger | Served at `/api` on API port | Served at `/api` | Served at `/api` |
| Adminer | 2006 | 3106 | 3107 |
| MailHog | 2007 | 3107 | 3108 |

## 39. Appendix B: Sample `.env`
```bash
DATABASE_URL="postgresql://meocrm_user:meocrm_dev_password@localhost:2001/meocrm_dev"
REDIS_URL="redis://localhost:2002"
PORT=2003
API_URL="http://localhost:2003"
CORS_ORIGIN="http://localhost:2004"
WEB_PORT=2004
NEXT_PUBLIC_API_URL="http://localhost:2003"
JWT_SECRET="super-secret"
JWT_REFRESH_SECRET="dev-refresh-secret"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
```

> ⚠️ **IMPORTANT SECURITY NOTICE**
>
> The placeholders above (`<YOUR_SECURE_*>`) **MUST** be replaced with cryptographically secure random values before use.
>
> **Generate secure secrets:**
> ```bash
> # Method 1: Using OpenSSL (recommended)
> openssl rand -base64 32
>
> # Method 2: Using Node.js
> node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
>
> # Method 3: Using Python
> python3 -c "import secrets; print(secrets.token_urlsafe(32))"
> ```
>
> **NEVER:**
> - Use the example values shown in documentation
> - Commit `.env` files to version control (they are gitignored)
> - Share secrets in plain text via email, chat, or screenshots
> - Reuse secrets across different environments (dev/staging/prod)
>
> **For Jules VM users**: Secrets are managed in the Jules GUI Environment tab and injected at runtime. You don't need to create `.env` files.

## 40. Appendix C: ASCII Architecture Diagram
```
+-----------------+       +-----------------+       +------------------+
|   Browser UI    | <---> |  Next.js 14 Web | <---> |   NestJS API     |
+-----------------+       +-----------------+       +------------------+
                                                        |
                                                        v
                                                +------------------+
                                                |  Prisma Client   |
                                                +------------------+
                                                        |
                                                        v
                                                +------------------+
                                                | PostgreSQL 15 DB |
                                                +------------------+
                                                        |
                                                        v
                                                +------------------+
                                                |   Redis (Queues) |
                                                +------------------+
```

---

MeoCRM is documentation-first. Keep this README updated whenever behavior, tooling, or environment assumptions change.

## 41. Appendix D: Sample Tenant Isolation Test
```ts
describe('Tenant isolation', () => {
  it('prevents cross-tenant product leaks', async () => {
    const orgA = await createOrganization('Org A');
    const orgB = await createOrganization('Org B');

    await createProduct(orgA, { sku: 'VDNT09', name: 'Wallet' });

    const response = await getProducts(orgB);
    expect(response.body).toHaveLength(0);
  });
});
```

## 42. Appendix E: RequestContext Usage Tips
- Access the current organization via `RequestContext.getOrganizationId()`.
- Populate context inside middleware before controllers execute.
- Extend context with correlation IDs when adding observability tooling.

## 43. Appendix F: Soft Delete Strategy
- Use `deletedAt` across Product, Customer, Order, etc.
- Never issue hard deletes; prefer `prisma.model.update({ data: { deletedAt: new Date() } })`.
- Prisma middleware automatically filters `deletedAt: null` on reads.
- Tests must confirm deleted records remain hidden while still present in DB for audits.

## 44. Appendix G: Shipping Partner Matrix
| Partner | Use Case | Notes |
| --- | --- | --- |
| GHN | Nationwide | Fast urban delivery |
| GHTK | Nationwide | COD friendly |
| AhaMove | Same-day | Ideal for inner-city |
| VNPost | Nationwide | Government postal service |
| Others (5+) | Specialized lanes | Extendable via ShippingOrder model |

## 45. Appendix H: Debt Tracking Flow
1. Customer places order with COD.
2. Order is marked `isPaid = false`, `paidAmount = 0`.
3. Shipping partner collects payment; COD status tracked in `ShippingOrder`.
4. When funds received, update `paidAmount` and mark `debt` as settled.
5. Customer dashboards reflect `debt Decimal(12,2)` decreasing to zero.

## 46. Appendix I: Commit Template
```
type(scope): short summary

- Detail 1
- Detail 2
- Detail 3
```
Use this when summarizing complex documentation or schema work.

## 47. Appendix J: Daily Operational Rituals
- Morning: Run `git pull origin dev`, `pnpm install`, verify DB connectivity.
- Midday: Re-run tests if schema changed.
- Evening: Commit + push; document noteworthy findings in `docs/LESSONS_LEARNED.md`.

## 48. Appendix K: Backup & Recovery
1. Create schema backup: `cp apps/api/prisma/schema.prisma apps/api/prisma/schema.prisma.backup.$(date +%Y%m%d)`.
2. Store dumps of key tables using `pg_dump` if required.
3. Document restore steps in issue tracker when incidents occur.

## 49. Appendix L: Future Enhancements Log
- Analytics dashboards for sales velocity.
- Loyalty engine with tiered rewards.
- Automation workflows for purchase orders.
- Mobile companion app for inventory scanning.

## 50. Appendix M: Update Policy
- Update README for any new commands, environment requirements, or metrics.
- Update architecture doc when flow diagrams or middleware change.
- Update lessons learned whenever incidents occur.
- Update implementation status after each milestone or sprint.
