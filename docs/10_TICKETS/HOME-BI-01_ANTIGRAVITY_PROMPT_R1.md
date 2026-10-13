# HOME-BI-01 — Prompt sửa vòng 1 cho Antigravity

Dự án QIS V2, workspace `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`, nhánh `codex/da-impl-006`. Ticket song song `HOME-BI-01` (U1 đã giao, đang vòng sửa).

Đọc: `docs/10_TICKETS/HOME-BI-01_MANIFEST.md` **Mục 8** (5 lỗi cần sửa kèm tệp và số liệu thật) và `report_block_ui_standard.md`.

**Mục tiêu:** sửa đúng 5 lỗi ở Mục 8 trên Trang chủ điều hành (tên chỉ tiêu sai trong phụ đề; trục biểu đồ xu hướng cắt mất số liệu; màu tỷ lệ bảng 34 tỉnh phải dùng bộ màu dùng chung theo dải của từng chỉ tiêu; thiếu dữ liệu hiện "—" thay vì 0/"Giữ hạng"; thẻ chỉ tiêu bị chật) cùng các điểm nhỏ cuối mục. Cách bố trí thẻ do bạn tự quyết.

**Cấm:** mở browser, Playwright, chụp màn hình, chạy dev server, đăng nhập; đổi backend hoặc hành vi F1.x. Dừng ở `READY FOR PO CHECK`; commit theo pathspec.

Hoàn tất: build + lint + test xanh, thêm test cho lỗi 2, 3, 4, ghi tóm tắt vào manifest Mục 8, báo cáo ngắn.
