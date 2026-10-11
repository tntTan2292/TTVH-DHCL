# UI-GLASS-THEME-02 — Prompt cho Claude Code (Opus), review độc lập

Dự án QIS V2, workspace `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`, nhánh `codex/da-impl-006`. Bạn là reviewer độc lập (Claude Code / Opus); bạn không viết và không từng review code này. Ticket song song `UI-GLASS-THEME-02` — không trùng Current Ticket trong `PROJECT_SNAPSHOT.md` là bình thường.

Đọc: `docs/10_TICKETS/UI-GLASS-THEME-02_MANIFEST.md` (Mục 3, 4, 6) và `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md`. Review commit `1262d13` so với `e1b0f8a`: `components/common/*`, `components/f13/{GlobalFilter,ExecutiveDailyBrief,RuleRecommendationPanel}.jsx`, `components/shared/SharedComponents.jsx`, `components/ui/*` (file mới Modal, Pagination, Tabs, Toggle, Tooltip), `features/ranking/RouteRankingPage.jsx`, `features/shipment/ShipmentEvidence{Summary,Detail}.jsx`, `index.css`, `pages/*` (Dashboard home, F11/F12/F13/F41 entry pages, KPI, System info, Unauthorized). Các file chưa commit khác trong cây làm việc (`DataImportCenter.jsx`, `UploadWidget.jsx`, `backend/*`, `networkMap/*`, tài liệu F12) là của phiên khác, không thuộc ticket này.

**Không đánh giá đẹp/xấu** (PO tự xem). **Câu hỏi:** thay đổi có thật sự chỉ là trình bày, và có phá thứ gì đang chạy không? Kiểm tra bằng diff, không tin báo cáo executor:

1. **Không đổi logic:** state, effect, handler, props, điều kiện hiển thị, API, route, phân quyền. `RouteRankingPage.jsx` (186 dòng đổi) và `GlobalFilter.jsx` (70 dòng đổi) cần đọc kỹ: bộ lọc, điều hướng, tham số URL, các nút có còn đúng handler/điều kiện disabled; import/biến/prop bị xóa nhầm hoặc chưa định nghĩa (chạy `oxlint -D no-undef` trên file đã sửa, bỏ qua cảnh báo `window`/`setTimeout` của cấu hình).
2. **Nút camera / khối báo cáo:** `backdrop-filter`, nền trong suốt hoặc class `glass*` có lọt vào cây con mà `blockCaptureHelper.js` chụp (khối báo cáo, bảng, thẻ KPI nằm trong khối) qua `Containers`, `SharedComponents`, `StateLayouts`, `SortableTh` hoặc selector chung không? Đặc biệt `SortableTh` (tiêu đề cột bấm để sắp xếp nằm trong khối báo cáo) và `SharedComponents` (thẻ KPI): nền còn đặc, chữ còn đọc, bấm sắp xếp còn chạy.
3. **Chuẩn Report Block UI:** màu họ chỉ số F1.1 xanh lá / F1.3 xanh dương / F4.1 cam, đường mục tiêu, tiêu đề bấm để sắp xếp, dải màu trạng thái không bị đè bởi màu theme.
4. **Bài học Giai đoạn A:** không có `transform` toàn cục hay `*` selector nguy hiểm; CSS component nằm trong `@layer components` (Tailwind utility còn thắng); fallback `@supports not (backdrop-filter)` và `prefers-reduced-transparency` phủ mọi lớp blur mới; số lớp blur mỗi trang ≤ 6, không animate blur; không `transition: all`.
5. **Thành phần mới (`components/ui`):** Modal (đóng bằng Esc/bấm nền, khóa cuộn, focus, `aria-*`), Tabs, Tooltip, Toggle, Pagination: có lỗi truy cập hoặc rò rỉ (listener không gỡ, portal) không; chưa trang nào dùng thì không ảnh hưởng, nhưng phải đúng khi dùng.
6. **Khoảng trống phạm vi (chỉ ghi nhận, không phải lỗi):** manifest Mục 3 liệt kê cả `features/dashboard`, `features/ranking` (BcvhRankingPage…), Trung tâm nạp dữ liệu và thanh lọc trong `SharedLayout`, nhưng commit không đụng tới. Ghi rõ phần nào chưa được áp theme.
7. **Test mới** thêm vào `glassTheme.test.js` có kiểm chứng thật không; test cũ không bị sửa; `package.json` không đổi; không `networkMap/*`, không `blockCaptureHelper.js`.

Chạy: toàn bộ frontend (kỳ vọng 651 + test mới, 0 fail), `reportBlockStandard.test.js`, `appNavigation.test.js`, build, lint. Không mở browser, Playwright, dev server hay đăng nhập.

Không sửa code, không commit. Báo cáo Technical Execution Report ngắn cho Claude/CTO: PASS/FAIL, từng phát hiện kèm file:dòng và kịch bản lỗi cụ thể, chặn/không chặn. Không tự tuyên bố PO UI PASS.
