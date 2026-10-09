# UI-DELTA-WORDING-01 — MANIFEST

**Status:** IMPLEMENTED / READY FOR PO UI CHECK (2026-10-09). Executor: Claude Code (Sonnet 5.5). Frontend only, no backend, SSOT or data change.

## 1. Product Owner request (chat, 2026-10-09)

In the comparison tables and charts, rate movements were written as "2,6 điểm %". The PO does not want the word "điểm" in the middle ("nhìn nó AI quá"). Remove it everywhere.

## 2. Change

Every rate-movement text now ends with a plain `%`: `+2,6%`, `-0,5%`, `0,0%` (decimals unchanged per place: 1 in the weekly/monthly comparison and BCVH operation table, 2 in the ranking table, trendline and trend workspace). Applies to F1.3 and F4.1 alike because the blocks are shared.

Files (source): `bcvhOperationTableData.js` (`formatDeltaRate`), `comboTrendlineData.js` (`formatVariance`), `bcvhWeeklyComparisonData.js` (`formatSignedRateDelta`), `unifiedBcvhAnalysisTableData.js` (`formatSignedDelta` attaches `%` without a space; analysis text), `UnifiedBcvhAnalysisTable.jsx`, `BcvhRankingPage.jsx`, `IntegratedTrendRiskWorkspace.jsx`, `SamePeriodComparisonTrendlineAdapter.jsx`. The tests that pinned the old wording were updated to the new text (`bcvhOperationTableData`, `comboTrendlineData`, `samePeriodComparisonData`, `unifiedBcvhAnalysisTableData`, `bcvhWeeklyComparisonData`, `f41Pages`); no assertion about behaviour changed.

Not changed: other uses of the word "điểm" (service points, map labels, "Màu điểm KPI"), historical design/review documents under `docs/`, backend.

## 3. Validation (LEVEL 1)

`node --test $(find src -name "*.test.js")` 600/601 (only the pre-existing `dataImportBackfillQueue.test.js` failure), `vite build` clean, `oxlint` 0 errors, `grep "điểm %"` in `frontend/src` = 0.

## 4. PO UI checklist

Operation Dashboard (BCVH table "so với ngày trước / cùng kỳ", trend workspace, same-period chart) and BCVH Ranking (weekly/monthly comparison table, ranking table, KPI card) for both `/f13/...` and `/f41/...`: a movement reads `+2,6%` / `-0,5%`, with no "điểm".
