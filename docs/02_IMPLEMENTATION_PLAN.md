# MeoCRM Implementation Plan & Roadmap

> **Updated:** 2025-11-09 - Phân tích dependencies đầy đủ cho 144 tasks
> 

> **Mục đích:** Xác định thứ tự implementation tối ưu dựa trên task dependencies
> 

---

### 📊 Task Dependencies Analysis Summary

**Tổng quan:**

- **Total incomplete tasks:** 144 tasks (2 In Progress + 142 Todo)
- **Critical path length:** ~8 weeks (nếu tuần tự)
- **Parallelizable tasks:** ~60% (có thể làm song song sau khi foundation xong)
- **Blocking tasks:** 23 tasks (tasks mà nhiều tasks khác depend vào)

**Dependency Levels:**

- **Level 0 (No dependencies):** 28 tasks - Foundation/Infrastructure
- **Level 1 (Depend on Level 0):** 35 tasks - Core modules setup
- **Level 2 (Depend on Level 1):** 45 tasks - Feature implementation
- **Level 3 (Depend on Level 2):** 36 tasks - Advanced features & integrations

---

### 🎯 Sprint Planning Roadmap

### **SPRINT 1: Foundation (Week 1-2)** - 28 tasks, 45 story points

**Goal:** Setup cơ sở hạ tầng, authentication, và database foundation

**Backend (18 tasks, 28 SP):**

- `DB-003` ✅ Create initial migration (1 SP) - **BLOCKING 120+ tasks**
- `AUTH-001` ✅ Setup AuthModule (1 SP) - **BLOCKING 8 tasks**
- `AUTH-002` ✅ Register endpoint (2 SP)
- `AUTH-003` ✅ Login endpoint (2 SP)
- `AUTH-004` ✅ JWT strategy (1 SP)
- `AUTH-006` ✅ JwtAuthGuard (1 SP)
- `AUTH-007` ✅ @Public() decorator (1 SP)
- `AUTH-008` ✅ @CurrentUser() decorator (1 SP)
- `INFRA-003` ✅ GitHub Actions CI/CD (2 SP)
- `INFRA-004` ✅ Environment variables (1 SP) - **BLOCKING 15 tasks**
- `DB-004` ✅ Seed script (2 SP)
- `DOC-001` ✅ Install Swagger (1 SP)
- `DOC-002` ✅ API decorators (2 SP)
- `DOC-003` ✅ Swagger auth docs (1 SP)
- `TEST-001` ✅ E2E test database (2 SP)
- `TEST-002` ✅ E2E auth tests (2 SP)
- `TEST-005` ✅ E2E CI/CD integration (2 SP)
- `AUTH-005` ✅ Auth unit tests (2 SP)

**Frontend (8 tasks, 14 SP):**

- `FE-001` ✅ Login page (2 SP) - **BLOCKING 20 frontend tasks**
- `FE-002` ✅ Register page (2 SP)
- `FE-003` ✅ Auth context & hooks (2 SP) - **BLOCKING 18 frontend tasks**
- `FE-004` ✅ Layout component (2 SP) - **BLOCKING 16 frontend tasks**
- `FE-005` ✅ Sidebar navigation (2 SP)
- `FE-006` ✅ Header component (1 SP)
- `FE-007` ✅ Responsive design (1 SP)

**Testing (2 tasks, 3 SP):**

- `TEST-003` ✅ Tenant isolation tests (3 SP) - **CRITICAL**
- `SEC-002` ⚠️ Multi-tenant security audit (5 SP) - **Có thể làm song song**

**Dependencies:**

- Không có dependencies - Có thể start ngay
- DB-003 phải xong trước khi làm bất kỳ module nào khác
- AUTH-001 → AUTH-002/003/004/005/006/007/008
- FE-001/003/004 **BLOCKING** toàn bộ frontend tasks khác

---

### **SPRINT 2: Core Modules - Products & Categories (Week 3-4)** - 32 tasks, 52 SP

**Goal:** Products, Categories, Inventory foundation

**Depends on:** Sprint 1 hoàn thành (DB-003, AUTH-001, FE-004)

**Backend (22 tasks, 36 SP):**

- `PROD-001` ✅ Setup ProductsModule (1 SP) - **BLOCKING 15 product tasks**
- `PROD-002` ✅ GET /products (2 SP)
- `PROD-003` ✅ POST /products (2 SP)
- `PROD-004` ✅ GET /products/:id (1 SP)
- `PROD-005` ✅ PATCH /products/:id (2 SP)
- `PROD-006` ✅ DELETE /products/:id (1 SP)
- `PROD-007` ✅ Pagination (1 SP)
- `PROD-008` ✅ Filters (2 SP)
- `PROD-009` ✅ Search (2 SP)
- `PROD-010` ✅ Sorting (1 SP)
- `PROD-011` ✅ Products tests (2 SP)
- `CAT-001` ✅ Setup CategoriesModule (1 SP) - **BLOCKING 3 tasks**
- `CAT-002` ✅ Categories CRUD (2 SP)
- `CAT-003` ✅ Nested tree (2 SP)
- `CAT-004` ✅ Prevent circular refs (1 SP)
- `PROD-012` ✅ Support variants (2 SP) - **BLOCKING PROD-013/014/015/016**
- `PROD-013` ✅ SKU generation (1 SP)
- `PROD-014` ✅ Variant CRUD (2 SP)
- `PROD-015` ✅ Variants tests (1 SP)
- `PROD-016` 🔥 Variant price logic (2 SP) - **Business logic critical**
- `DISC-005` ⚠️ Pricing validation (2 SP)
- `INV-001` ✅ Setup InventoryModule (1 SP) - **BLOCKING 9 inventory tasks**
- `INV-002` ✅ GET inventory by branch (2 SP)
- `INV-003` ✅ Stock adjustment (2 SP)

**Frontend (7 tasks, 13 SP):**

- `FE-008` ✅ Products list page (3 SP)
- `FE-009` ✅ Product create form (3 SP)
- `FE-010` ✅ Product edit form (2 SP)
- `FE-011` ⚠️ Variants UI (2 SP)
- `FE-012` ⚠️ Filters sidebar (2 SP)
- `FE-013` ⚠️ Search functionality (1 SP)

**Backend Advanced (1 task, 5 SP):**

- `PROD-ADV-001` 🚧 Advanced filtering (5 SP) - **Đang In Progress**

**Key Blockers:**

- PROD-001 blocks 15 product tasks
- PROD-012 (variants support) blocks PROD-013/014/015/016
- CAT-001 blocks CAT-002/003/004
- INV-001 blocks toàn bộ inventory operations

---

### **SPRINT 3: CRM Core - Customers (Week 5)** - 13 tasks, 25 SP

**Goal:** Customer management & segmentation

**Depends on:** Sprint 2 (PROD-001, INV-001)

**Backend (8 tasks, 17 SP):**

- `CUST-001` ✅ Setup CustomersModule (1 SP) - **BLOCKING 7 tasks**
- `CUST-002` ✅ Customers CRUD (2 SP)
- `CUST-003` ✅ Auto-generate code (1 SP)
- `CUST-004` ✅ Customer search (1 SP)
- `CUST-005` ✅ CRM fields (2 SP)
- `CUST-008` 🔥 Duplicate prevention (2 SP) - **Business logic: phone unique**
- `CUST-006` 🔥🔥 Auto-segmentation (5 SP) - **Business logic critical**
- `CUST-007` 🔥🔥 Stats auto-update (3 SP) - **Business logic critical**

**Frontend (1 task, 0 SP):**

- ✅ **Customers Frontend đã hoàn thành** (FE-CUSTOMERS-001) - 1,044 LOC

**Note:** Frontend customers đã xong, chỉ cần backend APIs

**Key Blockers:**

- CUST-001 blocks 7 customer tasks
- CUST-006/007 **CRITICAL** - Phải implement đúng business logic (Batch 1 decisions)

---

### **SPRINT 4: POS & Orders Core (Week 6-7)** - 24 tasks, 48 SP

**Goal:** Order workflow, POS interface, stock deduction

**Depends on:** Sprint 2 (Products), Sprint 3 (Customers)

**Backend - Orders (16 tasks, 32 SP):**

- `ORD-001` ✅ Setup OrdersModule (1 SP) - **BLOCKING 11 order tasks**
- `ORD-002` 🔥🔥 POST /orders with items (3 SP) - **Business logic: stock check + warning**
- `ORD-003` 🔥🔥 Calculate totals (2 SP) - **Business logic: discount, VAT**
- `ORD-004` 🔥🔥 Update customer stats (2 SP) - **Business logic: PENDING tăng stats**
- `ORD-005` 🔥 Order status workflow (1 SP)
- `ORD-007` 🔥 Status transition validation (2 SP) - **Business logic: PENDING → CANCELLED only**
- `ORD-008` 🔥🔥🔥 Cancellation logic (3 SP) - **CRITICAL - Stock restore, debt rollback**
- `ORD-010` 🔥🔥🔥 Stock deduction on status change (5 SP) - **CRITICAL - Trừ khi PROCESSING**
- `ORD-011` 🔥 Validation rules (2 SP)
- `ORD-012` 🔥 Automatic actions (3 SP)
- `ORD-009` ⚠️ Refund processing (3 SP)
- `ORD-006` ✅ Orders E2E tests (2 SP)
- `TEST-004` ✅ E2E orders flow (3 SP)
- `ORD-BACKEND-001` 🚧 Orders CRUD & Workflow (8 SP) - **Đang In Progress**

**Backend - Inventory (3 tasks, 7 SP):**

- `INV-006` 🔥🔥 Stock return on cancel (3 SP) - **CRITICAL - Business logic**
- `INV-007` 🔥 Negative stock prevention (2 SP) - **Business logic: block khi = 0**
- `INV-008` ⚠️ Transaction logging (3 SP)
- `INV-004` ⚠️ Low stock alerts (1 SP)

**Frontend - POS (6 tasks, 15 SP):**

- `FE-014` 🔥 POS product grid (3 SP)
- `FE-015` 🔥 POS cart (3 SP)
- `FE-016` ⚠️ Customer search in POS (2 SP)
- `FE-017` ⚠️ Shipping partner selection (2 SP)
- `FE-018` 🔥 Payment flow (2 SP)
- `FE-019` 🔥 Order completion (2 SP)

**Key Blockers:**

- ORD-001 blocks 11 order tasks
- ORD-002 **BLOCKING** ORD-003/004/005 (phải có order creation trước)
- ORD-010 (stock deduction) **CRITICAL** - Depend vào business logic decisions
- INV-006 **MUST** implement cùng ORD-008 (cancellation)

---

### **SPRINT 5: Shipping & Logistics (Week 8-9)** - 12 tasks, 27 SP

**Goal:** Shipping integration, COD handling, failed delivery

**Depends on:** Sprint 4 (ORD-001, ORD-002)

**Backend - Shipping (12 tasks, 27 SP):**

- `SHIP-001` ✅ Setup ShippingModule (1 SP) - **BLOCKING 10 tasks**
- `SHIP-002` 🔥🔥 Create shipping order (2 SP) - **Business logic: manual trigger**
- `SHIP-003` ✅ Update tracking (1 SP)
- `SHIP-006` 🔥🔥🔥 Shipping fee calculation (5 SP) - **CRITICAL - API + fallback**
- `SHIP-007` 🔥🔥 COD reconciliation (3 SP) - **Business logic: auto-update + revert**
- `SHIP-008` 🔥🔥 Failed delivery handling (3 SP) - **Business logic: PENDING + confirm return**
- `SHIP-009` 🔥 Returned delivery (3 SP)
- `SHIP-011` 🔥🔥🔥 GHN/GHTK API integration (8 SP) - **CRITICAL - External dependency**
- `SHIP-004` ⚠️ COD tracking (1 SP)
- `SHIP-005` ⚠️ Integration prep (1 SP)
- `SHIP-010` ⚠️ Partner debt (3 SP)

**Key Blockers:**

- SHIP-001 blocks 10 shipping tasks
- SHIP-011 (GHN/GHTK) **CRITICAL** - Cần API credentials, testing accounts
- SHIP-006 **MUST** implement fallback mechanism (Business logic: API + DB rates)

---

### **SPRINT 6: Finance & Discounts (Week 10)** - 11 tasks, 24 SP

**Goal:** Payment methods, discounts, debt management

**Depends on:** Sprint 4 (ORD-002, ORD-003)

**Backend - Finance (5 tasks, 12 SP):**

- `FIN-001` ✅ Setup FinanceModule (1 SP) - **BLOCKING 4 tasks**
- `FIN-002` 🔥🔥 Partial payment (5 SP) - **Business logic: KHÔNG hỗ trợ (MVP)**
- `FIN-003` 🔥 Payment validation (3 SP) - **Business logic: COD khi có shipping**
- `FIN-004` 🔥🔥🔥 Debt management (3 SP) - **CRITICAL - Business logic: có thể âm**
- `FIN-005` ⚠️ Cash rounding (2 SP) - **Business logic: KHÔNG làm tròn**

**Backend - Discounts (6 tasks, 18 SP):**

- `DISC-001` ✅ Setup DiscountsModule (1 SP)
- `DISC-002` 🔥 Order-level discount (3 SP) - **Business logic: Admin/Manager only**
- `DISC-003` 🔥🔥 Item-level discount (3 SP) - **Business logic: phân bổ tỷ lệ**
- `DISC-004` ⚠️ Auto-discount by segment (5 SP)
- `DISC-006` 🔥 VAT calculation (3 SP) - **Business logic: configurable, exempt support**

**Key Blockers:**

- FIN-001 blocks 4 finance tasks
- FIN-004 **CRITICAL** - Phải implement đúng: debt có thể âm (overpayment)
- DISC-003 phức tạp - Phân bổ order discount theo tỷ lệ item

---

### **SPRINT 7: Suppliers & Advanced Inventory (Week 11)** - 7 tasks, 11 SP

**Goal:** Supplier management, inter-branch transfers

**Depends on:** Sprint 2 (INV-001, PROD-001)

**Backend - Suppliers (4 tasks, 5 SP):**

- `SUP-001` ✅ Setup SuppliersModule (1 SP)
- `SUP-002` ✅ Suppliers CRUD (2 SP)
- `SUP-003` ⚠️ Stats tracking (1 SP)
- `SUP-004` ✅ Tests (1 SP)

**Backend - Inventory Advanced (2 tasks, 3 SP):**

- `INV-005` 🔥🔥 Inter-branch transfers (2 SP) - **Business logic: 3-stage workflow**

**Note:** Inter-branch transfers có business logic phức tạp (Batch 2 Câu 31-33):

- PENDING → IN_TRANSIT (trừ stock source) → RECEIVED (cộng stock dest)
- Có thể cancel PENDING/IN_TRANSIT (hoàn stock nếu IN_TRANSIT)

**Key Blockers:**

- SUP-001 blocks SUP-002/003/004
- INV-005 phụ thuộc SHIP-011 (nếu dùng GHN/GHTK cho transfer)

---

### **SPRINT 8: Notifications & Audit (Week 12)** - 11 tasks, 21 SP

**Goal:** Email/SMS notifications, audit logging

**Depends on:** Sprint 4 (ORD-001), Sprint 5 (SHIP-001)

**Backend - Notifications (7 tasks, 16 SP):**

- `NOTIF-001` ✅ Setup NotificationsModule (1 SP)
- `NOTIF-002` ⚠️ Email integration (5 SP) - **SendGrid/AWS SES**
- `NOTIF-003` ⚠️ SMS integration (5 SP) - **Twilio/SMSVN**
- `NOTIF-004` 🔥 Order status notifications (3 SP)
- `NOTIF-005` ⚠️ Shipping notifications (2 SP)
- `NOTIF-006` 🔥 Stock alerts (2 SP) - **Business logic: Email only**
- `NOTIF-007` ⚠️ WebSocket (5 SP) - **Low priority**

**Backend - Audit (4 tasks, 9 SP):**

- `AUDIT-001` ✅ Setup AuditLogModule (2 SP)
- `AUDIT-002` 🔥 Order actions logging (3 SP)
- `AUDIT-003` 🔥 Inventory actions logging (2 SP)
- `AUDIT-004` 🔥 Sensitive actions logging (2 SP)

**Key Blockers:**

- NOTIF-001 blocks 6 notification tasks
- AUDIT-001 blocks 3 audit tasks
- NOTIF-002/003 cần external service credentials

---

### **SPRINT 9: Integrations (Week 13-14)** - 13 tasks, 19 SP

**Goal:** API keys, webhooks, MCP, OAuth

**Depends on:** Sprint 1 (AUTH-001)

**Backend - API Keys (4 tasks, 6 SP):**

- `API-001` ✅ Setup ApiKeysModule (1 SP)
- `API-002` ✅ Generate API keys (2 SP)
- `API-003` ✅ ApiKeyGuard (2 SP)
- `API-004` ✅ Rate limiting (1 SP)

**Backend - Webhooks (5 tasks, 8 SP):**

- `WH-001` ✅ Setup WebhooksModule (1 SP)
- `WH-002` ✅ Webhooks CRUD (2 SP)
- `WH-003` ✅ Event emitter (2 SP)
- `WH-004` ✅ Delivery with retry (2 SP)
- `WH-005` ✅ HMAC signature (1 SP)

**Backend - MCP (4 tasks, 5 SP):**

- `MCP-001` ✅ Install MCP SDK (1 SP)
- `MCP-002` ✅ Register 6 tools (2 SP)
- `MCP-003` ✅ Implement handlers (2 SP)
- `MCP-004` ⚠️ Test with AI agents (1 SP)

**Key Blockers:**

- API-001 blocks API-002/003/004
- WH-001 blocks WH-002/003/004/005
- MCP-001 blocks MCP-002/003/004

---

### **SPRINT 10: Reports & Analytics (Week 15)** - 6 tasks, 14 SP

**Goal:** Dashboards, analytics

**Depends on:** Sprint 4 (ORD-001), Sprint 2 (PROD-001), Sprint 3 (CUST-001)

**Backend - Reports (3 tasks, 11 SP):**

- `RPT-001` ⚠️ Sales dashboard (5 SP)
- `RPT-002` ⚠️ Inventory dashboard (3 SP)
- `RPT-003` ⚠️ Customer analytics (3 SP)

**Infrastructure (2 tasks, 6 SP):**

- `INFRA-009` ⚠️ GDPR compliance (3 SP) - **Business logic: soft delete 6 months**

**Key Blockers:**

- RPT-001/002/003 phụ thuộc nhiều modules khác đã hoàn thành

---

### 🚨 Critical Path & Bottlenecks

**Top 10 Blocking Tasks (MUST complete first):**

1. **DB-003** (Create migration) - Blocks 120+ tasks
2. **AUTH-001** (Setup AuthModule) - Blocks 8 tasks
3. **FE-001** (Login page) - Blocks 20 frontend tasks
4. **FE-003** (Auth context) - Blocks 18 frontend tasks
5. **FE-004** (Layout component) - Blocks 16 frontend tasks
6. **PROD-001** (Setup ProductsModule) - Blocks 15 product tasks
7. **INV-001** (Setup InventoryModule) - Blocks 9 inventory tasks
8. **CUST-001** (Setup CustomersModule) - Blocks 7 customer tasks
9. **ORD-001** (Setup OrdersModule) - Blocks 11 order tasks
10. **SHIP-001** (Setup ShippingModule) - Blocks 10 shipping tasks

**Business Logic Critical Tasks (MUST follow decisions):**

1. **ORD-010** 🔥🔥🔥 Stock deduction - Trừ khi PROCESSING (Batch 1 Decision #1)
2. **ORD-008** 🔥🔥🔥 Cancellation logic - PENDING only, rollback stats/debt (Batch 1 #2, #3, #4)
3. **ORD-002** 🔥🔥 Create order - Stock check + warning, allow creation (Batch 6 #26)
4. **FIN-004** 🔥🔥🔥 Debt management - Có thể âm (overpayment) (Batch 7 #30)
5. **SHIP-006** 🔥🔥🔥 Shipping fee - API first + DB fallback (Batch 1 #5)
6. **SHIP-008** 🔥🔥 Failed delivery - PENDING + confirm return (Batch 5 #23)
7. **CUST-006** 🔥🔥 Auto-segmentation - User-defined conditions (Batch 2 #9)
8. **CUST-007** 🔥🔥 Stats update - PENDING tăng, CANCELLED trừ (Batch 1 #4)
9. **DISC-003** 🔥🔥 Item-level discount - Phân bổ tỷ lệ (Batch 4 #18)
10. **INV-006** 🔥🔥 Stock return - Branch gốc (Batch 3 #11)
