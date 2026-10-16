# IMPORT-LOG-AUDIT-01 — Prompt review độc lập cho Claude Code (Opus)

Dự án QIS V2, workspace `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`, nhánh `codex/da-impl-006`. Bạn là reviewer độc lập: **không sửa code**, chỉ báo lỗi. Người làm: Claude Code/Sonnet (backend `a524cf6`) và Antigravity (màn hình `f0f7ccf`).

Đọc: `docs/10_TICKETS/IMPORT-LOG-AUDIT-01_MANIFEST.md`, rồi `git show a524cf6 f0f7ccf`.

**Quyết định PO cần giữ:** chỉ tiêu F1.1/F1.2/F1.3/F4.1; "bù 3 ngày" = D, D-1, D-2 (3 ngày, không D-3); ngày đã hoàn tất bị ghi đè sau một lần xác nhận như Nhập lại.

**Soi kỹ:**
1. `createAnchorRun` (`autoBackfillQueueService.js`): đúng 3 ngày; vẫn chặn ngày nghỉ/ngoại lệ, nguồn MANUAL_ONLY, chỉ tiêu PAUSED, ngày tương lai, không-admin; không phá luồng `createRun` cũ (cửa sổ làm mới, Nhập lại); `requestKey`/trùng job; `forceReimport` đúng ô; tối đa 24 job.
2. Ngữ cảnh audit (`importLogAudit.js`, AsyncLocalStorage): có thất lạc qua await/executor/giao dịch không; mọi chỗ ghi `import_log` (kể cả FAILED) đều gắn actor/run/job/mode; DB chưa migrate vẫn ghi được; `replaced_row_count` đúng.
3. Migration chỉ thêm cột, chạy lặp được; `GET /import/log`: chỉ admin, lọc/phân trang, SQL tham số hóa, giờ Việt Nam đúng.
4. Màn hình: payload chỉ `{ anchor_date }`; hộp xác nhận bắt buộc tick; số ô ghi đè khớp coverage; chỉ admin thấy; dòng log cũ "chưa ghi nhận" không suy đoán; chức năng cũ (chọn nhiều, Nhập lại, modal) không đổi; biến chưa khai báo (no-undef).
5. Test: có che lỗi thật không (assert yếu, mock quá tay).

**Cấm:** mở browser, Playwright, chụp màn hình, chạy dev server, đăng nhập. Test chạy theo file: `node --test --experimental-sqlite`; hai lỗi `test_f11ImportPipeline.js` đã biết, không thuộc ticket.

**Báo cáo:** mỗi phát hiện ghi mức (blocker / nên sửa / ghi chú), `file:dòng`, kịch bản sai cụ thể. Kết luận PASS hoặc FAIL. Không tự tuyên bố PO UI PASS.
