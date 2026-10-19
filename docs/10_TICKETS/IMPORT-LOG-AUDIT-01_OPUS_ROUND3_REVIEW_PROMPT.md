# IMPORT-LOG-AUDIT-01 vòng 3 — Prompt review độc lập cho Claude Code (Opus)

Dự án QIS V2, nhánh `codex/da-impl-006`. Bạn là reviewer độc lập: **không sửa code**, chỉ báo lỗi. Người làm: Antigravity, commit `00b83ae` (bố cục một dòng mỗi ngày); logic chọn ngày do Claude Code (Sonnet) ở `0b72343`.

Đọc: `docs/10_TICKETS/IMPORT-LOG-AUDIT-01_MANIFEST.md` Mục 9–12, rồi `git show 00b83ae` (chủ yếu `AutoBackfillSmartDayView.jsx`, `autoBackfillUiHelpers.js`, test).

**Soi kỹ:**
1. **Không đổi chức năng (Mục 12 guard):** không đổi API, payload, `getItemKey`, dạng trạng thái chọn, modal, handler; chỉ dùng prop sẵn có. Chế độ lọc một chỉ tiêu và bảng phẳng giữ nguyên hành vi.
2. **Đúng dữ liệu:** mỗi dòng ngày gộp đủ 4 chỉ tiêu × HUE/TCT; không gộp nhầm ngày hay chỉ tiêu; ô thiếu dữ liệu, ngày nghỉ/ngoại lệ, chỉ tiêu PAUSED, nguồn MANUAL_ONLY hiển thị đúng và không chọn được.
3. **Chọn:** tick một ô, tick cả ngày (`onSelectDayAllIndicators`), tick cả cột chỉ tiêu: trạng thái đủ / một phần / chưa đúng; chọn thêm ngày khác không làm mất ngày trước; Nhập mới và Nhập lại không lẫn chế độ; nút "Nhập mới + bù 2 ngày trước" và "Import cả ngày + bù 3 ngày" vẫn hoạt động; chỉ admin thấy thao tác.
4. **Tooltip "lần import cuối"** và nhãn trạng thái đúng nguồn, không lấy log của nguồn khác.
5. **Hiển thị:** từ 1280px trở xuống không tràn ngang; biến chưa khai báo (`oxlint -D no-undef` chỉ báo biến toàn cục trình duyệt); không mất phân trang, lọc "chỉ ngày còn thiếu", lọc tháng.
6. **Test:** test mới có khóa các điểm trên không (assert yếu, mock quá tay); test cũ chạy nguyên không sửa (`node --test` cho `autoBackfillAuditHelpers.test.js`, `AutoBackfillOperatorPanel.test.js`, `autoBackfillDayViewHelpers.test.js`).

**Cấm:** mở browser, Playwright, chụp màn hình, chạy dev server, đăng nhập.

**Báo cáo:** mỗi phát hiện ghi mức (blocker / nên sửa / ghi chú), `file:dòng`, kịch bản sai cụ thể; kết luận PASS hoặc FAIL. Không tự tuyên bố PO UI PASS.
