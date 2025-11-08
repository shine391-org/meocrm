# 📚 Lessons Learned – MeoCRM v4.0

_Last Updated: 2025-11-08_

**Audience**: AI agents (Jules, Codex, Claude) & human developers

**Purpose**: Capture critical mistakes, fixes, and prevention playbooks that keep MeoCRM safe, fast, and predictable.

---

## 🎯 Quick Reference
- 🔴 **Multi-tenant enforcement must live at ORM level**; manual filters fail.
- 🔴 **Soft delete is systemic**; middleware enforces `deletedAt: null` everywhere.
- 🔴 **Environment verification precedes any command**; Jules VM uses PostgreSQL service, not Docker.
- 🔴 **Schema alignment requires full spec review** before a single line of code.
- 🔴 **Dependent modules share contracts**; build Customers with Orders in mind.
- ⚠️ **Coverage must ignore generated code**; focus on `/src` only.
- ⚠️ **Tests always include ≥2 organizations** to catch isolation leaks.
- ⚠️ **ESLint needs monorepo overrides** to avoid false positives.
- 🟡 **Commit every 30-45 minutes**; emergency save `c2957da` taught the lesson.
- 🟡 **Backup schema before migrations** to avoid unrecoverable drift.

---

## ❌ Mistakes To Avoid (13 Lessons)

### 🔴 Lesson 1: Schema-Design Misalignment
**What Happened**
- Design doc listed 17 Customer fields (gender, birthday, groupId, status, createdBy, etc.).
- Implementation shipped only 9 basic fields.
- Gap discovered post-delivery → full rework.

**Prevention Checklist**
```text
[ ] Read FULL design spec (beyond overview)
[ ] Count expected vs actual fields
[ ] Verify relations: CustomerGroup, User.createdCustomers
[ ] Check enums: CustomerStatus (ACTIVE, INACTIVE, BLOCKED)
[ ] Validate @map annotations (deletedAt -> deleted_at)
```

**Fix Applied**
- Added `CustomerGroup` model with organization relation.
- Added `Customer.groupId`, `Customer.status` enum, `Customer.createdBy` relation.
- Schema now matches spec 100%.

---

### 🔴 Lesson 2: Environment Verification Gaps
**What Happened**
- Agents assumed PostgreSQL ran via Docker.
- Jules VM actually uses native service → `docker-compose up` kept failing.
- Lost 2 hours debugging non-issue.

**Prevention Checklist**
```bash
sudo service postgresql status
psql -U postgres -c "\l"
echo $DATABASE_URL
```
- Never assume Docker without verification.

**Fix Applied**
- Added warnings to AGENTS.md.
- Documented verification script in onboarding flow.

---

### 🔴 Lesson 3: Missing Dependency Context
**What Happened**
- Orders module required `Customer.code` auto-generation.
- Customer module built without that knowledge → Orders blocked until schema change.

**Prevention Checklist**
```text
[ ] Identify modules that depend on current work
[ ] Review their requirements (e.g., Orders needs Customer.code)
[ ] Implement dependent fields/services up front
[ ] Export services needed by other modules
```

**Example Fix**
```ts
@Module({
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
```

---

### 🔴 Lesson 4: Undocumented Setup Steps
**What Happened**
- Products module changed schema.
- Docs never mentioned `pnpm db:generate` → “Prisma client not found” for hours.

**Prevention**
- Every schema change adds setup steps to README/module guide:
```bash
pnpm db:generate
pnpm db:push
pnpm build
pnpm test
```

---

### 🔴 Lesson 5: Parallel Tasks with Unstable Schema
**What Happened**
- Products + Customers schema work ran concurrently.
- Both touched `organizationId` relations → merge conflicts in `schema.prisma`.

**Prevention Strategy**
1. Finish schema for Module A.
2. Merge to `dev`.
3. Other agents pull latest.
4. Start Module B schema.

---

### ⚠️ Lesson 6: Multi-Tenant Security MUST Be at ORM Level
**What Happened**
- Manual `where: { organizationId }` approach missed 3 endpoints.
- Security audit flagged data leak vulnerability.

**Solution Implemented**
```ts
this.$use(async (params, next) => {
  if (params.action === 'findMany') {
    params.args.where = {
      ...params.args.where,
      organizationId: currentOrgId,
    };
  }
  return next(params);
});
```

**Result**
- Impossible to forget filters.
- Zero data leaks (verified via E2E tests).

**Prevention**
- Security-critical logic lives in middleware/guards.
- Code reviews always ask: “Does this query filter by organizationId?”

---

### ⚠️ Lesson 7: Soft Delete Is a System, Not a Feature
**What Happened**
- Implemented `deletedAt` but forgot to filter in code generation/search queries.
- Deleted customers continued to appear.

**Solution**
```ts
if (['findMany', 'findFirst', 'findUnique'].includes(params.action)) {
  params.args.where = {
    ...params.args.where,
    deletedAt: null,
  };
}
```

**Prevention**
- Enforce soft delete via middleware.
- Tests: create → delete → query → expect absence.
- Avoid raw SQL unless `deletedAt` filter added.

---

### ⚠️ Lesson 8: Architecture Verification First
**What Happened**
- Built Customers module from partial spec.
- Missed 8 fields, forcing 6-hour rework.

**Solution**
- Spend 30 minutes creating a checklist before coding.
- Example checklist snippet:
```text
Customer fields:
- code, name, phone, email
- address, province, district, ward
- segment, totalSpent, totalOrders, debt
- groupId relation, status enum, createdBy relation
```

**Prevention**
- Count expected vs actual fields.
- Verify relations + enums + @map annotations.

---

### ⚠️ Lesson 9: Test Coverage Must Be Targeted
**What Happened**
- Coverage reported 45% because Jest included Prisma-generated code + node_modules.

**Solution**
```bash
pnpm --filter @meocrm/api test -- --runInBand --coverage --testPathPattern=src
```
```js
coveragePathIgnorePatterns: [
  '/node_modules/',
  '/dist/',
  '/prisma/',
];
```
- Achieved 85.25% coverage on real app code.

---

### ⚠️ Lesson 10: Multi-Tenant Tests MUST Verify Isolation
**What Happened**
- Tests only used one organization, so leaks slipped through.
- Middleware misconfiguration went unnoticed.

**Solution**
```ts
describe('Tenant Isolation', () => {
  it('prevents cross-tenant access', async () => {
    const orgA = await createTestOrg();
    const orgB = await createTestOrg();
    await createProductAs(orgA, { name: 'Product A' });

    const productsB = await getProductsAs(orgB);
    expect(productsB).toHaveLength(0);
  });
});
```

**Prevention**
- All tests MUST create at least two orgs.
- Ensure guard + middleware enabled in test bootstrap.

---

### 🟡 Lesson 11: ESLint Must Respect Monorepo Scopes
**What Happened**
- `pnpm lint` failed because React rules hit NestJS code (React 18 no longer needs import).

**Solution**
```js
overrides: [
  {
    files: ['apps/web/**/*. {ts,tsx}'],
    extends: ['next/core-web-vitals'],
  },
  {
    files: ['apps/api/**/*.ts'],
    extends: ['@nestjs'],
  },
];
```

---

### 🟡 Lesson 12: Commit Early, Commit Often
**What Happened**
- Agent implemented Task A (28 files) without committing.
- Work almost lost until emergency commit `c2957da`.

**Prevention**
- Commit every 30-45 minutes.
- Use descriptive messages and push at end of day.

---

### 🟡 Lesson 13: Backup Schema Before Migrations
**What Happened**
- Schema change broke database with no backup; lost 2 hours recreating data.

**Solution**
```bash
cp apps/api/prisma/schema.prisma apps/api/prisma/schema.prisma.backup.$(date +%Y%m%d_%H%M%S)
```
- `.gitignore` includes `.backup` patterns.

---

## ✅ Best Practices to Maintain
1. **Jules Proactive Clarification**: Ask questions before coding; saves 4+ hours per module.
2. **Automated Setup Scripts**: Use provided scripts to reduce environment variance by 80%.
3. **Pre-task Schema Audit**: Compare spec vs schema; caught 5 major gaps early.
4. **Time-box Debugging (15 min Rule)**: If stuck >15 minutes on infra issues, escalate.
5. **Port Standardization**: API 300x, Web 310x, DB 5432, Redis 6379 across environments.
6. **`db push` for Dev, `migrate` for Prod**: Avoid migration history conflicts while iterating locally.
7. **Document Everything**: README, architecture, lessons, implementation status updated with every major change.

## 🔧 Quick Fix Patterns
### Pattern 1: Missing Field in Schema
```bash
# 1. Update schema.prisma
# 2. Backup current schema
cp apps/api/prisma/schema.prisma apps/api/prisma/schema.prisma.backup.$(date +%Y%m%d)
# 3. Regenerate + push
pnpm db:generate
pnpm db:push
```

### Pattern 2: Wrong Model Reference
- Check relation names for explicit `@relation("Name")` usage.
- Verify both sides reference matching names.
- Run `prisma validate --schema=apps/api/prisma/schema.prisma` to force re-validation.

### Pattern 3: Missing `organizationId`
```ts
const orgId = RequestContext.getOrganizationId();
return this.prisma.product.findMany({
  where: { organizationId: orgId },
});
```
- Add model to `TENANT_MODELS` array so middleware covers it automatically.

## 📊 Metrics Snapshot
- **Test Coverage**: 85.25% statements / 88.73% lines (target ≥80%).
- **Security Controls**: JWT guard + RequestContext + Prisma middleware verified in c2957da.
- **Schema Completeness**: All 14 tenant models include `organizationId`, `createdAt`, `updatedAt`, `deletedAt?` (where applicable).
- **Documentation Sync**: README (535 lines), Architecture guide (688 lines), Lessons (this file), Implementation status all in repo.

## 🎯 Action Items for Next Phase
1. **Agents**
   - Continue logging new lessons as soon as incidents occur.
   - Expand tenant isolation tests to cover new modules (shipping, suppliers, analytics).
   - Automate environment verification script within setup tasks.
2. **Team**
   - Integrate RequestContext correlation IDs for observability.
   - Establish reminder bot for “commit every 30-45 minutes” rule.
   - Add CI gate verifying documentation files touched when schema changes.

---

Keep this document in sync with real incidents. If you learn something painful, add it here immediately so the next agent never repeats it.

## 🧭 Severity Matrix
| Severity | Lessons | Response Expectation |
| --- | --- | --- |
| 🔴 Critical | 1-5 | Immediate fix, retro within same day |
| ⚠️ High | 6-10 | Fix within sprint, add tests |
| 🟡 Medium | 11-13 | Fix within two sprints, document process |

## 🗓️ Incident Timeline Highlights
1. **2025-07** – Schema vs spec mismatch discovered (Lesson 1).
2. **2025-08** – Docker vs service confusion on Jules VM (Lesson 2).
3. **2025-09** – Orders blocked by missing Customer exports (Lesson 3).
4. **2025-10** – Prisma client missing due to undocumented regen (Lesson 4).
5. **2025-10** – Schema merge conflicts from parallel work (Lesson 5).
6. **2025-11** – Security audit exposes manual filters (Lesson 6).
7. **2025-11** – Soft delete leak reported (Lesson 7).
8. **2025-11** – Coverage misreported at 45% (Lesson 9).
9. **2025-11** – Tenant tests updated for dual orgs (Lesson 10).
10. **2025-11** – ESLint overrides committed (Lesson 11).
11. **2025-11** – Emergency commit `c2957da` (Lesson 12).
12. **2025-11** – Schema backup tooling finalized (Lesson 13).

## 🧰 Reference Commands Library
```bash
# Verify environment
sudo service postgresql status
psql -U postgres -c "\l"

# Run targeted tests
pnpm --filter @meocrm/api test -- --runInBand --testPathPattern=src/products

# Coverage check
pnpm --filter @meocrm/api test -- --coverage

# Lint by workspace
direnv allow 2>/dev/null || true
pnpm lint

# Database tooling
pnpm db:generate
pnpm db:push
pnpm db:seed
```

## 🗂️ Lessons Glossary
- **Schema-Design Misalignment** → Always reconcile spec vs schema.
- **Environment Verification** → Confirm PostgreSQL service before running Docker.
- **Dependency Context** → Understand downstream needs before coding.
- **Undocumented Setup** → Document every schema impact.
- **Parallel Schema** → Sequence changes; merge early & often.
- **ORM-Level Security** → Middleware > manual filters.
- **Soft Delete System** → Delete = timestamp, not removal.
- **Architecture Verification** → Create checklists before implementation.
- **Targeted Coverage** → Exclude generated assets.
- **Tenant Isolation Tests** → Always test multi-org scenarios.
- **Scoped ESLint** → Use overrides for monorepo.
- **Commit Ritual** → Save every 30-45 minutes.
- **Schema Backup** → Snapshot before migrations.

## 🧾 Documentation Hooks
- Update README when new commands/processes appear.
- Update architecture doc when flows/middleware change.
- Update implementation status after each milestone.
- Update lessons file immediately after incident resolution.

## 🧑‍🤝‍🧑 Cross-Team Agreements
1. **Security Team**: Reviews middleware changes impacting tenant enforcement.
2. **Product Team**: Provides complete spec (field counts, enums, relations).
3. **Infra Team**: Maintains PostgreSQL service on Jules VM; announces changes.
4. **Documentation Squad**: Guards Single Source of Truth standard.

## 🧱 Guardrail Checklist Before Merge
- [ ] Schema field additions confirmed with product spec.
- [ ] `TENANT_MODELS` updated if new tenant table added.
- [ ] Soft delete filters validated with tests.
- [ ] README + architecture doc mention any new commands or flows.
- [ ] Implementation status updated with coverage & phase info.

## 📈 Continuous Improvement Targets
- Raise coverage to 88%+ by focusing on shipping + suppliers modules.
- Automate environment verification script invocation during `pnpm install`.
- Add lint rule ensuring docs updated when certain files change.

## 🧪 Example Test Blueprints
```ts
it('blocks tenant mix-ups when creating orders', async () => {
  const orgA = await createTestOrg();
  const orgB = await createTestOrg();
  const customerA = await createCustomer(orgA);

  await expect(createOrder(orgB, { customerId: customerA.id }))
    .rejects.toThrow(/organization/);
});
```
```ts
it('keeps deleted customers hidden from search', async () => {
  const customer = await createCustomer(orgA, { code: 'KH123' });
  await softDeleteCustomer(customer.id);

  const results = await searchCustomers(orgA, 'KH123');
  expect(results).toHaveLength(0);
});
```

## 🛠️ Tooling Recommendations
- Run `prisma validate` whenever relations are renamed.
- Integrate `pnpm test:e2e` into CI nightly builds.
- Use `git status -sb` frequently to check for uncommitted work.

## 🔄 Feedback Loop
1. Capture incident.
2. Log root cause + fix here.
3. Update AGENTS.md if onboarding guidance changes.
4. Share summary in team standup + issue tracker.

---
