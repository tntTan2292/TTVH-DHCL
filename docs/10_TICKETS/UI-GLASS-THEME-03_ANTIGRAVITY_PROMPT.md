# UI-GLASS-THEME-03 — Prompt cho Antigravity (Gemini)

Dự án QIS V2, workspace `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`, nhánh `codex/da-impl-006`. Ticket song song `UI-GLASS-THEME-03` (Giai đoạn C của theme kính) — không trùng Current Ticket trong `PROJECT_SNAPSHOT.md` là bình thường, đọc thẳng manifest.

Đọc: `docs/10_TICKETS/UI-GLASS-THEME-03_MANIFEST.md` (phạm vi, ràng buộc, Required Reading). Đọc kỹ Mục 8-9 của `UI-GLASS-THEME-02_MANIFEST.md`: Opus đã tìm ra lỗi gì ở vòng trước.

**Mục tiêu:** làm nốt các trang còn giao diện cũ: nội dung **Bảng điều hành**, **Phân tích BCVH**, **Phân tích tuyến phát** (`RoutePerformancePage`), **Trung tâm nạp dữ liệu** (+ `AutoBackfill*`, `UploadWidget`) và thanh lọc trong `SharedLayout`. Nút, ô lọc, chọn tuần/tháng, tab, chip, popup/ngăn kéo, bảng (hover, dòng chọn), trạng thái tải/lỗi/rỗng phải có hover, nhấn, focus, disabled, loading mượt, "xịn xò", nhất quán với giai đoạn A/B. Ưu tiên đổi class; chỉ dùng control trong `components/ui` khi hành vi giống hệt. Toàn quyền sáng tạo trong Mục 3.

**Bắt buộc:** không đổi chức năng (Mục 4): logic, props, API, route, phân quyền; test cũ chạy nguyên không sửa; **không thêm hay đổi chữ hiển thị**. Rút kinh nghiệm review vòng trước: **khối báo cáo (thẻ, bảng, biểu đồ, thẻ KPI) nền đặc, không `backdrop-filter`/`backdrop-blur`, không nền trắng trong suốt**; không đặt blur/`transform`/`filter` lên tổ tiên của phần tử `position: fixed` (tooltip heatmap); không thêm blur lại vào thẻ dùng chung. Giữ chuẩn Report Block UI, màu họ chỉ số, đường mục tiêu, tiêu đề cột bấm để sắp xếp. Trung tâm nạp dữ liệu chỉ đổi style, giữ bố cục và mọi handler. **Không sửa `src/features/networkMap/*`.** Fallback phủ mọi lớp blur mới; ghi số lớp blur mỗi trang (≤ ~6, tính cả menu, topbar, thanh lọc, nền popup); không `transition: all`. Chạy `git status` trước; file nào đang bị phiên khác sửa dở thì để cuối và báo.

**Cấm:** mở browser, Playwright, chụp màn hình, chạy dev server, đăng nhập. Không tự tuyên bố PO UI PASS; dừng ở `READY FOR PO UI CHECK`. Commit theo pathspec, không `git add -A`; không đụng file ngoài ticket.

Hoàn tất: build + lint + test (thêm test khóa các ràng buộc ở Mục 6), cập nhật manifest Mục 7, báo cáo ngắn cho Claude/CTO kèm checklist PO ngắn.
