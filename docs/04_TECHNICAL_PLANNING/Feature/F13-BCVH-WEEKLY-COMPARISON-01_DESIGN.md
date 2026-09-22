# F13-BCVH-WEEKLY-COMPARISON-01 — So sánh chất lượng theo tuần (BCVH Ranking) — Design of Record

Status: **IMPLEMENTED / TECH PASS / READY FOR PO UI CHECK**
Author: Claude Code (Sonnet 5), based on a prior read-only audit report (see `docs/10_TICKETS/F13-BCVH-WEEKLY-COMPARISON-01_MANIFEST.md` for the chat-authorized scope)
Branch: `codex/da-impl-006`
Ticket: `F13-BCVH-WEEKLY-COMPARISON-01`
Manifest of record: `docs/10_TICKETS/F13-BCVH-WEEKLY-COMPARISON-01_MANIFEST.md`

---

## 1. Mục tiêu

Bổ sung một **bảng điều hành so sánh chất lượng hàng tuần** trong Module BCVH Ranking
(`/f13/ranking/bcvh`), cho phép người dùng chọn **tuần kỳ này** và **tuần dùng để so sánh** trong
danh sách đầy đủ các tuần đã có dữ liệu, và xem chênh lệch sản lượng/tỷ lệ đạt KPI F1.3 giữa hai
tuần đó cho 6 BCVH đang hiển thị.

Ràng buộc PO đã chốt trước khi code (xem Manifest §2):

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

Hai endpoint mới, tách biệt hoàn toàn khỏi `GET /f13/ranking/bcvh/overview` (đúng lý do đã ghi ở
§5.1 của Design of Record ticket Overview: gộp vào sẽ phá vỡ ràng buộc "4 truy vấn cố định" đã được
PO chấp nhận cho endpoint đó):

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

Đo thật trên `database.sqlite` (750k+ dòng, 38 tuần có dữ liệu): **~690 ms**. Không có index mới —
`idx_bcvh_ngay(ma_bcvh, ngay_do_kiem)` đã có phủ phần lớn; chấp nhận được vì đây là truy vấn nạp
danh sách chọn tuần, gọi khi mở bảng, không nằm trên đường tải chính của trang.

### 3.2 `getBcvhWeeklyComparisonAggregate` — 1 truy vấn cho 2 tuần bất kỳ

Không giả định hai tuần liền kề. Dùng `CASE`/`SUM` gộp cả hai khoảng ngày trong một lượt quét thay
vì 2 truy vấn riêng, cùng định nghĩa mẫu số `COUNT(ma_bg)` / `danh_gia_2026 = 'Đạt'` đã dùng xuyên
suốt module (Design of Record Overview §2.7/§5.3):

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

`?A_from/to` và `?B_from/to` là `display_start_date`/`display_end_date` đã được resolve ở tầng
service (chưa bao giờ vượt quá `last_data_date` thật — không "giả định" dữ liệu). Phạm vi quét tối
đa 14 ngày dữ liệu bất kể hai tuần cách nhau bao xa trong năm. Đo thật trên database.sqlite (tuần 1
so với tuần 38, cách nhau ~9 tháng): **~1.0 s** — bao gồm cả bước `listWeeks()` nội bộ để resolve
week id → bounds trước khi query.

### 3.3 Service (`bcvhWeeklyComparisonService.js`)

- `listWeeks()` — gọi repository, tính `week_id`/nhãn/khoảng hiển thị/badge cho từng dòng theo §2.
- `compareWeeks(weekIdA, weekIdB)` — validate 2 week id (400 `INVALID_WEEK_ID` nếu sai định dạng,
  400 `WEEK_NOT_FOUND` nếu tuần không có trong danh sách, 400 `MISSING_PARAM` nếu thiếu tham số),
  resolve về khoảng ngày thật, gọi truy vấn §3.2, tính `rate` (`nullableRate`, giống hệt công thức
  đã dùng trong `bcvhOverviewService.js`), tính `rate_delta = rateA - rateB` (điểm % tuyệt đối, PO
  yêu cầu), và dòng `TỔNG CỘNG` bằng cách **cộng sản lượng/số đạt trước, tính tỷ lệ sau** — không
  lấy trung bình 6 tỷ lệ (kiểm chứng bằng test số liệu cố ý lệch để hai cách tính phải cho kết quả
  khác nhau).
- Không có trường `alert`/`warning`/`risk` trong response (giữ nguyên quy ước PO decision 8 của
  ticket Overview).

## 4. Frontend

- `frontend/src/features/ranking/bcvhWeeklyComparisonFetcher.js` — 2 hàm fetch độc lập
  (`createWeeksListFetcher`, `createWeeklyComparisonFetcher`), cùng khuôn mẫu chống race-condition
  (`currentRequestSeq`) đã dùng ở `bcvhOverviewFetcher.js`, nhưng **không dùng lại cùng state hay
  cùng effect** — đúng yêu cầu "tạo luồng riêng".
- `frontend/src/features/ranking/bcvhWeeklyComparisonData.js` — mapper thuần (label tuần, format
  delta điểm % có dấu, format delta sản lượng có dấu).
- `frontend/src/features/ranking/BcvhWeeklyComparisonBlock.jsx` — component tự quản trạng thái
  (danh sách tuần tải 1 lần khi mount; mặc định chọn tuần mới nhất làm "kỳ này" và tuần liền trước
  làm "so sánh", người dùng đổi được sang bất kỳ 2 tuần nào khác), bảng 6 dòng BCVH + `TỔNG CỘNG`,
  badge "Dữ liệu đến ngày …" / "d/D ngày" khi tuần được chọn chưa đủ dữ liệu.
- `frontend/src/features/ranking/BcvhRankingPage.jsx` — chèn `<BcvhWeeklyComparisonBlock />` sau 4
  khối Overview hiện có. **Không** đụng `useEffect` gọi `/f13/ranking/bcvh/overview`, không đụng
  khối 5 (bảng xếp hạng ngày), không đụng 4 `KPICard`/`DoughnutSummary` — khối mới hoàn toàn độc
  lập, tự fetch, tự render trạng thái loading/error/empty của chính nó.

## 5. Ngoài phạm vi

- Đổi công thức F1.3/SSOT, ngưỡng, hoặc `getBcvhRanking()`.
- Đổi schema, thêm index, migration.
- Mở lại `F13-BCVH-RANKING-OVERVIEW-01` (`CLOSED / PO PASS`) hay bất kỳ ticket đã đóng nào khác.
- Gộp vào `/f13/ranking/bcvh/overview`.

## 6. Rủi ro/giới hạn còn lại

- **`RISK-PERF-02`** — `getBcvhWeeksList()` quét toàn bộ `fact_f13` theo `ma_bcvh` (không giới hạn
  theo năm); đo thật hiện tại ~690 ms với 38 tuần/750k dòng là chấp nhận được, nhưng sẽ chậm dần
  tuyến tính theo số năm dữ liệu tích lũy. Nếu PO thấy chậm khi nghiệm thu nhiều năm sau, lối ra là
  một index `(ma_bcvh, ngay_do_kiem)` phủ rộng hơn hoặc cache theo tuần đã đóng — **không** tự thêm
  trong ticket này (đúng ràng buộc PO: không thêm schema nếu chưa đo và chứng minh cần thiết).
- **`RISK-SCOPE-02`** — quy tắc "tuần Thứ Năm→Thứ Tư" chỉ áp dụng cho tính năng này; không lan sang
  bất kỳ khối/báo cáo nào khác đang dùng khái niệm "tuần" theo nghĩa khác (D-7 so sánh 1 ngày ở
  Operation Dashboard, hay tuần ISO chuẩn nếu xuất hiện sau này) — không có shared constant nào bị
  đổi để tránh nhầm lẫn giữa hai định nghĩa tuần khác nhau trong cùng hệ thống.
