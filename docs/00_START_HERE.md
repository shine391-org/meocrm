# Start Here - Fast Context Loading Guide

**For Claude/AI Agents working on MeoCRM**

This guide helps you load the minimum context needed for each task type, reducing token usage by 20-60%.

---

## 🚀 Quick Start (Every Session)

**Always read first:**
1. [WORKFLOW-SIMPLE.md](../WORKFLOW-SIMPLE.md) (59 KB) - Core workflow
2. [ROADMAP.md](../ROADMAP.md) (23 KB) - Current tasks & status

**Total:** ~82 KB base context

---

## 📊 Task-Based Context Loading

### 1️⃣ New UI Feature (Screenshot-Driven)

**Read (in order):**
1. ✅ [WORKFLOW-SIMPLE.md](../WORKFLOW-SIMPLE.md) - Workflow
2. ✅ [ROADMAP.md](../ROADMAP.md) - Current phase
3. ✅ Screenshot from user
4. ✅ Similar existing component (if exists)

**Skip:** Full business logic, API docs, database schema

**Estimated context:** 82 KB + screenshot
**Time saved:** 60% (skip 120+ KB)

---

### 2️⃣ Backend API Development

**Read (in order):**
1. ✅ [WORKFLOW-SIMPLE.md](../WORKFLOW-SIMPLE.md) - Workflow
2. ✅ [essential/01_BUSINESS_LOGIC.md](essential/01_BUSINESS_LOGIC.md) - Business rules (58 KB)
3. ✅ [essential/03_DATABASE_SCHEMA.md](essential/03_DATABASE_SCHEMA.md) - Schema (45 KB)
4. ✅ [DEVELOPMENT_LESSONS_LEARNED.md](../DEVELOPMENT_LESSONS_LEARNED.md) - Coding rules (8 KB)
5. ✅ [AGENTS.md](../AGENTS.md) - Multi-tenant rules & testing

**Skip:** Frontend docs, integration APIs

**Estimated context:** 170 KB
**Time saved:** 30% (skip 70+ KB)

---

### 3️⃣ Frontend Component Development

**Read (in order):**
1. ✅ [WORKFLOW-SIMPLE.md](../WORKFLOW-SIMPLE.md) - Workflow
2. ✅ [AGENTS.md](../AGENTS.md) - Frontend context (Section 4.2)
3. ✅ Similar existing component
4. ✅ [reference/04_API_REFERENCE.md](reference/04_API_REFERENCE.md) - API endpoints (if needed)

**Skip:** Backend implementation, database schema, business logic

**Estimated context:** 90 KB
**Time saved:** 50% (skip 100+ KB)

---

### 4️⃣ Bug Fix

**Read (in order):**
1. ✅ Error message/stack trace
2. ✅ Relevant source file
3. ✅ Related test file
4. ✅ [reference/06_TROUBLESHOOTING.md](reference/06_TROUBLESHOOTING.md) (if similar issue)

**Skip:** Workflow, business logic, unrelated modules

**Estimated context:** <50 KB
**Time saved:** 75% (skip 150+ KB)

---

### 5️⃣ Test Writing

**Read (in order):**
1. ✅ [guides/testing/Strategy-&-Coverage.md](guides/testing/Strategy-&-Coverage.md)
2. ✅ Similar existing test
3. ✅ Code being tested
4. ✅ [AGENTS.md](../AGENTS.md) - Testing commands

**Skip:** Full business logic, API docs

**Estimated context:** <40 KB
**Time saved:** 80% (skip 160+ KB)

---

### 6️⃣ Integration with External API

**Read (in order):**
1. ✅ [WORKFLOW-SIMPLE.md](../WORKFLOW-SIMPLE.md) - Workflow
2. ✅ [reference/05_INTEGRATION_APIS.md](reference/05_INTEGRATION_APIS.md) - External APIs
3. ✅ [essential/ENVIRONMENT.md](essential/ENVIRONMENT.md) - Env vars
4. ✅ [AGENTS.md](../AGENTS.md) - Settings module usage

**Skip:** Frontend docs, database schema

**Estimated context:** 100 KB
**Time saved:** 40% (skip 100+ KB)

---

### 7️⃣ Database Schema Change

**Read (in order):**
1. ✅ [essential/03_DATABASE_SCHEMA.md](essential/03_DATABASE_SCHEMA.md) - Current schema
2. ✅ [essential/01_BUSINESS_LOGIC.md](essential/01_BUSINESS_LOGIC.md) - Business rules
3. ✅ [AGENTS.md](../AGENTS.md) - Multi-tenant rules
4. ✅ Existing migrations

**Skip:** Frontend docs, integration APIs

**Estimated context:** 120 KB
**Time saved:** 35% (skip 80+ KB)

---

## 📁 Documentation Structure

### Essential (Read Often)
- **[WORKFLOW-SIMPLE.md](../WORKFLOW-SIMPLE.md)** - 5-phase workflow (59 KB)
- **[ROADMAP.md](../ROADMAP.md)** - Task tracking (23 KB)
- **[AGENTS.md](../AGENTS.md)** - Operations manual (~300 lines)
- **[DEVELOPMENT_LESSONS_LEARNED.md](../DEVELOPMENT_LESSONS_LEARNED.md)** - 10 coding rules (8 KB)

### Essential Docs (docs/essential/)
- **[ENVIRONMENT.md](essential/ENVIRONMENT.md)** - Setup & env vars
- **[01_BUSINESS_LOGIC.md](essential/01_BUSINESS_LOGIC.md)** - Business rules (58 KB)
- **[03_DATABASE_SCHEMA.md](essential/03_DATABASE_SCHEMA.md)** - Database design (45 KB)

### Reference Docs (docs/reference/)
- **[04_API_REFERENCE.md](reference/04_API_REFERENCE.md)** - API endpoints (21 KB)
- **[05_INTEGRATION_APIS.md](reference/05_INTEGRATION_APIS.md)** - External APIs
- **[06_TROUBLESHOOTING.md](reference/06_TROUBLESHOOTING.md)** - Common issues
- **[Documentation-Map.md](reference/Documentation-Map.md)** - Doc index

### Guides (docs/guides/)
- **[testing/Strategy-&-Coverage.md](guides/testing/Strategy-&-Coverage.md)** - Test strategy
- **[integration/README.md](guides/integration/README.md)** - Integration guide
- **[settings/README.md](guides/settings/README.md)** - Settings module
- **[architecture/README.md](guides/architecture/README.md)** - Architecture overview

### Archive (Rarely Needed)
- **[archive/WORKFLOW.md](archive/WORKFLOW.md)** - Detailed workflow (legacy)
- **[archive/02_IMPLEMENTATION_PLAN.md](archive/02_IMPLEMENTATION_PLAN.md)** - Original plan
- **[archive/00_PROJECT_OVERVIEW.md](archive/00_PROJECT_OVERVIEW.md)** - Outdated overview

---

## ⚡ Quick Commands

```bash
# Development
pnpm --filter @meocrm/api dev     # Backend dev server
pnpm --filter @meocrm/web dev     # Frontend dev server

# Testing
pnpm --filter @meocrm/api test    # Backend unit tests
pnpm test:e2e                      # E2E tests

# Database
pnpm --filter @meocrm/api prisma:generate  # Generate Prisma client
pnpm --filter @meocrm/api prisma:migrate   # Run migrations

# Build
pnpm build                         # Build all packages
```

---

## 🎯 Context Loading Examples

### Example 1: "Implement customer search feature from screenshot"
```
✅ Read: WORKFLOW-SIMPLE.md (59 KB)
✅ Read: ROADMAP.md (23 KB)
✅ Load: User's screenshot
✅ Find: Similar search component
❌ Skip: Business logic, database schema, API docs

Total: ~90 KB
```

### Example 2: "Add order discount calculation API"
```
✅ Read: WORKFLOW-SIMPLE.md (59 KB)
✅ Read: essential/01_BUSINESS_LOGIC.md (58 KB)
✅ Read: essential/03_DATABASE_SCHEMA.md (45 KB)
✅ Read: AGENTS.md (multi-tenant rules)
❌ Skip: Frontend docs, integration APIs

Total: ~170 KB
```

### Example 3: "Fix login redirect error"
```
✅ Read: Error stack trace
✅ Read: auth/login/page.tsx
✅ Read: auth.test.tsx
✅ Check: reference/06_TROUBLESHOOTING.md
❌ Skip: All workflow and business logic docs

Total: <50 KB
```

---

## 📈 Context Usage Savings

| Task Type | Before | After | Savings |
|-----------|--------|-------|---------|
| UI Feature | 200 KB | 90 KB | 55% ↓ |
| Backend API | 240 KB | 170 KB | 29% ↓ |
| Bug Fix | 200 KB | 50 KB | 75% ↓ |
| Test Writing | 200 KB | 40 KB | 80% ↓ |
| Integration | 180 KB | 100 KB | 44% ↓ |

**Average savings:** 20-60% per task

---

## 🔄 Session Management

### Start of Session
1. Load: [WORKFLOW-SIMPLE.md](../WORKFLOW-SIMPLE.md) + [ROADMAP.md](../ROADMAP.md)
2. Get: Task + screenshot from user
3. Load: Additional docs based on task type (see above)
4. Confirm: Understanding + plan

### During Session
- Load docs **only when needed**
- Reference AGENTS.md for coding rules
- Update ROADMAP.md task status

### End of Session
- Commit: Code + tests
- Update: ROADMAP.md
- Summarize: What's complete, what's next

---

**Last updated:** 2025-01-16
**Maintained by:** MeoCRM Development Team
