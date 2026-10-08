# F41-DASHBOARD-RANKING-01 — Design of Record

**Status:** APPROVED BY PO (2026-10-08, Phương án A) — Design of Record v1, written in T0.
**Author:** Claude Code (Sonnet 5.5).
**Proposal of record:** `docs/04_TECHNICAL_PLANNING/Feature/F41-DASHBOARD-RANKING-01_PROPOSAL.md`.
**Manifest:** `docs/10_TICKETS/F41-DASHBOARD-RANKING-01_MANIFEST.md`.

This document fixes *how* the PO-approved scope is built. It changes no business rule: every rule comes from `F41-MODULE-PLAN_CHECKPOINT_001.md` (PO-1..PO-10, DC-1..DC-11) or from the approval decisions in the Proposal, Section 2. Where a detail depends on reading code that a later ticket owns, the line says **frozen in Tn** and that ticket must freeze it before coding.

## 1. Principles

1. **Additive only.** The three existing `/api/f41/dashboard/*` endpoints (`kpi`, `meta`, `bcvh-reconciliation`) keep their current request/response contract byte for byte. New work adds endpoints and files.
2. **No F1.3 backend edit.** `BcvhOverviewService` and `BcvhWeeklyComparisonService` take their repository and dashboard service through the constructor; F4.1 passes its own. `FactBuuGuiRepository`, `F13DashboardService`, `DashboardController` and `f13Routes.js` are read, not edited.
3. **Contract parity.** Every new `/api/f41/...` endpoint answers with the same field names and nesting as its `/api/f13/...` twin for every field the F4.1 screens consume, so the F1.3 frontend mappers work unchanged. Fields that only make sense for F1.3 (route distribution, F13302 breakdown, route capacity) are absent or empty, never invented.
4. **Frontend by configuration.** A single "indicator config" object is injected into shared blocks; its default is F1.3, so F1.3 behaves exactly as before.
5. **Read-only.** No schema, index, Import or data write. All SQL is parameter-bound.

## 2. Locked rules carried into this design

| Rule | Source | Effect |
| --- | --- | --- |
| Metric = `danh_gia_co_tms_ptc_8h`; rate = `COUNT(= 'Đạt') / COUNT(*)`; blank rows stay in the denominator | PO-1, PO-2, DC-6 | Every F4.1 volume is `COUNT(*)`; every passed is `= 'Đạt'` |
| `531120` (and `531110`, `531600`) counted in module KPI but hidden from Ranking | PO-6, DC-7, ITR-F41-NB-04 | Ranking/overview/weekly use the 6 canonical codes; the KPI/summary uses the whole table. Two labelled totals (`60,98%` module / `60,97%` six units) |
| Weeks run Thursday–Wednesday, ISO 8601 number of the week's own Thursday; an in-progress week shows its real data range | Proposal §2 #6, F13-BCVH-WEEKLY-COMPARISON-01 | The same week math (reused, not copied) so F1.3 and F4.1 weeks coincide |
| TỔNG CỘNG = summed volume/passed then rate; never an average of 6 rates | F13-BCVH-WEEKLY-COMPARISON-01 | Inherited by reusing the service |
| Colour bands green ≥ 80, pink 70–80, yellow 60–70, red < 60 | Proposal §2 #3 | Indicator config `bands` |
| Chart target line "Mục tiêu 90%" | Proposal §2 #9 | Indicator config `targetRate = 90` |
| National rank: Huế among 34 units by the published national rate | Proposal §2 #4 | Section 5 |
| Roles: `admin` and `viewer` read; Import stays admin | PO-10 | `allowViewerRead` on all new routes; nav shows both |
| No route, no Tuyến Ranking | PO-4, D-13 | Route blocks absent; `routes` is `[]` |

## 3. Block map: F1.3 → F4.1

### 3.1 Operation Dashboard (`/f41/dashboard`)

| F1.3 block | F4.1 | Data source (new `/api/f41/...`) |
| --- | --- | --- |
| `UnifiedCommandSummary` (KPI cards, national rank, comparisons) | Reuse with F4.1 labels | `GET /dashboard/summary` (F1.3-shaped KPI built on the existing `getKpiMetrics`) |
| `BcvhOperationTable` (ĐIỀU HÀNH NGÀY + LŨY KẾ THÁNG, rank, cùng kỳ tuần trước, cùng kỳ/cả tháng trước toggle) | Reuse | `GET /ranking/bcvh/overview` |
| `IntegratedTrendRiskWorkspace` / daily trendline (7/30 ngày, zoom) | Reuse with target 90% | `GET /dashboard/daily-trend` |
| `OperatingPatternTabsCard` (theo thứ / tháng / heatmap) | **Out of scope** (PO: phase later) | — |
| `UnifiedActionCenter`, Rule Recommendation, Top list, Message | **Out of scope** (F1.3 rules) | — |

### 3.2 BCVH Ranking (`/f41/ranking/bcvh`)

| F1.3 block | F4.1 | Data source |
| --- | --- | --- |
| `BcvhWeeklyComparisonBlock` (tuần / tháng, cùng kỳ, national rank on header cards) | Reuse | `GET /ranking/bcvh/weeks`, `/weekly-comparison`, `/months`, `/monthly-comparison` |
| `BcvhWeeklyTrendBlock` + weekly combo chart | Reuse | `GET /ranking/bcvh/weekly-trend` |
| `BcvhMonthlyTrendBlock` + monthly combo chart + collapsed heatmap | Reuse | `GET /ranking/bcvh/overview` (`monthly`) |
| Single-day ranking table (`UnifiedBcvhAnalysisTable`) + KPI cards | Reuse without route columns/links | `GET /ranking/bcvh` |
| Route capacity, doughnut by route, "Xem chi tiết tuyến" | **Removed** (no route data) | — |

## 4. Backend design

### 4.1 Files (new, F4.1-owned)

| File | Role |
| --- | --- |
| `backend/src/repositories/FactF41Repository.js` | **Extended** (existing F4.1 file): the nine query methods below, additive, existing methods untouched |
| `backend/src/services/F41NationalRankService.js` | National rank over `fact_f41_national` (Section 5), exposing `getNationalRankSummary(from, to)` and `getNationalRanksForDates(dates)` with the same result shape as `F13DashboardService` |
| `backend/src/services/F41RankingFacade.js` | Builds `BcvhOverviewService` and `BcvhWeeklyComparisonService` instances with the F4.1 repository + rank service; also the thin summary / daily-trend / single-day ranking logic |
| `backend/src/controllers/F41RankingController.js` | HTTP layer for the new endpoints (date validation reused from `F41DashboardController` style: `400 INVALID_DATE` / `INVALID_RANGE` / `MISSING_PARAM`, no-store headers) |
| `backend/src/routes/f41Routes.js` | **Extended**: new routes appended, all `requireAuth` + `requireRole(['admin','viewer'])` |

### 4.2 Repository methods (same signature and row shape as the F1.3 twin)

| F4.1 method (in `FactF41Repository`) | F1.3 twin used by the reused service | Notes |
| --- | --- | --- |
| `getBcvhOverviewMonthly(anchorCeiling, codes)` | `FactBuuGuiRepository.getBcvhOverviewMonthly` | volume = `COUNT(*)`, passed = `= 'Đạt'` |
| `getBcvhOverviewDaily(anchorCeiling, codes)` | same name | includes `prev_anchor_date`, `week_ago_date` columns as F1.3 does |
| `getBcvhOverviewMtd(anchorCeiling, codes)` | same name | includes `previous_*` and `previous_full_*` columns |
| `getBcvhOverviewRoutes(anchorCeiling, codes)` | same name | returns `[]` (no route dimension) |
| `getBcvhWeeksList(codes)` | same name | |
| `getBcvhMonthsList(codes)` | same name | |
| `getBcvhWeeklyTrendAggregate(from, to, codes)` | same name | |
| `getBcvhWeeklyComparisonAggregate(boundsA, boundsB, codes)` | same name | |
| `getDailyTrendData(from, to, filters)` and `getBcvhRankingByRange(from, to)` | `getDailyTrendData`, `getBcvhOperationMetricsBetween` | feed daily-trend and the single-day ranking |

Exact column lists and row shapes are **frozen in T1/T2** by reading the F1.3 repository methods and the reused services' consumption of them; each new method gets a shape-parity test against the same assertions the F1.3 service tests make.

All methods filter `ma_bc_phat IN (canonical codes)` for ranking/overview/weekly; `getBcvhOverview*` etc. accept `codes` exactly as F1.3 does. The `summary` KPI does **not** filter (module total, PO-2). Index `idx_f41_date_bcvh_eval(ngay_do_kiem, ma_bc_phat, danh_gia_co_tms_ptc_8h)` already covers the aggregates; no new index (a new index would be a schema change, out of scope).

### 4.3 Endpoints (new, under `/api/f41`)

| Method + path | Twin | Notes |
| --- | --- | --- |
| `GET /dashboard/summary?from_date&to_date&ma_bcvh` | `/f13/dashboard/kpi` | F1.3-compatible KPI card fields (`total_bg`, `total_passed`, `total_failed`, `total_unknown`, `passed_rate`, `failed_rate`, `national_rank`, `comparisons`); the existing `/dashboard/kpi` stays as is |
| `GET /dashboard/daily-trend?from_date&to_date&ma_bcvh` | `/f13/dashboard/daily-trend` | `meta` + `items[]` with `national_rank` per day when no BCVH filter |
| `GET /ranking/bcvh/overview?anchor_date` | `/f13/ranking/bcvh/overview` | `monthly`, `daily`, `mtd`, `routes: []`, `meta` incl. `national_rank` |
| `GET /ranking/bcvh/weeks` | `/f13/ranking/bcvh/weeks` | |
| `GET /ranking/bcvh/weekly-comparison?week&compare_week` | same | `meta.national_rank = { current, compare }` |
| `GET /ranking/bcvh/weekly-trend?week&limit` | same | per-week `national_rank` |
| `GET /ranking/bcvh/months` | same | |
| `GET /ranking/bcvh/monthly-comparison?month&compare_month&same_period` | same | |
| `GET /ranking/bcvh?from_date&to_date&sort&order&page&page_size` | `/f13/ranking/bcvh` | the 6 canonical units only (PO-6), no route fields |

Error contract: `MISSING_PARAM`, `INVALID_DATE`, `INVALID_RANGE`, `INVALID_WEEK_ID`, `WEEK_NOT_FOUND`, `INVALID_MONTH_ID`, `MONTH_NOT_FOUND`, `INVALID_PARAM` (bad `ma_bcvh`) with the same HTTP statuses as F1.3. All responses carry `no-store`. A failing national-rank query yields `null` for the rank (UI shows a dash), never an error.

### 4.4 ITR2-F41-NB-01 (done in T0)

`F41DashboardService.getDashboardMeta()` returned `kpi_includes_non_canonical_bcvh: false` when the repository could not answer. It now returns `null` (unknown). Regression test added. `ITR2-F41-NB-02` and `-03` are documentation wording defects of the paused ticket and are not changed.

## 5. National rank (F4.1)

- Source: `fact_f41_national` (34 units per day on the dates present; column values `sl_*` are integers, `tl_*` are text and are **not** used).
- Province: `system_config.default_province_code` (default `'53'`), exactly as F1.3.
- Rank for a range `[from, to]`: group by `ma_don_vi`, `rate = SUM(sl_ptc_8h_co_tms) / SUM(sl_ptc_nop_tien_ch)`, `HAVING SUM(sl_ptc_nop_tien_ch) > 0`, order by `rate DESC`, then `SUM(sl_ptc_nop_tien_ch) DESC`; ties are not merged (same rule text as F1.3). Result shape: `{ available, rank, total, period, period_start, period_end, metric, metric_label, metric_value, volume, direction, tie_behavior }`.
- Label: "Tỷ lệ PTC 8 giờ (Có TMS) theo báo cáo toàn quốc". The national figure for Huế (e.g. `61,12% = 2.863 / 4.684` on 2026-08-01) legitimately differs from the BCVH table (`60,98% = 2.863 / 4.695`) by about 0,14 points (R-8 of the module plan); the UI labels it as the national-report value and never substitutes one for the other.
- Rank is for Huế as a whole; shown only in the "toàn mạng / Tổng cộng 6 BCVH" views, never for a single BCVH (same as F1.3).

## 6. Frontend design

### 6.1 Indicator config

A small object, default = F1.3, injected into the shared blocks:

```
{
  id: 'f13' | 'f41',
  apiBase: '/f13' | '/f41',        // prefix for dashboard/ranking endpoints
  moduleLabel: 'F1.3' | 'F4.1',
  targetRate: 90,                  // chart target line (both modules; PO kept 90 for F4.1)
  bands: [{...}],                  // heatmap/cell colours: F1.3 70/60/50, F4.1 80/70/60
  features: { route: true | false } // hides route capacity/links for F4.1
}
```

### 6.2 What T3 changes (Claude Code, Opus review)

Fetchers and mappers that hold `/f13/...` literals or F1.3 thresholds/labels (found by search): `api/F13DashboardClient.js`, `features/ranking/bcvhOverviewFetcher.js`, `bcvhWeeklyComparisonFetcher.js`, `features/dashboard/components/UnifiedBcvhAnalysisTable.jsx` and `unifiedBcvhAnalysisTableData.js`, the daily-trend adapters (`QualityDeliveryTrendlineAdapter`, `QualityVolumeComboTrendlineAdapter`), `comboTrendlineData.js` (`QUALITY_TARGET_RATE`), `f13HeatmapBandCatalog.js` (already accepts a `bands` override), `BcvhOperationTable.jsx`, plus every place the audit in T3 finds that hard-codes `70/60/50` or "F1.3". Rule: **behaviour with the default config must be identical**; the existing frontend suites are the proof.

Page assembly (T4, T5) is Antigravity's: new page files, F4.1 labels, route-free layout, responsive pass, Windows runtime evidence. They start after T3 and touch only new page files and the visual layer.

### 6.3 Routes and navigation (T6)

`/f41` redirects to `/f41/dashboard`; `/f41/dashboard` and `/f41/ranking/bcvh` allow admin and viewer. The flat `F4.1 Quality Management` nav item becomes a group with two sub-items (no Tuyến, no Evidence yet). `appNavigation.test.js` and `App.role-routing.test.js` are updated for the new shape.

## 7. Acceptance and reconciliation (G1, backend)

Against the live database, read-only, 2026-08-01:

1. Summary / KPI: `2.863 / 4.695 = 60,98%`.
2. Overview daily and Ranking for the 6 units: Σ = `2.862 / 4.694 = 60,97%`, per-unit rows equal the module plan Section 8 table (Thuận Hóa 68,41%, Hương Trà 52,99%, Phú Lộc 10,69%, Hương Thủy 68,17%, A Lưới 77,46%, Thuận An 88,79%).
3. Multi-day additivity: Σ per-day = range total (reuse the ITR check, `2026-08-01..2026-08-05` = `20.979`).
4. Weekly comparison: TỔNG CỘNG volume/passed = Σ six units; the in-progress week shows its real range.
5. National rank for 2026-08-01 recomputed independently from `fact_f41_national` equals the service value; `total = 34`.
6. `fact_f41` and `fact_f13` row counts unchanged before/after.
7. F1.3 regression: backend and frontend suites show no new failure against the recorded baseline (the four known backend failures stay the same set by name).

## 8. Validation levels

- T0: LEVEL 1 (docs + a 3-line service fix with its test).
- T1/T2: LEVEL 2 (new API contracts): node tests with `--experimental-sqlite`, full sweep compared by test name to the baseline, read-only real-DB script, `oxlint`.
- T3: LEVEL 3 (touches closed F1.3 frontend): full frontend suite, `vite build`, independent Opus review (T8).
- T4/T5: PO UI check (G2, G3), runtime evidence by Antigravity.
- Backend suite note: run with `node --experimental-sqlite --test`; root `test_*.js` files are not collected by the sweep and are run per file.

## 9. Risks specific to this design

| Risk | Control |
| --- | --- |
| Reused service silently assumes an F1.3-only column in a repository row | Per-method shape-parity tests; T1/T2 compare against the F1.3 service test fixtures |
| `routes: []` breaks a mapper that expects route data | T3 audit and tests with an empty route list |
| Backend restart interrupts the PO's running import | Claude Code announces and waits before any restart or heavy DB script (Proposal §6) |
| Hidden hard-coded `70/60/50` or "F1.3" string leaks into F4.1 | T3 search + a test that renders F4.1 config and asserts no F1.3 label/band |
| Two developers editing the same file | File boundary in Proposal §4; Antigravity starts after T3 |

## 10. Ticket order and owners

T0 (Claude Code Sonnet) → T1 ∥ T3 (Claude Code Sonnet) → T2 → T8 (Claude Code Opus review of T1–T3) → T4 → T5 (Antigravity) → T6 (Claude Code Sonnet). T7 data import: PO.

## 11. As built — T1/T2 backend and T3 frontend (v1.1, 2026-10-08, Claude Code / Sonnet 5.5)

Where the build differs from the plan above, this section is the record.

**Backend (T1 and T2 were delivered together because the F1.3 week/month/overview services are reused unchanged):**

- `FactF41Repository.js` (extended, existing methods untouched): `getBcvhOverviewMonthly/Daily/Mtd`, `getBcvhOverviewRoutes` (returns `[]`), `getBcvhWeeksList`, `getBcvhMonthsList`, `getBcvhWeeklyTrendAggregate`, `getBcvhWeeklyComparisonAggregate`, `getBcvhOperationMetricsBetween`, `getDailyTrendData`, `getLatestImportMeta`. Same row shape as the F1.3 twins; volume = `COUNT(*)`; GROUP BY always names the real column `ma_bc_phat`.
- `F41NationalRankService.js`: rank of Hue (`system_config.default_province_code`, default `53`) among `fact_f41_national` by `SUM(sl_ptc_8h_co_tms) / SUM(sl_ptc_nop_tien_ch)`, ties by volume then unit code; `getNationalRankSummary(from, to)` (with previous date / movement) and `getNationalRanksForDates(dates)`.
- `F41RankingService.js`: constructs the F1.3 `BcvhOverviewService` and `BcvhWeeklyComparisonService` with the F4.1 repository + rank service; implements `getSummary`, `getDailyTrend`, `getBcvhRanking` with the F1.3 field names (`sl_bg_ptc`, `dat_kpi_2026`, `kpi_2026`, `kpi_2026_dod/swc`, `month_to_date_*`, `comparisons.d1/d7`, `meta.total_row`, `meta.national_rank`, `meta.pagination`).
- `F41RankingController.js` + `f41Routes.js`: the nine endpoints of Section 4.3 (`/dashboard/summary` and `/dashboard/daily-trend` use `ma_bcvh`/`bcvh_id`/`bcvh`; `'all'` means no filter). Errors `MISSING_PARAM`, `INVALID_DATE`, `INVALID_RANGE`, `INVALID_BCVH`, `INVALID_WEEK_ID`, `WEEK_NOT_FOUND`, `INVALID_MONTH_ID`, `MONTH_NOT_FOUND` answer 400; everything else 500; all responses no-store.
- **Không đạt (PO 2026-10-08):** a row with a blank evaluation is in the denominator and counts as not passed, so every F4.1 dashboard / ranking / weekly / monthly `failed` is `volume - Đạt`, labelled "Không đạt"; the later Evidence module will split out "Chưa có đánh giá". `summary.total_blank` carries the blank count. The earlier `/dashboard/kpi` and `/dashboard/bcvh-reconciliation` endpoints keep the strict split. `ranking/bcvh` always returns rows in rank order (F1.3 ignores `sort/order`).

**Frontend (T3), differs from Section 6 in three ways:**

1. **No fetcher parameterisation.** Report blocks keep their `/f13/...` call sites; the shared axios client rewrites those URLs to the indicator on display (`rewriteIndicatorUrl`, F1.3 default = no-op, KPI maps to `/f41/dashboard/summary`). This leaves every F1.3 source-contract test untouched.
2. **Chart target stays a constant 90** (PO kept 90% for F4.1), so `targetRate` is not in the config.
3. **Labels** keep their F1.3 wording in source and go through `indicatorLabel()`, which swaps "F1.3" for the indicator's module label.

Files: `features/indicator/{activeIndicator.js, indicatorConfig.js, IndicatorContext.js}` (new), `api/client.js` (one interceptor line), `components/f13/f13HeatmapBandCatalog.js` (`buildHeatmapBands`, default bands follow the active indicator; the F1.3 literal bands are unchanged), `DashboardPage.jsx` (ranking link, operating-pattern and action-center blocks by feature flag, title), `BcvhRankingPage.jsx` (route/late-cash KPI cards and route capacity block by flag, tone floors), `UnifiedBcvhAnalysisTable.jsx` (late-cash and route column groups by flag), `unifiedBcvhAnalysisTableData.js` (KPI status floors), `BcvhRankingOverviewBlocks.jsx` (legend), `BcvhWeeklyComparisonBlock.jsx`, `BcvhOperationTable.jsx`, `bcvhOperationTableData.js` (labels). The F4.1 pages (T4/T5) are `<IndicatorProvider indicator={F41_INDICATOR}>` around `DashboardPage` / `BcvhRankingPage`; their visual pass belongs to Antigravity.

## 12. Round-2 change after the independent review (T8, 2026-10-08)

Review `docs/06_REVIEWS/Shared/F41-DASHBOARD-RANKING-01_REVIEW_001.md` returned FAIL on one blocker, **T8-F41-B1**: the module-level "active indicator" set during render could outlive a render that never commits (React Router wraps navigation in `startTransition`), leaving F1.3 pages on F4.1 URLs and 80/70/60 bands. Section 11 items 1-3 and the `activeIndicator.js` module are **superseded**:

- No module-level state remains (`activeIndicator.js` deleted). `IndicatorProvider` only carries a React context value (default F1.3) and mutates nothing.
- The page's indicator is handed explicitly: `useIndicator()` in components; `useIndicatorApi()` returns the shared client itself for F1.3 and a cached, immutable wrapper for F4.1 that rewrites the shared `/f13/...` report URLs (so call sites and their source-contract tests are unchanged); `classifyF13HeatmapRate(rate, bands)` takes bands again (default F1.3, no hidden default); `mapBcvhRankingResponse(..., { indicator })` carries the KPI status floors; `indicatorLabel(text, indicator)`, `buildMonthlyHeatmapLegend(indicator)`, `processBcvhOperationTableData(data, { indicator })` take the indicator. `api/client.js` is back to its original content.
- Recharts dot / tooltip components are rendered as elements, so they call `useIndicator()` themselves.
- Regression test: a provider render that is discarded (`renderToString`) leaves a provider-less page plain F1.3.

Non-blocking findings fixed in the same round: NB3 ranking compares the exact ratio; NB4 `summary` degrades to a null national rank; NB5 daily-trend / overview-monthly `failed` assertions and the parity fixture updated to the Không đạt decision; NB7 manifest status and repository comment corrected. NB1/NB2 (F1.3 wording in shared blocks, expanded-row analysis text) stay in the T4/T5 sweep; NB6 (`colSpan` base 18 vs 20 fixed cells) is pre-existing F1.3 behaviour and left as is.
