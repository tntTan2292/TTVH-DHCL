# UI-IMPORT-BULK-ITEMS-01 — Prompt cho Antigravity (Gemini)

Dự án QIS V2, workspace `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`, nhánh `codex/da-impl-006`. Việc nhỏ nối tiếp `UI-IMPORT-PROCESS-LOG-01`: **chỉ làm sau khi ticket đó đã xong và commit** (cả hai cùng sửa `AutoBackfillOperatorPanel.jsx`, không làm song song). Đọc manifest `docs/10_TICKETS/UI-IMPORT-PROCESS-LOG-01_MANIFEST.md` **Mục 6** (hợp đồng API, backend đã xong).

**Vấn đề:** hai nút chọn hàng loạt "Nhập mới N ngày" (`handleExecuteBulkNewImport`) và "Nhập lại N ngày" (`handleExecuteBulkReimport`) đang gọi `POST /import/auto-backfill/runs` **một lần cho mỗi ô**, tạo hàng trăm tiến trình một job.

**Việc cần làm:**
1. Mỗi nút gửi **một yêu cầu duy nhất**: `{ items: [{ indicator, lane, business_date }, ...] }`, Nhập lại thêm `confirm_replace_completed: true`. Tối đa 1000 ô, nếu nhiều hơn chia thành các yêu cầu 1000 ô.
2. Hiển thị kết quả từ `data.bulk`: số ô đã tạo (`job_count`, `new_count`, `replace_count`), số ô bị bỏ qua vì đã có job đang mở (`skipped_open_conflicts`), và danh sách `bulk.skipped` (ngày, chỉ tiêu, nguồn, lý do dịch sang tiếng Việt; lý do lạ hiện nguyên mã). Giữ chức năng đóng hộp, xóa lựa chọn và toast như hiện nay khi thành công.
3. Lỗi `AUTO_BACKFILL_BULK_CONFIRM_REQUIRED` (409) hiển thị rõ; giữ ô tick xác nhận hiện có.
4. Logic dựng payload và dịch lý do đặt trong helper thuần có test.

**Bắt buộc:** không đổi nút, modal, khóa chọn, trạng thái chọn và các luồng khác (nhập lại một ô, bù 3 ngày, `buildRunPayload` vẫn giữ cho luồng một ô). Test cũ chạy nguyên không sửa. Chuỗi chữ mới đúng tên chính thức.

**Cấm:** browser, Playwright, chụp màn hình, dev server, đăng nhập. Dừng ở `READY FOR PO UI CHECK`. Commit theo pathspec.

Hoàn tất: build + lint + test, cập nhật manifest Mục 6, báo cáo ngắn cho Claude/CTO.
