# F42-DASHBOARD-UI-01 — Prompt cho Antigravity (giai đoạn A+B)

Dự án QIS V2, workspace `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`, nhánh `codex/da-impl-006`. Ticket song song `F42-DASHBOARD-UI-01` — không trùng Current Ticket trong `PROJECT_SNAPSHOT.md` là bình thường, đọc thẳng manifest.

Đọc: `docs/10_TICKETS/F42-DASHBOARD-UI-01_MANIFEST.md` (phạm vi giai đoạn A+B, Required Reading; API ở manifest backend Mục 4). Bắt buộc theo `report_block_ui_standard.md` cho mọi khối.

**Mục tiêu:** màn hình F4.2 Chất lượng phát giao bưu tá. Giai đoạn A: khai báo `F42_INDICATOR` (mục tiêu 90 %, **bậc màu 90/80/70 — PO chốt**, họ màu nhạt riêng do Antigravity chọn), hai trang bọc mỏng, đường dẫn, menu, F4.2 trong trang quản lý người dùng, dùng lại các khối F4.1, thêm dải "6 BCVH hôm nay". Giai đoạn B: khối **Bưu tá theo BCVH** (ngày/tuần/tháng, mở từng BCVH ra danh sách bưu tá, tìm kiếm, lọc dưới 90 %) và khối **Bưu tá cần chú ý**.

**Bắt buộc:** chỉ frontend; không đổi hành vi F1.1/F1.2/F1.3/F4.1, test cũ chạy nguyên. Mỗi khối có nút máy ảnh, tiêu đề cột bấm để sắp xếp, vạch mục tiêu, theo bộ lọc ngày, và chạy kiểm tra định danh chưa khai báo trước khi bàn giao. Không tự tính tổng hay hạng chéo BCVH ở client.

**Cấm:** mở browser, Playwright, chụp màn hình, chạy dev server, đăng nhập. Không tự tuyên bố PO UI PASS; dừng ở `READY FOR PO CHECK`. Commit theo pathspec, không `git add -A`.

Hoàn tất: build + lint + test xanh, cập nhật manifest, báo cáo ngắn cho Claude/CTO kèm checklist PO ngắn.
