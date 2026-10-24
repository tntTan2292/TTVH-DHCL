# RBAC-01-UI — Prompt cho Antigravity (Gemini)

Dự án QIS V2, workspace `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`, nhánh `codex/da-impl-006`. Ticket song song `RBAC-01-UI` (bước 2c của `RBAC-01`) — không trùng Current Ticket trong `PROJECT_SNAPSHOT.md` là bình thường, đọc thẳng manifest.

Đọc: `docs/10_TICKETS/RBAC-01-UI_MANIFEST.md` (hợp đồng API, phạm vi, ràng buộc) và `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md`.

**Mục tiêu:** backend đã phân quyền xong; làm giao diện theo `user.access`: trang Đổi mật khẩu lần đầu (bắt buộc), trang Quản lý người dùng của admin, menu và route theo quyền (thay `allowedRoles`), màn F1.1/F1.3/F4.1 cho người dùng chỉ thấy BCVH của mình (ô chọn BCVH giới hạn, ẩn các khối so sánh giữa BCVH, bảng chạy được khi backend không còn gửi dòng TỔNG CỘNG/thứ hạng), Hàng tồn theo các màn được phép (vẫn mở được danh sách bưu gửi từ "Theo bưu cục").

**Bắt buộc:** chỉ sửa frontend; không đổi backend/API. Logic quyền đặt trong một helper thuần có test; test cũ không bị làm yếu.

**Cấm:** mở browser, Playwright, chụp màn hình, chạy dev server, đăng nhập. Không tự tuyên bố PO UI PASS; dừng ở `READY FOR PO UI CHECK`. Commit theo pathspec, không `git add -A`; không đụng file ngoài ticket.

Hoàn tất: build + lint + test, ghi Mục 6 manifest, báo cáo ngắn cho Claude/CTO.
