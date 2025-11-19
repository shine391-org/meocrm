# AGENT_START_HERE.md - Hướng dẫn tải ngữ cảnh nhanh

**Dành cho AGENT làm việc trên dự án MeoCRM**

Hướng dẫn này giúp bạn (AGENT) tải ngữ cảnh tối thiểu cần thiết cho từng loại nhiệm vụ, nhằm tăng hiệu suất và tiết kiệm token.

---

## 🚀 Bắt đầu nhanh (Mỗi phiên làm việc)

**Luôn đọc đầu tiên:**
1.  [AGENTS.md](../AGENTS.md) - Quy trình làm việc giữa Bạn và AGENT.
2.  [ROADMAP.md](../ROADMAP.md) - Các nhiệm vụ và trạng thái hiện tại của dự án.
3.  [reference/TASK_DATABASE.md](./reference/TASK_DATABASE.md) - Danh sách nhiệm vụ chi tiết (AC, liên kết BL).
4.  Nếu cần dữ liệu demo để test frontend/API nhanh: xem `docs/guides/frontend-development.md` → mục **Seed dữ liệu cho Frontend** và chạy `./scripts/seed-dev.sh`.

---

## 📊 Tải ngữ cảnh theo nhiệm vụ

### 1️⃣ P0 - Sửa lỗi nghiêm trọng (Critical Bug Fix)

**Đọc (theo thứ tự):**
1.  ✅ [AGENTS.md](../AGENTS.md) - Quy trình làm việc.
2.  ✅ [ROADMAP.md](../ROADMAP.md) - Mục 3: Kế hoạch ưu tiên (để hiểu vấn đề P0).
3.  ✅ [essential/01_BUSINESS_LOGIC.md](essential/01_BUSINESS_LOGIC.md) - Quy tắc nghiệp vụ liên quan đến lỗi.
4.  ✅ [essential/03_DATABASE_SCHEMA.md](essential/03_DATABASE_SCHEMA.md) - Schema database liên quan đến lỗi.
5.  ✅ [reference/04_API_REFERENCE.md](reference/04_API_REFERENCE.md) - Các endpoint API liên quan đến lỗi.
6.  ✅ Mã nguồn liên quan:
    *   `apps/api/src/orders/orders.service.ts` (ví dụ cho lỗi tồn kho)
    *   `apps/api/src/inventory/inventory.service.ts` (ví dụ cho lỗi tồn kho)
    *   `apps/api/src/prisma/prisma.service.ts` (nếu liên quan đến transaction/middleware)
7.  ✅ Các tệp test liên quan (để hiểu cách viết và chạy test).

**Bỏ qua:** Frontend docs, tài liệu tích hợp không liên quan.

---

### 2️⃣ Phát triển Backend API mới

**Đọc (theo thứ tự):**
1.  ✅ [AGENTS.md](../AGENTS.md) - Quy trình làm việc.
2.  ✅ [essential/01_BUSINESS_LOGIC.md](essential/01_BUSINESS_LOGIC.md) - Quy tắc nghiệp vụ.
3.  ✅ [essential/03_DATABASE_SCHEMA.md](essential/03_DATABASE_SCHEMA.md) - Schema database.
4.  ✅ [DEVELOPMENT_LESSONS_LEARNED.md](../DEVELOPMENT_LESSONS_LEARNED.md) - Các quy tắc mã hóa.
5.  ✅ [essential/01_BUSINESS_LOGIC.md](essential/01_BUSINESS_LOGIC.md) - Mục 7.1: Quy tắc multi-tenant.

**Bỏ qua:** Frontend docs, tài liệu tích hợp không liên quan.

---

### 3️⃣ Phát triển Frontend Component mới

**Đọc (theo thứ tự):**
1.  ✅ [AGENTS.md](../AGENTS.md) - Quy trình làm việc.
2.  ✅ [guides/frontend-development.md](guides/frontend-development.md) - Hướng dẫn phát triển Frontend.
3.  ✅ Screenshot từ người dùng.
4.  ✅ Component hiện có tương tự (nếu có).
5.  ✅ [reference/04_API_REFERENCE.md](reference/04_API_REFERENCE.md) - Các endpoint API (nếu cần).

**Bỏ qua:** Triển khai Backend, schema database, logic nghiệp vụ.

---

### 4️⃣ Sửa lỗi (không phải P0 Critical)

**Đọc (theo thứ tự):**
1.  ✅ Thông báo lỗi/stack trace.
2.  ✅ Tệp mã nguồn liên quan.
3.  ✅ Tệp test liên quan.
4.  ✅ [reference/06_TROUBLESHOOTING.md](reference/06_TROUBLESHOOTING.md) (nếu là vấn đề tương tự).

**Bỏ qua:** Workflow, logic nghiệp vụ, các module không liên quan.

---

### 5️⃣ Viết Test

**Đọc (theo thứ tự):**
1.  ✅ [guides/testing/Strategy-&-Coverage.md](guides/testing/Strategy-&-Coverage.md) - Chiến lược test & trạng thái E2E.
2.  ✅ Test hiện có tương tự.
3.  ✅ Mã nguồn đang được test.


**Bỏ qua:** Logic nghiệp vụ đầy đủ, tài liệu API.

**Trạng thái Test E2E:**
-   **Tổng cộng 50 test:** 22 test pass (44%), 28 test đang chờ triển khai UI.
-   **Chạy:** `pnpm test:playwright`
-   **Tệp:** auth, dashboard, customers, orders, navigation, error-pages

---

### 6️⃣ Tích hợp với External API

**Đọc (theo thứ tự):**
1.  ✅ [AGENTS.md](../AGENTS.md) - Quy trình làm việc.
2.  ✅ [reference/05_INTEGRATION_APIS.md](reference/05_INTEGRATION_APIS.md) - Các API bên ngoài.
3.  ✅ [essential/ENVIRONMENT.md](essential/ENVIRONMENT.md) - Biến môi trường.
4.  ✅ [guides/settings/README.md](guides/settings/README.md) - Hướng dẫn sử dụng module Settings.

**Bỏ qua:** Frontend docs, schema database.

---

### 7️⃣ Thay đổi Schema Database

**Đọc (theo thứ tự):**
1.  ✅ [essential/03_DATABASE_SCHEMA.md](essential/03_DATABASE_SCHEMA.md) - Schema hiện tại.
2.  ✅ [essential/01_BUSINESS_LOGIC.md](essential/01_BUSINESS_LOGIC.md) - Quy tắc nghiệp vụ.
3.  ✅ [essential/01_BUSINESS_LOGIC.md](essential/01_BUSINESS_LOGIC.md) - Mục 7.1: Quy tắc multi-tenant.
4.  ✅ Các migration hiện có.

**Bỏ qua:** Frontend docs, tài liệu tích hợp.

---

## 📁 Cấu trúc tài liệu

### Thiết yếu (Đọc thường xuyên)
-   **[AGENTS.md](../AGENTS.md)** - Quy trình làm việc của AGENT.
-   **[ROADMAP.md](../ROADMAP.md)** - Theo dõi nhiệm vụ.
-   **[DEVELOPMENT_LESSONS_LEARNED.md](../DEVELOPMENT_LESSONS_LEARNED.md)** - 10 quy tắc mã hóa.

### Tài liệu thiết yếu (docs/essential/)
-   **[ENVIRONMENT.md](essential/ENVIRONMENT.md)** - Thiết lập & biến môi trường.
-   **[01_BUSINESS_LOGIC.md](essential/01_BUSINESS_LOGIC.md)** - Quy tắc nghiệp vụ.
-   **[03_DATABASE_SCHEMA.md](essential/03_DATABASE_SCHEMA.md)** - Thiết kế database.

### Tài liệu tham khảo (docs/reference/)
-   **[04_API_REFERENCE.md](reference/04_API_REFERENCE.md)** - Các endpoint API.
-   **[05_INTEGRATION_APIS.md](reference/05_INTEGRATION_APIS.md)** - Các API bên ngoài.
-   **[06_TROUBLESHOOTING.md](reference/06_TROUBLESHOOTING.md)** - Các vấn đề phổ biến.
-   **[Documentation-Map.md](reference/Documentation-Map.md)** - Mục lục tài liệu.

### Hướng dẫn (docs/guides/)
-   **[testing/Strategy-&-Coverage.md](guides/testing/Strategy-&-Coverage.md)** - Chiến lược test.
-   **[integration/README.md](guides/integration/README.md)** - Hướng dẫn tích hợp.
-   **[settings/README.md](guides/settings/README.md)** - Module Settings.
-   **[architecture/README.md](guides/architecture/README.md)** - Tổng quan kiến trúc.

### Lưu trữ (Hiếm khi cần)
-   **[archive/AGENTS.md](../AGENTS.md)** - Hướng dẫn vận hành AI (Đã lỗi thời, sẽ chuyển vào archive).
-   **[archive/WORKFLOW-SIMPLE.md](../WORKFLOW-SIMPLE.md)** - Quy trình làm việc đơn giản (Đã lỗi thời, sẽ chuyển vào archive).
-   **[archive/WORKFLOW.md](archive/WORKFLOW.md)** - Quy trình làm việc chi tiết (legacy).
-   **[archive/02_IMPLEMENTATION_PLAN.md](archive/02_IMPLEMENTATION_PLAN.md)** - Kế hoạch triển khai gốc.
-   **[archive/00_PROJECT_OVERVIEW.md](archive/00_PROJECT_OVERVIEW.md)** - Tổng quan dự án lỗi thời.

---

## ⚡ Lệnh nhanh

```bash
# Development
pnpm --filter @meocrm/api dev     # Backend dev server
pnpm --filter @meocrm/web dev     # Frontend dev server

# Testing
pnpm --filter @meocrm/api test    # Backend unit tests
pnpm test:playwright               # E2E tests

# Database
pnpm --filter @meocrm/api prisma:generate  # Generate Prisma client
pnpm --filter @meocrm/api prisma:migrate   # Run migrations

# Build
pnpm build                         # Build all packages
```

---

## 🎯 Ví dụ tải ngữ cảnh

### Ví dụ 1: "Sửa lỗi không trừ tồn kho khi đơn hàng được xử lý"
```
✅ Đọc: AGENTS.md (để hiểu quy trình)
✅ Đọc: ROADMAP.md (Mục 3, P0 - Critical)
✅ Đọc: essential/01_BUSINESS_LOGIC.md (Mục 1.1: PROCESSING & 3.1: Stock Deduction)
✅ Đọc: essential/03_DATABASE_SCHEMA.md (Order, OrderItem, Inventory, OrderInventoryReservation models)
✅ Đọc: reference/04_API_REFERENCE.md (PATCH /orders/:id/status endpoint)
✅ Tải: apps/api/src/orders/orders.service.ts
✅ Tải: apps/api/src/inventory/inventory.service.ts
❌ Bỏ qua: Frontend docs, tài liệu tích hợp không liên quan.
```

### Ví dụ 2: "Thêm API tính toán chiết khấu đơn hàng mới"
```
✅ Đọc: AGENTS.md (để hiểu quy trình)
✅ Đọc: essential/01_BUSINESS_LOGIC.md (Mục 4: Pricing & Discount Rules)
✅ Đọc: essential/03_DATABASE_SCHEMA.md (Order, OrderItem models)
✅ Đọc: DEVELOPMENT_LESSONS_LEARNED.md (Các quy tắc mã hóa)
❌ Bỏ qua: Frontend docs, tài liệu tích hợp không liên quan.
```

### Ví dụ 3: "Fix lỗi chuyển hướng đăng nhập"
```
✅ Đọc: AGENTS.md (để hiểu quy trình)
✅ Đọc: Thông báo lỗi/stack trace
✅ Tải: auth/login/page.tsx
✅ Tải: auth.test.tsx
✅ Kiểm tra: reference/06_TROUBLESHOOTING.md
❌ Bỏ qua: Tất cả tài liệu workflow và logic nghiệp vụ không liên quan.
```



---

## 🔄 Quản lý phiên làm việc

### Bắt đầu phiên
1.  Tải: [AGENTS.md](../AGENTS.md) + [ROADMAP.md](../ROADMAP.md)
2.  Nhận: Nhiệm vụ từ người dùng (kèm screenshot nếu có)
3.  Tải: Các tài liệu bổ sung dựa trên loại nhiệm vụ (xem ở trên)
4.  Xác nhận: Hiểu và kế hoạch

### Trong phiên làm việc
-   Tải tài liệu **chỉ khi cần**
-   Tham chiếu [DEVELOPMENT_LESSONS_LEARNED.md](../DEVELOPMENT_LESSONS_LEARNED.md) cho các quy tắc mã hóa.
-   Cập nhật trạng thái nhiệm vụ trong [ROADMAP.md](../ROADMAP.md).

### Kết thúc phiên
-   Commit: Code + test (sau khi tất cả test đã pass).
-   Cập nhật: [ROADMAP.md](../ROADMAP.md).
-   Tóm tắt: Những gì đã hoàn thành, những gì tiếp theo.

---

**Cập nhật lần cuối:** 2025-11-19
**Duy trì bởi:** AGENT + MeoCRM Development Team