# F13 BCVH Ranking Redesign Implementation Wave 2 Checkpoint 001

- Ticket: `F13-BCVH-RANKING-REDESIGN-IMPL`
- Date: `2026-07-28`
- Scope: `Wave 2 frontend presentation`
- Status: `IMPLEMENTATION COMPLETE / READY FOR PO CHECK`
- PO UI Check Required: `Yes`

## Scope Applied

Wave 2 implemented the approved frontend BCVH Ranking redesign on top of the Wave 1 runtime contract.

Delivered:

- approved grouped BCVH Ranking table
- current-day fields
- separate `D-1` and `D-7` grouped columns
- allowed hide/show behavior for raw `D-1` and `D-7` volume / F1.3 columns only
- independent KPI, late-cash, and rank-movement signals
- route columns for green, pink, yellow, and red
- 4-segment doughnut bound to the same route-distribution data
- inline `Phan tich BCVH`
- preserved Route Ranking drill-down context
- factual unavailable states without fallback calculations

PO UI remediation on the same ticket baseline also delivered:

- runtime-backed operational summary widgets instead of low-value explanatory cards
- `San luong ngay danh gia` with total volume, passed, failed, and `BCVH co du lieu / tong BCVH` when metadata support exists
- `Chat luong F1.3` with current rate plus separate `D-1` and `D-7` deltas using existing Dashboard SSOT color semantics
- `Cham nop tien` with delayed cash-handover count, delayed rate, and affected BCVH count while remaining neutral without a new threshold rule
- `Phan bo chat luong tuyen` with participating postman-route count plus a compact 4-band doughnut bound to the same runtime route-distribution data
- factual no-data state with the selected date, supported nearest available date, and `Xem ngay gan nhat`
- removal of visible technical/explanatory cards such as locked-layout and fallback notes

Latest bounded PO-check remediation also delivered:

- delayed-cash widget now binds the existing runtime delayed-cash rate from the active BCVH scope and no longer shows an unavailable state when the runtime rate already exists
- management wording replaces technical or implementation-facing labels on the PO screen
- `Hạng`, `Mã BCVH`, and `Tên BCVH` are frozen for readability while later metric groups remain horizontally scrollable

## Preserved Authority

- Dashboard SSOT route-quality bands remain exactly:
  - green
  - pink
  - yellow
  - red
- Pink was not merged, omitted, or reinterpreted.
- Backend formulas were not changed.
- Dashboard thresholds were not changed.
- Confirmed route exclusions were not changed.
- Business rules were not changed.

## Frontend Contract Usage

Wave 2 consumes the Wave 1 runtime fields directly:

- current-day fields from the existing BCVH row contract
- `comparisons.d1.volume`
- `comparisons.d1.f1_3_rate`
- `comparisons.d1.volume_delta`
- `kpi_2026_dod`
- `comparisons.d1.comparison_rank`
- `comparisons.d1.rank_movement`
- `comparisons.d7.volume`
- `comparisons.d7.f1_3_rate`
- `comparisons.d7.volume_delta`
- `kpi_2026_swc`
- `comparisons.d7.comparison_rank`
- `comparisons.d7.rank_movement`
- `delayed_cash_handover_count`
- `f13_303_rate`
- `route_distribution.participating_postman_route_count`
- `route_distribution.green_route_count`
- `route_distribution.pink_route_count`
- `route_distribution.yellow_route_count`
- `route_distribution.red_route_count`

The doughnut visualization is bound to the same `route_distribution` counts and does not compute any independent totals.

The no-data remediation reuses supported dashboard metadata for the nearest available date and does not query broad historical data or fabricate fallback dates.

## UI Behavior Lock

- Only raw `D-1` / `D-7` `San luong` and raw `Ty le F1.3` can be hidden by the operator.
- `Delta san luong`, `Delta F1.3`, and `Dich chuyen hang` remain visible.
- KPI signal uses the existing Dashboard quality-band semantics.
- Late-cash signal is shown independently without inventing a new threshold scale.
- Rank-movement signal uses the Wave 1 backend direction contract.
- Unavailable comparison data remains unavailable in the UI and is not recalculated in the browser.

## Route Drill-down Contract

Route drill-down remains:

- route: `/f13/ranking/route`
- params:
  - `from_date`
  - `to_date`
  - `interval`
  - `bcvh_id`
  - `bcvh_name`

## Validation Evidence

Focused frontend validation completed:

- `node --test frontend/src/features/dashboard/components/unifiedBcvhAnalysisTableData.test.js`
- `npm.cmd run build`
- `npm.cmd run lint`
- `git diff --check`

Validation result notes:

- frontend mapper and source-contract tests passed
- production build passed
- lint completed with existing repository warnings outside this ticket scope
- no backend formulas, thresholds, route exclusions, or historical fallback calculations were changed

## Manual PO UI Checklist

Screen:

- URL: `/f13/ranking/bcvh`

Steps:

1. Open BCVH Ranking and confirm the page loads one grouped management table instead of the old shell layout.
2. Confirm the four top widgets are runtime-backed and management-useful:
   - `San luong ngay danh gia`
   - `Chat luong F1.3`
   - `Cham nop tien`
   - `Phan bo chat luong tuyen`
3. Confirm the delayed-cash widget shows the runtime delayed-cash rate when the selected BCVH scope already has that rate.
4. Confirm management wording is visible instead of technical implementation wording:
   - `Bảng xếp hạng chất lượng BCVH`
   - `So sánh kỳ trước`
   - `Xem chi tiết tuyến`
5. Confirm the grouped headers appear for:
   - `Don vi`
   - `Ket qua ngay danh gia`
   - `So sanh D-1`
   - `So sanh D-7`
   - `Cham nop tien`
   - `Phan bo tuyen`
   - `Phan tich BCVH`
   - `Hanh dong`
6. Open column options and verify only raw `D-1` / `D-7` volume and raw `D-1` / `D-7` F1.3 columns can be hidden.
7. Confirm `Delta san luong`, `Delta F1.3`, and `Dich chuyen hang` remain visible.
8. Confirm `Hạng`, `Mã BCVH`, and `Tên BCVH` remain visible while scrolling horizontally across later metric groups.
9. Confirm route columns include exactly:
   - `Tuyen xanh`
   - `Tuyen hong`
   - `Tuyen vang`
   - `Tuyen do`
10. Confirm the doughnut shows 4 segments and the pink segment is present when backend data provides it.
11. Confirm KPI, late-cash, and rank-movement signals are shown independently.
12. Confirm no visible technical/explanatory cards remain above the table.
13. Change to a date with no supported ranking data and confirm the empty state:
    - states the selected date clearly
    - shows the nearest available date only when metadata supports it
    - offers `Xem ngay gan nhat`
14. Confirm `Phan tich BCVH` stays factual and does not claim root cause beyond visible metrics.
15. Click `Xem chi tiết tuyến` on one BCVH row and verify Route Ranking opens with preserved `from_date`, `to_date`, `interval`, `bcvh_id`, and `bcvh_name`.
16. Check at least one unavailable state and confirm the UI shows unavailable text instead of calculating a fallback value.

PASS criteria:

- All approved column groups are visible.
- Pink route band is preserved in both counts and doughnut.
- The top widget area is runtime-backed and management-useful.
- Identity columns remain readable during horizontal scroll.
- Drill-down context is preserved.
- Unavailable data is shown factually.

WARNING criteria:

- The table loads but one non-blocking label, spacing, or density issue remains.
- Lint warnings remain unrelated and pre-existing only.

FAIL criteria:

- Pink is missing, merged, or renamed.
- Route drill-down loses BCVH/date context.
- Hidden-column behavior affects non-hideable visible delta or movement columns.
- UI invents fallback comparison values, late-cash thresholds, or unsupported nearest-date behavior.

Do not self-award PO PASS from this checkpoint.
