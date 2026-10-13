# HOME-BI-01 Manifest

Status: `READY FOR PO CHECK` (2026-10-13). Executive Home page (Trang chủ điều hành) for the leadership of Bưu điện tỉnh: current quality rate and national rank of the four indicators F1.1, F1.2, F1.3, F4.1.

## 1. Ticket Information

- Ticket ID: `HOME-BI-01`. Parallel workstream; `PROJECT_SNAPSHOT.md` Current Ticket is another ticket, not a conflict.
- Authorization: PO chat 2026-10-13 (decisions in Section 4).
- Executors: backend/data = `Claude Code` (Phase B1); UI/UX = `Antigravity` (Phase U1, after B1 is done); independent review = `Opus`. PO UI check required.
- Product intent: leaders read the page in a few seconds and care about two things only: **the current quality rate** and **the national rank**.

## 2. Required Reading

1. `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md` — every block (camera, click-to-order titles, target line, colour family, date filter, undefined-identifier check).
2. `frontend/src/features/indicator/indicatorConfig.js` (targets, colour families, endpoints) and the existing `national-ranking` endpoints of F1.1 / F1.2 (`backend/src/routes/f11Routes.js`, `f12Routes.js`).
3. Precedent for blocks and data: `docs/10_TICKETS/F12-DASHBOARD-UI-01_MANIFEST.md` Sections 3-4.

## 3. Scope — what the page must contain (content only; layout and look are Antigravity's)

1. **Date context:** the data day shown (anchor date, default the latest day with loaded data, i.e. N-1) and, per indicator, whether that day's data is loaded. An unloaded indicator shows an explicit "chưa có dữ liệu", never 0 %.
2. **One card per indicator (F1.1, F1.2, F1.3, F4.1)** with exactly: the **rate**, the **national rank x/34**, the **gap to the indicator's target** (percentage points), and the **change versus the previous day** for both rate and rank. Each card follows its indicator's colour family and its own target line. Nothing else (no volume, no secondary rates, no hour thresholds written on the card).
3. **National rank table — mandatory:** for the selected indicator (switch among the four), the 34 provinces with rank, rate and change versus the previous period; the Huế row is always findable and highlighted. A compact view (top, Huế and its neighbours, bottom) may be offered. Also: **how Huế's rank moved** over time (daily for the last 30 days, monthly from T1 to the current month) and the gap to the province ranked just above.
4. **Trend per indicator, each on its own chart** (own rate line and own target line, last 7 / 30 days). No chart mixes indicators on one axis.
5. **Units to act on, within one indicator at a time:** the lowest-rate BCVH (accepting units for F1.2) of the selected indicator with rate, gap to target and failed count, each linking to that indicator's existing ranking page.
6. Report-block functions of the standard on every block; the period follows the date filter and every title says which day/period it shows.

Out of scope until the PO decides: a unit × indicator matrix, a copy-ready daily message for Viber (the `/dashboard/message` endpoints exist), export to PDF.

## 4. Decisions Already Taken (do not re-ask)

- Targets: F1.1 95 %, F1.2 95 %, F1.3 90 %, F4.1 90 % (read from `indicatorConfig.js`, never hard-coded).
- Each indicator is a different measure: **no cross-indicator comparison, no summing of late parcels, no "bottleneck by stage" block.**
- **One threshold per indicator, shown without any "24h/48h" style label** (F1.1 is 24 h only; there is no 48 h). The rate is the one the indicator's own dashboard shows.
- The national rank table is mandatory (leaders look at current rate and national rank first).
- Roles: admin + viewer, as the other dashboards. Unevaluated = "Không đạt"; accepting offices are never ranked (standard).
- Layout, composition, visual style and chart choices are **left to Antigravity** within the standard and the design tokens in use.

## 5. Phases

- **B1 (Claude Code):** verify that a 34-province ranking and the previous-period rank exist for **all four** indicators (F1.1 and F1.2 have `national-ranking`; F1.3 / F4.1 to be confirmed) and add what is missing; provide one aggregation endpoint for the Home page (rate, rank, gap, previous day, Huế rank history, per-indicator trend, lowest units) following the selected anchor date, reusing the existing services; empty / not-loaded states explicit; cache keyed by anchor date and invalidated on import. The final contract is written in Section 7 when B1 is done.
- **U1 (Antigravity):** the Home page UI per Section 3 on that contract; replaces the content of `pages/DashboardHome.jsx` on `/`; frontend only.

## 6. Exclusions

No change to F1.1 / F1.2 / F1.3 / F4.1 behaviour or tests; no schema or import change in U1; no new colour rules; Antigravity: no browser, screenshot, dev server or login; no self-awarded PO PASS.

## 7. Backend contract and delivery

### 7.1 Delivery (B1, 2026-10-13, Claude Code)

Read-only, admin + viewer, cached by `cachedRead()` (invalidated by the data fingerprint on every import). Code: `backend/src/services/HomeExecutiveService.js`, `controllers/HomeExecutiveController.js`, `routes/homeRoutes.js` (mounted at `/api/home` in `server.js`), tests `HomeExecutiveService.test.js` (9/9). Nothing is recomputed: every figure comes from the same service as the indicator's own dashboard (summary, daily trend, BCVH ranking, national rank). The only new query is the 34-province table for F1.3 and F4.1 (same generic service with the column map of `fact_f13_national` / `fact_f41_national`; both hold exactly the 34 ranked provinces, so ranks are unchanged).

### 7.2 `GET /api/home/executive?anchor_date=YYYY-MM-DD` (optional)

`{ success, data: { anchor_date, indicators: [...] } }`, one entry per `f11`, `f12`, `f13`, `f41` in that order. `anchor_date` absent = each indicator's own latest day with loaded detail data; present = the latest loaded day not after it. Fields per indicator:

| Field | Meaning |
| --- | --- |
| `id`, `label`, `target_rate` | indicator id, 'F1.1'..'F4.1', target 95 / 95 / 90 / 90 |
| `available`, `message` | false = show "chưa có dữ liệu" with `message` (never 0 %); every figure is then null |
| `data_date` | the day the figures are for (may differ between indicators) |
| `rate`, `gap_to_target` | Huế rate (same number as the indicator dashboard KPI, 1 decimal); rate minus target in points |
| `previous_date`, `previous_rate`, `rate_change` | the day before `data_date`; null when that day has no data |
| `rank`, `total`, `previous_rank`, `previous_rank_date`, `rank_movement` | national rank x/34; movement > 0 = moved up (against the previous day with national data) |
| `rank_basis_rate` | Huế rate in the national report, the value the rank is computed from |
| `volume`, `passed`, `failed` | counts of the day (for tooltips, not for the card) |
| `trend[]` | last 30 days up to `data_date`: `{date, rate, rank, volume}`; `rate`/`rank` null on days without data |
| `monthly_rank[]` | T1 to the month of `data_date`: `{month, rank, total, rate}`; nulls for months not loaded |
| `lowest_units[]` | the 5 lowest-rate BCVH (accepting units for F1.2): `{ma_bcvh, ten_bcvh, rate, gap_to_target, failed, volume}`; link to that indicator's ranking page |

### 7.3 `GET /api/home/national-ranking?indicator=f11|f12|f13|f41&period=day|week|month&anchor_date=` (or `from_date` + `to_date`)

`indicator` required; `period` default `day`; week = Thursday–Wednesday; a running week/month is read up to the anchor; no `anchor_date` = the indicator's latest national day. Returns `{ indicator, label, target_rate, available, message, period, period_start, period_end, previous_period, total, national_rate, hue, items[] }`:

- `items` = the 34 provinces `{rank, ma_tinh, ten_tinh, rate, volume, failed, previous_rank, movement, gap_to_target, is_hue}`.
- `hue` = `{rank, rate, gap_to_target, gap_to_national_rate, above:{rank, ten_tinh, rate, gap}}`; `above.gap` = points needed to reach the province ranked just above, `above` null at rank 1.
- `national_rate` = summed passed / summed volume of the 34 provinces.
- Errors: 400 `INVALID_DATE` / `INVALID_INDICATOR`.

### 7.4 Notes for the UI

- **Two Huế rates can differ by a few tenths** (e.g. F1.1 on 2026-10-11: dashboard 68.7 vs national report 68.3) because the detail export and the portal national report are separate sources. Card = dashboard `rate` (what leaders see on the F1.x dashboards). The Huế row of the 34-province table = the national-report rate the rank is computed from; label the table "theo báo cáo toàn quốc" (or show `rank_basis_rate`) and do not mix the two in one comparison.
- Indicators have different latest days (F4.1 detail was 2026-10-10 while its national report held 10-11). Show each card's `data_date`.
- Cold `executive` response about 1 s, the table a few ms; both are cached.

### 7.5 Delivery (U1, 2026-10-13, Antigravity)

Trang chủ điều hành (`/`, `frontend/src/pages/DashboardHome.jsx`) hoàn tất và đạt chuẩn khối báo cáo (`report_block_ui_standard.md`):
- **Executive Date Bar (`ExecutiveDateBar.jsx`)**: Cho phép chọn ngày chốt (mặc định N-1), hiển thị trạng thái và `data_date` riêng của từng chỉ tiêu F1.1, F1.2, F1.3, F4.1. Nút camera chụp toàn bộ khối.
- **Thẻ chỉ tiêu điều hành (`ExecutiveIndicatorCard.jsx`)**: Hiển thị nổi bật đầu tiên: Tỷ lệ chất lượng (theo báo cáo chi tiết), Vị thứ toàn quốc x/34, Chênh mục tiêu (F1.1: 95%, F1.2: 95%, F1.3: 90%, F4.1: 90%), Biến động so với hôm trước (DoD tỷ lệ & biến động bậc vị thứ). Thẻ dùng màu theme chuẩn của từng chỉ tiêu; không nhãn giờ 24h/48h; hiển thị rõ `data_date` của riêng thẻ. Trạng thái chưa có dữ liệu hiển thị thông báo rõ ràng, không bao giờ hiển thị 0%. Bấm thẻ để đổi chỉ tiêu xem chi tiết ở các khối dưới. Nút camera trên từng thẻ.
- **Bảng xếp hạng 34 tỉnh toàn quốc (`NationalRankingBlock.jsx`)**: Chuyển đổi giữa 4 chỉ tiêu, 3 kỳ (Ngày/Tuần/Tháng). Callout chiến lược hiển thị vị thứ Huế, tỷ lệ Huế theo báo cáo toàn quốc, khoảng cách điểm % cần thêm để vượt tỉnh đứng ngay trên (hoặc cờ dẫn đầu nếu hạng 1), so sánh với bình quân toàn quốc. Hàng BĐTP Huế nổi bật cố định. Cho phép chuyển đổi chế độ xem Tất cả 34 tỉnh hoặc Huế & lân cận. Sắp xếp click-to-order qua `SortableTh`. Nút camera.
- **Diễn biến vị thứ theo tháng (`MonthlyRankProgressionBlock.jsx`)**: Vị trí xếp hạng toàn quốc từ T1 đến tháng hiện tại cho chỉ tiêu đang chọn. Nút camera.
- **Khối hành động theo chỉ tiêu (`ActionUnitsBlock.jsx`, trước là `LowestUnitsBlock`; PO 2026-10-13)**: F1.3 và F4.1 hiện "CHẤT LƯỢNG CÁC BCVH" — cả 06 BCVH, tỷ lệ thấp nhất trước; F1.1 hiện 05 cặp bưu cục chấp nhận – bưu cục phát có sản lượng lớn nhất và tỷ lệ dưới 85% (bỏ cột "Khác"); F1.2 hiện 05 bưu cục chấp nhận có sản lượng lớn nhất và tỷ lệ dưới 90%. Dữ liệu `focus_units` do `HomeExecutiveService` trả (ngưỡng 85/90 là ngưỡng lọc của khối, không đổi mục tiêu chỉ tiêu). Kèm tỷ lệ, chênh mục tiêu, không đạt, sản lượng; liên kết tới trang xếp hạng; sắp xếp click-to-order qua `SortableTh`; nút camera.
- **Diễn biến xu hướng từng chỉ tiêu độc lập (`IndicatorTrendsGrid.jsx`)**: 4 biểu đồ riêng biệt cho 4 chỉ tiêu, mỗi chỉ tiêu có trục đo, đường tỷ lệ đạt và vạch mục tiêu độc lập (95% hoặc 90%), không gộp chung trục. Chuyển đổi 7 ngày / 30 ngày. Nút camera trên từng biểu đồ và toàn khối.
- **Pure sorting & helpers (`homeTableSort.js`)**: Kiểm thử đầy đủ qua `homeTableSort.test.js` và `dashboardHome.test.js`.

### 7.6 PO Check List
- [ ] Truy cập `/`: Nhìn thấy ngay 4 thẻ chỉ tiêu (F1.1, F1.2, F1.3, F4.1) với tỷ lệ đạt và vị thứ toàn quốc x/34.
- [ ] Mỗi thẻ hiển thị đúng màu họ chỉ tiêu (F1.1 xanh lá, F1.2 xanh ngọc, F1.3 xanh dương, F4.1 cam), có nhãn ngày số liệu riêng.
- [ ] Bảng 34 tỉnh hiển thị đúng Huế được highlight, tỷ lệ Huế ghi chú rõ "theo báo cáo toàn quốc".
- [ ] Khối vượt hạng hiển thị đúng tên tỉnh và điểm % cần thêm để vượt tỉnh xếp trên (hoặc thông báo dẫn đầu nếu hạng 1).
- [ ] Click tiêu đề cột bảng 34 tỉnh và bảng top 5 đơn vị để đảo chiều sắp xếp bình thường.
- [ ] Chuyển đổi các tab chỉ tiêu và kỳ Ngày/Tuần/Tháng phản hồi mượt mà.
- [ ] 4 biểu đồ xu hướng độc lập hiển thị đúng vạch mục tiêu (95% cho F1.1, F1.2; 90% cho F1.3, F4.1).
- [ ] Nút Camera trên các khối hoạt động sao chép / lưu ảnh PNG theo chuẩn.

## 8. Review round 1 (Claude Code, 2026-10-13) — fixes for Antigravity

Checked on the restarted server with real data from `/api/home/*`: page loads, no JS error, cards / 34-province table / trends match the API. Five defects (UI only; no backend change):

1. **Wrong indicator names** in the subtitle of `ExecutiveDateBar.jsx`. Correct: F1.1 toàn trình nội tỉnh, F1.2 thu gom liên tỉnh, F1.3 phát liên tỉnh, F4.1 phát thành công bưu cục. Take the names from `indicatorConfig.js` / the menu, never retype them.
2. **Trend charts clip real data:** `IndicatorTrendsGrid.jsx` fixes the Y domain at 40–100, but real points are lower (F4.1 22.2 %, F1.1 38.1 %, F1.3 39.3 %). The domain must follow the data (always including the target line) with a sensible floor.
3. **Rate colours in the 34-province table** use an ad-hoc "target − 10" rule. Use the shared catalogue (`f13HeatmapBandCatalog`, `classifyF13HeatmapRate`) with the indicator's own bands from `indicatorConfig.js` (F1.1 / F1.2 / F1.3: 70/60/50; F4.1: 80/70/60), as the standard requires.
4. **Missing data shown as a value:** in `ExecutiveIndicatorCard.jsx`, `rate_change = null` shows "0.0%" and `rank_movement = null` shows "Giữ hạng". Null must show "—" (only a real 0 means "no change"). Apply the same rule to the table's movement column.
5. **Card too cramped:** at 1440 px with the menu open, "TỶ LỆ ĐẠT", "VỊ THỨ TOÀN QUỐC" and "Chênh mục tiêu" wrap to 2–3 lines. Give the rate and the rank room (the two big numbers are what leaders read first); layout is Antigravity's choice.

Also: do not truncate the province name / rate in the "Mục tiêu vượt tỉnh xếp trên" callout; label the monthly rank strip "hạng lũy kế tháng" (the T10 value is month-to-date, not the day rank); remove the unused `targetRate` in `LowestUnitsBlock.jsx` and the unused import in `homeTableSort.test.js`.

Add or extend unit tests for 2, 3 and 4 (pure helpers). Stop at `READY FOR PO CHECK`.

### 8.1 Summary of Fixes (Antigravity, 2026-10-13)

- **Lỗi 1 (Tên chỉ tiêu trong phụ đề)**: Cập nhật phụ đề `ExecutiveDateBar.jsx` chuẩn xác theo hệ thống: F1.1 (Toàn trình nội tỉnh), F1.2 (Thu gom liên tỉnh), F1.3 (Phát liên tỉnh), F4.1 (Phát thành công bưu cục). Định nghĩa `INDICATOR_FULL_NAMES` trong `homeTableSort.js`.
- **Lỗi 2 (Trục biểu đồ xu hướng cắt số liệu)**: Thay thế domain cứng `[40, 100]` bằng helper thuần `computeTrendYDomain(points, targetRate)` trong `homeTableSort.js`. Trục Y tự động co giãn theo điểm thấp nhất (ví dụ F4.1 22.2% xuống floor 10, F1.1 38.1% xuống floor 30), luôn bao gồm vạch mục tiêu và chặn trên 100%.
- **Lỗi 3 (Màu tỷ lệ bảng 34 tỉnh)**: Bỏ điều kiện ad-hoc `target - 10`. Tích hợp bộ màu dùng chung chuẩn `classifyF13HeatmapRate` và `F13_HEATMAP_TONE_CLASS` từ `f13HeatmapBandCatalog.js` theo đúng ngưỡng `heatmapBands` của từng chỉ tiêu (F1.1/F1.2/F1.3: 70/60/50; F4.1: 80/70/60).
- **Lỗi 4 (Thiếu dữ liệu hiện "—" thay vì 0 / "Giữ hạng")**: Sửa `ExecutiveIndicatorCard.jsx` và cột biến động bảng 34 tỉnh: `rate_change === null` hiển thị "—" (chỉ 0 mới hiện "0.0%"), `rank_movement === null` hiển thị "—" (chỉ 0 mới hiện "Giữ hạng" / "0"). Bổ sung `formatRateChange` và cập nhật `formatRankMovement`.
- **Lỗi 5 (Thẻ chỉ tiêu bị chật)**: Tái cấu trúc layout `ExecutiveIndicatorCard.jsx`, rút ngắn nhãn ("Tỷ lệ đạt", "Vị thứ TQ", "Chênh MT", "Biến động"), bỏ bớt lồng padding kép, cho phép 2 số to hiển thị thoáng đãng và không bị ngắt dòng 2–3 hàng ở 1440px khi menu mở.
- **Các điểm nhỏ**:
  - Bỏ `truncate` ở tên tỉnh/tỷ lệ trong callout "Mục tiêu vượt tỉnh xếp trên" (`NationalRankingBlock.jsx`).
  - Gắn nhãn chuẩn "hạng lũy kế tháng" cho dải diễn biến tháng (`MonthlyRankProgressionBlock.jsx`).
  - Xóa biến `targetRate` không dùng trong `LowestUnitsBlock.jsx` và import `RANKING_TEXT_FIELDS` không dùng trong `homeTableSort.test.js`.
  - Mở rộng bộ kiểm thử tự động `homeTableSort.test.js` và `dashboardHome.test.js` kiểm tra lỗi 1, 2, 3, 4. Toàn bộ 690 tests pass xanh.

## Điều chỉnh 2026-10-13 (PO) — bảng 34 tỉnh, "Biến động" và bố cục

- Bảng xếp hạng 34 tỉnh bỏ cột "Chênh MT" (chênh mục tiêu vẫn còn ở thẻ "Tỷ lệ Huế"), chữ to hơn, bỏ tiền tố "Bưu điện " trong tên để một dòng.
- "Biến động" của kỳ Tuần/Tháng nay so với **tuần trước / cả tháng trước đầy đủ** (trước đây so với *một ngày* cuối kỳ trước, nên F1.3 tháng 10 hiện +1 trong khi khối "Diễn biến hạng lũy kế tháng" hiện +3: 25 → 22). `HomeExecutiveService.getNationalRanking` trả thêm `movement_basis` (`day|week|month`); kỳ Ngày giữ nguyên (so với ngày dữ liệu liền trước). Đã đối chiếu dữ liệu thật: F1.1 +9, F1.2 +15, F1.3 +3, F4.1 +5, đều bằng chênh hạng T9 → T10 ở khối lũy kế.
- Bố cục: hai cột 7/5 (≥ 2xl: 8/4), cột phải giãn bằng chiều cao bảng 34 tỉnh nên chân hai khối luôn thẳng hàng khi đổi chỉ tiêu; bảng cặp F1.1 một dòng/cặp, bỏ tiền tố "BCVH " và cột "Chênh MT".
- Khối hành động theo chỉ tiêu: bỏ cột "Chênh MT" ở mọi chỉ tiêu, chữ to hơn, các hàng dàn đều để chiều cao khối bằng bảng "Xếp hạng 34 tỉnh".
