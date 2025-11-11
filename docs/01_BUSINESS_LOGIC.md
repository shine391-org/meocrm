# Business Logic & Rules - MeoCRM

> **Mục đích:** Tài liệu tập trung tất cả quy tắc nghiệp vụ (business rules) của MeoCRM
> 

> **Audience:** Jules, Codex, Gemini và toàn bộ team development
> 

> **Status:** 🚧 Đang xây dựng
> 

<aside>
⚠️

**QUAN TRỌNG:** Tất cả logic nghiệp vụ phải được ghi chú rõ ràng tại đây TRƯỚC KHI implement code. Agents phải đọc tài liệu này trước khi code các modules liên quan.

</aside>

---

## 1️⃣ Order Processing Rules

### 1.1 Quy trình trạng thái đơn hàng

**Workflow chuẩn:**

```
PENDING → PROCESSING → COMPLETED
           ↓
        CANCELLED (có thể cancel từ PENDING hoặc PROCESSING)
```

### PENDING (Đang xử lý)

- **Khi nào tạo:** Khi tạo đơn hàng mới

**Boss Decision (Câu 26):** ✅ **Option A - CÓ kiểm tra stock + Cảnh báo**

- **Điều kiện:**
    - [x]  ✅ **Kiểm tra stock trước khi tạo order**
    - [x]  ⚠️ **Hiển thị cảnh báo** nếu stock không đủ: "⚠️ Sản phẩm X chỉ còn Y trong kho, bạn đang đặt Z"
    - [x]  ✅ **Vẫn cho phép tạo order** (Admin có thể đặt hàng trước, nhập sau)
    - [x]  ❌ **KHÔNG block** việc tạo order

**Boss Decision (Câu 27):** ✅ **Option B - KHÔNG cần customer approval**

- [x]  ❌ **KHÔNG yêu cầu customer confirm** qua email/SMS
- [x]  ✅ Admin tạo order → Order PENDING luôn (phù hợp POS)

**Implementation:**

```jsx
// Pseudo-code khi tạo order
async createOrder(orderData) {
  const warnings = [];
  
  // Check stock và thu thập warnings
  for (const item of orderData.items) {
    const inventory = await Inventory.findOne({
      productId: item.productId,
      variantId: item.variantId,
      branchId: orderData.branchId
    });
    
    if (inventory.stock < item.quantity) {
      warnings.push({
        product: item.productName,
        available: inventory.stock,
        requested: item.quantity,
        message: `⚠️ ${item.productName} chỉ còn ${inventory.stock} trong kho, bạn đang đặt ${item.quantity}`
      });
    }
  }
  
  // Tạo order (vẫn tạo dù có warning)
  const order = await Order.create({
    ...orderData,
    status: 'PENDING'
  });
  
  // Return order + warnings để UI hiển thị
  return { order, warnings };
}
```

**Boss Decision (Câu 29):** ✅ **Option B - MANUAL - Admin click "Tạo vận đơn"**

- **Actions tự động:**
    - [x]  ❌ **KHÔNG trừ stock** ngay lúc PENDING (đã quyết định Batch 1 - trừ khi PROCESSING)
    - [x]  ❌ **KHÔNG tự động tạo shipping order** khi PENDING
    - [x]  ✅ **Admin phải manual click** "Tạo vận đơn" → Gọi API GHN/GHTK → Order chuyển sang PROCESSING
    - [x]  ✅ Phù hợp vì POS không cần ship, chỉ COD mới cần

**Lý do:**

- Ưu: Admin có control, phân biệt rõ POS vs COD
- Nhược: Thêm manual step (nhưng cần thiết để phân biệt order type)

### PROCESSING (Đang thực hiện)

**Boss Decision (Câu 20):** ✅ **Tự động chuyển khi tạo shipping order (chỉ cho đơn COD)**

- **Điều kiện chuyển từ PENDING:**
    - [x]  ✅ **Tự động chuyển** khi Admin tạo shipping order (gọi API GHN/GHTK)
    - [x]  ⚠️ **Chỉ áp dụng cho đơn COD/ship đi** - Đơn bán tại cửa hàng bỏ qua PROCESSING
- **Actions tự động:**
    - [x]  ✅ Trừ stock khi chuyển sang PROCESSING (theo quyết định Batch 1)
    - [x]  ✅ Gửi notification cho customer: "Đơn hàng đang được xử lý"

**Implementation:**

```jsx
// Pseudo-code khi Admin tạo shipping order
async createShippingOrder(orderId, shippingData) {
  const order = await Order.findById(orderId);
  
  // Validate
  if (order.status !== 'PENDING') {
    throw new Error('Chỉ có thể ship đơn PENDING');
  }
  
  // 1. Tạo shipping order với GHN/GHTK
  const shippingOrder = await GHN_API.createOrder(shippingData);
  
  // 2. Auto chuyển order sang PROCESSING
  await Order.update(orderId, {
    status: 'PROCESSING',
    shippingOrderId: shippingOrder.id
  });
  
  // 3. Trừ stock (theo Batch 1 decision)
  await deductStock(order);
  
  // 4. Gửi notification
  await sendNotification(order.customerId, 'ORDER_PROCESSING');
}
```

### COMPLETED (Hoàn thành)

**Boss Decision (Câu 21):** ✅ **Tự động khi shipping DELIVERED (cho đơn COD) hoặc ngay lập tức (cho POS)**

**2 workflows:**

**Workflow 1: Đơn bán tại cửa hàng (POS)**

- [x]  ✅ PENDING → **COMPLETED ngay lập tức** (skip PROCESSING)
- [x]  ✅ Trigger: Khi customer thanh toán xong tại quầy
- [x]  ✅ Không có shipping order

**Workflow 2: Đơn COD ship đi**

- [x]  ✅ PROCESSING → **COMPLETED tự động** khi shipping status = DELIVERED
- [x]  ✅ Webhook từ GHN/GHTK trigger auto-update
- [x]  ⚠️ Admin có thể revert nếu cần (như quyết định Batch 3 về COD payment)
- **Actions tự động khi COMPLETED:**
    - [x]  ✅ Cập nhật customer stats: totalSpent, totalOrders (đã quyết định ở PENDING - Batch 1)
    - [x]  ✅ Cập nhật customer segment (nếu có auto-apply segment rules)
    - [ ]  TODO: Gửi request review/feedback cho customer?

**Implementation:**

```jsx
// Workflow 1: POS sale
async completePOSSale(orderId) {
  await Order.update(orderId, {
    status: 'COMPLETED',
    completedAt: new Date()
  });
  // Customer stats đã update ở PENDING (Batch 1 decision)
}

// Workflow 2: COD webhook
async onShippingDelivered(shippingOrder) {
  if (shippingOrder.status === 'DELIVERED') {
    await Order.update(shippingOrder.orderId, {
      status: 'COMPLETED',
      completedAt: new Date()
    });
    
    // Auto-update COD payment (Batch 3 decision)
    if (order.paymentMethod === 'COD') {
      await Order.update(shippingOrder.orderId, {
        isPaid: true,
        paidAmount: order.total
      });
    }
  }
}
```

### CANCELLED (Đã hủy)

- **Cho phép cancel từ trạng thái nào?**
    - [x]  ✅ **PENDING → CANCELLED:** Có được - Boss cho phép
    - [x]  ❌ **PROCESSING → CANCELLED:** KHÔNG được phép
    - [x]  ❌ **COMPLETED → CANCELLED:** KHÔNG được phép (refund case riêng)
- **Actions tự động khi cancel:**
    - [x]  ✅ Hoàn stock: Không cần (vì stock chưa trừ ở PENDING)
    - [x]  ✅ Xử lý payment: Hoàn lại nếu đã thanh toán
    - [x]  ✅ Xử lý shipping order: Hủy shipping order nếu có
    - [x]  ✅ Cập nhật customer debt: Trừ lại debt đã tăng

### 1.2 Refund Policy

- [ ]  TODO: Có cho phép refund không?
- [ ]  TODO: Refund trong bao nhiêu ngày?
- [ ]  TODO: Refund 100% hay trừ phí?
- [ ]  TODO: Xử lý stock khi refund?

---

## 2️⃣ Payment & Debt Rules

### 2.1 Customer Debt Calculation

**Formula hiện tại (cần confirm):**

```jsx
customer.debt = order.total - order.paidAmount
```

**Boss Decisions:**

- [x]  ✅ **Debt được cộng dồn khi nào?** → Khi tạo order (PENDING) - debt tăng ngay
- [x]  ✅ **Khi order CANCELLED, có trừ debt không?** → Có, trừ lại debt

**Boss Decision (Câu 30):** ✅ **Option A - CHO PHÉP debt âm (overpayment)**

**Overpayment Rules:**

- [x]  ✅ **Customer debt có thể âm** - Đại diện cho "Shop nợ khách" (overpayment)
- [x]  ✅ **Scenario:** Customer trả trước 10 triệu, mua hàng 8 triệu → Debt = -2 triệu
- [x]  ✅ **UI Display:**
    - Debt > 0: "Khách nợ: 5,000,000đ" (màu đỏ)
    - Debt = 0: "Không nợ" (màu xám)
    - Debt < 0: "Shop nợ khách: 2,000,000đ" (màu xanh)
- [x]  ✅ **Không có min = 0** - Có thể âm vô hạn

**Lý do:**

- Ưu: Linh hoạt, track được overpayment chính xác, customer có thể trả trước nhiều đợt
- Nhược: Phức tạp hơn một chút trong UI (phải hiển thị "Shop nợ khách")

### 2.2 Partial Payment Rules

**Boss Decision:** ❌ **KHÔNG hỗ trợ partial payment**

**Quy tắc:**

- [x]  Customer phải thanh toán 1 lần FULL hoặc chọn COD
- [x]  Không tạo bảng Payment riêng để track multiple payments
- [x]  Order chỉ có 2 trạng thái payment: Paid (isPaid=true) hoặc Unpaid (isPaid=false)

**Lý do:**

- Ưu: Đơn giản, dễ quản lý, giảm complexity
- Nhược: Kém linh hoạt (nhưng đủ cho MVP)

### 2.3 Payment Method Validation

**5 phương thức:** CASH, CARD, E_WALLET, BANK_TRANSFER, COD

**Boss Decisions:**

- [x]  ✅ **COD:** Chỉ cho phép khi có shipping order
    - Validation: `if (paymentMethod === 'COD' && !shippingOrder) throw Error`
- [ ]  TODO: CARD/E_WALLET có cần verify transaction ID không?
- [ ]  TODO: BANK_TRANSFER có cần attach proof (ảnh chuyển khoản)?

### 2.4 Cash Rounding Rules

**Boss Decision (Câu 19):** ✅ **Option B - KHÔNG làm tròn tiền mặt**

**Quy tắc:**

- [x]  ❌ **KHÔNG làm tròn** - Giữ nguyên số lẻ chính xác
- [x]  ✅ Order total có thể là: 10,500đ, 15,750đ, v.v.
- [x]  ✅ Hiển thị đầy đủ số lẻ trên UI và receipt

**Lý do:**

- Ưu: Chính xác nhất, không gây tranh cãi với khách hàng
- Nhược: Có thể khó trả tiền lẻ (nhưng có thể dùng ví điện tử, thẻ để tránh vấn đề này)

---

## 3️⃣ Inventory & Stock Rules

### 3.1 Stock Deduction Timing

**Khi nào trừ stock?**

- [ ]  **Option 1:** Trừ ngay khi tạo order (PENDING)
    - Ưu: Tránh oversell
    - Nhược: Stock bị hold nếu order bị cancel
- [x]  **Option 2:** Trừ khi chuyển sang PROCESSING ✅ **BOSS DECISION**
    - Ưu: Linh hoạt hơn
    - Nhược: Có thể oversell trong thời gian PENDING
- [ ]  **Option 3:** Trừ khi chuyển sang COMPLETED
    - Ưu: Chính xác nhất
    - Nhược: Rủi ro oversell cao

**Boss quyết định:** ✅ **Option B - Trừ stock khi chuyển sang PROCESSING**

### 3.2 Stock Return on Cancellation

**Boss Decision:** ✅ **Option B - Hoàn stock về inventory của branch gốc**

**Quy tắc:**

- [x]  ✅ Hoàn về `Inventory` của branch đã tạo order (order.branchId)
- [x]  ✅ Cần xác định branch gốc từ order.branchId
- [x]  ✅ Tạo InventoryTransaction để log việc hoàn stock
    - Type: "ORDER_CANCELLED"
    - Quantity: +orderItem.quantity (cộng lại)
    - Reference: orderId

**Implementation:**

```jsx
// Pseudo-code khi order → CANCELLED
async handleOrderCancellation(order) {
  for (const item of order.items) {
    // 1. Tìm inventory record của branch gốc
    const inventory = await Inventory.findOne({
      productId: item.productId,
      variantId: item.variantId,
      branchId: order.branchId
    });
    
    // 2. Hoàn stock
    inventory.stock += item.quantity;
    await inventory.save();
    
    // 3. Log transaction
    await InventoryTransaction.create({
      type: 'ORDER_CANCELLED',
      productId: item.productId,
      variantId: item.variantId,
      branchId: order.branchId,
      quantity: item.quantity,
      referenceId: order.id,
      note: `Hoàn stock từ order #${order.orderNumber}`
    });
  }
}
```

**Lý do:**

- Ưu: Chính xác theo branch, có thể track inventory movement
- Nhược: Phức tạp hơn so với hoàn về product.stock tổng

### 3.3 Low Stock Warnings

**Boss Decision:** ✅ **Kết hợp - Cảnh báo + Block**

**Quy tắc:**

- [x]  ✅ **Level 1 - Warning:** Cảnh báo khi stock < minStock
    - UI: Badge màu vàng "⚠️ Sắp hết hàng"
    - Gửi notification cho: Admin + Manager
- [x]  ✅ **Level 2 - Block:** Block tạo order khi stock = 0
    - UI: Disable "Thêm vào đơn" button
    - Error: "Sản phẩm đã hết hàng, không thể tạo order"
- [x]  ❌ **KHÔNG cho phép negative stock** (bán âm)
    - Lý do: Tránh oversell, đảm bảo inventory accuracy

**Notification Rules:**

- [x]  ✅ **Boss Decision (Câu 22):** Email
- [ ]  TODO: Tần suất gửi? (1 lần/ngày, realtime?)

### 3.4 Inter-branch Transfer Rules

**Transfer workflow:**

```jsx
PENDING (tạo transfer request)
   ↓ Admin confirm + tạo vận đơn GHN/GHTK
IN_TRANSIT (có tracking number) → ⚡ TRỪ STOCK Ở SOURCE
   ↓ Hàng đến nơi
RECEIVED → ⚡ CỘNG STOCK Ở DESTINATION
```

**Boss Decision (Câu 24):** ✅ **Admin approval**

- [x]  ✅ Transfer cần approval từ: **Admin only**

**Boss Decision (Câu 31):** ✅ **Trừ stock khi IN_TRANSIT (khi có vận đơn)**

**Stock Deduction tại Source Branch:**

- [x]  ✅ **Trừ stock khi IN_TRANSIT** - Sau khi Admin confirm + tạo vận đơn GHN/GHTK
- [x]  ❌ **KHÔNG trừ khi PENDING** - Chỉ là transfer request, chưa chắc thực hiện
- [x]  ✅ Lưu `trackingNumber` vào TransferOrder
- [x]  ✅ Tạo InventoryTransaction log (type: "TRANSFER_OUT", quantity: -X)

**Boss Decision (Câu 32):** ✅ **Cộng stock khi RECEIVED**

**Stock Addition tại Destination Branch:**

- [x]  ✅ **Cộng stock khi RECEIVED** - Khi destination confirm đã nhận hàng
- [x]  ❌ **KHÔNG cộng khi IN_TRANSIT** - Chưa nhận được thì chưa cộng
- [x]  ✅ Tạo InventoryTransaction log (type: "TRANSFER_IN", quantity: +X)
- [x]  ⚠️ Destination phải manual confirm "Đã nhận hàng" trên UI

**Boss Decision (Câu 33):** ✅ **PENDING + IN_TRANSIT → CANCELLED**

**Cancel Transfer Rules:**

- [x]  ✅ **PENDING → CANCELLED:** Được phép (chưa gửi hàng)
- [x]  ✅ **IN_TRANSIT → CANCELLED:** Được phép (đang ship nhưng có thể cancel)
    - Phải **hoàn stock về source branch** (vì đã trừ lúc IN_TRANSIT)
    - Tạo InventoryTransaction log (type: "TRANSFER_CANCELLED", quantity: +X)
- [x]  ❌ **RECEIVED → CANCELLED:** KHÔNG được phép (đã nhận hàng rồi)

**Implementation:**

```jsx
// Pseudo-code: Admin confirm transfer + tạo vận đơn
async confirmTransfer(transferId, shippingData) {
  const transfer = await Transfer.findById(transferId);
  
  if (transfer.status !== 'PENDING') {
    throw new Error('Chỉ có thể confirm transfer PENDING');
  }
  
  // 1. Tạo vận đơn với GHN/GHTK
  const shippingOrder = await GHN_API.createTransferOrder(shippingData);
  
  // 2. Update transfer status
  await Transfer.update(transferId, {
    status: 'IN_TRANSIT',
    trackingNumber: shippingOrder.trackingNumber,
    shippedAt: new Date()
  });
  
  // 3. ⚡ TRỪ STOCK Ở SOURCE BRANCH
  for (const item of transfer.items) {
    await Inventory.decrement({
      where: {
        productId: item.productId,
        variantId: item.variantId,
        branchId: transfer.sourceBranchId
      },
      data: { stock: item.quantity }
    });
    
    // Log transaction
    await InventoryTransaction.create({
      type: 'TRANSFER_OUT',
      quantity: -item.quantity,
      productId: item.productId,
      variantId: item.variantId,
      branchId: transfer.sourceBranchId,
      referenceId: transferId,
      notes: `Transfer to branch ${transfer.destinationBranchId}`
    });
  }
}

// Pseudo-code: Destination confirm nhận hàng
async confirmReceived(transferId) {
  const transfer = await Transfer.findById(transferId);
  
  if (transfer.status !== 'IN_TRANSIT') {
    throw new Error('Chỉ có thể confirm transfer IN_TRANSIT');
  }
  
  // 1. Update transfer status
  await Transfer.update(transferId, {
    status: 'RECEIVED',
    receivedAt: new Date()
  });
  
  // 2. ⚡ CỘNG STOCK Ở DESTINATION BRANCH
  for (const item of transfer.items) {
    await Inventory.increment({
      where: {
        productId: item.productId,
        variantId: item.variantId,
        branchId: transfer.destinationBranchId
      },
      data: { stock: item.quantity }
    });
    
    // Log transaction
    await InventoryTransaction.create({
      type: 'TRANSFER_IN',
      quantity: item.quantity,
      productId: item.productId,
      variantId: item.variantId,
      branchId: transfer.destinationBranchId,
      referenceId: transferId,
      notes: `Transfer from branch ${transfer.sourceBranchId}`
    });
  }
}

// Pseudo-code: Cancel transfer
async cancelTransfer(transferId, reason) {
  const transfer = await Transfer.findById(transferId);
  
  if (!['PENDING', 'IN_TRANSIT'].includes(transfer.status)) {
    throw new Error('Chỉ có thể cancel transfer PENDING hoặc IN_TRANSIT');
  }
  
  // Nếu đang IN_TRANSIT → phải hoàn stock về source
  if (transfer.status === 'IN_TRANSIT') {
    for (const item of transfer.items) {
      await Inventory.increment({
        where: {
          productId: item.productId,
          variantId: item.variantId,
          branchId: transfer.sourceBranchId
        },
        data: { stock: item.quantity }
      });
      
      // Log transaction
      await InventoryTransaction.create({
        type: 'TRANSFER_CANCELLED',
        quantity: item.quantity,
        productId: item.productId,
        variantId: item.variantId,
        branchId: transfer.sourceBranchId,
        referenceId: transferId,
        notes: `Transfer cancelled - Reason: ${reason}`
      });
    }
  }
  
  // Update transfer status
  await Transfer.update(transferId, {
    status: 'CANCELLED',
    cancelledAt: new Date(),
    cancelReason: reason
  });
}
```

**Lý do workflow này:**

- Ưu (Câu 31): Trừ khi có vận đơn → chắc chắn transfer sẽ thực hiện, tránh bán nhầm stock
- Ưu (Câu 32): Cộng khi nhận hàng → chính xác nhất, destination kiểm tra hàng OK mới cộng
- Ưu (Câu 33): Cho phép cancel IN_TRANSIT → linh hoạt, có thể xử lý trường hợp đột xuất

---

## 4️⃣ Pricing & Discount Rules

### 4.1 Product Pricing

**Boss Decision:** ✅ **Cho phép bán lỗ + Cảnh báo**

**Cost Price vs Sell Price:**

- [x]  ✅ Cho phép sellPrice < costPrice (bán lỗ)
    - Ưu: Linh hoạt cho sale/clearance
    - Nhược: Có thể lỗ vô ý
- [x]  ✅ Hiển thị cảnh báo màu đỏ khi sellPrice < costPrice
    - Warning: "⚠️ Giá bán thấp hơn giá vốn! Đơn hàng này sẽ BỊ LỖ"
- [ ]  TODO: Có giới hạn % lãi tối thiểu/tối đa không?

### 4.2 Variant Pricing

**Boss Decision:** ✅ **Option A - Cho phép additionalPrice âm**

**ProductVariant.additionalPrice:**

```jsx
variantPrice = product.sellPrice + variant.additionalPrice
```

**Quy tắc:**

- [x]  ✅ **additionalPrice có thể âm** (variant rẻ hơn base product)
    - VD: Base product sellPrice = 100,000đ
    - Variant "Size S" có additionalPrice = -10,000đ
    - → Giá cuối của variant Size S = 90,000đ
- [x]  ✅ Validation: `variantPrice = product.sellPrice + variant.additionalPrice` phải > 0
    - Nếu result ≤ 0 → throw error: "Giá variant không hợp lệ"

**Lý do:**

- Ưu: Linh hoạt - Cho phép variant nhỏ hơn rẻ hơn base product
- Nhược: Có thể confusing cho user, cần UI rõ ràng

**Note:** Khi update product.sellPrice, KHÔNG tự động update giá variant (giữ nguyên additionalPrice)

### 4.3 Discount Rules

**Boss Decision:** ✅ **Option B - Admin + Manager có quyền apply discount**

**Permissions:**

- [x]  ✅ **Admin:** Full quyền apply discount (unlimited)
- [x]  ✅ **Manager:** Có quyền apply discount (có thể có giới hạn)
- [x]  ❌ **Cashier:** KHÔNG có quyền apply discount (phải xin approve từ Manager)

**Implementation:**

```jsx
// Pseudo-code check permission
async applyDiscount(orderId, discountAmount, userId) {
  const user = await User.findById(userId);
  
  if (!['ADMIN', 'MANAGER'].includes(user.role)) {
    throw new ForbiddenError('Bạn không có quyền áp dụng discount');
  }
  
  // TODO: Có thể thêm giới hạn discount cho Manager
  // if (user.role === 'MANAGER' && discountAmount > MAX_MANAGER_DISCOUNT) {
  //   throw new ForbiddenError('Discount vượt quá giới hạn cho phép');
  // }
  
  await Order.update(orderId, { discountAmount });
}
```

**Boss Decision:** ✅ **Option B - KHÔNG giới hạn discount (100% hoặc unlimited VNĐ)**

**Order-level discount:**

- [x]  ✅ **Discount % max:** 100% (không giới hạn)
- [x]  ✅ **Discount VNĐ max:** Không giới hạn (unlimited)
- [x]  ⚠️ **Permission:** Chỉ Admin + Manager (đã quyết định ở Batch 3)

**Validation:**

```jsx
// Pseudo-code validation
async applyDiscount(order, discountAmount) {
  // Discount không được > subtotal
  if (discountAmount > order.subtotal) {
    throw new ValidationError('Discount không thể lớn hơn tổng tiền hàng');
  }
  
  // Discount phải >= 0
  if (discountAmount < 0) {
    throw new ValidationError('Discount không hợp lệ');
  }
}
```

**Lý do:**

- Ưu: Hoàn toàn linh hoạt - Admin/Manager có full quyền decide
- Nhược: Rủi ro cao (có thể discount 100% = free) - nhưng Boss tin tưởng Admin/Manager

**Boss Decision (Câu 18):** ✅ **Option A - Có item-level discount**

**Item-level discount:**

- [x]  ✅ **Có hỗ trợ discount riêng cho từng item** - Mỗi OrderItem có field `discountAmount`
- [x]  ⚠️ **Khi có cả order discount và item discount:**
    - Item discount apply trước: `itemTotal = (price * quantity) - itemDiscountAmount`
    - Order discount phân bổ theo tỷ lệ: `itemOrderDiscount = orderDiscount * (itemTotal / subtotal)`
    - Final item total: `itemFinalTotal = itemTotal - itemOrderDiscount`

**Implementation:**

```jsx
// Pseudo-code tính discount
async calculateOrderTotal(order) {
  // Step 1: Apply item-level discounts
  let subtotal = 0;
  for (const item of order.items) {
    item.lineTotal = (item.price * item.quantity) - (item.discountAmount || 0);
    subtotal += item.lineTotal;
  }
  
  // Step 2: Distribute order-level discount proportionally
  if (order.discountAmount > 0) {
    for (const item of order.items) {
      const proportion = item.lineTotal / subtotal;
      item.orderDiscountShare = order.discountAmount * proportion;
      item.finalTotal = item.lineTotal - item.orderDiscountShare;
    }
  }
  
  // Step 3: Calculate final total
  const totalAfterDiscount = subtotal - order.discountAmount;
  const vatAmount = calculateVAT(order.items);
  const total = totalAfterDiscount + vatAmount + order.shippingFee;
  
  return total;
}
```

**Lý do:**

- Ưu: Linh hoạt tối đa - Có thể discount từng món cụ thể (sale 1 món) + discount toàn đơn
- Nhược: Phức tạp hơn trong tính toán và UI

**Customer segment discount:**

- [ ]  TODO: VIP customers có discount tự động không?
- [ ]  TODO: Segment nào được discount bao nhiêu %?

### 4.4 Tax Calculation

**Boss Decision:** ✅ **Option C - Có VAT nhưng configurable**

**Quy tắc:**

- [x]  ✅ **Có VAT** - Mặc định 10% (Vietnam standard)
- [x]  ✅ **Configurable** - Admin có thể set % trong Settings
    - Setting key: `vatRate` (default: 0.10)
    - Admin có thể đổi thành 0%, 5%, 8%, 10%, v.v.
- [x]  ✅ **VAT tính trên:** (subtotal - discount)
- [x]  ⚠️ **Có thể exempt VAT** - Một số sản phẩm có thể set `isVatExempt = true`

**Formula:**

```jsx
// Pseudo-code tính total
const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
const totalAfterDiscount = subtotal - order.discountAmount;

// Calculate VAT
let vatAmount = 0;
const vatRate = await getSetting('vatRate', 0.10); // Default 10%

if (vatRate > 0) {
  // Only apply VAT to non-exempt items
  const taxableAmount = orderItems
    .filter(item => !item.product.isVatExempt)
    .reduce((sum, item) => sum + item.lineTotal, 0);
  
  vatAmount = taxableAmount * vatRate;
}

const total = totalAfterDiscount + vatAmount + order.shippingFee;
```

**Implementation:**

- [x]  ✅ Thêm field `isVatExempt` vào Product model (boolean, default: false)
- [x]  ✅ Thêm setting `vatRate` vào OrganizationSettings (decimal, default: 0.10)
- [x]  ✅ UI hiển thị VAT riêng trên order summary:
    
    ```
    Subtotal:        500,000đ
    Discount:        -50,000đ
    VAT (10%):       +45,000đ
    Shipping:        +30,000đ
    ---
    Total:           525,000đ
    ```
    

**Lý do:**

- Ưu: Linh hoạt nhất - Org nào muốn VAT thì bật, không muốn thì tắt (set 0%)
- Nhược: Phức tạp hơn chút, nhưng đáng để có flexibility

---

## 5️⃣ Shipping & Logistics Rules

### 5.1 Shipping Fee Calculation

**Boss Decision:** ✅ **Option C - Kết hợp API và bảng giá**

**Chiến lược:**

- **Priority 1:** Gọi API GHN/GHTK để lấy fee thực tế (tự động)
    - Ưu: Chính xác, real-time, tự động cập nhật
    - Nhược: Phụ thuộc API, có thể bị lỗi/timeout
- **Priority 2 (Fallback):** Dùng bảng giá cố định trong database
    - Ưu: Luôn available, không bị lỗi
    - Nhược: Cần update manual, có thể không chính xác

**Implementation:**

```jsx
// Pseudo-code
async calculateShippingFee(order) {
  try {
    // Try API first
    return await GHN_API.calculateFee(order);
  } catch (error) {
    // Fallback to database rates
    return await DB.getShippingRate(order.province);
  }
}
```

**Factors cần xem xét:**

- [ ]  TODO: Tính theo weight? (formula?)
- [ ]  TODO: Tính theo distance? (tích hợp API tính khoảng cách?)
- [x]  ✅ Tính theo địa chỉ: API GHN/GHTK tự xử lý
- [ ]  TODO: Free ship khi đơn hàng > X VNĐ?

### 5.2 COD Collection Rules

**Boss Decision:** ✅ **Option C - Tự động update + có thể manual revert**

**COD Amount tracking:**

```jsx
shippingOrder.codAmount = order.total
```

**Quy tắc:**

- [x]  ✅ **Tự động update payment khi DELIVERED:**
    - Khi `shippingOrder.status = DELIVERED`
    - Tự động set: `order.paidAmount = order.total` và `order.isPaid = true`
    - Ghi log: "Tự động cập nhật thanh toán từ COD - Shipping DELIVERED"
- [x]  ✅ **Admin có thể manual revert nếu sai:**
    - Nếu COD thất bại (khách không trả tiền) → Admin có thể revert
    - Button: "Đánh dấu chưa thanh toán" (set isPaid = false lại)
    - Ghi log: "Admin revert thanh toán COD - Lý do: [admin nhập]"

**Implementation:**

```jsx
// Pseudo-code webhook từ GHN/GHTK
async onShippingStatusChange(shippingOrder) {
  if (shippingOrder.status === 'DELIVERED' && 
      shippingOrder.order.paymentMethod === 'COD') {
    
    // Auto-update payment
    await Order.update(shippingOrder.orderId, {
      isPaid: true,
      paidAmount: shippingOrder.order.total,
      paidAt: new Date()
    });
    
    // Log audit
    await AuditLog.create({
      action: 'ORDER_PAYMENT_AUTO_UPDATE',
      entityType: 'Order',
      entityId: shippingOrder.orderId,
      note: 'Tự động cập nhật thanh toán từ COD - Shipping DELIVERED',
      userId: 'SYSTEM'
    });
  }
}

// Admin revert function
async revertCODPayment(orderId, reason, adminId) {
  await Order.update(orderId, {
    isPaid: false,
    paidAmount: 0,
    paidAt: null
  });
  
  await AuditLog.create({
    action: 'ORDER_PAYMENT_REVERT',
    entityType: 'Order',
    entityId: orderId,
    note: `Admin revert thanh toán COD - Lý do: ${reason}`,
    userId: adminId
  });
}
```

**Reconciliation:**

- [ ]  TODO: Reconciliation với shipping partner như thế nào?
- [ ]  TODO: Shipping partner debt = codAmount collected - shipping fees paid?

**Lý do:**

- Ưu: Cân bằng automation (giảm công việc manual) + control (có thể sửa nếu sai)
- Nhược: Cần có audit log rõ ràng để track

### 5.3 Failed/Returned Delivery

**Boss Decision (Câu 23):** ✅ **Ship fail → PENDING + Cần xác nhận hoàn hàng**

**Workflow khi shipping FAILED:**

```jsx
PROCESSING → [Shipping FAILED] → PENDING (status: "Đang hoàn hàng")
                                      ↓
                              [Admin confirm "Hoàn hàng"]
                                      ↓
                          ✅ Hoàn stock + Rollback customer stats
```

**Quy tắc:**

- [x]  ✅ **Order status:** Tự động chuyển về PENDING khi shipping status = FAILED
- [x]  ✅ **Đánh dấu "Đang hoàn hàng":** Order có flag `isReturning = true` hoặc `returnStatus = "PENDING_RETURN"`
- [x]  ✅ **Shipping order cũ:** Giữ lại (archive) + có thể tạo shipping order mới
- [x]  ❌ **Stock CHƯA hoàn ngay lập tức** - Chờ Admin confirm
- [x]  ❌ **Customer stats CHƯA rollback ngay** - Chờ Admin confirm

**Khi Admin nhấn "Xác nhận hoàn hàng":**

- [x]  ✅ Hoàn stock về inventory của branch gốc (order.branchId)
- [x]  ✅ Rollback customer stats:
    - `customer.totalSpent -= order.total`
    - `customer.totalOrders -= 1`
- [x]  ✅ Tạo InventoryTransaction log (type: "SHIPPING_RETURNED")
- [x]  ✅ Set `returnStatus = "CONFIRMED"` hoặc `isReturning = false`
- [x]  ⚠️ Order vẫn ở PENDING - Admin có thể tạo shipping order mới để giao lại

**Implementation:**

```jsx
// Webhook từ GHN/GHTK khi shipping FAILED
async onShippingFailed(shippingOrder) {
  await Order.update(shippingOrder.orderId, {
    status: 'PENDING',
    returnStatus: 'PENDING_RETURN', // Flag đang chờ xác nhận hoàn hàng
    shippingFailedReason: shippingOrder.failedReason
  });
  
  // Gửi notification cho Admin: "Đơn hàng #XXX giao thất bại, cần xác nhận hoàn hàng"
}

// Admin confirm hoàn hàng
async confirmReturn(orderId) {
  const order = await Order.findById(orderId);
  
  // 1. Hoàn stock
  for (const item of order.items) {
    await Inventory.increment({
      where: {
        productId: item.productId,
        variantId: item.variantId,
        branchId: order.branchId
      },
      data: { stock: item.quantity }
    });
    
    // Log transaction
    await InventoryTransaction.create({
      type: 'SHIPPING_RETURNED',
      quantity: item.quantity,
      referenceId: orderId,
      branchId: order.branchId
    });
  }
  
  // 2. Rollback customer stats
  await Customer.update(order.customerId, {
    totalSpent: { decrement: order.total },
    totalOrders: { decrement: 1 }
  });
  
  // 3. Update order
  await Order.update(orderId, {
    returnStatus: 'CONFIRMED'
  });
}
```

**Lý do workflow này:**

- Ưu: Admin có control - Kiểm tra hàng thật sự về kho chưa, tình trạng ra sao
- Nhược: Thêm bước manual, nhưng đảm bảo accuracy

**Khi shipping status = RETURNED:**

- [x]  ✅ Áp dụng workflow tương tự như FAILED
- [x]  ✅ Admin phải confirm hoàn hàng trước khi hoàn stock/rollback stats
- [ ]  TODO: Customer có bị charge phí ship không? (Phụ thuộc policy org)

### 5.4 Shipping Partner Debt

**Công thức:**

```jsx
partner.debtBalance = totalCOD - totalFees - paidToPartner
```

- [ ]  TODO: Reconciliation định kỳ bao lâu? (tuần, tháng?)
- [ ]  TODO: Export báo cáo đối soát thế nào?
- [ ]  TODO: Payment to partner tracking ở đâu? (bảng Payment riêng?)

---

## 6️⃣ Customer Management Rules

### 6.1 Customer Segmentation

**Boss Decision:** ✅ **Phân loại linh hoạt - Người dùng tự định nghĩa**

**Chiến lược:**

- [x]  ✅ Admin có thể tạo segments tùy chỉnh trong Settings
- [x]  ✅ Mỗi segment có conditions: field, operator, value
    - VD: `totalSpent > 50000000` → VIP
    - VD: `totalOrders > 20` → Loyal
    - VD: `createdAt < 30 days` → New Customer
    - VD: `lastOrderAt > 90 days` → Inactive

**Default segments (có thể edit):**

- "Đang Giao Hàng" = có order với shipping status IN_TRANSIT
- "Đã mua hàng" = có order COMPLETED
- "VIP" = totalSpent > 50,000,000 (configurable)
- "Loyal" = totalOrders > 20 (configurable)
- "New Customer" = createdAt < 30 days (configurable)
- "Inactive" = lastOrderAt > 90 days (configurable)

**Implementation:**

```tsx
interface CustomerSegment {
  id: string;
  name: string;
  conditions: {
    field: 'totalSpent' | 'totalOrders' | 'createdAt' | 'lastOrderAt';
    operator: '>' | '<' | '>=' | '<=' | '==';
    value: number | string;
  }[];
  autoApply: boolean; // Tự động gán segment
}
```

### 6.2 Customer Stats Auto-Update

**Khi nào update customer.totalSpent và totalOrders?**

- [x]  ✅ **Boss Decision:** Khi order PENDING - tăng ngay
    - customer.totalSpent += order.total
    - customer.totalOrders += 1
- [x]  ✅ **Khi order = CANCELLED:** Có trừ lại
    - customer.totalSpent -= order.total
    - customer.totalOrders -= 1

### 6.3 Duplicate Customer Prevention

**Boss Decision:** ✅ **Option A - Phone number phải UNIQUE trong organization**

**Validation rules:**

- [x]  ✅ Phone number phải unique trong organization (không cho trùng)
- [x]  ❌ KHÔNG tự động merge customers khi phone trùng
- [x]  ⚠️ Nếu phone trùng → throw validation error: "Số điện thoại này đã tồn tại trong hệ thống"

**Implementation:**

```jsx
// Pseudo-code validation khi tạo/update customer
async validateCustomer(data, organizationId, customerId?) {
  const existing = await Customer.findOne({
    phone: data.phone,
    organizationId,
    id: { $ne: customerId } // Exclude current customer khi update
  });
  
  if (existing) {
    throw new ValidationError('Số điện thoại này đã tồn tại trong hệ thống');
  }
}
```

**Lý do:**

- Ưu: Tránh duplicate customer, dễ quản lý
- Nhược: Khách hàng có nhiều số thì cần tạo nhiều records (nhưng hiếm gặp)

**Note:** Email KHÔNG bắt buộc (optional field)

---

## 7️⃣ Multi-tenant Security Rules

### 7.1 Organization Isolation (CRITICAL)

**Quy tắc bắt buộc:**

✅ **MỌI query phải có `organizationId` filter**

```jsx
// ✅ ĐÚNG
const products = await prisma.product.findMany({
  where: { organizationId: user.organizationId }
});

// ❌ SAI - Cross-tenant data leak!
const products = await prisma.product.findMany();
```

### 7.2 Cross-Organization Operations

- [ ]  TODO: Có cho phép transfer giữa organizations không? (Không)
- [ ]  TODO: Có cho phép share products/categories không? (Không)
- [ ]  TODO: Admin có thể xem data của org khác không? (Không)

---

## 8️⃣ Audit & Logging Rules

### 8.1 Audit Trail Requirements

**Actions cần log:**

- [ ]  TODO: Tạo/sửa/xóa orders
- [ ]  TODO: Thay đổi order status
- [ ]  TODO: Apply discount
- [ ]  TODO: Inventory adjustments
- [ ]  TODO: Transfer operations

**Log format:**

- [ ]  TODO: Có cần bảng AuditLog riêng không?
- [ ]  TODO: Lưu old value và new value?
- [ ]  TODO: Lưu user thực hiện action?

### 8.2 Data Retention Policy

**Boss Decision (Câu 25):** ✅ **Option C - SOFT delete + AUTO-HARD sau 6 tháng**

**Quy tắc:**

- [x]  ✅ **Ngay lập tức:** Soft delete - Đánh dấu `deletedAt = timestamp`
- [x]  ✅ **Sau 6 tháng:** Cronjob tự động hard delete (xóa vĩnh viễn)
- [x]  ✅ **Trong 6 tháng:** Admin có thể khôi phục (restore) data
- [x]  ✅ **Sau 6 tháng:** Data bị xóa vĩnh viễn, không thể khôi phục

**Áp dụng cho:**

- Products, Customers, Orders, Categories, Variants, v.v.
- Tất cả entities quan trọng trong hệ thống

**Implementation:**

```jsx
// Soft delete
async softDelete(entityId, entityType) {
  await DB[entityType].update(entityId, {
    deletedAt: new Date(),
    deletedBy: currentUser.id
  });
  
  // UI không hiển thị nữa (query filter: where deletedAt is NULL)
}

// Restore (trong vòng 6 tháng)
async restore(entityId, entityType) {
  const entity = await DB[entityType].findById(entityId);
  
  // Check nếu chưa quá 6 tháng
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  if (entity.deletedAt < sixMonthsAgo) {
    throw new Error('Data đã bị xóa vĩnh viễn, không thể khôi phục');
  }
  
  await DB[entityType].update(entityId, {
    deletedAt: null,
    deletedBy: null
  });
}

// Cronjob chạy hàng ngày - Hard delete sau 6 tháng
async autoHardDelete() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  // Xóa vĩnh viễn tất cả records có deletedAt < 6 months ago
  await DB.query(`
    DELETE FROM products WHERE deletedAt < $1;
    DELETE FROM customers WHERE deletedAt < $1;
    DELETE FROM orders WHERE deletedAt < $1;
    -- ... other tables
  `, [sixMonthsAgo]);
  
  // Log việc xóa để audit
  await AuditLog.create({
    action: 'AUTO_HARD_DELETE',
    deletedCount: result.rowCount,
    timestamp: new Date()
  });
}
```

**Lý do:**

- Ưu: Cân bằng giữa an toàn (có thể khôi phục 6 tháng) và hiệu suất (database không quá lớn)
- Nhược: Cần cronjob và phức tạp hơn soft/hard delete thuần túy

**GDPR Compliance:**

- [ ]  TODO: Customer yêu cầu "Right to be Forgotten" → Hard delete ngay lập tức (bỏ qua 6 tháng)?
- [ ]  TODO: Export data của customer trước khi delete?

---

## 9️⃣ Notification Rules

### 9.1 Order Notifications

**Gửi cho customer:**

- [ ]  TODO: Order created (email/SMS?)
- [ ]  TODO: Order status changed
- [ ]  TODO: Shipping in transit
- [ ]  TODO: Delivery completed

**Gửi cho staff:**

- [ ]  TODO: New order created → notify cashier
- [ ]  TODO: Low stock warning → notify manager
- [ ]  TODO: Failed delivery → notify admin

### 9.2 Notification Channels

- [ ]  TODO: Email (integration với SendGrid, AWS SES?)
- [ ]  TODO: SMS (integration với Twilio, SMSVN?)
- [ ]  TODO: In-app notifications (WebSocket?)
- [ ]  TODO: Push notifications (mobile app future)

---

## 🔟 Lead Management — Simple Priority System (FINAL)

**Mục tiêu:** Sales team luôn biết lead nào nóng nhất, không bỏ sót lead lâu ngày, vẫn tôn trọng multi-tenant guardrails (RequestContext + Prisma middleware inject `organizationId` tự động).

- Enum: `HIGH | MEDIUM | LOW | INACTIVE`
- Seed: Lead mới (manual import, webhook, API) luôn khởi tạo với `priorityAuto = HIGH`
- Decay theo inactivity:
  - **T1 = 7 ngày:** `HIGH → MEDIUM`
  - **T2 = 30 ngày:** `MEDIUM → LOW`
  - **T3 = 60 ngày:** `LOW → INACTIVE`
- Reset logic: bất kỳ activity quan trọng (call, meeting, order PENDING/COMPLETED) cập nhật `lastActivityAt` → cron nâng `priorityAuto` theo bảng:
  - Activity trong 7 ngày: `HIGH`
  - Hoạt động trong 30 ngày: `MEDIUM`
  - Chỉ có tương tác >30 ngày: `LOW`
- Manual override: nếu cấu hình bật `allow_manual_override`, giá trị hiệu lực = `priorityManual ?? priorityAuto`
- Auto assignment: dựa vào `assignmentStrategy` + config, mỗi lần priority thay đổi sang HIGH có thể auto assign cho `senior_sales` (nếu rule match)
- API surfaces: `GET /leads/:id`, `POST /leads/:id/priority:override`, `POST /leads/:id/assign:auto`
- Guardrails: mọi query phải dùng `organizationId` từ `RequestContext` (cron jobs gọi service có `withOrganizationContext`)

### Definition of Done (DoD)

- [x] Cron `leadPriorityDecay` chạy 1 lần/ngày, đọc config `PRIORITY_CONFIG`.
- [x] Decay/resets không vượt ngoài organization đang xử lý (multi-tenant safe).
- [x] Manual override ghi `priorityManual`, `priorityUpdatedAt`; audit log traceId.
- [x] Activity events (call/meeting/order) publish `LeadPriorityResetEvent`.
- [x] API responses tuân thủ `{ code, message, details?, traceId }` khi lỗi.

### Ví dụ I/O

```http
GET /leads/ld_123
→ 200 OK
{
  "priorityAuto": "MEDIUM",
  "priorityManual": "HIGH",
  "priorityEffective": "HIGH",
  "priorityUpdatedAt": "2025-02-01T08:10:00.000Z",
  "lastActivityAt": "2025-01-28T10:00:00.000Z"
}
```

```http
POST /leads/ld_123/priority:override
Content-Type: application/json
{ "priority": "HIGH" }

→ 200 OK
{
  "priorityEffective": "HIGH",
  "priorityAuto": "MEDIUM",
  "traceId": "lead-pri-017"
}
```

---

## 1️⃣1 Commission & Revenue Tracking

**Mục tiêu:** Chuẩn hóa tính hoa hồng + doanh thu, hỗ trợ split 70/20/10, điều chỉnh âm khi refund, và payout theo kỳ.

- Trạng thái tuần tự: `PENDING → APPROVED → PAID`
- Refund/cancel sau khi đã tạo commission → tạo bản ghi `isAdjustment = true`, amount âm, link `adjustsCommissionId`
- Rules:
  - Type: `FLAT | TIERED | BONUS`
  - `config` JSON lưu bảng tỷ lệ (ví dụ tiers, bonus triggers, split percentage)
  - Default split: `[{ role: "owner", pct: 0.7 }, { role: "closer", pct: 0.2 }, { role: "support", pct: 0.1 }]` (round VND, phần dư dồn owner)
- Trigger:
  - `order.completed` → tạo commission PENDING (POS = immediate, COD = chờ webhook DELIVERED)
  - `order.refunded` / `order.cancelled post-paid` → tạo adjustment âm
- Payout:
  - Batch theo `periodMonth` + config `payoutDayOfMonth`
  - Cron `/commissions/payouts:run` → gom tất cả commission APPROVED của kỳ → mark `PAID`, lưu `traceId`
- Edge cases:
  - POS completes ngay vẫn ghi nhận commission
  - COD chờ webhook `DELIVERED`; khi fail → không tạo commission
  - Manual override cho adjustments vẫn phải giữ nguyên traceId chain
- Error handling: Mọi API trả lỗi theo `{ code, message, details?, traceId }`

### Definition of Done (DoD)

- [x] CommissionRule CRUD bảo vệ `@@unique([code, organizationId])`
- [x] Commission entries luôn có `organizationId`, `orderId`, `periodMonth (YYYY-MM)`
- [x] Split JSON đã chuẩn hóa + rounding logic testable
- [x] Refund adjustment tạo amount âm và link `adjustsCommissionId`
- [x] Payout cron tạo audit log + emit event `CommissionPayoutCompleted`

### Ví dụ I/O

```http
POST /commissions/payouts:run
Content-Type: application/json
{ "period": "2025-12", "payOn": "2026-01-05" }

→ 200 OK
{
  "period": "2025-12",
  "totalAmount": "15500000.00",
  "count": 42,
  "status": "PAID",
  "traceId": "payout-202512"
}
```

```http
POST /commissions/refunds
Content-Type: application/json
{ "commissionId": "cms_001", "refundPercent": 30 }

→ 201 Created
{
  "adjustmentId": "cms_adj_09",
  "amount": "-450000.00",
  "isAdjustment": true,
  "adjustsCommissionId": "cms_001",
  "traceId": "refund-cms-001"
}
```
