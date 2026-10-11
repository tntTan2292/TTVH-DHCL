# UI-GLASS-THEME-02 — Prompt cho Antigravity (Gemini)

Dự án QIS V2, workspace `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`, nhánh `codex/da-impl-006`. Ticket song song `UI-GLASS-THEME-02` (Giai đoạn B của UI-GLASS-THEME-01) — không trùng Current Ticket trong `PROJECT_SNAPSHOT.md` là bình thường, đọc thẳng manifest.

Đọc: `docs/10_TICKETS/UI-GLASS-THEME-02_MANIFEST.md` (phạm vi, ràng buộc, Required Reading).

**Mục tiêu:** Giai đoạn A đã làm khung (menu, topbar, đăng nhập, bộ control). Giờ áp theme kính sáng lên **nội dung các trang**: trước hết các thành phần dùng chung (thẻ KPI, khung trang, thanh lọc, trạng thái tải/lỗi/rỗng, tiêu đề cột), rồi các trang (Tổng quan, Bảng điều hành, Phân tích BCVH, Phân tích tuyến phát, Minh chứng, Trung tâm nạp dữ liệu, Cấu hình, Thông tin hệ thống). Dùng và mở rộng `src/components/ui/` (Tabs, Modal/Popover, Tooltip, Toggle, Pagination...). Nút, ô lọc, tab, popup, bảng phải có hover, nhấn, focus, disabled, loading mượt, "xịn xò", nhất quán với Giai đoạn A. Toàn quyền sáng tạo trong Mục 3.

**Bắt buộc:** không đổi chức năng (Mục 4): logic, props, API, route, phân quyền; test cũ chạy nguyên không sửa; giữ nguyên tên hiển thị tiếng Việt hiện tại. **Khối báo cáo giữ nền đặc, không `backdrop-filter`** (nút camera dùng `html-to-image`); giữ chuẩn Report Block UI, màu họ chỉ số, màu dải trạng thái, đường mục tiêu. **Không sửa `src/features/networkMap/*`.** Rút kinh nghiệm review Giai đoạn A: không đặt `transform` toàn cục; CSS component đặt trong `@layer components`; fallback phủ mọi lớp blur; đếm số lớp blur mỗi trang. Trung tâm nạp dữ liệu chỉ đổi style, giữ bố cục và chức năng vừa thiết kế lại.

**Cấm:** mở browser, Playwright, chụp màn hình, chạy dev server, đăng nhập. Không tự tuyên bố PO UI PASS; dừng ở `READY FOR PO UI CHECK`. Commit theo pathspec, không `git add -A`; không đụng file ngoài ticket (có file của phiên khác đang sửa dở).

Hoàn tất: build + lint + test, cập nhật manifest Mục 7, báo cáo ngắn cho Claude/CTO kèm checklist PO ngắn.
