# Auto Import / Backfill – các sửa ngày 27/10 – Prompt review (Opus)

Dán nguyên văn cho phiên Claude Code chạy Opus. Chỉ đọc và chạy lệnh kiểm tra, không sửa mã, không commit.

---

Review độc lập (chỉ đọc, không sửa, không commit, không mở trình duyệt, không đăng nhập, không chạm vào backend đang chạy hay `backend/src/db/database.sqlite` ngoài truy vấn chỉ đọc `readOnly: true`) các sửa ngày 27/10/2026 quanh Auto Import và hàng chờ Auto Backfill. Xem bằng `git show <hash>`:

- `db01d3be` cửa sổ DKCL mở lại sau khi khởi động backend thì mở ẩn, không bật lên (`dkclHueF13PortalClient.js`, `dkclSessionPreflightService.js`).
- `6acdfb8d` sai số đối soát F1.1 từ 3 % lên 4 % (`f11SingleDateServices.js`; quyết định PO).
- `f0b9eba5` Nhật ký toàn bộ không còn trắng trang (`jobErrorText`, `AutoBackfillJobLog.jsx`).
- `b71c00b2` lần thử lại theo lịch chỉ chạy lại nguồn chưa xong (`autoImportScheduler.js`, `doneLanes`).
- `a7e9fbce` rồi `fae50c2e` giới hạn chờ xuất F4.2 của hàng chờ 15 → 5 → 2 phút (`autoBackfillF42Executors.js`; PO: quá 2 phút là cổng lỗi).
- `03fc8d84` danh sách tiến trình mở trả thêm `started_at`, `next_attempt_at`, `last_error_signature`, `last_error_class` cho mỗi job (`autoBackfillQueueStore.js`).
- `b90daba0` Antigravity làm lại khối "Tất cả tiến trình đang mở" (`AutoBackfillOperatorPanel.jsx`, `autoBackfillUiHelpers.js`); yêu cầu gốc ở `docs/10_TICKETS/AUTO-BACKFILL-QUEUE-UI-01_ANTIGRAVITY_PROMPT.md`.

Đọc trước: `docs/10_TICKETS/AUTO-IMPORT-SCHEDULE-01_MANIFEST.md` (mục 8 đến 10 cuối file), `docs/10_TICKETS/AUTO-BACKFILL-RUNTIME_MANIFEST.md` mục 15.

Câu hỏi bắt buộc:
1. Mở ẩn: còn đường nào cửa sổ bật lên ngoài ý muốn, hoặc cửa sổ đăng nhập cần người dùng nhìn thấy lại bị ẩn (đua giữa `hideWindow` và `showForManualLogin`, cờ `interactiveAuthenticatedOnOpen`, `quiet` mặc định)? Đường đăng nhập do người bấm có còn nguyên?
2. Sai số 4 %: chỉ áp cho `evaluated`/`failed`, còn `total` và `passed` vẫn khớp tuyệt đối? Có nguy cơ nhận nhầm dữ liệu sai? Hai test đang đỏ từ trước của `test_f11PortalAdapter.js` (số 14 và 17): xác nhận không do commit này gây ra (so với commit cha).
3. Trắng trang: còn chỗ nào khác render object trả về từ `translateJobErrorSignature` thành con của React?
4. `doneLanes`: trạng thái cũ chưa có khóa này đọc được không; được xóa khi sang chu kỳ mới; `writeState` trước `return null`; nguồn đã `OK` rồi bị nguồn kia thử lại có làm kết quả chu kỳ sai không; đường `timedOut`.
5. Giới hạn 2 phút: chỉ áp cho bộ chạy hàng chờ (dịch vụ trơn vẫn 900000, nhập tay không đổi)? Thứ tự ưu tiên `hueServiceOptions || serviceOptions` có còn đúng ý cũ? Biên độ so với lần xuất lâu nhất từng thấy (1,6 phút) và với thời hạn thuê khóa của job; ba lần thử `EXPORT_TIMEOUT` = 6 phút tổng có hợp lý?
6. Trường job mới: có lộ gì cho vai trò chỉ có quyền đọc phủ dữ liệu (`last_error_signature` chứa gì)? Truy vấn một lần cho mọi run có chậm khi hơn 170 run mở? `limit` không có trần ở controller: cần trần không?
7. Giao diện mới (`b90daba0`): đếm job chứ không đếm run, `limit=500`, nhóm rỗng, dải ngày, giờ hiển thị theo giờ Việt Nam, nhãn tiếng Việt, định danh chưa khai báo, tải 5 giây một lần với 500 run có nặng không. Đối chiếu từng yêu cầu 1 đến 5 của prompt gốc.
8. Thao tác trực tiếp vào CSDL hàng chờ để hủy job F4.2 TCT 04/07 (job `45ab5b76-1aed-40be-beef-76df7be2106d`, run `bf8bced8-5359-45aa-9f73-c595a202df1f`; đọc lại chỉ đọc): có khớp tiền lệ mục 15 của manifest runtime, có đủ sự kiện, không để lại job mồ côi?
9. Phạm vi và hồi quy: commit có file ngoài phạm vi trên không? Các chỉ tiêu F1.2, F1.3, F4.1 có đổi hành vi không?

Chạy trong `backend/`: `node --experimental-sqlite --test src/services/dkclSessionWindowHide.test.js`, rồi chạy **từng file một** (các file `test_*.js` ở gốc không nằm trong `node --test` quét tự động): `node --experimental-sqlite --test <file>` cho `test_f42PortalAdapter.js`, `test_autoImportScheduler.js`, `test_autoBackfillQueueService.js`, `test_autoBackfillQueueController.js`, `test_f11PortalAdapter.js`. Báo riêng kết quả từng file. Trong `frontend/`: `node --test src/components/AutoBackfillOperatorPanel.test.js` và `npx vite build`.

Báo cáo ngắn: PASS / PASS CÓ ĐIỀU KIỆN / FAIL, phát hiện theo mức nghiêm trọng (file:dòng), lệnh đã chạy và kết quả thật. Không tự cấp PO PASS.
