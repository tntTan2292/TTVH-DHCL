# DA-IMPL-003 PO Acceptance Checklist

- Ticket: `DA-IMPL-003`
- Status: `READY FOR PO CHECK`
- Date: `2026-07-18`
- Product Owner decision: `PENDING`

## PO Checklist

## D-1 Comparison Checklist

| Item | Status | Evidence |
| --- | --- | --- |
| `So với hôm qua` comparison is visible in the Integrated Trend and Risk Workspace | `READY` | Runtime aggregate and BCVH browser checks on preview `http://127.0.0.1:5180/f13/dashboard` |
| D-1 comparison uses the latest available current-day record in the selected range | `READY` | Mapper tests and runtime `2026-07-15` checks |
| D-1 comparison covers total volume, pass rate, and failed shipment count | `READY` | Aggregate shows `3.677`, `67.20%`, `1.037`; BCVH `533140` shows `1.694`, `73.91%`, `373` |
| Missing D-1 data displays `Không có dữ liệu so sánh` | `READY` | Targeted mapper test |

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

DA-IMPL-003 is at `READY FOR PO CHECK`.

Product Owner should verify the visible Dashboard in runtime. Codex technical validation is not equivalent to `PO PASS`.
