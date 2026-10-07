# F13-BCVH-WEEKLY-TREND-01 — MANIFEST

**Status:** IMPLEMENTED / PO UI PASS / CLOSED (2026-10-07).
**Executor:** Claude Code (Sonnet 5.5). Follows the closed F13-BCVH-MONTHLY-COMPARISON-01 and F13-BCVH-WEEKLY-COMPARISON-01 (neither reopened).

## 1. Product Owner request (chat, 2026-10-07)

1. Remove the BCVH Ranking block "Diễn biến theo ngày (Ngày 01 đến N-1)".
2. Replace it with a weekly-comparison chart that can be zoomed like the earlier charts (UI-CHART-DATA-LABELS-01 zoom).
3. Place it directly below the weekly comparison table; it is affected only by the "Điều chỉnh mốc tuần hiện tại" filter, and gets its own "view by unit" filter.

## 2. Implementation

- Removed: `BcvhDailyTrendBlock` (component, page usage). The overview `dailyChartData` processing is left untouched (still unit-tested, now unused by the page).
- Backend (read-only, no schema/index change): `FactBuuGuiRepository.getBcvhWeeklyTrendAggregate`, `BcvhWeeklyComparisonService.trendWeeks(anchorWeekId, {limit=52})`, `GET /f13/ranking/bcvh/weekly-trend?week=<YYYY-Www>[&limit]`. Returns every real week up to and including the anchor week (newest `limit`, default 52, max 104), oldest first, per-BCVH volume/passed/rate plus a summed total (rate = summed passed / summed volume, never averaged). In-progress anchor week is cut to its last real data date. Errors `MISSING_PARAM`, `INVALID_WEEK_ID`, `WEEK_NOT_FOUND` (400).
- Frontend: new `BcvhWeeklyTrendBlock.jsx` rendered by `BcvhWeeklyComparisonBlock.jsx` directly under the table card and fed only by `selection.current` (anchor / "Tuần kỳ này"); it ignores the compare week, the month mode and the page's global filters. Unit filter "Xem theo đơn vị": Tất cả 6 BCVH (default, legend chips), one BCVH, or Tổng cộng 6 BCVH. `BcvhMultiSeriesTrendChart.jsx` gained optional `codes`, `colorMap`, `periodKind`, `showLegendChips` (defaults keep the monthly chart unchanged) and reuses `ChartZoomFrame` (wheel zoom, drag pan, double-click reset) and the shared data-label logic. New helpers `buildWeeklyTrendChartData`, `createWeeklyTrendFetcher`.

## 3. Validation

Backend `bcvhWeeklyComparisonService.test.js` 22/22; frontend ranking + dashboard component suites 222/222 (daily-block assertions in `bcvhOverviewData.test.js` replaced by "block removed" assertions); vite build clean; oxlint 0 errors on touched files. Live DB read-only: anchor 2026-W40 returns 40 weeks in ~2.5 s; W40 total 21,249 matches the Operation Dashboard month-to-date total; an older anchor (W38) returns 38 weeks ending at W38.

## 4. PO UI checklist

Daily block is gone; the weekly trend chart sits right under the weekly comparison table; changing "Điều chỉnh mốc tuần hiện tại" (or "Tuần kỳ này") changes the last week of the chart, changing the compare week or Tuần/Tháng mode does not; wheel zoom / drag / double-click work; unit filter shows one BCVH or the total. Backend must be restarted to pick up the new route.

## 5. UI amendment (Antigravity) — column chart instead of lines

PO reviewed the first version (6 overlapping rate lines, unreadable) and asked for a column chart like the Operation Dashboard day-in-month chart. Antigravity (UI/UX owner) replaced the line chart with a combo chart: new `frontend/src/features/ranking/BcvhWeeklyComboTrendChart.jsx` (volume columns + rate line, data labels, 90% target line, horizontal pan slider), wired in `BcvhWeeklyTrendBlock.jsx` (default view "Tổng cộng 6 BCVH"; unit filter "Xem theo đơn vị" kept). Backend/API unchanged.

Shared-component impact to remember: `frontend/src/features/dashboard/components/ChartZoomFrame.jsx` gained an optional `plotMargins` prop, passes `setWindow` to its children, and its wheel-zoom anchor is now clamped to the plot area with edge snapping (cursor in the outer 12% pins the zoom to that end). This applies to every chart that uses ChartZoomFrame, not only the weekly chart. `BcvhMultiSeriesTrendChart.jsx` keeps the optional `codes` / `colorMap` / `periodKind` / `showLegendChips` props added in the first version (defaults leave the monthly trend chart unchanged); the weekly block no longer uses them.

## 6. File map

| Layer | File | Change |
| --- | --- | --- |
| Backend | `backend/src/repositories/FactBuuGuiRepository.js`, `backend/src/services/bcvhWeeklyComparisonService.js` (+ test), `backend/src/controllers/DashboardController.js`, `backend/src/routes/f13Routes.js` | weekly-trend query, `trendWeeks`, `GET /f13/ranking/bcvh/weekly-trend` |
| Frontend | `frontend/src/features/ranking/BcvhWeeklyTrendBlock.jsx`, `BcvhWeeklyComboTrendChart.jsx` (new), `BcvhWeeklyComparisonBlock.jsx`, `BcvhRankingPage.jsx`, `BcvhRankingOverviewBlocks.jsx`, `BcvhMultiSeriesTrendChart.jsx`, `bcvhWeeklyComparisonData.js`, `bcvhWeeklyComparisonFetcher.js` | daily block removed, weekly combo chart under the weekly table |
| Shared | `frontend/src/features/dashboard/components/ChartZoomFrame.jsx` | zoom anchoring (see Section 5) |
| Tests | `frontend/src/features/ranking/bcvhMonthlyComparison.test.js`, `bcvhOverviewData.test.js` | weekly trend + daily-block-removed assertions |

## 7. Closure (2026-10-07)

Final validation by Claude Code after Antigravity's change: frontend ranking + dashboard component suites 223/223, backend `bcvhWeeklyComparisonService.test.js` 22/22, vite build clean, oxlint 0 errors on touched files. Product Owner personally checked the UI and confirmed PO UI PASS. Final state: IMPLEMENTED / PO UI PASS / CLOSED. No further work is authorized under this ticket; any later change needs a new ticket or explicit reopening.
