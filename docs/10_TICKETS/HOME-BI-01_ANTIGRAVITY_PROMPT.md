# HOME-BI-01 — Prompt cho Antigravity (U1; backend B1 đã xong, commit d9998ce)

Dự án QIS V2, workspace `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`, nhánh `codex/da-impl-006`. Ticket song song `HOME-BI-01` — không trùng Current Ticket trong `PROJECT_SNAPSHOT.md` là bình thường, đọc thẳng manifest.

Đọc: `docs/10_TICKETS/HOME-BI-01_MANIFEST.md` (phạm vi Mục 3, quyết định Mục 4, API đã có sẵn ở Mục 7: `/api/home/executive`, `/api/home/national-ranking`; không tự tính lại số liệu). Bắt buộc theo `report_block_ui_standard.md` cho mọi khối.

**Mục tiêu:** làm Trang chủ điều hành (`/`) cho lãnh đạo: tỷ lệ chất lượng hiện tại và vị thứ toàn quốc của F1.1, F1.2, F1.3, F4.1. Nội dung bắt buộc nằm ở Mục 3 manifest; **bố cục, cách trình bày, kiểu biểu đồ và thẩm mỹ do bạn toàn quyền sáng tạo** (miễn đúng chuẩn khối báo cáo và token hiện có). Điều lãnh đạo nhìn thấy đầu tiên phải là tỷ lệ và vị thứ.

**Lưu ý đã chốt:** thẻ dùng `rate`, dòng Huế trong bảng 34 tỉnh là số "theo báo cáo toàn quốc" (Mục 7.4, đừng trộn hai số); mỗi thẻ ghi `data_date` riêng; mỗi chỉ tiêu một thước đo riêng — không so sánh hay cộng gộp giữa các chỉ tiêu; mỗi thẻ chỉ một ngưỡng, không ghi nhãn giờ; mục tiêu đọc từ `indicatorConfig.js`.

**Cấm:** mở browser, Playwright, chụp màn hình, chạy dev server, đăng nhập. Chỉ frontend, không đổi hành vi F1.x. Dừng ở `READY FOR PO CHECK`; commit theo pathspec.

Hoàn tất: build + lint + test xanh, cập nhật manifest, báo cáo ngắn kèm checklist PO.
