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
