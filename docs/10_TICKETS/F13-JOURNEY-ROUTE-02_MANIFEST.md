# F13-JOURNEY-ROUTE-02 Manifest

## 1. Ticket Information

- Ticket ID: `F13-JOURNEY-ROUTE-02`
- Name: `F1.3 Hành trình bưu gửi: "Hành trình theo tuyến phát" rebuilt - Ngày / Tuần / Tháng, by BCVH, failed vs passed hours per stage`
- Programme: F1.3 Chuyên đề. Predecessor `F13-V2-JOURNEY-01` (page `/f13/v2/hanh-trinh`, day only).
- Owner: Claude Code / Opus 5.5 (scope, reviews, real render). **B1 backend: Claude Code / Sonnet 5.5. U1 screen: Antigravity.** Does not change the Current Ticket of `PROJECT_SNAPSHOT.md`.
- Branch: `codex/da-impl-006`.
- **Status: `B4 ACCEPTED - U2 READY FOR ANTIGRAVITY`** (Opus review, section 17). Rollout with G7 after U2.

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


## 8. Opus review of B1 (2026-11-07, Claude Code / Opus 5.5; commit `98f01510`)

**B1 ACCEPTED** for day and week. New `JourneyPeriodService.js` behind the same routes; `JourneyService.js` left alone (a good choice: it is in the classifier version files); cause fields through `CauseAggQueryService.routes()`, so October matches `/why/routes` (125 rows, 0 differences); `RANGE_TOO_LONG` (93 days) returns 400. Suites rerun: `JourneyPeriodService` 10/10, `f13v2Routes.scope` 13/13, `f13v2WhyRoutes.scope` 5/5.

| ID | Level | Finding | Resolution |
|---|---|---|---|
| J-R1 | **Medium (blocks the month view in production)** | A month for all BCVH takes 15,3 s and about 1,2 GB of memory per request (every day rebuilt through the journey join). Two users on two months would risk the backend's memory. | **B2 (Sonnet):** store the leg hours of each parcel (`tms_depart`, `depart_arrive`, `tms_arrive`, `arrive_gbt`, `gbt_ptc`, `tms_ptc`, in ms) in `f13_cause_parcel` when the builder writes a day (the values `JourneyService._parcels` already computes); additive migration; `JourneyPeriodService` reads routes, medians and parcel lists from the table like `/why`. Target: a month under 3 s, memory under 300 MB. Needs one more full 2026 rebuild (done with G7). |
| J-R2 | Low | `slowest_leg` can name a leg where the failed parcels are faster than the passed ones (negative gap). | B2: `slowest_leg` only when the gap is > 0, else null. |
| J-R3 | Low | `khong_tron_lo` 2 329 here against 2 328 in the cause table (wider lot window over several days). | Disappears with B2 (read from the table). |

Prompt B2 is given in chat to the session that did B1.

## 9. B2 Technical Execution Report (Sonnet 5.5, 2026-11-07) - READY FOR OPUS REVIEW

**J-R1 (legs in the table).** `migrate_f13_why_agg_01_schema.js`: six new INTEGER columns `leg_tms_depart_ms`, `leg_depart_arrive_ms`, `leg_tms_arrive_ms`, `leg_arrive_gbt_ms`, `leg_gbt_ptc_ms`, `leg_tms_ptc_ms` (in the CREATE TABLE and in `F13_WHY_AGG_01_ADDED_COLUMNS`, so an old table is extended in place at startup; the migration already runs at startup, `server.js`). `CauseAggBuilder.js` `toRow` writes them from `parcel.legs` of JourneyService (`Math.round(hours * 3 600 000)`: resolution 0.01 h = 36 s, null stays null) and `ROW_COLUMNS` has them. `JourneyService.js`, `CauseClassifier.js`, `f13CauseConfig.js`, `CauseAggQueryService.js` not edited. The classifier version did not change (builder and migration are not version files: classifier `97890e76b613` before and after), so the days built live stay FRESH; they simply have the legs NULL until rewritten.
- `JourneyPeriodService.js` now takes `{ db, causeAgg }` (no repository): routes, medians, coverage, lots and parcel lists come from `f13_cause_parcel` (one streamed scan for the routes, SQL paging and ordering for the parcels, missing values last). The cause mix and the route names still come from `CauseAggQueryService.routes()` (same call as `/why`). Controller passes `sharedDb`.
- **Rollout:** after deploy, the legs of the live days exist only after a rebuild of the range (`f13_cause_tool.js rebuild`, not `build`: the days are FRESH). Until then `meta.legs.days_without_legs` lists the days without legs (their rows still count in volume, rate, own_shortfall, cause) and the hours of those days are missing from the medians.
- **J-R2:** `slowest_leg` only when the gap is > 0, else null. **J-R3:** `khong_tron_lo` and `meta.lots` read from the table (equal to it, 2 328 in October).
- Parcel list items: the milestone times are not stored, so `milestones` is an object of nulls (`arrive_source` kept); `legs` in hours as before; added `ngay_do_kiem`, `route_scope`, cause fields as in the old item. `meta.coverage` is derived from the legs (a milestone counts when a leg that uses it is computable, `meta.coverage_basis = 'LEGS'`): tms 110 651 against 113 235 in October (parcels whose only TMS legs are out of order no longer count). U1 should not show milestone coverage from this.

**Tests** (`node --experimental-sqlite --test`, one file each): `JourneyPeriodService.test.js` 14 / 0 (B1 set moved to the table, plus: positive-gap slowest leg, builder row keeps the six legs in ms and the service returns hours, days without legs listed, ordering by a leg with nulls last); `CauseAggBuilder.test.js` 21 (ROW_COLUMNS), `CauseRefresh` 19, `CauseAggQueryService` 22, `migrate_f13_why_agg_01_schema` 3 (old table extended in place), `server.startupMigrations` 1, `JourneyService` 28, `f13v2Routes.scope` 13 (its fixture now builds the anchor day into the cause table through the builder's `toRow`), `f13v2WhyRoutes.scope` 5, `f13v2Evidence` 16: all pass.

**Measured on the copy** (2026 rebuilt with the new builder: 308 days, 0 failed, 630 s; whole city; in-process, no HTTP cache):

| Period | Routes | Parcels | Cold | Second | RSS (process base 50 MB) |
|---|---|---|---|---|---|
| Day 15/10 | 106 | 4 992 | - | - | - |
| Week W42 | 113 | 26 801 | 0.8 s | 0.7 s | 83-100 MB |
| **Month 2026-10** | 125 | 113 235 | **3.2 s** | 2.9 s | **155 MB** |

Month: B1 was 15.3 s and 1 181 MB. Memory target met (< 300 MB). **Time is just over the 3 s target (3.2 s cold, 2.9 s warm)**: 2.0 s of it is `CauseAggQueryService.routes()` (two `_groups` passes, names, meta), which this ticket may not edit; the scan of the table is 0.8 s and runs in parallel with it. `cachedRead` of `/journey/` caches the answer afterwards. Parcels of one route over the month: 3 929 rows in 74 ms; the whole city, first page, in 103 ms.

**Compared with B1 (same copy):**
- One day (15/10): 0 differences in any route field (volume, rate, own_shortfall, main_cause, cause_mix, postmen, names, the three leg sets, filter, order).
- Month: 125 routes both sides, same order; volume, passed, failed, rate, own_shortfall, main_cause, cause_mix, postmen, names, filter identical. Differences: (a) `khong_tron_lo` 2 329 -> 2 328 (now equal to the cause table: J-R3); (b) leg medians of **only `tms_depart` and `depart_arrive`** differ in 27 / 17 / 17 of 125 routes (all / failed / passed), by 0.01-0.1 h (e.g. 1.86 -> 1.89): B1 read the F1.1 departures over one wide window, the table follows the per-day window of the builder, so B2 equals JourneyService day by day; no other leg differs. Week W42: 2 routes, same cause. (c) `slowest_leg` differs only where B1 returned a leg with gap <= 0 (J-R2: 0 of 125 in October, 1 of 113 in the week, 2 of 106 in the day). (d) `meta.coverage` as said above.
- `meta.cause_layer.volume_mismatch_routes = 0`, cause freshness complete.

**Not done:** no live build, no restart (the live rebuild with `rebuild` is the rollout step for Opus). Frontend not touched (U1).

## 10. Opus review of B2 (2026-11-07, Claude Code / Opus 5.5; commit `4d14bef7`)

Good: six leg columns added in place by the startup migration; builder writes them; the classifier version files are untouched (`JourneyService.js`, repository, classifier, config, intervals: no diff since `99c67b79`), so no extra stale marking; month 3,2 s / 155 MB (from 15,3 s / 1,2 GB); one day equal to B1 in every route field; J-R2 and J-R3 done. Suites rerun: `JourneyPeriodService` 14/14, `CauseAggBuilder` 21/21, `migrate_f13_why_agg_01_schema` 3/3, `f13v2Routes.scope` 13/13.

| ID | Level | Finding | Resolution |
|---|---|---|---|
| J-R4 | **Blocker (regression of a live, PO-used page)** | Parcel list items now carry `milestones` all null and `meta.coverage` is rebuilt from the legs. The live Hành trình page shows, for every parcel, the five milestone times (`F13V2JourneyParcelTable.jsx` line 81, `parcel.milestones[...]`) and the share of parcels having each milestone (`F13V2JourneyPage.jsx` lines 174-180). After the next restart both would go blank or change meaning. | **B3 (Sonnet, same session):** store the milestone times in `f13_cause_parcel` too (`ms_tms`, `ms_depart`, `ms_arrive`, `ms_gbt`, `ms_gbt_first`, `ms_ptc` as INTEGER ms on the local clock like the legs; `a_source` already stored), same additive migration and builder path; parcel items return them in the old string format (`formatTime`), `meta.coverage` counts real milestones again (October tms back to 113 235 or explain the difference). Prove on the copy: one day, the parcel list and coverage equal to the old `JourneyService.getParcels` / `getRoutes` (0 differences), then the month timing again. |
| J-R5 | Low | Month 3,2 s against 3 s: 2,0 s is `CauseAggQueryService.routes()`, not this ticket. | Accepted (cached after the first call by `cachedRead`). |

Rollout (after B3 is accepted): `f13_cause_tool.js rebuild --from 2026-01-01 --to <latest>` on the live file (rebuild, not build: the days are FRESH), verify, restart. Done with G7.

## 11. B3 Technical Execution Report (Sonnet 5.5, 2026-11-07) - READY FOR OPUS REVIEW

**J-R4 fixed.** `migrate_f13_why_agg_01_schema.js`: seven more columns (CREATE TABLE and `F13_WHY_AGG_01_ADDED_COLUMNS`, so an old table is extended in place at startup): `ms_tms`, `ms_depart`, `ms_arrive`, `ms_gbt`, `ms_gbt_first`, `ms_ptc` (INTEGER, local clock in ms like the legs) and **`ms_arrive_source` (TEXT), one column more than the manifest named**: `a_source` is filled only for the analysed Không đạt parcels, so a Đạt parcel would have lost `arrive_source` (the first proof run found exactly that); the existing `a_source` is untouched, so `/why` filters and counts do not move. `CauseAggBuilder.js` `toRow` takes the milestones from `parcel.milestones` (the strings JourneyService formats, back through `parseTime`: exact, whole seconds), `ROW_COLUMNS` has the seven. Not edited: `JourneyService.js`, `CauseClassifier.js`, `f13CauseConfig.js`, `tctIntervals.js`, `F13JourneyRepository.js` (version files unchanged: classifier `97890e76b613` before and after, the live days stay FRESH).
- `JourneyPeriodService.js`: parcel items return `milestones` in the old string format (`YYYY-MM-DD HH:MM:SS`, plus `arrive_source`); the milestone sort fields (`tms`, `depart`, `arrive`, `gbt`, `gbt_first`, `ptc`) work again (nulls last); `meta.coverage` counts the real milestones again (`coverage_basis` removed). Coverage, `days_without_legs` and the new `days_without_milestones` come from one aggregate query per request, so the streamed scan stays as light as in B2.
- Rollout is unchanged: a rebuild of the range (`rebuild`, the days are FRESH). A day built by B2 code has legs but no milestones until rewritten: it is listed in `meta.legs.days_without_milestones` (its parcels show blank milestones and are not counted in the coverage).

**Tests** (`node --experimental-sqlite --test`, one file each): `JourneyPeriodService.test.js` 16 / 0 (two new: the parcel list equals `JourneyService.getParcels` per parcel on milestones including `arrive_source`, on legs, postman and status, and the coverage equals `getRoutes`; a day without milestones is listed and ordering by a milestone puts nulls last); `CauseAggBuilder` 21, `CauseRefresh` 19, `CauseAggQueryService` 22, `migrate_f13_why_agg_01_schema` 3, `server.startupMigrations` 1, `JourneyService` 28, `f13v2Routes.scope` 13, `f13v2WhyRoutes.scope` 5, `f13v2Evidence` 16: all pass.

**Proof on the copy** (2026 rebuilt with the B3 builder: 308 days, 0 failed, 713 s). Old = `JourneyService._parcels` / `getRoutes`, new = `JourneyPeriodService` (all parcels, 200 per page), whole city:

| Day | Parcels old / new | Differences in milestones / legs / postman / verdict / route / cause fields / lot | Coverage old = new |
|---|---|---|---|
| 15/10 | 4 992 / 4 992 | 0 / 0 / 0 / 0 / 0 / 0 / 0 | equal (tms 4 992, depart 3 357, arrive 4 664, gbt 4 988, ptc 4 801) |
| 28/10 | 3 238 / 3 238 | 0 / 0 / 0 / 0 / 0 / 0 / 0 | equal (3 238, 2 397, 3 185, 3 230, 3 089) |

`meta.lots` (failed, failed_in_lot, khong_tron_lo, lots) also equal on both days. Route rows against the old `getRoutes` (postman routes): volume, passed, rate, khong_tron_lo, `legs` (all parcels), postmen, names equal; the one difference is `failed`, and it is the definition, not the data: the old page computed `failed = parcels - Đạt` (unrated parcels counted as failed), the new rows count Không đạt like `/why` (since B1; 12 routes on 15/10).

**Month, measured again** (2026-10, whole city, in-process, no HTTP cache):

| Period | Cold | Second | RSS (base 50 MB) |
|---|---|---|---|
| Week W42 (26 801) | 0.8 s | 0.7 s | 83-100 MB |
| **Month (113 235)** | **3.3 s** | 2.9 s | **151-178 MB** |

Parcels of one route over the month: 3 929 rows in 71 ms; whole city first page 86 ms. A first B3 version that streamed the six milestone columns in the scan went to 233-528 MB; moving the coverage to an aggregate query brought it back (the J-R5 time is unchanged: 2.0 s of the 3.3 s is `CauseAggQueryService.routes()`). October coverage from the table: parcels 113 235, tms 113 235, depart 68 004, arrive 107 619, gbt 112 945, ptc 107 330 (B1 had depart 68 303: its wide F1.1 window, see section 9); `days_without_legs` and `days_without_milestones` empty.

**Not done:** no live build, no restart; rollout (rebuild of the live range, verify, restart) is Opus's with G7. Frontend not touched.

## 12. Opus review of B3 (2026-11-07, Claude Code / Opus 5.5; commit `9c100aeb`) - B2 + B3 ACCEPTED

**J-R4 closed.** Seven additive columns (`ms_tms` ... `ms_ptc` + `ms_arrive_source`; the extra source column is right: `a_source` is filled for analysed Không đạt parcels only). Builder fills them from `parcel.milestones` through `parseTime`; the parcel list returns the old string format; milestone sorts work again (nulls last); `meta.coverage` counts real milestones from one aggregate query, so the month stays 3.3 s / 151-178 MB. Classifier version files untouched (`97890e76b613`). Copy proof: 15/10 and 28/10, 4 992 and 3 238 parcels, 0 differences in milestones, legs, postman, verdict, route, cause fields, lot; coverage equal. Suites rerun by Opus: `JourneyPeriodService` 16/16, `CauseAggBuilder` 21/21, `JourneyService` 28/28. The route `failed` difference against the old page (old = parcels - Đạt) is the `/why` definition since B1: accepted.

**G7 rollout order (important).** The running backend is the old code: if it refreshes a day after the live rebuild, that day is rewritten without legs and milestones but keeps the same classifier version (FRESH), so nothing would rewrite it. Therefore: (1) restart first (the startup migration adds the columns, new builder live), (2) then `f13_cause_tool.js rebuild --from 2026-01-01 --to <latest>` on the live file, (3) verify; `meta.legs.days_without_legs` / `days_without_milestones` must be empty for the range. Between (1) and the end of (2) (~12 min) the Hành trình page shows blank hours for days not yet rebuilt.

**U1 (Antigravity) API facts**, in addition to section 5: `/journey/routes` takes `from`/`to` | `week` | `month` | `date`; rows carry `ma_bcvh`, `ten_bcvh`, `route_scope`, `key`, `volume`, `passed`, `failed`, `rate`, `own_shortfall`, `main_cause`, `cause_mix`, `legs_failed`, `legs_passed`, `legs`, `slowest_leg` (null when no stage is slower for failed parcels), `postmen` (with `volume`), `filter` (to pass to `/journey/parcels`); `meta.coverage`, `meta.lots`, `meta.cause_layer`. Rows are already ordered BCVH, POSTMAN first, `own_shortfall` desc. Range over 93 days returns 400 `RANGE_TOO_LONG`.

## 13. U1 Technical Execution Report (Antigravity, 2026-11-07) - READY FOR OPUS REAL RENDER

**What was built.** Implemented J1-J6 across `F13V2JourneyPage.jsx`, `F13V2JourneyRouteTable.jsx`, `F13V2JourneyParcelTable.jsx`, `journeyHelpers.js`, and `api/f13v2Api.js`:
- **J1 (Common period filter):** Day / Week / Month tab switcher (`from`/`to`, `week`, `month`, legacy `date` supported), scoped BCVH select, search box for parcel ID or lot code, "Chỉ bưu gửi không trọn lô" checkbox, selected route filter pill, and refresh button.
- **J2 (Grouped by BCVH):** `groupJourneyRoutesByBcvh` preserves API order. Inside each BCVH group, postman routes are sorted by `own_shortfall` desc by default with SortableTh headers.
- **J3 (Per route metrics & stage hours):** Volume, rate (90 % target, F1.3 blue theme), Không đạt count, and the 4 stages (`tms_arrive`, `arrive_gbt`, `gbt_ptc`, `tms_ptc`) showing `Không đạt` hours beside `Đạt` hours. The `slowest_leg` (largest positive gap between failed and passed parcels) is prominently marked with warning pill and tooltip. Main cause from `/why` displayed.
- **J4 (Bottom route groups):** "Phát tại quầy (khách đến nhận)" (`NON_POSTMAN`) and "Tuyến chưa xác định" (`OTHER`) rendered as two separate groups at the bottom of each BCVH, not ranked with postmen.
- **J5 (Title "Bưu tá" everywhere):** Column title strictly kept as "Bưu tá" on every table, including the non-postman and other groups, showing postmen with volume (`formatPostmenWithVolume`).
- **J6 (Clicking a route opens parcels):** Clicking any route passes its `row.filter` to the parcel table query (`route` + `ma_bcvh`) and highlights the row.
- **Camera & click-to-order:** `BlockCaptureButton` on both tables; `SortableTh` on all numeric, string, and stage leg columns.
- **RANGE_TOO_LONG message:** When backend returns 400 `RANGE_TOO_LONG` (> 93 days), displays clear message: "Khoảng thời gian xem tối đa 93 ngày. Vui lòng chọn khoảng thời gian ngắn hơn."
- **Testing & Quality:**
  - `journeyHelpers.test.js` expanded: 9 / 9 tests PASS.
  - All F1.3 v2 test suites: 84 / 84 tests PASS.
  - `oxlint -D no-undef`: 0 errors.
  - `npm run build`: successful in 2.44s.
  - No backend files touched.


## 14. Opus real render of U1 (2026-11-07, Claude Code / Opus 5.5)

Isolated backend on 5051 over the B3 database copy (milestones built), vite on 5199; live 5050/5178 untouched. Leader account: day 15/10 Thuận An, week W42 whole city, month 10 Thuận An, too-long range; BCVH account (Thuận An): month.

**Defects found and fixed by Opus in this commit** (small, and the live page was already serving U1 through HMR):
- **Blocker:** the page crashed (blank) on every period: `main_cause` is the `/why` object `{code, label, count, share}` and was rendered as a React child. New `formatJourneyMainCause` (label + share, `100% đạt` when no failed parcel); sorting by main cause reads its label. Test added (`journeyHelpers.test.js` 10/10).
- Stage sub-header put `<th>` inside a `<div>` inside `<th>` (invalid table, hydration warning): now eight plain header cells, still click-to-order.
- Routes and parcels were fetched three times per open (the period object changed when weeks/months/latest date arrived): period now keyed by a string; one fetch per change (two under StrictMode in dev).
- Parcel rows over a period keyed by `ma_bg` only (the same parcel can appear on two days): key `ngay_do_kiem|ma_bg`; header cells from `title()` got a key.
- Note under the two extra groups reworded to "Không xếp hạng chung với tuyến bưu tá".

**Render after the fixes:** no page error, no React warning (only the harness 404s of `/ops-journal`, not stubbed). Each view about 2.6-2.9 s on the copy. Month Thuận An: 7 postman routes, then "Phát tại quầy (khách đến nhận)" and "Tuyến chưa xác định" as two separate blocks, both with the "Bưu tá" column; stage hours Không đạt beside Đạt, slowest stage marked; clicking Mỹ Thượng_01 lists its 1 571 parcels for October, equal to the route volume, with milestone times. BCVH account sees only Thuận An. Over 93 days shows the Vietnamese limit message. oxlint `-D no-undef` on the four files: 0 errors.

## 15. PO check of U1 (2026-11-08): not passed - decisions J7-J10, B4 and U2

PO findings on the live page (the live backend still runs B1; B2/B3 go live with G7):
1. The parcel list ("Hành trình từng bưu gửi") is not seen after clicking a route. Cause: it sits under the whole route table (city day = about 7 000 px of rows), far below the click.
2. Week and month show no postman. Live is B1 (postmen through the per-day range repository); on the B3 copy the postmen are present for day, week and month. Goes away with the rollout; B4 replaces the column anyway.
3. One row per route mixes every postman: the parcels of one postman cannot be opened and the route verdict is not the verdict of each postman.
4. Camera "not usable". On the copy the PNG save works on both blocks, but the whole-city route block takes 12-14 s and gives a 2 544 x 16 030 picture (Top N is per BCVH, not overall), too large to paste.
5. (all F1.3 data tables) a page size choice 20 / 50 / 100 is needed; Dữ liệu minh chứng is fixed at 50.

| ID | Decision (PO 2026-11-08) |
|---|---|
| J7 | **One row = BCVH + route + postman** (PO chose "Mỗi tuyến 1 dòng"): a postman on two routes has two rows. Each row has its own volume, rate, Không đạt, own shortfall, stage hours Không đạt / Đạt, slowest stage and main cause from its own parcels. Phát tại quầy and Tuyến chưa xác định stay two separate groups at the bottom of each BCVH, split by postman the same way. The column title stays "Bưu tá". |
| J8 | Clicking a row opens the parcels of **that postman on that route for the period** in a popup window (same pattern as the Phân tích nguyên nhân parcel window), with camera and paging; the parcel table at the bottom stays for search by parcel or lot code. |
| J9 | Camera on each BCVH block (Top N rows of that BCVH); the whole-table camera keeps Top N overall, not per BCVH. |
| J10 | Page size 20 / 50 / 100 (default 20) on every paged F1.3 v2 table: Dữ liệu minh chứng, Hành trình parcels (table and popup), Phân tích nguyên nhân parcel window, Đề xuất quy tắc if paged. Backends already accept `page_size` (max 100 / 200). |

### B4 backend (Sonnet, session G0) - technical scope
- `JourneyPeriodService.getRoutes`: group key `ma_bcvh | route key | postman` with postman = `ma_buu_ta_shown` (`ten_buu_ta_shown`); a parcel without postman goes to a row with `ma_buu_ta: null` (label on screen "Chưa có bưu tá"). Row fields as today plus `ma_buu_ta`, `ten_buu_ta`, `route_volume`, `route_rate`; `postmen` removed or kept as the one postman. Row order: BCVH, scope (POSTMAN first), `own_shortfall` desc.
- Cause per row from the row's own failed parcels (stored cause columns), same codes, labels and main-cause reading as `/why`. Test: for every route, the sum of its postman rows equals the `/why` route row (volume, Đạt, Không đạt, cause mix; own shortfall from the summed counters).
- `getParcels`: new filter `postman` (code, or `@NONE` for none) with `route`; `row.filter` carries both.
- Files: `JourneyPeriodService.js`, its test, the journey handlers of `F13V2Controller.js`. Not the classifier version files, not `CauseAggQueryService.js` (read its exported helpers only). No rebuild needed (columns exist). Measure month whole city on the copy again.

### U2 screen (Antigravity) - after B4 is accepted
J7-J10 in `F13V2JourneyRouteTable.jsx`, `F13V2JourneyPage.jsx`, `F13V2JourneyParcelTable.jsx`, a popup for J8 (reuse the table), page size control for J10 in `F13V2EvidencePage.jsx` / `F13V2EvidenceTable.jsx`, `F13V2WhyParcelModal.jsx`, the Hành trình parcel table; report block standard; oxlint `-D no-undef`; no browser, no dev server, no login.

## 16. B4 Technical Execution Report (Sonnet 5.5, 2026-11-08) - READY FOR OPUS REVIEW

**J7 (one row = BCVH + route + postman).** `JourneyPeriodService.getRoutes`: group key `ma_bcvh | route key | postman`, postman = `ma_buu_ta_shown` (name from `ten_buu_ta_shown`); a parcel without postman goes to the row with `ma_buu_ta: null`, `ten_buu_ta: null`, `filter.postman: '@NONE'` (the screen label "Chưa có bưu tá" is U2's). Each row has its own `volume`, `passed`, `failed`, `rate`, `khong_tron_lo`, `own_shortfall` (+`_x10`, `shortfall`), `legs`, `legs_failed`, `legs_passed`, `slowest_leg` (gap > 0 only) and its own `cause_mix` / `main_cause`. New fields: `ma_buu_ta`, `ten_buu_ta`, `route_volume`, `route_rate` (the totals of the whole route, the same on every postman row of it), `route_key`. `postmen` kept as the one postman of the row (volume = row volume; `[]` when none) so the old page does not break. `filter` is `{ route, postman, ma_bcvh }`. Order: BCVH, scope (POSTMAN first), `own_shortfall` desc, volume, route code, postman code. Phát tại quầy / Tuyến chưa xác định are split by postman the same way, key `…|@NON_POSTMAN|<postman>`.
- **Cause per row** from the row's own failed parcels: one grouped query over the stored cause columns (same grouping as `/why` plus the postman), accumulated with a local copy of `/why`'s `addCauseRow` and turned into `cause_mix` by the exported `causeMixOf`, so codes, labels, the line order and the main-cause reading (`mainCauseOf`) are the ones of `/why`. Not exported by `CauseAggQueryService.js` (`addCauseRow`, `emptyMix`), hence the small copy here; that file is not edited. The `/why` call remains for the route names and the freshness (`meta.cause_layer`; `volume_mismatch_routes` now compares each route's summed postman rows with the `/why` route row).
- **`getParcels`** has the `postman` filter (a postman code, or `@NONE` for parcels without one), together with `route` or alone; the controller passes it. `route` filter and its `@NON_POSTMAN` / `@OTHER` forms unchanged.
- Files: `JourneyPeriodService.js`, its test, the journey handler of `F13V2Controller.js` (3 lines). Not touched: `CauseAggQueryService.js`, the classifier version files, the migration, the builder. No rebuild needed (the columns exist).

**Tests** (`node --experimental-sqlite --test`, one file each): `JourneyPeriodService.test.js` 16 / 0. The fixture now has BT1 (P1, P2 Đạt, F2 KĐ), BT2 (F1 KĐ) on route R1 and a parcel without a handover (no postman) on route R2; the old route-level assertions became postman-level ones. Key tests: per route, the postman rows add up to the `/why` route row (volume, Đạt, Không đạt, the cause mix line by line, `route_volume`, own shortfall from the summed counters); each row's `cause_mix.failed` equals its Không đạt; one day equals `JourneyService.getRoutes` (route totals, each postman's volume and name, coverage, lots); a row without postman; the three postman filter forms (`BT1`, `BT2`, `@NONE`, with and without route); main cause read per postman (BT1 Phát, BT2 Khai thác - Vận chuyển chưa phân biệt); slowest leg per postman (BT1 `arrive_gbt` 7 h against 1 h, BT2 none: no passed parcel). Neighbours: `f13v2Routes.scope` 13, `f13v2WhyRoutes.scope` 5, `f13v2Evidence` 16, `CauseAggQueryService` 22, `CauseAggBuilder` 21: all pass.

**On the copy** (2026 as rebuilt for B3; no new rebuild needed), whole city:

| Period | Rows | Routes | Sum of postman rows = `/why` route (volume, Đạt, KĐ, cause mix, route_volume) | Rows without postman | Cold | RSS (base 50 MB) |
|---|---|---|---|---|---|---|
| Week W42 | 327 | 113 | 113 of 113 equal, 0 differences | 16 rows / 53 parcels | 0.7 s | 153 MB |
| **Month 2026-10** | **538** | 125 | **125 of 125 equal, 0 differences** | 44 rows / 290 parcels | **3.3-3.5 s** (3 runs; a first run after other work: 7.0 s, cold file cache) | **154 MB** |
| Day 15/10 (4 992 parcels) | 205 | - | - | - | 0.3 s | 64 MB |

Month: the 538 rows keep the volume of the month (113 235); the time and memory of B3 are unchanged (J-R5: 2.0 s of the 3.3 s is `CauseAggQueryService.routes()`). One postman row opened as a parcel list: 3 107 rows in 114 ms (equal to its `volume`); the no-postman row `533140|53314043|NONE`: 14 rows (equal). Example, Hương Trà, October, first rows by own shortfall: route 53547026 / NGUYỄN VĂN QUÝ: 666 parcels of a route of 1 466, rate 27.9 % (route 44.3 %), own shortfall 413.4, slowest leg `arrive_gbt`, main cause Phát.

**Not done:** no live build, no restart. Frontend not touched (U2).

## 17. Opus review of B4 (2026-11-08, Claude Code / Opus 5.5; commit `e333c6e7`) - ACCEPTED

One row per BCVH + route + postman; per route the postman rows add up to the `/why` route row (month: 125 of 125 routes, 0 differences); month 3.3-3.5 s, 154 MB; postman filter (`code` / `@NONE`) on parcels, a postman row opens exactly its `volume`. Suites rerun by Opus: `JourneyPeriodService` 16/16, `f13v2Routes.scope` 13/13. Residual accepted: `addCauseRow` is a local copy of the `/why` one (not exported); the sum test guards drift.

**U2 API facts:** row fields `ma_buu_ta`, `ten_buu_ta` (null = "Chưa có bưu tá"), `route_volume`, `route_rate`, `route_key`, `filter = { route, postman, ma_bcvh }` (pass all three to `/journey/parcels`, plus `page_size`), `main_cause` is an object (render with `formatJourneyMainCause`). Rows already ordered BCVH, POSTMAN first, own shortfall desc.
