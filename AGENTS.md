pnpm --filter @meocrm/web dev     # Start on port 2004

pnpm --filter @meocrm/web build   # Production build

```

---

## Design System

- **UI:** Shadcn/ui + Tailwind CSS 4.0.1
- **Style:** KiotViet-inspired (see Notion: Frontend UI Specs)
- **Language:** Vietnamese by default
- **Data:** TanStack Query
- **State:** Zustand (UI only)

---

## Component Pattern

```

// Data fetching

const useProducts = () => {

return useQuery({

queryKey: ['products'],

queryFn: () => api.get('/products'),

});

};

// Component

export default function ProductsPage() {

const { data, isLoading } = useProducts();

if (isLoading) return <Skeleton />;

return <ProductsList products={data} />;

}

```

---

## Structure

```

app/

├── (auth)/           # Login/Register

└── (dashboard)/      # Main app

├── layout.tsx    # Dashboard shell

├── products/     # Products UI

├── customers/    # Customers UI

├── pos/          # POS interface

└── reports/      # Reports

```

---

## Component Checklist

- [ ] Responsive (mobile/tablet/desktop)
- [ ] Loading states (Skeleton)
- [ ] Error boundaries
- [ ] Vietnamese labels
- [ ] TanStack Query
- [ ] Integration tests (MSW)
```

**Key Features:**

- 45 lines total
- Frontend-specific conventions
- Design system reference
- Component patterns

---

## ⏱️ Timeline Chi Tiết

| Task | Time | File | Lines |
| --- | --- | --- | --- |
| **Phase 1: Root [AGENTS.md](http://AGENTS.md)** | 45min | `/[AGENTS.md](http://AGENTS.md)` | 80 |
| - Draft content | 20min |  |  |
| - Review & refine | 15min |  |  |
| - Test readability | 10min |  |  |
| **Phase 2: Backend [AGENTS.md](http://AGENTS.md)** | 30min | `/apps/api/[AGENTS.md](http://AGENTS.md)` | 50 |
| - Module patterns | 15min |  |  |
| - Testing examples | 10min |  |  |
| - Review | 5min |  |  |
| **Phase 3: Frontend [AGENTS.md](http://AGENTS.md)** | 30min | `/apps/web/[AGENTS.md](http://AGENTS.md)` | 45 |
| - Component patterns | 15min |  |  |
| - Design system ref | 10min |  |  |
| - Review | 5min |  |  |
| **Phase 4: Validate All** | 15min | All 3 files |  |
| - Cross-check consistency | 5min |  |  |
| - Test Jules workflow | 5min |  |  |
| - Final review | 5min |  |  |
| **Total** | **2 giờ** | **3 files** | **175** |

---

## ✅ Acceptance Criteria

**Trước khi submit:**

- [ ]  Total lines ≤ 200 (currently 175)
- [ ]  Root [AGENTS.md](http://AGENTS.md) có link to nested files
- [ ]  Backend [AGENTS.md](http://AGENTS.md) có backend-specific patterns
- [ ]  Frontend [AGENTS.md](http://AGENTS.md) có frontend-specific patterns
- [ ]  No redundant info between files
- [ ]  Concise & to-the-point (follow Jules best practices)
- [ ]  Environment warnings rõ ràng (Docker vs Native)
- [ ]  Testing workflow rõ ràng (Jules gen code, CI/CD execute)
- [ ]  Multi-tenant security emphasized

---

## 🎯 Next Actions

**Boss confirm:**

1. ✅ Structure 3 files OK?
2. ✅ Content outline OK?
3. ✅ Timeline 2 giờ OK?

**Sau khi approve:**

- Meoz sẽ draft 3 files content đầy đủ
- Boss review
- Commit to GitHub repo
- Test với Jules task nhỏ

---

**Boss ready để tôi bắt đầu draft full content 3 files này không?** 🚀

# ✅ BẮT ĐẦU DRAFT 3 FILES [AGENTS.MD](http://AGENTS.MD)

Tôi sẽ draft đầy đủ nội dung 3 files ngay bây giờ. Boss có thể copy trực tiếp vào repo!

---

## 📄 File 1: `/[AGENTS.md](http://AGENTS.md)` (Root - 80 lines)

```markdown
# MeoCRM - Multi-tenant CRM System

**Tech Stack:** NestJS 11 + Prisma 6 + PostgreSQL 17 + Next.js 16 + React 19
**Monorepo:** pnpm workspaces (apps/api, apps/web)
**Target:** 10-50 concurrent users per organization

---

## 🚨 CRITICAL: Environment (Jules VM)

**Pre-installed services (NATIVE, not Docker):**
✅ PostgreSQL 17 on port **2001**
✅ Redis 8.2 on port **2002**
✅ Node 22 LTS + pnpm 10
✅ Prisma, NestJS CLI, TypeScript

**Start services if stopped:**
```

sudo systemctl start postgresql

sudo systemctl start redis-server

```

**❌ IGNORE these (local dev only):**
- [docker-compose.dev](http://docker-compose.dev).yml
- Docker commands in README
- Port 5432 (we use 2001)

---

## ⚡ Quick Commands

```

pnpm install              # Install dependencies

pnpm dev                  # Start API (2003) + Web (2004)

pnpm test                 # Run tests

pnpm db:generate          # Generate Prisma client

pnpm db:push              # Apply schema changes

```

---

## 📂 Monorepo Structure

```

apps/

├── api/              # NestJS backend → See apps/api/[AGENTS.md](http://AGENTS.md)

└── web/              # Next.js frontend → See apps/web/[AGENTS.md](http://AGENTS.md)

```

**Read package-specific [AGENTS.md](http://AGENTS.md) for detailed conventions.**

---

## 🔒 Multi-tenant Security (CRITICAL!)

**Rule:** ALL database queries MUST filter by organizationId.

```

// ✅ CORRECT

await prisma.product.findMany({

});

// ❌ WRONG - Data leak!

await prisma.product.findMany();

```

---

## 🧪 Testing Strategy

**Jules generates:**
- ✅ Unit tests (.spec.ts)
- ✅ Integration tests (.spec.ts)
- ✅ E2E test code (.e2e-spec.ts)

**Jules CANNOT execute:**
- ❌ E2E tests (VM limitation - no long-running server)

**CI/CD will execute:**
- ✅ E2E tests (future: GitHub Actions - TEST-005)

---

## 🔄 Git Workflow

**Branches:** dev (active) → staging → main
**Branch naming:** feature/[module]-[feature]
**Commits:** Conventional Commits (feat, fix, test, docs)
**PR target:** dev branch

---

## 🚨 Current Blockers (2025-11-09)

**Phase 1: 40% complete (NOT 100%)**

Missing 25 tasks:
- AUTH-001 to AUTH-008: JWT backend
- FE-001 to FE-007: Login + Dashboard shell
- TEST-001, TEST-002, TEST-005: E2E infrastructure

**Impact:** Cannot login to test application!

---

## 📚 Resources

- **Notion:** Task Tracking + Prompt Templates
- **Schema:** apps/api/prisma/schema.prisma
- **Swagger:** http://localhost:2003/api (when API running)

---

**For detailed conventions, see package-specific [AGENTS.md](http://AGENTS.md) files.**
```
