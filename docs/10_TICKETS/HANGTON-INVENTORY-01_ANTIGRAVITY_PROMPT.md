# HANGTON-INVENTORY-01 — Prompt cho Antigravity (Gemini)

Dự án QIS V2, workspace `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`, nhánh `codex/da-impl-006`. Ticket song song `HANGTON-INVENTORY-01` — không trùng Current Ticket trong `PROJECT_SNAPSHOT.md` là bình thường, đọc thẳng manifest.

Đọc: `docs/10_TICKETS/HANGTON-INVENTORY-01_MANIFEST.md` — **Mục 5 (hợp đồng API đã xong và màn hình cần làm)**, và `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md`.

**Mục tiêu:** menu mới "Chỉ số rà soát Hàng tồn" (cuối nhóm Quản lý chất lượng, route `/hangton`) với 4 tab: Tổng quan, Theo bưu cục, So sánh hai mốc, Chi tiết, đúng Mục 5.

**Bắt buộc:** chỉ làm frontend, dùng đúng các API `/api/hangton/*`; không sửa backend. Màu ĐỎ đậm dần theo `Loại Tồn`; không tự đặt ngưỡng cảnh báo bằng số. Mỗi số liệu thuộc một snapshot (ngày + khung giờ), không gộp các khung. Logic tính toán/định dạng đặt trong helper thuần kèm test; test cũ giữ nguyên, trừ test thanh điều hướng được thêm mục thứ 5 như Mục 5 nêu.

**Cấm:** mở browser, Playwright, chụp màn hình, chạy dev server, đăng nhập. Không tự tuyên bố PO UI PASS; dừng ở `READY FOR PO UI CHECK`. Commit theo pathspec, không `git add -A`; không đụng file ngoài ticket.

Hoàn tất: build + lint + test, cập nhật manifest (thêm Mục 6 kết quả phase 3), báo cáo ngắn cho Claude/CTO.
