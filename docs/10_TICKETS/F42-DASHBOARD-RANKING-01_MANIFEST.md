# F42-DASHBOARD-RANKING-01 Manifest

Status: `BACKEND DONE / TECH PASS / WAITING FOR THE SCREENS (F42-DASHBOARD-UI-01) AND A BACKEND RESTART` (2026-10-26). Read APIs for the F4.2 (chất lượng phát giao bưu tá) Operation Dashboard and BCVH Ranking: the six BCVH, day / week / month, the postman table of each BCVH, national rank over 34 provinces, RBAC scope. No portal, no Import.

## 1. Ticket Information

- Ticket ID: `F42-DASHBOARD-RANKING-01`; parent `F42-MODULE-PLAN`; depends on `F42-PHASE-0-4` (tables, national rank service).
- Owner: backend `Claude Code (Sonnet 5.5)`; screens `Antigravity` (`F42-DASHBOARD-UI-01`, to be opened); independent review `Opus` before the PO UI check.
- Authorization: PO chat 2026-10-26 ("làm tiếp backend /api/f42").
- Branch `codex/da-impl-006`. Does not change Current Ticket.

## 2. Design of Record

- Metric (PD-F42-2): volume = every GBT row, passed = `danh_gia = 'Đạt'`, `failed = volume - passed` (blank ratings stay in the denominator and count as not passed, as F4.1); `total_blank` and the strict `strict_failed` ("Không đạt" as rated) are returned apart. Rate = passed / volume. Target 90 % (PD-F42-5) in `meta.target_rate`.
- Reuse, not copy: `F42RankingService extends F41RankingService` over `FactF42Repository` (generated from the F1.1 repository, rating column `danh_gia`, counting rule of F4.1) and `F42NationalRankService`; the shared `BcvhOverviewService` / `BcvhWeeklyComparisonService` run unchanged. Module total over every row; ranking, overview, weekly and monthly over the six canonical BCVH.
- Postman table (PD-F42-3): BCVH blocks -> only the postmen with volume in the period; each block total = the BCVH figure, grand total = the six-BCVH total; rank inside the BCVH (rate, then volume). Office-delivery ("lưu tại bưu cục") is not a separate block (PD-F42-4).
- Reads the detail table `fact_f42` directly (about 6 500 rows a day for Huế); no day-aggregate table (PERF-LOAD) yet: add it only if the screens prove slow.
- RBAC: module key `f42` (`requireModule('f42')`, `MODULES` of `resolveAccess`, admin user page indicator list): ADMIN and LEADER city-wide, STAFF with BCVH scope get the F4.2 of their BCVH, the F4.2 specialist (indicator `F4.2`) sees all, others 403. The BCVH sanitiser and `resolveBcvh` apply as for F1.1 / F4.1; the national ranking and the city total rows are city-wide only.

## 3. Changes Made

| File | Role |
| --- | --- |
| `backend/src/repositories/FactF42Repository.js` | read queries over `fact_f42` (KPI incl. `total_strict_failed`, meta, overview, weeks/months, weekly, per-BCVH metrics, daily trend) + `getPostmanGrid` |
| `backend/src/services/F42RankingService.js` | the F4.1 service over the F4.2 stack + `getPostmanTable`, `getDashboardMeta` (target, scope note), `getNationalRanking` |
| `backend/src/controllers/F42RankingController.js`, `backend/src/routes/f42Routes.js`, `backend/server.js` | `/api/f42` HTTP layer, 400 for bad parameters, no-store, scope sanitising |
| `backend/src/config/f42KpiScopeContract.js` | target 90, KPI scope note |
| `backend/src/middleware/accessScope.js`, `backend/src/services/auth/access/resolveAccess.js` (+ test), `backend/src/controllers/adminUserController.js` | RBAC module key `f42` / indicator `F4.2` |
| `backend/src/services/F42RankingService.test.js`, `backend/src/routes/f42Routes.scope.test.js` | 7 service tests (incl. the real 10/10 file), 4 route leak tests |

## 4. API (`/api/f42`, read-only, `{ success, data }`)

Same endpoints and shapes as `/api/f41` / `/api/f11`: `GET /dashboard/summary?from_date&to_date[&ma_bcvh]`, `/dashboard/daily-trend`, `/dashboard/meta` (adds `target_rate: 90`), `/dashboard/national-ranking` (city-wide only), `/ranking/bcvh` (+ `/overview`, `/weeks`, `/weekly-comparison`, `/window-comparison`, `/weekly-trend`, `/months`, `/monthly-comparison`). `ma_bcvh` is the delivery office code (533140 Thuận Hóa, 535470 Hương Trà, 536250 Hương Thủy, 537220 Phú Lộc, 537015 Thuận An, 535790 A Lưới). New:

| Endpoint | Notes |
| --- | --- |
| `GET /dashboard/postman-table?period=day\|week\|month&anchor_date` or `from_date&to_date`, optional `ma_bcvh` | `{ meta{period, from_date, to_date, days_with_data, has_data, postman_count, target_rate}, units[{ma_bcvh, ten_bcvh, volume, passed, failed, strict_failed, blank, rate, postman_count, postmen[{ma_buu_ta, ten_buu_ta, volume, passed, failed, strict_failed, blank, rate, rank}]}], total_row{label, volume, passed, failed, strict_failed, blank, rate} }`; the six blocks always present (empty ones with 0 / `rate: null`), postmen sorted by volume; week = Thursday-Wednesday, month = calendar month, as F1.1; a BCVH-mode user gets only their block and no `total_row` (a foreign `ma_bcvh` is 403) |

## 5. Validation

- `F42RankingService.test.js` 7/7: rate with blank ratings in the denominator, ranking of canonical BCVH only, postman table (blocks, totals, ranks, week/month/range/one BCVH/empty/invalid), meta, overview / weeks / months, controller scope pinning; **real 10/10 file**: 6 466 / 4 475 / 1 234 blank / 69,21 %, the six BCVH 94,55 / 63,29 / 71,11 / 65,82 / 85,18 / 67,28 % and 128 postmen exactly as the DKCL audit.
- `f42Routes.scope.test.js` 4/4: a BCVH user gets no other BCVH, no rank, no city total in any endpoint (cached copies included), only their postman block, 403 for a foreign BCVH and the national table, caches never mix; users without F4.2 are refused, the F4.2 specialist sees all.
- `resolveAccess.test.js`, `accessScope.test.js`, F1.1 / F1.2 / F1.3 / F4.1 route scope tests unchanged and green; backend sweep 709/717, 5 skipped, the same 3 known failures.
- Backend must be **restarted** for `/api/f42` to exist (not done: a backfill may be running; restart only when no run is active).

## 6. Open Items

- The screens (`F42-DASHBOARD-UI-01`, Antigravity): `F42_INDICATOR` in `indicatorConfig.js` (target 90, own light colour family), menu, Dashboard, BCVH Ranking, postman table per BCVH, `report_block_ui_standard.md` functions; the admin user page needs F4.2 in its indicator choices.
- Home page cards (`HomeExecutiveService`) do not include F4.2 yet.
- Evidence (violation stages) is out of scope.

## 7. Next

1. Restart the backend when idle; check `/api/f42/dashboard/meta` with a signed-in session.
2. `F42-DASHBOARD-UI-01` (Antigravity) after the PO confirms; Opus review; PO UI check.
