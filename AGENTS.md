# MeoCRM Agent Instructions

This document provides essential instructions for AI agents to work on the MeoCRM project.

## 1. Onboarding: Environment Setup

To set up the development environment from a clean state, run the following command from the project root. This script is idempotent and can be re-run safely.

```bash
./setup-jules-vm.sh
```

After the script completes, you must copy the environment files:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
```

## 2. Knowledge Base

This project has complex business logic. Before starting any task, consult these documents in the `/docs` directory:

1.  **[01_BUSINESS_LOGIC.md](./docs/01_BUSINESS_LOGIC.md)**: **(MANDATORY READING)** Contains all business rules for orders, inventory, payments, etc. All implemented logic must strictly follow this document.
2.  **[02_IMPLEMENTATION_PLAN.md](./docs/02_IMPLEMENTATION_PLAN.md)**: To understand task priorities and dependencies.
3.  **[03_DATABASE_SCHEMA.md](./docs/03_DATABASE_SCHEMA.md)**: For referencing Prisma models.
4.  **[04_API_REFERENCE.md](./docs/04_API_REFERENCE.md)**: For existing API endpoints.

For module-specific instructions, see the `AGENTS.md` file within that module's directory (e.g., `apps/api/AGENTS.md`).

### How to read the docs

1. Bắt đầu ở `docs/00_PROJECT_OVERVIEW.md` để hiểu context + glossary.
2. Đọc `docs/01_BUSINESS_LOGIC.md` mục liên quan **trước khi** đụng tới code (Lead Priority, Commission... có ví dụ I/O rõ ràng).
3. Kiểm tra `docs/architecture/README.md` để xem flow/sequence mới.
4. Tra cứu `docs/03_DATABASE_SCHEMA.md` nhằm đồng bộ type/enum trước khi chỉnh Prisma.
5. Sau khi cập nhật docs, phản chiếu thay đổi vào code/tests rồi đánh dấu tại PR checklist.

## 3. Testing

Run the entire test suite to ensure your changes have not broken existing functionality.

```bash
pnpm test
```

All new features must include corresponding tests with sufficient coverage.

## 4. Critical Rules & Workflow

-   **CRITICAL RULE: Multi-Tenancy:** Every database query that accesses tenant-specific data **MUST** be filtered by `organizationId`.
    ```typescript
    // CORRECT
    await prisma.product.findMany({
      where: { organizationId: user.organizationId },
    });
    ```
-   **Guardrails đa-tenant chi tiết:**
    - RequestContext middleware **phải** được khởi tạo ngay đầu request/cron để gắn `organizationId`, `userId`, `traceId`.
    - Không bypass Prisma middleware; nếu viết raw SQL hãy inject `organizationId` thủ công + kèm unit test đảm bảo isolation.
    - Các event/cron đa-tenant phải lặp từng organization (`for await (org of organizations) { withOrganizationContext(...); }`).
    - API error response luôn theo `{ code, message, details?, traceId }` để hỗ trợ audit multi-tenant.
-   **Workflow:**
    1.  Select a task based on `docs/02_IMPLEMENTATION_PLAN.md`.
    2.  Read the relevant sections in `docs/01_BUSINESS_LOGIC.md`.
    3.  Implement the feature and associated tests.
    4.  Run `pnpm test` to verify.
    5.  Create a Pull Request.

## 5. Troubleshooting

If you encounter environment or database connection issues, refer to:
*   **[06_TROUBLESHOOTING.md](./docs/06_TROUBLESHOOTING.md)**

## 6. Pull Request Checklist

- [ ] Link tới task + trích mục docs đã cập nhật/tuân thủ.
- [ ] Migration/DB thay đổi được mô tả + kèm hướng dẫn rollback.
- [ ] Tests: `pnpm -w test`, `pnpm -w build` (hoặc lý do skip) + output chính.
- [ ] Đảm bảo mọi API trả `{code,message,details?,traceId}` và query đã filter `organizationId`.
- [ ] Update Documentation Map / AGENTS nếu thêm khối kiến thức mới.
