# Lộ trình dự án MeoCRM v4.0 (cập nhật 19-11-2025)

> **Nhánh hiện tại:** `feature/documentation-audit`  
> **Phiên bản:** 4.0  
> **Tổng số nhiệm vụ:** 187 (58 hoàn thành, 25 đang làm, 104 chờ làm)  
> **Nguồn cập nhật gần nhất:** Audit ngày 19-11-2025
>
> **💡 Xem chi tiết từng nhiệm vụ tại:** [TASK_DATABASE.md](./docs/reference/TASK_DATABASE.md)

---

## 1. Tóm tắt nhanh
- **Tình trạng:** Quá trình kiểm toán toàn diện đã phát hiện nhiều **mâu thuẫn nghiêm trọng** giữa tài liệu, logic nghiệp vụ và code đã triển khai. Nhiều tính năng cốt lõi được cho là đã hoàn thành hoặc đang phát triển thực tế lại bị thiếu hoặc có lỗi nghiêm trọng.
- **Nền tảng:** Auth, Categories, Customers, Suppliers backend đã ổn định.
- **Vấn đề nghiêm trọng:**
  - **Inventory:** Logic trừ/hoàn kho cho đơn hàng **CHƯA HOẠT ĐỘNG**.
  - **Orders:** Quy trình xử lý sai khác với tài liệu, logic cập nhật thanh toán COD bị lỗi.
  - **Shipping:** Logic tính phí vận chuyển và xử lý đơn hàng thất bại/hoàn trả không đúng.
  - **Pricing:** Logic tính thuế và chiết khấu cấp độ sản phẩm bị sai hoặc thiếu.
  - **Security & Audit:** Các tính năng quan trọng như middleware tự động và ghi log kiểm toán chưa được triển khai.
- **Kế hoạch:** Cần ưu tiên sửa các lỗi nghiêm trọng này trước khi phát triển tính năng mới.

---

## 2. Bảng tiến độ theo module (đã cập nhật theo thực tế)
| Module | Tổng | Hoàn thành | Đang làm | Chờ làm | % | Ghi chú |
|--------|------|------------|----------|---------|----|---------|
| Infrastructure | 41 | 34 | 0 | 7 | 83% | ⚠️ Thiếu middleware cho multi-tenant (rủi ro bảo mật). |
| Authentication | 15 | 15 | 0 | 0 | 100% | Hoạt động tốt. |
| Products | 33 | 33 | 0 | 0 | 100% | ⚠️ Soft-delete chưa hoàn chỉnh (bug). |
| Categories | 6 | 6 | 0 | 0 | 100% | Hoạt động tốt. |
| Customers | 14 | 11 | 3 | 0 | 79% | ⚠️ Bug: stats không cập nhật cho đơn COD. |
| Suppliers | 6 | 6 | 0 | 0 | 100% | Hoạt động tốt. |
| Orders | 16 | 3 | 5 | 8 | 19% | ⚠️ Lỗi workflow, không trừ/hoàn kho, bug COD stats. |
| Shipping | 12 | 2 | 2 | 8 | 17% | ⚠️ Lỗi workflow, tính phí sai, không cập nhật thanh toán COD. |
| Inventory | 10 | 1 | 2 | 7 | 10% | ⚠️ Lỗi nghiêm trọng: KHÔNG trừ/hoàn kho. Workflow chuyển kho sai. |
| Finance | 10 | 0 | 1 | 9 | 0% | ⚠️ Logic tính thuế (VAT) sai. |
| POS | 6 | 0 | 1 | 5 | 0% | Chờ các module khác sửa lỗi. |
| Reports | 3 | 1 | 0 | 2 | 33% | `GET /reports/debt` đã có. |
| Settings | 21 | 3 | 5 | 13 | 14% | Đang phát triển. |

---

## 3. Kế hoạch ưu tiên (Đề xuất sau kiểm toán)
| Ưu tiên | Mục tiêu chính | Nhiệm vụ liên quan | Lý do |
|---|---|---|---|
| **P0 - Critical** | **Sửa lỗi Quản lý Tồn kho** | `ORD-010`, `ORD-008`, `TASK_INVENTORY` | **Lỗi nghiêm trọng nhất, kho không bao giờ được trừ/hoàn, gây sai lệch dữ liệu.** |
| **P0 - Critical** | Sửa lỗi Cập nhật thanh toán & Stats | `SHIP-007`, `CUST-007` | Đơn COD không được đánh dấu đã trả tiền & stats khách hàng bị sai. |
| **P0 - Critical** | Sửa lỗi Workflow Vận chuyển | `SHIP-008`, `SHIP-009` | Quy trình xử lý đơn hàng thất bại/hoàn trả đang sai. |
| **P1 - High** | Sửa lỗi & Hoàn thiện Tính giá/Thuế | `DISC-003`, `DISC-006` | VAT tính sai, thiếu chiết khấu theo sản phẩm. |
| **P1 - High** | Hoàn thiện Bảo mật & Ghi log | `SEC-002`, `AUDIT-001` → `AUDIT-004` | Thêm middleware bảo mật, kích hoạt ghi log kiểm toán. |
| **P2 - Medium** | POS Frontend & Hoàn thiện Orders | `FE-014`→`019`, `ORD-009` | Hoàn thiện UI/UX cho quy trình bán hàng. |

---

## 4. Chi tiết theo dòng công việc (Trạng thái thực tế)

### 4.1 Hạ tầng & tuân thủ
- **Vấn đề:** Tài liệu nói có Prisma middleware tự động inject `organizationId`, nhưng thực tế **KHÔNG có**. Bảo mật đang phụ thuộc vào việc query thủ công. Đây là rủi ro bảo mật.
- **Tình trạng:** `AUDIT-001→004` và `INFRA-009` (Data Retention) **CHƯA ĐƯỢC TRIỂN KHAI** dù hạ tầng đã có.
- **Đề xuất:** Ưu tiên P1 để xây dựng middleware và kích hoạt `AuditLogService`.

### 4.2 CRM (Customers & Suppliers)
- **Tình trạng:** CRUD backend cho Customers và Suppliers đã **Hoàn thành**.
- **Vấn đề:** `CUST-007` (Customer Stats Auto-Update) có bug không cập nhật cho đơn hàng COD đã hoàn thành.

### 4.3 Orders & POS
- **Tình trạng:** Backend cho Orders có **NHIỀU LỖI NGHIÊM TRỌNG**.
- **Vấn đề:**
  - `ORD-010`: Logic trừ kho **ĐÃ KÍCH HOẠT** thông qua bảng `OrderInventoryReservation` + automation (multi-tenant guard, double-deduct protection).
  - `ORD-008`: Hoàn kho khi hủy đơn/Shipping fail **ĐÃ IMPLEMENT** (returnStockOnOrderCancel + shipping rollback).
  - `ORD-005`: Workflow trạng thái ≈ tài liệu (COMPLETED chỉ cập nhật stats ở automation, `markCodPaid`, audit log đầy đủ, transitions cho PENDING⇄PROCESSING sau shipping fail).
  - `ORD-009`: Logic refund chưa được kiểm chứng đầy đủ.
- **POS:** Bị block do các logic về giá, chiết khấu, và tồn kho ở backend đang sai hoặc thiếu.

### 4.4 Finance, Discounts & Reports
- **Tình trạng:** Hầu hết là `Todo`.
- **Vấn đề:**
  - `FIN-002` (Partial Payment): Đã được "hoàn thành" theo hướng **KHÔNG hỗ trợ**.
- `DISC-003` (Item-level Discount): DTO + Prisma fields đã hoàn thiện và POS Workspace hiện cho phép pick loại chiết khấu + giá trị/đơn vị + cảnh báo LOSS_SALE.
- `DISC-006` (Tax Calculation): Thuế dựa trên `taxableSubtotal` (tự động loại item `taxExempt`, discount app). `PricingService` trả `taxBreakdown`, POS cũng có toggle `Miễn VAT` để đồng bộ dữ liệu lên API.
  - `RPT-001` (Sales Dashboard): Bị block do dữ liệu order chưa chính xác.

### 4.5 Integrations & Notifications
- **Tình trạng:** Hầu hết là `Todo`.
- **Vấn đề:**
  - `SHIP-007/008/009`: Shipping fee tính theo partner/distance/weight + lưu breakdown. Workflow FAILED/RETURNED → order quay lại PENDING + hoàn kho; DELIVERED → auto COMPLETED + `markCodPaid`. Audit log phủ shipping order/status.
  - `Webhooks`: CRUD đã có nhưng các tính năng quan trọng như phát event, retry/HMAC vẫn là `Todo`.
  - `Notifications`: Toàn bộ là `Todo`.

---

## 5. Kiểm thử & tài liệu
- **Tình trạng:** Các tài liệu cốt lõi (`01_BUSINESS_LOGIC.md`, `03_DATABASE_SCHEMA.md`, `04_API_REFERENCE.md`) đã được cập nhật để phản ánh đúng trạng thái của code, bao gồm cả các lỗi và thiếu sót.
- **Hành động tiếp theo:** Sử dụng các tài liệu đã cập nhật này làm nguồn thông tin chính xác để lên kế hoạch sửa lỗi và phát triển các tính năng còn lại.

---

## 6. Việc cần boss/PM cung cấp
1. **Thiết kế/UI:** Vẫn cần cho các màn hình Frontend (`FE-001`→`019`).
2. **Ưu tiên sửa lỗi:** Xác nhận thứ tự ưu tiên cho các lỗi nghiêm trọng đã được liệt kê ở mục 3.
3. **Quyết định logic:** Làm rõ các điểm mâu thuẫn giữa tài liệu cũ và code (ví dụ: có cho phép đặt hàng khi hết hàng không?).

---

Tệp `ROADMAP.md` này giờ đây là nguồn thông tin chính xác nhất về trạng thái dự án. Hãy sử dụng nó để điều phối công việc tiếp theo.
