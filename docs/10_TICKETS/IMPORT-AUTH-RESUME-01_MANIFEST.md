# IMPORT-AUTH-RESUME-01 — Đăng nhập lại TCT xong mà lần nạp vẫn đứng ở "Chờ đăng nhập"

Trạng thái: CLOSED (2026-11-06) — TECH PASS; PO đã khởi động lại backend và xác nhận lần nạp chạy tốt. Người làm: Claude Code (Opus 5.5), PO mở ticket. Không đổi Current Ticket, API, công thức KPI hay cấu trúc cơ sở dữ liệu. PO UI Check Required: Không (chỉ hành vi backend; PO xác nhận lần nạp chạy tiếp ở lần đăng nhập kế tiếp).

## 1. Sự cố (06/11, nạp tự động 07:30)

- Lần chạy `7198e644` (scheduler, TCT, 16 job 02/11 → 05/11) dừng ở `WAITING_AUTH` từ 07:30. Lỗi của job đầu (F1.3 05/11): `AUTHENTICATION_REQUIRED`, nội dung "TCT DKCL source page is no longer ready".
- PO bấm "Mở đăng nhập TCT" và đăng nhập thành công, nhưng lần chạy vẫn đứng và cảnh báo tắc nghẽn vẫn hiện.

## 2. Nguyên nhân (đã đối chiếu DB và `Data DKCL/BrowserProfiles/session-watch.log`, chỉ đọc)

- Việc tự chạy tiếp (`resumeAuthWaitForLane`) chỉ được gọi từ `DkclSessionKeepAlive.note()`, và chỉ khi trạng thái phiên **đổi** sang `SESSION_VALID`.
- 07:20 keep-alive ghi TCT `NO_SESSION -> SESSION_VALID`. 07:30 job thấy trang cổng đã mất và đưa lần chạy về `WAITING_AUTH`; keep-alive vẫn coi TCT là hợp lệ. Lần đăng nhập lại không tạo ra thay đổi trạng thái nào, nên không có gì gọi chạy tiếp.
- Đường đăng nhập thủ công (`awaitInteractiveLogin`) không báo cho hàng đợi khi đăng nhập xong.

## 3. Sửa

- `dkclSessionKeepAlive.js`: thêm `onSessionStillValid`. Mỗi lần kiểm tra thấy phiên vẫn hợp lệ (không đổi trạng thái) thì chạy tiếp các lần chạy đang chờ đăng nhập của nguồn đó. Chỉ ghi log khi thật sự có lần chạy được chạy tiếp; lỗi chỉ ghi log, không làm hỏng keep-alive.
- `dkclSessionPreflightService.js`: thêm `onInteractiveLoginReady(listener)` ở cấp module. Hàm này được gọi khi đăng nhập thủ công xong (trang báo cáo đã sẵn sàng, cửa sổ đã ẩn); lỗi của listener không ảnh hưởng việc đăng nhập.
- `server.js`: cả hai đường cùng gọi `resumeAuthWaitAndWake(source)`, tức `resumeAuthWaitForLane`, và chỉ đánh thức hàng đợi khi có lần chạy được chạy tiếp. `AUTO_BACKFILL_AUTO_RESUME=false` vẫn tắt được việc tự chạy tiếp.

## 4. Kiểm tra

- `test_dkclSessionKeepAliveWake.js` 7/7 (thêm 3 ca: vẫn hợp lệ thì chạy tiếp và chỉ ghi log khi có chạy tiếp; lỗi chạy tiếp không phá keep-alive; đăng nhập xong thì báo listener, hết giờ đăng nhập thì không báo).
- Hồi quy: `test_autoImportScheduler.js` 19/19, `test_dkclSessionDisconnect.js` 9/9, `test_dkclLeftoverCleanup.js` 10/10, `test_autoBackfillQueueService.js` 47/47, `test_autoBackfillSafety.js` 11/11, `src/services/autoImport015.test.js` 7/7, `node --check server.js` OK.
- `test_dkclSessionPreflightService.js` lỗi cú pháp có từ trước (`cleanupCalled` khai báo hai lần trong chính file test), không liên quan bản sửa này.

## 5. Còn lại

- Đã khởi động lại backend (06/11); PO xác nhận lần nạp chạy tiếp và chạy tốt.
- Nếu keep-alive thấy phiên hợp lệ mà job vẫn thấy trang cổng mất, lần chạy sẽ được thử lại mỗi vòng keep-alive (mặc định 10 phút, mỗi vòng một lượt thử). Vòng lặp này có giới hạn và vô hại, nhưng cho thấy phép kiểm tra phiên của keep-alive và của job chưa khớp nhau. Theo dõi trong `session-watch.log`.
