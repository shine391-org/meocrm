# MeoCRM - Multi-tenant CRM System

## Project Overview

MeoCRM is a modern CRM system for retail businesses, inspired by KiotViet (Vietnam's leading POS/CRM platform with 300,000+ stores).

- **Target Users**: 10-50 concurrent users per organization
- **Architecture**: Multi-tenant with organization isolation
- **Timeline**: 5-6 months to MVP

## Tech Stack

- **Backend**: NestJS + Prisma + PostgreSQL
- **Frontend**: Next.js 14 (App Router) + React + Tailwind CSS + Zustand + TanStack Query
- **Testing**: Jest + Supertest + Playwright
- **DevOps**: Docker + GitHub Actions

## AI Agent Setup (Jules/Claude)

### Required Development Tools

Before starting any development task, ensure these tools are available:

```bash
# Auto-install missing tools (Jules Environment Optimized)
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

### Environment Prerequisites

- **Node.js**: 18+
- **pnpm**: 8+
- **Docker**: For PostgreSQL/Redis services
- **PostgreSQL**: 15

## Development Environment

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker & Docker Compose
- PostgreSQL 15

### Quick Start

```bash
# Setup development environment
pnpm install
pnpm docker:dev        # Start PostgreSQL + Redis
pnpm db:generate       # Generate Prisma client
pnpm db:push           # Create database schema
pnpm db:seed           # Seed development data
pnpm dev               # Start both API + Web
```

### Commands

```bash
pnpm dev               # Start both API + Web concurrently
pnpm dev:api          # Start NestJS API only (localhost:2003)
pnpm dev:web          # Start Next.js Web only (localhost:2004)
pnpm build            # Build all packages
pnpm test             # Run all tests
pnpm test:e2e         # Run E2E tests
pnpm lint             # Lint all packages
pnpm db:studio        # Open Prisma Studio
```

## Architecture Guidelines

### 🔒 Multi-tenant Security (CRITICAL)

**ALL database queries MUST include organizationId filter:**

```typescript
// ✅ CORRECT - Always filter by organizationId
const products = await prisma.product.findMany({
  where: { organizationId: user.organizationId },
});

// ❌ WRONG - Cross-tenant data leak!
const products = await prisma.product.findMany();
```

### 📁 Monorepo Structure

```
apps/api/src/
├── auth/              # JWT authentication
├── organizations/     # Multi-tenant management
├── users/            # User management
├── products/         # Product catalog + variants
├── customers/        # CRM + loyalty tracking
├── suppliers/        # Supplier management
├── orders/           # Order processing
├── inventory/        # Stock management
├── shipping/         # Shipping integration
└── common/           # Shared utilities

apps/web/app/
├── (auth)/           # Login/Register pages
└── (dashboard)/      # Main application
    ├── products/
    ├── customers/
    ├── pos/
    └── reports/
```

## Testing Requirements

### Unit Tests

- **Target**: ≥80% coverage
- **Location**: `*.test.ts` files next to source
- **Must test**: Multi-tenant isolation

```typescript
describe('ProductsService', () => {
  it('should respect organization isolation', async () => {
    const orgA = await createOrganization();
    const orgB = await createOrganization();

    await service.create(orgA.id, productData);

    const products = await service.findAll(orgB.id);
    expect(products).toHaveLength(0); // Should not see orgA's products
  });
});
```

### E2E Tests

- **Location**: `apps/api/test/e2e/`
- **Must test**: Complete API workflows + tenant isolation

### Database Testing

```typescript
// Always test with real organizationId
const createTestUser = (organizationId: string) => ({
  email: 'test@example.com',
  organizationId, // REQUIRED
});
```

## Coding Standards

### Backend (NestJS)

```typescript
// Controller structure
@Controller('products')
@UseGuards(JwtAuthGuard) // Required on ALL controllers
export class ProductsController {
  @Get()
  async findAll(@CurrentUser() user: UserEntity) {
    // Always pass organizationId to service
    return this.service.findAll(user.organizationId);
  }
}

// Service structure
@Injectable()
export class ProductsService {
  async findAll(organizationId: string) {
    return this.prisma.product.findMany({
      where: { organizationId }, // REQUIRED
    });
  }
}
```

### Frontend (Next.js)

```typescript
// API calls structure
const useProducts = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => api.get('/products'), // JWT auto-included
  });
};

// Component structure
export default function ProductsPage() {
  const { data: products, isLoading } = useProducts();

  if (isLoading) return <ProductsSkeleton />;

  return <ProductsList products={products} />;
}
```

### Database Schema Conventions

**Naming:**

- Tables: PascalCase (e.g., `ProductVariant`)
- Fields: camelCase (e.g., `createdAt`)
- Relations: descriptive (e.g., `organization`, `productVariants`)

**Required Fields:**

```prisma
model Product {
  id             String @id @default(cuid())
  organizationId String // REQUIRED for all tenant data
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization   Organization @relation(fields: [organizationId], references: [id])

  @@map("products")
}
```

## Git Workflow

### Branch Naming

- `feature/[module]-[feature]` - e.g., `feature/products-variants`
- `fix/[module]-[issue]` - e.g., `fix/auth-jwt-refresh`
- `docs/[type]` - e.g., `docs/api-documentation`

### Commit Format

```
type(scope): description

Examples:
feat(products): add product variants support
fix(auth): resolve JWT refresh token expiration
test(inventory): add E2E tests for stock transactions
docs(api): update authentication endpoints
```

### PR Requirements

- All tests must pass (≥80% coverage)
- No ESLint/TypeScript errors
- Include API documentation updates
- Add/update tests for new features
- Self-review and test locally

## Environment Setup

### Development Ports (2000-2009 series)

- PostgreSQL: 2001
- Redis: 2002
- **API**: 2003
- **Web**: 2004
- Swagger: 2005
- Adminer: 2006
- MailHog: 2007

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://postgres:meocrm_dev@localhost:2001/meocrm_dev"
REDIS_URL="redis://localhost:2002"

# API
API_PORT=2003
API_URL="http://localhost:2003"

# Frontend
NEXT_PUBLIC_API_URL="http://localhost:2003"
WEB_PORT=2004

# Auth
JWT_SECRET="your-jwt-secret-key"
JWT_EXPIRES_IN="7d"
```

## KiotViet-Inspired Features

### Products

- **SKU with variants**: VDNT09 → VDNT09-D (đen), VDNT09-xanhla
- **3-level categories**: VÍ DA >> Ví thiết kế >> Ví ngắn
- **Pricing**: costPrice, sellPrice (200-400% markup)

### Customers

- **Customer segments**: "Đang Giao Hàng", "Đã mua hàng"
- **Address**: Province > District > Ward (3 levels)
- **Debt tracking** (Nợ cần thu)

### Orders & Shipping

- **Multi-payment**: Cash, Card, E-wallet, Bank transfer, COD
- **9+ shipping partners**: GHN, GHTK, AhaMove, VNPost
- **COD tracking** (Còn cần thu)

## Troubleshooting

### Common Issues

- **Multi-tenant data leak**: Always check organizationId filters
- **Port conflicts**: Use 2000-2009 series for dev environment
- **Database connection**: Ensure PostgreSQL is running via Docker
- **Tests failing**: Check tenant isolation in test data

For more details, see:

- Architecture Documentation
- Testing Guide
- API Conventions
