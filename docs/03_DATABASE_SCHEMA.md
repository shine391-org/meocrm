# MeoCRM Database Schema (Prisma)

> **Designed from:** KiotViet data analysis + POS/CRM best practices
> 

> **Database:** PostgreSQL 17 (GA September 2025)
> 

> **ORM:** Prisma 6.19.0 (latest stable, Rust-free)
> 

> **Updated:** November 10, 2025
> 

---

## 📊 Schema Overview

**43 Tables** + **27 Enums** = **70 Total Database Schemas**

---

## 🧭 Conventions & Guardrails

- **PII markers:** icon 🔒 trong bảng dữ liệu (ví dụ: `Customer.phone`, `Customer.email`, `User.email`). Bất kỳ query nào truy cập PII phải đi qua RequestContext + audit log.
- **Multi-tenant uniqueness:** mọi bảng có `code` phải khai báo `@@unique([code, organizationId])`. Không sử dụng `@unique` đơn lẻ cho `code`.
- **Soft delete:** cột `deletedAt` (nullable). Cron `purge-soft-delete` chạy hằng ngày và hard-delete record >6 tháng. Admin có thể restore trước thời hạn.
- **Error contract:** stored procedures/triggers trả `{code,message,details?,traceId}` thống nhất với API.
- **Prisma middleware:** luôn tự inject `organizationId` + `deletedAt: null`. Raw SQL phải tự thêm filter tương ứng.
---

## 🏢 Multi-Tenancy Core

### Organization

```prisma
model Organization {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique // lano-hn, lano-hcm
  
  // Relations
  users     User[]
  branches  Branch[]
  products  Product[]
  customers Customer[]
  orders    Order[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@map("organizations")
}
```

### Branch (Chi nhánh)

```prisma
model Branch {
  id             String  @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  name    String // "Lano - HN", "Lano - HCM"
  address String
  phone   String?
  
  // Relations
  inventory      Inventory[]
  transfersFrom  Transfer[] @relation("TransferFrom")
  transfersTo    Transfer[] @relation("TransferTo")
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([organizationId])
  @@map("branches")
}
```

---

## 👤 Users & Auth

### User

```prisma
model User {
  id             String  @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  email    String  @unique
  password String  // bcrypt hashed
  name     String
  role     UserRole @default(STAFF)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([organizationId])
  @@map("users")
}

enum UserRole {
  ADMIN
  MANAGER
  STAFF
  CASHIER
}
```

---

## 📦 Products Module

### Category (Nhóm hàng - 3 levels)

```prisma
model Category {
  id             String  @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  name      String  // "VÍ DA", "Ví thiết kế", "Ví ngắn"
  parentId  String? // 3-level hierarchy
  parent    Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children  Category[] @relation("CategoryTree")
  
  products Product[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([organizationId])
  @@index([parentId])
  @@map("categories")
}
```

### Product (Hàng hóa)

```prisma
model Product {
  id             String  @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  sku         String  @unique // "TDH016", "VDNT09"
  name        String  // Full product name
  categoryId  String?
  category    Category? @relation(fields: [categoryId], references: [id])
  
  // Pricing (VNĐ)
  costPrice   Decimal @db.Decimal(12, 2) // Giá vốn
  sellPrice   Decimal @db.Decimal(12, 2) // Giá bán
  
  // Stock
  stock       Int     @default(0)
  minStock    Int     @default(0)
  maxStock    Int     @default(999999)
  
  // Media
  images      String[] // CDN URLs
  weight      Int?     // grams
  
  // Flags
  isActive    Boolean @default(true)
  
  // Relations
  variants    ProductVariant[]
  inventory   Inventory[]
  orderItems  OrderItem[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?
  
  @@index([organizationId])
  @@index([categoryId])
  @@index([sku])
  @@map("products")
}
```

### ProductVariant

```prisma
model ProductVariant {
  id        String  @id @default(uuid())
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  sku             String  @unique // "VDNT09-D", "VDNT09-xanhla"
  name            String  // "D" (đen), "NS" (nâu sáng), "xanhla"
  additionalPrice Decimal @default(0) @db.Decimal(12, 2)
  stock           Int     @default(0)
  images          String[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([productId])
  @@map("product_variants")
}
```

---

## 👥 CRM Module

### Customer (Khách hàng)

```prisma
model Customer {
  id             String  @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  code  String  @unique // "KH024917"
  name  String
  phone String
  email String?
  
  // Address (Vietnam 3-level)
  address  String?
  province String? // "Hồ Chí Minh", "Hà Nội"
  district String? // "Quận 7", "Quận Đống Đa"
  ward     String? // "Phường Tân Phong"
  
  // CRM data
  segment       String? // "Đang Giao Hàng", "Đã mua hàng"
  totalSpent    Decimal @default(0) @db.Decimal(12, 2)
  totalOrders   Int     @default(0)
  debt          Decimal @default(0) @db.Decimal(12, 2) // Nợ cần thu
  lastOrderAt   DateTime?
  
  // Relations
  orders Order[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([organizationId])
  @@index([code])
  @@index([phone])
  @@map("customers")
}
```

### Lead

```prisma
model Lead {
  id                 String       @id @default(cuid())
  organizationId     String
  organization       Organization @relation(fields: [organizationId], references: [id])

  code               String?
  priorityAuto       LeadPriority @default(HIGH)
  priorityManual     LeadPriority?
  priorityUpdatedAt  DateTime     @default(now())
  lastActivityAt     DateTime     @default(now())

  assignedToId       String?
  assignedTo         User?        @relation("LeadAssignedUser", fields: [assignedToId], references: [id])
  assignmentStrategy String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([organizationId, code])
  @@index([organizationId])
  @@index([organizationId, assignedToId])
  @@index([organizationId, priorityAuto])
  @@map("leads")
}

enum LeadPriority {
  HIGH
  MEDIUM
  LOW
  INACTIVE
}
```

- Tham số decay/assignment lấy từ `settings.leadPriority`.
- Truy cập PII: `Lead` mặc định chứa phone/email ẩn (todo) nên tuân thủ quy định PII tương tự Customer.

---

## 🛒 Orders & Sales

### Order (Hóa đơn)

```prisma
model Order {
  id             String  @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  code       String   @unique // "HD031537"
  customerId String?
  customer   Customer? @relation(fields: [customerId], references: [id])
  
  // Totals (VNĐ)
  subtotal   Decimal @db.Decimal(12, 2) // Tổng tiền hàng
  discount   Decimal @default(0) @db.Decimal(12, 2)
  total      Decimal @db.Decimal(12, 2) // Khách cần trả
  
  // Payment
  paymentMethod PaymentMethod
  isPaid        Boolean @default(false)
  paidAmount    Decimal @default(0) @db.Decimal(12, 2)
  
  // Status
  status OrderStatus @default(PENDING)
  
  // Relations
  items          OrderItem[]
  shippingOrders ShippingOrder[]
  
  createdBy String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([organizationId])
  @@index([customerId])
  @@index([code])
  @@map("orders")
}

enum OrderStatus {
  PENDING       // Đang xử lý
  PROCESSING
  COMPLETED     // Hoàn thành
  CANCELLED
}

enum PaymentMethod {
  CASH          // Tiền mặt
  CARD          // Thẻ
  E_WALLET      // Ví
  BANK_TRANSFER // Chuyển khoản
  COD           // Thu hộ
}
```

### OrderItem

```prisma
model OrderItem {
  id      String @id @default(uuid())
  orderId String
  order   Order  @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  productId String
  product   Product @relation(fields: [productId], references: [id])
  
  quantity    Int
  price       Decimal @db.Decimal(12, 2) // Đơn giá
  discount    Decimal @default(0) @db.Decimal(12, 2)
  lineTotal   Decimal @db.Decimal(12, 2) // Thành tiền
  
  @@index([orderId])
  @@index([productId])
  @@map("order_items")
}
```

---

## 🚚 Shipping Module

### ShippingPartner (Đối tác giao hàng)

```prisma
model ShippingPartner {
  id             String  @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  code  String @unique // "DT000008", "aha"
  name  String // "GHTK", "Ahamove", "GHN"
  email String?
  phone String?
  
  // Stats
  totalOrders  Int     @default(0)
  totalFees    Decimal @default(0) @db.Decimal(12, 2)
  totalCOD     Decimal @default(0) @db.Decimal(12, 2)
  debtBalance  Decimal @default(0) @db.Decimal(12, 2) // Nợ cần trả
  
  shippingOrders ShippingOrder[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([organizationId])
  @@map("shipping_partners")
}
```

### ShippingOrder (Vận đơn)

```prisma
model ShippingOrder {
  id      String @id @default(uuid())
  orderId String
  order   Order  @relation(fields: [orderId], references: [id])
  
  partnerId String
  partner   ShippingPartner @relation(fields: [partnerId], references: [id])
  
  trackingCode String @unique // "GY6YGLDU"
  
  // Recipient
  recipientName    String
  recipientPhone   String
  recipientAddress String
  recipientWard    String?
  recipientDistrict String?
  recipientProvince String?
  
  // Fees & COD
  shippingFee Decimal @db.Decimal(12, 2)
  codAmount   Decimal @default(0) @db.Decimal(12, 2) // Còn cần thu
  
  // Status
  status ShippingStatus @default(PENDING)
  
  // Package info
  weight Int? // grams
  notes  String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([orderId])
  @@index([partnerId])
  @@index([trackingCode])
  @@map("shipping_orders")
}

enum ShippingStatus {
  PENDING           // Chờ lấy hàng
  PICKING_UP        // Đang lấy hàng  
  IN_TRANSIT        // Đang giao hàng
  DELIVERED         // Giao thành công
  FAILED            // Giao thất bại
  RETURNED          // Hoàn hàng
}
```

---

## 📊 Inventory Module

### Inventory (Tồn kho)

```prisma
model Inventory {
  id        String @id @default(uuid())
  productId String
  product   Product @relation(fields: [productId], references: [id])
  
  branchId String
  branch   Branch @relation(fields: [branchId], references: [id])
  
  quantity Int @default(0)
  
  @@unique([productId, branchId])
  @@index([branchId])
  @@map("inventory")
}
```

### Transfer (Chuyển hàng)

```prisma
model Transfer {
  id         String @id @default(uuid())
  code       String @unique // "TRF001093"
  
  fromBranchId String
  fromBranch   Branch @relation("TransferFrom", fields: [fromBranchId], references: [id])
  
  toBranchId String
  toBranch   Branch @relation("TransferTo", fields: [toBranchId], references: [id])
  
  value  Decimal @db.Decimal(12, 2) // Giá trị chuyển
  status TransferStatus @default(PENDING)
  
  transferredAt DateTime?
  receivedAt    DateTime?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([fromBranchId])
  @@index([toBranchId])
  @@map("transfers")
}

enum TransferStatus {
  PENDING   // Phiếu tạm
  IN_TRANSIT // Đang chuyển
  RECEIVED  // Đã nhận
}
```

### StockAdjustment (Kiểm kê/Điều chỉnh tồn)

```prisma
model StockAdjustment {
  id             String  @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  code           String  // "ADJ001234"
  branchId       String
  branch         Branch  @relation(fields: [branchId], references: [id])
  
  type           AdjustmentType
  reason         String  // "Kiểm kê", "Hàng hỏng", "Mất mát"
  notes          String?
  
  // Relations
  items          StockAdjustmentItem[]
  
  status         AdjustmentStatus @default(DRAFT)
  adjustedBy     String
  adjustedAt     DateTime?
  
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  @@unique([code, organizationId])
  @@index([organizationId])
  @@index([branchId])
  @@map("stock_adjustments")
}

enum AdjustmentType {
  INCREASE   // Tăng (tìm thấy hàng thừa)
  DECREASE   // Giảm (hàng hỏng/mất)
  RECOUNT    // Kiểm kê lại
}

enum AdjustmentStatus {
  DRAFT      // Phiếu tạm
  CONFIRMED  // Đã xác nhận
  CANCELLED  // Đã hủy
}
```

### StockAdjustmentItem

```prisma
model StockAdjustmentItem {
  id            String  @id @default(cuid())
  adjustmentId  String
  adjustment    StockAdjustment @relation(fields: [adjustmentId], references: [id], onDelete: Cascade)
  
  productId     String
  product       Product @relation(fields: [productId], references: [id])
  
  oldQuantity   Int     // Tồn cũ
  newQuantity   Int     // Tồn mới
  difference    Int     // Chênh lệch (+/-)
  costImpact    Decimal? @db.Decimal(12, 2) // Ảnh hưởng giá vốn
  
  @@index([adjustmentId])
  @@index([productId])
  @@map("stock_adjustment_items")
}
```

---

## 🏭 Supplier & Purchase Module

### Supplier (Nhà cung cấp)

```prisma
model Supplier {
  id             String  @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  code           String  // "NCC001"
  name           String  // "Xưởng da Lano"
  contactPerson  String?
  phone          String
  email          String?
  address        String?
  taxCode        String? // Mã số thuế
  
  // Công nợ tracking
  totalPurchases Decimal @default(0) @db.Decimal(12, 2)
  totalPaid      Decimal @default(0) @db.Decimal(12, 2)
  debt           Decimal @default(0) @db.Decimal(12, 2) // Còn nợ phải trả
  
  // Relations
  purchaseOrders PurchaseOrder[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?
  
  @@unique([code, organizationId])
  @@index([organizationId])
  @@index([organizationId, code])
  @@map("suppliers")
}
```

### PurchaseOrder (Đơn nhập hàng)

```prisma
model PurchaseOrder {
  id             String  @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  code           String  // "PO001093"
  supplierId     String
  supplier       Supplier @relation(fields: [supplierId], references: [id])
  
  branchId       String  // Nhập về chi nhánh nào
  branch         Branch  @relation(fields: [branchId], references: [id])
  
  // Totals (VNĐ)
  subtotal       Decimal @db.Decimal(12, 2)
  discount       Decimal @default(0) @db.Decimal(12, 2)
  tax            Decimal @default(0) @db.Decimal(12, 2)
  total          Decimal @db.Decimal(12, 2)
  
  // Payment
  paidAmount     Decimal @default(0) @db.Decimal(12, 2)
  paymentStatus  PaymentStatus
  
  // Status & Timeline
  status         PurchaseStatus @default(DRAFT)
  receivedAt     DateTime?
  
  notes          String?
  createdBy      String?
  
  // Relations
  items          PurchaseOrderItem[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@unique([code, organizationId])
  @@index([organizationId])
  @@index([supplierId])
  @@index([branchId])
  @@map("purchase_orders")
}

enum PurchaseStatus {
  DRAFT      // Phiếu tạm
  CONFIRMED  // Đã xác nhận
  RECEIVED   // Đã nhận hàng
  CANCELLED  // Đã hủy
}

enum PaymentStatus {
  UNPAID    // Chưa thanh toán
  PARTIAL   // Thanh toán một phần
  PAID      // Đã thanh toán đủ
}
```

### PurchaseOrderItem

```prisma
model PurchaseOrderItem {
  id              String  @id @default(cuid())
  purchaseOrderId String
  purchaseOrder   PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)
  
  productId       String
  product         Product @relation(fields: [productId], references: [id])
  
  quantity        Int
  unitCost        Decimal @db.Decimal(12, 2) // Giá nhập
  lineTotal       Decimal @db.Decimal(12, 2) // Thành tiền
  
  @@index([purchaseOrderId])
  @@index([productId])
  @@map("purchase_order_items")
}
```

---

## 💰 POS & Payment Module

### CashRegister (Ca làm việc)

```prisma
model CashRegister {
  id        String  @id @default(cuid())
  branchId  String
  branch    Branch  @relation(fields: [branchId], references: [id])
  
  userId    String  // Nhân viên thu ngân
  user      User    @relation(fields: [userId], references: [id])
  
  // Timeline
  openedAt  DateTime @default(now())
  closedAt  DateTime?
  
  // Tiền mặt
  openingCash   Decimal @db.Decimal(12, 2) // Tiền đầu ca
  closingCash   Decimal? @db.Decimal(12, 2) // Tiền cuối ca
  expectedCash  Decimal? @db.Decimal(12, 2) // Tiền lý thuyết
  difference    Decimal? @db.Decimal(12, 2) // Chênh lệch (thừa/thiếu)
  
  status    CashRegisterStatus @default(OPEN)
  notes     String?
  
  // Relations
  payments  Payment[]
  
  @@index([branchId])
  @@index([userId])
  @@index([openedAt])
  @@map("cash_registers")
}

enum CashRegisterStatus {
  OPEN    // Ca đang mở
  CLOSED  // Ca đã đóng
}
```

### Payment (Thanh toán chi tiết)

```prisma
model Payment {
  id              String  @id @default(cuid())
  orderId         String
  order           Order   @relation(fields: [orderId], references: [id])
  
  cashRegisterId  String?
  cashRegister    CashRegister? @relation(fields: [cashRegisterId], references: [id])
  
  amount          Decimal @db.Decimal(12, 2)
  method          PaymentMethod
  reference       String? // Mã giao dịch ngân hàng/e-wallet
  
  paidAt          DateTime @default(now())
  createdBy       String?
  
  @@index([orderId])
  @@index([cashRegisterId])
  @@map("payments")
}
```

---

## 🎁 Promotion Module

### Promotion (Khuyến mại)

```prisma
model Promotion {
  id             String  @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  name           String  // "Flash Sale 50%"
  code           String  // "FLASH50"
  description    String?
  
  type           PromotionType
  
  // Discount rules
  discountValue  Decimal @db.Decimal(12, 2) // Giá trị giảm (% hoặc VNĐ)
  minOrderValue  Decimal? @db.Decimal(12, 2) // Đơn tối thiểu
  maxDiscount    Decimal? @db.Decimal(12, 2) // Giảm tối đa (cho type PERCENTAGE)
  
  // Áp dụng cho
  applicableProducts   String[] // Product IDs
  applicableCategories String[] // Category IDs
  
  // Timeline
  startDate      DateTime
  endDate        DateTime
  
  // Usage limits
  maxUsage       Int?    // Số lần sử dụng tối đa
  currentUsage   Int     @default(0)
  
  isActive       Boolean @default(true)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@unique([code, organizationId])
  @@index([organizationId])
  @@index([startDate, endDate])
  @@map("promotions")
}

enum PromotionType {
  PERCENTAGE    // Giảm %
  FIXED_AMOUNT  // Giảm số tiền cố định
  BUY_X_GET_Y   // Mua X tặng Y
}
```

---

## 📈 Reports & Analytics

### DailySalesReport (Báo cáo bán hàng ngày)

```prisma
model DailySalesReport {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  branchId       String?
  branch         Branch? @relation(fields: [branchId], references: [id])
  
  date           DateTime // Ngày báo cáo
  
  // Sales metrics
  totalOrders    Int
  totalRevenue   Decimal @db.Decimal(12, 2)
  totalCost      Decimal @db.Decimal(12, 2) // Tổng giá vốn
  totalProfit    Decimal @db.Decimal(12, 2) // Lợi nhuận
  
  // Payment breakdown
  cashSales      Decimal @default(0) @db.Decimal(12, 2)
  cardSales      Decimal @default(0) @db.Decimal(12, 2)
  ewalletSales   Decimal @default(0) @db.Decimal(12, 2)
  bankSales      Decimal @default(0) @db.Decimal(12, 2)
  
  // Customer metrics
  newCustomers   Int     @default(0)
  returningCustomers Int @default(0)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@unique([organizationId, branchId, date])
  @@index([organizationId, date])
  @@map("daily_sales_reports")
}
```

---

## 👥 Customer Segmentation

### CustomerGroup (Nhóm khách hàng)

```prisma
model CustomerGroup {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  name           String   // "VIP", "Bán sỉ", "Bán lẻ"
  description    String?
  discountRate   Decimal  @default(0) @db.Decimal(5, 2) // % giảm giá
  
  // Relations
  customers      Customer[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([organizationId])
  @@map("customer_groups")
}
```

---

## 🔒 Security & Audit

### AuditLog (Lịch sử thao tác)

```prisma
model AuditLog {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  userId         String
  user           User     @relation(fields: [userId], references: [id])
  
  entity         String   // "Product", "Order", "Customer"
  entityId       String
  action         AuditAction
  
  oldValues      Json?    // Giá trị cũ (trước update)
  newValues      Json?    // Giá trị mới (sau update/create)
  
  ipAddress      String?
  userAgent      String?
  
  createdAt      DateTime @default(now())
  
  @@index([organizationId, entity, entityId])
  @@index([userId])
  @@index([createdAt])
  @@map("audit_logs")
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  RESTORE
}
```

---

## 🔄 Returns & Refunds

### OrderReturn (Trả hàng/Hoàn tiền)

```prisma
model OrderReturn {
  id             String  @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  orderId        String
  order          Order   @relation(fields: [orderId], references: [id])
  
  code           String  // "RT001234"
  
  // Return details
  reason         String  // "Lỗi sản phẩm", "Khách đổi ý"
  notes          String?
  
  // Financial
  refundAmount   Decimal @db.Decimal(12, 2)
  refundMethod   PaymentMethod
  
  status         ReturnStatus @default(PENDING)
  
  // Relations
  items          OrderReturnItem[]
  
  approvedBy     String?
  approvedAt     DateTime?
  createdBy      String?
  
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  @@unique([code, organizationId])
  @@index([organizationId])
  @@index([orderId])
  @@map("order_returns")
}

enum ReturnStatus {
  PENDING    // Chờ duyệt
  APPROVED   // Đã duyệt
  REJECTED   // Từ chối
  COMPLETED  // Đã hoàn tiền
}
```

### OrderReturnItem

```prisma
model OrderReturnItem {
  id            String  @id @default(cuid())
  returnId      String
  orderReturn   OrderReturn @relation(fields: [returnId], references: [id], onDelete: Cascade)
  
  orderItemId   String  // Reference to original order item
  productId     String
  product       Product @relation(fields: [productId], references: [id])
  
  quantity      Int     // Số lượng trả
  refundPrice   Decimal @db.Decimal(12, 2) // Giá hoàn
  lineTotal     Decimal @db.Decimal(12, 2)
  
  @@index([returnId])
  @@index([productId])
  @@map("order_return_items")
}
```

---

## 💰 Finance & Expenses

### Expense (Thu chi/Chi phí)

```prisma
model Expense {
  id             String  @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  code           String  // "EXP001234", "INC001234"
  branchId       String?
  branch         Branch? @relation(fields: [branchId], references: [id])
  
  type           ExpenseType
  category       String  // "Tiền điện", "Tiền nước", "Lương nhân viên"
  amount         Decimal @db.Decimal(12, 2)
  description    String?
  
  // Payment
  paymentMethod  PaymentMethod
  reference      String? // Số hóa đơn, mã giao dịch
  
  // Tracking
  paidTo         String? // Người nhận (nếu là chi)
  receivedFrom   String? // Người trả (nếu là thu)
  transactionDate DateTime // Ngày phát sinh
  
  createdBy      String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  @@unique([code, organizationId])
  @@index([organizationId])
  @@index([branchId])
  @@index([type])
  @@index([transactionDate])
  @@map("expenses")
}

enum ExpenseType {
  EXPENSE  // Chi phí
  INCOME   // Thu nhập
}
```

---

## 🎁 Loyalty & Rewards

### LoyaltyProgram (Chương trình tích điểm)

```prisma
model LoyaltyProgram {
  id             String  @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  name           String  // "Khách hàng thân thiết"
  description    String?
  
  // Rules
  pointsPerVND   Decimal @db.Decimal(10, 5) // Tỷ lệ tích điểm (VD: 1 điểm/1000đ = 0.001)
  minOrderValue  Decimal? @db.Decimal(12, 2) // Đơn tối thiểu để tích điểm
  
  // Redemption
  redemptionRate Decimal @db.Decimal(10, 5) // Quy đổi điểm ra tiền (VD: 100 điểm = 10000đ)
  minRedemption  Int     @default(100) // Số điểm tối thiểu để đổi
  
  isActive       Boolean @default(true)
  
  // Relations
  transactions   LoyaltyTransaction[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([organizationId])
  @@map("loyalty_programs")
}
```

### LoyaltyTransaction (Giao dịch tích điểm)

```prisma
model LoyaltyTransaction {
  id             String  @id @default(cuid())
  programId      String
  program        LoyaltyProgram @relation(fields: [programId], references: [id])
  
  customerId     String
  customer       Customer @relation(fields: [customerId], references: [id])
  
  orderId        String? // NULL nếu là redemption/adjustment
  order          Order?  @relation(fields: [orderId], references: [id])
  
  type           LoyaltyTransactionType
  pointsEarned   Int     @default(0) // Điểm tích được
  pointsUsed     Int     @default(0) // Điểm tiêu
  pointsBalance  Int     // Số dư điểm sau giao dịch
  
  description    String? // Mô tả (VD: "Đổi điểm lấy voucher 50k")
  
  createdAt      DateTime @default(now())
  
  @@index([programId])
  @@index([customerId])
  @@index([orderId])
  @@map("loyalty_transactions")
}

enum LoyaltyTransactionType {
  EARN       // Tích điểm
  REDEEM     // Đổi điểm
  EXPIRE     // Hết hạn
  ADJUST     // Điều chỉnh (admin)
}
```

---

## 💵 Price Management

### PriceBook (Bảng giá)

```prisma
model PriceBook {
  id             String  @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  name           String  // "Giá bán sỉ", "Giá VIP"
  description    String?
  
  // Áp dụng cho
  customerGroupId String?
  customerGroup   CustomerGroup? @relation(fields: [customerGroupId], references: [id])
  
  priority       Int     @default(1) // Độ ưu tiên (cao hơn = ưu tiên hơn)
  
  isActive       Boolean @default(true)
  
  // Date range
  startDate      DateTime?
  endDate        DateTime?
  
  // Relations
  priceItems     PriceBookItem[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([organizationId])
  @@index([customerGroupId])
  @@map("price_books")
}
```

### PriceBookItem (Chi tiết giá)

```prisma
model PriceBookItem {
  id          String  @id @default(cuid())
  priceBookId String
  priceBook   PriceBook @relation(fields: [priceBookId], references: [id], onDelete: Cascade)
  
  productId   String
  product     Product @relation(fields: [productId], references: [id])
  
  price       Decimal @db.Decimal(12, 2) // Giá đặc biệt
  
  @@unique([priceBookId, productId]) // Mỗi sản phẩm chỉ 1 giá/bảng giá
  @@index([priceBookId])
  @@index([productId])
  @@map("price_book_items")
}
```

---

## 💰 Employee Commission

### CommissionRule (Config-driven)

```prisma
model CommissionRule {
  id             String  @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  code    String
  name    String
  type    CommissionType
  config  Json              // tiers, bonus triggers, split profile
  isActive Boolean @default(true)
  
  commissions Commission[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@unique([organizationId, code])
  @@index([organizationId])
  @@map("commission_rules")
}

enum CommissionType {
  FLAT
  TIERED
  BONUS
}
```

### Commission

```prisma
model Commission {
  id             String  @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  ruleId   String?
  rule     CommissionRule? @relation(fields: [ruleId], references: [id])
  orderId  String
  order    Order @relation(fields: [orderId], references: [id])
  customerId String?
  customer   Customer? @relation(fields: [customerId], references: [id])
  
  valueGross  Decimal @db.Decimal(18, 2)
  valueNet    Decimal @db.Decimal(18, 2)
  ratePercent Decimal @db.Decimal(5, 2)
  amount      Decimal @db.Decimal(18, 2)
  currency    String  @default("VND")
  
  status      CommissionStatus @default(PENDING)
  periodMonth String
  source      CommissionSource
  split       Json             // [{ role, pct, amount, userId }]
  
  isAdjustment        Boolean @default(false)
  adjustsCommissionId String?
  adjustmentParent    Commission? @relation("CommissionAdjustmentChain", fields: [adjustsCommissionId], references: [id])
  adjustments         Commission[] @relation("CommissionAdjustmentChain")
  
  traceId    String?
  createdAt  DateTime @default(now())
  approvedAt DateTime?
  paidAt     DateTime?
  
  @@index([organizationId, periodMonth])
  @@index([organizationId, orderId])
  @@index([organizationId, status])
  @@map("commissions")
}

enum CommissionStatus {
  PENDING
  APPROVED
  PAID
}

enum CommissionSource {
  POS
  COD
}
```

---

## 🛡️ Warranty & Service

### WarrantyPlan (Chương trình bảo hành)

```prisma
model WarrantyPlan {
  id             String  @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  name           String  // "Bảo hành 12 tháng", "Gói chăm sóc VIP"
  description    String?
  
  // Coverage
  durationMonths Int     // Thời hạn (tháng)
  price          Decimal @db.Decimal(12, 2) // Giá gói (nếu thu phí)
  
  // Terms
  terms          String  @db.Text // Điều khoản bảo hành
  
  // Applicable products
  applicableCategories String[] // Category IDs
  
  isActive       Boolean @default(true)
  
  // Relations
  registrations  WarrantyRegistration[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([organizationId])
  @@map("warranty_plans")
}
```

### WarrantyRegistration (Đăng ký bảo hành)

```prisma
model WarrantyRegistration {
  id          String  @id @default(cuid())
  planId      String
  plan        WarrantyPlan @relation(fields: [planId], references: [id])
  
  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id])
  
  productId   String
  product     Product @relation(fields: [productId], references: [id])
  
  orderId     String? // Order mua hàng
  order       Order?  @relation(fields: [orderId], references: [id])
  
  // Timeline
  startDate   DateTime
  endDate     DateTime
  
  // Details
  serialNumber String? // Serial sản phẩm
  notes        String?
  
  status      WarrantyStatus @default(ACTIVE)
  
  // Claims
  claims      WarrantyClaim[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([planId])
  @@index([customerId])
  @@index([productId])
  @@map("warranty_registrations")
}

enum WarrantyStatus {
  ACTIVE    // Đang hiệu lực
  EXPIRED   // Hết hạn
  CLAIMED   // Đã claim
  VOIDED    // Đã hủy
}
```

### WarrantyClaim (Yêu cầu bảo hành)

```prisma
model WarrantyClaim {
  id             String  @id @default(cuid())
  registrationId String
  registration   WarrantyRegistration @relation(fields: [registrationId], references: [id])
  
  issueDescription String @db.Text // Mô tả vấn đề
  claimDate      DateTime @default(now())
  
  // Resolution
  status         ClaimStatus @default(PENDING)
  resolution     String? @db.Text // Cách giải quyết
  resolvedAt     DateTime?
  resolvedBy     String? // User ID
  
  // Cost
  repairCost     Decimal? @db.Decimal(12, 2)
  customerCharge Decimal? @db.Decimal(12, 2) // Phí khách trả (nếu có)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([registrationId])
  @@map("warranty_claims")
}

enum ClaimStatus {
  PENDING    // Chờ xử lý
  APPROVED   // Chấp nhận
  REJECTED   // Từ chối
  COMPLETED  // Đã hoàn thành
}
```

---

## 📅 Appointments & Booking

### Appointment (Lịch hẹn)

```prisma
model Appointment {
  id             String  @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  customerId     String?
  customer       Customer? @relation(fields: [customerId], references: [id])
  
  branchId       String?
  branch         Branch? @relation(fields: [branchId], references: [id])
  
  assignedTo     String  // User ID (nhân viên phụ trách)
  user           User    @relation(fields: [assignedTo], references: [id])
  
  // Schedule
  startTime      DateTime
  endTime        DateTime
  
  // Details
  title          String  // "Tư vấn sản phẩm", "Sửa chữa"
  description    String? @db.Text
  location       String? // Địa điểm (nếu không phải tại branch)
  
  // Type
  type           AppointmentType
  status         AppointmentStatus @default(SCHEDULED)
  
  // Reminder
  reminderSent   Boolean @default(false)
  
  // Notes
  notes          String? @db.Text
  
  createdBy      String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  @@index([organizationId])
  @@index([customerId])
  @@index([assignedTo])
  @@index([startTime])
  @@map("appointments")
}

enum AppointmentType {
  CONSULTATION  // Tư vấn
  REPAIR        // Sửa chữa
  DELIVERY      // Giao hàng
  MEETING       // Họp
  FOLLOW_UP     // Theo dõi khách hàng
}

enum AppointmentStatus {
  SCHEDULED   // Đã đặt lịch
  CONFIRMED   // Đã xác nhận
  COMPLETED   // Đã hoàn thành
  CANCELLED   // Đã hủy
  NO_SHOW     // Khách không đến
}
```

---

## ✅ Tasks & Activities

### Task (Công việc)

```prisma
model Task {
  id             String  @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  title          String
  description    String? @db.Text
  
  // Assignment
  assignedTo     String  // User ID
  user           User    @relation(fields: [assignedTo], references: [id])
  
  // Related to
  customerId     String?
  customer       Customer? @relation(fields: [customerId], references: [id])
  
  orderId        String?
  order          Order?  @relation(fields: [orderId], references: [id])
  
  // Schedule
  dueDate        DateTime?
  priority       TaskPriority @default(MEDIUM)
  status         TaskStatus @default(TODO)
  
  // Completion
  completedAt    DateTime?
  
  createdBy      String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  @@index([organizationId])
  @@index([assignedTo])
  @@index([customerId])
  @@index([status])
  @@map("tasks")
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TaskStatus {
  TODO        // Chưa làm
  IN_PROGRESS // Đang làm
  COMPLETED   // Đã xong
  CANCELLED   // Đã hủy
}
```

### Activity (Hoạt động/Lịch sử tương tác)

```prisma
model Activity {
  id             String  @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  // Related to
  customerId     String?
  customer       Customer? @relation(fields: [customerId], references: [id])
  
  orderId        String?
  order          Order?  @relation(fields: [orderId], references: [id])
  
  // Activity details
  type           ActivityType
  subject        String  // "Gọi điện tư vấn", "Gửi email báo giá"
  description    String? @db.Text
  
  // Outcome
  outcome        String? // Kết quả (VD: "Khách đồng ý mua", "Cần gọi lại")
  
  // Timeline
  activityDate   DateTime @default(now())
  duration       Int?    // Thời lượng (phút)
  
  // Assignment
  performedBy    String  // User ID
  user           User    @relation(fields: [performedBy], references: [id])
  
  createdAt      DateTime @default(now())
  
  @@index([organizationId])
  @@index([customerId])
  @@index([performedBy])
  @@index([activityDate])
  @@map("activities")
}

enum ActivityType {
  CALL        // Gọi điện
  EMAIL       // Gửi email
  MEETING     // Họp
  VISIT       // Thăm khách
  NOTE        // Ghi chú
  SMS         // Tin nhắn
}
```

---

## ⏰ Timesheet & Attendance

### Attendance (Chấm công)

```prisma
model Attendance {
  id        String  @id @default(cuid())
  userId    String
  user      User    @relation(fields: [userId], references: [id])
  
  branchId  String?
  branch    Branch? @relation(fields: [branchId], references: [id])
  
  date      DateTime // Ngày chấm công
  
  // Check in/out
  checkIn   DateTime?
  checkOut  DateTime?
  
  // Work hours
  totalHours Decimal? @db.Decimal(5, 2) // Tổng giờ làm
  
  // Status
  status    AttendanceStatus @default(PRESENT)
  
  // Notes
  notes     String?
  
  // Location (nếu check-in bằng mobile)
  checkInLocation  String?
  checkOutLocation String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@unique([userId, date])
  @@index([userId])
  @@index([date])
  @@map("attendances")
}

enum AttendanceStatus {
  PRESENT    // Có mặt
  ABSENT     // Vắng
  LATE       // Đi muộn
  HALF_DAY   // Nửa ngày
  LEAVE      // Nghỉ phép
}
```

### Timesheet (Bảng công chi tiết)

```prisma
model Timesheet {
  id        String  @id @default(cuid())
  userId    String
  user      User    @relation(fields: [userId], references: [id])
  
  date      DateTime
  
  // Time tracking
  startTime DateTime
  endTime   DateTime?
  
  // Work details
  taskId    String? // Task ID (nếu làm task cụ thể)
  task      Task?   @relation(fields: [taskId], references: [id])
  
  orderId   String? // Order ID (nếu làm việc cho đơn hàng)
  order     Order?  @relation(fields: [orderId], references: [id])
  
  description String? // Mô tả công việc
  
  // Hours
  hours     Decimal @db.Decimal(5, 2) // Số giờ làm
  
  // Billing (nếu tính theo giờ)
  billable  Boolean @default(true)
  hourlyRate Decimal? @db.Decimal(10, 2)
  
  status    TimesheetStatus @default(DRAFT)
  
  approvedBy String?
  approvedAt DateTime?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([userId])
  @@index([date])
  @@index([taskId])
  @@map("timesheets")
}

enum TimesheetStatus {
  DRAFT      // Nháp
  SUBMITTED  // Đã gửi
  APPROVED   // Đã duyệt
  REJECTED   // Từ chối
}
```

---

## 💼 Quotes & Estimates

### Quote (Báo giá)

```prisma
model Quote {
  id             String  @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  code           String  // "QT001234"
  
  customerId     String
  customer       Customer @relation(fields: [customerId], references: [id])
  
  // Pricing
  subtotal       Decimal @db.Decimal(12, 2)
  discount       Decimal @default(0) @db.Decimal(12, 2)
  tax            Decimal @default(0) @db.Decimal(12, 2)
  total          Decimal @db.Decimal(12, 2)
  
  // Timeline
  validUntil     DateTime // Hiệu lực đến
  
  status         QuoteStatus @default(DRAFT)
  
  // Conversion
  convertedToOrder Boolean @default(false)
  orderId          String? // Nếu đã chuyển thành Order
  order            Order?  @relation(fields: [orderId], references: [id])
  
  // Notes
  notes          String? @db.Text
  terms          String? @db.Text // Điều khoản
  
  // Relations
  items          QuoteItem[]
  
  createdBy      String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  @@unique([code, organizationId])
  @@index([organizationId])
  @@index([customerId])
  @@index([status])
  @@map("quotes")
}

enum QuoteStatus {
  DRAFT      // Nháp
  SENT       // Đã gửi khách
  VIEWED     // Khách đã xem
  ACCEPTED   // Khách chấp nhận
  REJECTED   // Khách từ chối
  EXPIRED    // Hết hạn
}
```

### QuoteItem (Chi tiết báo giá)

```prisma
model QuoteItem {
  id        String  @id @default(cuid())
  quoteId   String
  quote     Quote   @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  
  productId String
  product   Product @relation(fields: [productId], references: [id])
  
  quantity  Int
  price     Decimal @db.Decimal(12, 2) // Đơn giá báo
  discount  Decimal @default(0) @db.Decimal(12, 2)
  lineTotal Decimal @db.Decimal(12, 2) // Thành tiền
  
  notes     String? // Ghi chú riêng cho item
  
  @@index([quoteId])
  @@index([productId])
  @@map("quote_items")
}
```

---

## ♻️ Soft Delete & Purge Job

- Bất kỳ bảng nào có `deletedAt` phải hỗ trợ restore <= 6 tháng.
- Cron `purge-soft-delete` chạy 02:00 ICT hằng ngày:
  ```sql
  DELETE FROM %TABLE%
   WHERE deleted_at IS NOT NULL
     AND deleted_at < NOW() - INTERVAL '6 months';
  ```
- Audit log ghi `{ entity, entityId, deletedBy, deletedAt, purgedAt }`.
- Prisma middleware thêm `deletedAt: null` mặc định; muốn xem bản ghi đã xóa phải gọi `withDeleted()` + ghi lý do.

## 🎯 Key Design Decisions

1. **Multi-tenancy:** `organizationId` + Prisma middleware guard cho mọi query.
2. **PII Flagging:** 🔒 phone/email/address → encrypt-at-rest roadmap, mask trên logs.
3. **Config-driven:** Fields (Lead/Commission/Refund) không chứa logic cố định, phải đọc từ Settings.
4. **Soft Delete + Purge:** 6 tháng retention, cron purge như trên.
5. **Decimal Precision:** Money = DECIMAL(12,2) hoặc (18,2) cho commission.
6. **UUID/CUID IDs:** chống đoán, hỗ trợ offline.
7. **Indexes:** Bắt buộc trên FK + fields dùng filter (code, status, periodMonth).

---

## 📊 Final Summary

| Category | Count |
| --- | --- |
| **Tables** | 43 |
| **Enums** | 27 |
| **Total Schemas** | 70 |
| **Modules** | 23 |

**Next:** Implement this schema with Prisma migrations! 🚀
