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
