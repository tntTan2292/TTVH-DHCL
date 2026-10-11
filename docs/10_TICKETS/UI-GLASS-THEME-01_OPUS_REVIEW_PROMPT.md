# UI-GLASS-THEME-01 — Prompt cho Claude Code (Opus), review độc lập

Dự án QIS V2, workspace `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`, nhánh `codex/da-impl-006`. Bạn là reviewer độc lập (Claude Code / Opus); bạn không viết và không từng review code này. Ticket song song `UI-GLASS-THEME-01` — không trùng Current Ticket trong `PROJECT_SNAPSHOT.md` là bình thường.

Đọc: `docs/10_TICKETS/UI-GLASS-THEME-01_MANIFEST.md` (Mục 3, 4, 6) và `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md`. Review commit `8206eea` so với `4f79e20`: `index.css`, `App.css`, `components/ui/*`, `Sidebar.jsx`, `Topbar.jsx`, `shared/SharedLayout.jsx`, `layouts/Breadcrumb.jsx`, `pages/LoginPage.jsx`.

**Không đánh giá đẹp/xấu** (PO tự xem). **Câu hỏi:** thay đổi có thật sự chỉ là trình bày, và có phá thứ gì đang chạy không? Kiểm tra bằng diff, không tin báo cáo executor:

1. **Không đổi logic:** Sidebar/Topbar/SharedLayout/LoginPage — state, effect, handler, props, điều kiện hiển thị theo vai trò, link/route, `appNavigation.jsx` (diff phải rỗng), luồng đăng nhập/đăng xuất, thu gọn menu, breadcrumb. Tìm import/biến/prop bị xóa nhầm hoặc dùng chưa định nghĩa (lỗi từng gặp ở F11-DASHBOARD-UI-01); chạy `oxlint -D no-undef` trên file đã sửa.
2. **Nút camera / khối báo cáo:** lớp `.glass*`, `backdrop-filter` hoặc nền trong suốt có lọt vào cây con mà `blockCaptureHelper.js` chụp (khối báo cáo, thẻ, bảng) qua class toàn cục, `Card`, `Button`, `Badge` hay selector chung trong `index.css` không? Nền khối chụp có còn đặc và `html-to-image` có còn ra ảnh rõ không? Có selector toàn cục nào (`button`, `input`, `table`, `*`) đổi giao diện hay kích thước các khối báo cáo hiện có không.
3. **Chuẩn Report Block UI:** màu họ chỉ số (F1.1 xanh lá, F1.3 xanh dương, F4.1 cam), đường mục tiêu 95/90, chữ tiêu đề bấm để sắp xếp còn nguyên; token màu mới không đè các màu này.
4. **Phạm vi:** `src/features/networkMap/*` và `blockCaptureHelper.js` không có trong commit (các file bản đồ chưa commit của phiên khác không phải của ticket này).
5. **Hạ tầng theme:** có `@supports not (backdrop-filter)`, `prefers-reduced-transparency`, `prefers-reduced-motion`; số lớp blur toàn màn hình ≤ giới hạn Mục 4; không animate blur/`filter`; tương phản chữ ≥ 4,5:1 ở các trạng thái hover/disabled/focus của nút và ô nhập; `focus-visible` còn nhìn thấy; không font/CDN/dependency mới (`package.json` không đổi).
6. **Test mới** `glassTheme.test.js` có kiểm chứng thật hay chỉ khẳng định chuỗi dựng sẵn; test cũ không bị sửa.

Chạy: toàn bộ frontend (kỳ vọng 650/650), `reportBlockStandard.test.js`, `appNavigation.test.js`, `LoginPage.test.js`, build, lint. Không mở browser, Playwright, dev server hay đăng nhập.

Không sửa code, không commit. Báo cáo Technical Execution Report ngắn cho Claude/CTO: PASS/FAIL, từng phát hiện kèm file:dòng và kịch bản lỗi cụ thể, chặn/không chặn. Không tự tuyên bố PO UI PASS.
