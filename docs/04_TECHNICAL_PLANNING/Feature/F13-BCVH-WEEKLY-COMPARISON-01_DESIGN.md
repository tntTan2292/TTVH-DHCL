# F13-BCVH-WEEKLY-COMPARISON-01 — So sánh chất lượng theo tuần (BCVH Ranking) — Design of Record

Status: **IMPLEMENTED / TECH PASS / READY FOR INDEPENDENT RE-REVIEW**
Author: Claude Code (Sonnet 5) + Antigravity (Gemini), incorporating Independent Review remediation (Blockers B1–B4)
Branch: `codex/da-impl-006`
Ticket: `F13-BCVH-WEEKLY-COMPARISON-01`
Manifest of record: `docs/10_TICKETS/F13-BCVH-WEEKLY-COMPARISON-01_MANIFEST.md`

---

## 1. Mục tiêu

Bổ sung một **bảng điều hành so sánh chất lượng hàng tuần** trong Module BCVH Ranking
(`/f13/ranking/bcvh`), cho phép người dùng chọn **tuần kỳ này** và **tuần dùng để so sánh** trong
danh sách đầy đủ các tuần đã có dữ liệu, và xem chênh lệch sản lượng/tỷ lệ đạt KPI F1.3 giữa hai
tuần đó cho 6 BCVH đang hiển thị.

Ràng buộc PO đã chốt trước khi code:

- Tuần bắt đầu **Thứ Năm**, kết thúc **Thứ Tư** — không phải tuần ISO 8601 Thứ Hai→Chủ Nhật.
- Số tuần dùng đúng chuẩn ISO 8601 (Tuần 36/37/38 khớp ví dụ PO cho).
- Tuần chưa đủ dữ liệu hiển thị đúng phạm vi thực có + ghi chú "Dữ liệu đến ngày …", **không** tự
  coi ngày kết thúc tuần theo lịch là đã có dữ liệu.
- Dòng TỔNG CỘNG = tổng sản lượng / tổng số đạt của 6 BCVH, **không** lấy trung bình cộng tỷ lệ.
- Chênh lệch hiển thị theo điểm % tuyệt đối, cùng quy ước với các khối MTD/D-1/D-7 đã có.
- Không gộp vào endpoint `/overview` hiện có; tạo luồng riêng.
- Không đổi KPI F1.3/SSOT, không đổi các khối/ticket đã đóng, không thêm schema/index nếu chưa đo
  và chứng minh cần thiết.

## 2. Quy tắc tuần (điểm quyết định nghiệp vụ duy nhất của ticket này)

### 2.1 Biên tuần: Thứ Năm → Thứ Tư

Cho một ngày bất kỳ, ngày bắt đầu tuần là Thứ Năm gần nhất **trước hoặc bằng** ngày đó:

```
offsetFromThursday = (dayOfWeek(Sun=0..Sat=6) - 4 + 7) % 7
weekStart = date - offsetFromThursday days
weekEnd   = weekStart + 6 days   // luôn là Thứ Tư
```

### 2.2 Đánh số tuần: tái dùng đúng thuật toán ISO 8601, chỉ đổi biên ngày

Tuần tùy biến (Thứ Năm→Thứ Tư) và tuần ISO 8601 chuẩn (Thứ Hai→Chủ Nhật) chứa cùng một Thứ Năm —
vì ISO 8601 luôn lấy Thứ Năm của mỗi tuần Thứ Hai→Chủ Nhật làm neo xác định số tuần/năm ISO của tuần
đó. Do đó: **số tuần của tuần tùy biến = số tuần ISO 8601 tính trên đúng ngày Thứ Năm mở đầu tuần
đó**, dùng thuật toán ISO 8601 chuẩn (an toàn qua ranh giới năm). Đã xác minh bằng script thực tế:
`03/09/2026` (Thứ Năm) → ISO week 36 2026, khớp chính xác ví dụ PO cho (Tuần 36 = 03/09–09/09/2026,
Tuần 37 = 10/09–16/09/2026, Tuần 38 = 17/09–23/09/2026). Round-trip (weekId → ngày Thứ Năm → weekId)
đã kiểm tra cho toàn bộ ngày của các năm 2024–2027, không lệch một ngày nào qua ranh giới năm.

`week_id` format: `YYYY-Www` (vd `2026-W36`), độc lập với năm dương lịch của `weekStart`/`weekEnd`
khi tuần rơi vào ranh giới năm (ISO year có thể khác calendar year của một vài ngày trong tuần).

### 2.3 Tuần chưa đủ dữ liệu — thuần dựa trên dữ liệu thật, không dùng khái niệm "hôm nay"

Một tuần được coi là **đang diễn ra / dữ liệu chưa về kịp** khi và chỉ khi ngày có dữ liệu thật cuối
cùng trong tuần đó (`last_data_date`, từ chính bảng `fact_f13`) **nhỏ hơn** `weekEnd` (Thứ Tư theo
lịch):

```
is_in_progress   = last_data_date < weekEnd
display_end_date = is_in_progress ? last_data_date : weekEnd
days_in_period    = (display_end_date - weekStart) + 1
days_with_data     = COUNT(DISTINCT ngày có dữ liệu trong tuần)   // từ SQL, không suy diễn
```

Cách này cố tình **không** dùng "ngày hôm nay"/"anchor_date" như `bcvhOverviewService.js` — vì nó xử
lý đúng cả hai tình huống PO nêu bằng cùng một quy tắc, không cần phân biệt:

- Tuần đang diễn ra, dữ liệu mới về đến giữa tuần (ví dụ PO: `17/09–21/09`, "Dữ liệu đến ngày
  21/09/2026").
- Một tuần **đã qua** nhưng bị thiếu dữ liệu cuối tuần vĩnh viễn (không import) — hệ thống vẫn không
  được tự nhận có dữ liệu đến Thứ Tư.

Khi tuần đã có đủ dữ liệu qua hết Thứ Tư nhưng **thiếu ở giữa** tuần (kiểu `RISK-DATA-01` của ticket
Overview, không phải ở cuối), `last_data_date == weekEnd` nên `is_in_progress = false`; khoảng hiển
thị vẫn là trọn tuần, và `days_with_data < days_in_period = 7` tự nhiên trở thành badge độ phủ
`d/7 ngày` — cùng cơ chế badge đã có ở khối tháng (§4.4 của Design of Record
`F13-BCVH-RANKING-OVERVIEW-01`), áp lại cho đơn vị tuần.

**Một tuần hoàn toàn chưa có dữ liệu (Thứ Năm mới bắt đầu, chưa import ngày nào) không xuất hiện
trong danh sách** — vì danh sách được liệt kê trực tiếp từ các dòng có thật trong `fact_f13`
(`GROUP BY week_start`), không có bước "tạo tuần rỗng".

## 3. Kiến trúc — luồng riêng, không đụng `/overview`

Hai endpoint mới, tách biệt hoàn toàn khỏi `GET /f13/ranking/bcvh/overview`:

```
GET /api/f13/ranking/bcvh/weeks
GET /api/f13/ranking/bcvh/weekly-comparison?week=YYYY-Www&compare_week=YYYY-Www
```

Cả hai đặt sau `allowViewerRead` (`admin` + `viewer`), giống mọi route đọc F1.3 khác. Chỉ đọc,
không ghi, không đụng schema.

### 3.1 `getBcvhWeeksList` — 1 truy vấn duy nhất

```sql
SELECT
    date(ngay_do_kiem, '-' || ((CAST(strftime('%w', ngay_do_kiem) AS INTEGER) - 4 + 7) % 7) || ' days') AS week_start,
    MIN(ngay_do_kiem) AS first_date,
    MAX(ngay_do_kiem) AS last_date,
    COUNT(DISTINCT ngay_do_kiem) AS days_with_data
FROM fact_f13
WHERE ma_bcvh IN (6 mã canonical)
GROUP BY week_start
ORDER BY week_start ASC
```

### 3.2 `getBcvhWeeklyComparisonAggregate` — 1 truy vấn cho 2 tuần bất kỳ

```sql
SELECT ma_bcvh, MAX(ten_bcvh) AS ten_bcvh,
       SUM(CASE WHEN ngay_do_kiem BETWEEN ?A_from AND ?A_to AND ma_bg IS NOT NULL THEN 1 ELSE 0 END) AS volume_a,
       SUM(CASE WHEN ngay_do_kiem BETWEEN ?A_from AND ?A_to AND ma_bg IS NOT NULL AND danh_gia_2026='Đạt' THEN 1 ELSE 0 END) AS passed_a,
       SUM(CASE WHEN ngay_do_kiem BETWEEN ?B_from AND ?B_to AND ma_bg IS NOT NULL THEN 1 ELSE 0 END) AS volume_b,
       SUM(CASE WHEN ngay_do_kiem BETWEEN ?B_from AND ?B_to AND ma_bg IS NOT NULL AND danh_gia_2026='Đạt' THEN 1 ELSE 0 END) AS passed_b
FROM fact_f13
WHERE ma_bcvh IN (6 mã canonical)
  AND (ngay_do_kiem BETWEEN ?A_from AND ?A_to OR ngay_do_kiem BETWEEN ?B_from AND ?B_to)
GROUP BY ma_bcvh
```

### 3.3 Service (`bcvhWeeklyComparisonService.js`)

- `listWeeks()` — gọi repository, tính `week_id`/nhãn/khoảng hiển thị/badge cho từng dòng theo §2.
- `compareWeeks(weekIdA, weekIdB)` — validate 2 week id, resolve về khoảng ngày thật, gọi truy vấn §3.2, tính `rate`, tính `rate_delta = rateA - rateB` (điểm % tuyệt đối), và dòng `TỔNG CỘNG` bằng cách cộng sản lượng/số đạt trước, tính tỷ lệ sau.

## 4. Frontend

- `frontend/src/features/ranking/bcvhWeeklyComparisonFetcher.js` — 2 hàm fetch độc lập (`createWeeksListFetcher`, `createWeeklyComparisonFetcher`).
- `frontend/src/features/ranking/bcvhWeeklyComparisonData.js` — pure mapper/formatter helpers (`snapToThursday`, `resolveWeekFromAnchorDate`, `resolveWeeksListWithAnchor`, `buildWeekOptions`, `checkWeeksDaysMismatch`, `formatWeekDataNote`).
- `frontend/src/features/ranking/BcvhWeeklyComparisonBlock.jsx` — bảng điều hành mới độc lập theo chuẩn Operation Dashboard (tiêu đề 2 dòng, header nhóm 2 tầng, dòng TỔNG CỘNG đầu bảng, 06 dòng BCVH, bộ lọc tuần riêng, fitMode, cảnh báo khác số ngày dữ liệu, và điều chỉnh mốc tuần tự động căn về Thứ Năm).
- `frontend/src/features/ranking/BcvhRankingPage.jsx` — chèn `<BcvhWeeklyComparisonBlock />` độc lập, không nhét vào `UnifiedBcvhAnalysisTable`.

## 5. Remediation Record — Xử lý Blockers B1–B4 (Review Opus)

1. **B1 – Căn Thứ Năm (`snapToThursday`)**:
   - Khi người dùng nhập/chọn bất kỳ ngày nào (ví dụ: `14/09/2026` Thứ Hai), hệ thống tự động căn về Thứ Năm mở đầu tuần đó (`10/09/2026` = Tuần 37).
   - Tuyệt đối không hiển thị `14/09–20/09`. Nhãn UI, tuần gửi API và khoảng ngày dữ liệu thống nhất 100%.

2. **B2 – Không sinh tuần giả / Không hard-code**:
   - Bỏ toàn bộ fallback hard-code `2026-09-17`.
   - Không tự sinh tuần tương lai (W39, W40), không tự gán `days_with_data=7`.
   - Nếu API trả rỗng hoặc lỗi, UI hiển thị rõ: `Chưa có dữ liệu tuần`.
   - Nếu người dùng chọn mốc tương lai (`01/10/2026`), hệ thống tự căn về tuần có dữ liệu gần nhất (Tuần 38) kèm thông báo rõ ràng.

3. **B3 – Không làm mất tuần có dữ liệu**:
   - Khi đổi mốc về `10/09/2026`, W38 vẫn tồn tại đầy đủ trong danh sách lựa chọn (được sắp xếp tuần mới nhất lên đầu).
   - Không dùng cơ chế lùi cố định 12 tuần gây mất tuần thực tế.
   - Không sinh thêm tuần 2025 giả lập. Chỉ hiển thị tuần thực tế từ API.

4. **B4 – Tuần 38 hiển thị thực tế đến ngày 21/09**:
   - Tuần 38 có biên đầy đủ `17/09–23/09/2026`, nhưng vì dữ liệu thực tế chỉ đến ngày 21/09/2026, UI hiển thị:
     `17/09–21/09/2026`
   - Kèm theo ghi chú:
     `Dữ liệu đến ngày 21/09/2026`
   - Không bao giờ chỉ hiển thị `17/09–23/09/2026` đối với tuần đang diễn ra.

5. **Responsiveness & Typography**:
   - Đã gỡ bỏ các class `whitespace-nowrap` trên các dòng tiêu đề tổng hợp dài, tránh nguy cơ đè chữ/tràn cột ở các độ phân giải 1280px, 1440px và mobile.

6. **PO UI Layout & Multi-Column Sorting Adjustments (2026-09-28)**:
   - **Vị trí bộ lọc phía trên cùng**: Bộ lọc độc lập được dời lên trên cùng trước tiêu đề báo cáo, gom Tiêu đề (2 dòng) và Bảng dữ liệu thành một khối `.bcvh-weekly-report-capture-area` liền kề, tối ưu cho việc chụp ảnh bảng biểu làm báo cáo.
   - **Nhãn nhóm cột SO SÁNH**: Đổi tên nhóm cột từ `CHÊNH LỆCH` sang `SO SÁNH`.
   - **Gỡ bỏ lưu ý trong thead**: Bỏ badge cảnh báo lệch số ngày khỏi ô `<th>`, chỉ hiển thị cảnh báo tập trung tại khối bộ lọc phía trên.
   - **Mặc định sắp xếp**: Tự động sắp xếp các BCVH theo Tỷ lệ đạt KPI 2026 của Tuần kỳ này giảm dần (`current_rate` desc), tie-break bằng sản lượng đo kiểm.
   - **Sort toggle toàn bộ các cột**: Hàm tiện ích `sortBcvhWeeklyRows` và component helper `renderSortableTh` cho phép người dùng click vào bất kỳ cột nào ở tầng 2 để đảo chiều sắp xếp (cột số mặc định desc, cột text mặc định asc), có icon định hướng `ArrowDown`/`ArrowUp`/`ArrowUpDown`.

## 7. Ngoài phạm vi

- Đổi công thức F1.3/SSOT, ngưỡng, hoặc `getBcvhRanking()`.
- Đổi schema, thêm index, migration.
- Mở lại các ticket đã đóng.
- Tự cấp PO PASS.

