# AGENT WORKFLOW - Quy trình làm việc với AGENT

Tài liệu này định nghĩa quy trình làm việc tinh gọn giữa **Bạn** (người dùng) và **AGENT** (tôi), tập trung vào việc sử dụng `TASK_DATABASE.md` để theo dõi công việc chi tiết.

---

## 🎭 Vai trò

### Bạn (User)
- ✅ **Giao việc:** Cung cấp nhiệm vụ từ `ROADMAP.md`.
- ✅ **Review:** Xem xét code, kết quả kiểm thử, và phê duyệt.
- ✅ **Quyết định:** Đưa ra các quyết định về logic nghiệp vụ.

### AGENT (Tôi)
- ✅ **Phân tích:** Đọc và hiểu yêu cầu, phân tích mã nguồn.
- ✅ **Lập kế hoạch:** Trình bày kế hoạch thực thi chi tiết.
- ✅ **Thực thi & Kiểm thử:** Viết mã, sửa lỗi, và viết/chạy các bài kiểm thử.
- ✅ **Cập nhật & Báo cáo:** Ghi lại tiến trình vào `TASK_DATABASE.md` và báo cáo cho bạn.

---

## 🔄 Quy trình làm việc 5 bước tối ưu

### Bước 1: GIAO VIỆC (Bạn)
Bạn bắt đầu bằng cách chỉ định một `TASK-ID` từ `docs/reference/TASK_DATABASE.md`.

**Mẫu giao việc:**
```
Nhiệm vụ: [TASK-ID] - [Tên nhiệm vụ]
```

### Bước 2: LÊN KẾ HOẠCH (AGENT)
Tôi sẽ phân tích nhiệm vụ dựa trên `TASK-ID` đã cho.

1.  Mở `docs/reference/TASK_DATABASE.md` và tìm đến mục `[TASK-ID]`.
2.  Đọc kỹ phần **Vấn đề** và **Acceptance Criteria**.
3.  Đọc các tài liệu liên quan được liệt kê trong `📚 Business Logic liên quan`.
4.  Trình bày kế hoạch thực thi chi tiết.

### Bước 3: THỰC THI & KIỂM THỬ (AGENT)
Tôi sẽ viết mã và kiểm thử.

1.  Tạo một nhánh (branch) mới cho nhiệm vụ (ví dụ: `feature/ORD-010-fix-inventory-bug`).
2.  Viết hoặc sửa đổi mã nguồn.
3.  Viết kiểm thử (unit/integration test) song song.
4.  Chạy kiểm thử liên tục và **đảm bảo tất cả các bài kiểm thử đều PASS** trước khi kết thúc.
5.  Commit mã nguồn với một thông điệp rõ ràng, có chứa `TASK-ID`.

### Bước 4: BÁO CÁO & XIN REVIEW (AGENT)
Sau khi hoàn thành, tôi sẽ báo cáo và yêu cầu bạn review.

**Đầu ra của tôi:**
```
✅ Hoàn thành: [TASK-ID] - [Tên nhiệm vụ]

Các thay đổi:
- `apps/api/src/orders/orders.service.ts`
- `apps/api/src/inventory/inventory.service.ts`

Kết quả kiểm thử:
- `orders.service.spec.ts` ...... 2/2 tests passed

Mã nguồn đã sẵn sàng để bạn xem xét tại branch `feature/ORD-010-fix-inventory-bug`.
```

### Bước 5: CẬP NHẬT CƠ SỞ DỮ LIỆU NHIỆM VỤ (AGENT)
Đây là bước cuối cùng để ghi lại tiến trình một cách tập trung.

1.  **Cập nhật `ROADMAP.md`**: Thay đổi trạng thái chung của module nếu cần.
2.  **Cập nhật `docs/reference/TASK_DATABASE.md`**:
    *   Tìm đến mục `[TASK-ID]`.
    *   Thay đổi trạng thái của nhiệm vụ (ví dụ: `⏳ Todo` -> `🔄 In Progress` hoặc `🔄 In Progress` -> `✅ Completed`).
    *   **Thêm một mục log chi tiết vào cuối phần mô tả của nhiệm vụ đó.**

    **Mẫu cập nhật log trong `TASK_DATABASE.md`:**
    ```markdown
    - **Cập nhật [YYYY-MM-DD]:**
      - **Hành động:** Hoàn thành việc sửa lỗi [mô tả ngắn]. Tất cả các unit test liên quan đã pass.
      - **Commit:** `[link tới commit hoặc commit hash]`
      - **Trạng thái:** Chờ review.
    ```
3.  **Thông báo kết thúc:** "Tôi đã hoàn thành, cập nhật log công việc vào TASK_DATABASE và sẵn sàng cho chỉ dẫn tiếp theo."

---
Quy trình này đảm bảo tất cả thông tin về một nhiệm vụ được lưu trữ tại một nơi duy nhất (`TASK_DATABASE.md`), giúp việc theo dõi và bàn giao trở nên dễ dàng.
