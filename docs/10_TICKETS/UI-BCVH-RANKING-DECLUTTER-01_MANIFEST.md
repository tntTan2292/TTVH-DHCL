# UI-BCVH-RANKING-DECLUTTER-01 — MANIFEST

**Status:** IMPLEMENTED / PO UI PASS / CLOSED (2026-10-08).
**Executor:** Claude Code (Sonnet 5.5) -- mostly code removal, tests and docs; no new visual design. Follows the closed F13-BCVH-WEEKLY-TREND-01 and F13-BCVH-MONTHLY-COMPARISON-01 (neither reopened).

## 1. Product Owner request and decision (chat, 2026-10-07)

After standardising the BCVH Ranking tables and charts, PO asked to review which blocks are redundant: (1) the monthly heatmap per BCVH, (2) "Chất lượng tổng quan MTD". Assessment accepted by PO:

- "Chất lượng tổng quan MTD" is fully redundant: volume / passed / rate / TỔNG CỘNG / rank and the change vs same period of the previous month are all available in the weekly-monthly comparison table (Tháng mode + "So sánh cùng kỳ tháng trước") and in the Operation Dashboard LŨY KẾ THÁNG group. -> removed.
- The monthly heatmap still shows what nothing else does at a glance (6 BCVH x months matrix, per-month data coverage such as "24/26 ngày"). -> kept, collapsed by default.

## 2. Implementation (frontend only, backend untouched)

- `frontend/src/features/ranking/BcvhRankingPage.jsx`: `BcvhMtdSummaryBlock` import and usage removed.
- `frontend/src/features/ranking/BcvhRankingOverviewBlocks.jsx`: `BcvhMtdSummaryBlock` and its private helpers (`formatSignedDeltaStr`, `formatSignedVolumeStr`) removed; the "Chi tiết số liệu theo tháng" heatmap (inside `BcvhMonthlyTrendBlock`) is wrapped in a native `<details>` (closed by default, summary "Xem ma trận 6 BCVH × tháng (heatmap)"); table, legend and shared heatmap SSOT classes unchanged.
- `frontend/src/features/ranking/bcvhOverviewData.js`: MTD-only processing (`mtdRows`, `mtdTotalRow`) removed from `processOverviewData`; the raw `mtd` input is still read (used to build the BCVH name map). `/f13/ranking/bcvh/overview` still returns `mtd` -- it feeds the Operation Dashboard table.
- Tests updated: `bcvhOverviewData.test.js` (MTD assertions replaced by "block removed" and "heatmap collapsed" assertions), `BcvhRankingOverviewBlocks.heatmapBand.test.js` (palette check now looks at `...BCVH_COLORS`).

## 3. Validation

Frontend ranking + dashboard component suites 228/228, vite build clean, oxlint 0 errors on touched files. No browser check by the executor (PO checks the UI).

## 4. PO UI checklist

BCVH Ranking no longer shows "Chất lượng tổng quan MTD"; under the monthly column chart, the heatmap is a collapsed row "Xem ma trận 6 BCVH × tháng (heatmap)" that opens to the same table and legend; the rest of the page (weekly table/chart, monthly chart, ranking table, route capacity block) is unchanged.

## 5. Scope extension (PO, 2026-10-08) — national rank on the new tables and charts, before closing this ticket

PO asked that the newly reworked BCVH Ranking tables/charts carry the national rank like the Operation Dashboard daily table, especially the "BẢNG TỔNG HỢP SO SÁNH CHẤT LƯỢNG F1.3 THEO TUẦN TẠI CÁC BCVH" whose title cards must show "VỊ THỨ TOÀN QUỐC: x/34" (read as the rank ratio shown on the dashboard header, e.g. 21/34).

- Source/rule: unchanged, `F13DashboardService.getNationalRankSummary(from, to)` -- Huế's rank among the provinces of `fact_f13_national` by PTC/nộp tiền đúng QĐ rate over the exact date range of the period (same as the dashboard "VỊ THỨ TOÀN QUỐC"). Rank is for Huế as a whole, so charts show it for the "Tổng cộng 6 BCVH" view only, never for a single BCVH.
- Backend (additive, read-only): `BcvhWeeklyComparisonService` takes the dashboard service; `compareWeeks` / `compareMonths` return `meta.national_rank = { current, compare }` (month "cùng kỳ" uses the cut ranges); `trendWeeks` returns `national_rank` per week; `bcvhOverviewService` returns `meta.national_rank.monthly` (`{ 'YYYY-MM': { rank, total } }`, anchor month = month-to-date). A failing/missing national query yields `null` (UI shows a dash), never an error. Controller wires `f13DashboardService` into the comparison service.
- Frontend: weekly/monthly comparison table: both period header cards (kỳ này / so sánh) get a "VỊ THỨ TOÀN QUỐC: x/34" line; weekly trend chart header shows the anchor-week rank and its tooltip shows the rank per week; monthly trend chart shows the current-month rank chip and a per-month tooltip rank (both only in the Tổng cộng view). Helpers `formatNationalRank` / `formatNationalRankLabel`.
- Tests/validation: backend `bcvhWeeklyComparisonService.test.js` 25/25 and `bcvhOverviewService.test.js` (two national-rank assertions updated to the new monthly calls) + overview repository test -> 37/37 together; frontend ranking + dashboard suites 230/230; vite build clean; oxlint 0 errors. Live DB read-only: week W40 = 21/34 (matches the Operation Dashboard month-to-date rank), W39 = 25/34; month cùng kỳ 01-07/10 = 21/34 vs 01-07/09 = 23/34; weekly trend 40 weeks all ranked, about 3 s. A use-before-declare slip in `BcvhMonthlyTrendBlock` found during self-review was fixed before reporting.
- Files: backend `bcvhWeeklyComparisonService.js` (+ test), `bcvhOverviewService.js` (+ test), `DashboardController.js`; frontend `BcvhWeeklyComparisonBlock.jsx`, `BcvhWeeklyTrendBlock.jsx`, `BcvhWeeklyComboTrendChart.jsx`, `BcvhMonthlyComboTrendChart.jsx`, `BcvhRankingOverviewBlocks.jsx`, `bcvhWeeklyComparisonData.js`, `bcvhOverviewData.js`, `bcvhMonthlyComparison.test.js`.
- PO UI checklist addition: the two header cards of the comparison table (Tuần and Tháng mode) show the national rank; weekly and monthly chart headers/tooltips show it in the Tổng cộng view; a period without national data shows "—". Backend restart needed for the new fields.

### 5.1 Audit of both modules and further additions (PO, 2026-10-08)

PO asked to make sure the national rank (VỊ THỨ TOÀN QUỐC x/34) appears on every table/chart of Operation Dashboard and BCVH Ranking that shows the Tổng cộng 6 BCVH view. Rule used: show it wherever the figure is Huế as a whole over a defined period; never on a single BCVH row/series (national rank exists only for Huế); not applicable to pure distributions.

| Module | Table / chart | National rank |
| --- | --- | --- |
| Operation Dashboard | KPI card "Xếp hạng toàn quốc" | already present |
| Operation Dashboard | BCVH daily table (LŨY KẾ THÁNG / ĐIỀU HÀNH NGÀY headers) | already present |
| Operation Dashboard | Day-in-month trend chart (30 / 7 days, Tổng cộng): range rank label in header + per-day tooltip | already present |
| Operation Dashboard | Operating pattern "Theo tháng" and "Heatmap" tabs | already present |
| Operation Dashboard | "Theo thứ" tab, by-BCVH trend mode | not applicable (weekday aggregate / single BCVH) |
| BCVH Ranking | Weekly/monthly comparison table header cards (Tuần and Tháng mode) | added (Section 5) |
| BCVH Ranking | Weekly trend chart (Tổng cộng): anchor-week rank in header + per-week tooltip | added (Section 5) |
| BCVH Ranking | Monthly trend chart (Tổng cộng): current-month chip + per-month tooltip | added (Section 5) |
| BCVH Ranking | Monthly heatmap (collapsed): new bottom row "Vị thứ toàn quốc" with the rank of every month | added |
| BCVH Ranking | Route capacity block (MTD): header "VỊ THỨ TOÀN QUỐC (MTD)" | added |
| BCVH Ranking | Single-day ranking table (UnifiedBcvhAnalysisTable): header strip shows the rank for the selected range | added |
| BCVH Ranking | "Chất lượng F1.3" KPI card: signal line also shows "Vị thứ toàn quốc x/34" | added |

Backend: `F13DashboardService.getBcvhRanking` returns `meta.national_rank` (`{ rank, total }` or null, cost about 2 ms; shared by the two pages that use `/f13/ranking/bcvh`). Earlier guard test `dashboardLoadPerformance.test.js` ("nationwide rank is not added to BCVH row ranking surfaces") was narrowed on purpose to still forbid any per-row/per-BCVH rank while allowing the table-level Huế rank. Validation: frontend ranking + dashboard suites 230/230, backend 37/37 and the two `getBcvhRanking` suites 32/32, vite build clean, oxlint 0 errors. Live DB: rank for 07/10/2026 = 23/34.

## 6. Closure (2026-10-08)

Product Owner checked the UI (MTD block removed, heatmap collapsed, national rank on the BCVH Ranking tables/charts and the Operation Dashboard audit, Sections 5-5.1) and confirmed OK. Claude Code re-ran validation before closing: frontend ranking + dashboard component suites 230/230, backend overview / weekly-comparison / overview-repository / `getBcvhRanking` suites 69/69, vite build clean.

Note on two files: `BcvhWeeklyComboTrendChart.jsx` and `BcvhWeeklyTrendBlock.jsx` also contain a small Antigravity polish made after F13-BCVH-WEEKLY-TREND-01 was closed (unit small-multiples cards: "Tuần gần nhất" rate chip, "BCVH " name prefix, heatmap-colour rate chip). It was reviewed together with this ticket's national-rank edits (tests green) and is committed with them; it is not part of this ticket's scope.

Accepted commits (all on `codex/da-impl-006`): backend national rank; BCVH Ranking UI (MTD removal, collapsed heatmap, rank on table/charts/KPI); ranking-table header rank and guard-test narrowing; docs. Final state: IMPLEMENTED / PO UI PASS / CLOSED. No further work is authorized under this ticket; any later change needs a new ticket or explicit reopening.
