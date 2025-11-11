# MeoCRM v4.0

> Multi-tenant CRM inspired by KiotViet, optimized for 10-50 concurrent users per organization.

## Table of Contents
1. Project Snapshot
2. Why MeoCRM
3. Badges & Metrics
4. Quick Facts
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
- **Latest Commit**: `c2957da` (Task A implementation – security + tests).

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

## 5. Version & Change Log
| Version | Date | Notes |
| --- | --- | --- |
| v4.0 | 2025-11-08 | Security hardening, docs sync, ≥85% coverage |
| v3.x | 2025-09 | Added suppliers & shipping partners |
| v2.x | 2025-06 | Introduced CRM segments & debt tracking |
| v1.x | 2025-03 | Core auth + organization scaffolding |

## 6. Getting Started Checklist
- [ ] Confirm Node.js ≥18 and pnpm ≥8.
- [ ] Verify PostgreSQL service is running (no Docker for DB on Jules VM).
- [ ] Install workspace dependencies with `pnpm install`.
- [ ] Configure `.env` using Appendix B template.
- [ ] Run `pnpm db:generate`, `pnpm db:push`, `pnpm db:seed`.
- [ ] Start dev servers via `pnpm dev`.

## 7. Environment Verification
```bash
node -v          # Expect v18+
pnpm -v          # Expect v8+
sudo service postgresql status  # Jules VM uses system PostgreSQL
psql -U postgres -c "\\l"       # Confirm database access
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
> 🔔 Jules VM already runs PostgreSQL via service. Only start Docker if instructions explicitly allow.

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
| `docs/LESSONS_LEARNED.md` | Team knowledge base (45+ lessons) |
| `docs/IMPLEMENTATION_STATUS.md` | Progress tracker & roadmap |
| `docs/technical/coding-standards.md` | Coding standards |
| `docs/ENVIRONMENT.md` | Environment variables & setup |
| `docs/TROUBLESHOOTING.md` | Common fixes |

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
| Docker DB conflict | `docker-compose up` fails on Jules VM | Use system PostgreSQL service per AGENTS instructions |

## 30. Implementation Status (summary)
- **Security**: RequestContext + Prisma middleware ✅
- **Multi-tenancy**: Auto orgId injection ✅
- **Global Guards**: JWT guard + @Public decorator ✅
- **Coverage**: 85.25% statements ✅
- **Modules**: Auth, Products, Customers, Suppliers, Categories ✅
- **Documentation**: Current sync (this README + docs) ✅

## 31. Roadmap (Phase-by-Phase)
| Phase | Focus | Status |
| --- | --- | --- |
| Phase 1 | Foundation & Auth | 100% |
| Phase 2 | Products & Inventory | 95% (variants polishing) |
| Phase 3 | CRM Core | 80% (advanced analytics pending) |
| Phase 4 | Suppliers & Shipping | 90% (SLA metrics in progress) |
| Phase 5 | Analytics Dashboard | Planned |
| Phase 6 | Loyalty & Promotions | Planned |
| Phase 7 | Marketplace Integrations | Planned |
| Phase 8 | Automation & Workflows | Planned |
| Phase 9 | Mobile Companion | Planned |

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
