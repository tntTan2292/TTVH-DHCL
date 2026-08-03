# F13 BCVH Ranking Redesign Implementation Wave 2 Checkpoint 001

- Ticket: `F13-BCVH-RANKING-REDESIGN-IMPL`
- Date: `2026-07-29`
- Scope: `Wave 2 frontend presentation`
- Status: `COMPLETED / PO PASS / CLOSED`
- PO UI Check Required: `No`

**[SSOT correction, `2026-08-03`, from `F13-ROUTE-RANKING-REDESIGN-IMPL`]** The delayed-cash denominator described below as `danh_gia_2026 != Đạt` was corrected in the shared engine (`RuleF13302`/`RuleRegistry`) to `danh_gia_2026 = 'Không đạt'` only, excluding `Chuyển hoàn` (BLACK, `danh_gia_2026 IS NULL`) — see `docs/07_REFERENCE/Legacy/F1.3/F13_303_DEFINITION.md` Section 5 and `docs/10_TICKETS/F13-ROUTE-RANKING-REDESIGN-IMPL_MANIFEST.md` Section 16 R6. This changes BCVH Ranking's own delayed-cash numbers (denominator shrinks, rate rises) even though this ticket's `PO PASS` closure and UI are otherwise unaffected. This ticket is not reopened; the correction is recorded here for traceability only.

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

Latest bounded BCVH Ranking remediation on `2026-07-29` delivered:

- kept Dashboard untouched after the recorded PO PASS for presentation isolation
- total row keeps supported aggregate values visible and renders only `—` for unsupported or non-applicable aggregate fields
- total row no longer repeats `Chưa có dữ liệu` badges across `Tổng cộng`
- total row still exposes no analysis panel or route drill-down action
- `Tổng cộng` now has stronger visual hierarchy with dedicated background, clearer separation, and stronger identity typography
- BCVH names are more prominent, BCVH codes remain secondary, and rank remains compact while sticky identity columns and horizontal scrolling stay preserved
- KPI 2026 semantics on BCVH Ranking are aligned to the authoritative Dashboard SSOT labels everywhere they are shown:
  - `Tốt`
  - `Cần chú ý`
  - `Cảnh báo`
  - `Rủi ro cao`
- route-distribution labels remain separately preserved as management route terminology:
  - `Tốt`
  - `Khá`
  - `Trung bình`
  - `Kém`
- KPI status and route-distribution semantics are now explicitly separated in mapper and presentation tests so similar colors do not collapse into shared wording

Latest bounded BCVH Ranking UI remediation on `2026-07-29` delivered:

- removed the four comparison-rank presentation columns from `/f13/ranking/bcvh`
- removed those same comparison-rank outputs from grouped headers, rows, total-row rendering, expandable analysis, column-span calculations, frontend tests, and visible descriptions
- preserved the backend response contract unchanged; comparison-rank fields may remain present but unused by this screen
- `D-1` now keeps only `Sản lượng`, `Tỷ lệ F1.3`, `Delta SL`, and `Delta F1.3`
- `D-7` now keeps only `Sản lượng`, `Tỷ lệ F1.3`, `Delta SL`, and `Delta F1.3`
- preserved the approved hide/show rule so only raw `D-1` / `D-7` `Sản lượng` and `Tỷ lệ F1.3` may be hidden while delta columns remain visible
- added distinct, subtle visual grouping for `Đơn vị`, `Kết quả ngày đánh giá`, `So sánh D-1`, `So sánh D-7`, `Chậm nộp tiền`, `Phân bổ tuyến`, and `Hành động`
- preserved sticky identity columns, horizontal scrolling, and Dashboard isolation

Latest bounded D-1 / D-7 remediation on `2026-07-29` delivered:

- verified the runtime path end to end for `/api/f13/ranking/bcvh` using repository reads, service output, controller payload shape, and frontend mapper input
- confirmed the selected-date comparison contract uses exact `D-1 = selected date - 1 day` and `D-7 = selected date - 7 days`
- confirmed sample runtime data exists for `2026-07-28`, including populated `comparisons.d1` and `comparisons.d7` fields for canonical BCVH rows
- fixed the smallest confirmed backend root cause: comparison-rate construction no longer treats a genuine zero-rate comparison as unavailable when the comparison row exists
- preserved canonical BCVH key matching and kept all frontend comparison rendering bound to runtime data only
- updated each comparison block presentation to the approved four-column order:
  - `Sản lượng`
  - `Tỷ lệ`
  - `SS SL`
  - `SS Tỷ lệ`
- preserved the approved visibility rule so only raw `Sản lượng` and `Tỷ lệ` may be hidden while `SS SL` and `SS Tỷ lệ` stay visible
- updated grouped headers, row rendering, total-row rendering behavior, expandable analysis wording, regression tests, and checkpoint wording to the same four-column contract

Latest bounded total-row and comparison-order remediation on `2026-07-29` delivered:

- backend now builds authoritative `meta.total_row.comparisons.d1` and `meta.total_row.comparisons.d7` aggregates instead of leaving the total-row comparison block unavailable when full comparison coverage exists
- total comparison aggregation uses summed numerators and denominators only:
  - aggregate comparison volume = sum of canonical BCVH comparison volumes
  - aggregate comparison passed = sum of canonical BCVH comparison passed counts
  - aggregate comparison F1.3 = `sum comparison passed / sum comparison volume`
  - `SS SL` = `current total volume - comparison total volume`
  - `SS Tỷ lệ` = `current total F1.3 - comparison aggregate F1.3`
- total-row comparison aggregation does not average BCVH percentages and does not compute browser fallback totals
- total-row coverage stays factual:
  - if every canonical BCVH in the current total has a comparison row, the total-row comparison values are shown
  - if comparison coverage is only partial, the total-row comparison values remain unavailable and the backend exposes partial-coverage metadata instead of a misleading complete total
- frontend mapper now binds total-row comparison values from the backend contract for `Tổng cộng`
- column preference storage was versioned from the previous schema so stale localStorage preferences cannot silently hide newly approved raw comparison columns after the contract change
- post-remediation default visible columns now show all four approved comparison fields in both `D-1` and `D-7`
- grouped block order is now:
  - `Đơn vị`
  - `Kết quả ngày đánh giá`
  - `Chậm nộp tiền`
  - `So sánh D-1`
  - `So sánh D-7`
  - `Phân bổ tuyến`
  - `Hành động`

Latest bounded delayed-cash total-row remediation on `2026-07-29` delivered:

- verified the authoritative delayed-cash SSOT directly in `RuleF13302` and `RuleRegistry` before implementation
- confirmed the delayed condition remains exactly:
  - only facts with `danh_gia_2026 != Đạt` are eligible for the denominator
  - delayed only when both `thoi_gian_ptc` and `thoi_gian_nop_tien` exist, parse successfully, and `thoi_gian_nop_tien - thoi_gian_ptc > 3 giờ`
  - missing or invalid timestamps do not create a delay violation but still remain in the denominator when `danh_gia_2026 != Đạt`
- confirmed the canonical published field remains `f13_303_rate`
- confirmed zero-denominator behavior remains the SSOT engine rule:
  - `f13_303_rate = 0`
- confirmed root cause of the PO defect:
  - BCVH row-level delayed-cash summaries already consumed the authoritative rule output
  - `meta.total_row` only summed `delayed_cash_handover_count`
  - backend never assigned the authoritative total delayed-cash denominator or `f13_303_rate`, so the UI correctly received no total-row rate and rendered `—`
- backend now builds an authoritative delayed-cash aggregate summary for the selected-day canonical BCVH fact scope using the same registered rule execution path as SSOT, instead of averaging BCVH percentages or deriving from `sl_bg_ptc`
- total-row contract now exposes:
  - `delayed_cash_handover_count`
  - `delayed_cash_handover_eligible_count`
  - `f13_303_rate`
- frontend mapper binds the same `f13_303_rate` field for `Tổng cộng`, so no browser fallback calculation was introduced
- real runtime evidence for `2026-07-28` after remediation:
  - numerator: `334`
  - denominator: `1536`
  - rate: `21.7%`
- sample runtime contract evidence on `2026-07-28` now includes:
  - `meta.total_row.delayed_cash_handover_count = 334`
  - `meta.total_row.delayed_cash_handover_eligible_count = 1536`
  - `meta.total_row.f13_303_rate = 21.7`
- backend process restart is required only for a running server instance to load the updated service code; no schema or import migration is required

## Final Closure

- Product Owner decision: `PO PASS`
- Ticket state: `COMPLETED / PO PASS / CLOSED`
- Runtime PO verification: `COMPLETE`
- Latest verified implementation commit: `a6235b2fc99fd662971a7c0fc9d7f43190b133b4`

Accepted contract:

- Dashboard BCVH table remains the original compact overview surface.
- `/f13/ranking/bcvh` remains the detailed independent ranking surface.
- `D-1` and `D-7` each show:
  - `Sản lượng`
  - `Tỷ lệ`
  - `SS SL`
  - `SS Tỷ lệ`
- comparison-rank and rank-movement columns are not rendered.
- table block order remains:
  - `Đơn vị`
  - `Kết quả ngày đánh giá`
  - `Chậm nộp tiền`
  - `So sánh D-1`
  - `So sánh D-7`
  - `Phân bổ tuyến`
  - `Hành động`
- KPI 2026 labels remain:
  - `Tốt`
  - `Cần chú ý`
  - `Cảnh báo`
  - `Rủi ro cao`
- route-distribution labels remain:
  - `Tốt`
  - `Khá`
  - `Trung bình`
  - `Kém`
- delayed-cash SSOT remains:
  - denominator includes selected-day canonical BCVH facts with `danh_gia_2026 != Đạt`
  - delayed only when valid `thoi_gian_ptc` and `thoi_gian_nop_tien` both exist and the gap is strictly greater than `3` hours
  - missing or invalid timestamps remain in the denominator but are not delayed
  - zero denominator publishes `0%`
- accepted runtime evidence for `2026-07-28`:
  - delayed numerator `334`
  - eligible denominator `1536`
  - delayed rate `21.7%`

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
- `Delta san luong` and `Delta F1.3` remain visible.
- comparison-rank and rank-movement columns are not rendered on `/f13/ranking/bcvh`, while backend fields remain unchanged.
- KPI signal uses the existing Dashboard quality-band semantics.
- KPI 2026 labels on BCVH Ranking must remain:
  - `Tốt`
  - `Cần chú ý`
  - `Cảnh báo`
  - `Rủi ro cao`
- route-distribution labels on BCVH Ranking must remain:
  - `Tốt`
  - `Khá`
  - `Trung bình`
  - `Kém`
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

Focused backend validation also completed:

- `node --test backend/src/services/F13DashboardService.recovery.test.js`

Validation result notes:

- Dashboard regression tests passed and confirm compact BCVH table restoration
- BCVH Ranking regression tests passed and confirm redesigned grouped table preservation
- latest regression coverage also confirms:
  - total-row unsupported fields render `—`
  - valid aggregate values remain visible on `Tổng cộng`
  - KPI labels match Dashboard SSOT
  - route-distribution labels remain `Tốt / Khá / Trung bình / Kém`
  - KPI and route semantics are not mixed
  - the four comparison-rank columns are absent
  - `D-1` and `D-7` each retain only the approved four visible fields
  - grouped header color treatments are distinct by block
  - hide/show rules remain limited to raw `D-1` / `D-7` volume and F1.3 columns
  - total-row delayed-cash rate uses authoritative summed numerator and denominator
  - total-row delayed-cash rate is not an average of BCVH rates
  - total-row delayed-cash rate is not derived from `delayed_cash_handover_count / sl_bg_ptc`
  - genuine `0%` delayed-cash rates remain visible as valid runtime values
  - missing timestamps and zero-denominator cases follow SSOT behavior
  - individual BCVH delayed-cash counts and rates remain unchanged
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
4. Confirm `Tổng cộng` keeps supported aggregate values visible, shows `—` instead of repeated unavailable badges for unsupported fields, and still has no analysis action.
5. Confirm KPI 2026 labels read `Tốt / Cần chú ý / Cảnh báo / Rủi ro cao` in the F1.3 widget, KPI cells, and expandable analysis panel.
6. Confirm route-distribution labels remain `Tốt / Khá / Trung bình / Kém` in route columns, doughnut labels, and route analysis content.
7. Confirm `D-1` and `D-7` each show only `Sản lượng`, `Tỷ lệ F1.3`, `Delta SL`, and `Delta F1.3`.
8. Confirm no `Hạng kỳ so sánh` or `Dịch chuyển hạng` columns appear anywhere on the BCVH Ranking screen.
9. Confirm each table block keeps its own light background grouping and that these colors do not imply KPI or route-quality status.

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
