# F12-DASHBOARD-RANKING-01 Manifest

Status: `BACKEND DONE / TECH PASS / WAITING FOR THE SCREENS (F12-DASHBOARD-UI-01) AND A BACKEND RESTART` (2026-10-12). Read APIs for the F1.2 (thu gom liên tỉnh) Operation Dashboard and Ranking: accepting unit (37) with drill-down to accepting offices (73), day / week / month and rolling 12 months, national rank by accepting province. No portal, no Import, no Evidence.

## 1. Ticket Information

- Ticket ID: `F12-DASHBOARD-RANKING-01`; parent `F12-MODULE-PLAN` (checkpoint Sections 8-11); depends on `F12-PHASE-0-4` and `F12-PHASE-3`.
- Owner: backend `Claude Code (Sonnet 5.5)`; screens `Antigravity` (`F12-DASHBOARD-UI-01`); independent review `Opus` before the PO UI check.
- Authorization: PO chat 2026-10-12 ("ok viết luôn /api/f12 đi mà còn giao Antigravity viết giao diện").
- Branch `codex/da-impl-006`. Does not change Current Ticket.

## 2. Design of Record

- Metric (PD-F12-5): volume = every row (a rating exists on every row), passed = `danh_gia = 'Đạt'` (≤ 10 h), rate = passed / volume. "Chưa đủ thông tin" is outside the denominator and only exists in the national file.
- Accepting side only (PD-F12-2): the ranked unit is the accepting unit `ma_huyen / ten_huyen`; offices drill down below it; no pair table, no delivering BCVH.
- Large customer (PD-F12-8): office `531120 Khách hàng lớn` (unit `5375 BCVH Thuận Hóa`, about 31 % of the day, about 99,8 %) is counted in the module total, shown apart (`unranked`), never ranked and excluded from every ranked figure (ranking, overview, weekly, monthly, unit sums). The ranked-unit total is therefore legitimately lower than the module total.
- Reuse, not copy: `F12RankingService extends F41RankingService` over `FactF12Repository` (generated from the F1.1 repository, metric column and unit swapped) and `F12NationalRankService`; the shared `BcvhOverviewService` / `BcvhWeeklyComparisonService` run unchanged. The only difference is the unit list: before every call the service replaces the six canonical BCVH by the units found in the data (`getRankedUnits`), so a new accepting unit needs no code change. `F41RankingService` gained the instance fields `canonicalCodes` / `canonicalSet` (default = the six BCVH, F1.1/F4.1 behaviour unchanged).
- National rank = published rate by accepting province, 34 provinces (PD-F12-7) via `F12NationalRankService`.
- Lũy kế 12 (PD-F12-10): rolling 12 months ending at the chosen month, sums of daily rows (PD-18), per-month national rank and per-unit 12-month rank.
- Target 95 % (PD-F12-12) is returned in `meta.target_rate`; roles admin + viewer, as `/api/f11`.

## 3. Changes Made

| File | Role |
| --- | --- |
| `backend/src/repositories/FactF12Repository.js` | read queries over `fact_f12` (KPI, meta, overview, weeks/months, weekly, per-unit metrics, daily trend) + `getRankedUnits`, `hasLargeCustomerRows`, `getOfficeGrid`, `getMonthlyUnitGrid` |
| `backend/src/services/F12RankingService.js` | the F4.1 service over the F1.2 stack + `getOfficeTable`, `getCumulative12`, `getDashboardMeta`, `getNationalRanking` |
| `backend/src/controllers/F12RankingController.js`, `backend/src/routes/f12Routes.js`, `backend/server.js` | `/api/f12` HTTP layer, 400 for bad parameters, no-store |
| `backend/src/config/f12KpiScopeContract.js` | target 95, KPI scope note |
| `backend/src/services/F41RankingService.js` | instance-level canonical codes (default unchanged) |
| `backend/src/services/F12RankingService.test.js` | 9 temp-DB tests incl. the real 10/10 file |

## 4. API (`/api/f12`, read-only, `{ success, data }`)

| Endpoint | Notes |
| --- | --- |
| `GET /dashboard/meta` | `min_date`, `max_date`, `bcvh_units[]` (ranked units), `target_rate`, `kpi_scope_note`, `kpi_includes_large_customer`, `large_customer_office` |
| `GET /dashboard/summary?from_date&to_date[&ma_bcvh]` | module KPI + `national_rank` + `comparisons.d1/d7` (same shape as `/api/f41`); `ma_bcvh` = unit code |
| `GET /dashboard/daily-trend`, `/ranking/bcvh`, `/ranking/bcvh/{overview,weeks,weekly-comparison,weekly-trend,months,monthly-comparison}` | identical shapes to `/api/f41`; `ma_bcvh` / `ten_bcvh` hold the accepting unit; no routes block |
| `GET /dashboard/office-table?period=day\|week\|month&anchor_date` or `from_date&to_date` | `{ meta{period, from_date, to_date, days_with_data, has_data, unit_count, office_count, target_rate}, rows[{ma_huyen, ten_huyen, volume, passed, failed, rate, rank, offices[{ma_chap_nhan, ten_chap_nhan, large_customer, volume, passed, failed, rate}]}], unranked[{same shape, the large-customer office}], total_row{ten_huyen, volume, passed, failed, rate} }`; `total_row` equals the module total of the period |
| `GET /dashboard/cumulative-12?month=YYYY-MM` | `{ meta{month, from_date, to_date, months[12], target_rate, has_data, unit_count}, months[{month, volume, passed, failed, rate, days_with_data, data_available, national_rank{rank,total} or null}], cumulative{volume, passed, failed, rate, national_rank}, units[{ma_bcvh, ten_bcvh, volume, passed, failed, rate, rank, months{YYYY-MM: {volume, passed, rate} or null}}] }` |
| `GET /dashboard/national-ranking?from_date&to_date` | the 34 provinces ranked by the accepting province, Huế flagged (kept for the Home page) |

## 5. Validation

- `F12RankingService.test.js` 9/9: ranked units from the data, summary, ranking (large customer outside rows and total row), overview / weeks / months, office table day / week / month / empty / invalid, rolling 12 months across a year boundary, controller; real 10/10 file: 1.758 / 1.620 / 92,15 %, 73 offices, 37 units = 36 ranked + the large-customer unit, large customer 550 / 549.
- `F11RankingService.test.js` 10/10, `F41RankingService.test.js` 11/11, `F11RankingRealBaseline.test.js` 1/1 unchanged after the shared-service edit.
- Read-only smoke on the live database (service level, 11/10 partial day): 37 units in meta, office table total = summary total (664 / 558, 84,04 %), national rank 18/34, rolling 12 months national rank 13/34, overview and ranking return.
- Backend must be **restarted** for `/api/f12` to exist.

## 6. Open Items

- 11/10 was a partial day in the database at the time of the smoke; the screens must not read it as a weak day (the shared dashboards already use the latest complete day through `anchor_date`).
- Evidence (violation stages) and route ranking stay out of scope.

## 7. Next

1. `F12-DASHBOARD-UI-01` (Antigravity): `docs/10_TICKETS/F12-DASHBOARD-UI-01_MANIFEST.md`, prompt `docs/10_TICKETS/F12-DASHBOARD-UI-01_ANTIGRAVITY_PROMPT.md`.
2. Opus review, PO UI check.
