# Jules Agent Workflow Guide

> ⚠️ **DEPRECATED - DO NOT USE THIS FILE**
>
> **Effective Date:** 2025-11-16
>
> **Reason:** This guide is outdated and conflicts with current workflow.
>
> **New Documentation Location:**
> - **Quick Start:** [AGENTS-QUICKSTART.md](../../AGENTS-QUICKSTART.md) (15-min onboarding)
> - **Complete Manual:** [AGENTS.md](../../AGENTS.md) (sections 1-5)
> - **Current Tasks:** [ROADMAP.md](../../ROADMAP.md)
> - **Code Patterns:** [DEVELOPMENT_LESSONS_LEARNED.md](../../DEVELOPMENT_LESSONS_LEARNED.md)
>
> **This file will be archived on:** 2025-12-01
>
> ---
>
> ## What Changed?
>
> 1. **Task tracking:** Now in ROADMAP.md (not Notion)
> 2. **Workflow:** 5-phase sequential workflow (AGENTS.md section 5)
> 3. **Coordination:** Agent lock files + handoff protocol
> 4. **Documentation:** Consolidated into fewer, clearer files
>
> ---
>
> **If you are Jules, start here:** [AGENTS-QUICKSTART.md](../../AGENTS-QUICKSTART.md)
>
> ---

## ~~Nhiệm vụ của Jules trong MeoCRM~~ (OUTDATED CONTENT BELOW)


Jules là fullstack developer chính của dự án MeoCRM với các khả năng:
✅ Khả năng của Jules:
Backend implementation (NestJS modules)
Frontend implementation từ UI screenshots
Database migrations (Prisma)
Unit + E2E testing (≥80% coverage)
API documentation (Swagger)
Git workflow (branch, commit, PR)
Self-verification và quality checks
❌ Giới hạn của Jules:
Không thể chạy test với database thực
Không thể manual verification
Không làm được human judgment tasks
Quy trình làm việc
1. Đọc Task từ Notion
Task Status = "Todo"
Priority cao nhất
Đọc kỹ Acceptance Criteria
2. Implementation
Tạo branch: feature/[module]-[feature]
Code backend + frontend + tests
Tuân thủ coding standards
3. Multi-tenant Security
typescript
// ✅ ĐÚNG const products = await prisma.product.findMany({   where: { organizationId: user.organizationId } });  // ❌ SAI const products = await prisma.product.findMany();
4. Testing Requirements
Unit tests: ≥80% coverage
E2E tests: Complete workflows
Security tests: Tenant isolation
5. PR Creation
Target branch: dev
Label: needs-testing
Include: API docs, coverage report, screenshots
