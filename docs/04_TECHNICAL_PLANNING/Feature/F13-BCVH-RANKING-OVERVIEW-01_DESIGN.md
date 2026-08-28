# F13-BCVH-RANKING-OVERVIEW-01 — BCVH Ranking Overview (T01 → hiện tại) — Design of Record

Status: **IMPLEMENTED / PO PASS / CLOSED** (2026-08-28) — see the Closure note at the end of this document.
Revision: **R1 (2026-08-28)** — two CTO-found internal contradictions resolved; see §12.
(this document itself is documentation-only; no code, database, schema or API changed by it)
Author: Claude Code (Opus, READ-ONLY architecture pass) → Claude/CTO → Product Owner
Branch: `codex/da-impl-006` · Baseline HEAD at authoring: `d1179155` · R1 applied on `66f3b884`
Ticket: `F13-BCVH-RANKING-OVERVIEW-01`
Manifest of record: `docs/10_TICKETS/F13-STANDARDIZATION-001_MANIFEST.md` Sections 35 + 36 (append-only); closure recorded in Section 45

---

## 1. Mục tiêu

Product Owner phát hiện Operation Dashboard F1.3 buộc phải **chọn từng BCVH mới xem được lịch
sử**, nên không có bề mặt nào cho câu hỏi điều hành thật: *"từ T01/2026 đến hiện tại, 6 BCVH
đang đi lên hay đi xuống, và ai đang kéo tụt?"*

Ticket này bổ sung **4 khối tổng quan mới** ngay trong Module BCVH Ranking (`/f13/ranking/bcvh`),
phía trên bảng xếp hạng ngày hiện có.

Ràng buộc tuyệt đối do PO đặt:

- **Không đập đi xây lại.** Bảng xếp hạng ngày hiện tại giữ nguyên 100%.
- **Không đổi công thức F1.3 / SSOT.** Mọi con số mới phải tái dùng đúng định nghĩa đã có.
- Hệ thống chỉ có **đúng 06 BCVH chuẩn**.

Ticket này **không** phải bản redesign của `F13-BCVH-RANKING-REDESIGN-IMPL` (đã `CLOSED / PO PASS`,
`2026-07-29`). Ticket đó không được mở lại; hợp đồng sản phẩm nó chốt được ticket này bảo toàn.

### 1.1 Quyết định PO đã duyệt (9 điểm, `2026-08-28`)

| # | Quyết định | Ràng buộc thi công |
| --- | --- | --- |
| 1 | Tháng thiếu dữ liệu **vẫn hiển thị**, kèm **độ phủ ngày** | Không ẩn tháng, không nội suy; badge `d/D ngày` bắt buộc |
| 2 | Ngày neo = `min(N-1, max_date có dữ liệu)` | Không dùng `today` trần; không dùng `max_date` trần |
| 3 | Khối tuyến tính **MTD**, nhãn **"Tuyến có phát sinh trong kỳ"** | Không dùng kỳ ngày, không dùng YTD |
| 4 | Giữ nguyên ngưỡng tuyến **70/60/50** | Không đặt ngưỡng riêng cho kỳ dài |
| 5 | Chỉ đúng **06 BCVH canonical** | Lọc ở tầng SQL, không lọc ở frontend |
| 6 | **Tỷ lệ là số chính**, sản lượng là thông tin phụ | Trục Y biểu đồ = tỷ lệ; sản lượng đi cột phụ/tooltip |
| 7 | **Sửa lỗi dòng TỔNG CỘNG** đang cộng cả 3 mã ngoài canonical | Trước hoặc cùng Phase Backend |
| 8 | D-1/D-7 **chỉ là so sánh**, không gọi là cảnh báo | Cấm từ "cảnh báo"/"alert"/"rủi ro" trên nhãn so sánh |
| 9 | Giữ nguyên bảng xếp hạng ngày hiện tại | `getBcvhRanking()` không đổi hành vi |

---

## 2. Cơ sở kiểm chứng code thật

Toàn bộ thiết kế dưới đây dựa trên đọc code và đo trên database thật
(`backend/src/db/database.sqlite`, 750.283 bản ghi `fact_f13`, `2026-01-01` → `2026-08-27`),
không dựa trên suy đoán.

### 2.1 MTD fields đã có trong `/f13/ranking/bcvh` — CÓ, thiếu đúng một trường

`F13DashboardService.js:881-891` đã trả về cho từng BCVH:
`month_to_date_sl_bg_ptc`, `month_to_date_dat_kpi_2026`, `month_to_date_khong_dat_kpi_2026`,
`month_to_date_kpi_2026`, cùng bộ `previous_month_to_date_*`;
`meta.month_to_date` mang `{from_date, to_date, requested_to_date, current_data_date,
used_latest_available, available}`.

**Thiếu: `month_to_date_rank`.** Trường `rank` hiện tại (`FactBuuGuiRepository.js:120`) là
`RANK() OVER` trên **khoảng ngày được request**, tức là hạng NGÀY khi trang gửi `from = to`.
Khối 3 cần hạng theo MTD — chưa tồn tại, nhưng tính được thuần từ dữ liệu MTD đã có.

### 2.2 `route_distribution` tính theo KHOẢNG NGÀY — ngữ nghĩa đã đúng, đường thực thi thì không

Nguồn là `getFactBetween(fromDate, toDate)` (`F13DashboardService.js:828`), rồi
`_buildRouteDistributionMap` gom theo `(ma_bcvh, ma_tuyen)` — **có khử trùng tuyến** — cộng dồn
`total_bg`/`dat_kpi_2026` trên toàn khoảng, và `_buildRouteDistributionSummary` xếp băng trên tỷ lệ
của cả kỳ. Ngưỡng hiện hành: `>= 70` green, `>= 60` pink, `>= 50` yellow, còn lại red.

Vậy chạy khối tuyến ở kỳ MTD là **miễn phí về công thức**. Vấn đề nằm ở chi phí — xem §2.5.

### 2.3 D-1/D-7 là so sánh thuần — xác nhận không có cảnh báo

`_buildComparisonBlock` chỉ sinh `delta` / `direction` / `comparison_rank`;
`_calculateNullableRateDelta` trả `null` khi một trong hai kỳ không có dữ liệu. Không có ngưỡng,
không có mức độ nghiêm trọng, ở cả backend lẫn frontend: `rank_movement.signal` chỉ là nhãn hướng
tăng/giảm hạng, còn `current_day.signal` là nhãn **băng tỷ lệ hiện tại** (`buildSignal(currentRate)`),
không phải cảnh báo D-1/D-7. PO decision 8 **xác nhận trạng thái đang đúng**, và cấm hồi quy.

### 2.4 Biểu đồ hiện có không hỗ trợ 6 đường — cần component mới, KHÔNG cần thư viện mới

`recharts ^3.9.0` đã có trong `frontend/package.json:20`; `LineChart` hỗ trợ nhiều `<Line>` nguyên bản.
Cả hai component hiện hữu đều không tái sử dụng được:

| Component | Vì sao không dùng lại được |
| --- | --- |
| `frontend/src/components/f13/TrendChart.jsx` | Hardcode đúng 1 `<Line dataKey="kpi_rate">`, tiêu đề cứng "Xu hướng 30 ngày" |
| `frontend/src/features/dashboard/components/QualityDeliveryTrendlineAdapter.jsx` | Đơn series, **tự fetch bên trong** (không nhận data qua props), hardcode `TARGET_RATE = 90` |

`TARGET_RATE = 90` là bẫy trực quan có thật: tỷ lệ tháng đo được là **T01 61,26% → T08 50,47%**
(6 BCVH canonical). Tái dùng adapter đó sẽ ép cả 6 đường nằm bẹp dưới đáy khung.

**Kết luận:** viết `BcvhMultiSeriesTrendChart` mới — nhận data qua props, không tự fetch, không có
đường target cứng, domain trục Y co theo dữ liệu.

### 2.5 Chi phí đo thật — cơ sở của quyết định API

`getFactBetween` cho **một** tháng (`2026-08-01` → `2026-08-27`):

```
rows 96305   query_ms 3679   parse_ms 16   heapMB 431
```

96.305 bản ghi, `SELECT *`, ~3,7 giây, ~431 MB heap. Gọi `/f13/ranking/bcvh` với range cả tháng để
lấy khối tuyến là **không chấp nhận được**. Đây là lý do kiến trúc để **không** mở rộng endpoint cũ.

### 2.6 `/f13/dashboard/quality-timeline` đã sinh sẵn `monthlyYtd` nhưng gây N+1

`timelineService.js:259-283` trả `{month, label "T1", total_volume, passed, pass_rate, from_date,
to_date, is_current_month, cumulative_label}` cho T01 → tháng được chọn, và tháng hiện tại **tự cắt
tại `latestBusinessDate`**. Khối 1 gần như đã có backend.

**Nhưng** nó chỉ nhận `ma_bcvh` đơn lẻ → muốn 6 đường phải gọi **6 lần**, và mỗi lần còn kéo thêm
truy vấn daily 90 ngày dù `mode=month`. Đây chính là nguồn N+1 phải tránh.

### 2.7 Lệch mẫu số giữa các nguồn — phải thống nhất

| Nguồn | Mẫu số | Lọc BCVH |
| --- | --- | --- |
| `getBcvhRanking` / `getBcvhOperationMetrics*` | `COUNT(ma_bg)` | `ma_bcvh IS NOT NULL` |
| `getDailyTrendData` | `COUNT(*)` | không lọc |
| `timelineService` | `COUNT(*)` | không lọc |

Nếu khối 1 lấy từ timeline còn khối 3 lấy từ ranking, hai con số cùng một tháng có thể lệch nhau và
người dùng sẽ báo lỗi. Endpoint mới **bắt buộc dùng một định nghĩa duy nhất**: `COUNT(ma_bg)`,
`danh_gia_2026 = 'Đạt'`, lọc canonical — khớp với ranking hiện tại (PO decision 5 + 6).

### 2.8 Defect PO decision 7 — dòng TỔNG CỘNG cộng cả mã ngoài canonical

`F13DashboardService.js:962-968`: `totalCurrent` reduce trên **toàn bộ** `currentMetrics`, không lọc
canonical; trong khi cùng dòng đó `delayed_cash_handover_count` và `f13_303_rate` lại lọc canonical
(`canonicalCurrentFacts`, dòng 849). Frontend lọc canonical ở mapper
(`unifiedBcvhAnalysisTableData.js:189`) nên **6 dòng BCVH hiển thị đúng**, chỉ **dòng TỔNG CỘNG lệch**.

Ba mã ngoài canonical có thật trong database:

| `ma_bcvh` | `ten_bcvh` | Số bản ghi | Khoảng ngày |
| --- | --- | --- | --- |
| `531600` | Trần Hưng Đạo | 738 | `2026-01-03` → `2026-07-28` |
| `531110` | Trung tâm Hành chính công | 16 | `2026-01-20` → `2026-06-08` |
| `531120` | Khách hàng lớn | 2 | trong T08 |

Độ lệch ~0,1% — nhỏ nhưng là sai đúng nghĩa, và PO đã duyệt sửa (decision 7).

---

## 3. Năm khối

Nguyên tắc bố cục: 4 khối mới **nằm phía trên** khối 5, mỗi khối là một component độc lập, có
trạng thái **render** loading / error / empty riêng.

Phân biệt rõ hai thứ, vì đây là chỗ đã từng viết mâu thuẫn (xem §12):

- **Tải dữ liệu:** 4 khối mới dùng **đúng một request** tới `/f13/ranking/bcvh/overview`, trả về cả
  bốn mảng `monthly` + `daily` + `mtd` + `routes` cùng lúc (§5). Không có khối nào tự fetch riêng.
- **Hiển thị:** mỗi khối tự quản trạng thái render của nó, nên một khối rỗng không làm hỏng ba khối
  còn lại.

Khối 5 giữ nguyên request `/f13/ranking/bcvh` riêng của nó — hai vòng tải này độc lập, nên đổi date
picker không làm nháy toàn trang.

Thứ tự dọc: **Khối 3 (MTD) → Khối 1 (tháng) → Khối 4 (tuyến) → Khối 2 (ngày, thu gọn) → Khối 5**.
Lý do: PO cần con số chốt kỳ trước, rồi mới tới xu hướng, rồi mới tới chi tiết.

### 3.1 Khối 1 — Xu hướng tháng (T01 → tháng hiện tại)

- Biểu đồ đường **6 series** + bảng số liệu ngay dưới.
- Trục X = `T1 … Tn`. Trục Y = **tỷ lệ đạt** (PO decision 6), domain tự co theo dữ liệu,
  **không** `ReferenceLine` 90.
- Legend bật/tắt từng BCVH.
- Tháng hiện tại vẽ **nét đứt** + nhãn `lũy kế đến <anchor_date>`.
- Bảng: 6 dòng × n cột tháng. Ô hiển thị **tỷ lệ là số chính**, sản lượng là dòng phụ nhỏ hơn.
- Tháng thiếu dữ liệu: **vẫn hiển thị tỷ lệ** (PO decision 1), kèm badge độ phủ `21/26 ngày`.
  Thiếu ngày **không** làm `rate` thành `null` — chừng nào mẫu số còn `> 0` thì vẫn tính tỷ lệ
  trên phần dữ liệu có thật. Quy tắc đầy đủ ở §4.4.
- Ô không có bản ghi, hoặc có bản ghi nhưng mẫu số `= 0`: `—`, **không** hiển thị `0`.

### 3.2 Khối 2 — Diễn biến ngày (01 → ngày neo), mặc định thu gọn

- `<details>` đóng sẵn. **Thu gọn là hành vi UI thuần** — dữ liệu `daily` đã nằm sẵn trong request
  chung ở §5, nên **không** có lazy-fetch, và mở/đóng khối **không** phát thêm request nào.
- Cùng component biểu đồ với khối 1, khác nguồn data.
- Ngày không có dữ liệu để **đứt đoạn** (`connectNulls={false}`), **không nội suy**.
- Nhãn ghi ngày cuối **thực tế**, không ghi chữ "N-1".

### 3.3 Khối 3 — Tổng hợp MTD

Bảng 6 dòng + dòng TỔNG CỘNG:

| Cột | Nguồn |
| --- | --- |
| Sản lượng | `mtd.volume` (phụ) |
| Đạt | `mtd.passed` |
| Không đạt | `mtd.failed` |
| **Tỷ lệ** | `mtd.rate` (**số chính**, PO decision 6) |
| **Hạng MTD** | tính mới — xem dưới |
| So cùng kỳ tháng trước | `previous_month_to_date_*` (đã có sẵn) |

**Quy tắc hạng MTD:** xếp `rate` giảm dần, tie-break bằng `volume` giảm dần — **đồng dạng với
`RANK() OVER (ORDER BY rate DESC, volume DESC)` sẵn có** ở `FactBuuGuiRepository.js:120`, để hạng MTD
và hạng ngày không mâu thuẫn quy tắc. Đây là **quy tắc xếp hạng đã có, áp lên kỳ khác**, không phải
công thức F1.3 mới.

Nhãn so sánh cùng kỳ dùng chữ **"so với cùng kỳ tháng trước"** — không phải cảnh báo (PO decision 8).

### 3.4 Khối 4 — Năng lực và chất lượng tuyến (kỳ MTD)

6 dòng: **"Tuyến có phát sinh trong kỳ"** (PO decision 3) + Tốt / Khá / Trung bình / Kém.

Ánh xạ nhãn **giữ nguyên** như `BcvhRankingPage.jsx:33-37` — không được đổi:

| Băng | Ngưỡng (PO decision 4) | Nhãn |
| --- | --- | --- |
| green | `>= 70` | **Tốt** |
| pink | `>= 60` | **Khá** |
| yellow | `>= 50` | **Trung bình** |
| red | `< 50` | **Kém** |

Ghi rõ kỳ tính ngay trên tiêu đề khối: `Kỳ: 01/08/2026 – 27/08/2026 (MTD)`.

**Cảnh báo ngữ nghĩa bắt buộc ghi trên UI:** con số này chỉ đếm tuyến **phát bưu tá phạm vi Huế** đã
lọc qua `classifyRoute()` (`route_scope === 'hue' && is_postman_delivery_route`), **không phải tổng
tuyến**. Và trên kỳ MTD, một BCVH có 20 tuyến/ngày vẫn có thể ra 23 tuyến/tháng do luân chuyển —
đó chính là lý do nhãn phải là "có phát sinh trong kỳ".

### 3.5 Khối 5 — Bảng xếp hạng ngày: GIỮ NGUYÊN

Không đụng tới `UnifiedBcvhAnalysisTable`, không đụng hợp đồng single-day
`from_date === to_date`, không đụng 4 `KPICard` hiện có, không đụng `getBcvhRanking()`.

Ngoại lệ duy nhất: fix PO decision 7 ở dòng TỔNG CỘNG (§2.8) — sửa **sai số**, không sửa **hành vi**.

---

## 4. Quy tắc thời gian

### 4.1 Ngày neo (`anchor_date`)

```
anchor_date = min( today - 1 , max_date )
max_date    = MAX(ngay_do_kiem) WHERE date(ngay_do_kiem) <= date('now','localtime')
```

(PO decision 2. `max_date` lấy từ `/f13/dashboard/meta`, `kpiController.js:396`.)

Lý do lấy `min` của cả hai: `max_date` là ngày **có dữ liệu thật**; `today - 1` là **trần nghiệp vụ**
(không bao giờ hiển thị ngày hôm nay như một kỳ đã chốt). Tại thời điểm soạn tài liệu, hai giá trị
trùng nhau (`2026-08-27`) nên **PO UI check không phân biệt được hai cách hiểu** — đây chính là lý do
quy tắc phải viết ra ở đây, và là lý do test plan §8 bắt buộc có ca `max_date < today - 1`.

Nếu `max_date < today - 1`, hiển thị dải thông tin `Dữ liệu mới nhất: <max_date>` — **thông tin, không
phải cảnh báo**.

### 4.2 Phạm vi từng khối

| Khối | Kỳ |
| --- | --- |
| 1 — Xu hướng tháng | `<year>-01-01` → `anchor_date`, gom theo tháng |
| 2 — Diễn biến ngày | `<tháng của anchor_date>-01` → `anchor_date` |
| 3 — Tổng hợp MTD | `<tháng của anchor_date>-01` → `anchor_date` |
| 4 — Tuyến | **giống khối 3** (PO decision 3) — để hai khối cạnh nhau không mâu thuẫn |
| 5 — Xếp hạng ngày | giữ nguyên hợp đồng hiện tại, không đổi |

### 4.3 Trường hợp đầu tháng (`anchor_date` rơi vào ngày 01)

- Khối 2 chỉ có 1 điểm → **hiển thị bảng 1 dòng thay vì biểu đồ**.
- Khối 3 và 4: MTD = đúng ngày 01; nhãn **bắt buộc** ghi `lũy kế 1 ngày` để không bị đọc nhầm là cả tháng.
- Khối 1 vẫn hiển thị đủ các tháng trước bình thường.

### 4.4 Ba trạng thái thiếu dữ liệu — phân biệt, không trộn

Quy tắc quyết định **chỉ dựa trên mẫu số**, không dựa trên số ngày thiếu:

| Trạng thái | Điều kiện | `rate` | `days_with_data` / `days_in_period` | Hiển thị |
| --- | --- | --- | --- | --- |
| (a) Không có bản ghi | không có dòng nào trong kỳ | **`null`** | `0 / D` | `—` |
| (b) Có bản ghi, mẫu số = 0 | `COUNT(ma_bg) = 0` | **`null`** | trả về bình thường | `—` |
| (c) Phủ một phần, mẫu số > 0 | có dữ liệu nhưng thiếu ngày | **vẫn tính bình thường** | `d / D`, `d < D` | **tỷ lệ + badge độ phủ** `21/26 ngày` |

Nói cách khác: **thiếu ngày không bao giờ tự nó làm `rate` thành `null`.** `rate` chỉ `null` khi
mẫu số `= 0` (trạng thái a hoặc b). Đây chính là PO decision 1 — tháng thiếu dữ liệu **vẫn hiển thị
tỷ lệ**, và độ phủ được nói ra bằng badge chứ không bằng cách giấu con số đi.

`days_with_data` và `days_in_period` **luôn** được trả về cho mọi trạng thái, kể cả khi `rate` là
`null`, để frontend không phải suy đoán.

Trạng thái (c) là có thật và là lý do PO decision 1 tồn tại — xem §9.1.

---

## 5. API overview contract

### 5.1 Phương án bị bác

| Phương án | Lý do bác |
| --- | --- |
| Gọi `quality-timeline?ma_bcvh=X` 6 lần | N+1; mỗi lần còn kéo thêm truy vấn daily 90 ngày thừa (§2.6) |
| Gọi `/f13/ranking/bcvh` với range cả tháng | 3,7 s + 431 MB heap cho một tháng (§2.5) |
| Mở rộng `getBcvhRanking()` | Vi phạm PO decision 9 — đổi hành vi bề mặt đã được PO chấp nhận |

### 5.2 Endpoint mới — một lần gọi, phục vụ cả 4 khối

```
GET /api/f13/ranking/bcvh/overview?anchor_date=YYYY-MM-DD
```

- Đặt sau `allowViewerRead` (`admin` + `viewer`), giống mọi route `f13` đọc khác.
- `anchor_date` **tùy chọn**; khi vắng, backend tự tính theo §4.1.
- Chỉ đọc. Không ghi. Không đụng schema.

Response:

```jsonc
{
  "success": true,
  "data": {
    "monthly": [ { "month": "2026-01", "label": "T1", "ma_bcvh": "533140",
                   "volume": 0, "passed": 0, "rate": 0.0,
                   "days_with_data": 31, "days_in_period": 31 } ],
    // rate = null chỉ khi mẫu số = 0; days_* luôn có mặt kể cả khi rate = null (§4.4)
    "daily":   [ { "date": "2026-08-01", "ma_bcvh": "533140",
                   "volume": 0, "passed": 0, "rate": 0.0 } ],
    "mtd":     [ { "ma_bcvh": "533140", "ten_bcvh": "BCVH Thuận Hóa",
                   "volume": 0, "passed": 0, "failed": 0, "rate": 0.0, "rank": 1,
                   "previous_month_to_date": { "volume": 0, "passed": 0, "rate": 0.0 } } ],
    "routes":  [ { "ma_bcvh": "533140", "participating_route_count": 36,
                   "green": 0, "pink": 0, "yellow": 0, "red": 0 } ]
  },
  "meta": {
    "anchor_date": "2026-08-27",
    "anchor_source": "max_date" | "yesterday",
    "max_date": "2026-08-27",
    "month_period":  { "from_date": "2026-08-01", "to_date": "2026-08-27" },
    "year_period":   { "from_date": "2026-01-01", "to_date": "2026-08-27" },
    "route_period":  { "from_date": "2026-08-01", "to_date": "2026-08-27", "basis": "MTD" },
    "canonical_bcvh_count": 6
  }
}
```

### 5.3 Bốn ràng buộc bắt buộc của contract

1. **Lọc canonical ngay trong SQL** — `ma_bcvh IN (6 mã)` từ `CANONICAL_BCVH_UNITS`, không lọc ở
   frontend (PO decision 5). Không lặp lại lỗi §2.8.
2. **Một định nghĩa mẫu số duy nhất** — `COUNT(ma_bg)`, `danh_gia_2026 = 'Đạt'`, khớp ranking
   hiện tại (§2.7).
3. **Không sửa `getBcvhRanking()`** — khối 5 giữ nguyên hành vi đã được PO chấp nhận (PO decision 9).
4. **Không có trường nào tên `alert` / `warning` / `risk`** trong response (PO decision 8).

### 5.4 Bốn truy vấn cố định — không N+1

| # | Mục đích | `GROUP BY` | Số dòng trả về (đo thật) |
| --- | --- | --- | --- |
| Q1 | `monthly` | `substr(ngay_do_kiem,1,7), ma_bcvh` | 48 |
| Q2 | `daily` | `ngay_do_kiem, ma_bcvh` | 162 |
| Q3 | `mtd` | `ma_bcvh` | 6 |
| Q4 | `routes` | `ma_bcvh, ma_tuyen` | 119 |

Số truy vấn **cố định 4**, không phụ thuộc số BCVH. Không truy vấn nào trả quá vài trăm dòng.

`classifyRoute()` chỉ nhận `ma_tuyen` nên **đẩy được ra sau aggregation** — chạy trên 119 dòng thay
vì 96.305 bản ghi, kết quả không đổi. `_buildRouteDistributionSummary()` tái dùng **nguyên trạng**,
không sửa, để ngưỡng 70/60/50 chắc chắn không lệch (PO decision 4).

---

## 6. Hiệu năng

Đo thật trên `backend/src/db/database.sqlite` (750.283 bản ghi), Node + `sqlite3`, cold:

| Truy vấn | Kỳ | Dòng trả về | Thời gian |
| --- | --- | --- | --- |
| Q1 `monthly` | 8 tháng | 48 | **2250 ms** |
| Q2 `daily` | MTD | 162 | 210 ms |
| Q3 `mtd` | MTD | 6 | 204 ms |
| Q4 `routes` | MTD | 119 | 295 ms |
| **Tổng** | | | **~2,96 s** · heap **5 MB** |

So sánh với đường `getFactBetween` bị bác: **3,7 s và 431 MB heap cho riêng một tháng**. Thiết kế mới
giảm heap **~86 lần** ngay cả khi chưa tối ưu gì thêm.

### 6.1 Q1 là nút thắt — nguyên nhân gốc đã xác định

`EXPLAIN QUERY PLAN` cho Q1:

```
SEARCH fact_f13 USING INDEX idx_bcvh_ngay (ma_bcvh=? AND ngay_do_kiem>? AND ngay_do_kiem<?)
USE TEMP B-TREE FOR GROUP BY
```

Các index hiện có trên `fact_f13`:

- `idx_f13_date_bcvh_covering (ngay_do_kiem, ma_bcvh, ket_qua_f13)`
- `idx_f13_date_tuyen_covering (ngay_do_kiem, ma_tuyen, ket_qua_f13)`
- `idx_ngay_do_kiem (ngay_do_kiem)`
- `idx_bcvh_ngay (ma_bcvh, ngay_do_kiem)`

Index "covering" hiện có phủ `ket_qua_f13`, **không phủ `danh_gia_2026` và `ma_bg`** — đúng hai cột
Q1 cần. SQLite vì thế phải quay về bảng lấy từng dòng cho ~750k bản ghi. Đó là toàn bộ 2250 ms.

**Không được thay `danh_gia_2026` bằng `ket_qua_f13` để lách index** — đó là đổi công thức, vi phạm
ràng buộc SSOT.

### 6.2 Mục tiêu hiệu năng và điều kiện đạt

| Mốc | Giá trị |
| --- | --- |
| Chấp nhận Phase Backend (không đổi schema) | **≤ 3,2 s** cho toàn endpoint, heap ≤ 50 MB |
| Mục tiêu mong muốn | ≤ 700 ms |

Khoảng cách giữa hai mốc **chỉ đóng được bằng một index mới**
`(ngay_do_kiem, ma_bcvh, danh_gia_2026, ma_bg)`. Đó là **schema change**, nằm **ngoài** ticket này và
**phải là quyết định riêng** — Ticket này documentation-only, và Phase Backend đã bị PO khoanh là
không đổi schema. **Ghi nhận `RISK-PERF-01`** ở §9.4; không tự ý thêm index.

**Cả bốn truy vấn luôn chạy trong mỗi request** — kể cả `Q2`, dù khối 2 mặc định thu gọn. Thu gọn là
hành vi UI thuần (§3.2); không có nhánh nào bỏ qua `Q2`, và con số ~2,96 s ở bảng trên đã bao gồm nó.

Giảm nhẹ duy nhất trong phạm vi cho phép: `monthly` có thể cache theo `anchor_date` trong bộ nhớ
tiến trình (dữ liệu quá khứ bất biến sau khi tháng đóng) — tùy chọn, không bắt buộc để nghiệm thu.

---

## 7. File scope và chia phase

### 7.1 Phase B1 — Backend (executor: Claude Code / Sonnet)

**Sửa (defect PO decision 7, làm trước hoặc cùng phase):**

- `backend/src/services/F13DashboardService.js` — lọc canonical cho `totalCurrent`,
  `totalMonthToDate`, `totalPreviousMonthToDate`, `totalYesterday`, `totalSwc`, để dòng TỔNG CỘNG
  nhất quán với `f13302TotalSummary` vốn đã lọc canonical.

**Thêm mới:**

- `backend/src/routes/f13Routes.js` — `+1` dòng route.
- `backend/src/controllers/DashboardController.js` — `+1` handler.
- `backend/src/services/bcvhOverviewService.js` — **mới**.
- `backend/src/repositories/FactBuuGuiRepository.js` — `+4` hàm aggregate (Q1–Q4).

**Không đụng:** `getBcvhRanking()` (ngoài fix TỔNG CỘNG), `timelineService.js`,
`_buildRouteDistributionSummary()`, `getDailyTrendData()`, mọi file schema/migration.

### 7.2 Phase F1 — Frontend (executor: Antigravity)

**Thêm mới:**

- `frontend/src/features/ranking/BcvhMultiSeriesTrendChart.jsx`
- `frontend/src/features/ranking/BcvhMonthlyTrendBlock.jsx`
- `frontend/src/features/ranking/BcvhDailyTrendBlock.jsx`
- `frontend/src/features/ranking/BcvhMtdSummaryBlock.jsx`
- `frontend/src/features/ranking/BcvhRouteCapacityBlock.jsx`
- `frontend/src/features/ranking/bcvhOverviewData.js` (mapper)

**Sửa duy nhất:**

- `frontend/src/features/ranking/BcvhRankingPage.jsx` — chèn 4 khối phía trên khối 5.
  **Không** đụng phần khối 5, 4 `KPICard`, `DoughnutSummary`, `SummaryRouteBands`, hay khối `useEffect`
  gọi `/f13/ranking/bcvh` (PO decision 9).

Antigravity chịu trách nhiệm responsive / visual và bằng chứng runtime Windows theo `DEC-020`.

### 7.3 Phase I1 — Integration (executor: Claude Code / Sonnet)

Ghép nối, chạy full regression, đo lại hiệu năng thật, đồng bộ tài liệu, dừng ở
`READY FOR PO CHECK`. **Không** tự trao PO PASS.

### 7.4 Kỷ luật model

Theo `CLAUDE.md` §2: `Sonnet` là mặc định cho B1 và I1. Thiết kế này do `Opus` soạn ở chế độ
READ-ONLY và **không** tự review lại phần thi công của chính mình — nếu cần review độc lập ở I1,
phải là một phiên khác.

---

## 8. Test plan

### 8.1 Backend unit (mới)

| # | Ca kiểm | Kỳ vọng |
| --- | --- | --- |
| T1 | Database có 9 mã BCVH | Cả 4 mảng `monthly/daily/mtd/routes` trả **đúng 6** mã canonical |
| T2 | Dòng TỔNG CỘNG sau fix decision 7 | `sl_bg_ptc` khớp tổng 6 dòng canonical, không cộng `531600/531110/531120` |
| T3 | Một tuyến chạy nhiều ngày trong kỳ | Đếm **1 lần** (khử trùng theo `ma_tuyen`) |
| T4a | Tháng thiếu ngày, mẫu số > 0 (vd T02/2026) | `rate` **vẫn được tính**, **không** `null`; `days_with_data < days_in_period` và cả hai đều có mặt |
| T4b | Kỳ không có bản ghi, hoặc mẫu số = 0 | `rate` trả **`null`**, **không** trả `0`; `days_with_data` / `days_in_period` vẫn có mặt |
| T5 | Tháng hiện tại | `to_date` cắt đúng tại `anchor_date`, không phải cuối tháng |
| T6 | `max_date < today - 1` | `anchor_date = max_date`, `anchor_source = "max_date"` |
| T7 | `max_date >= today - 1` | `anchor_date = today - 1`, `anchor_source = "yesterday"` |
| T8 | `anchor_date` là ngày 01 | `mtd` = đúng 1 ngày; `daily` có 1 điểm |
| T9 | Hạng MTD | Xếp theo `rate` desc, tie-break `volume` desc; đồng dạng `RANK() OVER` hiện có |
| T10 | Ngưỡng tuyến | `70/60/50` khớp `_buildRouteDistributionSummary` hiện hành, byte-for-byte |
| T11 | Response schema | Không tồn tại khóa `alert` / `warning` / `risk` (PO decision 8) |

### 8.2 Backend regression **bắt buộc**

Hai bộ này bảo vệ hợp đồng PO đã chấp nhận — phải còn xanh, không được sửa:

- `backend/src/controllers/DashboardController.dateFilterRemediation.test.js`
- `frontend/src/features/ranking/BcvhRankingPage.singleDayContract.test.js`

### 8.3 Frontend

| # | Ca kiểm | Kỳ vọng |
| --- | --- | --- |
| F1 | Biểu đồ | Render đúng 6 series; legend bật/tắt hoạt động |
| F2 | Tải dữ liệu | **Đúng một** request tới `/f13/ranking/bcvh/overview` nạp cả 4 mảng; mở/đóng khối 2 **không** phát thêm request nào |
| F3 | Ô mẫu số = 0 hoặc không có bản ghi | Hiển thị `—`, không hiển thị `0` |
| F4 | Badge độ phủ | Tháng thiếu ngày nhưng mẫu số > 0: **vẫn hiện tỷ lệ**, kèm `d/D ngày` khi `days_with_data < days_in_period` |
| F5 | Trục Y | **Không** có `ReferenceLine` 90; domain co theo dữ liệu |
| F6 | Nhãn tuyến | Đúng chuỗi `Tuyến có phát sinh trong kỳ` |
| F7 | Nhãn so sánh | Không xuất hiện chữ "cảnh báo"/"alert"/"rủi ro" |
| F8 | Khối 5 | Snapshot không đổi so với baseline |

### 8.4 Baseline đã biết — phải so với baseline, không so với 100%

- Backend: **256/260**, với 4 lỗi KPI/timeline có sẵn không liên quan.
- Frontend: **7 lỗi có sẵn** không liên quan.

Bất kỳ con số nào khác baseline phải được giải trình theo tên test, không được báo gộp.

### 8.5 Kiểm tra bắt buộc mỗi phase

`oxlint` clean · `vite build` thành công · `git diff --check` sạch · `git diff --name-only` đúng
file scope · 0 byte NUL trên mọi file chạm vào.

---

## 9. Rủi ro dữ liệu thật

### 9.1 `RISK-DATA-01` — Tháng phủ không đều giữa các BCVH (đã xảy ra)

T02/2026 **thiếu hẳn ngày 17 và 18**, và độ phủ theo từng BCVH trong tháng đó **không đều**:

| `ma_bcvh` | Ngày có dữ liệu / 26 ngày khả dụng |
| --- | --- |
| `533140` | 24 |
| `535790` | 24 |
| `537220` | 23 |
| `536250` | 22 |
| `537015` | 22 |
| `535470` | **21** |

Nghĩa là **so sánh tỷ lệ tháng giữa các BCVH không phải lúc nào cũng cùng mẫu số ngày**. PO đã quyết
(decision 1): **vẫn hiển thị, kèm độ phủ ngày**. Badge độ phủ vì thế **không phải trang trí** — nó là
điều kiện để phép so sánh của khối 1 đọc được đúng. Bỏ badge = tái tạo rủi ro.

Đối chiếu: T08/2026 cả 6 BCVH đều đủ **27/27** ngày, nên **PO UI check ở tháng hiện tại sẽ KHÔNG
phát hiện được lỗi này**. Test `T4a` và `F4` là lớp bảo vệ duy nhất.

### 9.2 `RISK-DATA-02` — Ba mã BCVH ngoài canonical

Xem §2.8. Đã có PO decision 5 + 7. Rủi ro còn lại: nếu Phase Backend lọc canonical ở endpoint mới
nhưng **quên** fix dòng TỔNG CỘNG của khối 5, hai bề mặt cạnh nhau sẽ lệch ~0,1% và PO sẽ báo lỗi.
Vì vậy decision 7 được PO xếp **trước hoặc cùng** Phase Backend, không để lại sau.

### 9.3 `RISK-DATA-03` — `anchor_date` hai cách hiểu đang trùng nhau

Tại `2026-08-28`: `today - 1 = 2026-08-27` và `max_date = 2026-08-27` **bằng nhau**. Mọi lỗi cài đặt
§4.1 sẽ **vô hình** với PO UI check hôm nay và chỉ nổ khi import trễ một ngày. Test T6/T7 là bắt buộc,
không được bỏ qua vì "đã kiểm bằng mắt".

### 9.4 `RISK-PERF-01` — Q1 chậm 2250 ms do index không phủ

Xem §6.1. Ticket này **không** sửa schema. Nếu Product Owner thấy 2,96 s là quá chậm khi nghiệm thu,
lối ra là một ticket index riêng — **không** phải sửa công thức, và **không** phải tự thêm index
trong Phase Backend.

### 9.5 `RISK-SCOPE-01` — Áp lực mở rộng sang khối 5

Bốn khối mới dùng chung dữ liệu với khối 5, nên rất dễ bị cám dỗ "gộp cho gọn". PO decision 9 cấm
điều đó. Kiểm chứng cơ học ở mọi phase: `git diff` trên `BcvhRankingPage.jsx` không được chạm vùng
`useEffect` gọi `/f13/ranking/bcvh`, `UnifiedBcvhAnalysisTable`, hay 4 `KPICard`.

---

## 10. Tiêu chí nghiệm thu

### 10.1 Kỹ thuật (Claude Code tự xác nhận)

| # | Tiêu chí |
| --- | --- |
| AC-01 | `/f13/ranking/bcvh/overview` trả đúng 6 BCVH canonical trên cả 4 mảng |
| AC-02 | Đúng **4** truy vấn SQL cho một request, không phụ thuộc số BCVH |
| AC-03 | Toàn endpoint ≤ **3,2 s**, heap ≤ **50 MB** trên database thật |
| AC-04 | Dòng TỔNG CỘNG của khối 5 khớp tổng 6 dòng canonical (decision 7) |
| AC-05 | `getBcvhRanking()` không đổi hành vi; 2 bộ regression §8.2 còn xanh |
| AC-06 | Response không chứa khóa `alert` / `warning` / `risk` |
| AC-07 | Ngưỡng tuyến `70/60/50` và ánh xạ Tốt/Khá/TB/Kém không đổi |
| AC-08 | Backend so baseline 256/260, frontend so baseline 7 lỗi có sẵn — không hồi quy mới |
| AC-09 | `oxlint` clean, `vite build` thành công, `git diff --check` sạch, 0 byte NUL |
| AC-10 | Test T1–T11 và F1–F8 đều có và đều xanh |

### 10.2 PO UI Check (Product Owner, **không** tự trao)

| # | Tiêu chí |
| --- | --- |
| AC-11 | Khối 1 vẽ đủ 6 đường từ T01 đến tháng hiện tại; tháng hiện tại nét đứt + nhãn lũy kế |
| AC-12 | Tháng T02/2026 **vẫn hiển thị tỷ lệ** (không phải `—`) và có badge độ phủ ngày |
| AC-13 | Khối 2 mặc định thu gọn, mở ra thấy ngay diễn biến ngày 01 → ngày neo (không có vòng tải lại), ngày trống đứt đoạn |
| AC-14 | Khối 3 hiển thị đủ sản lượng/đạt/không đạt/tỷ lệ/hạng cho 6 BCVH, **tỷ lệ là số nổi bật nhất** |
| AC-15 | Khối 4 ghi rõ **"Tuyến có phát sinh trong kỳ"** và kỳ MTD |
| AC-16 | Bảng xếp hạng ngày **không đổi gì** so với trước ticket |
| AC-17 | Không có chỗ nào gọi D-1/D-7 là cảnh báo |

`PO UI Check Required = Yes`. Claude Code dừng ở `READY FOR PO CHECK`.

---

## 11. Ngoài phạm vi

- Đổi công thức F1.3 / SSOT / ngưỡng.
- Đổi schema, thêm index, migration, ghi database.
- Mở lại `F13-BCVH-RANKING-REDESIGN-IMPL` (`CLOSED / PO PASS`).
- Sửa `timelineService.js`, Operation Dashboard, Route Ranking, Evidence.
- Đổi `/f13/dashboard/daily-trend` hoặc `/f13/dashboard/quality-timeline`.
- Xử lý ba mã BCVH ngoài canonical như dữ liệu nghiệp vụ (chỉ loại trừ, không diễn giải).

---

## 12. Remediation log — 2026-08-28 (R1)

Claude/CTO reviewed the design of record as first published (commit `66f3b884`) and found **two
internal contradictions**. Both are resolved above; this section records what was wrong and what the
binding rule now is, so a later reader does not re-litigate them.

### R1-A — Một request, hay lazy-fetch?

| | |
| --- | --- |
| Mâu thuẫn | §5 quy định **một** request trả cả `monthly` + `daily` + `mtd` + `routes`, nhưng §3.2 lại nói khối Daily **"chỉ fetch khi mở lần đầu (lazy)"**, §6 tính điều đó thành phần giảm nhẹ hiệu năng, và test `F2` yêu cầu **không** phát request khi khối chưa mở. Ba chỗ sau phủ định chỗ đầu. |
| Quyết định | **Giữ đúng một request nạp cả 4 mảng.** Khối Daily **chỉ thu gọn về UI**; mở/đóng không phát thêm request nào. |
| Đã sửa | §3 (nguyên tắc bố cục — tách rõ "tải dữ liệu" khỏi "hiển thị"); §3.2 (bỏ lazy-fetch); §6 (nói rõ **cả bốn** truy vấn luôn chạy, kể cả `Q2`, và ~2,96 s đã bao gồm nó); §8.3 `F2` (đảo lại: khẳng định đúng một request và mở/đóng không phát thêm request); AC-13 (mở khối thấy dữ liệu ngay, không có vòng tải lại). |
| Hệ quả hiệu năng | Không có. Con số ~2,96 s ở §6 vốn đã đo với cả `Q2` chạy — bỏ lazy-fetch **không** làm chậm thêm; nó chỉ xóa một khoản giảm nhẹ chưa từng được tính vào mốc nghiệm thu `≤ 3,2 s`. |

### R1-B — Tháng thiếu ngày thì `rate` có `null` không?

| | |
| --- | --- |
| Mâu thuẫn | PO decision 1 và §3.1/§4.4(c) nói tháng thiếu dữ liệu **vẫn hiển thị tỷ lệ** kèm độ phủ, nhưng test `T4` lại yêu cầu **"tháng thiếu ngày → `rate` trả `null`"**. `T4` như vậy sẽ ép cài đặt vi phạm chính quyết định PO. |
| Quy tắc đúng | Điều kiện `null` **chỉ dựa trên mẫu số**, không dựa trên số ngày thiếu: có một phần dữ liệu và mẫu số `> 0` → **vẫn tính `rate`**, trả `days_with_data`/`days_in_period`, hiện badge độ phủ. Không có bản ghi, hoặc mẫu số `= 0` → `rate = null`, UI hiện `—`. `days_with_data`/`days_in_period` **luôn** có mặt, kể cả khi `rate` là `null`. |
| Đã sửa | §3.1 (nói rõ thiếu ngày không làm `rate` thành `null`); §4.4 (bảng ba trạng thái viết lại theo mẫu số, thêm cột `rate` và cột `days_*`); §5.2 (chú thích trong response mẫu); §8.1 `T4` tách thành **`T4a`** (mẫu số > 0 → vẫn tính) và **`T4b`** (mẫu số = 0 hoặc không có bản ghi → `null`); §8.3 `F4`; §9.1 (trỏ sang `T4a`); AC-12 (T02/2026 phải hiện **tỷ lệ**, không phải `—`). |
| Vì sao dễ lọt | T08/2026 đủ 27/27 ngày cho cả 6 BCVH, nên PO UI check ở tháng hiện tại **không** chạm tới nhánh này. `T4a` là lớp bảo vệ duy nhất — xem `RISK-DATA-01` §9.1. |

### Phạm vi vòng remediation này

Documentation-only. Không sửa code, database, schema hay API. Không quyết định sản phẩm nào mới:
R1-A là chọn lại giữa hai câu đã có trong chính tài liệu, R1-B là khôi phục đúng PO decision 1 mà
`T4` đã viết sai. Không cần PO duyệt lại; PO decisions 1-9 giữ nguyên.

---

## 13. Closure (2026-08-28)

Product Owner performed the UI Check and explicitly granted **PO PASS** on 2026-08-28. Final
technical commit accepted as the basis of this PASS: `f34e898c8fb7ec294d5fcd42dfe3b2777c11dc53`
(`refactor(f13): unify absolute heatmap color SSOT`).

This closure covers the design as delivered: the five blocks (§3), the time rules (§4), the
`/f13/ranking/bcvh/overview` contract (§5), and the R1 remediation (§12) — plus the F1.3 Heatmap
Absolute Color SSOT that the monthly heatmap in §3.1 ultimately shipped with
(`frontend/src/components/f13/f13HeatmapBandCatalog.js`, one shared catalog also consumed by
Operation Dashboard; documented in full in `docs/10_TICKETS/F13-STANDARDIZATION-001_MANIFEST.md`
Sections 43-44).

Status: `F13-BCVH-RANKING-OVERVIEW-01 = COMPLETED / PO PASS / CLOSED`. This document's design
history, Revision R1, and every PO decision above remain unchanged — this section only records
closure; it does not rewrite or retract anything. Full closure record:
`docs/10_TICKETS/F13-STANDARDIZATION-001_MANIFEST.md` Section 45 (append-only). Any further
change to BCVH Ranking Overview or the F1.3 Heatmap SSOT requires its own new delta or ticket.
