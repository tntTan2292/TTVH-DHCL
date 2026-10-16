# IMPORT-LOG-AUDIT-01 — Prompt cho Antigravity (Gemini)

Dự án QIS V2, workspace `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`, nhánh `codex/da-impl-006`. Ticket song song `IMPORT-LOG-AUDIT-01` — không trùng Current Ticket trong `PROJECT_SNAPSHOT.md` là bình thường, đọc thẳng manifest.

Đọc: `docs/10_TICKETS/IMPORT-LOG-AUDIT-01_MANIFEST.md` — **Mục 3 (hợp đồng API, backend đã xong) và Mục 4 (việc của bạn)**.

**Mục tiêu** (Trung tâm Import Dữ liệu → "Bù dữ liệu tự động"):

1. Nút **"Import cả ngày + bù 3 ngày"** ở đầu cột/hàng của mỗi ngày D. Hộp xác nhận liệt kê 3 ngày (D, D-1, D-2), các chỉ tiêu F1.1/F1.2/F1.3/F4.1, hai nguồn HUE/TCT, số ô đã hoàn tất sẽ bị ghi đè (lấy từ dữ liệu coverage đang có trên màn hình), kèm ô tick đồng ý như luồng "Nhập lại". Gọi `POST /import/auto-backfill/runs` chỉ với `{ anchor_date }`; hiển thị `anchor.skipped` nếu có.
2. **Lịch sử import**: thêm cột Người thực hiện, Chế độ, Số dòng thay thế, giờ Việt Nam (`created_at_vn`); lọc theo ngày dữ liệu, chỉ tiêu, nguồn, người dùng; nguồn `GET /import/log`. Dòng cũ để trống ghi "chưa ghi nhận", không suy đoán.
3. Ô ngày × chỉ tiêu: tooltip "lần import cuối: giờ, người dùng, chế độ".

**Bắt buộc:** chức năng cũ giữ nguyên (API, payload, khóa chọn, modal, handler hiện có); logic mới đặt trong helper thuần (`autoBackfillUiHelpers.js` hoặc file mới) kèm test; test cũ chạy nguyên không sửa. Không sửa backend. Nút và lịch sử chỉ hiện với admin.

**Cấm:** mở browser, Playwright, chụp màn hình, chạy dev server, đăng nhập. Không tự tuyên bố PO UI PASS; dừng ở `READY FOR PO UI CHECK`. Commit theo pathspec, không `git add -A`; không đụng file ngoài ticket.

Hoàn tất: build + lint + test, cập nhật manifest Mục 4 trạng thái, báo cáo ngắn cho Claude/CTO.
