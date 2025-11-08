# MeoCRM - Multi-tenant CRM System

**Tech Stack:** NestJS + Prisma + PostgreSQL 15 + Next.js 14  
**Architecture:** Modular Monolith with tenant isolation  
**Target:** 10-50 concurrent users per organization

---

## 🖥️ Jules VM Environment

### What's Pre-configured (via Snapshot)
- ✅ PostgreSQL 15 on port 2001
- ✅ Redis on port 2002  
- ✅ Global tools: @nestjs/cli, typescript, prisma, concurrently
- ✅ Project dependencies: node_modules installed
- ✅ Playwright browsers

### Verify Environment (Run these first)
Check services are running
sudo systemctl status postgresql || sudo systemctl start postgresql
sudo systemctl status redis-server || sudo systemctl start redis-server

Verify connectivity
PGPASSWORD='meocrm_dev_password' psql -h localhost -p 2001 -U meocrm_user -d meocrm_dev -c "SELECT 1;"
redis-cli -p 2002 ping

Check tools
nest --version && tsc --version && prisma --version

**Expected:** All commands return success (no errors)

### If Services Not Running
Start PostgreSQL
sudo systemctl start postgresql || sudo service postgresql restart

Start Redis
sudo systemctl start redis-server || sudo service redis-server restart

Wait for services
sleep 3

---

## Quick Commands

Development
pnpm dev # Start API (2003) + Web (2004)
pnpm dev:api # API only
pnpm dev:web # Web only

Testing
pnpm test # Unit + integration (≥80% coverage)
pnpm test:e2e # E2E tests
pnpm test:cov # Coverage report

Build & Quality
pnpm build # Build all packages
pnpm lint # ESLint + Prettier
pnpm lint:fix # Auto-fix issues

Database
pnpm db:generate # Generate Prisma client
pnpm db:push # Push schema changes
pnpm db:studio # Open Prisma Studio GUI
pnpm db:seed # Seed dev data

---

## Environment Configuration

### Ports
| Service | Port |
|---------|------|
| PostgreSQL | 2001 |
| Redis | 2002 |
| API | 2003 |
| Web | 2004 |

### Environment Variables
DATABASE_URL="postgresql://meocrm_user:meocrm_dev_password@localhost:2001/meocrm_dev?schema=public"
REDIS_URL="redis://localhost:2002"
PORT=2003
NODE_ENV=development
JWT_SECRET="dev-secret-jules-vm"
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NEXT_PUBLIC_API_URL=http://localhost:2003

---

## Security Rules (CRITICAL)

### Multi-tenant Isolation
// ✅ REQUIRED: All queries must filter by organizationId
await prisma.product.findMany({
where: { organizationId: user.organizationId }
});

// ❌ FORBIDDEN: Missing filter causes data leak
await prisma.product.findMany();

### Authentication Guards
// ✅ REQUIRED: All controllers protected
@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {}

---

## Testing Requirements

**Coverage:** ≥80% required  
**Pattern:** Always test tenant isolation

it('prevents cross-tenant data access', async () => {
const orgA = await createOrg();
const orgB = await createOrg();

await service.create(orgA.id, productData);
const results = await service.findAll(orgB.id);

expect(results).toHaveLength(0); // orgB cannot see orgA data
});

---

## Git Workflow

**Branches:** `feature/<module>-<feature>`, `fix/<module>-<bug>`, `docs/<topic>`

**Commits:**
type(scope): description

Examples:
feat(products): add variants support
fix(auth): resolve token expiration
test(orders): add payment flow E2E

---

## Common Pitfalls

### ❌ Data Leak
// WRONG: No organizationId filter
await prisma.user.findMany();

// CORRECT: Always filter
await prisma.user.findMany({ where: { organizationId } });

### ❌ Unprotected Endpoints
// WRONG: Missing guard
@Controller('products')
export class ProductsController {}

// CORRECT: Add guard
@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {}

---

## Troubleshooting

### Services Not Running
PostgreSQL won't start
sudo systemctl restart postgresql
sudo tail -f /var/log/postgresql/postgresql-15-main.log

Redis connection refused
sudo systemctl restart redis-server
redis-cli -p 2002 ping

### Database Errors
Permission denied on migrations
sudo -u postgres psql -d meocrm_dev -c "ALTER SCHEMA public OWNER TO meocrm_user;"

Connection refused on port 2001
sudo netstat -tuln | grep 2001
sudo systemctl restart postgresql


### Cross-tenant Data Visible
// Add organizationId to all Prisma queries
where: {
organizationId: user.organizationId,
deletedAt: null // Soft delete
}

---

## Project Structure

apps/api/src/
├── auth/ # JWT guards, refresh tokens
├── products/ # Catalog + variants
├── customers/ # CRM + segments
├── orders/ # Order processing
└── common/ # RequestContext, Prisma middleware

apps/web/app/
├── (auth)/ # Login pages
└── (dashboard)/ # Products, Customers, POS

---

## Resources

- **Swagger:** http://localhost:2003/api
- **Prisma Studio:** `pnpm db:studio`
- **Repo:** https://github.com/shine391-org/meocrm
