# DA-IMPL-003 PO Acceptance Checklist

- Ticket: `DA-IMPL-003`
- Status: `COMPLETED / PO PASS`
- Date: `2026-07-18`
- Product Owner decision: `PO PASS - Functionally accepted; visual polish deferred to DA-IMPL-007.`

## PO Checklist

## Leadership Comparison Recheck Checklist

| Item | Status | Evidence |
| --- | --- | --- |
| `So sánh điều hành` area is visible above the main chart | `ACCEPTED` | Source and targeted tests validate the comparison area is rendered before the chart |
| Two compact widgets are visible simultaneously: `So với hôm qua` and `So với cùng kỳ tuần trước` | `ACCEPTED` | Targeted tests validate both widget definitions are produced together; no routine browser/UI testing performed per PO instruction |
| D-1 comparison uses the latest available current-day record in the selected range | `ACCEPTED` | Mapper tests and runtime `2026-07-15` checks |
| D-1 comparison exposes only `Tỷ lệ đạt` and `Sản lượng` | `ACCEPTED` | Targeted tests validate widget data has no `Không đạt`, failed-count, or failed-rate fields |
| D-7 comparison exposes only `Tỷ lệ đạt` and `Sản lượng` | `ACCEPTED` | Targeted tests validate widget data has no `Không đạt`, failed-count, or failed-rate fields |
| Absolute delta and increase/decrease direction are visible without hover | `ACCEPTED` | Source and targeted tests validate delta labels and `Tăng/Giảm` direction in the comparison card |
| `7 ngày so sánh` mode includes visible per-day D-7 delta evidence | `ACCEPTED` | Runtime table `Bằng chứng so cùng kỳ 7 ngày` shows daily deltas for `Sản lượng`, `Tỷ lệ đạt`, and `Không đạt` |
| Missing D-1 data displays `Không có dữ liệu so sánh` | `ACCEPTED` | Targeted mapper test |
| Missing D-7 data displays `Không có dữ liệu so sánh` | `ACCEPTED` | Targeted mapper test |
| `Chuyển hoàn` replaces the previous `chưa phân loại` presentation | `ACCEPTED` | Mapper tests and source checks show `total_unknown` is presented as `Chuyển hoàn` for compatibility |
| Measurement equation is preserved | `ACCEPTED` | Aggregate `2.471 + 1.037 + 169 = 3.677`; BCVH `533140` `1.252 + 373 + 69 = 1.694` |

| Item | Status | Evidence |
| --- | --- | --- |
| `Xu hướng điều hành tổng hợp` is visible after the Command Summary | `ACCEPTED` | Runtime aggregate browser check |
| Three modes are visible: `30 ngày`, `7 ngày so sánh`, `Theo BCVH` | `ACCEPTED` | Unique tab controls validated |
| Only one primary trend story is shown at a time | `ACCEPTED` | Old separate trend widgets absent |
| Chart includes volume bars, one `Tỷ lệ đạt` line, and target/reference line | `ACCEPTED` | Source and targeted tests confirm `Tỷ lệ không đạt` line/legend are removed |
| Legend uses semantic color meanings and labels | `ACCEPTED` | Runtime aggregate browser check |
| Tooltip uses Vietnamese business wording | `ACCEPTED` | Source and component validation |
| Approved below-target markers are present | `ACCEPTED` | Runtime aggregate browser check and mapper tests |
| Unsupported `25%` failed-rate threshold wording is absent | `ACCEPTED` | Runtime aggregate and BCVH checks |
| `Rủi ro cao` is not derived from failed-rate threshold | `ACCEPTED` | Mapper tests; high-risk label only from API Quality Pulse red evidence |
| `Ngoại lệ & Rủi ro chính` panel is visible beside the chart on desktop preview | `ACCEPTED` | Runtime aggregate and BCVH checks |
| Risk panel uses confirmed values and unknown-cause wording | `ACCEPTED` | `1.037` aggregate and `373` BCVH evidence |
| Aggregate date/filter context is preserved | `ACCEPTED` | URL `from_date=2026-07-15&to_date=2026-07-15&ma_bcvh=all` |
| BCVH filter context is preserved | `ACCEPTED` | URL `ma_bcvh=533140`; risk panel shows `373` failed items |
| Legacy Daily Timeline duplicate story is not rendered | `ACCEPTED` | Runtime text does not contain old timeline title |
| Loading/empty/error states remain available | `ACCEPTED` | Shared state components retained |
| Dashboard height is not increased by duplicate trend widgets | `ACCEPTED` | Three old widgets replaced by one integrated surface |
| API contract, KPI formulas, schema, BCVH mapping, and missing-data semantics are preserved | `ACCEPTED` | No backend/schema/contract changes |

## Handoff

DA-IMPL-003 is completed with Product Owner `PO PASS`: `Functionally accepted; visual polish deferred to DA-IMPL-007.`

Accepted scope: integrated 30-day trend; 7-day same-period comparison; simultaneous D-1 and D-7 leadership widgets; comparison limited to `Tỷ lệ đạt` and `Sản lượng`; one `Tỷ lệ đạt` trend line; `Chuyển hoàn` semantics; `Đạt + Không đạt + Chuyển hoàn = Tổng mẫu đo kiểm`; Quality Pulse and grounded risk evidence.

Visual styling, spacing, and final aesthetic refinement are deferred to DA-IMPL-007 and are not an open blocker against DA-IMPL-003.
