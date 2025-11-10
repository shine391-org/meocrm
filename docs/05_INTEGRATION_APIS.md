# 🔗 Integration APIs - n8n, MCP & AI Agents

> **For:** n8n workflows, MCP servers, AI agents, external automation tools
> 

> **Authentication:** API Keys + OAuth 2.0
> 

> **Protocols:** REST API, Webhooks, WebSocket, MCP
> 

---

## 🎯 Overview

MeoCRM provides comprehensive APIs for external integrations:

1. **REST API** - Full CRUD operations for all resources
2. **Webhooks** - Real-time event notifications for n8n
3. **MCP Server** - Model Context Protocol for AI agents
4. **GraphQL API** - Flexible data querying (optional)
5. **WebSocket** - Real-time bidirectional communication

---

## 🔐 Authentication Methods

### 1. API Keys (Recommended for n8n)

**Generate API Key:**

```
POST /api/v1/api-keys
Authorization: Bearer {jwt-token}

{
  "name": "n8n Integration",
  "scopes": ["products:read", "orders:write", "customers:read"],
  "expiresIn": "1y"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "key_abc123",
    "key": "meocrm_live_sk_1234567890abcdef",
    "name": "n8n Integration",
    "scopes": ["products:read", "orders:write"],
    "createdAt": "2025-11-06T10:00:00Z",
    "expiresAt": "2026-11-06T10:00:00Z"
  }
}
```

**Using API Key:**

```
GET /api/v1/products
X-API-Key: meocrm_live_sk_1234567890abcdef
```

### 2. OAuth 2.0 (For third-party apps)

**Authorization Flow:**

```
# Step 1: Get authorization code
GET /oauth/authorize?
  client_id={client_id}&
  redirect_uri={redirect_uri}&
  response_type=code&
  scope=products:read+orders:write

# Step 2: Exchange code for token
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code={authorization_code}&
client_id={client_id}&
client_secret={client_secret}&
redirect_uri={redirect_uri}
```

**Response:**

```json
{
  "access_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "refresh_abc123",
  "scope": "products:read orders:write"
}
```

---

## 🪝 Webhooks for n8n

### Available Events

**Products:**

- `product.created`
- `product.updated`
- `product.deleted`
- `product.stock.low` (when stock < minStock)

**Orders:**

- `order.created`
- `order.updated`
- `order.completed`
- `order.cancelled`
- `order.paid`

**Customers:**

- `customer.created`
- `customer.updated`
- `customer.debt.changed`

**Shipping:**

- `shipping.created`
- `shipping.picked_up`
- `shipping.in_transit`
- `shipping.delivered`
- `shipping.failed`

**Inventory:**

- `inventory.updated`
- `transfer.completed`

### Create Webhook

```
POST /api/v1/webhooks
X-API-Key: meocrm_live_sk_...

{
  "url": "https://your-n8n.com/webhook/meocrm",
  "events": [
    "order.created",
    "order.completed",
    "product.stock.low"
  ],
  "secret": "whsec_abc123" // For signature verification
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "wh_123abc",
    "url": "https://your-n8n.com/webhook/meocrm",
    "events": ["order.created", "order.completed"],
    "secret": "whsec_abc123",
    "status": "active",
    "createdAt": "2025-11-06T10:00:00Z"
  }
}
```

### Webhook Payload Example

**Event: `order.created`**

```json
{
  "id": "evt_abc123",
  "type": "order.created",
  "createdAt": "2025-11-06T10:30:00Z",
  "data": {
    "id": "uuid",
    "code": "HD031537",
    "customerId": "uuid",
    "customer": {
      "name": "Trần Thanh Tâm",
      "phone": "0937946879"
    },
    "total": 550000,
    "status": "PENDING",
    "items": [
      {
        "productId": "uuid",
        "product": {
          "sku": "VCTN064",
          "name": "Ví cầm tay nam"
        },
        "quantity": 1,
        "price": 520000
      }
    ],
    "createdAt": "2025-11-06T10:30:00Z"
  },
  "organizationId": "uuid"
}
```

### Webhook Signature Verification

```javascript
// Node.js example for n8n
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(JSON.stringify(payload)).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

// In your n8n webhook
const signature = $headers['x-meocrm-signature'];
const isValid = verifyWebhook($json, signature, 'whsec_abc123');
```

---

## 🤖 MCP Server (Model Context Protocol)

### What is MCP?

MCP allows AI agents (Claude, GPT, etc.) to interact with MeoCRM as a "tool".

**MCP Server URL:** `mcp://localhost:2040/mcp`

### Available MCP Tools

### 1. **search_products**

Search products by keyword, category, or SKU

```json
{
  "tool": "search_products",
  "arguments": {
    "query": "túi da",
    "category": "Túi da handmade",
    "inStock": true,
    "limit": 10
  }
}
```

**Response:**

```json
{
  "products": [
    {
      "sku": "TDH016",
      "name": "Túi đeo chéo da bò cao cấp",
      "sellPrice": 7500000,
      "stock": 5
    }
  ]
}
```

### 2. **create_order**

Create new order for customer

```json
{
  "tool": "create_order",
  "arguments": {
    "customerPhone": "0937946879",
    "items": [
      {"sku": "TDH016", "quantity": 1}
    ],
    "paymentMethod": "COD",
    "shippingAddress": {
      "name": "Trần Thanh Tâm",
      "phone": "0937946879",
      "address": "17 Hưng Phước 3, Quận 7, HCM"
    }
  }
}
```

### 3. **get_customer_info**

Get customer details and history

```json
{
  "tool": "get_customer_info",
  "arguments": {
    "phone": "0937946879"
  }
}
```

**Response:**

```json
{
  "customer": {
    "name": "Trần Thanh Tâm",
    "phone": "0937946879",
    "totalSpent": 5500000,
    "totalOrders": 10,
    "debt": 0,
    "lastOrder": {
      "code": "HD031537",
      "date": "2025-11-05",
      "total": 550000
    }
  }
}
```

### 4. **check_inventory**

Check stock availability

```json
{
  "tool": "check_inventory",
  "arguments": {
    "sku": "TDH016",
    "branchName": "Lano - HN"
  }
}
```

### 5. **track_shipping**

Get shipping status

```json
{
  "tool": "track_shipping",
  "arguments": {
    "trackingCode": "GY6YGLDU"
  }
}
```

### 6. **generate_report**

Generate business reports

```json
{
  "tool": "generate_report",
  "arguments": {
    "type": "revenue",
    "fromDate": "2025-11-01",
    "toDate": "2025-11-06",
    "branchName": "Lano - HN"
  }
}
```

---

## 📡 n8n Integration Examples

### Example 1: Auto-create customer from form

**n8n Workflow:**

```
1. Webhook Trigger (receive form data)
2. HTTP Request to MeoCRM
   - Method: POST
   - URL: baseUrl/api/v1/customers
   - Headers: X-API-Key: apiKey
   - Body:  $json 
3. Send confirmation email
```

### Example 2: Low stock alerts

**n8n Workflow:**

```
1. Webhook Trigger (event: product.stock.low)
2. Filter (stock < 5)
3. Send Slack notification
4. Create Google Sheet row
5. HTTP Request - Create purchase order
```

---

## 🔄 GraphQL API (Optional)

**Endpoint:** `/graphql`

**Example Query:**

```graphql
query GetProductsWithInventory {
  products(where: { inStock: true }, take: 10) {
    id
    sku
    name
    sellPrice
    variants {
      sku
      name
      stock
    }
    inventory(where: { branchName: "Lano - HN" }) {
      quantity
      branch {
        name
      }
    }
  }
}
```

---

## 📊 Batch Operations API

### Bulk Import Products

```
POST /api/v1/products/bulk
X-API-Key: meocrm_live_sk_...
Content-Type: application/json

{
  "products": [
    {
      "sku": "TDH020",
      "name": "Túi tote mới",
      "costPrice": 1500000,
      "sellPrice": 6000000,
      "stock": 10
    }
  ]
}
```

---

## 🔌 WebSocket Real-time API

**Connect:**

```javascript
const ws = new WebSocket('ws://localhost:2040/ws');

// Authenticate
ws.send(JSON.stringify({
  type: 'auth',
  token: 'meocrm_live_sk_...'
}));

// Subscribe to events
ws.send(JSON.stringify({
  type: 'subscribe',
  channels: ['orders', 'inventory']
}));
```

---

## 📚 SDK & Libraries

### Official SDKs

**Node.js:**

```bash
npm install @meocrm/sdk
```

**Python:**

```bash
pip install meocrm
```

---

## 🧪 Testing & Development

### Sandbox Environment

**Base URL:** `http://localhost:2040/api/v1`

**API Key:** `meocrm_test_sk_...` (test mode)
