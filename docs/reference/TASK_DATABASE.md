# MeoCRM - Task Tracking Database

**Ngày tạo:** 19 Nov 2025
**Lần cuối cập nhật:** 20 Nov 2025 - Cập nhật AC và liên kết BL cho nhiều nhiệm vụ.

---

## 📈 Tổng Quan Dự Án

### Thống Kê Tổng Thể
- **✅ Complete:** 56 tasks
- **🔄 In Progress:** 40 tasks
- **⏳ Todo:** 91 tasks
- **Tổng cộng:** 187 tasks

### Phân bổ theo Phase
- **Phase 1 - Foundation & Auth:** 48 tasks
- **Phase 2 - Products & Inventory:** 39 tasks
- **Phase 3 - CRM Core:** 23 tasks
- **Phase 4 - Supplier Management:** 7 tasks
- **Phase 5 - POS & Orders:** 30 tasks
- **Phase 6 - Finance:** 10 tasks
- **Phase 7 - Reports:** 8 tasks
- **Phase 8 - Integrations:** 21 tasks

### Mức độ ưu tiên
- **🔴 Critical:** 48 tasks
- **🟠 High:** 83 tasks
- **🟡 Medium:** 50 tasks
- **⚪ Low:** 6 tasks

---

## 🎯 Phase 1 - Foundation & Auth (48 tasks)

### ✅ Completed
- **Authentication Module**
  - `AUTH-001`: JWT Authentication System
  - `AUTH-001`: Setup AuthModule
  - `AUTH-002`: Implement register endpoint
  - `AUTH-003`: Implement login endpoint
  - `AUTH-004`: Implement JWT strategy
  - `AUTH-005`: Auth unit tests
  - `AUTH-006`: Create JwtAuthGuard
  - `AUTH-007`: Create @apps/api/src/auth/decorators/public.decorator.ts() decorator
  - `AUTH-008`: Create @CurrentUser() decorator
  - `FIX-001`: Fix /auth/me 500 Error
- **Infrastructure**
  - `CORE-001`: PrismaModule & ConfigModule Setup
  - `DB-001`: Database Schema & Migration
  - `DB-001`: Install & configure Prisma
  - `DB-002`: Copy full database schema
  - `DB-003`: Create initial migration
  - `DB-004`: Create seed script with sample data
  - `INFRA-001`: Setup pnpm monorepo structure
  - `INFRA-002`: Configure Prettier + ESLint
  - `INFRA-003`: Setup GitHub Actions CI/CD
  - `INFRA-004`: Docker Compose Multi-Environment Setup
  - `INFRA-004`: Environment variables setup
  - `INFRA-005`: Environment Configuration Files
  - `INFRA-006`: Environment Management Scripts
  - `INFRA-007`: Health Check & Verification Script
  - `INFRA-008`: Fix Infrastructure Ports Configuration
  - `INFRA-009`: Add database management scripts
  - `P4-001`: Phase 4 - Infrastructure Verification & Fixes
  - `P4-BUG-001`: Fix Redis Docker Exec Timeout
  - `P4-BUG-002`: Fix Database Table Name Mismatch
  - `P4-003`: Verify Docker Network Configuration
- **Security**
  - `SEC-003`: Organization Registration Security
- **Documentation**
  - `DOC-004`: Create nested AGENTS.md files

### 🔄 In Progress
- **Frontend Auth**
  - `FE-001`: Frontend: Login page
  - `FE-002`: Frontend: Register page
  - `FE-003`: Frontend: Auth context & hooks
  - `FE-004`: Frontend: Layout component
  - `FE-005`: Frontend: Sidebar navigation
  - `FE-006`: Frontend: Header component
  - `FE-007`: Frontend: Responsive design

### ⏳ Todo
- **`SEC-002`: Multi-tenant Security Audit (CRITICAL)**
  - **Vấn đề:** Đây là **rủi ro bảo mật nghiêm trọng**. Code đang cách ly dữ liệu người dùng một cách thủ công trong từng câu lệnh query, thay vì dùng một middleware tự động như tài liệu mô tả. Điều này rất dễ xảy ra lỗi và làm rò rỉ dữ liệu.
  - **Acceptance Criteria:**
    ```markdown
    - Tạo một `PrismaClient` mở rộng (extended) với một middleware.
    - Middleware này phải tự động lấy `organizationId` từ `RequestContext` của mỗi request.
    - Middleware phải tự động thêm điều kiện `where: { organizationId: '...' }` vào tất cả các lệnh `find`, `update`, `delete`, v.v., cho các model có `organizationId`.
    - Cần có cơ chế để bỏ qua middleware này cho các query ở cấp độ hệ thống (không thuộc về organization nào).
    - **Test Case:** Tạo 2 organization (A và B) và 2 sản phẩm tương ứng. Khi user của Org A gọi `GET /products`, API chỉ được trả về sản phẩm của Org A.
    ```
  - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
    - Mục 7.1: `Organization Isolation`
- **Testing**
  - `TEST-001`: E2E: Test database setup
    - **Acceptance Criteria:**
      ✅ Module setup: Test database created and accessible for E2E tests.
      ✅ Entities: All necessary Prisma models are available for testing.
      ✅ DTOs: N/A.
      ✅ Service: N/A.
      ✅ Controller: N/A.
      ✅ Tests: Setup E2E test environment for multi-tenant scenarios.
      ✅ Business Logic: Database setup supports multi-tenant test cases where separate organizations have isolated data.
      ✅ Multi-tenant: Test database is configured to isolate data by `organizationId` for each test suite.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: N/A.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 7.1: `Organization Isolation`
  - `TEST-002`: E2E: Auth flow tests
    - **Acceptance Criteria:**
      ✅ Module setup: Auth module is functional in E2E environment.
      ✅ Entities: `User` and `RefreshToken` models are correctly handled.
      ✅ DTOs: Auth-related DTOs are valid.
      ✅ Service: `AuthService` methods are tested.
      ✅ Controller: Auth endpoints are tested (login, register, me, refresh, logout).
      ✅ Tests: Unit ≥80%, E2E [Login with valid/invalid creds, session persistence, logout].
      ✅ Business Logic: Authentication rules are followed (JWT token generation, password hashing, session management).
      ✅ Multi-tenant: Users can only log in to their own organization.
      ✅ Soft delete: N/A.
      ✅ Error format: Error responses adhere to standard format.
      ✅ API docs: Swagger annotations present for auth endpoints.
      ✅ Settings: JWT secrets are loaded from settings/environment.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 7.1: `Organization Isolation`
      - Mục 1.1: `Order Processing Rules` (if auth affects order creation)
  - `TEST-005`: E2E: CI/CD integration
    - **Acceptance Criteria:**
      ✅ Module setup: CI/CD pipeline is configured to run E2E tests.
      ✅ Entities: N/A.
      ✅ DTOs: N/A.
      ✅ Service: N/A.
      ✅ Controller: N/A.
      ✅ Tests: E2E tests are part of the CI/CD pipeline, and build fails if E2E tests fail.
      ✅ Business Logic: N/A.
      ✅ Multi-tenant: N/A.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: N/A.
- **Documentation**
  - `DOC-001`: Install @nestjs/swagger
    - **Acceptance Criteria:**
      ✅ Module setup: `@nestjs/swagger` is installed and configured in `main.ts`.
      ✅ Entities: N/A.
      ✅ DTOs: N/A.
      ✅ Service: N/A.
      ✅ Controller: N/A.
      ✅ Tests: N/A.
      ✅ Business Logic: N/A.
      ✅ Multi-tenant: N/A.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: Swagger UI is accessible at `/api/docs`.
      ✅ Settings: N/A.
  - `DOC-002`: Add API decorators to all endpoints
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: N/A.
      ✅ DTOs: All DTOs are decorated with `@ApiProperty()`.
      ✅ Service: N/A.
      ✅ Controller: All controller methods are decorated with `@ApiOperation()`, `@ApiResponse()`, etc.
      ✅ Tests: N/A.
      ✅ Business Logic: N/A.
      ✅ Multi-tenant: N/A.
      ✅ Soft delete: N/A.
      ✅ Error format: Error responses are documented in Swagger.
      ✅ API docs: Swagger UI accurately reflects all API endpoints and their schemas.
      ✅ Settings: N/A.
  - `DOC-003`: Swagger authentication docs
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: N/A.
      ✅ DTOs: N/A.
      ✅ Service: N/A.
      ✅ Controller: N/A.
      ✅ Tests: N/A.
      ✅ Business Logic: N/A.
      ✅ Multi-tenant: N/A.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: Swagger UI includes JWT authentication setup.
      ✅ Settings: N/A.

---

## 🛍️ Phase 2 - Products & Inventory (39 tasks)

### ✅ Completed
- **Categories**
  - `CAT-001`: Setup CategoriesModule
    - **Trạng thái 2025-11-19:** ✅ Completed — Module wiring (controller + service + Prisma) khớp với triển khai thực.
    - **Cập nhật 2025-11-19:**
      - **Hành động:** Rà soát `CategoriesModule`/controller/service, xác nhận các endpoint CRUD + tree dùng multi-tenant guard và Prisma `$extends` đã sẵn sàng cho các module Products/Inventory.
      - **Kiểm thử:** `pnpm --filter @meocrm/api test -- categories.service.spec.ts`.
      - **Commit:** (pending — branch `feature/CAT-001-004-verification`).
      - **Trạng thái:** Sẵn sàng chờ review.
  - `CAT-002`: Categories CRUD with parentId
    - **Trạng thái 2025-11-19:** ✅ Completed — CRUD đã enforce `parentId`, kiểm tra tồn tại và soft delete.
    - **Cập nhật 2025-11-19:**
      - **Hành động:** Kiểm tra logic create/update/remove để đảm bảo validate cha cùng organization, cấm tự tham chiếu và bảo vệ dữ liệu con/sản phẩm.
      - **Kiểm thử:** `pnpm --filter @meocrm/api test -- categories.service.spec.ts`.
      - **Commit:** (pending — branch `feature/CAT-001-004-verification`).
      - **Trạng thái:** Sẵn sàng chờ review.
  - `CAT-003`: GET /categories nested tree
    - **Trạng thái 2025-11-19:** ✅ Completed — endpoint `/categories/tree` trả về cấu trúc 3 tầng với `_count` đúng theo tài liệu.
    - **Cập nhật 2025-11-19:**
      - **Hành động:** Xác nhận `findTree` lọc theo `organizationId`, include `_count.products`, và controller expose `GET /categories/tree`.
      - **Kiểm thử:** `pnpm --filter @meocrm/api test:e2e -- --runTestsByPath test/categories.e2e-spec.ts`.
      - **Commit:** (pending — branch `feature/CAT-001-004-verification`).
      - **Trạng thái:** Sẵn sàng chờ review.
  - `CAT-004`: Prevent circular references
    - **Trạng thái 2025-11-19:** ✅ Completed — áp dụng giới hạn 3 cấp + chặn move category xuống descendant.
    - **Cập nhật 2025-11-19:**
      - **Hành động:** Review `getCategoryLevel` + `isDescendant` và các guard trong `create`/`update` để ngăn vòng lặp & cảnh báo khi delete.
      - **Kiểm thử:** `pnpm --filter @meocrm/api test:e2e -- --runTestsByPath test/categories.e2e-spec.ts`.
      - **Commit:** (pending — branch `feature/CAT-001-004-verification`).
      - **Trạng thái:** Sẵn sàng chờ review.
- **Products**
  - `PROD-BUG-001`: Fix ProductsModule Schema Mismatch
  - `PROD-BUG-002`: Fix Missing Soft Delete Logic in Products

### 🔄 In Progress
- **Products CRUD**
  - `PROD-001`: ProductsModule - CRUD + Variants
  - `PROD-002`: GET /products endpoint
  - `PROD-003`: POST /products endpoint
  - `PROD-004`: GET /products/:id endpoint
  - `PROD-005`: PATCH /products/:id endpoint
  - `PROD-006`: DELETE /products/:id soft delete
  - `PROD-007`: Add pagination to GET /products
  - `PROD-008`: Add filters (category, price, stock)
  - `PROD-009`: Add search (name, SKU)
  - `PROD-010`: Add sorting
  - `PROD-011`: Products unit + E2E tests
  - `PROD-ADV-001`: Products Advanced Filtering - Backend
- **Product Variants**
  - `PROD-012`: Support variants in POST/PATCH products
  - `PROD-013`: SKU generation for variants
  - `PROD-014`: ProductVariant CRUD endpoints
  - `PROD-015`: Variants tests

### ⏳ Todo
- **`INV-005`: Inter-branch Transfer Workflow**
  - **Vấn đề:** Logic chuyển kho trong code đang là "tức thời", không phản ánh đúng thực tế hàng hóa cần thời gian vận chuyển.
  - **Acceptance Criteria:**
    ```markdown
    - Cần có entity `Transfer` với các trường: `fromBranchId`, `toBranchId`, `status` (`PENDING`, `IN_TRANSIT`, `RECEIVED`, `CANCELLED`), và `items`.
    ### 1. Tạo phiếu chuyển kho
    - Endpoint `POST /transfers` để tạo một phiếu chuyển kho mới với trạng thái là `PENDING`.
    - **Logic:** Không có thay đổi nào về tồn kho ở bước này.
    - **Test Case:** Gọi API tạo phiếu -> Xác nhận phiếu được tạo với status `PENDING` và tồn kho không đổi.

    ### 2. Xác nhận gửi hàng
    - Endpoint `POST /transfers/:id/ship` để xác nhận gửi hàng đi.
    - **Logic:**
      - Chuyển trạng thái phiếu thành `IN_TRANSIT`.
      - **Trừ tồn kho** của các sản phẩm tương ứng tại kho đi (`fromBranch`).
      - Phải báo lỗi nếu tồn kho tại kho đi không đủ.
    - **Test Case:** Với phiếu `PENDING`, gọi API gửi hàng -> Xác nhận status là `IN_TRANSIT` và tồn kho ở kho đi đã bị trừ.

    ### 3. Xác nhận nhận hàng
    - Endpoint `POST /transfers/:id/receive` để xác nhận đã nhận được hàng.
    - **Logic:**
      - Chuyển trạng thái phiếu thành `RECEIVED`.
      - **Cộng tồn kho** của các sản phẩm tương ứng vào kho đến (`toBranch`).
    - **Test Case:** Với phiếu `IN_TRANSIT`, gọi API nhận hàng -> Xác nhận status là `RECEIVED` và tồn kho ở kho đến đã được cộng.

    ### 4. Hủy phiếu chuyển kho
    - Endpoint `POST /transfers/:id/cancel` để hủy phiếu.
    - **Logic:**
      - Nếu hủy từ `PENDING`: Chỉ cần chuyển status thành `CANCELLED`.
      - Nếu hủy từ `IN_TRANSIT`: Chuyển status thành `CANCELLED` và **hoàn trả tồn kho** về cho kho đi (`fromBranch`).
    - **Test Case:** Tạo và gửi một phiếu (`IN_TRANSIT`), sau đó hủy phiếu đó -> Xác nhận tồn kho ở kho đi đã được hoàn trả lại như ban đầu.
    ```
  - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
    - Mục 3.4: `Inter-branch Transfer Rules`
- **Inventory Management**
  - `INV-001`: Setup InventoryModule
    - **Acceptance Criteria:**
      ✅ Module setup: `InventoryModule` created, registered in `AppModule`.
      ✅ Entities: N/A.
      ✅ DTOs: N/A.
      ✅ Service: `InventoryService` is created and accessible.
      ✅ Controller: N/A.
      ✅ Tests: Unit tests for basic service methods.
      ✅ Business Logic: N/A.
      ✅ Multi-tenant: Module supports multi-tenancy.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: N/A.
  - `INV-002`: GET inventory by branch
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: Fetches `Inventory` records.
      ✅ DTOs: `QueryInventoryDto` with `branchId` and pagination.
      ✅ Service: `InventoryService.getInventoryByBranch()` method.
      ✅ Controller: `GET /inventory` endpoint with `branchId` parameter.
      ✅ Tests: Unit tests for service, E2E test for endpoint.
      ✅ Business Logic: Inventory display rules (e.g., showing low stock).
      ✅ Multi-tenant: Endpoint filters inventory by `organizationId`.
      ✅ Soft delete: N/A.
      ✅ Error format: Standard error format for invalid `branchId`.
      ✅ API docs: Swagger annotations for `GET /inventory` endpoint.
      ✅ Settings: N/A.
  - `INV-003`: Stock adjustment endpoint
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: Creates `StockAdjustment` and `StockAdjustmentItem` records.
      ✅ DTOs: `CreateStockAdjustmentDto` with `branchId`, `productId`, `quantityChange`, `reason`.
      ✅ Service: `InventoryService.adjustStock()` method.
      ✅ Controller: `POST /inventory/adjust` endpoint.
      ✅ Tests: Unit tests for service, E2E test for endpoint.
      ✅ Business Logic: Prevention of negative stock (if rule allows).
      ✅ Multi-tenant: Adjustments are specific to `organizationId`.
      ✅ Soft delete: N/A.
      ✅ Error format: Standard error format.
      ✅ API docs: Swagger annotations.
      ✅ Settings: N/A.
  - `INV-004`: Low stock alerts
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: Reads `Product` and `Inventory` entities.
      ✅ DTOs: N/A.
      ✅ Service: `InventoryService.checkLowStock()` method.
      ✅ Controller: N/A (likely a background job or internal trigger).
      ✅ Tests: Unit tests for low stock detection logic.
      ✅ Business Logic: Defines "low stock" threshold (e.g., `Product.minStock`).
      ✅ Multi-tenant: Alerts are sent per organization.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: `Product.minStock` as configurable.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 3.3: `Low Stock Warnings`
  - `INV-006`: Stock Return on Order Cancel (CRITICAL) - *(Đã được định nghĩa trong `ORD-008`)*
  - `INV-007`: Negative Stock Prevention
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: N/A.
      ✅ DTOs: N/A.
      ✅ Service: All stock-modifying services (`InventoryService`, `OrderService`, `TransferService`) must prevent negative stock.
      ✅ Controller: N/A.
      ✅ Tests: Unit tests for all stock deduction paths ensure stock never goes below zero.
      ✅ Business Logic: Explicit rule: stock must not be negative (`stock < 0`).
      ✅ Multi-tenant: N/A.
      ✅ Soft delete: N/A.
      ✅ Error format: Returns a specific error code for "Insufficient Stock".
      ✅ API docs: N/A.
      ✅ Settings: N/A.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 3.1: `Stock Deduction for Orders`
      - Mục 3.3: `Low Stock Warnings`
  - `INV-008`: Inventory Transaction Logging
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: Creates `InventoryTransaction` records (if new entity).
      ✅ DTOs: N/A.
      ✅ Service: `InventoryService` must log all stock changes.
      ✅ Controller: N/A.
      ✅ Tests: Unit tests verify transaction logs are created for stock adjustments, order deductions, returns, and transfers.
      ✅ Business Logic: All stock changes must be traceable.
      ✅ Multi-tenant: Logs are organization-specific.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: N/A.
  - `INV-009`: Reservation Monitoring & Shipping Fail Coverage *(P1)*
    - **Vấn đề:** Khi vận đơn liên tiếp báo `FAILED/RETURNED`, workflow hiện tại dựa trên `OrderInventoryReservation` để hoàn kho nhưng chưa có lớp giám sát nếu stock không được release hết, cũng như thiếu E2E để tái hiện luồng shipping fail nhiều lần.
    - **Acceptance Criteria:**
      ✅ Schema: Bổ sung bảng/enum `InventoryReservationAlert` để lưu cảnh báo reservation leak; chạy migration + `prisma generate`.
      ✅ Service: InventoryModule cung cấp API/Service để quét reservation còn kẹt (`scanReservationLeaks`, `getReservationAlerts`, auto resolve khi hết kẹt) và log `AuditLog` khi tạo cảnh báo.
      ✅ Automation: ShippingService gọi monitor sau `FAILED/RETURNED`, scheduler (hoặc endpoint thủ công) có thể kích hoạt quét toàn org.
      ✅ Tests: Unit/integration cho monitor + InventoryService; Playwright E2E cover shipping fail liên tiếp (deduct → fail → reprocess → fail) đảm bảo stock trả về và cảnh báo hoạt động.
      ✅ Docs: ROADMAP, `01_BUSINESS_LOGIC.md`, `04_API_REFERENCE.md`, CHANGELOG mô tả cơ chế mới.
    - **📚 Business Logic liên quan:**
      - Mục 3.1 + 5.3 (`Stock Deduction / Failed Delivery`).
      - Mục 1.2 (`Refund/Order automation` - tương tác COD) để đảm bảo monitor không phá workflow.
    - **Trạng thái 2025-11-19:** ✅ Hoàn thành — migration `20251119125748_inv_009_reservation_alerts`, API (`GET/POST /inventory/reservation-alerts`), cron monitor và Playwright spec shipping fail đã cập nhật.
    - **Cập nhật 2025-11-19:**
      - **Hành động:** Tạo bảng `inventory_reservation_alerts`, mở rộng InventoryService/ShippingService + scheduler job, bổ sung DTO + controller endpoint, docs & ROADMAP.
      - **Kiểm thử:** `pnpm --filter @meocrm/api test inventory`, `pnpm --filter @meocrm/api test shipping.service`, Playwright spec `tests/e2e/order-shipping-flow.spec.ts` (server chưa khởi động trong 120s → cần hướng dẫn tăng timeout khi chạy full suite).
      - **Commit:** (pending review/commit trên nhánh làm việc).
      - **Trạng thái:** Đợi review (code + migration sẵn sàng).
- **Frontend Products (⚠️ NEEDS SCREENSHOTS)**
  - `FE-008`: Frontend: Products list page
    - **Acceptance Criteria:**
      📋 Boss Specs: [Link to mockup/Figma] - **(Cần Boss cung cấp)**
      ✅ Component: `apps/web/app/(dashboard)/products/page.tsx`
      ✅ UI: Matches mockup, displays product list with filters, search, pagination.
      ✅ Responsive: Mobile/Tablet/Desktop breakpoints supported.
      ✅ States: Loading/Error/Empty/Success states for product data.
      ✅ API: Calls `GET /products` with query parameters.
      ✅ Validation: N/A.
      ✅ i18n: Vietnamese labels (vi-VN).
      ✅ Accessibility: Keyboard navigation and screen reader support.
      ✅ No console errors.
      ✅ Tests: Component tests with MSW mocks for API calls.
  - `FE-009`: Frontend: Product create form
    - **Acceptance Criteria:**
      📋 Boss Specs: [Link to mockup/Figma] - **(Cần Boss cung cấp)**
      ✅ Component: `apps/web/components/products/product-create-form.tsx`
      ✅ UI: Matches mockup, provides fields for product details (name, SKU, price, stock, category, images).
      ✅ Responsive: Mobile/Tablet/Desktop breakpoints supported.
      ✅ States: Loading/Error/Success states for form submission.
      ✅ API: Calls `POST /products`.
      ✅ Validation: Form validation for all required fields.
      ✅ i18n: Vietnamese labels (vi-VN).
      ✅ Accessibility: Keyboard navigation.
      ✅ No console errors.
      ✅ Tests: Component tests with MSW mocks.
  - `FE-010`: Frontend: Product edit form
    - **Acceptance Criteria:**
      📋 Boss Specs: [Link to mockup/Figma] - **(Cần Boss cung cấp)**
      ✅ Component: `apps/web/components/products/product-edit-form.tsx`
      ✅ UI: Matches mockup, pre-fills with existing product data, allows editing.
      ✅ Responsive: Mobile/Tablet/Desktop breakpoints supported.
      ✅ States: Loading/Error/Success states for form submission.
      ✅ API: Calls `GET /products/:id` and `PATCH /products/:id`.
      ✅ Validation: Form validation.
      ✅ i18n: Vietnamese labels (vi-VN).
      ✅ Accessibility: Keyboard navigation.
      ✅ No console errors.
      ✅ Tests: Component tests with MSW mocks.
  - `FE-011`: Frontend: Variants UI
    - **Acceptance Criteria:**
      📋 Boss Specs: [Link to mockup/Figma] - **(Cần Boss cung cấp)**
      ✅ Component: `apps/web/components/products/product-variants.tsx` (or integrated into product forms).
      ✅ UI: Matches mockup, allows adding/editing/deleting product variants.
      ✅ Responsive: Mobile/Tablet/Desktop breakpoints supported.
      ✅ States: Loading/Error/Success states.
      ✅ API: Calls `POST /products/:productId/variants`, `PATCH /products/:productId/variants/:id`, `DELETE /products/:productId/variants/:id`.
      ✅ Validation: Variant-specific validation (e.g., unique SKU within product).
      ✅ i18n: Vietnamese labels (vi-VN).
      ✅ Accessibility: Keyboard navigation.
      ✅ No console errors.
      ✅ Tests: Component tests with MSW mocks.
  - `FE-012`: Frontend: Filters sidebar
    - **Acceptance Criteria:**
      📋 Boss Specs: [Link to mockup/Figma] - **(Cần Boss cung cấp)**
      ✅ Component: `apps/web/components/products/product-filter-sidebar.tsx`.
      ✅ UI: Matches mockup, provides filters for categories, price range, stock status, etc.
      ✅ Responsive: Mobile/Tablet/Desktop breakpoints supported.
      ✅ States: Clear filter state, loading filter options.
      ✅ API: Interacts with `GET /products` query parameters.
      ✅ Validation: N/A.
      ✅ i18n: Vietnamese labels (vi-VN).
      ✅ Accessibility: Keyboard navigation.
      ✅ No console errors.
      ✅ Tests: Component tests.
  - `FE-013`: Frontend: Search functionality
    - **Acceptance Criteria:**
      📋 Boss Specs: [Link to mockup/Figma] - **(Cần Boss cung cấp)**
      ✅ Component: Search input in `apps/web/components/products/product-list.tsx`.
      ✅ UI: Matches mockup, search input with debounce.
      ✅ Responsive: Mobile/Tablet/Desktop breakpoints supported.
      ✅ States: Loading search results, empty results.
      ✅ API: Calls `GET /products?search=...` with debounce.
      ✅ Validation: N/A.
      ✅ i18n: Vietnamese labels (vi-VN).
      ✅ Accessibility: Keyboard navigation.
      ✅ No console errors.
      ✅ Tests: Component tests for debounce and API integration.
- **Business Logic**
  - `PROD-016`: Product Variant Price Logic
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: Product and ProductVariant models.
      ✅ DTOs: N/A.
      ✅ Service: `PricingService` correctly calculates effective sell price for a variant (`Product.sellPrice + ProductVariant.additionalPrice`).
      ✅ Controller: N/A.
      ✅ Tests: Unit tests for `PricingService` covering base product price and variant adjustments.
      ✅ Business Logic: Price of a variant is `baseProductPrice + variantAdditionalPrice`. `variantAdditionalPrice` can be negative.
      ✅ Multi-tenant: N/A.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: N/A.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 4.2: `Variant Pricing`
- **Testing**
  - `TEST-003`: E2E: Tenant isolation tests (CRITICAL)
    - **Acceptance Criteria:**
      ✅ Module setup: E2E test suite includes scenarios to verify tenant isolation.
      ✅ Entities: Tests cover all tenant-aware entities (Product, Customer, Order, etc.).
      ✅ DTOs: N/A.
      ✅ Service: N/A.
      ✅ Controller: N/A.
      ✅ Tests: E2E tests create data for two separate organizations and verify that users from one organization cannot access data from another.
      ✅ Business Logic: Strict data isolation between organizations.
      ✅ Multi-tenant: Core testing principle.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: N/A.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 7.1: `Organization Isolation`

---

## 👥 Phase 3 - CRM Core (23 tasks)

### ✅ Completed
- **Customers**
  - `CUST-001`: CustomersModule - Full CRUD Implementation
  - `CUS-002`: CustomersModule - Full CRUD (feature/customers)
  - `CUST-BUG-004`: Fix Customer Code Generation Bug (CUSNaN)
  - `FIX-002`: Fix /customers Returns 0 Results
- **Bug Fixes**
  - `P3-BUG-001`: Fix Prisma Relation Syntax
  - `P3-BUG-002`: Fix Authentication Strategy Not Found
  - `P3-BUG-003`: Refactor PrismaService from REQUEST-scoped to SINGLETON

### 🔄 In Progress
- **Customers Module**
  - `CUST-001`: Setup CustomersModule
  - `CUST-002`: Customers CRUD endpoints
  - `CUST-003`: Auto-generate customer code
- **`CUST-006`: Customer Auto-Segmentation Service (CRITICAL)**
  - **Vấn đề:** Danh sách các phân khúc khách hàng mặc định trong tài liệu không khớp với những gì có trong code.
  - **Acceptance Criteria:**
    ```markdown
    - Cập nhật tệp `prisma/seed.ts`.
    - Khi chạy `pnpm db:seed`, hệ thống phải tạo ra các phân khúc khách hàng mặc định đúng như trong tài liệu nghiệp vụ.
    ```
  - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
    - Mục 6: `Customer Management Rules`
- **`CUST-007`: Customer Stats Auto-Update Service (CRITICAL)**
    - *(Đã được định nghĩa trong `SHIP-007`)*

---

## 📦 Phase 4 - Supplier Management (7 tasks)

### ✅ Completed
- **Suppliers**
  - `SUPP-001`: SuppliersModule - Full CRUD Implementation
  - `SUPP-002`: Add Supplier Schema Fields (taxCode, deletedAt)
  - `SUPP-BUG-001`: Fix Jest TypeScript Decorator Conflict

### 🔄 In Progress
- **Suppliers Module**
  - `SUP-001`: Setup SuppliersModule
  - `SUP-002`: Suppliers CRUD endpoints
  - `SUP-003`: Supplier stats tracking
  - `SUP-004`: Suppliers tests

---

## 🏪 Phase 5 - POS & Orders (30 tasks)

### 🔄 In Progress
- **Orders Backend**
  - `ORD-BACKEND-001`: Orders Backend - CRUD & Workflow (85% complete)

### ⏳ Todo
- **Orders Module (Critical)**
  - `ORD-001`: Setup OrdersModule
    - **Acceptance Criteria:**
      ✅ Module setup: `OrdersModule` created, registered in `AppModule`.
      ✅ Entities: All necessary Prisma models (`Order`, `OrderItem`, etc.).
      ✅ DTOs: N/A.
      ✅ Service: `OrderService` is created and accessible.
      ✅ Controller: N/A.
      ✅ Tests: Unit tests for basic service methods.
      ✅ Business Logic: N/A.
      ✅ Multi-tenant: Module supports multi-tenancy.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: N/A.
  - `ORD-002`: POST /orders with items
    - **Acceptance Criteria:**
      - Endpoint `POST /orders` phải chấp nhận một DTO chứa `customerId`, `branchId`, `paymentMethod`, và một danh sách các `items`.
      - Mỗi `item` trong danh sách phải chứa `productId`, `quantity`, và `discountAmount`.

      - **Logic xử lý chính:**
        1. **Kiểm tra tồn kho:** Block việc tạo đơn nếu có sản phẩm `stock <= 0`.
        2. **Tính toán giá:** Tính `subtotal`, `total`, `taxAmount` sau khi đã áp dụng chiết khấu trên từng sản phẩm, sau đó mới tính thuế.
        3. **Tạo bản ghi:** Tạo các bản ghi `Order` và `OrderItem`.
        4. **Cập nhật công nợ:** Cập nhật `Customer.debt` của khách hàng.
        5. **Giao dịch đồng nhất:** Toàn bộ các bước trên phải được thực thi trong một giao dịch database duy nhất.
      - **Lưu ý quan trọng:** Nhiệm vụ này chỉ tạo đơn hàng ở trạng thái `PENDING`. Việc trừ tồn kho sẽ không xảy ra ở bước này.

      - **Test Case:**
        - Tạo thành công một đơn hàng hợp lệ.
        - Thử tạo đơn hàng với một sản phẩm đã hết hàng -> Phải báo lỗi.
        - Tạo đơn hàng có chiết khấu và thuế -> Xác nhận tổng tiền và tiền thuế được tính toán chính xác.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 1.1 (PENDING): Block tạo đơn hàng nếu `stock <= 0`.
      - Mục 1.1 (PENDING): Không trừ tồn kho khi tạo đơn ở trạng thái `PENDING`.
      - Mục 4.3: Hỗ trợ chiết khấu ở cấp độ sản phẩm (`discountAmount`).
      - Mục 4.4: Tính thuế VAT trên giá trị sau khi đã trừ chiết khấu.
      - Mục 2.1: Cập nhật công nợ của khách hàng.
  - `ORD-003`: Calculate order totals
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: Reads `Order` and `OrderItem` data.
      ✅ DTOs: N/A.
      ✅ Service: `PricingService` correctly calculates `subtotal`, `tax`, `shipping`, `discount`, `total` for an order.
      ✅ Controller: N/A (internal service logic).
      ✅ Tests: Unit tests for `PricingService` covering various scenarios (discounts, tax, shipping).
      ✅ Business Logic: Follows rules for item-level discounts (Mục 4.3) and tax calculation after discount (Mục 4.4).
      ✅ Multi-tenant: N/A.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: Reads tax rates and shipping fee logic from `SettingsService`.
    - **📚 Business Logic liên quan (ừ `01_BUSINESS_LOGIC.md`):**
      - Mục 4.3: `Discount Rules`
      - Mục 4.4: `Tax Calculation`
      - Mục 5.1: `Shipping Fee Calculation`
  - `ORD-004`: Update customer stats in transaction
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: Updates `Customer` entity (`totalSpent`, `totalOrders`, `debt`).
      ✅ DTOs: N/A.
      ✅ Service: `OrderService` or `CustomerService` updates customer stats.
      ✅ Controller: N/A.
      ✅ Tests: Unit tests ensure customer stats are updated correctly and atomically with order changes.
      ✅ Business Logic: Customer stats are updated upon order `COMPLETED` and `CANCELLED`.
      ✅ Multi-tenant: N/A.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: N/A.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 2.1: `Customer Debt Calculation`
      - Mục 1.1: `COMPLETED` (Workflow 2: Đơn COD ship đi)
  - `ORD-005`: Order status workflow
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: Updates `Order.status`.
      ✅ DTOs: `UpdateOrderStatusDto`.
      ✅ Service: `OrderService.updateOrderStatus()` method.
      ✅ Controller: `PATCH /orders/:id/status` endpoint.
      ✅ Tests: Unit tests for status transitions, E2E tests for full workflow.
      ✅ Business Logic: Follows defined order status workflow (Mục 1.1). Prevents invalid transitions.
      ✅ Multi-tenant: N/A.
      ✅ Soft delete: N/A.
      ✅ Error format: Returns error for invalid status transitions.
      ✅ API docs: Swagger annotations.
      ✅ Settings: N/A.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 1.1: `Quy trình trạng thái đơn hàng`
  - `ORD-006`: Orders E2E tests
    - **Acceptance Criteria:**
      ✅ Module setup: E2E test suite includes scenarios for orders.
      ✅ Entities: N/A.
      ✅ DTOs: N/A.
      ✅ Service: N/A.
      ✅ Controller: N/A.
      ✅ Tests: E2E tests cover critical order flows (create, update status, cancel, view).
      ✅ Business Logic: All order-related business rules are validated through E2E tests.
      ✅ Multi-tenant: Order E2E tests validate tenant isolation.
      ✅ Soft delete: E2E tests verify soft delete behavior.
      ✅ Error format: E2E tests validate error responses.
      ✅ API docs: N/A.
      ✅ Settings: N/A.
  - `ORD-007`: Order Status Transition Validation
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: `Order` entity.
      ✅ DTOs: `UpdateOrderStatusDto`.
      ✅ Service: `OrderService` strictly validates all order status transitions.
      ✅ Controller: `PATCH /orders/:id/status` endpoint.
      ✅ Tests: Unit tests for `OrderService` covering all valid and invalid status transitions.
      ✅ Business Logic: Follows defined order status workflow (Mục 1.1).
      ✅ Multi-tenant: N/A.
      ✅ Soft delete: N/A.
      ✅ Error format: Returns error for invalid status transitions.
      ✅ API docs: Swagger annotations for endpoint.
      ✅ Settings: N/A.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 1.1: `Quy trình trạng thái đơn hàng`
  - **`ORD-008`: Order Cancellation Business Logic (CRITICAL)**
  - **Vấn đề:** Logic hoàn kho khi hủy đơn chưa được triển khai.
  - **Acceptance Criteria:**
    ```markdown
    - Nếu đơn hàng được hủy từ trạng thái `PROCESSING`, hệ thống phải tự động hoàn trả lại số lượng tồn kho đã bị trừ trước đó.
    - Nếu đơn hàng được hủy từ trạng thái `PENDING`, không có hành động nào về tồn kho xảy ra.
    - Logic cho phép hủy từ `PENDING` và `PROCESSING`, nhưng không từ `COMPLETED`.
    - Tạo một bản ghi `InventoryTransaction` với loại là `ORDER_CANCEL_RETURN`.
    - **Test Case:** Tạo sản phẩm (tồn kho=5), tạo đơn hàng (sl=3) -> `PROCESSING` (tồn kho còn 2) -> hủy đơn -> xác nhận tồn kho quay về 5.
    ```
  - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
    - Mục 1.1: `CANCELLED`
    - Mục 3.1: `Stock Deduction & Return for Orders`
  - `ORD-009`: Order Refund Processing
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: Creates `OrderReturn` and `OrderReturnItem` records. Updates `Order` status, `Customer` debt.
      ✅ DTOs: `CreateRefundRequestDto`, `ApproveRefundDto`.
      ✅ Service: `RefundService` handles refund requests, approvals, and rejections.
      ✅ Controller: `POST /orders/:orderId/refund-request`, `POST /orders/:orderId/refund-approve`, `POST /orders/:orderId/refund-reject`.
      ✅ Tests: Unit tests for refund logic, E2E tests for refund flow.
      ✅ Business Logic: Follows refund policy (Mục 1.2). Ensures financial accuracy.
      ✅ Multi-tenant: N/A.
      ✅ Soft delete: N/A.
      ✅ Error format: Standard error format for invalid refund requests.
      ✅ API docs: Swagger annotations.
      ✅ Settings: `settings.refund.windowDays`, `settings.refund.restockOnRefund`.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 1.2: `Refund Policy`
      - Mục 2.1: `Customer Debt Calculation`
    - **Trạng thái 2025-11-19:** ✅ Hoàn thành – refund request tạo OrderReturn, approve hoàn kho + cập nhật stats/debt, audit logs và event `order.refunded` đã hoạt động.
    - **Cập nhật 2025-11-19:**
      - **Hành động:** Bổ sung DTO `ApproveRefundDto`, lưu OrderReturnItem, cập nhật Orders/CustomerStatsService, thêm commission adjustments/idempotency guard.
      - **Kiểm thử:** `pnpm --filter @meocrm/api test refunds` (unit + integration) + cập nhật Playwright shipping-flow để đảm bảo E2E liền mạch.
      - **Trạng thái:** Chờ review hợp nhất.
  - **`ORD-010`: Stock Deduction on Order Status Change (CRITICAL - BLOCKS POS)**
  - **Vấn đề:** Logic trừ kho khi xử lý đơn hàng chưa được triển khai.
  - **Acceptance Criteria:**
    ```markdown
    - Tự động trừ stock khi trạng thái đơn hàng chuyển sang `PROCESSING`.
    - KHÔNG trừ stock khi ở trạng thái `PENDING`.
    - Chặn xử lý nếu `số lượng đặt > số lượng tồn kho`.
    - Tạo bản ghi `InventoryTransaction` với loại `ORDER_DEDUCTION`.
    - **Test Case:** Tạo sản phẩm (tồn kho=5), tạo đơn hàng (sl=3) → `PROCESSING` → xác nhận tồn kho còn 2.
    ```
  - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
    - Mục 1.1: `PROCESSING`
    - Mục 3.1: `Stock Deduction & Return for Orders`
    - Mục 3.3: `Low Stock Warnings`
  - `ORD-011`: Order Validation Rules
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: `Order` and `OrderItem`.
      ✅ DTOs: `CreateOrderDto`, `UpdateOrderDto`.
      ✅ Service: `OrderService` performs comprehensive validation during order creation and updates.
      ✅ Controller: N/A.
      ✅ Tests: Unit tests for validation logic.
      ✅ Business Logic: Validates customer, products, stock, payment methods, quantities, etc.
      ✅ Multi-tenant: N/A.
      ✅ Soft delete: N/A.
      ✅ Error format: Returns specific validation errors.
      ✅ API docs: N/A.
      ✅ Settings: N/A.
  - `ORD-012`: Order Automatic Actions Service
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: `Order`.
      ✅ DTOs: N/A.
      ✅ Service: `OrderAutomationService` handles timed actions (e.g., auto-cancel pending orders).
      ✅ Controller: N/A (background job).
      ✅ Tests: Unit tests for automation logic.
      ✅ Business Logic: Defines rules for automatic order actions.
      ✅ Multi-tenant: Actions are organization-specific.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: `settings.order.autoCancelThreshold`.
    - **⚙️ Settings Keys:** `order.autoCancelThreshold`
- **Shipping Module**
  - `SHIP-001`: Setup ShippingModule
    - **Acceptance Criteria:**
      ✅ Module setup: `ShippingModule` created, registered in `AppModule`.
      ✅ Entities: `ShippingOrder`, `ShippingPartner`.
      ✅ DTOs: N/A.
      ✅ Service: `ShippingService` is created and accessible.
      ✅ Controller: N/A.
      ✅ Tests: Unit tests for basic service methods.
      ✅ Business Logic: N/A.
      ✅ Multi-tenant: Module supports multi-tenancy.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: N/A.
  - `SHIP-002`: Create shipping order endpoint
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: Creates `ShippingOrder` record.
      ✅ DTOs: `CreateShippingOrderDto` with `orderId`, `partnerId`, recipient details, fees.
      ✅ Service: `ShippingService.createShippingOrder()` method.
      ✅ Controller: `POST /shipping/orders` endpoint.
      ✅ Tests: Unit tests for service, E2E test for endpoint.
      ✅ Business Logic: Ensures valid `orderId` and `partnerId`.
      ✅ Multi-tenant: Shipping order linked to `organizationId`.
      ✅ Soft delete: N/A.
      ✅ Error format: Standard error format.
      ✅ API docs: Swagger annotations.
      ✅ Settings: N/A.
  - `SHIP-003`: Update tracking status
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: Updates `ShippingOrder.status`.
      ✅ DTOs: `UpdateShippingStatusDto` (e.g., from webhook).
      ✅ Service: `ShippingService.updateTrackingStatus()` method.
      ✅ Controller: `PATCH /shipping/orders/:id/status` endpoint (or internal webhook handler).
      ✅ Tests: Unit tests for status transitions, E2E tests via webhook mock.
      ✅ Business Logic: Follows `ShippingStatus` workflow.
      ✅ Multi-tenant: N/A.
      ✅ Soft delete: N/A.
      ✅ Error format: Standard error format.
      ✅ API docs: Swagger annotations.
      ✅ Settings: N/A.
  - `SHIP-004`: COD tracking
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: `ShippingOrder` and `Order`.
      ✅ DTOs: N/A.
      ✅ Service: `ShippingService` correctly tracks `codAmount` and links to `Order` payment status.
      ✅ Controller: N/A.
      ✅ Tests: Unit tests for COD tracking logic.
      ✅ Business Logic: COD amount is updated upon successful delivery (`SHIP-007`).
      ✅ Multi-tenant: N/A.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: N/A.
  - `SHIP-005`: Shipping partner integration prep
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: `ShippingPartner`.
      ✅ DTOs: N/A.
      ✅ Service: `ShippingPartnerService` to manage partner configurations.
      ✅ Controller: N/A.
      ✅ Tests: N/A.
      ✅ Business Logic: N/A.
      ✅ Multi-tenant: N/A.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: `settings.shipping.partners`.
    - **⚙️ Settings Keys:** `shipping.partners`
  - **`SHIP-006`: Shipping Fee Calculation Service (CRITICAL)**
  - **Vấn đề:** Code chỉ dùng bảng giá cố định, chưa tích hợp API.
  - **Acceptance Criteria:**
    ```markdown
    - Service tính phí vận chuyển phải ưu tiên gọi API của đối tác vận chuyển.
    - Nếu gọi API thất bại, hệ thống phải dự phòng bằng cách sử dụng bảng giá cố định trong settings.
    - Cần có cấu hình để bật/tắt việc sử dụng API cho từng đối tác.
    ```
  - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
    - Mục 5.1: `Shipping Fee Calculation`
  - **`SHIP-007`: COD Amount Reconciliation**
    - *(Đã được định nghĩa ở trên)*
  - **`SHIP-008`: Failed Delivery Handling & `SHIP-009`: Returned Delivery Handling**
  - **Vấn đề:** Quy trình xử lý hàng hoàn/giao thất bại trong code không đúng với thực tế.
  - **Acceptance Criteria (Đã cập nhật):**
    ```markdown
    ### Xử lý Giao hàng thất bại (Failed Delivery)
    - Khi webhook báo trạng thái `FAILED` -> Cập nhật Order thành `PENDING`, không đổi tồn kho.

    ### Xử lý Đơn hàng bị hoàn trả (Returned Delivery)
    - **Giai đoạn 1 (Bắt đầu hoàn):** Webhook báo `RETURNED` -> Cập nhật Order thành `RETURNING`, không đổi tồn kho.
    - **Giai đoạn 2 (Nhận hàng hoàn):** Admin xác nhận đã nhận hàng -> Cập nhật Order thành `CANCELLED` -> Kích hoạt logic hoàn trả tồn kho.
    ```
  - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
    - Mục 5.3: `Failed/Returned Delivery`
  - `SHIP-010`: Shipping Partner Debt Management
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: `ShippingPartner`.
      ✅ DTOs: N/A.
      ✅ Service: `ShippingPartnerService` tracks `debtBalance` for each partner.
      ✅ Controller: N/A.
      ✅ Tests: Unit tests for debt balance calculation (e.g., when COD is collected).
      ✅ Business Logic: Defines how partner debt is accumulated and settled.
      ✅ Multi-tenant: N/A.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: N/A.
- **Frontend POS (⚠️ NEEDS SCREENSHOTS)**
  - `FE-014`: Frontend: POS product grid (CRITICAL)
    - **Acceptance Criteria:**
      📋 Boss Specs: [Link to mockup/Figma] - **(Cần Boss cung cấp)**
      ✅ Component: `apps/web/components/pos/product-grid.tsx`.
      ✅ UI: Matches mockup, displays product list with search and filters, supports adding to cart.
      ✅ Responsive: Mobile/Tablet/Desktop breakpoints supported.
      ✅ States: Loading/Error/Empty/Success for product data.
      ✅ API: Calls `GET /products` with search/filter queries.
      ✅ Validation: N/A.
      ✅ i18n: Vietnamese labels (vi-VN).
      ✅ Accessibility: Keyboard navigation.
      ✅ No console errors.
      ✅ Tests: Component tests with MSW mocks.
  - `FE-015`: Frontend: POS cart component (CRITICAL)
    - **Acceptance Criteria:**
      📋 Boss Specs: [Link to mockup/Figma] - **(Cần Boss cung cấp)**
      ✅ Component: `apps/web/components/pos/cart.tsx`.
      ✅ UI: Matches mockup, displays line items, quantity adjustments, item-level discount, totals.
      ✅ Responsive: Mobile/Tablet/Desktop breakpoints supported.
      ✅ States: Empty cart, items in cart.
      ✅ API: N/A (client-side state initially).
      ✅ Validation: Quantity validation.
      ✅ i18n: Vietnamese labels (vi-VN).
      ✅ Accessibility: Keyboard navigation.
      ✅ No console errors.
      ✅ Tests: Component tests.
  - `FE-016`: Frontend: Customer search in POS
    - **Acceptance Criteria:**
      📋 Boss Specs: [Link to mockup/Figma] - **(Cần Boss cung cấp)**
      ✅ Component: `apps/web/components/pos/customer-search.tsx`.
      ✅ UI: Matches mockup, search input with debounce, displays customer list, allows selection.
      ✅ Responsive: Mobile/Tablet/Desktop breakpoints supported.
      ✅ States: Loading search results, empty results.
      ✅ API: Calls `GET /customers?search=...` with debounce.
      ✅ Validation: N/A.
      ✅ i18n: Vietnamese labels (vi-VN).
      ✅ Accessibility: Keyboard navigation.
      ✅ No console errors.
      ✅ Tests: Component tests with MSW mocks.
  - `FE-017`: Frontend: Shipping partner selection
    - **Acceptance Criteria:**
      📋 Boss Specs: [Link to mockup/Figma] - **(Cần Boss cung cấp)**
      ✅ Component: `apps/web/components/pos/shipping-partner-selector.tsx`.
      ✅ UI: Matches mockup, dropdown for shipping partners.
      ✅ Responsive: Mobile/Tablet/Desktop breakpoints supported.
      ✅ States: Loading partners, selected partner.
      ✅ API: Calls `GET /shipping/partners`.
      ✅ Validation: N/A.
      ✅ i18n: Vietnamese labels (vi-VN).
      ✅ Accessibility: Keyboard navigation.
      ✅ No console errors.
      ✅ Tests: Component tests with MSW mocks.
  - `FE-018`: Frontend: Payment flow in POS (CRITICAL)
    - **Acceptance Criteria:**
      📋 Boss Specs: [Link to mockup/Figma] - **(Cần Boss cung cấp)**
      ✅ Component: `apps/web/components/pos/payment-flow.tsx`.
      ✅ UI: Matches mockup, allows selection of payment methods (cash, card, transfer, COD), quick cash buttons, change calculation.
      ✅ Responsive: Mobile/Tablet/Desktop breakpoints supported.
      ✅ States: Various payment states (pending, success, failed).
      ✅ API: N/A (submits to `POST /orders` with payment details).
      ✅ Validation: Payment amount validation.
      ✅ i18n: Vietnamese labels (vi-VN).
      ✅ Accessibility: Keyboard navigation.
      ✅ No console errors.
      ✅ Tests: Component tests.
  - `FE-019`: Frontend: Order completion (CRITICAL)
    - **Acceptance Criteria:**
      📋 Boss Specs: [Link to mockup/Figma] - **(Cần Boss cung cấp)**
      ✅ Component: `apps/web/components/pos/order-completion.tsx` (modal/page).
      ✅ UI: Matches mockup, displays order summary, print options (invoice, shipping label).
      ✅ Responsive: Mobile/Tablet/Desktop breakpoints supported.
      ✅ States: Successful order creation.
      ✅ API: N/A (triggered after `POST /orders` success).
      ✅ Validation: N/A.
      ✅ i18n: Vietnamese labels (vi-VN).
      ✅ Accessibility: Keyboard navigation.
      ✅ No console errors.
      ✅ Tests: Component tests.
- **Testing**
  - `TEST-004`: E2E: Orders creation flow
    - **Acceptance Criteria:**
      ✅ Module setup: E2E test suite includes order creation.
      ✅ Entities: N/A.
      ✅ DTOs: N/A.
      ✅ Service: N/A.
      ✅ Controller: N/A.
      ✅ Tests: E2E tests for full order creation flow, including product selection, customer assignment, payment, and status verification.
      ✅ Business Logic: All order creation business rules are validated.
      ✅ Multi-tenant: Order creation E2E tests validate tenant isolation.
      ✅ Soft delete: N/A.
      ✅ Error format: E2E tests validate error responses.
      ✅ API docs: N/A.
      ✅ Settings: N/A.

---

## 💰 Phase 6 - Finance (10 tasks)

### ⏳ Todo (All tasks)
- **`FIN-004`: Customer Debt Management Service (CRITICAL)**
  - **Vấn đề:** Cần làm rõ và chuẩn hóa quy trình quản lý công nợ.
  - **Acceptance Criteria:**
    ```markdown
    - Công nợ của khách hàng (`Customer.debt`) phải tăng/giảm tương ứng với các sự kiện tạo đơn, hủy đơn, và thanh toán COD.
    - Hệ thống phải cho phép công nợ có giá trị âm (khách trả thừa).
    - Mọi thay đổi về công nợ phải nằm trong giao dịch đồng nhất (atomic).
    - **Test Case:** Khách có công nợ 50k, thanh toán 100k -> công nợ là -50k.
    ```
  - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
    - Mục 2.1: `Customer Debt Calculation`
- **`DISC-003`: Item-level Discount**
  - **Vấn đề:** Logic chiết khấu cho từng sản phẩm chưa được triển khai.
  - **Acceptance Criteria:**
    ```markdown
    - Thêm trường `discountAmount` vào `OrderItem`.
    - Service tính giá phải tính `lineItemTotal` = (`quantity` * `price`) - `discountAmount`.
    - Validation: `discountAmount` không được lớn hơn giá trị của line item.
    - **Test Case:** Tạo đơn với item (giá 100k, sl 2) và discount 10k -> `lineItemTotal` là 190k.
    ```
  - **Trạng thái 19-11-2025:** ✅ Đã áp dụng `discountType/discountValue/discountAmount/netTotal` trên `OrderItem`, `PricingService` tính lại subtotal và cảnh báo LOSS_SALE.
  - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
    - Mục 4.3: `Discount Rules`
- **`DISC-006`: Tax Calculation (VAT)**
  - **Vấn đề:** Code tính VAT trước khi trừ chiết khấu, sai so với yêu cầu.
  - **Acceptance Criteria:**
    ```markdown
    - `PricingService` phải được cập nhật để tính VAT trên `(subtotal - discountAmount)`.
    - **Test Case:** Đơn hàng subtotal 200k, discount 20k, VAT 10%. VAT phải là 18k.
    ```
  - **Trạng thái 19-11-2025:** ✅ `PricingService` trả `taxBreakdown { taxableAmount, rate }`, VAT dựa trên `taxableSubtotal` (trừ cả item discount + order discount, tôn trọng `isTaxExempt`).
  - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
    - Mục 4.4: `Tax Calculation`
  - **Cập nhật 2025-11-19:** POS Workspace hiển thị cảnh báo LOSS_SALE theo thời gian thực và bảng VAT (taxableAmount + VAT 10%) dựa trên dữ liệu giỏ hàng; đồng thời phản ánh warnings từ API sau khi tạo đơn.
- **Finance Module (Critical)**
  - `FIN-001`: Setup FinanceModule (CRITICAL)
    - **Acceptance Criteria:**
      ✅ Module setup: `FinanceModule` created, registered in `AppModule`.
      ✅ Entities: N/A.
      ✅ DTOs: N/A.
      ✅ Service: `FinanceService` is created and accessible.
      ✅ Controller: N/A.
      ✅ Tests: Unit tests for basic service methods.
      ✅ Business Logic: N/A.
      ✅ Multi-tenant: Module supports multi-tenancy.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: N/A.
  - `FIN-002`: Partial Payment Implementation (CRITICAL for COD)
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: `Payment` records.
      ✅ DTOs: N/A.
      ✅ Service: `PaymentService` handles payments.
      ✅ Controller: N/A.
      ✅ Tests: Unit tests for partial payment logic.
      ✅ Business Logic: Explicitly states "KHÔNG hỗ trợ partial payment".
      ✅ Multi-tenant: N/A.
      ✅ Soft delete: N/A.
      ✅ Error format: Returns error if `isPaid=false` but `paidAmount>0`.
      ✅ API docs: N/A.
      ✅ Settings: N/A.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 2.2: `Partial Payment Rules`
  - `FIN-003`: Payment Method Validation
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: `Order`.
      ✅ DTOs: N/A.
      ✅ Service: `PaymentService` validates payment methods.
      ✅ Controller: N/A.
      ✅ Tests: Unit tests for payment method validation.
      ✅ Business Logic: Ensures COD orders are not marked as paid upfront (Mục 2.3).
      ✅ Multi-tenant: N/A.
      ✅ Soft delete: N/A.
      ✅ Error format: Standard error format for invalid payment method.
      ✅ API docs: N/A.
      ✅ Settings: N/A.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 2.3: `Payment Method Validation`
  - `FIN-005`: Cash Rounding Rules
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: N/A.
      ✅ DTOs: N/A.
      ✅ Service: `PricingService` handles all monetary calculations.
      ✅ Controller: N/A.
      ✅ Tests: Unit tests confirm no cash rounding occurs.
      ✅ Business Logic: Explicitly states "KHÔNG làm tròn tiền mặt".
      ✅ Multi-tenant: N/A.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: N/A.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 2.4: `Cash Rounding Rules`
- **Discounts Module**
  - `DISC-001`: Setup DiscountsModule
    - **Acceptance Criteria:**
      ✅ Module setup: `DiscountsModule` created, registered in `AppModule`.
      ✅ Entities: N/A.
      ✅ DTOs: N/A.
      ✅ Service: `DiscountService` is created and accessible.
      ✅ Controller: N/A.
      ✅ Tests: Unit tests for basic service methods.
      ✅ Business Logic: N/A.
      ✅ Multi-tenant: Module supports multi-tenancy.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: N/A.
  - `DISC-002`: Order-level Discount Rules
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: `Order` entity.
      ✅ DTOs: `CreateOrderDto`, `UpdateOrderDto`.
      ✅ Service: `DiscountService` applies order-level discounts.
      ✅ Controller: N/A.
      ✅ Tests: Unit tests for order-level discount calculations.
      ✅ Business Logic: Defines how order-level discounts are applied.
      ✅ Multi-tenant: N/A.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: `settings.discount.orderLevelRules`.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 4.3: `Discount Rules`
    - **⚙️ Settings Keys:** `discount.orderLevelRules`
  - `DISC-004`: Customer Segment Auto-Discount
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: `Customer`, `CustomerGroup`, `Promotion`.
      ✅ DTOs: N/A.
      ✅ Service: `DiscountService` automatically applies discounts based on customer segments.
      ✅ Controller: N/A (likely integrated into order creation/pricing).
      ✅ Tests: Unit tests for auto-discount logic.
      ✅ Business Logic: Defines rules for segment-based discounts.
      ✅ Multi-tenant: N/A.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: `settings.discount.segmentRates`.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 6: `Customer Management Rules`
      - Mục 4.3: `Discount Rules`
    - **⚙️ Settings Keys:** `discount.segmentRates`

---

## 📊 Phase 7 - Reports (8 tasks)

### ⏳ Todo (All tasks)
- **`AUDIT-001`: Setup AuditLogModule**
  - **Vấn đề:** `AuditLogService` tồn tại nhưng không được gọi, không có gì được ghi log.
  - **Acceptance Criteria:**
    ```markdown
    - `OrdersService`, `ProductsService`, `InventoryService` phải gọi `AuditLogService.log()` khi có các hành động tạo, sửa, xóa quan trọng.
    - Bản ghi log phải chứa `userId`, `actionType`, `entityId`, và `payload`.
    ```
  - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
    - Mục 8.1: `Audit Trail Requirements`
  - **Trạng thái 19-11-2025:** ✅ `AuditLogService.log` đã được gọi tại Orders/Inventory/Shipping, traceId lấy từ `RequestContextService`.
- `AUDIT-002`: Order Actions Audit Logging
  - **Acceptance Criteria:**
    ✅ Module setup: N/A.
    ✅ Entities: Creates `AuditLog` records.
    ✅ DTOs: N/A.
    ✅ Service: `OrdersService` calls `AuditLogService` for create, update, delete, status changes.
    ✅ Controller: N/A.
    ✅ Tests: Unit tests for `OrdersService` ensure audit logs are created.
    ✅ Business Logic: Follows audit trail requirements (Mục 8.1).
    ✅ Multi-tenant: Audit logs are organization-specific.
    ✅ Soft delete: N/A.
    ✅ Error format: N/A.
    ✅ API docs: N/A.
    ✅ Settings: N/A.
  - **Trạng thái 19-11-2025:** ✅ OrdersService đã log `order.created`, `order.status.changed`, `order.cod_paid`; automation chuyển tiếp traceId.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 8.1: `Audit Trail Requirements`
- `AUDIT-003`: Inventory Actions Audit Logging
  - **Acceptance Criteria:**
    ✅ Module setup: N/A.
    ✅ Entities: Creates `AuditLog` records.
    ✅ DTOs: N/A.
    ✅ Service: `InventoryService` calls `AuditLogService` for all stock changes (adjust, transfer, deduct, return).
    ✅ Controller: N/A.
    ✅ Tests: Unit tests for `InventoryService` ensure audit logs are created.
    ✅ Business Logic: Follows audit trail requirements (Mục 8.1).
    ✅ Multi-tenant: Audit logs are organization-specific.
    ✅ Soft delete: N/A.
    ✅ Error format: N/A.
    ✅ API docs: N/A.
    ✅ Settings: N/A.
  - **Trạng thái 19-11-2025:** ✅ InventoryService log toàn bộ adjust/reserve/transfer/return, shipping fail/return kích hoạt trả kho + log.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 8.1: `Audit Trail Requirements`
- `AUDIT-004`: Sensitive Actions Audit Logging
  - **Acceptance Criteria:**
    ✅ Module setup: N/A.
    ✅ Entities: Creates `AuditLog` records.
    ✅ DTOs: N/A.
    ✅ Service: Any service handling sensitive data (e.g., user management, settings changes) calls `AuditLogService`.
    ✅ Controller: N/A.
    ✅ Tests: Unit tests ensure audit logs are created for sensitive actions.
      ✅ Business Logic: Follows audit trail requirements (Mục 8.1) for sensitive actions.
      ✅ Multi-tenant: Audit logs are organization-specific.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: N/A.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 8.1: `Audit Trail Requirements`
- **Reports & Analytics**
  - `RPT-001`: Reports - Sales Dashboard
    - **Acceptance Criteria:**
      📋 Boss Specs: [Link to mockup/Figma] - **(Cần Boss cung cấp)**
      ✅ Component: Frontend component for sales dashboard.
      ✅ UI: Displays key sales metrics, charts, and tables.
      ✅ Responsive: Supported.
      ✅ States: Loading/Error/Empty/Success states.
      ✅ API: Calls `GET /reports/sales`.
      ✅ Validation: N/A.
      ✅ i18n: Vietnamese labels (vi-VN).
      ✅ Accessibility: Supported.
      ✅ No console errors.
      ✅ Tests: Component tests with MSW mocks.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 9: `Reports & Analytics Rules`
  - `RPT-002`: Reports - Inventory Dashboard
    - **Acceptance Criteria:**
      📋 Boss Specs: [Link to mockup/Figma] - **(Cần Boss cung cấp)**
      ✅ Component: Frontend component for inventory dashboard.
      ✅ UI: Displays inventory value, stock movement, low stock alerts.
      ✅ Responsive: Supported.
      ✅ States: Loading/Error/Empty/Success states.
      ✅ API: Calls `GET /reports/inventory`.
      ✅ Validation: N/A.
      ✅ i18n: Vietnamese labels (vi-VN).
      ✅ Accessibility: Supported.
      ✅ No console errors.
      ✅ Tests: Component tests with MSW mocks.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 9: `Reports & Analytics Rules`
  - `RPT-003`: Reports - Customer Analytics
    - **Acceptance Criteria:**
      📋 Boss Specs: [Link to mockup/Figma] - **(Cần Boss cung cấp)**
      ✅ Component: Frontend component for customer analytics dashboard.
      ✅ UI: Displays new customer acquisition, returning customers, total spent, segments.
      ✅ Responsive: Supported.
      ✅ States: Loading/Error/Empty/Success states.
      ✅ API: Calls `GET /reports/customers`.
      ✅ Validation: N/A.
      ✅ i18n: Vietnamese labels (vi-VN).
      ✅ Accessibility: Supported.
      ✅ No console errors.
      ✅ Tests: Component tests with MSW mocks.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 9: `Reports & Analytics Rules`
  - `INFRA-009`: Data Retention & GDPR Compliance
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: N/A.
      ✅ DTOs: N/A.
      ✅ Service: Implements data retention policies (e.g., cron job for hard deleting soft-deleted records after X months).
      ✅ Controller: N/A.
      ✅ Tests: Unit tests for data retention logic.
      ✅ Business Logic: Follows `Data Retention Policy` (Mục 8.2).
      ✅ Multi-tenant: N/A.
      ✅ Soft delete: Implements `Auto-Hard Delete`.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: `settings.dataRetention.softDeleteMonths`.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 8.2: `Data Retention Policy`
    - **⚙️ Settings Keys:** `dataRetention.softDeleteMonths`

---

## 🔌 Phase 8 - Integrations (21 tasks)

### ✅ Completed
- **Webhooks**
  - `WH-002`: Webhooks CRUD endpoints

### ⏳ Todo
- **Shipping Integration (Critical)**
  - `SHIP-011`: GHN/GHTK API Integration (CRITICAL for production)
    - **Acceptance Criteria:**
      ✅ Module setup: `GhnIntegrationService` and `GhtkIntegrationService` are created.
      ✅ Entities: N/A.
      ✅ DTOs: N/A.
      ✅ Service: `ShippingService` can call external GHN/GHTK APIs.
      ✅ Controller: N/A.
      ✅ Tests: Integration tests for external API calls (mocked).
      ✅ Business Logic: Integrates with external shipping partners as per `Integrations Rules`.
      ✅ Multi-tenant: API keys/configs are per organization.
      ✅ Soft delete: N/A.
      ✅ Error format: Handles external API errors gracefully.
      ✅ API docs: N/A.
      ✅ Settings: `settings.shipping.partners.ghn.apiKey`, `settings.shipping.partners.ghtk.apiKey`.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 10: `Integrations Rules`
      - Mục 5.1: `Shipping Fee Calculation`
    - **⚙️ Settings Keys:** `shipping.partners.ghn.apiKey`, `shipping.partners.ghtk.apiKey`
- **Notifications**
  - `NOTIF-001`: Setup NotificationsModule
    - **Acceptance Criteria:**
      ✅ Module setup: `NotificationsModule` created, registered.
      ✅ Entities: N/A.
      ✅ DTOs: N/A.
      ✅ Service: `NotificationService` for sending various types of notifications.
      ✅ Controller: N/A.
      ✅ Tests: Unit tests for basic service methods.
      ✅ Business Logic: N/A.
      ✅ Multi-tenant: Module supports multi-tenancy.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: `settings.notifications`.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 11: `Settings-driven Configuration Rules`
    - **⚙️ Settings Keys:** `notifications`
  - `NOTIF-002`: Email Integration (SendGrid/AWS SES)
    - **Acceptance Criteria:**
      ✅ Module setup: Integrates with an email provider (SendGrid/AWS SES).
      ✅ Entities: N/A.
      ✅ DTOs: N/A.
      ✅ Service: `EmailService` can send emails.
      ✅ Controller: N/A.
      ✅ Tests: Integration tests (mocked) for email sending.
      ✅ Business Logic: N/A.
      ✅ Multi-tenant: N/A.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: `settings.notifications.providers.email.apiKey`.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 10: `Integrations Rules`
    - **⚙️ Settings Keys:** `notifications.providers.email.apiKey`
  - `NOTIF-003`: SMS Integration (Twilio/SMSVN)
    - **Acceptance Criteria:**
      ✅ Module setup: Integrates with an SMS provider (Twilio/SMSVN).
      ✅ Entities: N/A.
      ✅ DTOs: N/A.
      ✅ Service: `SmsService` can send SMS messages.
      ✅ Controller: N/A.
      ✅ Tests: Integration tests (mocked) for SMS sending.
      ✅ Business Logic: N/A.
      ✅ Multi-tenant: N/A.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: `settings.notifications.providers.sms.apiKey`.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 10: `Integrations Rules`
    - **⚙️ Settings Keys:** `notifications.providers.sms.apiKey`
  - `NOTIF-004`: Order Status Notifications
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: N/A.
      ✅ DTOs: N/A.
      ✅ Service: `OrderService` triggers notifications on status change.
      ✅ Controller: N/A.
      ✅ Tests: Unit tests confirm notifications are triggered.
      ✅ Business Logic: Defines when and to whom order status notifications are sent.
      ✅ Multi-tenant: N/A.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: `settings.notifications.orderStatus.enabled`.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 1.1: `Order Processing Rules`
      - Mục 11: `Settings-driven Configuration Rules`
    - **⚙️ Settings Keys:** `notifications.orderStatus.enabled`
  - `NOTIF-005`: Shipping Notifications
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: N/A.
      ✅ DTOs: N/A.
      ✅ Service: `ShippingService` triggers notifications on shipping status change.
      ✅ Controller: N/A.
      ✅ Tests: Unit tests confirm notifications are triggered.
      ✅ Business Logic: Defines when and to whom shipping notifications are sent.
      ✅ Multi-tenant: N/A.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: `settings.notifications.shippingStatus.enabled`.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 5: `Shipping & Logistics Rules`
      - Mục 11: `Settings-driven Configuration Rules`
    - **⚙️ Settings Keys:** `notifications.shippingStatus.enabled`
  - `NOTIF-006`: Stock Alert Notifications
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: N/A.
      ✅ DTOs: N/A.
      ✅ Service: `InventoryService` triggers notifications for low stock.
      ✅ Controller: N/A (background job).
      ✅ Tests: Unit tests confirm notifications are triggered.
      ✅ Business Logic: Defines low stock thresholds and notification rules.
      ✅ Multi-tenant: N/A.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: `settings.notifications.lowStockAlerts.enabled`.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 3.3: `Low Stock Warnings`
      - Mục 11: `Settings-driven Configuration Rules`
    - **⚙️ Settings Keys:** `notifications.lowStockAlerts.enabled`
  - `NOTIF-007`: In-app Notifications (WebSocket)
    - **Acceptance Criteria:**
      ✅ Module setup: Implements WebSocket server for real-time notifications.
      ✅ Entities: N/A.
      ✅ DTOs: N/A.
      ✅ Service: `WebSocketGateway` pushes notifications to connected clients.
      ✅ Controller: N/A.
      ✅ Tests: Integration tests for WebSocket connectivity and event pushing.
      ✅ Business Logic: Defines types of real-time notifications (e.g., new order, low stock).
      ✅ Multi-tenant: Notifications are organization-specific.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: N/A.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 10: `Integrations Rules`
- **API Keys**
  - `API-001`: Setup ApiKeysModule
    - **Acceptance Criteria:**
      ✅ Module setup: `ApiKeysModule` created, registered.
      ✅ Entities: `ApiKey`.
      ✅ DTOs: N/A.
      ✅ Service: `ApiKeysService` manages API key creation, validation.
      ✅ Controller: N/A.
      ✅ Tests: Unit tests for basic service methods.
      ✅ Business Logic: N/A.
      ✅ Multi-tenant: Module supports multi-tenancy.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: N/A.
  - `API-002`: Generate secure API keys
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: Creates `ApiKey` records.
      ✅ DTOs: `CreateApiKeyDto` with `scopes`, `expiresAt`.
      ✅ Service: `ApiKeysService.generateKey()` method generates cryptographically secure keys.
      ✅ Controller: `POST /api-keys` endpoint.
      ✅ Tests: Unit tests for key generation, E2E tests for endpoint.
      ✅ Business Logic: API keys are securely generated and stored (hashed).
      ✅ Multi-tenant: API keys are organization-specific.
      ✅ Soft delete: N/A.
      ✅ Error format: Standard error format.
      ✅ API docs: Swagger annotations.
      ✅ Settings: N/A.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 7.1: `Organization Isolation`
  - `API-003`: ApiKeyGuard implementation
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: N/A.
      ✅ DTOs: N/A.
      ✅ Service: N/A.
      ✅ Controller: Implements a `ApiKeyGuard` to protect API routes.
      ✅ Tests: Unit tests for `ApiKeyGuard` functionality.
      ✅ Business Logic: Validates API keys and their scopes against incoming requests.
      ✅ Multi-tenant: Guard enforces `organizationId` from API key.
      ✅ Soft delete: N/A.
      ✅ Error format: Returns `401 Unauthorized` or `403 Forbidden`.
      ✅ API docs: N/A.
      ✅ Settings: N/A.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 7.1: `Organization Isolation`
  - `API-004`: Rate limiting per API key
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: N/A.
      ✅ DTOs: N/A.
      ✅ Service: Implements rate limiting for API keys.
      ✅ Controller: N/A.
      ✅ Tests: Integration tests verify rate limiting behavior.
      ✅ Business Logic: Defines rate limits (e.g., requests per minute).
      ✅ Multi-tenant: Rate limits are applied per organization/API key.
      ✅ Soft delete: N/A.
      ✅ Error format: Returns `429 Too Many Requests`.
      ✅ API docs: N/A.
      ✅ Settings: `settings.apiKeys.rateLimit`.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 11: `Settings-driven Configuration Rules`
    - **⚙️ Settings Keys:** `apiKeys.rateLimit`
- **MCP Integration**
  - `MCP-001`: Install MCP SDK
    - **Acceptance Criteria:**
      ✅ Module setup: MCP SDK is installed and configured.
      ✅ Entities: N/A.
      ✅ DTOs: N/A.
      ✅ Service: N/A.
      ✅ Controller: N/A.
      ✅ Tests: N/A.
      ✅ Business Logic: N/A.
      ✅ Multi-tenant: N/A.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: N/A.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 10: `Integrations Rules`
  - `MCP-002`: Register 6 MCP tools
    - **Acceptance Criteria:**
      ✅ Module setup: 6 MCP tools are registered and available.
      ✅ Entities: N/A.
      ✅ DTOs: N/A.
      ✅ Service: N/A.
      ✅ Controller: N/A.
      ✅ Tests: Unit tests for tool registration.
      ✅ Business Logic: N/A.
      ✅ Multi-tenant: N/A.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: N/A.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 10: `Integrations Rules`
  - `MCP-003`: Implement MCP tool handlers
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: N/A.
      ✅ DTOs: N/A.
      ✅ Service: Handlers for 6 MCP tools are implemented.
      ✅ Controller: N/A.
      ✅ Tests: Unit tests for tool handler logic.
      ✅ Business Logic: Each tool handler correctly implements its business logic (e.g., `create_order` calls `OrderService`).
      ✅ Multi-tenant: Tool handlers respect `organizationId`.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: N/A.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 10: `Integrations Rules`
  - `MCP-004`: Test MCP with AI agents
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: N/A.
      ✅ DTOs: N/A.
      ✅ Service: N/A.
      ✅ Controller: N/A.
      ✅ Tests: Integration tests for MCP tools using AI agent simulation.
      ✅ Business Logic: N/A.
      ✅ Multi-tenant: N/A.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: N/A.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 10: `Integrations Rules`
- **Webhooks**
  - `WH-001`: Setup WebhooksModule
    - **Acceptance Criteria:**
      ✅ Module setup: `WebhooksModule` created, registered.
      ✅ Entities: `Webhook`.
      ✅ DTOs: N/A.
      ✅ Service: `WebhookService` manages webhook subscriptions and dispatch.
      ✅ Controller: N/A.
      ✅ Tests: Unit tests for basic service methods.
      ✅ Business Logic: N/A.
      ✅ Multi-tenant: Module supports multi-tenancy.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: N/A.
  - `WH-003`: Event emitter for 20+ events
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: N/A.
      ✅ DTOs: N/A.
      ✅ Service: An event emitter is implemented to broadcast 20+ domain events.
      ✅ Controller: N/A.
      ✅ Tests: Unit tests confirm events are emitted correctly.
      ✅ Business Logic: Defines the types and payloads of domain events.
      ✅ Multi-tenant: Events include `organizationId`.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: N/A.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 10: `Integrations Rules`
  - `WH-004`: Webhook delivery with retry
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: N/A.
      ✅ DTOs: N/A.
      ✅ Service: `WebhookService` dispatches webhooks with retry mechanism (exponential backoff).
      ✅ Controller: N/A (background job).
      ✅ Tests: Integration tests verify retry logic.
      ✅ Business Logic: Follows webhook delivery rules (e.g., max retries, timeout).
      ✅ Multi-tenant: N/A.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: `settings.webhooks.retryPolicy`.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 10: `Integrations Rules`
      - Mục 11: `Settings-driven Configuration Rules`
    - **⚙️ Settings Keys:** `webhooks.retryPolicy`
  - `WH-005`: HMAC signature generation
    - **Acceptance Criteria:**
      ✅ Module setup: N/A.
      ✅ Entities: N/A.
      ✅ DTOs: N/A.
      ✅ Service: `WebhookService` generates HMAC signatures for outgoing webhooks.
      ✅ Controller: N/A.
      ✅ Tests: Unit tests for HMAC generation.
      ✅ Business Logic: Follows security best practices for webhook verification.
      ✅ Multi-tenant: N/A.
      ✅ Soft delete: N/A.
      ✅ Error format: N/A.
      ✅ API docs: N/A.
      ✅ Settings: N/A.
    - **📚 Business Logic liên quan (từ `01_BUSINESS_LOGIC.md`):**
      - Mục 10: `Integrations Rules`
