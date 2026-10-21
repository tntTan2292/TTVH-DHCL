# HOME-BI-02 — Bộ lọc Ngày / Tuần / Tháng của trang chủ

Trạng thái: IMPLEMENTED / TECH PASS / READY FOR PO UI CHECK (2026-10-21). Người làm: Claude Code (backend + giao diện). Chưa có Opus review, chưa có PO UI PASS.
Tiếp nối HOME-BI-01 (xem `HOME-BI-01_MANIFEST.md`).

## 1. Quyết định của PO (2026-10-21)

- Bộ lọc Ngày / Tuần / Tháng đặt ở thanh đầu trang, thay cho "Ngày chốt"; chi phối **cả trang**: 4 thẻ chỉ tiêu, bảng xếp hạng 34 tỉnh, khối hành động. Nút lọc riêng trong khối xếp hạng đã bỏ.
- Tuần là tuần TCT: **Thứ Năm → Thứ Tư**, số tuần theo ISO 8601 của ngày Thứ Năm (PO xác nhận 2026-10-21).
- Ô "Ngày chốt" bỏ; thay bằng nút **lùi / tiến** theo đúng kỳ đang xem (`◀ Tuần 42 · đến 20/10 ▶`) và nút "Mới nhất". Mặc định luôn là kỳ mới nhất.
- Tuần / tháng đang chạy dở: đọc đến ngày dữ liệu mới nhất và ghi rõ "đến dd/mm"; "so kỳ trước" luôn so với **tuần trước / cả tháng trước đầy đủ** (cùng cơ sở với cột "Biến động" và khối "Diễn biến hạng lũy kế tháng").
- Mỗi chỉ tiêu có ngày dữ liệu riêng: kỳ của từng chỉ tiêu được đọc đến ngày dữ liệu cuối của nó, hiện trên chip và thẻ riêng.

## 2. Hợp đồng dữ liệu

`GET /api/home/executive?period=day|week|month&offset=0|-1|-2...` (offset 0 = kỳ mới nhất có dữ liệu; tối đa -120; `anchor_date` cũ vẫn được nhận). `GET /api/home/national-ranking` nhận cùng `period` + `offset` và đọc đúng khoảng ngày của thẻ.

Trả thêm: `period`, `offset`, `period_info` {period_from, period_to, period_partial, period_week, period_year, full_to, has_previous, has_next}; mỗi chỉ tiêu có `period_*`, `trend_kind` (day 30 ngày / week 12 tuần / month T1→nay), `previous_from`, `focus_units` theo kỳ.

- Tuần/tháng: tỷ lệ = tổng đạt / tổng sản lượng của kỳ (không trung bình tỷ lệ ngày); hạng = hạng toàn quốc của cùng khoảng; thay đổi hạng = hạng kỳ trước − hạng kỳ này.
- Chuỗi tuần/tháng cộng từ số đếm từng ngày; điểm của kỳ đang xem mang đúng tỷ lệ của thẻ.
- Khối "Chất lượng các BCVH" chỉ lấy 6 BCVH chuẩn (loại mã lạ như "Khách hàng lớn" 531120).

## 3. Thay đổi kỹ thuật

- `HomeExecutiveService`: `_range`, `_periodIndicator`, `_periodSeries`, `_periodInfo`, `getExecutive({period, offset})`, `getNationalRanking({offset})`; F1.3 dùng truy vấn BCVH nhẹ của repository thay cho `getBcvhRanking` đầy đủ (tháng: 3,9 s → 0,1 s, cùng số đếm và cùng cách làm tròn).
- `F41RankingService.getDailyTrend` và `F13DashboardService.getDailyTrend`: tùy chọn `filters.skipNationalRank` (bỏ tra hạng từng ngày cho chuỗi dài; mặc định không đổi).
- Frontend: `homePeriod.js`, `ExecutiveDateBar.jsx`, `ExecutiveIndicatorCard.jsx`, `NationalRankingBlock.jsx`, `DashboardHome.jsx`.

## 4. Kiểm tra kỹ thuật

- Backend: `HomeExecutiveService` 21/21; F11/F12/F41 ranking 54/54; F13 dashboard + weekly 57/57.
- Frontend: thư mục home 27/27, build và lint không thêm cảnh báo.
- Dữ liệu thật: hạng tuần/tháng của thẻ trùng bảng 34 tỉnh và khối lũy kế (F1.3 tuần 41 hạng 24 ở cả hai; tháng 10 F1.1 +9, F1.2 +15, F1.3 +4, F4.1 +5 = hạng T9 − hạng T10).
- Thời gian tải chưa có cache (máy phát triển): ngày ~2 s, tuần ~2 s, tháng ~3,3 s; lần sau lấy từ cache phản hồi.

## 5. Còn lại

- PO UI check; Opus review độc lập (đổi cách tính số trên trang lãnh đạo).
- Cần khởi động lại backend.

## 6. Opus review độc lập (2026-10-21) — PASS WITH MUST-FIX

Hạng, biến động, khoảng kỳ và so kỳ trước khớp giữa thẻ, bảng 34 tỉnh và khối lũy kế trên dữ liệu thật (ngày / tuần / tháng, offset 0 và -1, 4 chỉ tiêu); ISO week đúng trên 1.305 ngày Thứ Năm 2015-2039; F1.3 đọc mới cho số giống cũ; cache tách theo `period`/`offset`.

Đã sửa sau review:
- Nút lùi dừng ở giới hạn `MAX_BACK` (`has_previous` xét offset, trả `max_back`); nút lùi/tiến khóa khi đang tải (`navState`).
- Chuỗi tuần/tháng làm tròn đúng như thẻ (hai chữ số rồi một chữ số).
- Nhãn "ngày" còn sót khi xem tuần/tháng: tiêu đề camera và dòng trống của khối hành động, khối lũy kế (nay ghi "theo báo cáo toàn quốc TCT", "đến dd/mm"), chip bảng 34 tỉnh (nay có số tuần).
- Không đọc xếp hạng BCVH cho F1.1/F1.2 (không dùng).
- `period_info.mixed` + dòng báo "Các chỉ tiêu ở kỳ khác nhau" khi số liệu các chỉ tiêu về lệch ngày qua ranh giới tuần/tháng.

Còn mở (cần PO quyết): (1) quanh ranh giới tuần/tháng các thẻ có thể ở hai kỳ khác nhau (mỗi chỉ tiêu đọc kỳ mới nhất của nó) — giữ như vậy hay dùng một kỳ chung và hiện "Chưa có dữ liệu" cho chỉ tiêu về trễ; (2) thẻ lấy tỷ lệ từ dữ liệu chi tiết còn khối lũy kế / bảng 34 tỉnh lấy từ báo cáo toàn quốc nên có thể lệch 0,1-0,3 điểm cùng kỳ (đã ghi nguồn trên khối lũy kế); (3) F1.1 có thể liệt kê bưu cục chấp nhận 531120 "Khách hàng lớn" trong khi khối BCVH của F1.3 loại mã này (đúng vì không phải BCVH).
Chưa có: test hành vi giao diện (chỉ dò nguồn + hàm nhãn/`navState`), đo trên trình duyệt thật.

## 7. Thu gọn trang chủ (PO 2026-10-21)

PO: thanh đầu trang gọn một hàng, widget nhỏ lại (đặc biệt đường biểu đồ), để thấy hết trang khi zoom 67 %. Chỉ đổi khoảng cách và cỡ chữ, không đổi số liệu. Đo bằng trình duyệt headless ở độ rộng 2040 px (tương đương zoom 67 % của PO): chiều cao nội dung 1.133 px → 877 px (thanh đầu 94 → 40, bốn widget 287 → 232, khối xếp hạng + khối phải 688 → 565). Chip chỉ số ở thanh đầu rút còn "20/10", "Tuần 42", "T10" (kỳ đầy đủ nằm trên từng thẻ và trong tooltip). Số lớn trong widget text-4xl → text-3xl; đường xu hướng cao 56 → 32 px.

## 8. Camera của thanh đầu trang chụp cả trang (PO 2026-10-21)

Nút "Chụp ảnh" ở thanh "TRANG CHỦ ĐIỀU HÀNH CHẤT LƯỢNG" chụp toàn bộ trang (thanh đầu, 4 thẻ, bảng 34 tỉnh, khối lũy kế, khối hành động) thay vì chỉ thanh đầu; các nút điều khiển (bộ lọc, lùi/tiến, camera con) không vào ảnh. Chú thích chân ảnh ghi "QIS" thay vì nhãn F1.3 mặc định (`indicatorOverride` của `BlockCaptureButton`) và kỳ đang xem. Đã chụp thử bằng trình duyệt headless: ảnh 3104 x 1856 px (2x) đủ các khối.
