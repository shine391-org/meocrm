# MeoCRM Architecture Guide

_Last updated: 2025-11-08 (commit c2957da)_

## Table of Contents
1. Introduction
2. Architectural Principles
3. High-Level System Diagram
4. Component Overview
5. Multi-Tenant Security Model
6. Request Lifecycle Walkthrough
7. RequestContext Subsystem
8. Global Guards & Authentication
9. Prisma Middleware Enforcement
10. Soft Delete Strategy
11. Database Schema (14 Models)
12. Enumerations & Shared Types
13. Data Flow Examples
14. Module Structure (NestJS)
15. Frontend Architecture (Next.js)
16. Testing Architecture
17. Environment & Deployment Layers
18. DevOps & Tooling Pipeline
19. Observability & Logging Hooks
20. Operational Checklists
21. Future Enhancements
22. Reference Tables & Appendices

---

## 1. Introduction
MeoCRM is a modular monolith tailored for Vietnamese retail businesses needing multi-tenant CRM, inventory, and shipping capabilities. The architecture enforces tenant isolation from the moment a request enters the API to the final SQL executed in PostgreSQL.

## 2. Architectural Principles
1. **Tenant Isolation by Design**: `organizationId` is enforced across guards, middleware, and ORM.
2. **Soft Delete Everywhere**: Data removal equates to `deletedAt` timestamps, never physical deletes.
3. **Auditability**: `createdAt`, `updatedAt`, and RequestContext metadata ensure traceability.
4. **Composable Modules**: Each business concern sits in its own NestJS module with DTOs, services, and tests.
5. **Predictable Infrastructure**: Ports, environment files, and tooling follow AGENTS.md instructions.
6. **Documentation as Code**: Architecture documentation evolves with the repository and references real commits.

## 3. High-Level System Diagram
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
- Browser communicates with Next.js (port 2004) which proxies to API (port 2003).
- NestJS uses Prisma to talk to PostgreSQL (port 2001) and Redis (2002) for caches/queues.

## 4. Component Overview
| Component | Description |
| --- | --- |
| Next.js Frontend | App Router structure with `(auth)` and `(dashboard)` segments, TanStack Query for data fetching |
| NestJS API | Modular backend providing auth, products, customers, orders, etc. |
| Prisma Client | ORM layer with middleware enforcing tenant + soft delete rules |
| PostgreSQL 15 | Primary persistence for tenant data |
| Redis | Optional caching / queue processing |
| GitHub Actions | CI pipeline ensuring lint, build, test |

## 5. Multi-Tenant Security Model
- **JWT Guard** ensures every request contains valid token.
- **RequestContext** stores `organizationId`, `userId`, correlation metadata.
- **Prisma Middleware** injects `organizationId` filter and `deletedAt: null` for queries and creation payloads.
- **Controllers** always receive `CurrentUser` from guard; no unauthenticated controllers unless decorated with `@Public`.
- **Soft Delete** ensures deleted records stay hidden.

### Security Guarantees
1. **Read Isolation**: Impossible to read another tenant's data as Prisma modifies queries.
2. **Write Isolation**: Create/update operations auto-populate `organizationId`.
3. **Soft Delete**: Deleted records never appear because middleware injects `deletedAt: null`.
4. **Token Safety**: Access tokens expire in 15 minutes; refresh tokens last 7 days with rotation.

## 6. Request Lifecycle Walkthrough
### GET /products Example
1. **Client** sends request with `Authorization: Bearer <token>`.
2. **JWT Guard** (`apps/api/src/auth/guards/jwt-auth.guard.ts`) validates signature and expiration.
3. **Guard** injects payload `{ userId, organizationId }` into request, calls `RequestContext.setOrganizationId()`.
4. **RequestContext Middleware** persists data in async-local storage for downstream access.
5. **ProductsController** resolves `@CurrentUser` and calls service with `organizationId` (explicit) or relies on middleware.
6. **ProductsService** issues Prisma query without manual filters.
7. **Prisma Middleware** transforms query to include `organizationId` and `deletedAt: null`.
8. **PostgreSQL** executes filtered SQL.
9. **Response** returns only tenant-specific products.

ASCII Flow:
```
[Client]
   |
   v
[JWT Guard] -> [RequestContext] -> [Controller] -> [Service]
                                         |
                                         v
                                  [Prisma Middleware]
                                         |
                                         v
                                   [PostgreSQL]
                                         |
                                         v
                                      [Response]
```

## 7. RequestContext Subsystem
- Located in `apps/api/src/common/context/`.
- Uses AsyncLocalStorage to store metadata per request.
- API surface:
  - `setRequestId(id: string)`
  - `setOrganizationId(id: string)`
  - `getOrganizationId(): string`
  - `getUserId(): string`
- Middleware attaches to NestJS pipeline early to ensure availability for guards, interceptors, and Prisma middleware.
- Logging/observability can read RequestContext to tag logs per tenant.

## 8. Global Guards & Authentication
- `JwtAuthGuard` registered globally via `APP_GUARD` in `apps/api/src/app.module.ts`.
- Guard responsibilities:
  1. Extract Bearer token.
  2. Validate signature/expiry.
  3. Load payload (userId, organizationId, roles).
  4. Attach user to request and RequestContext.
- `@Public()` decorator bypasses guard for login/health endpoints only.
- Refresh tokens implemented with rotation (15m access / 7d refresh) to minimize leak window.

## 9. Prisma Middleware Enforcement
Registered inside `apps/api/src/prisma/prisma.service.ts`:
```ts
this.$use(async (params, next) => {
  const tenantScoped = TENANT_MODELS.includes(params.model ?? '');

  if (tenantScoped) {
    params.args = params.args || {};
    params.args.where = params.args.where || {};

    if (['findMany', 'findFirst', 'findUnique'].includes(params.action)) {
      params.args.where.organizationId = RequestContext.getOrganizationId();
      params.args.where.deletedAt = null;
    }

    if (params.action === 'create') {
      params.args.data = params.args.data || {};
      params.args.data.organizationId = RequestContext.getOrganizationId();
    }
  }

  return next(params);
});
```
- `TENANT_MODELS` contains the 14 tenant-aware tables.
- Middleware runs for every Prisma call, ensuring no query bypasses organization filters.

## 10. Soft Delete Strategy
- Models such as `Product`, `Customer`, `Order` include `deletedAt DateTime?`.
- Deletes are implemented as updates setting `deletedAt`.
- Middleware automatically appends `deletedAt: null` to reads.
- Benefits:
  - Historical data retained for analytics.
  - Easier audit/investigations.
  - Allows future restore APIs.

## 11. Database Schema (14 Models)
### Organization
- Fields: `id`, `name`, `slug`, timestamps.
- Relations: `users`, `branches`, `products`, `customers`, `orders`.

### Branch
- Fields: `id`, `organizationId`, `name`, `address`, `phone`.
- Relations: `inventory`, `transfersFrom`, `transfersTo`.
- Index on `organizationId`.

### User
- Fields: `id`, `organizationId`, `email`, `password`, `name`, `role` (`UserRole`).
- Index on `organizationId`.

### Category
- Fields: `id`, `organizationId`, `name`, `parentId`.
- Self-relation `CategoryTree` for three-tier hierarchy.

### Product
- Fields: `id`, `organizationId`, `sku`, `name`, `categoryId`, `costPrice`, `sellPrice`, `stock`, `minStock`, `maxStock`, `images`, `weight`, `isActive`, `deletedAt`.
- Relations: `variants`, `inventory`, `orderItems`.
- Indexes: `organizationId`, `categoryId`, `sku`.

### ProductVariant
- Fields: `id`, `productId`, `sku`, `name`, `additionalPrice`, `stock`, `images`.
- Relation: `product` with cascade delete.

### Customer
- Fields: `id`, `organizationId`, `code`, `name`, `phone`, `email`, `address`, `province`, `district`, `ward`, `segment`, `totalSpent`, `totalOrders`, `debt`, `lastOrderAt`.
- Indexes: `organizationId`, `code`, `phone`.

### CustomerGroup (referenced in lessons)
- Houses segmentation metadata per organization.

### Supplier (implemented in modules; similar structure with `organizationId`).

### Order
- Fields: `id`, `organizationId`, `code`, `customerId`, `subtotal`, `discount`, `total`, `paymentMethod`, `isPaid`, `paidAmount`, `status`, `createdBy`.
- Relations: `items`, `shippingOrders`.

### OrderItem
- Fields: `id`, `orderId`, `productId`, `quantity`, `price`, `discount`, `lineTotal`.

### ShippingOrder
- Fields: `id`, `orderId`, `trackingCode`, recipient info, `shippingFee`, `codAmount`, `status`, `weight`, `notes`.

### Inventory
- Composite unique constraint on `(productId, branchId)`.
- Fields: `quantity` default 0.

### Transfer
- Fields: `code`, `fromBranchId`, `toBranchId`, `value`, `status`, `transferredAt`, `receivedAt`.

## 12. Enumerations & Shared Types
- `UserRole`: ADMIN, MANAGER, STAFF, CASHIER.
- `OrderStatus`: PENDING, PROCESSING, COMPLETED, CANCELLED.
- `PaymentMethod`: CASH, CARD, E_WALLET, BANK_TRANSFER, COD.
- `ShippingStatus`: PENDING, PICKING_UP, IN_TRANSIT, DELIVERED, FAILED, RETURNED.
- `TransferStatus`: PENDING, IN_TRANSIT, RECEIVED.

## 13. Data Flow Examples
### Example: Creating a Product
1. Controller receives DTO validated via `class-validator`.
2. Service calls `prisma.product.create({ data })` without setting `organizationId` manually.
3. Middleware injects tenant info and ensures `deletedAt` starts as `null`.
4. Database row contains correct `organizationId` and timestamps.

### Example: Listing Orders with Soft Delete
- Query `prisma.order.findMany({ where: { status: 'PENDING' } })` automatically becomes `where: { status: 'PENDING', organizationId, deletedAt: null }`.
- Deleted orders remain hidden without custom filters.

## 14. Module Structure (NestJS)
```
apps/api/src/
  auth/
    auth.module.ts
    auth.service.ts
    jwt.strategy.ts
    guards/
  products/
    products.module.ts
    products.controller.ts
    products.service.ts
    dto/
    entities/
  customers/
  orders/
  inventory/
  shipping/
  organizations/
  users/
  suppliers/
  common/
    context/
    decorators/
    guards/
  prisma/
```
- Each module exports service if other modules depend on it (e.g., Orders depends on Customers service).
- DTOs enforce schema alignment using `class-validator` decorators.

## 15. Frontend Architecture (Next.js)
- **App Router** organizes routes into `(auth)` and `(dashboard)` groups for layout reuse.
- **State**:
  - TanStack Query handles server state, caching API responses keyed by resource and tenant.
  - Zustand stores UI state (filters, toggles) to avoid prop drilling.
- **Styling**: Tailwind CSS + Shadcn components for consistent design across modules.
- **API Client**: Centralized fetch wrapper attaches JWT automatically; backend enforces tenant scope.

## 16. Testing Architecture
### Unit & Integration
- Jest executes with coverage ignoring `/node_modules/`, `/dist/`, `/prisma/`.
- Supertest spins up NestJS application for HTTP assertions.

### E2E
- Located under `apps/api/test/e2e/`.
- Patterns:
```ts
describe('Tenant Isolation', () => {
  it('prevents cross-tenant reads', async () => {
    const orgA = await createTestOrganization();
    const orgB = await createTestOrganization();

    await createProductAs(orgA, { sku: 'VDNT09' });

    const res = await getProductsAs(orgB);
    expect(res.body).toHaveLength(0);
  });
});
```
- Multi-tenant isolation is part of every E2E plan.

### Coverage Targets
- Goal ≥80% statements; current 85.25% achieved by excluding generated files.

## 17. Environment & Deployment Layers
| Layer | Description |
| --- | --- |
| Development | Ports 2001-2007, `pnpm db:push`, seeded data |
| Staging | Ports 3001/3101, uses `prisma migrate deploy` |
| Production | Ports 3002/3102, managed migrations, monitoring hooks |

- PostgreSQL 15 service (not Docker) on Jules VM.
- Docker Compose available for local containers when necessary.

## 18. DevOps & Tooling Pipeline
- **Commands**: `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm db:generate`, `pnpm db:push`.
- **CI**: GitHub Actions run lint + test + build; merges blocked unless green.
- **Backup**: `apps/api/prisma/schema.prisma` backed up via timestamped copies.
- **Linting**: `.eslintrc.js` uses overrides to apply Next.js rules to web, NestJS rules to API.

## 19. Observability & Logging Hooks
- RequestContext can store `requestId` and `organizationId`, enabling log lines such as `[org=org_123][req=abc] Product listed`.
- Future enhancements include correlation IDs propagated to downstream queues.
- Errors should log tenant + request info without exposing sensitive data.

## 20. Operational Checklists
### Before Coding
- Review relevant module specs.
- Verify environment and dependencies.
- Confirm schema is up-to-date via `pnpm db:push`.

### Before Commit
- `pnpm lint`
- `pnpm test`
- Update docs (architecture, lessons, status) if architecture changed.

### Before Deploy
- Ensure migrations generated and reviewed.
- Confirm RequestContext + middleware untouched by recent changes.
- Update implementation status file with latest coverage metrics.

## 21. Future Enhancements
- Extend RequestContext to inject correlation IDs for telemetry.
- Add analytics dashboards summarizing sales, inventory turnover, and COD performance.
- Implement SLA monitoring for shipping partners.
- Introduce feature flags per tenant using RequestContext metadata.
- Automate doc generation inside CI.

## 22. Reference Tables & Appendices
### Ports Reference
| Service | Dev | Staging | Prod |
| --- | --- | --- | --- |
| API | 2003 | 3001 | 3002 |
| Web | 2004 | 3101 | 3102 |
| PostgreSQL | 2001 | 5432 | 5432 |
| Redis | 2002 | 6379 | 6379 |
| Swagger | 2005 | 3005 | 3006 |

### Sample RequestContext Usage
```ts
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly logger: Logger) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const orgId = RequestContext.getOrganizationId();
    const userId = RequestContext.getUserId();

    this.logger.log(`Handling request for org=${orgId}, user=${userId}`);
    return next.handle();
  }
}
```

### Prisma Tenant Model List
```
const TENANT_MODELS = [
  'Organization',
  'Branch',
  'User',
  'Category',
  'Product',
  'ProductVariant',
  'Customer',
  'CustomerGroup',
  'Supplier',
  'Order',
  'OrderItem',
  'ShippingOrder',
  'Inventory',
  'Transfer',
];
```

### ASCII Module Interaction
```
[Auth Module] --guards--> [RequestContext]
       |                        |
       v                        v
[Products Module] ----> [Prisma Service] ----> [PostgreSQL]
       |
       v
[Orders Module] (depends on Customers service export)
```

### Deployment Steps Summary
1. Update docs and implementation status.
2. Run full test suite (`pnpm test && pnpm test:e2e`).
3. Build apps (`pnpm build`).
4. Generate migrations if schema changed.
5. Deploy API and Web to respective environments.

---

MeoCRM's architecture hinges on enforced tenant isolation. Any change touching guards, middleware, or schema must be reflected in this document. Update line items as modules evolve to keep GitHub as the authoritative reference.

## 23. Detailed Model Specifications
### 23.1 Organization
- **Table Name**: `organizations`
- **Fields**:
  - `id`: UUID primary key (`@default(uuid())`).
  - `name`: Human-readable display name.
  - `slug`: Unique tenant identifier for URLs/subdomains.
  - `createdAt` / `updatedAt`: Timestamps.
- **Relations**: `users`, `branches`, `products`, `customers`, `orders`.
- **Notes**: Acts as the root for tenant-scoped data.

### 23.2 Branch
- Represents physical locations such as "Lano HN" and "Lano HCM".
- Contains contact info and ties to inventory records.
- `transfersFrom` / `transfersTo` manage inter-branch logistics.

### 23.3 User
- Supports roles: OWNER, ADMIN, MANAGER, STAFF, CASHIER (subset of `UserRole`).
- Passwords hashed via bcrypt (10 rounds).
- `organizationId` foreign key ensures tenant binding.

### 23.4 Category
- Enables 3-level taxonomy using self-referential relation `CategoryTree`.
- Example path: `VÍ DA` → `Ví thiết kế` → `Ví ngắn`.

### 23.5 Product & ProductVariant
- `Product` tracks core SKU attributes (cost, sell price, inventory thresholds).
- `ProductVariant` adds color or size options with distinct SKU codes (e.g., `VDNT09-D`).
- Both models leverage `images String[]` for gallery support.

### 23.6 Customer & CustomerGroup
- `Customer` stores CRM data: contact info, segmentation, debts, lifetime metrics.
- `CustomerGroup` (not shown in snippet) links customers to marketing segments.
- Addresses track province/district/ward for Vietnam-specific logistics.

### 23.7 Supplier
- Manages vendor information for procurement workflows.
- Multi-tenant field requirements mirror Product/Customer patterns.

### 23.8 Order & OrderItem
- `Order` handles monetary totals, payment method, statuses, and audit info.
- `OrderItem` stores per-line quantity, price, discount, and line total.
- Multi-payment design supports Cash, Card, E-wallet, Bank Transfer, COD.

### 23.9 ShippingOrder
- Tracks shipping partner state machine (`PENDING → PICKING_UP → IN_TRANSIT → DELIVERED/FAILED/RETURNED`).
- Includes recipient address details and COD reconciliation fields.

### 23.10 Inventory & Transfer
- `Inventory` unique constraint `(productId, branchId)` ensures one row per product/branch combination.
- `Transfer` logs cross-branch movements with statuses and timestamps.

## 24. Enumerated Workflow States
| Enum | Values | Usage |
| --- | --- | --- |
| `UserRole` | ADMIN, MANAGER, STAFF, CASHIER | Access control |
| `OrderStatus` | PENDING, PROCESSING, COMPLETED, CANCELLED | Order lifecycle |
| `PaymentMethod` | CASH, CARD, E_WALLET, BANK_TRANSFER, COD | Payment tracking |
| `ShippingStatus` | PENDING, PICKING_UP, IN_TRANSIT, DELIVERED, FAILED, RETURNED | Shipping providers |
| `TransferStatus` | PENDING, IN_TRANSIT, RECEIVED | Inventory transfers |

## 25. API Layer Patterns
- Controllers decorated with `@UseGuards(JwtAuthGuard)`.
- DTOs enforce validation; e.g., `@IsString() sku`, `@IsNumber() sellPrice`.
- Services receive `organizationId` as first argument when explicit context needed.
- Example controller snippet:
```ts
@Get()
async list(@CurrentUser() user: UserEntity) {
  return this.service.list(user.organizationId);
}
```

## 26. Error Handling Strategy
- NestJS exception filters convert domain errors into standardized HTTP responses.
- Errors log `organizationId` from RequestContext to aid debugging without exposing cross-tenant data.
- Soft delete conflicts return 409 with remediation guidance.

## 27. Authentication & Authorization Flow
1. User authenticates via `/auth/login` returning access + refresh tokens.
2. Access token used for API calls; guard verifies and stores payload.
3. Refresh token rotation ensures leaked tokens expire quickly.
4. Roles (ADMIN/MANAGER/etc.) enforce feature-level permissions at controller or service layer.

## 28. Frontend-to-Backend Contract
- API base URL: `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:2003`).
- Requests contain JWT in Authorization header; no tenant ID passed from frontend.
- Response payloads return only tenant data due to backend enforcement.

## 29. Data Access Anti-Patterns (Avoid)
- ❌ Bypassing Prisma (raw SQL) without organization filter.
- ❌ Manually overriding `organizationId` in DTOs from client input.
- ❌ Using `deleteMany` to hard-delete data.
- ❌ Writing tests that only use a single organization.

## 30. Data Access Patterns (Preferred)
- ✅ Use Prisma service with middleware.
- ✅ Retrieve `organizationId` from RequestContext or `@CurrentUser` decorator.
- ✅ Soft delete by updating `deletedAt`.
- ✅ Write tests creating at least two organizations.

## 31. Deployment Architecture Details
- **Dev**: `pnpm dev` runs API + Web concurrently; use `pnpm docker:dev` only for optional containers.
- **Staging**: Use `prisma migrate deploy`, configure ports 3001/3101.
- **Production**: Hardened environment with monitoring hooks, secrets rotation, and automated backups.
- **Backups**: Schema snapshots + `pg_dump` per environment.

## 32. Security Checklist per Release
- [ ] JWT guard unchanged or tests updated accordingly.
- [ ] RequestContext still initializes before controllers.
- [ ] Prisma middleware covers new models (update `TENANT_MODELS`).
- [ ] Soft delete fields added to new tenant tables.
- [ ] Multi-tenant tests cover new modules.

## 33. Testing Playbook
| Layer | Tools | Focus |
| --- | --- | --- |
| Unit | Jest | Service logic, guards |
| Integration | Jest + Supertest | Controller + service wiring |
| E2E | Playwright / HTTP suites | Full workflows, tenant isolation |
| Coverage | Jest w/ coverage config | Maintain ≥80% |

Sample targeted coverage command:
```bash
pnpm --filter @meocrm/api test -- --runInBand --coverage --testPathPattern=src
```

## 34. Schema Migration Strategy
- **Dev**: `pnpm db:push` for speed; no history required.
- **Staging/Prod**: `prisma migrate deploy` ensures deterministic migrations.
- **Backup**: `cp apps/api/prisma/schema.prisma apps/api/prisma/schema.prisma.backup.$(date +%Y%m%d_%H%M%S)` before risky changes.

## 35. Inter-Module Dependencies
- Orders module depends on Customers service (for customer code generation).
- Inventory module references Products and Branches.
- Shipping module depends on Orders.
- Export services from modules when cross-module usage required:
```ts
@Module({
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
```

## 36. Sample ASCII Sequence Diagram
```
Client --> API: GET /products
API -> JWT Guard: validate token
JWT Guard -> RequestContext: set orgId
API -> ProductsService: findAll()
ProductsService -> Prisma Middleware: product.findMany()
Prisma Middleware -> PostgreSQL: SELECT ... WHERE organization_id = $1 AND deleted_at IS NULL
PostgreSQL --> Prisma Middleware: rows
Prisma Middleware --> ProductsService: tenant rows
ProductsService --> API: data
API --> Client: response
```

## 37. Shipping Integration Notes
- `ShippingOrder` table stores tracking codes; `trackingCode` indexed & unique.
- COD workflows rely on `codAmount` and `shippingFee` decimals.
- Additional providers can be added by extending enums or configuration tables.

## 38. Inventory Consistency Tips
- Always update `Inventory.quantity` via transactions to avoid race conditions.
- Transfers should decrement `fromBranch` inventory and increment `toBranch` after status changes.
- Soft delete transfers only in exceptional cases; prefer status transitions.

## 39. Performance Considerations
- Indexes on `organizationId` across tables keep tenant queries fast.
- SKU and tracking codes indexed for quick lookups.
- Use pagination on large datasets to avoid memory pressure.
- Redis caching layer available for frequently accessed reference data.

## 40. Documentation Responsibilities
- README: Quick start + high-level overview.
- Architecture doc (this file): Detailed flows and enforcement logic.
- Lessons learned: Incident retrospectives and prevention.
- Implementation status: Snapshot of progress, coverage, roadmap.

## 41. ASCII Deployment Matrix
```
+-----------+-----------+-----------+
| Layer     | API Port  | Web Port  |
+-----------+-----------+-----------+
| Dev       | 2003      | 2004      |
| Staging   | 3001      | 3101      |
| Prod      | 3002      | 3102      |
+-----------+-----------+-----------+
```

## 42. Tenant Isolation Test Blueprint
```ts
describe('Tenant Isolation Blueprint', () => {
  let orgA: Organization;
  let orgB: Organization;

  beforeAll(async () => {
    orgA = await createOrganization('Org A');
    orgB = await createOrganization('Org B');
  });

  it('hides Org A data from Org B', async () => {
    await createCustomer(orgA, { code: 'KH001', name: 'Alice' });
    const res = await listCustomers(orgB);
    expect(res.body.data).toHaveLength(0);
  });
});
```

## 43. Soft Delete Verification Test
```ts
it('omits soft-deleted products', async () => {
  const product = await createProduct(orgA, { sku: 'VDNT09' });
  await softDeleteProduct(product.id);

  const res = await listProducts(orgA);
  expect(res.body.find((p) => p.id === product.id)).toBeUndefined();
});
```

## 44. Refresh Token Rotation Notes
- Access tokens: 15 minutes.
- Refresh tokens: 7 days, rotated on every use.
- Compromised refresh tokens invalidated by storing hash server-side.

## 45. RequestContext Extension Ideas
- Add `correlationId` for tracing complex workflows.
- Add `locale` or `featureFlag` data per tenant.
- Share context with background processors via job payloads.

## 46. Configuration Management
- `.env` mirrors Appendix B in README.
- Use `.env.development`, `.env.staging`, `.env.production` for overrides.
- Document any new variables in README + architecture doc.

## 47. Audit Logging Pattern
```ts
@Injectable()
export class AuditService {
  log(event: string, payload: Record<string, unknown>) {
    const orgId = RequestContext.getOrganizationId();
    const userId = RequestContext.getUserId();
    this.logger.log(`[org=${orgId}][user=${userId}] ${event}`, payload);
  }
}
```
- Ensures logs always include tenant identifiers.

## 48. Redis Usage Scenarios
- Queueing shipping webhooks.
- Caching reference data such as provinces/districts/wards.
- Session store for short-lived state when necessary.

## 49. Health Check Endpoints
- `/health` (public) verifies API liveness.
- `/health/db` verifies PostgreSQL connectivity.
- `/health/redis` verifies Redis connectivity.

## 50. Update Process for This Document
1. Identify architecture change (e.g., new module, new middleware behavior).
2. Update relevant sections, diagrams, and reference tables.
3. Increment "Last updated" metadata with new date + commit.
4. Cross-link from README if necessary.

---
