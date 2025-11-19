# Báo cáo kiểm toán tài liệu Logic nghiệp vụ (`01_BUSINESS_LOGIC.md`)

Sau khi phân tích kỹ lưỡng các tệp `apps/api/src/orders/orders.service.ts`, `apps/api/src/customers/services/customer-stats.service.ts`, `apps/api/src/inventory/inventory.service.ts`, `apps/api/src/products/products.service.ts`, `apps/api/src/orders/pricing.service.ts`, `apps/api/src/shipping/shipping.service.ts` và `apps/api/src/customers/services/customer-segmentation.service.ts` so với tài liệu `01_BUSINESS_LOGIC.md`, tôi đã rút ra các kết luận sau:

## 1. Kết quả kiểm toán chi tiết

### 1.1 Quy trình trạng thái đơn hàng (Order status workflow)

**Tài liệu (Workflow chuẩn):**
`PENDING → PROCESSING → COMPLETED`
`           ↓`
`        CANCELLED (có thể cancel từ PENDING hoặc PROCESSING)`

**Code (Hằng số `ORDER_STATUS_TRANSITIONS`):**
```typescript
const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [
    OrderStatus.CONFIRMED, // <-- Tài liệu không đề cập CONFIRMED
    OrderStatus.PROCESSING,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED], // <-- Tài liệu không đề cập CONFIRMED
  [OrderStatus.PROCESSING]: [
    OrderStatus.SHIPPED,    // <-- Tài liệu không đề cập SHIPPED
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED, // <-- Cho phép CANCELLED từ PROCESSING!
  ],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED], // <-- Tài liệu không đề cập SHIPPED hoặc DELIVERED trực tiếp trong workflow
  [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED], // <-- Tài liệu không đề cập DELIVERED
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};
```
**Mâu thuẫn/Thiếu sót:**
*   **Trạng thái `CONFIRMED`, `SHIPPED`, `DELIVERED`:** Code sử dụng các trạng thái này nhưng tài liệu không mô tả đầy đủ trong luồng công việc chính.

### PENDING (Đang xử lý)

**Logic trong tài liệu:**
*   **Kiểm tra stock:** Có.
*   **Cảnh báo nếu stock không đủ:** Có.
*   **Vẫn cho phép tạo order (khi stock không đủ):** CÓ.
*   **KHÔNG block việc tạo order (khi stock không đủ):** CÓ.

**Logic trong code (`create` method và `calculateOrderTotals`):**
*   Code kiểm tra stock và tạo cảnh báo nếu `availableStock < item.quantity`.
*   **NHƯNG:** Nếu `availableStock <= 0` (hết hàng), code **ném ra ngoại lệ và CHẶN việc tạo order**.
**Mâu thuẫn lớn:** Tài liệu nói "KHÔNG block" nhưng code lại "CHẶN" tạo order nếu sản phẩm hết hàng hoàn toàn. Đây là **mâu thuẫn nghiêm trọng trong logic nghiệp vụ**.

**Các điểm khác:**
*   Code và tài liệu nhất quán về việc không yêu cầu xác nhận từ khách hàng và đặt trạng thái PENDING cho đơn hàng thông thường.
*   Code và tài liệu nhất quán về việc KHÔNG trừ stock ngay lập tức ở trạng thái PENDING.

### PROCESSING (Đang thực hiện)

**Logic trong tài liệu:**
*   **Tự động chuyển khi Admin tạo shipping order:** Có (logic này sẽ nằm trong `ShippingService` hoặc listener sự kiện).
*   **Trừ stock khi chuyển sang PROCESSING:** Có.
*   **Gửi notification cho customer:** Có.

**Logic trong code (`updateStatus` method):**
*   **Trừ stock:** Phương thức `updateStatus` **không chứa logic trực tiếp để trừ stock** khi chuyển sang trạng thái PROCESSING. Điều này có thể được xử lý bởi một listener sự kiện, nhưng tài liệu ngụ ý nó diễn ra trực tiếp trong quá trình chuyển trạng thái. Cần điều tra thêm.
*   **Notification:** Một sự kiện `orders.status.changed` được phát ra, điều này có thể kích hoạt dịch vụ thông báo, nhưng `OrdersService` tự nó không gửi thông báo.
**Mâu thuẫn/Thiếu sót:** Tài liệu ngụ ý việc trừ stock là một hành động trực tiếp khi chuyển trạng thái, nhưng code không thực hiện điều này ở `OrdersService.updateStatus`.

### COMPLETED (Hoàn thành)

**Logic trong tài liệu:**
*   **Bán hàng POS:** PENDING → COMPLETED ngay lập tức khi thanh toán xong tại quầy. (Nhất quán với code)
*   **Đơn COD:** PROCESSING → COMPLETED tự động khi `shipping status = DELIVERED`. (Nhất quán với code pseudo)
*   **Cập nhật customer stats (`totalSpent`, `totalOrders`):** Được nhắc đến khi đơn COD COMPLETED.

**Logic trong code (`create` method và `customerStatsService`):**
*   Trong phương thức `create`, stats được cập nhật cho các đơn POS.
*   **NHƯNG:** Trong phương thức `updateStatus` (cho đơn COD chuyển sang COMPLETED), code chỉ cập nhật `isPaid` và `paidAmount`, cũng như xử lý công nợ, nhưng **KHÔNG CẬP NHẬT `totalSpent` hoặc `totalOrders`** của khách hàng.
**Mâu thuẫn/Bug tiềm ẩn:** Tài liệu ngụ ý rằng các chỉ số khách hàng được cập nhật khi đơn COD hoàn thành, nhưng code không thực hiện điều này trực tiếp. Đây là một **bug tiềm ẩn hoặc logic cập nhật bị thiếu**.

### CANCELLED (Đã hủy)

**Logic trong tài liệu:**
*   **PENDING → CANCELLED:** Được phép. (Nhất quán với code)
*   **PROCESSING → CANCELLED:** KHÔNG được phép.
*   **COMPLETED → CANCELLED:** KHÔNG được phép.

**Logic trong code (`ORDER_STATUS_TRANSITIONS` và `CANCELLABLE_STATUSES`):**
*   Code **CHO PHÉP chuyển trạng thái từ `PROCESSING` sang `CANCELLED`**.
**Mâu thuẫn lớn:** Tài liệu nói "KHÔNG được phép" nhưng code lại "CHO PHÉP" chuyển từ `PROCESSING` sang `CANCELLED`.

**Logic trong tài liệu (Hành động tự động khi hủy):**
*   **Hoàn stock:** Không cần (vì stock chưa trừ ở PENDING).
*   **Cập nhật customer debt:** Trừ lại debt đã tăng. (Nhất quán với code)

**Logic trong code (`updateStatus` method cho CANCELLED):**
*   **Hoàn stock:** Phương thức `updateStatus` **KHÔNG chứa logic hoàn stock nào** khi một đơn hàng bị hủy (bao gồm cả khi hủy từ trạng thái PROCESSING). Vì stock được trừ ở trạng thái PROCESSING, việc thiếu logic hoàn stock khi hủy từ PROCESSING là một **lỗi nghiệp vụ nghiêm trọng và tiềm ẩn sự không nhất quán dữ liệu**. Stock đã bị trừ nhưng không bao giờ được trả lại.

## 2. Kết quả kiểm toán chi tiết: 2️⃣ Payment & Debt Rules

### 2.1 Customer Debt Calculation (Decision #35)

**Tài liệu:**
*   `customer.debtRuntime = Σ (order.total - order.paidAmount)` với `order.status ∉ {CANCELLED}`.
*   Nightly snapshot ghi `CustomerDebtSnapshot`.
*   CHO PHÉP debt âm (overpayment).

**Code (`OrdersService` và `CustomerStatsService`):**
*   **Công thức tính Debt:** Trường `customer.debt` được cập nhật tăng/giảm dựa trên số tiền `outstanding` của đơn hàng (`total - paidAmount`) và các lệnh gọi trực tiếp tới `updateDebt`. Điều này ngầm xây dựng tổng `Σ (order.total - order.paidAmount)` như tài liệu đề cập.
*   **Cho phép nợ âm (overpayment):** Được xác nhận. Vì `debt` là một trường số thập phân và `updateDebt` chấp nhận bất kỳ giá trị `amount` nào (có thể âm), nên nợ có thể âm. Điều này phù hợp với "Boss Decision (Câu 30)".
*   **Nightly snapshot:** Model `CustomerDebtSnapshot` tồn tại, hỗ trợ tính năng snapshot hàng đêm. (Nhất quán với tài liệu)

**Mâu thuẫn/Bug (đã xác định ở phần Order Processing Rules):**
*   **Cập nhật chỉ số khách hàng cho đơn COD COMPLETED (Bug lặp lại):** Như đã lưu ý trước đó, `totalSpent` và `totalOrders` **không được cập nhật cho các đơn COD** khi chúng chuyển sang trạng thái COMPLETED. Đây là một lỗi ảnh hưởng đến độ chính xác của số liệu thống kê khách hàng.

### 2.2 Partial Payment Rules

**Tài liệu:**
*   **KHÔNG hỗ trợ thanh toán một phần.**
*   Khách hàng phải thanh toán ĐẦY ĐỦ hoặc chọn COD.

**Code (`create` method trong `OrdersService`):**
*   Code ném ra `BadRequestException` với thông báo "Partial payments are not supported" nếu `!wantsPaid && basePaidAmount > 0`.
*   Code yêu cầu `paidAmount === total` nếu `isPaid` là `true`.
**Kết luận:** Quy tắc này **hoàn toàn nhất quán** với code.

### 2.3 Payment Method Validation

**Tài liệu:**
*   **COD:** Chỉ cho phép khi có shipping order. Validation: `if (paymentMethod === 'COD' && !shippingOrder) throw Error`.
*   TODO: Xác minh CARD/E_WALLET, BANK_TRANSFER.

**Code (`create` method trong `OrdersService`):
*   Code có kiểm tra: `if (dto.paymentMethod === PaymentMethod.COD && wantsPaid) { throw new BadRequestException('COD orders cannot be marked as paid upfront'); }`
**Mâu thuẫn:** Quy tắc xác thực COD trong code (`COD orders cannot be marked as paid upfront`) khác với quy tắc rõ ràng trong tài liệu (`COD: Chỉ cho phép khi có shipping order`). Mặc dù liên quan, chúng không giống hệt nhau, cho thấy tài liệu có thể không chính xác hoặc thiếu quy tắc. Quy tắc của tài liệu có thể sẽ được triển khai trong `ShippingService`.

### 2.4 Cash Rounding Rules

**Tài liệu:**
*   **KHÔNG làm tròn tiền mặt.**
*   Giữ nguyên số lẻ chính xác.

**Code (`OrdersService`):**
*   Tất cả các tính toán tài chính sử dụng kiểu dữ liệu `Number()` và sau đó được lưu trữ dưới dạng kiểu `Decimal` của Prisma, vốn được thiết kế cho các phép tính tài chính chính xác mà không làm tròn ngầm.
**Kết luận:** Code **nhất quán** với quy tắc không làm tròn tiền mặt.

## 3. Kết quả kiểm toán chi tiết: 3️⃣ Inventory & Stock Rules

### 3.1 Stock Deduction Timing (từ Đơn hàng)

**Tài liệu:**
*   **Boss Decision:** ✅ **Trừ khi chuyển sang PROCESSING**. (Stock được trừ khi đơn hàng chuyển sang PROCESSING)

**Code (`InventoryService`):**
*   Có một phương thức `deductStockOnOrderProcessing(orderId, organizationId, _userId)`.
*   Phương thức này lấy đơn hàng và các mặt hàng của nó.
*   **QUAN TRỌNG:** Nó trả về `{ message: 'Stock deduction functionality pending OrdersModule implementation' }` và **KHÔNG thực hiện bất kỳ việc trừ stock nào**.
**Mâu thuẫn nghiêm trọng:** Tài liệu nêu rõ stock sẽ được trừ khi đơn hàng chuyển sang PROCESSING, nhưng code **không hề thực hiện việc trừ stock nào** cho bất kỳ quá trình chuyển trạng thái nào của đơn hàng. Điều này có nghĩa là **stock không bao giờ được trừ cho các đơn hàng** trong triển khai hiện tại. Đây là một **lỗi nghiệp vụ nghiêm trọng**.

### 3.2 Stock Return on Cancellation (từ Đơn hàng)

**Tài liệu:**
*   **Boss Decision:** ✅ **Hoàn stock về inventory của branch gốc**. (Stock được hoàn về kho của chi nhánh gốc khi hủy đơn)
*   **Pseudo-code:** `handleOrderCancellation` hiển thị `Inventory.increment` và `InventoryTransaction.create`.

**Code (`InventoryService`):**
*   Có một phương thức `returnStockOnOrderCancel(orderId, organizationId, _userId)`.
*   Phương thức này lấy đơn hàng và các mặt hàng của nó.
*   **QUAN TRỌNG:** Nó trả về `{ message: 'Stock return functionality pending OrdersModule implementation' }` và **KHÔNG thực hiện bất kỳ việc hoàn stock nào**.
**Mâu thuẫn nghiêm trọng:** Tài liệu nêu rõ stock sẽ được hoàn lại khi hủy đơn hàng, nhưng code **không hề thực hiện việc hoàn stock nào**. Đây là một **lỗi nghiệp vụ nghiêm trọng**.

### 3.3 Low Stock Warnings

**Tài liệu:**
*   **Cảnh báo cấp 1:** Cảnh báo khi stock < minStock.
*   **Chặn cấp 2:** Chặn tạo đơn hàng khi stock = 0.
*   **KHÔNG cho phép stock âm.**

**Code (`InventoryService.getLowStockAlerts` và `InventoryService.adjustStock`, `OrdersService.calculateOrderTotals`):**
*   **Cảnh báo Low Stock (`getLowStockAlerts`):** Nhất quán.
*   **Chặn ở stock = 0 (`OrdersService`):** Nhất quán.
*   **Ngăn chặn stock âm (`adjustStock`):** Nhất quán.
**Mâu thuẫn (đã xác định trước đó):** Phần PENDING của tài liệu nói "Vẫn cho phép tạo order" ngay cả khi stock không đủ, nhưng phần này nói "Chặn tạo order khi stock = 0". Code tuân theo quy tắc "Chặn", khiến phần PENDING không nhất quán.

### 3.4 Inter-branch Transfer Rules

**Tài liệu:**
*   **Quy trình chuyển hàng:** `PENDING → IN_TRANSIT → RECEIVED`.
*   **Trừ stock khi IN_TRANSIT (SOURCE).**
*   **Cộng stock khi RECEIVED (DESTINATION).**
*   **Quy tắc hủy chuyển hàng:** `PENDING → CANCELLED`, `IN_TRANSIT → CANCELLED` (có hoàn stock).

**Code (`InventoryService.createTransfer`):**
*   **Phương thức `createTransfer`:**
    *   Ngay lập tức `decrement` stock ở `fromBranchId` và `increment` ở `toBranchId` trong cùng một transaction.
    *   Tạo bản ghi `Transfer` với `status: 'RECEIVED'`, `transferredAt: new Date()`, `receivedAt: new Date()`.
    *   Ghi lại các điều chỉnh stock cho cả chi nhánh nguồn (GIẢM) và chi nhánh đích (TĂNG) bằng `StockAdjustment`.
*   **Thiếu xử lý trạng thái `IN_TRANSIT`:** `createTransfer` của code chuyển trực tiếp từ "tạo" sang trạng thái `RECEIVED`. Không có trạng thái `PENDING` hoặc `IN_TRANSIT` trong quy trình chuyển hàng thực tế.

**Mâu thuẫn nghiêm trọng:** Toàn bộ quy trình chuyển hàng giữa các chi nhánh và thời điểm di chuyển stock được triển khai khác với tài liệu. Quy trình nhiều bước được ghi lại với các trạng thái `PENDING`, `IN_TRANSIT` và `RECEIVED`, cùng với việc trừ stock ở `IN_TRANSIT` và cộng ở `RECEIVED`, không được tuân thủ. Thay vào đó, code thực hiện một chuyển hàng ngay lập tức, một giao dịch. Hơn nữa, **không có triển khai nào cho việc hủy chuyển hàng**.

## 4. Kết quả kiểm toán chi tiết: 4️⃣ Pricing & Discount Rules

### 4.1 Product Pricing

**Tài liệu:**
*   **Boss Decision:** ✅ **Cho phép bán lỗ + Cảnh báo**.
*   `sellPrice < costPrice` được phép, kèm cảnh báo.
*   TODO: Phần trăm lãi tối thiểu/tối đa.

**Code (`ProductsService.create` và `ProductsService.update`):**
*   Code không có bất kỳ logic nào để chặn `sellPrice < costPrice`.
*   **Không có cơ chế cảnh báo** được triển khai ở tầng service khi `sellPrice < costPrice`.
**Mâu thuẫn:** "Cảnh báo" không được triển khai trong service.

### 4.2 Variant Pricing

**Tài liệu:**
*   **Boss Decision:** ✅ **Cho phép `additionalPrice` âm**.
*   `variantPrice = product.sellPrice + variant.additionalPrice`.
*   Xác thực: `variantPrice` phải > 0.
*   Khi `product.sellPrice` cập nhật, `additionalPrice` không thay đổi tự động.

**Code (`ProductsService.assertVariantPrice` và `ProductsService.createVariant` / `updateVariant`):**
*   `additionalPrice` có thể âm.
*   `assertVariantPrice` xác thực rằng `finalPrice` (`product.sellPrice + additionalPrice`) phải `> 0`.
*   Khi `sellPrice` của product cập nhật, `additionalPrice` của variant không tự động thay đổi.
**Kết luận:** Phần này **nhất quán** với code.

### 4.3 Discount Rules

**Tài liệu:**
*   **Quyền hạn:** Admin + Manager có thể áp dụng giảm giá (Manager có thể có giới hạn, Cashier thì không).
*   **Giảm giá cấp độ đơn hàng:** Không giới hạn % hoặc VNĐ, nhưng `discount <= subtotal`.
*   **Giảm giá cấp độ mặt hàng:** Được hỗ trợ, với `discountAmount` trên `OrderItem`.
*   **Tính toán:** Giảm giá mặt hàng trước, sau đó giảm giá đơn hàng theo tỷ lệ.
*   TODO: Giảm giá theo phân khúc khách hàng.

**Code (`OrdersService.create`):**
*   **Giảm giá cấp độ đơn hàng:** Code bao gồm `discount` trong tính toán đơn hàng. Xác thực `discount >= 0` và `discount <= subtotal`. (Nhất quán)
*   **Quyền hạn:** Không có kiểm tra quyền hạn rõ ràng trong service. (Không xác định ở tầng service)
*   **Giảm giá cấp độ mặt hàng:** **KHÔNG nhất quán.** Code **KHÔNG hỗ trợ giảm giá cấp độ mặt hàng** trong `OrdersService`. `CreateOrderItemDto` thiếu trường `discountAmount`, và hàm `calculateOrderTotals` không áp dụng giảm giá cho từng mặt hàng.
*   **Tính toán:** **KHÔNG nhất quán.** Do không hỗ trợ giảm giá cấp độ mặt hàng nên logic tính toán phức tạp này không có.
**Mâu thuẫn nghiêm trọng:** `OrdersService` **không triển khai giảm giá cấp độ mặt hàng**, mặc dù tài liệu nêu rõ và mô tả quy trình tính toán phức tạp.

### 4.4 Tax Calculation

**Tài liệu:**
*   **Boss Decision:** ✅ **Có VAT nhưng configurable**.
*   Mặc định 10%, có thể cấu hình qua `settings.vatRate`.
*   VAT được tính trên `(subtotal - discount)`.
*   Trường `isVatExempt` trên Product.
*   UI hiển thị VAT riêng.

**Code (`PricingService.calculateTotals`):**
*   `taxRate` được lấy từ `settingsService` với key `'pricing.taxRate'` (mặc định 0.1).
*   `taxAmount` được tính là `orderDraft.subtotal * taxRate`.
**Mâu thuẫn nghiêm trọng:** Code tính VAT dựa trên `orderDraft.subtotal` trực tiếp. Nó **KHÔNG trừ `discount`** trước khi áp dụng thuế suất. Ngoài ra, **không có logic nào để kiểm tra trường `isVatExempt`** của sản phẩm.
**Mâu thuẫn lớn:** Công thức tính thuế trong code mâu thuẫn trực tiếp với công thức trong tài liệu và hoàn toàn bỏ qua cờ `isVatExempt`.

## 5. Kết quả kiểm toán chi tiết: 5️⃣ Shipping & Logistics Rules

### 5.1 Shipping Fee Calculation

**Tài liệu:**
*   **Boss Decision:** ✅ **Option C - Kết hợp API và bảng giá**.
*   Ưu tiên 1: Gọi API GHN/GHTK.
*   Ưu tiên 2: Sử dụng bảng giá cố định trong database.
*   **Yếu tố:** Cân nặng, khoảng cách, địa chỉ.
*   Ngưỡng free-ship cho kênh ONLINE.

**Code (`PricingService.calculateTotals` và `ShippingFeeService.calculate`):**
*   **Kết hợp API và bảng giá:** **KHÔNG nhất quán.** Code hiện tại chỉ sử dụng tỷ giá cố định từ cài đặt (`baseFee`, `perKgFee`) và logic free-shipping. **KHÔNG có tích hợp API GHN/GHTK** nào được triển khai.
*   **Yếu tố:** Code tính toán dựa trên `weight` nhưng **KHÔNG có logic cho `distance` hoặc `address`** (sẽ cần tích hợp API bên ngoài).
*   **Ngưỡng free-ship:** Logic free-ship có mặt, nhưng điều kiện áp dụng kênh cụ thể (`ONLINE`) phụ thuộc vào cấu hình `shipping.applyChannels` (`PricingService`) và `shipping.channelMultipliers` (`ShippingFeeService`), có thể không nhất quán nếu các cài đặt này không khớp.
**Mâu thuẫn:** Quyết định kinh doanh cốt lõi để kết hợp API và tỷ giá cố định cho tính phí vận chuyển **chưa được triển khai** ở phần API.

### 5.2 COD Collection Rules

**Tài liệu:**
*   **Boss Decision:** ✅ **Option C - Tự động update + có thể manual revert**.
*   **Quy tắc:** Tự động cập nhật thanh toán khi DELIVERED (`order.isPaid = true`, `order.paidAmount = order.total`).
*   `shippingOrder.codAmount = order.total`.

**Code (`ShippingService.create` và `ShippingService.applyStatusSideEffects`):**
*   **Tự động cập nhật thanh toán khi DELIVERED:** **KHÔNG nhất quán.** Code trong `ShippingService` cập nhật `shippingPartner.debtBalance` nhưng **KHÔNG cập nhật `order.isPaid` hoặc `order.paidAmount`** cho `Order` liên quan khi `DELIVERED`. Điều này có nghĩa là đơn hàng vẫn ở trạng thái chưa thanh toán ngay cả khi COD đã được thu. Đây là một **bug nghiêm trọng.**
*   **`shippingOrder.codAmount = order.total`:** **KHÔNG nhất quán.** `shippingOrder.codAmount` lấy từ `dto.codAmount` khi tạo, không phải từ `order.total`. Không có ràng buộc rằng chúng phải bằng nhau.
**Mâu thuẫn nghiêm trọng:** Chức năng tự động cập nhật thanh toán cho đơn COD khi DELIVERED **chưa được triển khai**, khiến đơn hàng vẫn ở trạng thái chưa thanh toán.

### 5.3 Failed/Returned Delivery

**Tài liệu:**
*   **Boss Decision:** ✅ **Ship fail → PENDING + Cần xác nhận hoàn hàng**.
*   **Workflow:** `PROCESSING → [Shipping FAILED] → PENDING`.
*   **Quy tắc:** Order status chuyển về PENDING khi shipping status = FAILED.
*   Khi Admin nhấn "Xác nhận hoàn hàng": Hoàn stock, rollback customer stats.
*   Trạng thái `RETURNED` tương tự như `FAILED`.

**Code (`ShippingService.applyStatusSideEffects`):**
*   **`FAILED` shipping:** Code chuyển order sang trạng thái `PROCESSING`.
*   **`RETURNED` shipping:** Code chuyển order sang trạng thái `CANCELLED`.
**Mâu thuẫn lớn:** Code **mâu thuẫn trực tiếp** với logic nghiệp vụ được ghi trong tài liệu về trạng thái đơn hàng sau khi giao hàng thất bại hoặc bị trả lại. Code chuyển các đơn hàng `FAILED` sang `PROCESSING` và `RETURNED` sang `CANCELLED`, chứ không phải `PENDING` như tài liệu. Ngoài ra, không có logic hoàn stock hoặc rollback stats nào được xử lý trực tiếp ở đây.

### 5.4 Shipping Partner Debt

**Tài liệu:**
*   **Công thức:** `partner.debtBalance = totalCOD - totalFees - paidToPartner`.
*   TODO: Đối soát, theo dõi `paidToPartner`.

**Code (`ShippingService.create` và `ShippingService.settleCod`):**
*   Code theo dõi `debtBalance` bằng cách tăng/giảm dựa trên `codAmount` đã thu.
**Mâu thuẫn:** Công thức `debtBalance` trong tài liệu là một công thức kế toán cấp cao hơn. Code theo dõi một số dư nợ giao dịch, là một phần của công thức tổng thể nhưng không phải là toàn bộ. Có sự **không nhất quán** về cấp độ chi tiết hoặc tính toán chính xác.

## 6. Kết quả kiểm toán chi tiết: 6️⃣ Customer Management Rules

### 6.1 Customer Segmentation

**Tài liệu:**
*   **Boss Decision:** ✅ **Phân loại linh hoạt - Người dùng tự định nghĩa**.
*   Admin có thể tạo segments tùy chỉnh trong Settings với conditions (field, operator, value).
*   **Default segments:** "Đang Giao Hàng", "Đã mua hàng", "VIP", "Loyal", "New Customer", "Inactive".
*   `autoApply` field trong interface `CustomerSegment`.

**Code (`CustomerSegmentationService`):**
*   Triển khai một hệ thống phân khúc có thể cấu hình mạnh mẽ, đọc từ `SettingsService`.
*   Các điều kiện (`field`, `operator`, `value`) và việc đánh giá chúng được triển khai tốt.
*   **Default segments:** `DEFAULT_SEGMENTATION_SETTINGS` trong code có "VIP", "Loyal", "Active", "Inactive".
**Mâu thuẫn:** Danh sách "Default segments" trong tài liệu **không nhất quán** với `DEFAULT_SEGMENTATION_SETTINGS` trong code. Một số segment được ghi trong tài liệu ("Đang Giao Hàng", "Đã mua hàng", "New Customer") không có mặt và tên gọi cũng khác.

### 6.2 Customer Stats Auto-Update

**Tài liệu:**
*   **Boss Decision:** ✅ Khi order PENDING - tăng ngay (`customer.totalSpent`, `customer.totalOrders`).
*   **Khi order = CANCELLED:** Có trừ lại (`customer.totalSpent`, `customer.totalOrders`).

**Code (`CustomerStatsService.updateStatsOnOrderComplete` và `CustomerStatsService.revertStatsOnOrderCancel`):**
*   Logic tăng và giảm `totalSpent` và `totalOrders` nhất quán với các quy tắc tài liệu khi được gọi.
**Mâu thuẫn/Bug (đã xác định ở phần Order Processing Rules):**
*   **Cập nhật chỉ số khách hàng cho đơn COD COMPLETED (Bug lặp lại):** `totalSpent` và `totalOrders` **không được cập nhật cho các đơn COD** khi chúng chuyển sang trạng thái COMPLETED. Đây là một lỗi nghiêm trọng ảnh hưởng đến độ chính xác của số liệu thống kê khách hàng.

### 6.3 Duplicate Customer Prevention

**Tài liệu:**
*   **Boss Decision:** ✅ **Phone number phải UNIQUE trong organization**.
*   Không tự động merge customers.
*   Throw validation error nếu phone trùng.
*   Email KHÔNG bắt buộc.

**Code (`CustomersService.create` và `CustomersService.update`):**
*   Code kiểm tra số điện thoại duy nhất trong tổ chức (loại trừ các bản ghi đã xóa) và ném `ConflictException` nếu tìm thấy trùng lặp.
*   Trường `email` là `@IsOptional()`.
**Kết luận:** Phần này **nhất quán** với code.

## 7. Kết quả kiểm toán chi tiết: 7️⃣ Multi-tenant Security Rules

### 7.1 Organization Isolation (CRITICAL)

**Tài liệu:**
*   **Quy tắc bắt buộc:** ✅ **MỌI query phải có `organizationId` filter**.
*   Đề cập "Prisma middleware: luôn tự inject `organizationId` + `deletedAt: null`".

**Code:**
*   `organizationId` được thêm vào điều kiện `where` một cách nhất quán trong các service đã kiểm tra.
*   **KHÔNG tìm thấy Prisma middleware rõ ràng** nào để tự động inject `organizationId`. Việc thực thi dựa vào việc thêm thủ công.
**Mâu thuẫn nghiêm trọng:** Tài liệu nêu rõ một middleware Prisma sẽ tự động inject `organizationId` và `deletedAt: null`. Tuy nhiên, **không có middleware nào như vậy được tìm thấy**. Điều này có nghĩa là việc cách ly multi-tenant quan trọng dựa hoàn toàn vào việc các nhà phát triển thêm `organizationId` theo cách thủ công vào mọi truy vấn, điều này rất dễ xảy ra lỗi và là một **rủi ro bảo mật đáng kể**.

### 7.2 Cross-Organization Operations

**Tài liệu:**
*   TODO: "Có cho phép transfer giữa organizations không? (Không)"
*   TODO: "Có cho phép share products/categories không? (Không)"
*   TODO: "Admin có thể xem data của org khác không? (Không)"

**Code:**
*   Code nhất quán sử dụng các bộ lọc `organizationId`, ngăn chặn các hoạt động giữa các tổ chức theo mặc định.
**Kết luận:** Nhất quán với "Không" được ngụ ý trong tài liệu.

## 8. Kết quả kiểm toán chi tiết: 8️⃣ Audit & Logging Rules

### 8.1 Audit Trail Requirements

**Tài liệu:**
*   **Actions cần log:** TODO list bao gồm `Tạo/sửa/xóa orders`, `Thay đổi order status`, `Apply discount`, `Inventory adjustments`, `Transfer operations`.
*   **Log format:** TODO list.

**Code:**
*   Model `AuditLog` và `AuditLogService` tồn tại.
*   Tuy nhiên, **không có code nào trong các service đã kiểm tra thực sự gọi `AuditLogService.log`**.
**Mâu thuẫn nghiêm trọng:** Cơ sở hạ tầng ghi log đã có nhưng **không được sử dụng**. **Không có hành động nghiệp vụ nào được ghi log**.

### 8.2 Data Retention Policy

**Tài liệu:**
*   **Boss Decision:** ✅ **SOFT delete + AUTO-HARD sau 6 tháng**.
*   Admin có thể khôi phục trong vòng 6 tháng.
*   Cronjob để xóa vĩnh viễn sau 6 tháng.

**Code:**
*   **Xóa mềm:** Nhất quán. Trường `deletedAt` tồn tại và được sử dụng.
*   **Khôi phục:** **Chưa được triển khai.** Không tìm thấy logic nào để khôi phục.
*   **Xóa vĩnh viễn tự động:** **Chưa được triển khai.** Không tìm thấy cronjob nào cho việc này.

## 9. Kết luận chung về tài liệu Logic nghiệp vụ (`01_BUSINESS_LOGIC.md`)

Tài liệu `01_BUSINESS_LOGIC.md` tiếp tục cho thấy **sự không nhất quán nghiêm trọng và thiếu sót mang tính sống còn** so với triển khai code. Các vấn đề cốt lõi liên quan đến quản lý tồn kho, quy tắc định giá/chiết khấu, quy trình vận chuyển, cập nhật thống kê khách hàng và bảo mật đa-tenant đang mâu thuẫn nghiêm trọng với tài liệu.

**Các bước tiếp theo:**

Tôi đã hoàn thành kiểm toán chi tiết cho hầu hết các phần chính của tài liệu `01_BUSINESS_LOGIC.md`.

Bạn có muốn tôi tiếp tục kiểm toán các phần còn lại của tài liệu `01_BUSINESS_LOGIC.md` (ví dụ: Notification Rules, Lead Management, v.v.) không? Hay bạn muốn tôi chuyển sang kiểm toán một tài liệu khác trong thư mục `docs/essential/` hoặc `docs/guides/`?