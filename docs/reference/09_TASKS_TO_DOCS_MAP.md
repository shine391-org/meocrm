# Task → Documentation Map (Retail)

> **Mục tiêu:** giúp agent đi từ mã task (POS-001, PROD-001, …) → đúng tài liệu nghiệp vụ, UI và schema hiện có trong repo.
>
> **Scope:** 83 tasks bán lẻ do boss cung cấp. Khi viết code/viết thêm docs mới, LUÔN cập nhật bảng này.

---

## 1. POS Module (POS-001 → POS-012)

| Task | Mô tả ngắn | Docs nghiệp vụ | UI / Flow | Schema/API |
|------|-----------|----------------|-----------|------------|
| POS-001 Three Sale Modes | Bán nhanh / Bán thường / Bán giao hàng | `docs/essential/01_BUSINESS_LOGIC.md` → `1️⃣ Order Processing Rules` + `docs/reference/08_RETAIL_OPERATIONS.md` → "5. POS & Payments" | `docs/reference/07_UI_REFERENCE.md` → `3. POS Workspace` + `12. POS Enhancements` | Sau: thêm enum `SaleMode` trong `docs/essential/03_DATABASE_SCHEMA.md` (Order). |
| POS-002 Multi-Tab System | Nhiều tab hóa đơn trong POS | `docs/reference/08_RETAIL_OPERATIONS.md` → section POS tabs | `docs/reference/07_UI_REFERENCE.md` → `3.1 Layout` (invoice tabs) | Local storage structure sẽ được mô tả thêm trong `docs/guides/operations/pos-playbook.md` (phần 1, 2). |
| POS-003 Payment Methods | 5 phương thức thanh toán + multi-payment | `docs/reference/08_RETAIL_OPERATIONS.md` → bảng "Phương thức thanh toán" | `docs/reference/07_UI_REFERENCE.md` → `3.1 Layout`, `12.2 Payment & Channels` | Bổ sung schema Payment trong `03_DATABASE_SCHEMA.md` (TODO). |
| POS-004 Quick Amount Buttons | Nút tiền nhanh & "Đúng tiền" | `docs/guides/operations/pos-playbook.md` → mục 2.5 | `docs/reference/07_UI_REFERENCE.md` → `3.1 Layout`, `12.2` | Không thay đổi schema. |
| POS-005 Customer Search Integration | Tìm kiếm + tạo khách inline | `docs/modules/CUSTOMERS.md` (TODO file) + `docs/reference/08_RETAIL_OPERATIONS.md` → 5. POS & Payments | `docs/reference/07_UI_REFERENCE.md` → `3.1 Layout` (customer selector), `12.3 Seller Picker & Customer Modal` | Endpoint sẽ nằm ở `docs/reference/04_API_REFERENCE.md` → Customers. |
| POS-006 Product Grid & Search | Grid sản phẩm bên phải màn POS | Business rules chung: `03_DATABASE_SCHEMA.md` Products | `docs/reference/07_UI_REFERENCE.md` → `3.1 Layout` (Right panel) | `04_API_REFERENCE.md` → Products search. |
| POS-007 Cart Management | Thao tác cart (tăng/giảm, giảm giá, tổng) | `docs/essential/01_BUSINESS_LOGIC.md` (Order totals) | `docs/reference/07_UI_REFERENCE.md` → `3.1 Layout`, `12.2` | Schema Order/OrderItem trong `03_DATABASE_SCHEMA.md`. |
| POS-008 Shipping Partner Selector | Chọn đối tác giao hàng ngay trong POS | `docs/reference/08_RETAIL_OPERATIONS.md` → 4. Sales & Fulfillment | `docs/reference/07_UI_REFERENCE.md` → `12.1 Sale Modes & Delivery Panel` | ShippingOrder & partner list trong `04_API_REFERENCE.md` & `05_INTEGRATION_APIS.md`. |
| POS-009 Receipt Printing | In hóa đơn + phiếu giao hàng | Business: `01_BUSINESS_LOGIC.md` → Refund/Receipt rules | `docs/reference/07_UI_REFERENCE.md` → `12.4 Printouts` | Kỹ thuật in chi tiết đưa vào `docs/technical/PRINTING.md` (TODO). |
| POS-010 Discount Application | Giảm giá theo dòng/toàn đơn | `01_BUSINESS_LOGIC.md` → Discount rules (TODO section) | POS: `07_UI_REFERENCE.md` → `12.2 Payment & Channels` | Bổ sung trường discount trong Order/OrderItem `03_DATABASE_SCHEMA.md`. |
| POS-011 Barcode Scanning | Scan barcode để thêm hàng | `docs/technical/BARCODE_SCANNING.md` (TODO) | `07_UI_REFERENCE.md` → `3.1 Layout` (search + barcode icon) | Không đổi schema, dùng Product.sku. |
| POS-012 End of Day Report | Báo cáo cuối ngày POS | `docs/modules/REPORTS.md` (TODO) + `08_RETAIL_OPERATIONS.md` → 2 & 5 | UI chưa có screenshot riêng (sẽ bổ sung sau) | Endpoint nằm ở `04_API_REFERENCE.md` → `/reports/pos-eod`. |

> Khi implement một task POS, agent nên đọc: (1) `01_BUSINESS_LOGIC`, (2) `03_DATABASE_SCHEMA`, (3) `07_UI_REFERENCE`, (4) `08_RETAIL_OPERATIONS`, (5) POS Playbook.

---

## 2. Products Module (PROD-001 → PROD-015)

> **Schema gốc** đã có trong `docs/essential/03_DATABASE_SCHEMA.md` (phần Products). Module docs chi tiết (`docs/modules/PRODUCTS.md`, `docs/frontend/specs/PRODUCTS.md`) sẽ được tạo dần khi implement batch.

| Task | Docs chính hiện tại | Ghi chú tái sử dụng UI |
|------|---------------------|------------------------|
| PROD-001 Product CRUD | `03_DATABASE_SCHEMA.md` → Products, Category + `04_API_REFERENCE.md` → Products | UI list & detail sử dụng screenshot `inventory-list.png`, `inventory-detail.png` trong `07_UI_REFERENCE.md` (sections 4 & 7). |
| PROD-002 Product Variants | `03_DATABASE_SCHEMA.md` → ProductVariant | UI: chi tiết hàng hóa (tab Variants) – sẽ bổ sung vào `07_UI_REFERENCE.md` khi boss gửi hình. |
| PROD-003 Categories | `03_DATABASE_SCHEMA.md` → Category | Không có screenshot riêng; tầng filter bên trái của Inventory list thể hiện Category filter. |
| PROD-004 Images | `03_DATABASE_SCHEMA.md` → Product.images + `docs/technical/FILE_STORAGE.md` (TODO) | UI gallery nằm trong chi tiết sản phẩm. |
| PROD-005/006 Import/Export | `07_UI_REFERENCE.md` → Inventory/Price book + action `Import/Export` | Chi tiết CSV spec sẽ ghi ở `docs/modules/PRODUCTS.md#Import-Export` (TODO). |
| PROD-007 Price Lists | `07_UI_REFERENCE.md` → 5. Price Book | Mapping với bảng giá chung + schema PriceList (TODO trong `03_DATABASE_SCHEMA.md`). |
| PROD-008 Suppliers | `07_UI_REFERENCE.md` → 7. Supplier Management | Thay vì module riêng, tái sử dụng UI Supplier list + modal. |
| PROD-009..015 Filters/Bulk/Detail/Alerts/Status/Search/Duplicate | `07_UI_REFERENCE.md` → 4. Inventory Command Center & 7. Supplier Management | Toàn bộ behavior nâng cấp filter & bulk thao tác dựa trên giao diện inventory đã mô tả. |

---

## 3. Customers Module (CUST-001 → CUST-012)

Hiện tại UI khách hàng chi tiết chưa được boss gửi screenshot; docs sẽ tập trung vào schema + tích hợp POS.

- Schema: `03_DATABASE_SCHEMA.md` → Customer, CustomerGroup, Loyalty/Points (TODO sections).
- Nghiệp vụ: file mới `docs/modules/CUSTOMERS.md` (TODO) sẽ gom các rules cho CUST-001→012.
- POS liên quan: `07_UI_REFERENCE.md` → 12.3 (Customer modal) thể hiện trực quan cho CUST-004 (Invoice info).

> Khi nhận thêm hình màn hình Khách hàng, cần cập nhật `07_UI_REFERENCE.md` và bổ sung đường dẫn vào bảng này.

---

## 4. Orders Module (ORD-001 → ORD-010)

Orders được thể hiện ở nhiều nơi: Đặt hàng, Hóa đơn, Trả hàng, POS.

| Task | UI chính | Docs nghiệp vụ |
|------|---------|----------------|
| ORD-001 CRUD | `07_UI_REFERENCE.md` → 10. Sales Admin, 11.1 Invoice Center | `01_BUSINESS_LOGIC.md` → 1️⃣ Order Processing Rules; `03_DATABASE_SCHEMA.md` → Order, OrderItem. |
| ORD-002 Status Workflow | Workflow đã mô tả chi tiết ở `01_BUSINESS_LOGIC.md` section 1.1–1.2 | UI status badges trong Order/Invoice/Return. |
| ORD-003 Draft Orders | Dựa trên Đặt hàng & Hóa đơn với trạng thái Phiếu tạm | Ghi rõ thêm trong `08_RETAIL_OPERATIONS.md` mục 4. |
| ORD-004 Partial Payment | Reuse Payment schema (POS-003) + Order.debt | docs to update: `03_DATABASE_SCHEMA.md` + `modules/ORDERS.md` (TODO). |
| ORD-005..010 Filters/Bulk/Detail/Create/Import/Export | `07_UI_REFERENCE.md` → 10. Sales Admin, 11.1 Invoice Center | Chi tiết sẽ nằm trong `docs/frontend/specs/ORDERS.md` (TODO). |

---

## 5. Shipping Module (SHIP-001 → SHIP-010)

Screens liên quan: panel giao hàng trong POS, Đơn hàng, Hóa đơn, vận đơn KShip, preview phiếu giao hàng.

- UI: `07_UI_REFERENCE.md` → 10 (Sales Admin), 11 (Invoices & Returns), 12.1, 12.4.
- Nghiệp vụ & tích hợp: `05_INTEGRATION_APIS.md` (Shipping) + file mới `docs/modules/SHIPPING.md` + `docs/05_SHIPPING_INTEGRATION.md` (TODO, tách chi tiết 9 partners, COD, label, zones, bulk).
- Retail flow: `08_RETAIL_OPERATIONS.md` → 4. Sales & Fulfillment.

Bảng mapping chi tiết cho SHIP-001→010 sẽ điền dần trong `docs/modules/SHIPPING.md` khi triển khai integration.

---

## 6. Inventory Module (INV-001 → INV-006)

Screens: Nhập hàng, Trả hàng nhập, Chuyển hàng, Kiểm kho, Xuất hủy.

- Tất cả UI đã được gom trong `07_UI_REFERENCE.md` sections 6, 9, 11.2.
- Flow nhập/xuất/điều chỉnh kho nằm trong `08_RETAIL_OPERATIONS.md` → 2 & 3.
- Schema: `03_DATABASE_SCHEMA.md` cần bổ sung các bảng PurchaseOrder, InventoryTransaction, InventoryTransfer, BranchStock.

> Khi xử lý task inventory, agent xem 07_UI_REFERENCE (ảnh), 08_RETAIL_OPERATIONS (luồng), rồi cross-check với schema Orders/Products.

---

## 7. Cash Book, Reports, Settings, Marketing, Technical

Các module này hiện chưa có screenshot chi tiết nhưng đã có định hướng chung trong docset:

- **Cash Book (CASH-001→004):** mô hình gần giống Sổ quỹ KiotViet.
  - Schema: `03_DATABASE_SCHEMA.md` → CashTransaction (TODO section).
  - Reports: nằm trong `docs/modules/REPORTS.md` (TODO) + tích hợp với dashboard.

- **Reports (REP-001→008):**
  - UI: phần Dashboard trong `07_UI_REFERENCE.md` (Management Dashboard).
  - Nghiệp vụ: sẽ được mô tả trong `docs/modules/REPORTS.md` với KPI/Chart structure.

- **Settings (SET-001→010):**
  - UI: `07_UI_REFERENCE.md` → 8. Settings Hub.
  - Schema: Organization, Branch, User, Role/Permission đã một phần có trong `03_DATABASE_SCHEMA.md`.

- **Marketing (MARK-001→005):**
  - Chưa có UI; docs tập trung vào schema & API trong `docs/modules/MARKETING.md` (TODO) + `05_INTEGRATION_APIS.md` (kênh online).

- **Technical (TECH-001→011):**
  - Được gom trong các file `docs/technical/*.md`, `docs/integration/*.md`, `docs/api/*`. Một số file đã tồn tại (ENVIRONMENT, integration README), số còn lại sẽ tạo theo tên trong tasklist khi thực sự triển khai.

---

## 8. Hướng dẫn cho Agent

1. Khi nhận task mới, **bắt buộc** tra mã task trong file này để biết nhanh:
   - Doc nghiệp vụ (Business Logic).
   - Doc UI (07_UI_REFERENCE.md + screenshots tương ứng).
   - Doc schema/API.
2. Nếu bắt gặp task nhắc tới file `docs/modules/...` hay `docs/frontend/specs/...` chưa tồn tại:
   - Tạo file mới đúng path.
   - Thêm link ngược lại vào đây (Task→Docs map) trong module tương ứng.
3. Với bất kỳ màn hình mới boss gửi screenshot:
   - Lưu ảnh vào `docs/assets/ui/retail` với tên đúng theo `docs/assets/ui/retail/README.md`.
   - Bổ sung section mô tả UI vào `07_UI_REFERENCE.md` và cập nhật bảng mapping trong file này.

> File này là **nguồn tham chiếu trung tâm** để giữ cho task list 83 items luôn đồng bộ với cấu trúc docs hiện tại (essential + reference + guides). Khi thêm/sửa docs, hãy chỉnh lại bảng cho module tương ứng.
