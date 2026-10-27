# AUTO-BACKFILL-QUEUE-UI-01 – Màn "Tất cả tiến trình đang mở" (Antigravity)

Dán nguyên văn cho Antigravity. Chỉ sửa giao diện; backend đã xong (commit kèm file này).

---

Sửa khối "Tất cả tiến trình đang mở" trong `frontend/src/components/AutoBackfillOperatorPanel.jsx` (logic tính ở `autoBackfillUiHelpers.js`, `summarizeOpenRuns`) cho người dùng không chuyên đọc được. Hiện mọi dòng ghi RUNNING (vì tiến trình RUNNING), nên không biết ngày nào đang chạy, ngày nào chờ. Không mở trình duyệt, không chụp ảnh, không chạy dev server, không đăng nhập. Commit theo pathspec chỉ file bạn sửa.

Dữ liệu: `GET /import/auto-backfill/runs?limit=500`. Mỗi run có `jobs[]`; mỗi job có `state` (RUNNING = đang chạy thật; QUEUED = chờ), `safety_state` (WAITING_AUTH = chờ đăng nhập), `business_date`, `started_at`, `next_attempt_at` (có giá trị = chờ thử lại), `last_error_signature`. Backend chưa khởi động lại nên dùng dữ liệu giả trong test.

Yêu cầu:
1. Bốn ô đếm trên cùng đếm **job** theo trạng thái thật: Đang chạy / Đang chờ / Chờ thử lại / Chờ đăng nhập (kèm số theo HUE, TCT). Không đếm run.
2. Mỗi nguồn (HUE, TCT) một dòng đầu: "Đang chạy ngày dd/mm/yyyy từ hh:mm (x phút) · còn N ngày chờ". Không có job chạy thì ghi lý do (chờ đăng nhập, tạm dừng, hết hàng chờ).
3. Danh sách dưới gom theo trạng thái, mặc định chỉ mở nhóm "Đang chạy" và "Chờ thử lại / Chờ đăng nhập"; nhóm "Đang chờ" thu gọn, hiển thị dạng dải ngày (ví dụ "26/06 → 01/01, 171 ngày").
4. Dòng một ngày: chỉ tiêu · nguồn · ngày · nhãn trạng thái tiếng Việt · lý do ngắn (dùng `jobErrorText` cho `last_error_signature`; "Thử lại lúc hh:mm" cho `next_attempt_at`).
5. Bỏ "Hiển thị 50/172": nhóm thu gọn thay cho việc cắt 50.

Thêm test cho phần tính toán (đếm job, dải ngày, nhóm rỗng). Chạy build và `node --test` cho file test của panel; báo kết quả thật, dừng ở `READY FOR PO CHECK`.
