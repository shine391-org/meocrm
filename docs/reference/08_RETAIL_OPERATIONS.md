# Retail Operations Reference

> **Mục tiêu**: giúp agent nắm luồng nghiệp vụ bán lẻ từ nhập hàng → bán hàng → trả hàng → giao hàng. Kết hợp UI (docs/reference/07_UI_REFERENCE.md) và API (docs/reference/04_API_REFERENCE.md).

## 1. Overview
| Giai đoạn | Màn hình chính | API cốt lõi | Ghi chú |
|-----------|----------------|-------------|--------|
| Procurement | Nhập hàng, Trả hàng nhập, Nhà cung cấp | `/suppliers`, `/purchase-orders`, `/purchase-returns` | Bắt buộc truyền `organizationId`, `branchId`. |
| Inventory Ops | Chuyển hàng, Kiểm kho, Xuất hủy | `/stock-transfers`, `/stock-counts`, `/write-offs` | Tất cả trạng thái tuân thủ workflow: `draft → processing → completed`. |
| Sales Admin | Đặt hàng, Hóa đơn, Vận đơn | `/orders`, `/invoices`, `/shipping-orders` | POS là nguồn sự thật, trang web chỉ hiển thị. |
| POS | POS Workspace, Bán nhanh/ thường/ giao hàng | `/orders`, `/payments`, `/shipping-orders` | Hỗ trợ đa tab, multi-tenant filter. |
| After-sales | Trả hàng (hóa đơn), report | `/returns`, `/refunds`, `/reports` | Lưu log vào audit service. |

## 2. Procurement Flow
1. **Nhà cung cấp**: tạo nhóm, quản lý công nợ. Khi tạo NCC → lưu `supplierId` để link phiếu nhập.
2. **Nhập hàng**: quy trình chuẩn
   - `draft` khi lưu tạm.
   - `submitted` khi hoàn thành → trừ công nợ, cộng tồn kho.
   - `POST /purchase-orders/:id/receive` để đánh dấu đã nhập.
3. **Trả hàng nhập**: từ phiếu nhập hoặc tạo trực tiếp.
   - `POST /purchase-returns` với danh sách SKU, số lượng, giá nhập.
   - `payments` optional: ghi nhận tiền NCC cần trả hoặc cấn trừ công nợ.

## 3. Inventory Operations
- **Chuyển hàng**: `fromBranchId`, `toBranchId`, `status`. Khi `status = received`, API yêu cầu `receivedBy`, `receivedAt` và danh sách số lượng thực nhận.
- **Kiểm kho**: phát hiện lệch → `POST /stock-counts/:id/reconcile` cập nhật `adjustments` (±). Hệ thống tự tạo nhật ký vào StockLedger.
- **Xuất hủy**: `writeOffReason` lấy từ Settings. Dữ liệu phục vụ báo cáo COGS.

## 4. Sales & Fulfillment
1. **Đặt hàng**: tạo từ POS → `/orders` với `saleMode = preorder`. Trang Đơn hàng chỉ là CRUD metadata (địa chỉ, phí ship, đối tác).
2. **Gộp đơn**: backend chạy batch `GET /orders?customerPhone=...&createdAt>=now-7d`. Khi agent xác nhận gộp, FE gửi `POST /orders/merge`.
3. **Hóa đơn**: synced từ POS. Nếu bật hóa đơn điện tử → call `/e-invoice/sync`.
4. **Vận đơn KShip**: wizard lấy danh sách hóa đơn chưa tạo vận đơn trong khoảng thời gian, sau đó chuyển sang POS để hoàn thiện shipping request.

## 5. POS & Payments
- POS tabs = invoices trên client (`localId`). Khi thanh toán thành công → `/orders` trả về `invoiceId`, FE mở modals in hóa đơn/vận đơn.
- Chế độ **Bán giao hàng** yêu cầu `shippingAddress`, `carrierCode`, `packageWeight` (gram), `dimensions`. Thành công → FE hiển thị preview vận đơn.
- Phương thức thanh toán map như sau:

| UI label | API payload |
|----------|-------------|
| Tiền mặt | `{ method: 'cash', amount }` |
| Chuyển khoản | `{ method: 'bank_transfer', amount, bankAccountId? }` |
| Thẻ | `{ method: 'card', amount, terminalId }` |
| COD | `{ method: 'cod', amount }` |

## 6. Returns & Refunds
- **Trả hàng hóa đơn**: khởi nguồn từ modal chọn hóa đơn. FE gửi `POST /returns` với `sourceInvoiceId`, `items`, `refundMethod`.
- **Trả hàng nhập**: `POST /purchase-returns` (đã nói ở trên) + optional `POST /payments` nếu hoàn tiền NCC.
- In phiếu: sau khi tạo return, FE gọi `/documents/:id/render?type=return` để hiển thị PDF preview.

## 7. Audit & Docs
- Mỗi thao tác chính phải log `auditService.log({ actorId, organizationId, action, payload })`.
- Nếu cập nhật UI/flow mới, ghi chú lại ở `docs/guides/operations/pos-playbook.md` + thêm ảnh vào `07_UI_REFERENCE.md`.

> **How to update:** Khi có thay đổi nghiệp vụ, chỉnh bảng Overview + flow tương ứng, và liên kết tới commit hoặc tài liệu API. Không được bỏ trống cột API/Notes.
