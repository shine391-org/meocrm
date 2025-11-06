Jules Agent Workflow Guide
Nhiệm vụ của Jules trong MeoCRM
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
