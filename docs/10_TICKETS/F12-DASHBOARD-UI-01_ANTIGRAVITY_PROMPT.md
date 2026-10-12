# F12-DASHBOARD-UI-01 — Prompt cho Antigravity (Gemini)

Dự án QIS V2, workspace `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`, nhánh `codex/da-impl-006`. Ticket song song `F12-DASHBOARD-UI-01` — không trùng Current Ticket trong `PROJECT_SNAPSHOT.md` là bình thường, đọc thẳng manifest.

Đọc: `docs/10_TICKETS/F12-DASHBOARD-UI-01_MANIFEST.md` (phạm vi, Required Reading; API ở manifest backend Mục 4). Bắt buộc theo `report_block_ui_standard.md` cho mọi khối.

**Mục tiêu:** màn hình F1.2 Thu gom liên tỉnh: Bảng điều hành và Xếp hạng theo đơn vị chấp nhận (khai báo qua `F12_INDICATOR`, dùng lại khối F4.1/F1.1), cộng hai khối mới: **Đơn vị/Bưu cục chấp nhận** (đơn vị → bưu cục, ngày/tuần/tháng, Khách hàng lớn hiện riêng, không xếp hạng) và **Lũy kế 12 tháng** (cột + đường tỷ lệ, vạch mục tiêu 95 %, vị thứ toàn quốc từng tháng, bảng đơn vị). Họ màu xanh ngọc nhạt; ngưỡng màu như F1.3.

**Bắt buộc:** chỉ frontend; không đổi hành vi F1.1/F1.3/F4.1, test cũ chạy nguyên. Mỗi khối có nút máy ảnh, tiêu đề cột bấm để sắp xếp, vạch mục tiêu, theo bộ lọc ngày, và chạy kiểm tra định danh chưa khai báo trước khi bàn giao.

**Cấm:** mở browser, Playwright, chụp màn hình, chạy dev server, đăng nhập. Không tự tuyên bố PO UI PASS; dừng ở `READY FOR PO CHECK`. Commit theo pathspec, không `git add -A`.

Hoàn tất: build + lint + test xanh, cập nhật manifest, báo cáo ngắn cho Claude/CTO kèm checklist PO ngắn.
