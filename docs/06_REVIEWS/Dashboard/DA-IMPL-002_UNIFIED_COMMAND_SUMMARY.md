# DA-IMPL-002 Unified Command Summary

- Ticket: `DA-IMPL-002`
- Status: `COMPLETED`
- Technical Status: `PASS`
- Runtime Status: `PASS`
- PO Product Status: `PO PASS`
- Date: `2026-07-18`
- Review Status: `PO PASS`
- PO closure date: `2026-07-18`
- PO Reviewer: `Product Owner`

## Scope Delivered

- Replaced the separate top KPI grid and duplicate Executive Summary with one compact `Tong quan dieu hanh` surface on `/f13/dashboard`.
- Kept exactly four leadership cards: `Ty le dat`, `Xep hang toan quoc`, `San luong`, and `Buu gui can xu ly`.
- Removed `Ty le khong dat` as an independent KPI card; it appears only as supporting information inside the action card.
- Restored national rank from imported nationwide data instead of placeholder rank behavior.
- Preserved existing KPI formulas, schema, canonical BCVH filters, URL date context, and missing-data semantics.
- Left Auto Import as planning-only and inactive.

## PO Acceptance Closure

Product Owner decision in chat: `PO PASS DA-IMPL-002`.

Product Owner accepted:

- Unified Command Summary.
- Four-card structure: `Ty le dat`, `Xep hang toan quoc`, `San luong`, and `Buu gui can xu ly`.
- `Ty le khong dat` as supporting information only.
- Action card and insight using the same `total_failed` API source.
- No fabricated zero when data is missing.
- National-rank period wording.
- Removal of duplicate Executive Summary.
- Compact command summary within the first desktop viewport.

## National Rank Lineage

- Source table: `fact_f13_national`
- Import path: national Excel files parsed by `nationalExcelParser`, routed by the import pipeline for national data, and written through `importNationalParsedData`.
- Province match: `system_config.default_province_code`, default `53`.
- Province row observed: `Buu dien Tinh Thua Thien Hue`.
- Ranking metric: `tl_ptc_dung_qd_ct`
- Ranking direction: descending.
- Tie behavior: metric descending, then `sl_bg_ptc` descending; no shared-tie grouping.
- Runtime period selected for the dashboard range ending `2026-07-15`: latest national period `2026-06-28`.
- Runtime result: Hue rank `14/34`, metric value `0.6048`, volume `2553`.
- Previous national period was not available in the runtime database, so rank movement is not displayed.

## Runtime Evidence

- Backend restarted from current source on `2026-07-18`; `GET /api/f13/dashboard/kpi?from_date=2026-06-16&to_date=2026-07-15` returned `national_rank.available: true`, `rank: 14`, `total: 34`, `period: 2026-06-28`.
- PO warning closure on `2026-07-18` traced `total_failed` as the API SSOT for both the action card and executive insight.
- Aggregate API check: `GET /api/f13/dashboard/kpi?from_date=2026-07-15&to_date=2026-07-15&ma_bcvh=all` returned `total_bg: 3677`, `total_failed: 1037`, `passed_rate: 67.2`, `failed_rate: 28.2`, and national rank period `2026-06-28`.
- BCVH API check: `GET /api/f13/dashboard/kpi?from_date=2026-07-15&to_date=2026-07-15&ma_bcvh=535790` returned `total_bg: 96`, `total_failed: 25`, `passed_rate: 71.9`, `failed_rate: 26`, and `national_rank: null`.
- Browser validation at `http://127.0.0.1:4174/f13/dashboard?from_date=2026-06-16&to_date=2026-07-15`, viewport `1440x900`:
  - Unified Command Summary present.
  - Four required cards present.
  - `14/34` and national period `2026-06-28` visible.
  - `Ty le khong dat:` visible only as supporting action-card information.
  - No exact standalone `Ty le khong dat` KPI label found.
  - Old duplicate Executive Summary presentation absent.
  - Summary rectangle: top `345`, bottom `773`, height `428`; complete summary visible inside the first viewport.
  - Page `scrollHeight`: `900`.
  - Console errors: none observed.
- Browser recheck for PO warning closure:
  - Aggregate `2026-07-15`, `ma_bcvh=all`: action card showed `1.037`, supporting rate `28.20%`, insight used `Toan pham vi dang chon` wording and `1.037` from the same API field, short labels were visible, national period `2026-06-28` was visible.
  - BCVH `535790`: action card showed `25`, supporting rate `26.00%`, insight used the same `25`, and national rank remained unavailable.
- PO FAIL closure on `2026-07-18`:
  - Backend `5050` and frontend preview `4174` were rebuilt and restarted from the current working tree.
  - Runtime bundle observed in browser: `assets/index-D6-ZjzyU.js`.
  - Aggregate runtime URL: `http://127.0.0.1:4174/f13/dashboard?from_date=2026-07-15&to_date=2026-07-15&ma_bcvh=all&cache_bust=D6-ZjzyU`.
  - Action card text: `Buu gui can xu ly` value `1.037`, support `Ty le khong dat: 28.20%`.
  - Insight text uses the same `1.037` count.
  - Rank card now states both selected period `2026-07-15` and nearest national data period `2026-06-28`.
  - No runtime app console errors were observed.
  - Screenshot: [DA-IMPL-002_runtime_aggregate_after_po_fail.png](./DA-IMPL-002_runtime_aggregate_after_po_fail.png)

## Compactness Evidence

- DA-IMPL-002 removed the separate top KPI grid plus duplicate Executive Summary presentation and replaced them with a single command surface.
- Source baseline before DA-IMPL-002 contained an additional Executive Summary card with `min-h-[240px]` beside recommendations after the KPI grid.
- After implementation, the runtime `1440x900` first viewport contains the header, filter bar, and full Unified Command Summary; measured summary bottom is `773`, below viewport height `900`.
- DA-IMPL-002 reduces the duplicated top-summary structure and does not increase total page height in the validated runtime.

## Validation

- `node --test backend\src\services\F13DashboardService.recovery.test.js backend\src\controllers\DashboardController.recovery.test.js`
- `node --test frontend\src\features\dashboard\components\unifiedCommandSummary.test.js frontend\src\features\dashboard\components\dashboardLanguageSemantics.test.js frontend\src\features\dashboard\components\dashboardFilterOptions.test.js frontend\src\features\dashboard\components\dashboardStaleKpiRecovery.test.js frontend\src\features\dashboard\components\comboTrendlineData.test.js frontend\src\features\dashboard\components\samePeriodComparisonData.test.js frontend\src\features\dashboard\components\qualityTrendlineWindow.test.js`
- `npm.cmd run build`
- `npm.cmd run lint`
- `git diff --check`

## Known Notes

- `npm.cmd run lint` passes with pre-existing warnings outside DA-IMPL-002 scope.
- Build reports the existing large bundle warning.
- Browser shell emitted external Statsig networking noise during one reconnect; app console logs for the final BCVH check were empty.
- PO FAIL diagnosis: the validated source and rebuilt bundle render `1.037`; a runtime restart/cache-bust was required to prove the browser was not serving the previous preview process or stale asset.
- Product Owner review is complete with `PO PASS`.
