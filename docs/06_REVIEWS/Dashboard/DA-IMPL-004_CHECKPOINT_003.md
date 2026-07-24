# DA-IMPL-004 Checkpoint 003 - Technical Hardening and PO Handoff

- Ticket: `DA-IMPL-004`
- Status: `READY FOR PO CHECK`
- Date: `2026-07-20`
- Branch: `codex/da-impl-004`
- Scope boundary: technical hardening and PO acceptance preparation only; no browser UI acceptance, screenshot PO validation, backend API change, schema change, KPI formula change, BCVH mapping change, new threshold, SSOT change, AUTO-IMPORT change, TCT scope, or Architecture Freeze change.

## Runtime Robustness Review

The unified BCVH table remains a frontend vertical slice in the existing `BcvhOperationTableAdapter` dashboard slot.

Verified robustness points:

- Mapper uses only existing ranking response fields for row values.
- Null and absent KPI/comparison fields render as `Chưa có dữ liệu`.
- Row-level `Chuyển hoàn` is mapped from the approved existing data-contract relationship `Sản lượng = Đạt + Không đạt + Chuyển hoàn`.
- Row-level compact trend and warning are not derived.
- Warning display remains neutral unless an authoritative field such as `warning_level`, `quality_pulse_level`, or `risk_level` is present in the response.
- Total row is informational and does not open route detail navigation.
- Detail action preserves existing route URL context and does not modify the mock route-detail page.
- Empty API data renders an empty state instead of synthetic business rows.
- API errors render table-level error and retry state.

## Authoritative Mapping Verified

| UI value | Existing source |
| --- | --- |
| BCVH code/name | `GET /api/f13/ranking/bcvh` row `ma_bcvh`, `ten_bcvh` |
| Rank/context | ranking row `rank`; dashboard `fromDate`, `toDate`, `interval` props |
| Volume | ranking row `sl_bg_ptc`, fallback `total_bg` |
| Pass | ranking row `dat_kpi_2026`, fallback compatible aliases |
| Fail | ranking row `khong_dat_kpi_2026`, fallback compatible aliases |
| Chuyển hoàn | calculated display value `Sản lượng - Đạt - Không đạt` from existing ranking row fields |
| KPI | ranking row `kpi_2026`, fallback compatible aliases |
| Prior comparison | ranking row `kpi_2026_dod`, `kpi_2026_swc` |
| Optional unavailable fields | mapper explicit null/unavailable contract |
| Detail navigation | `/f13/ranking/route` with `from_date`, `to_date`, `interval`, `bcvh_id`, `bcvh_name` |

## API Technical Checks

Backend runtime used: existing process on `localhost:5050`, process name `node`, without killing or replacing it.

Checks:

- `GET http://localhost:5050/api/f13/ranking/bcvh?from_date=2026-07-15&to_date=2026-07-15&page=1&page_size=3&sort=rank&order=asc`
  - Result: `success: true`.
  - Returned rows include `ma_bcvh`, `ten_bcvh`, `sl_bg_ptc`, `dat_kpi_2026`, `khong_dat_kpi_2026`, `kpi_2026`, `kpi_2026_dod`, `kpi_2026_swc`, `rank`.
  - Example rows: `BCVH Thuận An`, `BCVH Thuận Hóa`, `BCVH A Lưới`.
  - `meta.total_row` returned with total volume/pass/fail/KPI/D-1/D-7 fields.
- `GET http://localhost:5050/api/f13/ranking/bcvh?from_date=2026-07-19&to_date=2026-07-19&page=1&page_size=3&sort=rank&order=asc`
  - Result: `success: true`.
  - Confirms the ranking endpoint returns the active PO-selected date `2026-07-19`.
  - Example total row: volume `537`, pass `337`, fail `188`, therefore `Chuyển hoàn = 12`.
- `GET http://localhost:5050/api/f13/ranking/bcvh?from_date=1900-01-01&to_date=1900-01-01&page=1&page_size=3&sort=rank&order=asc`
  - Result: `success: true`, `data: []`, `total_items: 0`.
  - Confirms frontend empty-state path.
- `GET http://localhost:5050/api/f13/ranking/bcvh?from_date=bad&to_date=bad&page=1&page_size=3`
  - Result: HTTP `500`, error code `SERVER_ERROR`, message from backend service.
  - Confirms frontend API-error path has an error response to display.

## Automated Validation

- `node --test frontend/src/features/dashboard/components/unifiedBcvhAnalysisTableData.test.js` - PASS, 10 tests.
- `node --test frontend/src/features/dashboard/components/integratedTrendRiskData.test.js frontend/src/features/dashboard/components/qualityTrendlineWindow.test.js frontend/src/features/dashboard/components/comboTrendlineData.test.js frontend/src/features/dashboard/components/samePeriodComparisonData.test.js frontend/src/features/dashboard/components/unifiedCommandSummary.test.js frontend/src/features/dashboard/components/dashboardLanguageSemantics.test.js frontend/src/features/dashboard/components/unifiedBcvhAnalysisTableData.test.js` - PASS, 53 tests.
- `node --check frontend/src/features/dashboard/components/unifiedBcvhAnalysisTableData.js` - PASS.
- `npm.cmd run lint` from `frontend` - PASS with pre-existing warnings outside DA-IMPL-004 scope.
- `npm.cmd run build` from `frontend` - PASS with existing Vite large chunk warning.
- `git diff --check` - PASS.

`node --check` was not used on `.jsx` files because direct `.jsx` syntax checks in this Node setup return `ERR_UNKNOWN_FILE_EXTENSION`; Vite build covered JSX parsing.

## PO Defect Fixes After Initial Checkpoint 003

- Fixed confirmed `Chuyển hoàn` mapping defect by calculating `Chuyển hoàn = Sản lượng - Đạt - Không đạt` for every BCVH row and the total row.
- Replaced visible table wording `Thiếu/chuyển hoàn` with `Chuyển hoàn`.
- Fixed date-filter synchronization by clearing current table state on reload and ignoring out-of-order responses with a request sequence guard.
- Added focused tests for `Chuyển hoàn` calculation, row/total reconciliation, removal of incorrect terminology, active date context, request parameter synchronization, and stale response protection.

## Remaining Limitations

- `Chuyển hoàn` is available as a display mapping from existing row fields. It is not a new KPI formula.
- Row-level compact trend remains unavailable because the ranking endpoint does not provide multi-day row trend points.
- Warning level remains unavailable unless the API supplies an existing authoritative warning field.
- The route-detail page remains in its existing mock-backed state; DA-IMPL-004 preserves navigation compatibility only.
- The ranking endpoint currently returns the operational ranking for the selected `to_date`; the frontend sends both `from_date` and `to_date` to preserve current filter context.

## Readiness

`DA-IMPL-004` technical criteria passed and is ready for Product Owner check.

Do not mark `PO PASS` until Product Owner completes visible acceptance.

## Genuine Blockers

None.
