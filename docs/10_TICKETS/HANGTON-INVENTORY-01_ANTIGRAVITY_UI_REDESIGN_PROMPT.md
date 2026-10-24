# HANGTON-INVENTORY-01 — Prompt cho Antigravity: làm lại trang Tổng quan và các biểu đồ

Dự án QIS V2, workspace `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`, nhánh `codex/da-impl-006`. Ticket song song `HANGTON-INVENTORY-01` — không trùng Current Ticket trong `PROJECT_SNAPSHOT.md` là bình thường, đọc thẳng manifest.

Đọc: `docs/10_TICKETS/HANGTON-INVENTORY-01_MANIFEST.md` — **Mục 16 (brief giao diện)**, và `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md`.

**Mục tiêu:** PO chưa hài lòng với tab **Tổng quan** (biểu đồ cột chồng theo nhóm KH khó đọc, phí diện tích khi xem 90%, chưa đủ "thông minh"). Hãy xem lại toàn bộ trang và biểu đồ, **tự đề xuất giao diện** phù hợp nhất cho người điều hành (tồn nặng ở đâu, nhóm KH nào, bưu cục nào, biến động so với mốc trước, xử lý gì trước), rồi làm lại. Được tự do chọn kiểu biểu đồ và bố cục.

**Bắt buộc:** chỉ dùng dữ liệu các API `/api/hangton/*` đã có, không sửa backend (thiếu dữ liệu thì nêu trong báo cáo); chọn nhóm KH và mức tồn phải đổi biểu đồ ngay; giữ quyết định PO trong Mục 16 (màu đỏ đậm dần, mục tiêu ≥5 ngày = 0, mặc định biểu đồ từ ≥3 ngày, chữ không nhỏ hơn 12 px, camera mọi khối); các tab khác không đổi; test cũ chạy nguyên, logic mới đặt trong helper thuần kèm test.

**Cấm:** mở browser, Playwright, chụp màn hình, chạy dev server, đăng nhập. Không tự tuyên bố PO UI PASS; dừng ở `READY FOR PO UI CHECK`. Commit theo pathspec, không `git add -A`; không đụng file ngoài ticket.

Hoàn tất: đề xuất ngắn trước khi làm; build + lint + test; cập nhật manifest Mục 17; báo cáo ngắn cho Claude/CTO.
