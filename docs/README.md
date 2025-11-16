# MeoCRM Documentation Hub

Tất cả kiến thức nghiệp vụ/kỹ thuật của MeoCRM được phiên bản hóa tại thư mục `docs/`. Tài liệu luôn phản ánh **nguồn sự thật trên GitHub** (Notion chỉ là bản mirror đọc nhanh).

## How to Read This Docset
1. Mở **[Documentation Map](./Documentation-Map.md)** để thấy toàn bộ cấu trúc và link chính xác.
2. Theo thứ tự ưu tiên: **Settings & Feature Flags** → **Business Logic** → **Architecture** → **Integration** → **Testing / Environment**.
3. Khi thực thi task, luôn trích dẫn anchor (vd: `docs/01_BUSINESS_LOGIC.md#lead-priority`) trong PR/commit để giữ truy vết.

## Chuẩn lỗi hệ thống
- Mọi API/gateway/batch phải trả cùng schema:
  `{ "code": string, "message": string, "details"?: Record<string, unknown>, "traceId": string }`
- Không sử dụng biến thể khác (vd: `errorCode`, `msg`, …).
  Swagger/OpenAPI định nghĩa sẵn tại `components.schemas.Error` và client phải tái sử dụng.

## Định hướng Config-driven
- Quyết định #34–#48 được xem là **defaults**. Các con số/hành vi phải đọc từ Settings (hoặc Feature Flag tương ứng) theo precedence:
  `Default → Plan → Tenant → Branch → Role → User → Object`.
- Không hard-code vào codebase; docs phải nhắc rõ key nào, load ở đâu, fallback thế nào.
