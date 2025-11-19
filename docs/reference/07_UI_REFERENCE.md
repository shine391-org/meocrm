# UI Reference & Screen Specs

> **Purpose:** Give agents a single place to understand what each major screen should look like, how it behaves, and which APIs back it.
>
> **Assets:** Drop PNGs described in `docs/assets/ui/README.md` so markdown image links resolve automatically.

---

## 1. Login Gateway

![Login gateway](../assets/ui/login-gateway.png "Placeholder – upload screenshot from boss")

### 1.1 Layout Snapshot
- Full-width blurred store background with centered login card (420px wide) to match the KiotViet aesthetic provided by boss.
- Card contains email + password inputs, remember-me checkbox, forgot-password link, and dual CTA buttons pinned to the bottom (`Quản lý`, `Bán hàng`).
- Support footer keeps hotline `1900 6522` and language toggle visible on all form states.

### 1.2 Interaction Spec

| Element | Behavior | Validation / Messaging |
|---------|----------|------------------------|
| Email input | Autofocus on load, blocks submission when empty or invalid email | `toast.error("Vui lòng nhập đầy đủ thông tin")` for empty fields |
| Password input | Toggle visibility icon (Eye/EyeOff). | Reject empty or <8 char, show server errors from `/auth/login` mapping (`INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`, etc.) |
| Remember me | Persists `refresh` cookie for 7 days when checked. | Bound to `remember` flag in `useAuth.login`. |
| Forgot password link | Routes to `/forgot-password` (static placeholder for now). | N/A |
| **Quản lý** button | Calls `login()` then `router.push('/')` for dashboard layout. | Disabled while `isLoading` true. |
| **Bán hàng** button | Calls `login()` then `router.push('/pos')`. | Shares validations with Quản lý button. |

### 1.3 Data & API Contracts
- `POST /auth/login` → returns `{ user, organization, accessToken, refreshToken }`. FE stores user in auth context and relies on httpOnly refresh cookie.
- `POST /auth/refresh` → called silently when access token expires; ensure fetch clients send `credentials: 'include'`.
- `GET /auth/me` → hydrates profile after redirect.
- `POST /auth/logout` → triggered from avatar menu in either product surface, clears cookie + store.

---

## 2. Management Dashboard

![Dashboard overview](../assets/ui/dashboard-overview.png "Placeholder – upload screenshot from boss")

### 2.1 Page Structure
1. **Global app bar** – brand, navigation tabs (Tổng quan, Hàng hóa, Đơn hàng, Khách hàng, Sổ quỹ, Báo cáo, Bán online). Mode switcher keeps blue highlight on the active surface.
2. **KPI cards row** – 4 cards mirroring screenshot: Revenue, Inventory Value, Net Revenue change, Orders. Cards support delta badges (arrow up/down) and sub-metrics.
3. **Revenue charts** – combined bar + line graph with tabs `Theo ngày | Theo giờ | Theo thứ`, and timeframe dropdown (Hôm nay / Tháng này).
4. **Insight grid** – left column lists "Top 10 hàng bán chạy"; right column lists "Top 10 khách mua nhiều nhất" with toggle `Theo doanh thu thuần | Theo tiền hàng`.
5. **Activity feed** – right rail showing timeline of recent events (order shipped, customer birthday, low stock, etc.).

### 2.2 Data Mapping

| Widget | API | Notes |
|--------|-----|-------|
| KPI cards | `GET /reports/revenue` (totals + grouped) and `GET /orders` (count today) | Use the same date + branch filters for all cards to avoid mismatch. |
| Revenue chart | `GET /reports/revenue?groupBy=day|hour` | Convert API totals into datasets for Chart.js `Bar + Line` combo. |
| Top products | `GET /products?sortBy=totalSold&limit=10` (server already exposes aggregated `totalSold`, fallback to FE sort). |
| Top customers | `GET /customers?sortBy=totalSpent&limit=10` | Display order count and spend. |
| Activity feed | `GET /orders?limit=20&sortBy=createdAt` + append domain events (inventory updates, shipping status) from their respective endpoints. |

### 2.3 UX Notes
- Empty states should show skeleton loaders (matching `/components/dashboard/*`).
- Clicking a Top product row opens product drawer, clicking a customer row opens CRM sidebar.
- Activity feed items map to icons: `order_created`, `order_completed`, `inventory_updated`, etc. (see `ActivityFeed` component for icon map).

---

## 3. POS Workspace

![POS workspace](../assets/ui/pos-workspace.png "Placeholder – upload screenshot from boss")

### 3.1 Layout
- **Left rail**: Product search field (`placeholder: "Tìm hàng hóa (F3)"`), quick barcode scanner button, invoice tabs (`Hóa đơn 1`, `+`).
- **Line items grid**: Each row = SKU, product name, quantity +/- buttons, per-line price and totals, delete icon.
- **Right panel**: Customer selector (`Tìm khách hàng (F4)`), branch dropdown, timestamp, payment summary (Totals, Discounts, Surcharges), payment method pills (Tiền mặt, Chuyển khoản, Thẻ, Ví), quick cash buttons (2.9M, 3.0M), final `THANH TOÁN` button.
- **Footer modes**: `Bán nhanh`, `Bán thường`, `Bán giao hàng` toggles map to `saleModeConfigs` and show contextual info (e.g., require customer selection for delivery mode).
- **Support strip**: chat/help icons + hotline kept visible just like screenshot.

### 3.2 Data & State Stores

| Concern | Source | Notes |
|---------|--------|-------|
| Product search | `GET /products` via `searchProducts({ page:1, limit:40, search })` wrapped in SWR | Debounced 400 ms; fallback to last payload when offline. |
| Customer lookup | `GET /customers` default (limit 5) + search (limit 5). | Delivery mode enforces customer selection; Quick mode allows anonymous sale. |
| Branch picker | `GET /branches` | Store `branchId` + `branchName` inside `usePosStore`. Auto-select first branch. |
| Cart state | `usePosStore` (local storage per org) | Supports multiple invoices/tabs with `addInvoice`, `closeInvoice`, `updateInvoice`. |
| Totals | `calculatePosTotals(cart, discount, surcharge)` | Returns `subtotal`, `discount`, `surcharge`, `total`, `itemCount`. |
| Order submission | `POST /orders` with `channel = "POS"`, `saleMode`, `branchId`, payments. Optionally follow-up `POST /shipping-orders` when saleMode = `delivery`. |

### 3.3 Interaction Rules
- Keyboard shortcuts: `F3` focuses product search, `F4` focuses customer search, `Ctrl + N` adds invoice tab (see `usePosStore`). Document in help tooltip.
- Branch selection is mandatory before adding line items; app auto-selects first branch but user can change via modal triggered from branch name (screenshot label "Trung" indicates cashier).
- Payment method pills behave like radio buttons; Quick cash buttons prefill `tenderedAmount` for change calculation.
- Clicking `THANH TOÁN` validates: at least one line item, branch selected, optional customer based on mode, and positive total. Display warnings returned from API (low stock) inline under item list.
- For delivery mode, expose shipping partner dropdown (GHN/GHTK/VNPOST) and require recipient address; upon success, call `POST /shipping-orders` and show tracking code.

### 3.4 Error & Offline Handling
- Show inline toast when `searchProducts` fails (network, auth). Keep last successful results for continuity.
- If `/orders` creation fails with validation error, highlight specific rows (e.g., insufficient stock) and keep modal open.
- When POS loses network connectivity, disable `THANH TOÁN` and show banner "Mất kết nối"; `useSWR` already exposes `error` state for this.

---

## 4. Inventory Command Center

![Inventory list](../assets/ui/retail/inventory-list.png "Danh sách hàng hóa với bộ lọc")

### 4.1 Menu Map
- `Hàng hóa` tab mở mega menu 3 cột: **Hàng hóa** (Danh sách, Thiết lập giá), **Kho hàng** (Chuyển hàng, Kiểm kho, Xuất hủy), **Nhập hàng** (Nhà cung cấp, Nhập hàng, Trả hàng nhập).\
  _Screenshot:_ `../assets/ui/retail/inventory-menu.png`

### 4.2 Listing Anatomy
- Bên trái: bộ lọc sâu (nhóm hàng, tồn kho, dự kiến hết hàng, thời gian tạo, thuộc tính màu sắc, nhà cung cấp, vị trí, loại hàng, bảo hành, bán trực tiếp, kênh bán, trạng thái).
- Thanh hành động: `+ Tạo mới` (Hàng hóa/Dịch vụ/Combo), `Import file`, `Xuất file`, `In tem`, `Cài đặt cột`, `Trợ giúp`.
- Bảng chính: mỗi dòng gồm mã hàng, ảnh thumb, tên, nhóm hàng, loại, liên kết kênh bán, giá bán, giá vốn, thương hiệu, toggle yêu thích.\
  _Screenshot chi tiết sản phẩm:_ `../assets/ui/retail/inventory-detail.png`

### 4.3 Behavior & APIs

| Element | API | Notes |
|---------|-----|-------|
| Danh sách hàng | `GET /products` với filter theo querystring | Prisma middleware đã tự filter `organizationId`. |
| Thuộc tính tùy chọn | `GET /attributes?type=color` etc. | Mapping sang bộ lọc multi-select. |
| Tạo mới | `POST /products`, `POST /services`, `POST /bundles` | UI dùng cùng modal `ProductDialog`. |
| Import/Export | `POST /products/import`, `GET /products/export` | Kiểm tra định dạng `.xlsx` theo template docs. |

---

## 5. Price Book

![Price book](../assets/ui/retail/price-book.png "Bảng giá chung")

### 5.1 Structure
- Bộ lọc bên trái: chọn bảng giá, nhóm hàng, tồn kho, điều kiện giá bán (>=, <=, giữa), giá so sánh.
- Bảng hiển thị mã hàng, tên, tồn kho, giá bán, giá nhập cuối, giá vốn, giá theo bảng giá chọn.
- Action bar: `+ Bảng giá`, `Import`, `Xuất file`, `Toggle columns`.

### 5.2 Create Price Book Modal
- Trường: tên bảng giá, hiệu lực từ/đến, trạng thái (Áp dụng/Chưa áp dụng), công thức cộng/giảm giá trị tuyệt đối hoặc %, giới hạn áp dụng cho nhóm hàng hoặc tag.
- Tuỳ chọn khi nhập hàng: áp dụng tự động cho hàng không có trong bảng giá vs chỉ cập nhật hàng đã nằm trong bảng giá.\
  _Screenshot:_ `../assets/ui/retail/price-book-modal.png`

---

## 6. Stock Operations

### 6.1 Stock Transfer
![Transfer list](../assets/ui/retail/stock-transfer-list.png "Danh sách chuyển hàng")
- Bộ lọc: chi nhánh đi/đến, trạng thái (Phiếu tạm, Đang chuyển, Đã nhận), thời gian chuyển/nhận, tình trạng nhận hàng (khớp/không khớp).
- Chi tiết phiếu thể hiện người tạo/nhận, chi nhánh, ngày giờ, danh sách hàng, ghi chú, nút `Hủy`, `Sao chép`, `Xuất file`, `In tem`.\
  _Detail screenshot:_ `../assets/ui/retail/stock-transfer-detail.png`

### 6.2 Stock Count
![Stock count](../assets/ui/retail/stock-count.png "Phiếu kiểm kho")
- Tabs trạng thái: Phiếu tạm, Đã cân bằng kho, Đã hủy.
- Có thể bật/tắt cột như SL thực tế, SL lệch tăng/giảm, tổng giá trị lệch.\
  API: `GET /stock-counts`, `POST /stock-counts`, `POST /stock-counts/:id/balance`.

### 6.3 Write-off
![Write off list](../assets/ui/retail/write-off.png "Xuất hủy")
- Bộ lọc: chi nhánh, trạng thái (Phiếu tạm/Hoàn thành/Đã hủy), thời gian, người tạo, người xuất hủy.
- Form mới cho phép nhập hàng qua Excel, nhập ghi chú, lưu tạm hoặc hoàn thành.\
  _Screenshot form:_ `../assets/ui/retail/write-off-new.png`

---

## 7. Supplier Management

![Suppliers](../assets/ui/retail/supplier-list.png "Danh sách nhà cung cấp")

- Bộ lọc: nhóm NCC, tổng mua (value + timeframe), nợ hiện tại, trạng thái (Đang hoạt động/Ngừng).
- Bảng có thể toggled nhiều cột (mã, tên, điện thoại, email, địa chỉ, khu vực, công ty, ghi chú, mã số thuế, người tạo, ngày tạo, nợ cần trả, tổng mua, trạng thái).
- Chi tiết hiển thị tab Thông tin, Lịch sử nhập/trả, Nợ cần trả; nút `Chỉnh sửa`, `Ngừng hoạt động`, `Xóa`.
- Modal tạo NCC chứa thông tin địa chỉ + xuất hóa đơn.\
  _Modal screenshot:_ `../assets/ui/retail/supplier-modal.png`

---

## 8. Settings Hub

![Settings menu](../assets/ui/retail/settings-menu.png "Trang thiết lập")

- Sidebar nhóm: **Quản lý** (Hàng hóa, Đơn hàng, Mẫu in), **Tiện ích** (SMS/Email/Zalo), **Cửa hàng** (Quản lý người dùng, Quản lý chi nhánh), **Dữ liệu** (Lịch sử thao tác).
- Tab Quản lý người dùng: danh sách tài khoản, vai trò, trạng thái, nút `+ Tạo tài khoản`.\
  _Screenshot:_ `../assets/ui/retail/settings-users.png`
- Tab Quản lý chi nhánh: tên chi nhánh, địa chỉ, điện thoại, số lượng user, trạng thái, nút `+ Tạo chi nhánh`.\
  _Screenshot:_ `../assets/ui/retail/settings-branches.png`

---

## 9. Procurement Flow

### 9.1 Purchase Orders
![Purchase orders](../assets/ui/retail/purchase-orders.png "Danh sách nhập hàng")
- Lọc theo chi nhánh, trạng thái (Phiếu tạm/Đã nhập/Đã hủy), thời gian, người tạo, người nhập.
- Chi tiết phiếu thể hiện nhà cung cấp, người nhập, ngày nhập, list hàng, tổng tiền, nút `Trả hàng nhập`, `Gửi email`, `In tem`.\
  _Detail screenshot:_ `../assets/ui/retail/purchase-order-detail.png`
- Form tạo phiếu mới hỗ trợ import Excel, nhập NCC, trạng thái phiếu, ghi chú.\
  _Form screenshot:_ `../assets/ui/retail/purchase-order-new.png`

### 9.2 Purchase Returns
![Purchase returns](../assets/ui/retail/purchase-return-list.png "Danh sách trả hàng nhập")
- Bộ lọc tương tự nhập hàng.
- Form tạo mới có panel NCC cần trả, nhập số tiền, ghi chú, nút `Lưu tạm`/`Hoàn thành`.\
  _Form screenshot:_ `../assets/ui/retail/purchase-return-new.png`

---

## 10. Sales Admin (Đơn hàng)

![Orders tab](../assets/ui/retail/order-list.png "Tab Đặt hàng")

- Bộ lọc nâng cao: chi nhánh xử lý, thời gian, trạng thái phiếu, đối tác giao hàng, thời gian giao, khu vực, phương thức thanh toán, người tạo, người nhận đặt, kênh bán.
- `+ Đặt hàng` mở POS ở chế độ hóa đơn đặt hàng.\
  _Screenshot bridge:_ `../assets/ui/retail/order-pos-bridge.png`
- `Gộp đơn` mở modal liệt kê các phiếu cùng khách/số điện thoại trong 7 ngày để hợp nhất.\
  _Screenshot:_ `../assets/ui/retail/order-merge.png`

---

## 11. Invoices & Returns

### 11.1 Invoice Center
![Invoice list](../assets/ui/retail/invoice-list.png "Trang hóa đơn")
- Bộ lọc đầy đủ (chi nhánh, thời gian, loại hóa đơn giao hàng/không giao, trạng thái, HĐĐT, trạng thái giao, đối tác, khu vực, thanh toán, người tạo/bán, bảng giá, kênh bán, loại thu khác).
- Bảng có menu cột phong phú (`../assets/ui/retail/invoice-columns.png`).
- `+ Tạo mới` → chọn Vận đơn KShip hoặc Hóa đơn. Với KShip mở modal đề xuất thời gian/đối tác (`../assets/ui/retail/shipping-proposal.png`) rồi chuyển sang POS để hoàn tất.

### 11.2 Returns
![Return list](../assets/ui/retail/return-list.png "Trang trả hàng")
- Lọc theo chi nhánh, loại hóa đơn (trả hóa đơn hay chuyển hoàn), trạng thái, thời gian, người tạo/nhận trả, kênh bán.
- `+ Trả hàng` mở modal chọn hóa đơn (`../assets/ui/retail/return-select-modal.png`) và sau khi chọn sẽ bật tab POS mới để xử lý (`../assets/ui/retail/return-pos-tab.png`).

---

## 12. POS Enhancements

### 12.1 Sale Modes & Delivery Panel
![Sale modes](../assets/ui/retail/pos-sale-modes.png "Thanh chọn chế độ bán")
- Ba mode `Bán nhanh`, `Bán thường`, `Bán giao hàng`. Delivery mở thêm form địa chỉ, trọng lượng, kích thước, đối tác giao, toggle thu hộ COD.\
  _Screenshot panel:_ `../assets/ui/retail/pos-delivery-panel.png`

### 12.2 Payment & Channels
![Quick payment](../assets/ui/retail/pos-payment-quick.png "Panel thanh toán")
- Bảng tổng hợp tiền hàng, giảm giá, thu khác, khách cần trả. Có selector kênh bán (Trực tiếp, Facebook, Instagram, COD) và phương thức thanh toán (tiền mặt, chuyển khoản, thẻ, ví, custom).
- Quick cash buttons hiển thị các mệnh giá đề xuất cho phép click để điền giá trị tendered.

### 12.3 Seller Picker & Customer Modal
![Seller picker](../assets/ui/retail/pos-seller-picker.png "Dropdown người bán")
- Dropdown cho phép tìm kiếm tên hoặc số điện thoại nhân viên, gán người bán cho hóa đơn để báo cáo.
- Modal thêm khách hàng gồm 2 tab: Thông tin chung (tên, nhóm, liên hệ, địa chỉ, ghi chú) và Thông tin xuất hóa đơn (loại khách, mã số thuế, số CMND/CCCD, ngân hàng).\
  _Screenshots:_ `../assets/ui/retail/pos-add-customer.png`

### 12.4 Printouts
![Print delivery note](../assets/ui/retail/print-delivery-note.png "Preview in phiếu giao hàng")
- Sau khi hoàn tất đặt hàng hoặc đơn giao, hiển thị preview để in hóa đơn/phiếu giao hàng tạm thời. Mặc định `Destination: Microsoft Print to PDF`, layout Portrait, hiển thị đủ thông tin người gửi/nhận, khối lượng, danh sách sản phẩm.

---

> **Update guide:** Khi bổ sung màn hình mới, thêm ảnh vào `docs/assets/ui/retail/`, tạo subsection với: mô tả layout, bảng Interaction/API, link đến guides. Giữ heading ở cấp `##` để Documentation Map dễ parse.
## 4. Shared Patterns & References
- Colors, spacing, and typography follow `apps/web/app/globals.css` and `shadcn/ui` tokens.
- Iconography uses `lucide-react` set (e.g., `BarChart3`, `ShoppingCart`, `Zap`). Use consistent sizes (20px in login buttons, 16px in tables).
- Toast notifications rely on `sonner`; keep success vs error copy consistent with table above.
- For any new screen, document:
  1. Layout sketch or screenshot with asset placeholder.
  2. Interaction matrix (element → rules → API).
  3. API dependencies referencing [04_API_REFERENCE.md](./04_API_REFERENCE.md).

> When boss shares new screenshots, copy them into `docs/assets/ui/` and update captions here. This keeps FE + BE agents aligned without hunting Slack threads.
