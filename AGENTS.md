# MeoCRM Agent Instructions

This is the operations manual for Jules/Claude/Gemini when làm việc trên MeoCRM.

> 🚀 **New to the project?** Start with [AGENTS-QUICKSTART.md](./AGENTS-QUICKSTART.md) (15-min onboarding) before reading this full manual.

## 1. Onboarding / Environment
1. **Luôn dùng Jules VM snapshot đã chuẩn hóa.** Mọi package, Docker và env đã cấu hình sẵn từ Jules GUI → không tự chạy `setup-jules-vm.sh`.
2. **Kiểm tra Docker services** (Postgres 17 @ 2001, Redis 8 @ 2002):
   ```bash
   sudo docker ps
   sudo docker compose -f /tmp/meocrm-compose.yaml up -d db redis  # nếu thiếu container
   ```
3. **Đồng bộ Prisma khi schema đổi:**
   ```bash
   pnpm db:generate
   pnpm db:push
   ```
4. **Prebuild API client trước khi boot Next.js:**
   ```bash
   pnpm --filter @meocrm/api-client build
   ```
5. **Env**: Jules GUI profile phải chứa block chuẩn (xem README Appendix B hoặc `docs/ENVIRONMENT.md`). Không push `.env`.

> ❗ **Never run `setup-jules-vm.sh` bên trong VM** – script đã được Jules chạy sẵn khi snapshot tạo ra.

## 2. Knowledge Base & Project Status

### Must-Read Documentation (In Order):

| Priority | File | Purpose |
| --- | --- | --- |
| 🔴 1 | **[ROADMAP.md](./ROADMAP.md)** | **187 tasks breakdown, 30% complete, critical path, timeline estimates** |
| 🟠 2 | [docs/Documentation-Map.md](./docs/Documentation-Map.md) | Complete documentation index |
| 🟡 3 | [docs/settings/README.md](./docs/settings/README.md) | Precedence, feature flags, config JSON |
| 🟡 4 | [docs/01_BUSINESS_LOGIC.md](./docs/01_BUSINESS_LOGIC.md) | Business rules, Lead Priority, Commission, etc. |
| 🟢 5 | [docs/integration/README.md](./docs/integration/README.md) | REST/Webhook/MCP/WS integrations |
| 🟢 6 | [docs/testing/Strategy-&-Coverage.md](./docs/testing/Strategy-&-Coverage.md) | Coverage ≥80%, E2E strategy |
| 🟢 7 | [docs/03_DATABASE_SCHEMA.md](./docs/03_DATABASE_SCHEMA.md) | Data dictionary, PII, soft delete |

### Current Project Status (2025-11-16):

**Progress:** 56/187 tasks done (30%) | 150/400 story points (38%)

**Critical Path (Currently Blocking):**
1. 🔴 **Frontend Auth (Batch 1C)** - 7 tasks - Waiting on design screenshots
2. 🔴 **Products CRUD (Batch 2A)** - 10 tasks - In Progress (Jules)
3. 🔴 **Categories (Batch 2B)** - 4 tasks - In Progress (Jules)
4. 🔴 **Product Variants (Batch 2C)** - 4 tasks - In Progress (Jules)

**Phase Status:**
- ✅ Phase 1 (Foundation & Auth): 78% complete
- 🔄 Phase 2 (Products & Inventory): 15% complete - **Current Focus**
- 🔄 Phase 3 (CRM Core): 25% complete
- 📋 Phase 4 (Orders & POS): Blocked on Phase 2
- 📋 Phase 5 (Finance): Planned

**See [ROADMAP.md](./ROADMAP.md) for complete breakdown.**

Module-specific hướng dẫn xem `apps/*/AGENTS.md`.

## 3. Testing Expectations
- `pnpm -w test` trước khi push; thêm `-- --runInBand` nếu cần.
- Golden E2E: login → create product → POS order → stock giảm (tham khảo docs/testing).
- Viết/giữ skeleton cho decay/reset/override/tier/refund/error.
- Coverage tối thiểu 80% (CI fail nếu thấp).

## 4. Guardrails, Workflow & Events
- **Multi-tenant:** không query nếu thiếu `organizationId`. Prisma middleware đã inject; raw SQL phải tự filter.
- **Error shape:** luôn `{code,message,details?,traceId}` (OpenAPI `components.schemas.Error`).
- **Events:** dùng prefix canonical `order.*`, `shipping.*`, `inventory.*`, `commission.*` như trong docs/integration.
- **Settings-driven:** mọi quyết định #34–#48 đọc từ Settings (leadPriority, commission, refund, shipping, notifications). Không hard-code 7/30/60 hay 500k.
- **Workflow chuẩn:**
  1. Đọc Documentation Map → Settings → Business Logic → Integration → Testing.
  2. Mapping config (nếu cần override) từ Admin Settings console.
  3. Code + test.
  4. Update docs (nếu logic đổi) rồi PR.

### Prompt Templates & MEOW
- **MEOW (Mission, Evidence, Output, Warnings):**
  - *Mission*: mô tả yêu cầu + mục tiêu.
  - *Evidence*: link/tài liệu đã đọc (Documentation Map anchors).
  - *Output*: định dạng mong muốn (code, doc, PR note).
  - *Warnings*: constraint (multi-tenant, feature flag, error schema).
- Khi viết prompt/PR comment, đảm bảo 4 phần này để teammate/agent khác takeover nhanh.

### Where to configure?
- Settings console (Admin UI) hoặc seed config `docs/settings/README.md`.
- Sample JSON (Lead/Commission/Refund/Shipping/Notifications/Audit) nằm ngay trong docs/settings – trích dẫn khi mở PR.
- Nếu cần override tạm thời (tenant-specific), ghi rõ scope trong PR (vd: `scope: { tenantId: org_01, branchId: br_02 }`).

## 5. Agent Coordination Protocol - Option 3: Claude Solo + Jules CI/CD

**Context:** Solo operation (1 người control agents). Unlimited usage budget (Pro tier). Ưu tiên highest quality + zero conflicts.

**Rationale:**
- **Claude Code:** High context (1M tokens), proven quality → Primary developer
- **Jules VM:** Pre-configured environment → Automated test runner (CI/CD role)
- **Gemini CLI:** Optional for complex docs polish

### Core Principle: "Claude Builds, Jules Validates"

```
Phase 1: PLAN (You + Claude)
    ↓
Phase 2-4: CLAUDE SOLO (Implement + Test + Document)
    - Write code following DEVELOPMENT_LESSONS_LEARNED.md
    - Write tests
    - Update docs
    - Push to feature branch
    ↓
Phase 5: JULES CI/CD (Automated Validation)
    - Auto-checkout branch in VM
    - Run full test suite in real environment
    - Report results as PR comment
    ↓
Phase 6: MERGE (You)
    - Review PR + Jules test report
    - Merge if green
```

**Key Benefits:**
- ✅ No handoff complexity → zero coordination overhead
- ✅ Claude high-context → understands full project
- ✅ Jules automated → catches environment-specific issues
- ✅ Simplest workflow → lowest conflict rate

### 🔒 Conflict Prevention (Option 3 Specific)

| Root Cause | Impact | How Option 3 Solves It |
|------------|--------|------------------------|
| **#1 Parallel Development** | High - merge conflicts | ✅ Only Claude works → no parallel edits |
| **#2 Documentation Lag** | Critical - wrong implementations | ✅ Claude updates docs in same commit |
| **#3 Inconsistent Standards** | Medium - rework loops | ✅ Claude internalizes all 10 lessons (1M context) |
| **#4 No Handoff Checkpoints** | High - cascading failures | ✅ Jules validates before merge (automated gate) |

**Additional safeguard:** No `.agent-lock.json` needed (single developer model)

### Phase-by-Phase Workflow (Option 3)

#### **Phase 1: PLAN (You + Claude Code)** 📋

**Prerequisites:**
```bash
# Check current state
git status  # Clean working tree
git pull origin dev  # Latest code
```

**Actions:**
1. **You:** Review `ROADMAP.md` critical path, select task
2. **You:** Provide context to Claude:
   ```
   Implement PROD-001: Products CRUD Backend
   - Priority: High
   - Blocking: Frontend products UI
   - Context: ROADMAP.md lines 150-160, Business Logic section 4.2
   ```

3. **Claude:** Acknowledge + Load Context:
   - Read ROADMAP.md task details
   - Read relevant docs (Business Logic, API Reference)
   - Review DEVELOPMENT_LESSONS_LEARNED.md (all 10 lessons)
   - Check existing code patterns

**Handoff:** Claude confirms understanding → proceed to Phase 2

---

#### **Phase 2-4: CLAUDE SOLO (Implement + Test + Document)** 💻

**Who:** Claude Code only

**Context Loading (5-10 min):**
```
Claude loads into context:
1. ROADMAP.md task description (~50 lines)
2. Relevant Business Logic sections (~200-500 lines)
3. DEVELOPMENT_LESSONS_LEARNED.md (all 10 lessons ~400 lines)
4. Existing code patterns (find similar modules ~300 lines)
5. Database schema (if needed ~100-200 lines)

Total context: ~1,000-1,500 lines (~12-18k tokens)
Available context: 1M tokens
→ Still have 98% context for implementation
```

**Implementation Steps:**

**Step 1: Create Feature Branch**
```bash
git checkout -b feature/PROD-001-products-crud
```

**Step 2: Generate Code (following all 10 lessons)**

Claude writes code using available tools:
- `Write` tool for new files
- `Edit` tool for modifications
- Follows DEVELOPMENT_LESSONS_LEARNED.md patterns automatically

**Checklist during coding:**
- [ ] **Lesson #1:** Response format `{ data: T }` or `{ data: T[], meta }`
- [ ] **Lesson #2:** URL prefix `/api` (global prefix set)
- [ ] **Lesson #3:** Error format `{code, message, traceId}`
- [ ] **Lesson #4:** No Next.js client redirects (server-side only)
- [ ] **Lesson #5:** Prisma generated types
- [ ] **Lesson #6:** OrganizationGuard on all endpoints
- [ ] **Lesson #7:** Soft delete with `deletedAt`
- [ ] **Lesson #8:** Server actions for Next.js mutations
- [ ] **Lesson #9:** No hardcoded values (use Settings)
- [ ] **Lesson #10:** Consistent patterns across modules

**Step 3: Write Tests**

Claude writes:
- Unit tests for service layer
- Integration tests for controllers
- Coverage target: ≥80%

**Example test structure:**
```typescript
describe('ProductsService', () => {
  // Happy path
  it('should create product with valid data', async () => {
    const result = await service.create(dto, orgId);
    expect(result.data).toHaveProperty('id');
  });

  // Error cases
  it('should throw when organizationId missing', async () => {
    await expect(service.create(dto, null)).rejects.toThrow();
  });

  // Multi-tenant isolation
  it('should not access other org products', async () => {
    const result = await service.findAll(otherOrgId);
    expect(result.data).toHaveLength(0);
  });
});
```

**Step 4: Update Documentation**

Claude updates in same workflow:
- ROADMAP.md - Mark task in-progress → completed
- API_REFERENCE.md - Add new endpoints (if needed)
- CHANGELOG.md - Add entry under [Unreleased]

**Step 5: Commit & Push**

```bash
# Claude stages changes
git add apps/api/src/products/
git add ROADMAP.md
git add docs/04_API_REFERENCE.md (if changed)

# Claude commits with proper format
git commit -m "feat(products): implement CRUD backend API

- Add ProductsController with 5 endpoints (GET, POST, PUT, DELETE)
- Implement ProductsService with OrganizationGuard
- Add unit tests (85% coverage)
- Follow all DEVELOPMENT_LESSONS_LEARNED.md patterns
- Update ROADMAP.md and API reference

Implements: PROD-001
Related: ROADMAP.md lines 150-160

🤖 Generated by Claude Code"

# Push to remote
git push origin feature/PROD-001-products-crud
```

**Step 6: Create Pull Request**

```bash
gh pr create \
  --title "feat(products): CRUD backend API (PROD-001)" \
  --base dev \
  --body "$(cat <<'EOF'
## Summary
Implements Products CRUD backend API with 5 REST endpoints.

## Changes
- **ProductsController** (150 lines)
  - GET /api/products - List with pagination
  - GET /api/products/:id - Get single product
  - POST /api/products - Create product
  - PUT /api/products/:id - Update product
  - DELETE /api/products/:id - Soft delete product

- **ProductsService** (200 lines)
  - Business logic layer
  - OrganizationGuard enforcement
  - Prisma queries with multi-tenant filtering

- **Tests** (120 lines)
  - 15 unit tests (happy path + errors + multi-tenant)
  - Coverage: 85%

## DEVELOPMENT_LESSONS_LEARNED.md Compliance
- [x] Lesson #1: Response format `{ data: T }`
- [x] Lesson #2: URL prefix `/api`
- [x] Lesson #3: Error format `{code, message, traceId}`
- [x] Lesson #6: OrganizationGuard applied
- [x] Lesson #9: No hardcoded values

## Documentation Updates
- [x] ROADMAP.md - Task PROD-001 marked completed
- [x] API_REFERENCE.md - 5 endpoints documented

## Testing
Local tests (Claude environment - may differ from VM):
```
✅ products.service.spec.ts (15 tests passed)
✅ products.controller.spec.ts (10 tests passed)
```

**⚠️ Awaiting Jules CI/CD validation in real VM environment**

## Related
- Implements: PROD-001 from ROADMAP.md
- Blocks: Frontend products UI (Batch 2A)
- Depends on: Database schema (already merged)

---

**Next Step:** Jules will auto-validate in VM environment (Phase 5)

🤖 Generated by Claude Code
EOF
)" \
  --label "needs-vm-validation"
```

**Completion Criteria:**
- ✅ Code follows all 10 lessons
- ✅ Tests written (may not run locally due to environment)
- ✅ Docs updated
- ✅ PR created with detailed description
- ⏳ Waiting for Jules VM validation (Phase 5)

---

#### **Phase 5: JULES CI/CD (Automated Validation)** 🤖

**Who:** Jules VM (automated test runner)

**Trigger:** Manual (You tell Jules to test PR #123)

**Jules Workflow (Script-based, Low Context Needed):**

**Script 1: Setup Environment**
```bash
#!/bin/bash
# jules-ci.sh - Run by Jules in VM

set -e

PR_NUMBER=$1

echo "🤖 Jules CI/CD - PR #${PR_NUMBER} Validation"
echo "=============================================="

# 1. Fetch PR branch
echo "📥 Fetching PR branch..."
gh pr checkout ${PR_NUMBER}
BRANCH_NAME=$(git branch --show-current)
echo "✅ Checked out: ${BRANCH_NAME}"

# 2. Sync environment
echo "🔄 Syncing environment..."
pnpm db:generate
pnpm --filter @meocrm/api-client build
echo "✅ Environment ready"

# 3. Install dependencies (if package.json changed)
if git diff --name-only origin/dev | grep -q "package.json"; then
  echo "📦 Installing dependencies..."
  pnpm install
fi

# 4. Run build
echo "🏗️ Building..."
pnpm -w build
if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi
echo "✅ Build successful"

# 5. Run full test suite
echo "🧪 Running tests..."
pnpm -w test --coverage > /tmp/test-results.txt 2>&1
TEST_EXIT_CODE=$?

# 6. Parse results
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo "✅ All tests passed"
  TESTS_STATUS="✅ PASSED"
else
  echo "❌ Tests failed"
  TESTS_STATUS="❌ FAILED"
fi

# 7. Extract coverage
COVERAGE=$(grep "% Stmts" /tmp/test-results.txt | tail -1 || echo "N/A")

# 8. Post results to PR
gh pr comment ${PR_NUMBER} --body "$(cat <<EOF
## 🤖 Jules CI/CD Report

**Branch:** \`${BRANCH_NAME}\`
**Status:** ${TESTS_STATUS}
**Timestamp:** $(date -Iseconds)

### Environment
- ✅ Docker: postgres@2001, redis@2002 running
- ✅ Build: Successful
- ✅ Dependencies: Up to date

### Test Results
\`\`\`
$(cat /tmp/test-results.txt)
\`\`\`

### Coverage
${COVERAGE}

---

**Validation:** $([ $TEST_EXIT_CODE -eq 0 ] && echo "APPROVED ✅" || echo "CHANGES REQUESTED ❌")

$([ $TEST_EXIT_CODE -eq 0 ] && echo "Ready for merge 🚀" || echo "Please fix failing tests before merging ⚠️")

🤖 Automated by Jules VM CI/CD
EOF
)"

echo "✅ Results posted to PR #${PR_NUMBER}"
exit $TEST_EXIT_CODE
```

**Jules Actions (Manual Steps):**

1. **You tell Jules:** "Test PR #123"

2. **Jules runs script:**
```bash
cd /path/to/meocrm
bash jules-ci.sh 123
```

3. **Jules reports back:** PR comment with full test results

**Success Criteria:**
- ✅ Build passes
- ✅ All tests green
- ✅ Coverage ≥80%
- ✅ No environment-specific issues

**If tests fail:**
- Jules posts detailed error log
- Claude reviews errors
- Claude fixes in new commit
- Jules re-runs validation

---

#### **Phase 6: MERGE (You)** 🚀

**Who:** You (human final approval)

**Prerequisites:**
- ✅ PR created by Claude
- ✅ Jules CI/CD report shows green
- ✅ Code review done (by you or Claude self-review)

**Actions:**

1. **Review PR on GitHub UI:**
   - Check Claude's implementation description
   - Review Jules test results
   - Spot-check critical files (controllers, services)

2. **Verify ROADMAP.md updated:**
   - Task marked as completed
   - Time estimate recorded (optional)

3. **Merge via GitHub UI:**
   - Click "Merge pull request"
   - Use "Squash and merge" or "Merge commit" (your preference)
   - Delete branch after merge

4. **Post-merge cleanup (local):**
```bash
git checkout dev
git pull origin dev
git branch -d feature/PROD-001-products-crud  # Delete local branch
```

5. **Update tracking (optional):**
```bash
# If you track completion time
echo "PROD-001: Completed in 2.5 hours (Claude 2h + Jules 30min)" >> task-log.txt
```

**Next:** Select next task from ROADMAP.md → back to Phase 1

---

### 📊 Time Estimates (Option 3)

| Task Complexity | Phase 1 (Plan) | Phase 2-4 (Claude Solo) | Phase 5 (Jules CI) | Total |
|----------------|---------------|------------------------|-------------------|-------|
| **Simple** (CRUD single entity) | 5-10 min | 1-1.5h | 15-20 min | **1.5-2h** |
| **Medium** (Full module + relations) | 10-15 min | 3-4h | 20-30 min | **3.5-5h** |
| **Complex** (Multi-module + business logic) | 15-20 min | 6-8h | 30-45 min | **7-9h** |

**Daily Throughput (8h workday):**
- **Simple tasks:** 3-4 tasks/day
- **Medium tasks:** 1-2 tasks/day
- **Complex tasks:** 1 task/day
- **Mixed:** 1 complex + 1-2 simple OR 2 medium

**Comparison with old workflow (Jules primary):**
| Metric | Old (Jules Primary) | New (Claude Solo) | Improvement |
|--------|-------------------|------------------|-------------|
| Time per simple task | 2-3h | 1.5-2h | **25-33% faster** |
| First-time-right rate | ~70% (28/309 tests failing) | ~95%+ (est.) | **+25% quality** |
| Rework iterations | 2-3 rounds (fix tests) | 0-1 rounds | **50-66% less** |
| Conflicts | High (parallel work) | Zero (solo dev) | **100% reduction** |

---

### 🛡️ Enforcement Mechanisms (Option 3 Specific)

#### **1. Claude Self-Check Template**

Before pushing, Claude runs mental checklist:

```markdown
## Pre-Push Checklist (Claude Internal)

### Code Quality (DEVELOPMENT_LESSONS_LEARNED.md)
- [ ] Response format: `{ data: T }` ✅
- [ ] OrganizationGuard on controllers ✅
- [ ] No hardcoded values ✅
- [ ] Error format: `{code, message, traceId}` ✅
- [ ] Soft delete with deletedAt ✅

### Testing
- [ ] Unit tests written ✅
- [ ] Integration tests written ✅
- [ ] Coverage target ≥80% ✅
- [ ] Multi-tenant isolation tested ✅

### Documentation
- [ ] ROADMAP.md updated ✅
- [ ] API_REFERENCE.md updated (if new endpoints) ✅
- [ ] CHANGELOG.md updated ✅
- [ ] Code comments/JSDoc added ✅

### Git
- [ ] Commit message follows format ✅
- [ ] Branch name descriptive ✅
- [ ] PR description detailed ✅

If ANY checkbox unchecked → DO NOT PUSH
```

#### **2. Jules Automated Gate**

Jules acts as automated quality gate:
- ❌ Tests fail → Block merge (PR status: "Changes requested")
- ✅ Tests pass → Approve merge (PR status: "Approved")

**No human intervention needed for test validation**

#### **3. No Lock Files Needed**

Since only Claude develops:
- ✅ No `.agent-lock.json` needed
- ✅ No coordination overhead
- ✅ No merge conflicts

---

### 📞 Communication Channels (Option 3 Simplified)

| Channel | Purpose | Who Uses |
|---------|---------|----------|
| **GitHub PRs** | Code review + Jules test results | Claude creates, Jules comments, You merge |
| **ROADMAP.md** | Task status tracking | Claude updates in every commit |
| **Slack/Discord** (optional) | You notify Claude of new tasks | You only |

**Removed:**
- ~~GitHub Issues~~ (not needed, direct task assignment)
- ~~`.agent-lock.json`~~ (single developer)
- ~~Agent Handoff Reports~~ (no handoff)

---

### ⚡ Optimization Tips (Maximize Speed)

**For Claude (Unlimited usage):**

1. **Parallel tool calls:**
   - Read multiple files at once
   - Edit multiple files in single response
   ```
   Read ROADMAP.md + Business Logic + existing code → all in parallel
   ```

2. **Context reuse:**
   - Keep DEVELOPMENT_LESSONS_LEARNED.md in context across tasks
   - Load Business Logic once, reference for multiple tasks

3. **Batch similar tasks:**
   - If doing 3 CRUD entities → do them in sequence without reloading docs

**For Jules (Unlimited usage):**

1. **Keep VM warm:**
   - Docker services always running
   - Dependencies pre-installed
   - Database seeded with test data

2. **Test parallelization:**
   ```bash
   pnpm -w test --maxWorkers=4  # Use VM cores
   ```

3. **Incremental testing:**
   - If only backend changed → skip frontend tests
   ```bash
   pnpm --filter @meocrm/api test  # Faster
   ```

---

### 🚨 Escalation Paths

**Issue Type** | **Action**
---|---
Claude stuck on implementation | You provide more context / pair program
Jules tests fail (environment issue) | You debug VM / reset Docker
Jules tests fail (code issue) | Claude fixes in new commit → Jules re-test
Merge conflict (rare in solo dev) | Claude rebases on latest dev
Unclear requirements | You clarify + update ROADMAP.md

---

### 🎯 Success Metrics (Track Weekly)

| Metric | Target | How to Measure |
|--------|--------|---------------|
| Tasks completed | 15-20/week | Count ROADMAP.md checkmarks |
| First-time-right rate | ≥90% | Jules test pass rate |
| Average task time | <3h (simple), <5h (medium) | Track PR creation to merge time |
| Rework iterations | ≤1 per task | Count commits per PR |
| Test coverage | ≥80% | Jules CI report |
| Conflicts | 0 | Git log (should be clean) |

**Review every Friday:** Adjust workflow if metrics below target

---

## 6. Troubleshooting
## 6. Troubleshooting
Xem [docs/06_TROUBLESHOOTING.md](./docs/06_TROUBLESHOOTING.md) cho lỗi môi trường, Postgres, Redis, hoặc docker.

## 7. Pull Request Checklist
- [ ] Trích dẫn doc anchor (Business Logic / Settings / Integration) trong mô tả PR.
- [ ] Nêu rõ settings/feature flag nào ảnh hưởng (default + override path).
- [ ] Nếu đụng DB schema: mô tả migration + rollback (nhắc migrate reset chỉ local, prod dùng migrate deploy).
- [ ] Tests: `pnpm -w build`, `pnpm -w test` (đính kèm log chính).
- [ ] Error contract + multi-tenant guardrails giữ nguyên.
- [ ] Update Documentation Map nếu thêm file mới.
- [ ] Link tới config mẫu (hoặc note “no config change”).
