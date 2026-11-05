# IMPORT-STUCK-RUN-01 — Lần nạp lại F1.1 bị kẹt, ngày 21/07 mất, màn hình đếm sai

Trạng thái: IMPLEMENTED / TECH PASS (2026-11-04). Người làm: Claude Code (Sonnet 5.5). Chờ Opus review. Không đổi Current Ticket, API, công thức KPI hay cấu trúc cơ sở dữ liệu.

## 1. Sự cố (lần nạp lại F1.1 của admin, 03/11, 01/01 → 22/10, hai kênh)

- 568 / 577 ngày xong. 8 ngày HUE (01/01–08/01) không chạy tiếp, 1 ngày TCT (21/07) lỗi cuối, màn hình báo "577 ngày đang chờ", và không có nút nào gỡ được.

## 2. Nguyên nhân (đã đối chiếu dữ liệu thật, chỉ đọc)

1. **Cầu dao đóng nhưng cờ còn:** 13:09 ngày 03/11 cổng báo quá giờ 3 lần, cầu dao mở và `CIRCUIT_OPEN` ghi lên cầu dao, lần chạy và 8 job. 07:32 ngày 04/11 lần nạp tự động của scheduler thành công trên cùng cầu dao, `recordCircuitSuccess` chỉ đóng bản ghi cầu dao, không xóa cờ trên job và lần chạy. Worker chỉ nhận job có `safety_state` rỗng; nút "Reset cầu dao" bị backend từ chối (409, không có cầu dao nào mở); nút "Tiếp tục Run" chỉ hiện khi lần chạy ở `PAUSED` / `WAITING_AUTH`.
2. **21/07 TCT:** `page.goto: net::ERR_HTTP2_PROTOCOL_ERROR` (cổng ngắt kết nối khi mở trang báo cáo, chưa đọc dữ liệu nào). Lỗi không có mã nên rơi vào loại `SYSTEM`, không thử lại, chết sau 1 lần.
3. **577 đang chờ:** `listRuns` trả mọi job của lần chạy (cả đã xong); `classifyJobRealState` xếp mọi trạng thái khác `RUNNING` / `RETRY_WAIT` vào "Đang chờ".

## 3. Sửa

- `autoBackfillQueueStore.recordCircuitSuccess`: khi đóng cầu dao cũng xóa `CIRCUIT_OPEN` trên các job cùng cầu dao và trên lần chạy không còn job nào bị cờ.
- `autoBackfillSafetyCoordinator.classify`: lỗi `net::ERR_*` (trừ `ERR_ABORTED`) khi chưa có nhãn → `TRANSIENT` (thử lại trong ngân sách của kênh, tính vào cầu dao).
- Giao diện: job `SUCCESS` / `SKIPPED_ALREADY_SUCCESS` / `CANCELLED` không còn tính là đang chờ; job `FAILED_TERMINAL` thành nhóm riêng "Lỗi, không tự thử lại" (chỉ hiện khi có).
- Dữ liệu (một lần, backend dừng): gỡ cờ 8 job + lần chạy 905eda67; xếp hàng lại F1.1 TCT 21/07 (lần chạy 59aa00f8, actor `claude-code`).

## 4. Kiểm tra

- Backend `test_autoBackfillFailureAndBulk.js` 9/9 (thêm ca phân loại lỗi mạng và ca xóa cờ khi đóng cầu dao); frontend toàn bộ 903/903, `vite build` OK.

## 4b. Opus review (2026-11-05) và xử lý

- C1 + N6: cầu dao đang mở không bị ghi đè thành đóng khi gặp chữ ký lỗi khác; hàm dọn cờ mồ côi `releaseOrphanCircuitFlags` chạy khi có thành công, khi worker nhận job, khi "Tiếp tục Run" và khi "Reset cầu dao" (reset không còn 409 vì cờ mồ côi).
- N1: 5xx cổng, ECONNRESET, socket hang up, trang bị đóng, quá giờ điều hướng, HUE_BROKER_UNREACHABLE, DOWNLOAD_NOT_STABLE thành TRANSIENT; ERR_CERT_*/ERR_BLOCKED_BY_CLIENT không thử lại; SESSION_PENDING_HUMAN_ACTION và DKCL_SOURCE_OPERATION_ACTIVE không tính vào cầu dao.
- N2: lượt bị ngắt do khởi động lại (LEASE_EXPIRED) không tính vào ngân sách thử.
- N3/N4/N5: job đã xong xếp trước cờ của lần chạy; trạng thái riêng "Cầu dao mở"; kênh chỉ còn ngày lỗi hiện "Hết hàng chờ"; lần chạy tính theo trạng thái của chính nó và kênh bị chặn theo job mang cờ.
- Tests: backend FailureAndBulk 11/11, các bộ auto-backfill khác không đổi (CoverageController 1 lỗi có sẵn trước thay đổi); frontend 903/903 + khối 29, oxlint không lỗi mới, vite build OK.
- C2: thêm `POST /import/auto-backfill/runs/:runId/cancel` (admin) và nút "Hủy lần chạy" (lần chạy BLOCKED_INTEGRITY hoặc PAUSED): ngày chưa chạy thành CANCELLED, lần chạy CANCELLED, mở khóa kênh; từ chối khi còn ngày đang chạy.
- N7: cờ WAITING_AUTH của lần chạy không còn chặn cả lần chạy; kênh chờ đăng nhập vẫn bị giữ theo cờ của job, kênh kia chạy tiếp (BLOCKED_INTEGRITY vẫn dừng cả lần chạy).
- Chưa làm (ghi nhận nhỏ): `resolveRecovery` PAUSING→PAUSED, scheduler trùng ngày với lần chạy kẹt, mã thừa `handleResumeRunFromList`.

## 5. Còn lại

- Opus review: tìm lỗi cùng họ (trạng thái cờ không đồng bộ, lỗi mạng bị xếp nhầm loại, màn hình đếm sai).
- "Giờ BĐ10 đến BCVH" (`thoi_gian_bd10_xnd_bckt_phat`) vẫn 0 % ở mọi tháng: cần PO xác nhận cột nào cần bổ sung.
