# F13-BCVH-MONTHLY-COMPARISON-01 — MANIFEST

**Status:** IMPLEMENTED / TECH PASS / READY FOR PO UI CHECK (2026-10-05, amended 2026-10-07). No PO UI PASS claimed.
**Scope:** two screens -- (A) BCVH Ranking comparison block (Section 1-4), (B) Operation Dashboard BCVH table (Sections 5-6).
**Executor:** Claude Code (Sonnet 5.5). Extends the closed F13-BCVH-WEEKLY-COMPARISON-01; does not reopen it.

## 1. Product Owner decisions (chat, 2026-10-05)

1. Month mode lives inside the existing independent filter panel of the weekly comparison table (no new table); the "days with data differ" warning behaves like the weekly one.
2. A "So sánh cùng kỳ" tick lets the user compare the same first-N days of both months (N = the shorter real data span) or the full months; when the months differ in data days a warning with a suggestion to tick it is shown.
3. Months are calendar (dương lịch) months.
4. The comparison block moves to the very top of the BCVH Ranking page (above the global filter bar) as the operations focal table.

## 2. Implementation

- Backend: `FactBuuGuiRepository.getBcvhMonthsList`; `BcvhWeeklyComparisonService.listMonths/compareMonths` (shared `_buildComparison` also used by weeks, behaviour unchanged); `GET /f13/ranking/bcvh/months` and `GET /f13/ranking/bcvh/monthly-comparison?month&compare_month&same_period`. Errors: `MISSING_PARAM`, `INVALID_MONTH_ID`, `MONTH_NOT_FOUND` (400). No schema/index change; read-only. TỔNG CỘNG is summed volume, never averaged rates.
- Frontend: `BcvhWeeklyComparisonBlock.jsx` gains a Tuần|Tháng switch (default Tuần), month selects, the cùng kỳ checkbox, month headers/title; `bcvhWeeklyComparisonFetcher.js` and `bcvhWeeklyComparisonData.js` gain month fetchers/helpers; block moved first in `BcvhRankingPage.jsx`. Filter title is now "Bộ lọc so sánh tuần/tháng độc lập".

## 3. Validation

Backend `bcvhWeeklyComparisonService.test.js` + `FactBuuGuiRepository.weeklyComparison.test.js` 21/21; frontend ranking suite 66/66; vite build clean; oxlint 0 errors on touched files. Live DB read-only check: months 2026-08/09/10 list correctly, October in progress to 02/10; same_period cuts both to 01–02.

## 4. PO UI checklist

Switch to Tháng; pick months; tick/untick cùng kỳ (header ranges change to the cut range); amber warning + suggestion appears when data days differ; block is at the top of the page; weekly mode unchanged. Backend must be restarted to pick up the new routes.

## 5. Amendment 2026-10-07 — Operation Dashboard BCVH table

PO asked for the same cùng kỳ choice on the Operation Dashboard BCVH table (`components/f13/BcvhOperationTable.jsx`), authorizing a change to its previously locked 10-column layout:

- Toggle "So sánh cùng kỳ | So sánh cả tháng trước" switches what the LŨY KẾ THÁNG delta column compares against (first N days of the previous month vs the whole previous month); header text follows.
- Checkbox "Hiện số tháng trước" adds two columns (previous-month Sản lượng and Tỷ lệ đạt), making the table 12 columns; unticked (default) it is the unchanged locked 10-column layout.
- Backend: `_getBcvhOverviewAggregate('mtd')` adds `previous_full_agg`; `bcvhOverviewService` exposes `mtd[].previous_full_month {volume, passed, rate}`. Additive; `previous_month_to_date` unchanged. No schema/index change.
- Data: `processBcvhOperationTableData(data, { prevMonthMode })`; missing backend field yields dash, never a fabricated zero.
- Validation: dashboard + ranking frontend suites 219/219 (the 10-column layout test now targets the default colgroup branch), backend bcvhOverviewService + overview repository 12/12, vite build clean; live DB read-only: 533140 MTD 11,351 vs same-period 7,411 vs full previous month 52,360.

## 6. Amendment 2026-10-07 (b) — controls outside the capture block, button on BCVH Ranking

- Operation Dashboard: the cùng kỳ / cả tháng trước toggle and the "Hiện số tháng trước" checkbox now live in their own panel ("Tùy chọn so sánh tháng trước", class `bcvh-operation-controls`) ABOVE the report card, so the report card (2-line title + table) contains no function buttons and can be screenshotted for operations reporting. Only the existing mobile-only (`lg:hidden`) "Chế độ cuộn chi tiết" button remains inside the card.
- BCVH Ranking month mode also has a one-click preset "So sánh cùng kỳ tháng trước" (selects the calendar month before the current one and ticks cùng kỳ; `previousMonthId` helper).

## 7. File map (what changed where)

| Screen | File | Change |
| --- | --- | --- |
| Backend (shared) | `backend/src/repositories/FactBuuGuiRepository.js` | `getBcvhMonthsList` (new); `previous_full_agg` in the `mtd` overview query (new) |
| BCVH Ranking | `backend/src/services/bcvhWeeklyComparisonService.js` (+ `.test.js`) | `listMonths`, `compareMonths` (+ `same_period`), shared `_buildComparison` |
| BCVH Ranking | `backend/src/controllers/DashboardController.js`, `backend/src/routes/f13Routes.js` | `GET /f13/ranking/bcvh/months`, `GET /f13/ranking/bcvh/monthly-comparison` |
| Operation Dashboard | `backend/src/services/bcvhOverviewService.js` | `mtd[].previous_full_month` |
| BCVH Ranking | `frontend/src/features/ranking/BcvhWeeklyComparisonBlock.jsx`, `bcvhWeeklyComparisonData.js`, `bcvhWeeklyComparisonFetcher.js`, `BcvhRankingPage.jsx` | Tuần/Tháng switch, cùng kỳ tick + preset button, block moved to top of page |
| BCVH Ranking | `frontend/src/features/ranking/bcvhWeeklyComparisonBlock.test.js`, `bcvhMonthlyComparison.test.js` | tests |
| Operation Dashboard | `frontend/src/components/f13/BcvhOperationTable.jsx`, `frontend/src/features/dashboard/components/bcvhOperationTableData.js` (+ `.test.js`) | toggle, optional 12-column layout, controls panel outside the report card |

Final validation (2026-10-07): frontend dashboard + ranking suites green (dashboard 152/152, ranking 67/67), backend `bcvhWeeklyComparisonService` / `bcvhOverviewService` / overview repository tests green, vite build clean, oxlint 0 errors on touched files. PO UI check still pending on both screens.
