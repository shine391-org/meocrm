# Development Lessons Learned - MeoCRM

> **Knowledge base for AI-assisted development**
> Last Updated: 2025-11-16
> Purpose: Document common mistakes and their solutions to maintain code quality and consistency

## Quick Reference
- **Location**: Root directory (`/DEVELOPMENT_LESSONS_LEARNED.md`)
- **Related Docs**:
  - [AGENTS.md](./AGENTS.md) - Agent operations manual
  - [README.md](./README.md) - Project overview
  - [docs/LESSONS_LEARNED.md](./docs/LESSONS_LEARNED.md) - Team knowledge base (45+ lessons)
  - [docs/technical/coding-standards.md](./docs/technical/coding-standards.md) - Coding standards

---

## 1. API Response Format Standards

### ❌ Lỗi đã mắc phải
**File**: `apps/api/src/customers/customers.service.ts`

Backend `findOne()` method trả về trực tiếp object:
```typescript
async findOne(id: string, organizationId: string) {
  const customer = await this.prisma.customer.findFirst({...});
  return customer; // ❌ Trả về trực tiếp
}
```

Frontend expect format có wrap `data`:
```typescript
const { data: customerResponse } = useSWR(id, fetcher);
const customer = customerResponse.data; // ✅ Expect { data: {...} }
```

### ✅ Cách sửa đúng
Backend phải wrap response trong property `data`:
```typescript
async findOne(id: string, organizationId: string) {
  const customer = await this.prisma.customer.findFirst({...});
  return { data: customer }; // ✅ Wrap trong { data: ... }
}
```

Và update các method gọi `findOne()` để unwrap:
```typescript
async update(id: string, dto: UpdateCustomerDto, organizationId: string) {
  const { data: customer } = await this.findOne(id, organizationId); // ✅ Destructure
  // ... rest of code
}
```

### 📋 Quy tắc
**LUÔN LUÔN** sử dụng format response chuẩn cho tất cả API endpoints:
- Single item: `{ data: {...} }`
- List/Paginated: `{ data: [...], meta: { total, page, limit, totalPages } }`

---

## 2. API URL Prefix Configuration

### ❌ Lỗi đã mắc phải
**File**: `apps/api/src/main.ts`

NestJS app không có global prefix `/api`, dẫn đến:
- Routes là `/customers`, `/orders` thay vì `/api/customers`, `/api/orders`
- Frontend phải hardcode `/api` vào mỗi request
- Swagger docs không consistent với actual routes

### ✅ Cách sửa đúng
Thêm global prefix trong `main.ts`:
```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ... other config

  app.setGlobalPrefix('api'); // ✅ Thêm dòng này

  await app.listen(port);
}
```

### 📋 Quy tắc
- **LUÔN** set `app.setGlobalPrefix('api')` trong NestJS applications
- Frontend config `NEXT_PUBLIC_API_URL` nên có suffix `/api` (vd: `http://localhost:2003/api`)
- Không hardcode thêm `/api` trong từng API call

---

## 3. Double API Prefix Bug

### ❌ Lỗi đã mắc phải
**File**: `apps/web/components/customers/order-history-mini.tsx`

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:2003';

const { data: ordersResponse } = useSWR(
  `${API_BASE_URL}/api/orders?customerId=${customerId}`, // ❌ Double /api
  fetchOrders
);
```

Kết quả: URL thành `http://localhost:2003/api/api/orders` → 404

### ✅ Cách sửa đúng
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:2003/api';

const { data: ordersResponse } = useSWR(
  `${API_BASE_URL}/orders?customerId=${customerId}`, // ✅ Không thêm /api
  fetchOrders
);
```

### 📋 Quy tắc
- `NEXT_PUBLIC_API_URL` phải bao gồm `/api` suffix
- Các API calls chỉ cần append endpoint path (vd: `/customers`, `/orders`)
- **KHÔNG BAO GIỜ** hardcode `/api/` trong API call URLs

---

## 4. Next.js 13+ App Router Params Handling

### ❌ Lỗi đã mắc phải
**File**: `apps/web/app/(dashboard)/customers/[id]/edit/page.tsx`

```typescript
export default function CustomerEditPage({ params }: { params: { id: string } }) {
  const { data: customerResponse } = useSWR(params.id, fetcher); // ❌ Dùng trực tiếp

  const handleSubmit = async (data: CustomerFormData) => {
    await updateCustomer(params.id, data); // ❌ Dùng lại params.id
    mutate(params.id); // ❌ Dùng lại params.id
  };
}
```

### ✅ Cách sửa đúng
```typescript
export default function CustomerEditPage({ params }: { params: { id: string } }) {
  const id = params.id; // ✅ Destructure một lần

  const { data: customerResponse } = useSWR(id, fetcher); // ✅ Dùng biến

  const handleSubmit = async (data: CustomerFormData) => {
    await updateCustomer(id, data); // ✅ Dùng biến
    mutate(id); // ✅ Dùng biến
  };
}
```

### 📋 Quy tắc
- **LUÔN** destructure `params` thành biến local ở đầu component
- Dùng biến local thay vì access `params.xxx` nhiều lần
- Dễ đọc, dễ maintain, và tránh bugs khi params thay đổi

---

## 5. Paginated API Response Handling

### ❌ Lỗi đã mắc phải
**File**: `apps/web/app/(dashboard)/orders/page.tsx`

```typescript
const latestOrders = await OrdersService.getOrders();
setOrders(latestOrders); // ❌ Expect array nhưng API trả về { data: [], meta: {} }
```

### ✅ Cách sửa đúng
```typescript
const response = await OrdersService.getOrders();
// API returns { data: [...], meta: {...} }
setOrders(response.data || []); // ✅ Extract data property
```

### 📋 Quy tắc
- Khi gọi paginated endpoints, **LUÔN** expect format `{ data: [], meta: {} }`
- Extract `response.data` trước khi set vào state
- Provide fallback `[]` để tránh undefined errors

---

## 6. SWR Data Structure Expectations

### ❌ Lỗi đã mắc phải
**File**: `apps/web/components/customers/order-history-mini.tsx`

```typescript
const { data: ordersResponse, error, isLoading } = useSWR(...);

if (error || !ordersResponse) return <div>Error</div>; // ❌ Thiếu check ordersResponse.data

const orders = ordersResponse.data; // ❌ Có thể undefined
```

### ✅ Cách sửa đúng
```typescript
const { data: ordersResponse, error, isLoading } = useSWR(...);

// ✅ Check cả ordersResponse và ordersResponse.data
if (error || !ordersResponse || !ordersResponse.data) {
  return <div>Không thể tải lịch sử đơn hàng.</div>;
}

const orders = ordersResponse.data; // ✅ An toàn vì đã check
```

### 📋 Quy tắc
- **LUÔN** check cả `response` và `response.data` trước khi dùng
- Pattern: `if (error || !response || !response.data) return <Error />`
- Tránh runtime errors khi API trả về unexpected format

---

## 7. TypeScript Configuration Files

### ⚠️ Lưu ý
**Files**: `apps/web/next-env.d.ts`, `apps/web/tsconfig.json`

Đây là các files auto-generated bởi Next.js/TypeScript:
- `next-env.d.ts`: Type definitions cho Next.js
- `tsconfig.json`: TS compiler config được update bởi Next.js

### 📋 Quy tắc
- **KHÔNG** commit các thay đổi auto-generated trong `next-env.d.ts`
- **KHÔNG** commit các thay đổi formatting trong `tsconfig.json` nếu chỉ là prettier/linter
- Add vào `.gitignore` nếu cần:
  ```
  # Auto-generated TS files
  next-env.d.ts
  ```

---

## 8. Unused Configuration Files

### ❌ Lỗi đã mắc phải
**File**: `apps/web/tailwind.config.js`

File `tailwind.config.js` tồn tại nhưng:
- Project đã dùng `tailwind.config.ts` (TypeScript version)
- File `.js` empty và không được dùng
- Gây confusion về config nào đang active

### ✅ Cách sửa đúng
```bash
git rm apps/web/tailwind.config.js
```

### 📋 Quy tắc
- **LUÔN** xóa unused config files
- Nếu có 2 config files cùng purpose (`.js` và `.ts`), chỉ giữ 1
- Prefer TypeScript configs (`.ts`) over JavaScript (`.js`)
- Run `git clean -fdx` thường xuyên để dọn unused files

---

## 9. API Error Response Format

### 📋 Best Practice (theo AGENTS.md)

Để consistent với chuẩn của MeoCRM, error response phải follow format:

```typescript
// ✅ Error Response Format (theo docs/01_BUSINESS_LOGIC.md)
{
  code: 'CUSTOMER_NOT_FOUND',        // Error code (uppercase snake_case)
  message: 'Customer with id xxx not found',  // Human-readable message
  details?: {...},                   // Optional additional context
  traceId?: 'string'                 // Optional trace ID for debugging
}
```

**Không dùng format:**
```typescript
// ❌ Không dùng nested error object
{
  error: {
    code: '...',
    message: '...'
  }
}
```

### 📋 Implementation

NestJS đã có HttpExceptionFilter, chỉ cần đảm bảo error thrown theo chuẩn:

```typescript
// ✅ Throw errors theo chuẩn
throw new NotFoundException('Customer with id xxx not found');
throw new ConflictException('Phone number already exists');
throw new BadRequestException('Invalid input data');
```

### 📋 Quy tắc
- Follow OpenAPI `components.schemas.Error` definition
- Error codes nên là SCREAMING_SNAKE_CASE
- Luôn provide meaningful message
- Optional `details` cho complex errors
- Optional `traceId` cho distributed tracing

---

## 10. Environment Variables Best Practices

### 📋 Quy tắc (theo README.md & AGENTS.md)

**Jules VM Environment (Recommended)**:
- Environment variables được quản lý trong **Jules GUI → Environment tab**
- Không cần tạo `.env` files trong Jules VM
- Các giá trị đã được inject tự động khi snapshot boot

**File**: `apps/web/.env.local` (nếu dev outside Jules VM)

```env
# ✅ Bao gồm /api suffix trong base URL
NEXT_PUBLIC_API_URL=http://localhost:2003/api
```

- ✅ Dùng `NEXT_PUBLIC_` prefix cho client-side variables
- ✅ Default value trong code nên match với `.env.local`
- ✅ **KHÔNG BAO GIỜ** commit `.env` files vào Git (đã có trong `.gitignore`)

### 📋 Pattern sử dụng
```typescript
// ✅ Environment variable nên include /api suffix
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:2003/api';

// ✅ Chỉ cần append endpoint
const url = `${API_BASE_URL}/customers`;
```

### 📋 Security Notes
- Tất cả secrets (`JWT_SECRET`, `DB_PASSWORD`, etc.) phải được generate bằng crypto-secure random
- Sử dụng `openssl rand -base64 32` hoặc `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- Xem README.md Appendix B cho full env template

---

## Summary Checklist for AI Developers

### Trước khi code

**Environment Setup** (theo AGENTS.md):
- [ ] Jules VM đã có Docker services running? (`sudo docker ps`)
- [ ] Prisma client đã được generate? (`pnpm db:generate`)
- [ ] API client đã được prebuild? (`pnpm --filter @meocrm/api-client build`)

**Architecture & Standards**:
- [ ] API responses có wrap trong `{ data: ... }` format?
- [ ] NestJS app có `app.setGlobalPrefix('api')`?
- [ ] Frontend không hardcode `/api` trong API calls?
- [ ] Next.js params được destructure ở đầu component?
- [ ] Paginated responses có extract `.data` property?
- [ ] SWR checks bao gồm cả `response` và `response.data`?
- [ ] Unused config files đã được xóa?
- [ ] Environment variables có bao gồm `/api` suffix?

**Multi-Tenant & Security** (theo AGENTS.md):
- [ ] Queries không thiếu `organizationId` filter?
- [ ] Error responses follow `{code, message, details?, traceId}` format?
- [ ] Không hardcode business rules (dùng Settings service)?

### Trước khi commit

**Code Quality**:
- [ ] Run `pnpm test` (và `-- --runInBand` nếu cần)
- [ ] Run `pnpm lint`
- [ ] Run `pnpm build`
- [ ] Không có console.log debug statements

**Git Standards** (theo README.md Section 34):
- [ ] Không commit auto-generated files (`next-env.d.ts`, `.next/`, etc.)
- [ ] Commit message follow format: `type(scope): description`
- [ ] Branch naming: `feature/<module>-<feature>` hoặc `fix/<module>-<bug>`
- [ ] Code đã được test locally

**Documentation**:
- [ ] Update docs nếu behavior thay đổi
- [ ] Update README.md nếu thêm commands/env vars
- [ ] Update DEVELOPMENT_LESSONS_LEARNED.md nếu phát hiện pattern mới

---

## References

### Internal Documentation
- [AGENTS.md](./AGENTS.md) - How to work with agents on this project
- [docs/01_BUSINESS_LOGIC.md](./docs/01_BUSINESS_LOGIC.md) - Business rules and requirements
- [docs/03_DATABASE_SCHEMA.md](./docs/03_DATABASE_SCHEMA.md) - Database schema reference
- [docs/testing/Strategy-&-Coverage.md](./docs/testing/Strategy-&-Coverage.md) - Testing strategy

### Commit Standards
Follow the project's commit format:
```
type(scope): description

- Detail 1
- Detail 2

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types**: `feat`, `fix`, `docs`, `test`, `chore`, `refactor`, `perf`, `ci`

### Branch Naming
- `feature/<module>-<feature>` - New features
- `fix/<module>-<bug>` - Bug fixes
- `docs/<topic>` - Documentation updates

---

## Appendix: MEOW Template for PRs

When creating Pull Requests, use the MEOW format (from AGENTS.md):

**Mission**: Describe the requirement and goal
**Evidence**: Links to documentation read (Documentation Map anchors)
**Output**: Expected format (code, docs, PR notes)
**Warnings**: Constraints (multi-tenant, feature flags, error schema)

---

**Maintained By**: Development Team
**Last Updated**: 2025-11-16
