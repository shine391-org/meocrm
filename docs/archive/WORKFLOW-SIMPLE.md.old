# MeoCRM Development Workflow (Optimized)

**Quick Reference Guide for Human-Claude Collaboration**

## Roles

### Human (Boss)
- ✅ Provide UI screenshots/mockups
- ✅ Specify missing features/requirements
- ✅ Final manual testing & approval

### Claude (Developer)
- ✅ Write all code (frontend + backend)
- ✅ Write & run all tests (unit, integration, E2E)
- ✅ Update documentation

---

## 5-Phase Workflow

### Phase 1: DESIGN (Human)
**Input:** Screenshot/mockup + feature description

**Template:**
```
New task: [Feature Name]
Screenshot: [attach or describe]
Requirements:
- [ ] Must have X
- [ ] Should integrate with Y
- [ ] Validation rules: Z
```

### Phase 2: PLAN (Claude)
**Actions:**
1. Read relevant docs (ROADMAP, Business Logic, similar components)
2. Confirm understanding & ask clarification if needed
3. Create TodoWrite checklist
4. Estimate time (1.5h simple / 3.5h medium / 7h complex)

**Output:** Confirmation message with plan

### Phase 3: IMPLEMENT (Claude)
**Checklist (from DEVELOPMENT_LESSONS_LEARNED.md):**
- [ ] Multi-tenant: OrganizationGuard on controllers
- [ ] Settings-driven: No hardcoded values
- [ ] Response format: `{ data: T }` or `{ data: T[], meta }`
- [ ] Error format: `{ code, message, traceId }`
- [ ] Soft delete: Use `deletedAt` field
- [ ] Unit tests: 70% coverage target
- [ ] Integration tests: 20% coverage target
- [ ] E2E tests: 10% coverage target

**Process:**
1. Backend first (schema → service → controller → tests)
2. Frontend second (components → pages → integration)
3. Run tests continuously: `pnpm test`
4. Run E2E: `pnpm test:e2e`

### Phase 4: VALIDATE (Claude)
**Actions:**
1. Run full test suite: `pnpm test`
2. Run E2E tests: `pnpm test:e2e`
3. Check coverage: Must be ≥80%
4. Test manually in dev environment
5. Update ROADMAP.md task status

**Output:** Test results + coverage report

### Phase 5: REVIEW (Human)
**Actions:**
1. Review code changes
2. Test functionality manually
3. Approve or request changes

**Output:** "LGTM" or specific change requests

---

## Fast Context Loading Guide

### For New UI Feature:
**Read:**
1. [ROADMAP.md](ROADMAP.md) - Check current phase & related tasks
2. User's screenshot
3. Similar existing component (if any)

**Don't read:** Full AGENTS.md, detailed API docs

### For Backend API:
**Read:**
1. [docs/01_BUSINESS_LOGIC.md](docs/01_BUSINESS_LOGIC.md) - Business rules
2. [docs/03_DATABASE_SCHEMA.md](docs/03_DATABASE_SCHEMA.md) - Schema
3. [ROADMAP.md](ROADMAP.md) - Current tasks

**Don't read:** Frontend docs, integration APIs

### For Bug Fix:
**Read:**
1. Error message/stack trace
2. Relevant source file only
3. Related test file

**Don't read:** Unrelated modules

### For Test Writing:
**Read:**
1. [docs/testing/Strategy-&-Coverage.md](docs/testing/Strategy-&-Coverage.md)
2. Similar existing test
3. Code being tested

**Don't read:** Full business logic docs

---

## Quick Commands Reference

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

# Git workflow
git checkout -b feature/task-name  # Create feature branch
git add .
git commit -m "feat: description"
git push origin feature/task-name
gh pr create                       # Create PR
```

---

## Communication Templates

### Task Complete:
```
✅ Complete: [Task Name]
- Files changed: [list]
- Tests: ✅ [X] passed
- Coverage: [X]%
- Manual testing: ✅ Verified in dev

Ready for your review.
```

### Clarification Needed:
```
❓ Need clarification on [Task Name]:
1. Should [X] do [Y] or [Z]?
2. How to handle edge case: [describe]?

Current assumption: [describe]
```

### Blocked:
```
🚫 Blocked on [Task Name]:
- Issue: [describe]
- Attempted: [what you tried]
- Need: [what's required]

Suggested next step: [propose solution]
```

---

## Documentation Structure (Optimized)

### Essential (Read Often):
- **[ROADMAP.md](ROADMAP.md)** - Task tracking (91/187 complete)
- **[WORKFLOW-SIMPLE.md](WORKFLOW-SIMPLE.md)** - This file
- **[docs/ENVIRONMENT.md](docs/ENVIRONMENT.md)** - Setup & env vars

### Reference (Read as Needed):
- **[AGENTS.md](AGENTS.md)** - Detailed workflow (Option 3)
- **[docs/01_BUSINESS_LOGIC.md](docs/01_BUSINESS_LOGIC.md)** - Business rules
- **[docs/03_DATABASE_SCHEMA.md](docs/03_DATABASE_SCHEMA.md)** - Database design
- **[docs/testing/Strategy-&-Coverage.md](docs/testing/Strategy-&-Coverage.md)** - Test strategy

### Archive (Rarely Needed):
- **[docs/02_IMPLEMENTATION_PLAN.md](docs/02_IMPLEMENTATION_PLAN.md)** - Original plan
- **[docs/code-review/](docs/code-review/)** - Historical reviews
- **[WORKFLOW.md](WORKFLOW.md)** - Detailed workflow (legacy)

---

## 10 Development Lessons (Quick Checklist)

See [AGENTS.md](AGENTS.md) for details. Before pushing code:

1. ✅ Multi-tenant: OrganizationGuard everywhere
2. ✅ Settings-driven: No hardcoded config
3. ✅ Response format: `{ data: T }`
4. ✅ Error format: `{ code, message, traceId }`
5. ✅ Soft delete: Use `deletedAt`
6. ✅ Tests: Unit (70%) → Integration (20%) → E2E (10%)
7. ✅ Validation: DTO classes with class-validator
8. ✅ Security: Input sanitization, SQL injection prevention
9. ✅ Performance: Indexes on foreign keys
10. ✅ Documentation: Update ROADMAP.md, API docs

---

## Session Management

### Start of Session:
1. Claude reads: [ROADMAP.md](ROADMAP.md) + relevant docs
2. Human provides: Task + screenshot
3. Claude confirms: Understanding + plan

### End of Session:
1. Claude updates: ROADMAP.md task status
2. Claude commits: Code + tests
3. Claude summarizes: What's complete, what's next

### Context Limits (if approaching):
1. Save work: Commit current progress
2. Document state: Update ROADMAP.md
3. Next session: Resume from ROADMAP.md

---

## Current Project Status

**Progress:** 91/187 tasks (49%)
**Current Phase:** Phase 4 (Orders & POS)
**Test Coverage:** 85.25% (target: 80%)

See [ROADMAP.md](ROADMAP.md) for detailed status.
