# MeoCRM Project Hub

> **Multi-tenant CRM System** | NestJS + Next.js + PostgreSQL + Prisma
> 

> **Inspired by KiotViet** | 5-6 months to MVP
> 

---

## 📊 Project Status Dashboard

> ⚠️ **Note:** This overview shows historical snapshot. For current live status, see **[ROADMAP.md](../ROADMAP.md)** (updated real-time).

### Overall Progress (Updated 2025-11-16)

**Total Tasks:** 187 tasks | 400 story points

**Completed:** 56 tasks (30%) | 150 points ✅

**In Progress:** 40 tasks (21%) | 100 points 🔵

**Todo:** 91 tasks (49%) | 150 points ⏳

**Source of Truth:** [ROADMAP.md](../ROADMAP.md) - Updated in every commit

### Progress by Phase (See ROADMAP.md for details)

**Phase 1 - Foundation & Auth:** ~78% complete ✨

**Phase 2 - Products & Inventory:** ~15% complete 🔵 **(Current Focus)**

**Phase 3 - CRM Core:** ~25% complete 🔵

**Phase 4 - Orders & POS:** Blocked on Phase 2 ⏳

**Phase 5 - Finance & Reports:** Planned ⏳

> 📊 For detailed breakdown by batch and task-level tracking, see [ROADMAP.md](../ROADMAP.md)

### Critical Path (Currently Blocking)

See [ROADMAP.md](../ROADMAP.md) for live critical path. As of 2025-11-16:

1. 🔴 **Frontend Auth (Batch 1C)** - 7 tasks - Waiting on design screenshots
2. 🔴 **Products CRUD (Batch 2A)** - 10 tasks - In Progress (Jules)
3. 🔴 **Categories (Batch 2B)** - 4 tasks - In Progress (Jules)
4. 🔴 **Product Variants (Batch 2C)** - 4 tasks - In Progress (Jules)

### Quick Stats

- ✅ **Complete:** 56 tasks (30%)
- 🔵 **In Progress:** 40 tasks (21%)
- ⏳ **Todo:** 91 tasks (49%)
- 🎯 **Test Coverage:** 85.25% (Target: ≥80%)
- ✅ **Tests Passing:** 281 tests
- ⚠️ **Tests Failing:** 28 tests (response format issues - being fixed)

---

## 🗂️ Core Resources

### 📋 Project Management

- Task Board: 136 tasks with status, priority, story points
- Branch Tracking: Branch tracking with PR links
- Best Practices: Best practices & common pitfalls
- Task Dependencies Map: Critical path analysis

### 📅 Development History

- Session History: Details of work sessions, bug fixes, decisions

---

## 📚 Documentation Library

Refer to the `docs/` directory for detailed documentation.

---

## 🎯 Quick Start Guide

### For Boss (Project Manager)

1. Check the Task Board for the current sprint.
2. Review Best Practices for common mistakes.
3. Assign tasks to Jules via Prompt Templates Library.
4. Monitor progress in Branch Tracking.

### For Jules (Primary Agent)

1. **Start here:** Read [AGENTS-QUICKSTART.md](../AGENTS-QUICKSTART.md) (15 min onboarding)
2. Read [AGENTS.md](../AGENTS.md) - Your complete operations manual
3. Pick a task from [ROADMAP.md](../ROADMAP.md) (Status = Todo, High Priority)
4. Follow Phase 2: IMPLEMENT workflow (AGENTS.md section 5)
5. Reference `docs/03_DATABASE_SCHEMA.md` for Prisma models
6. Create PR → Update [ROADMAP.md](../ROADMAP.md) → Tag Claude for review

---

## 📈 Development Workflow

```mermaid
graph LR
    A[📋 Pick Task] --> B[📝 Get Prompt]
    B --> C[🤖 Jules Implements]
    C --> D[✅ Self-Test]
    D --> E[🔀 Create PR]
    E --> F[✅ Review & Merge]
    F --> G[📊 Update Status]
```

### Workflow Steps

1. **Select Task** from Task Tracking (Todo + High Priority)
2. **Get Prompt** from Prompt Templates Library
3. **Jules Implements** (Backend + Frontend + Tests)
4. **Self-Test** (≥80% coverage + tenant isolation)
5. **Create PR** (dev branch + needs-testing label)
6. **Review** (Codex optional for complex tasks)
7. **Merge** (dev → staging → main)
8. **Update Status** (Task Tracking + Git Branch Management)

---

## 🚨 Critical Rules (Must Follow)

### Multi-tenant Security

```tsx
// ✅ CORRECT - Always filter by organizationId
const products = await prisma.product.findMany({
  where: { organizationId: user.organizationId }
});

// ❌ WRONG - Cross-tenant data leak!
const products = await prisma.product.findMany();
```

### Testing Requirements

- **Unit tests:** ≥80% coverage (Jules executes in VM)
- **Integration tests:** API endpoints (Jules executes in VM)
- **E2E tests:** Jules generates code, CI/CD executes
- **Security tests:** Tenant isolation MUST pass

### Git Workflow

- **Branch naming:** `feature/[module]-[feature]`
- **Commit format:** `type(scope): [TASK-ID] description`
- **PR target:** `dev` branch
- **Label:** `needs-testing`

---

## 🔗 External Resources

### GitHub Repository

**Repo:** meocrm
**Branches:** dev → staging → main
**CI/CD:** GitHub Actions
**Coverage:** 87%+

### Tech Stack (UPDATED 2025-11-09)

**Runtime & Package Manager:**

- **Node.js:** 22.11.0 LTS (current, supported until April 2027)
- **pnpm:** 10.20.0 (latest stable, Oct 2025)

**Backend:**

- **NestJS:** 11.1.8 (latest stable, Oct 2025)
- **Prisma ORM:** 6.19.0 (latest stable, Rust-free architecture)
- **PostgreSQL:** 17 (GA September 2025, performance improvements)
- **Redis:** 8.2 (latest with AI/vector features, 30+ perf improvements)

**Frontend:**

- **Next.js:** 16.0.1 (latest stable, Oct 2025 - Turbopack stable, 5-10x faster)
- **React:** 19.0.0 (stable December 2024 - Actions, useFormState APIs)
- **Tailwind CSS:** 4.0.1 (latest, Jan 2025 - New engine, CSS-first config)
- **TypeScript:** 5.6.3 (current stable, 5.7 still beta)

**Testing:**

- **Jest:** 29.7.0 (latest stable)
- **Playwright:** 1.56.1 (latest, Oct 2025)
- **Supertest:** 7.0.0 (latest)

### Environment (Updated Nov 2025)

**Database:** PostgreSQL 17 (port 2001) - GA Sep 2025
**Redis:** Redis 8.2 (port 2002) - Latest with AI features
**API:** NestJS 11.x (localhost:2003)
**Web:** Next.js 16.x (localhost:2004)
**Swagger:** localhost:2003/api
