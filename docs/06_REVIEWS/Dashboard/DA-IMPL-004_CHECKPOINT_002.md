# DA-IMPL-004 Checkpoint 002 - Unified BCVH Table Vertical Slice

- Ticket: `DA-IMPL-004`
- Status: `CHECKPOINT 002 - TECHNICAL VERTICAL SLICE COMPLETE`
- Date: `2026-07-20`
- Branch: `codex/da-impl-004`
- Scope boundary: smallest frontend vertical slice only; no backend API, schema, KPI formula, BCVH mapping, threshold, SSOT, AUTO-IMPORT, TCT, scheduling, persistence, or Architecture Freeze change.

## Implementation Summary

Checkpoint 002 replaced the existing dashboard BCVH operation-table slot with a unified BCVH analysis table backed by the current `GET /api/f13/ranking/bcvh` contract.

The implementation adds:

- A pure frontend mapper for the ranking response.
- A focused `UnifiedBcvhAnalysisTable` component.
- A compact adapter update so the existing dashboard layout and filters continue to drive the BCVH table area.
- Focused mapper/source-boundary tests.

No backend files were changed.

## Files Changed

- `frontend/src/features/dashboard/components/unifiedBcvhAnalysisTableData.js`
- `frontend/src/features/dashboard/components/UnifiedBcvhAnalysisTable.jsx`
- `frontend/src/features/dashboard/components/BcvhOperationTableAdapter.jsx`
- `frontend/src/features/dashboard/components/unifiedBcvhAnalysisTableData.test.js`
- `docs/06_REVIEWS/Dashboard/DA-IMPL-004_CHECKPOINT_002.md`
- `docs/10_TICKETS/DA-IMPL-004_MANIFEST.md`

## Implemented Fields

| Unified field | UI source | Authoritative source |
| --- | --- | --- |
| BCVH identity | `ma_bcvh`, `ten_bcvh` | `GET /api/f13/ranking/bcvh` row fields from `fact_f13` / canonical ranking service output. |
| Operational context | selected date range, rank | Dashboard filter props and ranking row `rank`. |
| Total volume | `sl_bg_ptc`, fallback `total_bg` | Existing ranking service fields. |
| Pass | `dat_kpi_2026`, fallback compatible aliases | Existing ranking service fields. |
| Fail | `khong_dat_kpi_2026`, fallback compatible aliases | Existing ranking service fields. |
| Current KPI | `kpi_2026`, fallback compatible aliases | Existing ranking service field; no new formula in frontend. |
| Prior-period comparison | `kpi_2026_dod`, `kpi_2026_swc` | Existing ranking service D-1 and D-7 fields. |
| Detail action | `/f13/ranking/route` with current URL context | Existing navigation contract; route-detail mock page was not expanded. |

## Unavailable Fields

The UI shows `Chưa có dữ liệu` for fields not available at row level from the approved contract:

- Row-level missing/unknown.
- Row-level chuyển hoàn.
- Row-level compact trend.
- Warning level when no authoritative warning field is present.

The mapper does not derive these values from totals, KPI rate, local thresholds, or client-only assumptions.

## Warning Boundary

The previous legacy table had local `70/60/50` cutoffs. Checkpoint 002 does not reuse those cutoffs as approved warning rules.

Warning display behavior:

- If an existing authoritative response field such as `warning_level`, `quality_pulse_level`, or `risk_level` is supplied, the mapper passes it through.
- If no such field is supplied, the row displays neutral unavailable state: `Chưa có dữ liệu`.

## State Contract

| State | Implemented behavior |
| --- | --- |
| Loading | Stable `LoadingState` with `Đang tải bảng phân tích BCVH...`. |
| Empty | `EmptyState` with the selected date range and no synthetic rows. |
| Partial data | Required ranking fields render; optional missing/trend/warning evidence displays `Chưa có dữ liệu`. |
| Error | `ErrorState` with retry action and backend/operator-readable error message when available. |

## Compatibility Notes

- Dashboard filters remain owned by `DashboardPage.jsx`.
- The adapter still occupies the same `BcvhOperationTableAdapter` dashboard slot.
- The data request uses `from_date`, `to_date`, page size, and rank ordering against the existing ranking endpoint.
- The total row is informational only and does not navigate as a BCVH detail row.
- The detail action remains compatible with existing navigation and does not fix or expand the mock route-detail page.

## Tests and Validation

- `node --test frontend/src/features/dashboard/components/unifiedBcvhAnalysisTableData.test.js` - PASS.
- `node --test frontend/src/features/dashboard/components/integratedTrendRiskData.test.js frontend/src/features/dashboard/components/qualityTrendlineWindow.test.js frontend/src/features/dashboard/components/comboTrendlineData.test.js frontend/src/features/dashboard/components/samePeriodComparisonData.test.js frontend/src/features/dashboard/components/unifiedCommandSummary.test.js frontend/src/features/dashboard/components/dashboardLanguageSemantics.test.js frontend/src/features/dashboard/components/unifiedBcvhAnalysisTableData.test.js` - PASS, 49 tests.
- `node --check frontend/src/features/dashboard/components/unifiedBcvhAnalysisTableData.js` - PASS.
- `npm.cmd run lint` from `frontend` - PASS with pre-existing warnings outside DA-IMPL-004 scope.
- `npm.cmd run build` from `frontend` - PASS with existing Vite large chunk warning.
- `git diff --check` - PASS.

`node --check` was not applied to `.jsx` files because Node in this repository reports `ERR_UNKNOWN_FILE_EXTENSION` for direct `.jsx` syntax checks; frontend build covered JSX parsing.

## Known Limitations

- Row-level missing/unknown and chuyển hoàn are not supplied by the current ranking endpoint.
- Row-level compact trend for every BCVH is not supplied by the current ranking endpoint.
- Warning level remains unavailable unless an existing authoritative response field is supplied.
- The route-detail page remains in its existing mock-backed state; this checkpoint only preserves compatible navigation.

## PO Blockers

None for Checkpoint 002.

Future Product Owner or governance decision is required only if row-level missing/chuyển-hoàn, row-level compact trend for every BCVH, or new warning thresholds are required beyond existing contracts.
