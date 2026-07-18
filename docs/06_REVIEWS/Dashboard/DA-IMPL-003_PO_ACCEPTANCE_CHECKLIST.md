# DA-IMPL-003 PO Acceptance Checklist

- Ticket: `DA-IMPL-003`
- Status: `PO WARNING`
- Date: `2026-07-18`
- Product Owner decision: `PENDING`

## PO Checklist

## Leadership Comparison Recheck Checklist

| Item | Status | Evidence |
| --- | --- | --- |
| `So sánh điều hành` widget is visible above the main chart | `READY FOR PO RECHECK` | Runtime aggregate and BCVH browser checks on preview `http://127.0.0.1:5181/f13/dashboard` |
| Widget has visible modes `So với hôm qua` and `So cùng kỳ tuần trước` | `READY FOR PO RECHECK` | Runtime browser mode switching validated without tooltip hover |
| D-1 comparison uses the latest available current-day record in the selected range | `READY FOR PO RECHECK` | Mapper tests and runtime `2026-07-15` checks |
| D-1 comparison covers total volume, pass rate, and failed shipment count | `READY FOR PO RECHECK` | Aggregate shows `3.677`, `67.20%`, `1.037`; BCVH `533140` shows `1.694`, `73.91%`, `373` |
| D-7 comparison covers total volume, pass rate, and failed shipment count | `READY FOR PO RECHECK` | Aggregate D-7: `3.677` vs `3.688`, `67.20%` vs `66.57%`, `1.037` vs `1.092`; BCVH `533140`: `1.694` vs `1.990`, `73.91%` vs `67.54%`, `373` vs `583` |
| Absolute delta, direction, and semantic meaning are visible without hover | `READY FOR PO RECHECK` | Runtime widget shows `Tăng/Giảm`, `Tăng lỗi/Giảm lỗi`, and semantic labels such as `Tích cực`, `Cần chú ý`, `Tăng quy mô`, `Giảm quy mô` |
| `7 ngày so sánh` mode includes visible per-day D-7 delta evidence | `READY FOR PO RECHECK` | Runtime table `Bằng chứng so cùng kỳ 7 ngày` shows daily deltas for `Sản lượng`, `Tỷ lệ đạt`, and `Không đạt` |
| Missing D-1 data displays `Không có dữ liệu so sánh` | `READY` | Targeted mapper test |
| Missing D-7 data displays `Không có dữ liệu so sánh` | `READY` | Targeted mapper test |

| Item | Status | Evidence |
| --- | --- | --- |
| `Xu hướng điều hành tổng hợp` is visible after the Command Summary | `READY` | Runtime aggregate browser check |
| Three modes are visible: `30 ngày`, `7 ngày so sánh`, `Theo BCVH` | `READY` | Unique tab controls validated |
| Only one primary trend story is shown at a time | `READY` | Old separate trend widgets absent |
| Chart includes volume bars, pass-rate line, failed-rate line, and target/reference line | `READY` | Runtime aggregate browser check |
| Legend uses semantic color meanings and labels | `READY` | Runtime aggregate browser check |
| Tooltip uses Vietnamese business wording | `READY` | Source and component validation |
| Approved below-target markers are present | `READY` | Runtime aggregate browser check and mapper tests |
| Unsupported `25%` failed-rate threshold wording is absent | `READY` | Runtime aggregate and BCVH checks |
| `Rủi ro cao` is not derived from failed-rate threshold | `READY` | Mapper tests; high-risk label only from API Quality Pulse red evidence |
| `Ngoại lệ & Rủi ro chính` panel is visible beside the chart on desktop preview | `READY` | Runtime aggregate and BCVH checks |
| Risk panel uses confirmed values and unknown-cause wording | `READY` | `1.037` aggregate and `373` BCVH evidence |
| Aggregate date/filter context is preserved | `READY` | URL `from_date=2026-07-15&to_date=2026-07-15&ma_bcvh=all` |
| BCVH filter context is preserved | `READY` | URL `ma_bcvh=533140`; risk panel shows `373` failed items |
| Legacy Daily Timeline duplicate story is not rendered | `READY` | Runtime text does not contain old timeline title |
| Loading/empty/error states remain available | `READY` | Shared state components retained |
| Dashboard height is not increased by duplicate trend widgets | `READY` | Three old widgets replaced by one integrated surface |
| API contract, KPI formulas, schema, BCVH mapping, and missing-data semantics are preserved | `READY` | No backend/schema/contract changes |

## Handoff

DA-IMPL-003 remains at `PO WARNING` and is ready for Product Owner recheck of the revised comparison widget.

Product Owner should verify the visible Dashboard in runtime. Codex technical validation is not equivalent to `PO PASS`.
