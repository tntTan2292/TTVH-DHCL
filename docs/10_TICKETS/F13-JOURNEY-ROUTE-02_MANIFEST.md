# F13-JOURNEY-ROUTE-02 Manifest

## 1. Ticket Information

- Ticket ID: `F13-JOURNEY-ROUTE-02`
- Name: `F1.3 Hành trình bưu gửi: "Hành trình theo tuyến phát" rebuilt - Ngày / Tuần / Tháng, by BCVH, failed vs passed hours per stage`
- Programme: F1.3 Chuyên đề. Predecessor `F13-V2-JOURNEY-01` (page `/f13/v2/hanh-trinh`, day only).
- Owner: Claude Code / Opus 5.5 (scope, reviews, real render). **B1 backend: Claude Code / Sonnet 5.5. U1 screen: Antigravity.** Does not change the Current Ticket of `PROJECT_SNAPSHOT.md`.
- Branch: `codex/da-impl-006`.
- **Status: `READY - B1 waits for F13-WHY-DATA-03 to be committed`** (same file `JourneyService.js`; two writers must not touch it at the same time). `PO UI Check Required = Yes`.

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
- Restrictions: official F1.3 data, cause rules and the cause table unchanged; no build on the live database; backend restart only by Opus after review.

## 5. U1 screen (Antigravity) - after B1 is accepted

Required Reading: this manifest sections 3-5; `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md`. Implements J1-J6 in `F13V2JourneyPage.jsx` / `F13V2JourneyRouteTable.jsx` / `F13V2JourneyParcelTable.jsx` with the common F1.3 period filter; camera, click-to-order titles, 90 % target and blue family, undefined-identifier check. No browser, no dev server, no login (Opus does the real render).

## 6. Change log

- 2026-11-07: created by Claude Code / Opus 5.5 after the PO decisions J1-J6; the two route groups on Phân tích nguyên nhân done in the same commit.
