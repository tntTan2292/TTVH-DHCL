# F42-POSTMAN-API-01 Manifest

Status: `DONE / PO PASS` (2026-10-27, with F42-DASHBOARD-UI-01). Backend phase C plus the Home card; the backend was restarted and the endpoint answers.

## 1. Ticket Information

- Ticket ID: `F42-POSTMAN-API-01`; parent `F42-DASHBOARD-UI-01`; builds on `F42-DASHBOARD-RANKING-01` (Section 4 API).
- Executor: backend `Claude Code (Sonnet 5.5)`; screen by `Antigravity` in phase D; independent review `Opus` with the phase D review.
- Authorization: PO chat 2026-10-27 (plan approved).

## 2. Changes Made

| File | Role |
| --- | --- |
| `backend/src/repositories/FactF42Repository.js` | `getPostmanDaily(from, to, officeCodes, postman)`: one postman, per data day and delivery office, same counting rules as the postman grid |
| `backend/src/services/F42RankingService.js` | `getPostmanTrend({ maBuuTa, fromDate, toDate, bcvhId })` |
| `backend/src/controllers/F42RankingController.js`, `backend/src/routes/f42Routes.js` | `GET /api/f42/dashboard/postman-trend` |
| `backend/src/services/F42RankingService.test.js`, `backend/src/routes/f42Routes.scope.test.js` | service test, scope test |

## 3. API

`GET /api/f42/dashboard/postman-trend?ma_buu_ta=<code>&from_date=YYYY-MM-DD&to_date=YYYY-MM-DD[&ma_bcvh]` -> `{ success, data: { meta{ma_buu_ta, ten_buu_ta, from_date, to_date, days_with_data, has_data, target_rate}, offices[{ma_bcvh, ten_bcvh, volume}], days[{date, data_available, volume, passed, failed, strict_failed, blank, rate}], total_row{label, volume, passed, failed, strict_failed, blank, rate} } }`.

- Every day of the range is listed; a day without parcels has `data_available: false` and `rate: null` (the chart shows a gap). Range at most 93 days (`INVALID_RANGE` 400), `ma_buu_ta` required (400), bad dates 400.
- Metric as everywhere in F4.2: rate = Đạt / every GBT row, unrated rows count as not passed. `total_row` equals the postman's line of the postman table over the same days (tested).
- **RBAC:** same module `f42` as the other routes. A BCVH-mode user is pinned to their BCVH by `resolveBcvh` (a foreign `ma_bcvh` is 403); the postman is searched only inside that BCVH, so a postman of another BCVH comes back empty (`has_data: false`, no office, no name). `total_row` here is the postman's own total in scope, not a city total.

## 4. Validation

- `F42RankingService.test.js` 8/8 (new: trend days and gaps, totals = postman table, scope, input checks); `f42Routes.scope.test.js` 7/7 (new: own postman, foreign postman empty, foreign BCVH 403, missing parameter 400); `F41RankingService.test.js` 11, `F42NationalRankService.test.js` 3, `test_f42ImportPipeline.js` 6, `test_f42PortalAdapter.js` 30 unchanged and green (`node --experimental-sqlite --test` per file).
- Backend restart needed before the endpoint answers (restarting pauses a running backfill; restart only when the PO agrees).

## 5. Home card (done 2026-10-27, after the access work landed)

The F4.2 card is the fifth indicator of `GET /api/home/executive` and of `/api/home/national-ranking` (`HomeExecutiveService.js`: target 90, six-BCVH list, rank over the 34 provinces; `HomeExecutiveService.test.js` 27/27; read against live data: day 84.7 %, rank 5/34, week 76.9 %, rank 29/34). It appears only after a backend restart. The screen side (fifth card layout) is phase D for Antigravity (`F42-DASHBOARD-UI-01_PHASE_D_ANTIGRAVITY_PROMPT.md`).
