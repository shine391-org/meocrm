# MeoCRM API Reference

> **Base URL:** `http://localhost:2003/api` (development)
> 

> **Authentication:** JWT Bearer token
> 

> **Response Format:** JSON envelope `{ success, data, message }`
> 

---

## 🔐 Authentication

### POST /auth/register

Register new organization + admin user

**Request Body:**

```json
{
  "email": "admin@lano.vn",
  "password": "securepass123",
  "name": "Admin User",
  "organizationName": "Lano Leather"
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@lano.vn",
      "name": "Admin User",
      "role": "ADMIN"
    },
    "organization": {
      "id": "uuid",
      "name": "Lano Leather",
      "slug": "lano-leather"
    },
    "accessToken": "jwt.token.here"
  }
}
```

### POST /auth/login

Login existing user

**Request Body:**

```json
{
  "email": "admin@lano.vn",
  "password": "securepass123"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "user": { "...user object..." },
    "accessToken": "jwt.token.here"
  }
}
```

### POST /auth/refresh

Refresh access token

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "accessToken": "new.jwt.token"
  }
}
```

---

## 📦 Products

### GET /products

List products with filters

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**

- `page` (number, default: 1)
- `limit` (number, default: 20, max: 100)
- `search` (string) - search by SKU or name
- `categoryId` (uuid) - filter by category
- `minPrice` (number)
- `maxPrice` (number)
- `inStock` (boolean) - only in-stock products
- `sortBy` (string: "name", "price", "stock", "createdAt")
- `sortOrder` (string: "asc", "desc")

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "sku": "TDH016",
        "name": "Túi đeo chéo da bò cao cấp",
        "categoryId": "uuid",
        "category": {
          "id": "uuid",
          "name": "Túi da handmade"
        },
        "costPrice": 1500000,
        "sellPrice": 7500000,
        "stock": 5,
        "images": ["https://cdn.../image1.jpg"],
        "variants": [
          {
            "id": "uuid",
            "sku": "TDH016-D",
            "name": "Đen",
            "additionalPrice": 0,
            "stock": 3
          }
        ],
        "createdAt": "2025-11-06T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1509,
      "totalPages": 76
    }
  }
}
```

### GET /products/:id

Get product by ID

**Response:** `200 OK`

```json
{
  "success": true,
  "data": { "/* full product object */" }
}
```

### POST /products

Create new product

**Request Body:**

```json
{
  "sku": "TDH017",
  "name": "Túi tote da togo",
  "categoryId": "uuid",
  "costPrice": 2000000,
  "sellPrice": 8000000,
  "stock": 10,
  "minStock": 2,
  "maxStock": 50,
  "images": ["https://cdn.../image.jpg"],
  "weight": 500,
  "variants": [
    {
      "sku": "TDH017-D",
      "name": "Đen",
      "additionalPrice": 0,
      "stock": 5
    },
    {
      "sku": "TDH017-NS",
      "name": "Nâu sáng",
      "additionalPrice": 100000,
      "stock": 5
    }
  ]
}
```

**Response:** `201 Created`

### PATCH /products/:id

Update product

**Request Body:** (partial update)

```json
{
  "sellPrice": 8500000,
  "stock": 8
}
```

**Response:** `200 OK`

### DELETE /products/:id

Soft delete product

**Response:** `200 OK`

---

## 👥 Customers

### GET /customers

List customers

**Query Parameters:**

- `page`, `limit`
- `search` - by name, phone, code
- `segment` - customer segment
- `hasDebt` (boolean)
- `province`, `district`

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "code": "KH024917",
        "name": "Trần Thanh Tâm",
        "phone": "0937946879",
        "email": null,
        "address": "17 Hưng Phước 3",
        "province": "Hồ Chí Minh",
        "district": "Quận 7",
        "ward": "Phường Tân Phong",
        "segment": "Đang Giao Hàng",
        "totalSpent": 550000,
        "totalOrders": 1,
        "debt": 550000,
        "lastOrderAt": "2025-11-05T15:50:00Z",
        "createdAt": "2025-11-05T15:49:00Z"
      }
    ],
    "pagination": { "..." }
  }
}
```

### POST /customers

Create customer

**Request Body:**

```json
{
  "name": "Nguyễn Văn A",
  "phone": "0901234567",
  "email": "nguyenvana@example.com",
  "address": "123 Lê Lợi",
  "province": "Hà Nội",
  "district": "Quận Hoàn Kiếm",
  "ward": "Phường Tràng Tiền",
  "segment": "Khách lẻ"
}
```

**Response:** `201 Created`

---

## 🛒 Orders

### GET /orders

List orders

**Query Parameters:**

- `page`, `limit`
- `status` - PENDING, PROCESSING, COMPLETED, CANCELLED
- `customerId`
- `fromDate`, `toDate`
- `paymentMethod`

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "code": "HD031537",
        "customerId": "uuid",
        "customer": {
          "name": "Trần Thanh Tâm",
          "phone": "0937946879"
        },
        "subtotal": 520000,
        "discount": 0,
        "total": 550000,
        "paymentMethod": "COD",
        "isPaid": false,
        "paidAmount": 0,
        "status": "PENDING",
        "items": [
          {
            "productId": "uuid",
            "product": {
              "sku": "VCTN064",
              "name": "Ví cầm tay nam"
            },
            "quantity": 1,
            "price": 520000,
            "discount": 0,
            "lineTotal": 520000
          }
        ],
        "createdAt": "2025-11-05T15:50:06Z"
      }
    ],
    "pagination": { "..." }
  }
}
```

### POST /orders

Create order

**Request Body:**

```json
{
  "customerId": "uuid",
  "items": [
    {
      "productId": "uuid",
      "quantity": 2,
      "price": 520000,
      "discount": 0
    }
  ],
  "discount": 0,
  "paymentMethod": "CASH",
  "shippingInfo": {
    "partnerId": "uuid",
    "recipientName": "Trần Thanh Tâm",
    "recipientPhone": "0937946879",
    "recipientAddress": "17 Hưng Phước 3",
    "recipientProvince": "Hồ Chí Minh",
    "recipientDistrict": "Quận 7",
    "recipientWard": "Phường Tân Phong",
    "shippingFee": 30000,
    "codAmount": 550000
  }
}
```

**Response:** `201 Created`

---

## 🚚 Shipping Orders

### GET /shipping-orders

List shipping orders

**Query Parameters:**

- `page`, `limit`
- `orderId`
- `partnerId`
- `trackingCode`
- `status` - PENDING, PICKING_UP, IN_TRANSIT, DELIVERED, FAILED, RETURNED

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "orderId": "uuid",
        "partnerId": "uuid",
        "partner": {
          "name": "Giao hàng nhanh"
        },
        "trackingCode": "GY6YGLDU",
        "recipientName": "Trần Thanh Tâm",
        "recipientPhone": "0937946879",
        "recipientAddress": "17 Hưng Phước 3, Phường Tân Phong, Quận 7, HCM",
        "shippingFee": 19500,
        "codAmount": 550000,
        "status": "IN_TRANSIT",
        "weight": 500,
        "createdAt": "2025-11-05T15:50:06Z"
      }
    ],
    "pagination": { "..." }
  }
}
```

---

## 🏢 Suppliers

### GET /suppliers

List suppliers

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "code": "DT000008",
        "name": "GHTK",
        "email": "cskh@ghtk.vn",
        "phone": "1800.6092",
        "totalOrders": 26429,
        "totalFees": 222301730,
        "totalCOD": 3078000,
        "debtBalance": 498000
      }
    ],
    "pagination": { "..." }
  }
}
```

---

## 📊 Inventory

### GET /inventory

Get inventory by branch

**Query Parameters:**

- `branchId` (required)
- `productId`
- `lowStock` (boolean) - only products below minStock

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "productId": "uuid",
        "product": {
          "sku": "TDH016",
          "name": "Túi đeo chéo",
          "minStock": 5
        },
        "branchId": "uuid",
        "branch": {
          "name": "Lano - HN"
        },
        "quantity": 3,
        "isLowStock": false
      }
    ]
  }
}
```

### POST /transfers

Create inter-branch transfer

**Request Body:**

```json
{
  "fromBranchId": "uuid",
  "toBranchId": "uuid",
  "items": [
    {
      "productId": "uuid",
      "quantity": 2
    }
  ]
}
```

**Response:** `201 Created`

---

## 📈 Reports

### GET /reports/revenue

Revenue report

**Query Parameters:**

- `fromDate`, `toDate` (ISO date strings)
- `branchId`
- `groupBy` - day, week, month

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "total": 58000000,
    "breakdown": [
      {
        "date": "2025-11-01",
        "revenue": 5000000,
        "orders": 10
      }
    ]
  }
}
```

---

## 🚨 Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

### 403 Forbidden

```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

### 404 Not Found

```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Error details (dev only)"
}
```

---

**Authentication:** All endpoints except `/auth/*` require `Authorization: Bearer {token}` header

**Rate Limiting:** 100 requests per minute per IP

**CORS:** Configured for `http://localhost:2041` (development)
