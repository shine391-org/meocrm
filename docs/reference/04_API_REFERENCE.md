# MeoCRM API Reference

> **Base URL:** `http://localhost:2003/api` (development)
> 

> **Authentication:** JWT Bearer token
> 

> **Updated:** November 19, 2025
> 

---

## 🔐 Authentication

### POST /auth/register

Register new organization and admin user.

**Request Body:**

```json
{
  "email": "admin@lano.vn",
  "password": "securepass123",
  "name": "Admin User",
  "organizationName": "Lano Leather"
}
```

### POST /auth/login

Login existing user.

**Request Body:**

```json
{
  "email": "admin@lano.vn",
  "password": "securepass123"
}
```

### GET /auth/me

Get the profile of the currently authenticated user.

**Response:** `200 OK`

```json
{
  "id": "uuid",
  "email": "admin@lano.vn",
  "name": "Admin User",
  "role": "OWNER",
  "organizationId": "uuid"
}
```

### POST /auth/refresh

Refresh an access token using a valid refresh token (sent via secure cookie).

**Response:** `200 OK`

```json
{
  "accessToken": "new.jwt.token.here",
  "refreshToken": "new.refresh.token.here"
}
```

### POST /auth/logout

Logout the user and invalidate the refresh token.

**Response:** `200 OK`

```json
{
  "message": "Logged out"
}
```

---

## 🏢 Organizations

### GET /organizations/me

Get the profile of the current user's organization.

**Response:** `200 OK`

### PATCH /organizations/me

Update the profile of the current user's organization.

**Response:** `200 OK`

### GET /organizations/slug/:slug

Public endpoint to look up an organization by its unique slug.

**Response:** `200 OK`

### POST /organizations

Create a new organization. Protected by a secret header.

**Headers:** `x-organization-secret: <secret>`

**Response:** `201 Created`

---

## 👥 Users

### GET /users

List all users within the current user's organization. Supports pagination.

**Query Parameters:** `page`, `limit`

**Response:** `200 OK`

### POST /users

Create a new user within the current user's organization.

**Request Body:**
```json
{
  "email": "staff@lano.vn",
  "password": "securepass123",
  "name": "Staff User",
  "role": "STAFF"
}
```
**Response:** `201 Created`

### GET /users/:id

Get a specific user's details by ID.

**Response:** `200 OK`

### PATCH /users/:id

Update a user's profile.

**Response:** `200 OK`

### DELETE /users/:id

Remove a user from the organization.

**Response:** `200 OK`

---

## 📦 Products

### GET /products

List products with filters.

**Query Parameters:**
- `page`, `limit`, `search`
- `categoryId`, `minPrice`, `maxPrice`, `inStock`
- `sortBy`, `sortOrder`

**Response:** `200 OK`

### POST /products

Create a new product. Can include variants.

**Response:** `201 Created`

### GET /products/:id

Get a single product by its ID.

**Response:** `200 OK`

### PATCH /products/:id

Update a product's details.

**Response:** `200 OK`

### DELETE /products/:id

Soft delete a product.

**Response:** `204 No Content`

---

## 📦 Product Variants

### GET /products/:productId/variants

List all variants for a specific product.

**Response:** `200 OK`

### POST /products/:productId/variants

Create a new variant for a product.

**Request Body:**
```json
{
  "name": "Màu Đen",
  "sku": "PRODUCT-SKU-BLK",
  "additionalPrice": 0,
  "stock": 10
}
```
**Response:** `201 Created`

### GET /products/:productId/variants/:id

Get a single product variant by its ID.

**Response:** `200 OK`

### PATCH /products/:productId/variants/:id

Update a product variant's details.

**Response:** `200 OK`

### DELETE /products/:productId/variants/:id

Soft delete a product variant.

**Response:** `200 OK`

---

## 📂 Categories

### GET /categories

Get a flat list of all categories for the organization.

**Response:** `200 OK`

### GET /categories/tree

Get all categories structured as a tree.

**Response:** `200 OK`

### POST /categories

Create a new category.

**Request Body:**
```json
{
  "name": "Ví da nam",
  "parentId": "optional-parent-uuid"
}
```
**Response:** `201 Created`

### GET /categories/:id

Get a single category by ID.

**Response:** `200 OK`

### PATCH /categories/:id

Update a category's name or parent.

**Response:** `200 OK`

### DELETE /categories/:id

Soft delete a category.

**Response:** `200 OK`

---

## 👥 Customers

### GET /customers

List customers with pagination and filters.

**Query Parameters:**
- `page`, `limit`
- `search` (by name, phone, code)
- `segment`, `sortBy`, `sortOrder`

**Response:** `200 OK`

### POST /customers

Create a new customer.

**Response:** `201 Created`

### GET /customers/:id

Get a single customer by ID.

**Response:** `200 OK`

### PATCH /customers/:id

Update a customer's details.

**Response:** `200 OK`

### DELETE /customers/:id

Soft delete a customer.

**Response:** `200 OK`

---

## 🏬 Branches

### GET /branches

List all branches for the current organization.

**Response:** `200 OK`

---

## 🛒 Orders

### GET /orders

List orders with pagination and filters.

**Query Parameters:**
- `page`, `limit`, `status`
- `customerId`, `fromDate`, `toDate`
- `paymentMethod`, `branchId`

**Response:** `200 OK`

### POST /orders

Create a new order.

**Request body highlights:**
- `branchId` **bắt buộc** để automation inventory biết chi nhánh deduct stock.
- `items[]` gồm `productId`, `quantity`, `variantId?`, `discountType? (PERCENT|FIXED)`, `discountValue?` (theo **đơn vị**), `taxExempt?`.
- `channel`, `shipping`, `discount`, `notes`, `isPaid`, `paidAmount` phản ánh workflow POS/COD mới.

**Response payload bổ sung:**
- `taxableSubtotal`, `taxBreakdown { taxableAmount, rate }`.
- `items[].discountAmount`, `items[].netTotal`, `items[].isTaxExempt`.
- `warnings[]` (LOW_STOCK, LOSS_SALE, v.v.) phục vụ POS.

**Response:** `201 Created`

### GET /orders/:id

Get a single order by ID.

**Response:** `200 OK`

### PUT /orders/:id

Update an order's details (only for PENDING orders).

**Response:** `200 OK`

### DELETE /orders/:id

Soft delete an order.

**Response:** `200 OK`

### PATCH /orders/:id/status

Update the status of an order (e.g., from PENDING to PROCESSING).

**Response:** `200 OK`

---

## ↩️ Refunds

### POST /orders/:orderId/refund-request

Request a refund for a completed order.

**Response:** `202 Accepted`

### POST /orders/:orderId/refund-approve

Approve a pending refund request (manager role required).

**Response:** `200 OK`

### POST /orders/:orderId/refund-reject

Reject a pending refund request (manager role required).

**Response:** `200 OK`

---

## 🚚 Shipping

### GET /shipping/orders

List shipping orders with pagination and filters.

**Query Parameters:** `page`, `limit`, `status`, `search`

**Response:** `200 OK`

### POST /shipping/orders

Create a new shipping order for an existing MeoCRM order.

**Request body highlights:**
- `partnerId`, `trackingCode`, thông tin người nhận + địa chỉ bắt buộc.
- `serviceType`, `distanceKm`, `weight` dùng cho `ShippingFeeService`.
- `codAmount` (mặc định 0) sẽ được auto settle khi status chuyển `DELIVERED`.
- `shippingFee` có thể override; nếu bỏ trống sẽ tự tính (settings `shipping.*` + `shipping.partners`).

**Response:** `201 Created`

### GET /shipping/orders/:id

Get a single shipping order by ID.

**Response:** `200 OK`

### PATCH /shipping/orders/:id/status

Update the status of a shipping order (e.g., from IN_TRANSIT to DELIVERED). This can be called by a webhook from the shipping partner.

**Behavior:**
- `DELIVERED` → tự động cập nhật `OrderStatus` = `DELIVERED` rồi `COMPLETED`, gọi `OrdersService.markCodPaid`.
- `FAILED` hoặc `RETURNED` → đẩy `OrderStatus` về `PENDING`, gọi `InventoryService.returnStockOnOrderCancel`, tăng `retryCount`, lưu `failedReason/returnReason`.
- Mọi thay đổi status đều ghi audit `shipping.status.changed` + `order.status.changed`.

**Response:** `200 OK`

---

## 🏭 Suppliers

### GET /suppliers

List suppliers with pagination and filters.

**Response:** `200 OK`

### POST /suppliers

Create a new supplier.

**Response:** `201 Created`

### GET /suppliers/:id

Get a single supplier by ID.

**Response:** `200 OK`

### PATCH /suppliers/:id

Update a supplier's details.

**Response:** `200 OK`

### DELETE /suppliers/:id

Soft delete a supplier.

**Response:** `204 No Content`

---

## 📊 Inventory

### GET /inventory

Get inventory by branch with pagination and filters.

**Query Parameters:** `branchId` (required), `page`, `limit`, `search`, `categoryId`, `lowStockOnly`

**Response:** `200 OK`

### POST /inventory/adjust

Manually adjust stock for a product in a specific branch (admin only).

**Request Body:**
```json
{
  "productId": "uuid",
  "branchId": "uuid",
  "quantity": -5,
  "reason": "DAMAGED",
  "notes": "Hàng bị hỏng trong kho"
}
```
**Response:** `200 OK`

### GET /inventory/low-stock

Get a list of products with low stock for a specific branch.

**Query Parameters:** `branchId` (required)

**Response:** `200 OK`

### POST /inventory/transfer

Create an immediate inter-branch stock transfer.

**Request Body:**
```json
{
  "productId": "uuid",
  "fromBranchId": "uuid-source",
  "toBranchId": "uuid-destination",
  "quantity": 10
}
```
**Response:** `201 Created`

---

## 📈 Reports

### GET /reports/debt

Get a customer debt report.

**Query Parameters:**
- `groupBy` (string, required: `day` or `month`)
- `fromDate`, `toDate` (ISO date strings, optional)
- `customerId` (uuid, optional)

**Response:** `200 OK`

---

## 🪝 Webhooks

### POST /webhooks/handler

Public endpoint for receiving webhook events from external services. Not for direct use.

### GET /webhooks

List all configured webhook subscriptions for the organization.

**Response:** `200 OK`

### POST /webhooks

Create a new webhook subscription.

**Response:** `201 Created`

### PATCH /webhooks/:id

Update a webhook subscription.

**Response:** `200 OK`

### POST /webhooks/:id/test

Send a test event to a configured webhook.

**Response:** `200 OK`

---

## ❤️ Health Check

### GET /

Basic API health check.

**Response:** `200 OK` (string: "MeoCRM API v1.0...")

### GET /health

Detailed health check including database status.

**Response:** `200 OK`

---

## 🚨 Error Responses

Standard error responses are provided for `400`, `401`, `403`, `404`, and `500` status codes.

---

## 📌 2025-11 API Notes

- **Orders responses** now expose `taxableSubtotal`, `taxBreakdown { taxableAmount, rate }` and per-item fields `discountType`, `discountValue`, `discountAmount`, `netTotal`, `isTaxExempt` following the updated DTO.
- **Shipping responses** surface `serviceType`, `distanceKm`, `feeBreakdown`, `retryCount`, `failedReason`, `returnReason`. `PATCH /shipping-orders/:id/status` accepts the new reason fields and triggers automation (DELIVERED ⇒ auto COMPLETE + `markCodPaid`; FAILED/RETURNED ⇒ order back to `PENDING`, inventory restored).
