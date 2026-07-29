# F13 BCVH Ranking Redesign Implementation Wave 2 Checkpoint 001

- Ticket: `F13-BCVH-RANKING-REDESIGN-IMPL`
- Date: `2026-07-29`
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

Later bounded PO-check remediation also delivered:

- delayed-cash widget binds the existing runtime delayed-cash rate from the active BCVH scope and no longer shows an unavailable state when the runtime rate already exists
- management wording replaces technical or implementation-facing labels on the PO screen
- `Hạng`, `Mã BCVH`, and `Tên BCVH` are frozen for readability while later metric groups remain horizontally scrollable

Latest bounded BCVH Ranking PO-check remediation also delivered:

- total row now displays only `Tổng cộng`, with blank/`—` identity fields where rank or BCVH code do not apply
- total row binds supported aggregate values without exposing raw `total`
- total row does not expose analysis text or route drill-down action
- management-facing route terminology now uses `Tốt / Khá / Trung bình / Kém` while preserving existing SSOT colors, thresholds, backend fields, and formulas
- long analysis text was removed from the main table and replaced by a single-row expandable analysis panel shown directly below the selected BCVH row
- only one BCVH analysis panel can be open at a time
- the expandable panel uses existing runtime fields only: current-day results, `D-1`, `D-7`, delayed cash handover, participating routes, semantic route distribution, 4-band doughnut, and `Xem chi tiết tuyến`
- duplicated ranking title and duplicated `Ngày đánh giá` presentation were removed

Dashboard isolation remediation on `2026-07-29` delivered:

- verified the regression root cause: `DashboardPage` still rendered `BcvhOperationTableAdapter`, and that adapter had been switched to `UnifiedBcvhAnalysisTable`, which caused BCVH Ranking redesign changes to appear on Dashboard
- restored Dashboard to its previously approved compact BCVH overview table path through `components/f13/BcvhOperationTable.jsx`
- preserved the redesigned BCVH Ranking table on `/f13/ranking/bcvh`
- kept shared data access and ranking runtime contracts intact while separating the presentation contracts
- explicitly deferred any remaining BCVH Ranking total-row polish beyond the already shipped scoped fixes; no additional total-row polish was performed in the Dashboard isolation remediation

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

The doughnut visualization and the expandable analysis panel are both bound to the same runtime route-distribution counts and do not compute independent totals.

The no-data remediation reuses supported dashboard metadata for the nearest available date and does not query broad historical data or fabricate fallback dates.

## Dashboard Isolation Root Cause

- Shared presentation seam: [frontend/src/features/dashboard/components/BcvhOperationTableAdapter.jsx](D:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/frontend/src/features/dashboard/components/BcvhOperationTableAdapter.jsx)
- Regression cause: Dashboard adapter rendered `UnifiedBcvhAnalysisTable`, which is the BCVH Ranking redesign surface
- Restored Dashboard surface: [frontend/src/components/f13/BcvhOperationTable.jsx](D:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/frontend/src/components/f13/BcvhOperationTable.jsx)
- Preserved BCVH Ranking surface: [frontend/src/features/dashboard/components/UnifiedBcvhAnalysisTable.jsx](D:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/frontend/src/features/dashboard/components/UnifiedBcvhAnalysisTable.jsx)

## UI Behavior Lock

- Dashboard must render the previously approved compact BCVH overview table only.
- Dashboard must not render grouped ranking columns, extended `D-1` / `D-7` ranking fields, route doughnut, expandable BCVH analysis, or BCVH Ranking-specific actions.
- `/f13/ranking/bcvh` keeps the redesigned grouped table, route distribution, expandable analysis, hide/show rules, and drill-down.
- Only raw `D-1` / `D-7` `San luong` and raw `Ty le F1.3` can be hidden by the operator on BCVH Ranking.
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

- `node --test frontend/src/features/dashboard/components/dashboardComposition.smoke.test.js frontend/src/features/dashboard/components/dashboardStaleKpiRecovery.test.js frontend/src/features/dashboard/components/unifiedBcvhAnalysisTableData.test.js`
- `npm.cmd run build`
- `npm.cmd run lint`
- `git diff --check`

Validation result notes:

- Dashboard regression tests passed and confirm compact BCVH table restoration
- BCVH Ranking regression tests passed and confirm redesigned grouped table preservation
- production build passed
- lint completed with existing repository warnings outside this ticket scope
- no backend formulas, thresholds, route exclusions, Dashboard business behavior, or historical fallback calculations were changed

## Manual PO UI Checklist

Screen 1:

- URL: `/dashboard`

Checks:

1. Confirm Dashboard renders the original compact BCVH overview table rather than the redesigned ranking table.
2. Confirm Dashboard does not show grouped `D-1` / `D-7` ranking columns, route doughnut, expandable BCVH analysis, or `Xem chi tiết tuyến`.
3. Confirm Dashboard BCVH overview still uses its previously accepted compact title, compact totals row, and prior behavior.

Screen 2:

- URL: `/f13/ranking/bcvh`

Checks:

1. Confirm BCVH Ranking still renders the redesigned grouped table.
2. Confirm `D-1` / `D-7` blocks, route distribution, expandable analysis, hide/show rules, and drill-down are preserved.
3. Confirm Dashboard isolation did not remove BCVH Ranking-specific grouped columns, doughnut, semantic route labels, or analysis expansion.

PASS criteria:

- Dashboard compact BCVH overview is restored.
- BCVH Ranking redesigned table is preserved.
- The two surfaces no longer share the same presentation contract.

WARNING criteria:

- Isolation is correct but one non-blocking label or spacing issue remains on one surface.
- Lint warnings remain unrelated and pre-existing only.

FAIL criteria:

- Dashboard still renders grouped BCVH Ranking UI.
- BCVH Ranking loses grouped columns, route distribution, expandable analysis, or drill-down.
- Fix changes Dashboard business formulas, SSOT thresholds, filters, or previously accepted layout beyond restoring the compact table.

Do not self-award PO PASS from this checkpoint.
