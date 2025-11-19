# Lộ trình dự án MeoCRM v4.0 (cập nhật 19-11-2025)

> **Nhánh hiện tại:** `feature/documentation-audit`  
> **Phiên bản:** 4.0  
> **Tổng số nhiệm vụ:** 187 (58 hoàn thành, 25 đang làm, 104 chờ làm)  
> **Nguồn cập nhật gần nhất:** Audit ngày 19-11-2025
>
> **💡 Xem chi tiết từng nhiệm vụ tại:** [TASK_DATABASE.md](./docs/reference/TASK_DATABASE.md)

---

## 1. Tóm tắt nhanh
- **Tình trạng:** Đợt kiểm toán 19-11 tìm thấy nhiều chênh lệch giữa docs và code. Kể từ đó P0/P1 quan trọng (Inventory/Orders/Shipping/Pricing/Security) đã được xử lý: logic trừ/hoàn kho chạy bằng bảng `OrderInventoryReservation`, workflow COD bổ sung `markCodPaid`, ShippingFeeService hỗ trợ weight/distance/partner, PricingService có `taxableSubtotal + item discount`, Prisma multi-tenant middleware và AuditLog cron đã bật. Các tính năng này đã có migration/seed và Playwright test đi kèm.
- **Nền tảng:** Auth, Categories, Customers, Suppliers backend đã ổn định.
- **Vấn đề còn mở:**
  - **Inventory:** ✅ INV-009 đã bật cảnh báo reservation leak + Playwright cover shipping fail; theo dõi mở rộng dashboard multi-branch.
  - **Orders:** ✅ Refund `ORD-009` tạo `OrderReturn` + hoàn kho/stats; còn backlog phần KPI nâng cao.
  - **Shipping:** Chưa có Partner API live; phần retry mới ở mức mock test.
  - **Pricing:** POS đã hiển thị cảnh báo LOSS_SALE và breakdown VAT; vẫn còn KPI nâng cao chờ triển khai.
  - **Security & Audit:** Chưa rollout background job gửi alert khi audit-log vượt threshold.
- **Kế hoạch:** Duy trì focus P0/P1 cho đến khi e2e suite pass 100%, sau đó mới mở lại backlog tính năng mới.

---

## 2. Bảng tiến độ theo module (đã cập nhật theo thực tế)
| Module | Tổng | Hoàn thành | Đang làm | Chờ làm | % | Ghi chú |
|--------|------|------------|----------|---------|----|---------|
| Infrastructure | 41 | 34 | 0 | 7 | 83% | ✅ Prisma middleware + audit cron đã chạy; cần bổ sung alert cho log retention. |
| Authentication | 15 | 15 | 0 | 0 | 100% | Hoạt động tốt. |
| Products | 33 | 33 | 0 | 0 | 100% | ⚠️ Soft-delete chưa hoàn chỉnh (bug). |
| Categories | 6 | 6 | 0 | 0 | 100% | Hoạt động tốt. |
| Customers | 14 | 11 | 3 | 0 | 79% | ⚠️ Bug: stats không cập nhật cho đơn COD. |
| Suppliers | 6 | 6 | 0 | 0 | 100% | Hoạt động tốt. |
| Orders | 16 | 9 | 3 | 4 | 56% | ✅ Automation trừ/hoàn kho + COD stats + refund ORD-009 (OrderReturn + debt); còn thiếu KPI nâng cao/báo cáo. |
| Shipping | 12 | 6 | 2 | 4 | 50% | ✅ Fee engine + rollback đã có; đang chờ partner API thực tế & retry queue. |
| Inventory | 10 | 5 | 2 | 3 | 60% | ✅ Reservation/return + alert monitor (INV-009) đã chạy; tiếp theo là dashboard cross-branch & low-stock digest mở rộng. |
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
- **Done:** Prisma `$extends` inject `organizationId` + guard skip list đã上线, AuditLogService ghi traceId + cron archive theo retention.
- **Còn lại:** Chưa có alert tự động khi audit log vượt ngưỡng; cần theo dõi hiệu năng middleware khi dataset tăng.

### 4.2 CRM (Customers & Suppliers)
- **Tình trạng:** CRUD backend cho Customers và Suppliers đã **Hoàn thành**.
- **Vấn đề:** `CUST-007` (Customer Stats Auto-Update) có bug không cập nhật cho đơn hàng COD đã hoàn thành.

### 4.3 Orders & POS
- **Tiến độ:** Automation ORD-005/008/010 đã live, Playwright/REST test cover luồng tạo order → processing → shipping → COD settlement.
- **Cập nhật:** `ORD-009` hoàn tất – refund request tạo `OrderReturn`, approve hoàn kho + điều chỉnh stats/debt, audit log đầy đủ, integration test chạy chu trình restock/commission.
- **POS:** Đã hiển thị cảnh báo LOSS_SALE theo thời gian thực và bảng thuế GTGT ngay trong workspace; KPI nâng cao/báo cáo vẫn chờ triển khai.

### 4.4 Finance, Discounts & Reports
- `DISC-003` & `DISC-006` đã merge cùng migration `20251119095500_p1_full_schema` (thêm `discountAmount`, `taxableSubtotal`, `taxBreakdown`). POS UI nhận payload mới + cảnh báo LOSS_SALE.
- `FIN-002`: vẫn giữ chính sách “không hỗ trợ partial payment” → docs cần nhấn mạnh.
- `RPT-001`: chờ dữ liệu thực sau khi order automation ổn định để bật dashboard thật (hiện chỉ mock).

### 4.5 Integrations & Notifications
- `SHIP-007/008/009`: Fee engine + rollback đã triển khai (sử dụng settings `shipping.partners`). Cần build integration test thực sự với partner API khi có credential thật.
- `INV-009`: Reservation monitor + alert endpoint (`GET/POST /inventory/reservation-alerts`) + nightly cron đã bật để phát hiện stock chưa release.
- `Webhooks`: CRUD + HMAC guard đã có, nhưng chưa bật retry worker.
- `Notifications`: vẫn là `Todo`; Playwright hiện chỉ verify toast nội bộ.

---

## 5. Kiểm thử & tài liệu
- **Docs:** `01_BUSINESS_LOGIC.md`, `03_DATABASE_SCHEMA.md`, `04_API_REFERENCE.md`, `AGENTS.md`, `TASK_TRACKING_REALITY_CHECK.md` đều đã cập nhật để nêu rõ automation mới (reservation, COD, shipping rollback, middleware).
- **Tests:** Bổ sung Playwright suite (login, dashboard, customers, orders, POS, order-shipping-flow) chạy bằng `pnpm test:playwright` – lệnh này tự `migrate reset + seed` mỗi lần.
- **Hành động tiếp theo:** Hoàn thiện nốt test cho refund/notifications, giảm thời gian chạy Playwright để tránh timeout CI.

---

## 6. Việc cần boss/PM cung cấp
1. **Thiết kế/UI:** Vẫn cần cho các màn hình Frontend (`FE-001`→`019`).
2. **Ưu tiên sửa lỗi:** Xác nhận thứ tự ưu tiên cho các lỗi nghiêm trọng đã được liệt kê ở mục 3.
3. **Quyết định logic:** Làm rõ các điểm mâu thuẫn giữa tài liệu cũ và code (ví dụ: có cho phép đặt hàng khi hết hàng không?).

---

Tệp `ROADMAP.md` này giờ đây là nguồn thông tin chính xác nhất về trạng thái dự án. Hãy sử dụng nó để điều phối công việc tiếp theo.
