# F13-JOURNEY-ROUTE-02 Manifest

## 1. Ticket Information

- Ticket ID: `F13-JOURNEY-ROUTE-02`
- Name: `F1.3 Hành trình bưu gửi: "Hành trình theo tuyến phát" rebuilt - Ngày / Tuần / Tháng, by BCVH, failed vs passed hours per stage`
- Programme: F1.3 Chuyên đề. Predecessor `F13-V2-JOURNEY-01` (page `/f13/v2/hanh-trinh`, day only).
- Owner: Claude Code / Opus 5.5 (scope, reviews, real render). **B1 backend: Claude Code / Sonnet 5.5. U1 screen: Antigravity.** Does not change the Current Ticket of `PROJECT_SNAPSHOT.md`.
- Branch: `codex/da-impl-006`.
- **Status: `READY FOR SONNET (B1)`** (F13-WHY-DATA-03 committed and accepted, 2026-11-07). `PO UI Check Required = Yes`.

## 2. The problem (PO, 2026-11-07)

Today the table is one day only, one row per route, and the hours are medians over **every** parcel (Đạt included): the user cannot see where the failed parcels lose their time, there is no target, no cause, and the Phát tại quầy routes sit among the postman routes. PO: "không smart".

## 3. PO decisions (2026-11-07, in chat)

| ID | Decision |
|---|---|
| J1 | Ngày / Tuần / Tháng, following the common period filter like the other F1.3 v2 pages. |
| J2 | Grouped by BCVH; inside a BCVH the routes are ordered by the parcels short of the 90 % target (the route pulling the rate down most first). |
| J3 | Per route: volume, rate (90 % target, F1.3 blue family), Không đạt, then the hours of each stage for **Không đạt parcels beside Đạt parcels** (TMS -> đến BCVH, đến -> giao bưu tá, giao bưu tá -> phát, total); the stage with the largest gap is marked; main cause from Phân tích nguyên nhân. |
| J4 | Two separate groups at the bottom of each BCVH, not ranked with the postman routes: **"Phát tại quầy (khách đến nhận)"** (route_scope NON_POSTMAN) and **"Tuyến chưa xác định"** (OTHER). |
| J5 | The column title **"Bưu tá"** is kept on every route, Phát tại quầy included (PO: do not rename it). |
| J6 | Clicking a route still opens its parcel list, now for the chosen period. |

Already done the same day (Claude Code / Opus, commit of this manifest): the same two groups and labels on Phân tích nguyên nhân (`F13V2WhyRouteTable.jsx`, backend label in `CauseAggQueryService.js`, live after the next backend restart; the screen already uses its own labels).

## 4. B1 backend (Sonnet) - technical scope

- `/api/f13/v2/journey/routes` and `/journey/parcels` accept the period like the other v2 endpoints (`from`/`to`, `week`, `month` through `periodResolve`); `date` keeps working (= from = to). Scope rules unchanged.
- Per route row, in addition to today's fields: `route_scope` (POSTMAN / NON_POSTMAN / OTHER, same rule as the cause table), `own_shortfall` (same definition as `/why`), `main_cause` and the cause mix of its failed parcels (read from the cause layer, same WHERE as `/why`, so the numbers match), `legs_failed` and `legs_passed` (medians, same legs as today), `slowest_leg` = the leg among `tms_arrive`, `arrive_gbt`, `gbt_ptc` with the largest `legs_failed - legs_passed` (null when not computable). Keep `legs` (all parcels) for compatibility.
- Performance: measure a month for all BCVH on a copy. If the day-by-day build is too slow for a month (target: under 10 s cold, cached afterwards with the existing `cachedRead`), report the figures and propose storing the leg hours in the cause table; do not change the cause table in this phase without the Opus review.
- Tests: period resolution, split medians on a seeded day, `route_scope` groups, `own_shortfall` and cause mix equal to `/why` for the same filter, scope (a BCVH account sees its own unit only).
- Files: B1 owns `JourneyService.js`, the journey handlers of `F13V2Controller.js` and their lines in `f13v2Routes.js`. It reads the cause layer through the existing public methods of `CauseAggQueryService` and does **not** edit `CauseAggQueryService.js` (F13-WHY-NARRATIVE-02 changes it at the same time), nor `CauseClassifier.js` / `f13CauseConfig.js`.
- Restrictions: official F1.3 data, cause rules and the cause table unchanged; no build on the live database; backend restart only by Opus after review. Commit by pathspec only (never `User QIS.xlsx`, `.claude/skills/`, `graphify-out/`, `.graphifyignore`). Backend suites with `--experimental-sqlite`, one file at a time.

## 5. U1 screen (Antigravity) - after B1 is accepted

Required Reading: this manifest sections 3-5; `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md`. Implements J1-J6 in `F13V2JourneyPage.jsx` / `F13V2JourneyRouteTable.jsx` / `F13V2JourneyParcelTable.jsx` with the common F1.3 period filter; camera, click-to-order titles, 90 % target and blue family, undefined-identifier check. No browser, no dev server, no login (Opus does the real render).

## 6. Change log

- 2026-11-07: created by Claude Code / Opus 5.5 after the PO decisions J1-J6; the two route groups on Phân tích nguyên nhân done in the same commit.

## 7. B1 Technical Execution Report (Sonnet 5.5, 2026-11-07) - READY FOR OPUS REVIEW

**What was built.** New `services/f13v2/JourneyPeriodService.js` (+ `JourneyPeriodService.test.js`); `F13V2Controller.js` journey handlers call it (`f13v2Routes.js` unchanged: same paths, `cachedRead` already covers `/journey/`). `JourneyService.js`, `CauseAggQueryService.js`, `CauseClassifier.js`, `f13CauseConfig.js` **not edited** (JourneyService.js is a classifier version file: leaving it alone adds no second "all days stale" on top of F13-WHY-DATA-03).
- Period: `date` (= from = to) still works; else `from`+`to` / `week` / `month` through `CauseAggQueryService.resolvePeriod`; one selector only. Technical guard: max 93 days (`RANGE_TOO_LONG`), my choice, one constant.
- Per route row, added to today's fields: `route_scope`, `key`, `own_shortfall` (+`_x10`, `shortfall`; `metricsOf` of the cause service), `main_cause` (same reading as `summarizeRouteMainCause` on `/why`), `cause_mix` (from `CauseAggQueryService.routes()` with the same period and scope, so equal to `/why`), `legs_failed`, `legs_passed` (medians of the six legs), `slowest_leg` (largest `legs_failed - legs_passed` among tms_arrive / arrive_gbt / gbt_ptc, literal: a negative maximum is still returned, null only when no stage has both medians), `postmen` of the period with `volume`, `filter` for the parcel list. `legs` (all parcels) kept.
- Route grouping = `/why` key: POSTMAN by route code; NON_POSTMAN and OTHER one group per BCVH (`@NON_POSTMAN`, `@OTHER`, labels "Phát tại quầy (khách đến nhận)" / "Tuyến chưa xác định"); rows ordered BCVH, scope (POSTMAN first), `own_shortfall` desc.
- `/journey/parcels`: same period, `ngay_do_kiem` and `route_scope` on each parcel, route filter accepts `@NON_POSTMAN` / `@OTHER` (plain code = legacy `ma_tuyen` match), sort by `ngay_do_kiem`.
- Cause layer unavailable or failing: cause fields null, `meta.cause_layer.available = false`, the hours still show. `meta.cause_layer` also carries the `/why` freshness and `volume_mismatch_routes`.
- Scope unchanged: the controller resolves `bcvhId` / `allowedCodes` exactly as before; they go to both the journey days and the cause layer.

**How:** the service calls `JourneyService._parcels(day)` for each day but through `RangeRepository`, which reads F4.1 / F4.2 / F1.1 / BatchFile / lot scans **once** for the window and serves the per-day reads from memory; each day is reduced to small aggregates before the next. Single day = identical windows.

**Tests** (`node --experimental-sqlite --test`, one file each): `JourneyPeriodService.test.js` 10 / 0 (period resolution and guards; one day equals `JourneyService`; split medians, slowest leg and own_shortfall on a hand-added fixture; route_scope groups and labels; own_shortfall / volume / cause_mix equal to the real `CauseAggQueryService.routes()`; main cause; slowest leg units; BCVH-account scope; parcels over a period; no cause layer). Neighbours still green: `JourneyService.test.js` 28 / 0, `f13v2Routes.scope.test.js` 13 / 0, `f13v2WhyRoutes.scope.test.js` 5 / 0, `f13v2Evidence.test.js` 16 / 0.

**Measured on a copy of the database** (2026 rebuilt with the new classifier; no live file touched; whole city, cold, in-process, no HTTP cache):

| Period | Routes | Parcels | Cold | Second call | RSS |
|---|---|---|---|---|---|
| Day 15/10 | 106 | 4 992 | 4.2 s | 1.9 s | 282 MB |
| Week W42 | 113 | 26 801 | 4.6 s | 3.4 s | 485 MB |
| **Month 2026-10** | 125 | 113 235 | **15.3 s** | 12.5 s | **1 181 MB** |

- **Month is over the 10 s target** and uses ~1.2 GB. Parcels of one route over the month: 3 929 rows in 8.4 s. Most of the time is JourneyService rebuilding its per-day maps and classifying every parcel although routes need only the legs.
- **Proposal (needs the Opus review, nothing done):** store the five leg hours (tms_arrive, arrive_gbt, gbt_ptc, tms_ptc + milestones needed for medians) in `f13_cause_parcel` at build time, then answer routes and parcels from the table like `/why` (sub-second). Needs a schema change, the builder to write them, and a rebuild; or a lean day builder that skips `classify` (needs `JourneyService.js` edited, which re-stales the days).
- Month vs `/why/routes` (same period, all BCVH): 125 rows both sides, **0 differences** in volume, Đạt, Không đạt, own_shortfall_x10 and cause_mix; `volume_mismatch_routes = 0`; cause freshness complete.
- Single-day legs and volume vs `JourneyService.getRoutes` on 3 days (05, 15, 28/10): 0 differences.
- **Known difference:** `khong_tron_lo` over the month is 2 329 in the journey against 2 328 in the cause table. The period reads the lot scans over one wider window than each day's window, so one parcel's lot counted a second batch. The cause layer (main cause, mix) is not affected; only the `khong_tron_lo` counter of the route rows and `meta.lots`.
- Example, Hương Trà, October (lf = failed medians tms_arrive / arrive_gbt / gbt_ptc, lp = passed): route 53547038: 1 243 parcels, rate 35.6 %, own_shortfall 675.7, slowest gbt_ptc, main cause Phát, lf 1.98 / 19.65 / 51.47, lp 2.91 / 1.65 / 0.79.

**Not done:** no live build, no restart. Frontend not touched (U1). The page `F13V2Journey*` still calls with `date` and keeps working.

