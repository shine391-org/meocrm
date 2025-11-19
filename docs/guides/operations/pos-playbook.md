# POS Playbook

> Checklist cho agent khi thao tác POS KiotViet (dựa trên UI thực tế từ boss). Kết hợp với `docs/reference/07_UI_REFERENCE.md#12-pos-enhancements` để xem ảnh.

## 1. Chuẩn bị
1. Đảm bảo đã chọn đúng chi nhánh (dropdown góc phải). Nếu sai → bấm vào tên chi nhánh để mở modal chọn lại.
2. Kiểm tra tab hoạt động (`Đặt hàng 1`, `Hóa đơn 1`, `Trả hàng 1`). Sử dụng `Ctrl + N` để mở tab mới.
3. Chọn chế độ bán ở footer: `Bán nhanh` (không cần khách), `Bán thường` (tùy chọn), `Bán giao hàng` (bắt buộc địa chỉ + đối tác).

## 2. Tạo đơn đặt hàng mới
1. Tìm sản phẩm bằng ô `Tìm hàng hóa (F3)` hoặc click danh sách bên phải. Sản phẩm xuất hiện ở lưới line-item.
2. Chọn khách (`F4`). Nếu khách mới → nhấn `+` để mở modal **Thêm khách hàng** và nhập cả tab “Thông tin xuất hóa đơn” nếu cần.
3. Chọn người bán bằng dropdown phía trên panel thanh toán.
4. Nhập khoản giảm/thu khác nếu cần.
5. Chọn kênh bán (Trực tiếp/Facebook/Instagram/COD) và phương thức thanh toán. Dùng quick-cash button để điền nhanh số tiền khách đưa.
6. Nhấn `ĐẶT HÀNG`. Hệ thống trả về hóa đơn → hiển thị preview in hóa đơn + vận đơn (nếu mode giao hàng).

## 3. Đặt hàng giao qua đơn vị vận chuyển
1. Chuyển sang `Bán giao hàng`.
2. Nhập địa chỉ đầy đủ (tỉnh/thành, quận/huyện, phường/xã, số nhà) và thông tin người nhận.
3. Điền trọng lượng/kích thước kiện, toggle `Thu hộ tiền (COD)` nếu muốn.
4. Chọn `Cổng KiotViet` hoặc `Tự giao hàng`. Với Cổng KiotViet → chọn đối tác (GHN, GHTK, v.v.) và loại dịch vụ.
5. Sau khi `ĐẶT HÀNG`, màn hình chuyển sang preview vận đơn (`print-delivery-note.png`). In hoặc lưu PDF.

## 4. Trả hàng cho khách lẻ
1. Vào tab Trả hàng → `+ Trả hàng` → chọn hóa đơn cần trả.
2. POS mở tab “Trả hàng” kèm danh sách sản phẩm được phép trả.
3. Điều chỉnh số lượng, thêm ghi chú, chọn hình thức hoàn tiền (tiền mặt/chuyển khoản/COD).
4. Nhấn `TRẢ HÀNG` → hiển thị preview phiếu trả.

## 5. Trả hàng nhập
- Nếu cần trả nhà cung cấp: sử dụng trang `Trả hàng nhập`. Form tương tự nhập hàng, có panel “NCC cần trả” để ghi nhận công nợ.

## 6. In hóa đơn / vận đơn
- Sau mỗi hành động (đặt hàng, giao hàng, trả hàng), UI hiển thị preview để in (mặc định PDF). Agent phải kiểm tra: logo Lano, địa chỉ, danh sách sản phẩm, khối lượng, ghi chú.

## 7. Troubleshooting nhanh
| Vấn đề | Kiểm tra |
|--------|----------|
| Không tìm thấy sản phẩm | Đúng chi nhánh? SKU bị ẩn do bộ lọc? Thử clear search. |
| Không chọn được người bán | User chưa có role phù hợp. Kiểm tra `Thiết lập → Quản lý người dùng`. |
| POS không cho Đặt hàng | Chưa có line-item hoặc thiếu địa chỉ ở chế độ giao hàng. |
| Gộp đơn không xuất hiện | Đơn không cùng số điện thoại hoặc ngoài khoảng 7 ngày. |

> **Update guide:** nếu UI thay đổi, chụp ảnh mới bỏ vào `docs/assets/ui/retail/` và cập nhật link trong mục tương ứng.
