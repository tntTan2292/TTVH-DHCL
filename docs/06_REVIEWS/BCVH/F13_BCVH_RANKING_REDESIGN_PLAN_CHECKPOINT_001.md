# F13 BCVH Ranking Redesign Plan Checkpoint 001

- Ticket: `F13-BCVH-RANKING-REDESIGN-PLAN`
- Date: `2026-07-28`
- Status: `PLANNING COMPLETE / READY FOR IMPLEMENTATION HANDOFF`
- Scope: planning only; no product-code, schema, formula, historical-data, or Import changes.

## Product Owner Decision Recorded

Product Owner approved the BCVH Ranking redesign direction agreed in planning.

This checkpoint records the approved implementation scope only. It does not authorize changes outside the BCVH Ranking redesign boundary, and it does not reopen Dashboard SSOT, Route Ranking, Import, Shipment, or Data Quality tickets.

## Planning Locks

- Preserve Dashboard SSOT as the leadership semantic source.
- Preserve existing semantic colors and existing business thresholds.
- Preserve the Product Owner-confirmed exclusion of `7` non-postman/customer-pickup routes from postman-route counts.
- Preserve the current Route Ranking filter behavior `Tuyen buu ta | Tat ca` and the `Nhan tai buu cuc` classification label under `Tat ca`.
- Do not introduce new KPI formulas, new BCVH mapping rules, or new same-period comparison logic outside the existing D-1 and D-7 contracts already accepted on the Dashboard.

## Approved BCVH Ranking Structure

### Table Layout

The approved BCVH Ranking redesign is one unified ranking table with grouped columns and one inline analysis column.

| Group | Approved columns | Notes |
| --- | --- | --- |
| `Don vi` | `Hang`, `Ma BCVH`, `Ten BCVH` | Identity and stable drill-down context. |
| `Ket qua ngay danh gia` | `San luong`, `Dat`, `Khong dat`, `Ty le dat` | Uses the same current-day/runtime row contract already used by BCVH ranking. |
| `So sanh` | `D-1`, `D-7` | Visible only where current comparison data already exists. |
| `Cham nop tien` | `BG cham nop tien`, `Ty le cham nop tien` | Independent late-cash-handover signal; does not replace ranking KPI. |
| `Phan bo tuyen` | `So tuyen buu ta tham gia`, `Tuyen xanh`, `Tuyen vang`, `Tuyen do`, `Doughnut` | Route distribution by Dashboard color bands plus compact doughnut visualization. |
| `Phan tich BCVH` | Inline text summary | Inline management summary per BCVH row using already available row metrics plus supported warning semantics. |
| `Hanh dong` | Drill-down to Route Ranking | Must preserve existing route context parameters. |

### D-1 and D-7 Visibility Rule

- `D-1` and `D-7` remain visible only for fields already backed by accepted comparison contracts.
- The current approved source is the existing BCVH ranking comparison data: `kpi_2026_dod` and `kpi_2026_swc`.
- The redesign must not invent D-1 or D-7 for late-cash-handover counts, route-distribution counts, doughnut segments, or inline analysis text unless a runtime/backend contract is added under the implementation ticket.
- When comparison data is unavailable, the redesign must show the existing unavailable-state behavior rather than calculating fallback deltas.

### Independent Signal Colors

- Ranking KPI color, late-cash-handover signal color, and route-distribution color are independent signals.
- Route-distribution colors must continue to use Dashboard semantic color bands and existing thresholds.
- Late-cash-handover signal color must not silently reuse rank color when its own data is available.
- If a signal has no authoritative threshold contract yet, the implementation must render it as a neutral/unavailable state instead of inventing new cutoffs.

## Approved Field Mapping and Gap Classification

| Approved field / element | Current API / contract | Backend/runtime source | Frontend presentation contract | Classification | Notes |
| --- | --- | --- | --- | --- | --- |
| `Hang` | `GET /api/f13/ranking/bcvh` -> `rank` | `FactBuuGuiRepository.getBcvhRanking` | `UnifiedBcvhAnalysisTable` mapper and `BcvhRankingPage` runtime rows | `Already supported` | Preserve backend ranking order. |
| `Ma BCVH` | `ma_bcvh` | `fact_f13.ma_bcvh` aggregation | Existing ranking row mapping | `Already supported` | No new BCVH mapping. |
| `Ten BCVH` | `ten_bcvh` | `fact_f13.ten_bcvh` aggregation | Existing ranking row mapping | `Already supported` | No hardcoded replacement labels. |
| `San luong` | `sl_bg_ptc` or `total_bg` | Existing BCVH aggregation | Existing unified-table mapper | `Already supported` | Prefer the existing operational-count field already used by Dashboard/BCVH surfaces. |
| `Dat` | `dat_kpi_2026` | Existing BCVH aggregation | Existing unified-table mapper | `Already supported` | No formula change. |
| `Khong dat` | `khong_dat_kpi_2026` / `total_failed` | Existing BCVH aggregation | Existing unified-table mapper | `Already supported` | Keep current fail semantics. |
| `Ty le dat` | `kpi_2026` | Existing service/repository calculation | Existing unified-table mapper and BCVH runtime page | `Already supported` | Preserve existing business thresholds. |
| `D-1` | `kpi_2026_dod` | Existing ranking service comparison field | Existing unified-table mapper | `Already supported` | Visible only on supported KPI comparison. |
| `D-7` | `kpi_2026_swc` | Existing ranking service comparison field | Existing unified-table mapper | `Already supported` | Visible only on supported KPI comparison. |
| `BG cham nop tien` | No current BCVH ranking response field | Late-payment logic exists in rule engine; not exposed as BCVH ranking row contract | Not currently mapped on BCVH runtime surfaces | `Backend/runtime gap` | Requires runtime aggregation field per BCVH row. |
| `Ty le cham nop tien` | `f13_303_rate` already present in ranking response | Existing backend/service response field | Not consistently rendered in the active unified BCVH surfaces | `Frontend-only` | Existing response should be reused; no formula change. |
| `So tuyen buu ta tham gia` | No current BCVH ranking response field | Derivable from route data and confirmed non-postman exclusions, but not returned by BCVH ranking API today | Not present in current BCVH UI contract | `Backend/runtime gap` | Must preserve confirmed non-postman route exclusions. |
| `Tuyen xanh / vang / do` counts | No current BCVH ranking response field | Route quality color-band breakdown is not returned per BCVH today | Not present in current BCVH UI contract | `Backend/runtime gap` | Must preserve Dashboard semantic colors and thresholds. |
| `Doughnut` visualization | Depends on route-distribution counts | Requires route-band distribution data first | New BCVH presentation element | `Backend/runtime gap` | Frontend work is blocked until distribution counts are available. |
| Inline `Phan tich BCVH` | Existing BCVH row metrics + existing status/warning semantics | Existing row metrics exist; optional warning semantics exist | New inline analysis renderer | `Frontend-only` | Must stay factual; no invented RCA claims. |
| Route drill-down action | Existing route contract params `from_date`, `to_date`, `interval`, `bcvh_id`, `bcvh_name` | Existing route endpoint and navigation context | Existing BCVH and Route page navigation pattern | `Already supported` | Preserve route exclusions and current route filter behavior. |

## Test Requirement and Blocker Register

| Item | Classification | Required validation / blocker note |
| --- | --- | --- |
| BCVH ranking row mapper keeps existing fields and unsupported-field fallbacks stable | `Test requirement` | Frontend mapper/unit tests for mixed supported and unavailable fields. |
| Late-payment row fields, route-participation count, and route-band distribution data | `Backend/runtime gap` | Backend/service/repository contract work is required before UI can fully render approved columns. |
| Doughnut visualization uses route-band distribution only | `Test requirement` | Frontend component test must prove no invented totals/segments are rendered without backend data. |
| Independent color signals preserve Dashboard semantic colors and thresholds | `Test requirement` | Frontend tests and targeted runtime review must prove no new threshold text or color logic is introduced. |
| Confirmed non-postman route exclusions stay out of participating postman-route counts | `Test requirement` | Backend/service tests must cover the `7` confirmed exclusion routes. |
| Inline `Phan tich BCVH` remains factual and non-RCA | `Blocker if violated` | If the redesign requires explanatory text beyond available metrics/status labels, stop and request authority rather than invent analysis rules. |

## Recommended Implementation Ticket

- Proposed ticket: `F13-BCVH-RANKING-REDESIGN-IMPL`
- Recommended primary executor: `Codex`
- Recommended support executor: `Antigravity` only after runtime-backed data, columns, and doughnut structure are stable and explicit UI-polish authority is requested.

## Recommended Executor Split

1. `Codex`
   - Add or expose only the missing runtime/backend fields required by the approved table.
   - Wire the unified BCVH table contract, independent signals, inline `Phan tich BCVH`, and route drill-down without changing formulas or thresholds.
   - Add focused backend/frontend tests for supported fields, unavailable states, and non-postman route exclusions.
2. `Antigravity`
   - Optional later follow-up only for visual polish, spacing, density, and chart refinement after the runtime-backed redesign is stable.
   - Must not change business logic, formulas, thresholds, route exclusions, or backend contracts.

## Handoff

Planning is complete and implementation authority is now ready to move to the next manifest: `docs/10_TICKETS/F13-BCVH-RANKING-REDESIGN-IMPL_MANIFEST.md`.
