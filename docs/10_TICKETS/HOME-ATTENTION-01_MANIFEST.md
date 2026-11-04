# HOME-ATTENTION-01 — Đánh dấu BCVH thấp bất thường trên trang chủ

Trạng thái: IMPLEMENTED / TECH PASS / READY FOR PO UI CHECK (2026-11-04). Người làm: Claude Code (backend + giao diện). Chưa có Opus review, chưa có PO UI PASS. Không đổi Current Ticket.

## 1. Quyết định của PO (2026-11-04)

- Khối "Chất lượng các BCVH" (F1.3, F4.1, F4.2) đánh dấu BCVH có chất lượng **bất thường so với chính nó**, không phải BCVH thấp nhất và không so với toàn BĐTP (các BCVH thấp đều là mặt bằng bình thường).
- Ngày: so với **cùng thứ** của chính BCVH (thứ Hai sau cuối tuần luôn thấp hơn 10-30 điểm). Tuần: các tuần trước. Tháng: các tháng trước. Kỳ đang chạy dở so với các kỳ trước cắt cùng số ngày.
- **Mức thường** lấy theo kỳ gần nhất (4 tuần / 4 lần cùng thứ / 3 tháng) để BCVH đang tăng trưởng không bị so với quá khứ kém hơn; **độ dao động** lấy theo khoảng dài hơn (8 tuần / 6 tháng) vì 4 điểm quá ít (PO 2026-11-04, đổi sau khi xem thử).
- "Bất thường" = thấp hơn mức thường quá **1,5 lần** độ lệch chuẩn của chính nó (tối thiểu 1 điểm). Ban đầu là 2 lần, PO đổi 2026-11-04 vì quá thưa.
- BCVH có sản lượng dưới **4 %** tổng sản lượng 6 BCVH cùng kỳ không xét (tác động nhỏ, tỷ lệ nhảy theo vài bưu gửi).
- Thiếu lịch sử thì không kết luận: ngày/tuần cần 3 trong 4 kỳ gần nhất và 6 trong 8 cho độ dao động; tháng cần 2 trong 3 và 4 trong 6.
- Hiển thị: biểu tượng ▼ cam cạnh tên, nền hàng nhạt, chú giải "Thấp bất thường so với chính đơn vị", rê chuột hiện số. Không gán nguyên nhân. Thứ tự xếp theo tỷ lệ giữ nguyên.
- Phạm vi: trang chủ, F1.3, F4.1, F4.2. F1.1/F1.2 (cặp, bưu cục chấp nhận) và các trang Theo ngày/tuần/tháng chưa làm.

## 2. Kỹ thuật

- `backend/src/services/HomeUnitAttention.js` (hàm thuần: `historyRanges`, `judgeUnit`), `HomeExecutiveService._withAttention`: thêm khóa `attention` (`null` hoặc `{basis, rate, baseline, spread, shortfall, samples}`) vào từng dòng `focus_units` kind `bcvh`; lỗi truy vấn lịch sử chỉ làm `attention: null`. Công thức KPI, API cũ, DB không đổi.
- Frontend: `homeAttention.js` (chữ tooltip), `ActionUnitsBlock.jsx`.

## 3. Kiểm tra

- Backend: `HomeUnitAttention` 9/9, `HomeExecutiveService` 31/31 (có ca dữ liệu giả: thứ Hai bình thường không báo, BCVH nhỏ không xét, thiếu lịch sử không kết luận, lỗi lịch sử không làm trống khối). Frontend: 903/903, build, lint không thêm cảnh báo.
- Chạy thử trên bản sao dữ liệu thật (không chạm DB đang chạy), quy tắc mới (mức thường 4 tuần, dao động 8 tuần, hệ số 1,5), chế độ Ngày 21 ngày gần nhất: F1.3 báo 7 ngày (có 2/11), F4.1 10 ngày, F4.2 9 ngày. Tuần: F1.3 1 tuần, F4.1 2, F4.2 3. Tháng: F4.1 và F4.2 mỗi chỉ tiêu 1 tháng. Thử 90 ngày F1.3: tỷ lệ ngày bị báo 8,7 % (cả hai 4 tuần: 13,1 %, quá nhiều).
- Thời gian tải khi chưa có cache (máy phát triển): ngày ~4 s, tuần ~5 s, tháng ~9 s (trước đó ngày ~2 s, tuần ~2 s, tháng ~3 s); lần sau lấy từ cache phản hồi.

## 4. Còn lại

- PO UI check; cần khởi động lại backend. Theo dõi vài tuần để chỉnh hệ số 2 và ngưỡng 4 % nếu báo quá nhiều/ít (F4.2 báo nhiều hơn F1.3).
- Chưa xử lý ngày lễ/Tết (sau kỳ nghỉ dài chất lượng sụt khác thường).
- Tải tháng chậm hơn; nếu PO thấy chậm, tính trước lịch sử vào bảng tổng hợp.
