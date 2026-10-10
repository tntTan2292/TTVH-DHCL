# UI-IMPORT-DAYVIEW-01 — Prompt cho Claude Code (Opus), review độc lập

Dự án QIS V2, workspace `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`, nhánh `codex/da-impl-006`. Bạn là reviewer độc lập (Claude Code / Opus); bạn không viết và không từng review code này. Ticket song song `UI-IMPORT-DAYVIEW-01` — không trùng Current Ticket trong `PROJECT_SNAPSHOT.md` là bình thường.

Đọc: `docs/10_TICKETS/UI-IMPORT-DAYVIEW-01_MANIFEST.md` (đặc biệt Mục 3, 4, 5). Review commit `0f2bf21` so với `8e03add`: `AutoBackfillOperatorPanel.jsx`, `autoBackfillUiHelpers.js`, `autoBackfillDayViewHelpers.test.js`.

**Câu hỏi duy nhất:** thay đổi có thật sự chỉ là trình bày, không làm đổi hành vi nào không? Kiểm tra bằng diff, không tin báo cáo của executor:

1. Mục 4 manifest (cấm đổi): `getItemKey`, `isSelectable`, `isReimportSelectable`, `buildRunPayload`, API/payload, hai tập `selectedBulkKeys`/`selectedReimportKeys` và việc loại trừ lẫn nhau, mọi modal/handler, `groupItemsByIndicatorAndMonth`, chế độ "Bảng Chi tiết".
2. Ô tick ngày: ngày lẫn trạng thái (COMPLETED + INCOMPLETE), chế độ reimport, ngày LỊCH NGHỈ/EXCLUDED, lọc một nguồn — khóa chọn có đúng như chọn từng dòng cũ không.
3. Mọi nút cũ (Nhập mới, Nhập lại, LỊCH NGHỈ, Thu hồi, Xác nhận Không phát sinh, Hoàn tác) còn đủ điều kiện hiển thị và tham số như trước; LỊCH NGHỈ một lần/ngày truyền đúng item.
4. Import/biến bị xóa nhầm (lỗi kiểu F11-DASHBOARD-UI-01), chữ "N ngày (M nguồn)" khớp số khóa thật, test mới có thật sự kiểm chứng.

Chạy: test `AutoBackfillOperatorPanel.test.js`, `autoBackfillDayViewHelpers.test.js`, toàn bộ frontend (chỉ `dataImportBackfillQueue.test.js` được phép fail sẵn), build, lint. Không mở browser, Playwright, dev server hay đăng nhập.

Không sửa code, không commit. Báo cáo Technical Execution Report ngắn cho Claude/CTO: PASS/FAIL, từng phát hiện kèm file:dòng và kịch bản lỗi cụ thể, mức chặn/không chặn. Không tự tuyên bố PO UI PASS.

---

# Vòng 2 — review độc lập bản thiết kế lại (commit `5ff1d60`)

Dự án QIS V2, nhánh `codex/da-impl-006`. Bạn là reviewer độc lập (Claude Code / Opus), chưa từng viết hay review code này. Ticket song song `UI-IMPORT-DAYVIEW-01` — không trùng Current Ticket trong `PROJECT_SNAPSHOT.md` là bình thường.

Đọc: `docs/10_TICKETS/UI-IMPORT-DAYVIEW-01_MANIFEST.md` Mục 4 (hard guard) và Mục 9 (vòng 2, Antigravity được tự do bố cục). Review `db0df1f..5ff1d60`: `AutoBackfillOperatorPanel.jsx`, file mới `AutoBackfillIndicatorMatrix.jsx` và `AutoBackfillSmartDayView.jsx`, `autoBackfillUiHelpers.js`, `autoBackfillDayViewHelpers.test.js`.

**Không đánh giá đẹp/xấu** (PO tự xem). **Câu hỏi duy nhất:** bố cục mới có làm mất hoặc đổi chức năng nào không? Kiểm tra bằng diff, không tin báo cáo executor:

1. Mục 4 manifest: API/payload, `getItemKey`, `isSelectable`, `isReimportSelectable`, `buildRunPayload`, hai tập `selectedBulkKeys`/`selectedReimportKeys` và việc loại trừ lẫn nhau, mọi modal/handler, `handleSelectAll*`, "Bảng Chi tiết". Xem kỹ ~190 dòng bị xóa/sửa trong panel: có import, state, effect hay handler bị xóa nhầm không (lỗi từng gặp ở F11-DASHBOARD-UI-01).
2. Mọi thao tác cũ còn làm được từ giao diện mới, đúng điều kiện và tham số: Nhập mới, Nhập lại, chọn theo ngày/theo nguồn, chọn tất cả chưa hoàn tất / chọn tất cả (tái nhập), LỊCH NGHỈ + Thu hồi, Xác nhận Không phát sinh + Hoàn tác, lịch sử ngoại lệ, các modal xác nhận hàng loạt. Liệt kê thao tác nào mất hoặc chỉ còn truy cập được ở chế độ khác.
3. **Rủi ro riêng của thiết kế mới:** (a) nút chọn ở ma trận chỉ tiêu (`onSelectAllUnfinished(ind.code)`) — phạm vi tháng/nguồn có đúng như người dùng hiểu, có tôn trọng bộ lọc nguồn không; (b) tab chỉ tiêu, nút tháng, "Chỉ ngày còn thiếu", phân trang chỉ lọc hiển thị — khóa đã chọn bị ẩn bởi bộ lọc/trang vẫn nằm trong tập chọn và sẽ bị gửi khi xác nhận: thanh nổi và modal có hiển thị đúng số/danh sách thật không; (c) chế độ tái nhập vs chế độ thường vẫn loại trừ nhau trên mọi đường chọn mới; (d) ngày thiếu một nguồn hoặc nguồn bị lọc.
4. Test mới có kiểm chứng thật hay chỉ kiểm hàm thuần dựng sẵn; test cũ không bị sửa.

Chạy: `AutoBackfillOperatorPanel.test.js`, `autoBackfillDayViewHelpers.test.js`, toàn bộ frontend, build, lint. Không mở browser, Playwright, dev server hay đăng nhập.

Không sửa code, không commit. Báo cáo Technical Execution Report ngắn cho Claude/CTO: PASS/FAIL, từng phát hiện kèm file:dòng và kịch bản lỗi cụ thể, chặn/không chặn. Không tự tuyên bố PO UI PASS.
