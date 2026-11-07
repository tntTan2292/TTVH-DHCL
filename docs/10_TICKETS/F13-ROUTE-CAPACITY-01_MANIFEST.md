# F13-ROUTE-CAPACITY-01 Manifest

## 1. Ticket Information

- Ticket ID: `F13-ROUTE-CAPACITY-01` (gap G2 of `docs/03_PLANNING/F13-GOLIVE-PLAN-01.md`)
- Name: `F1.3 route capacity and daily load`
- Owner: Claude Code / Opus 5.5 (scope, review, real render). **B1 backend: Claude Code / Sonnet 5.5. U1 screen: Antigravity** (after B1 is accepted). Does not change the Current Ticket.
- Branch: `codex/da-impl-006`.
- **Status: `READY FOR SONNET (B1)`**. `PO UI Check Required = Yes` (after U1).

## 2. PO decisions (2026-11-07, in chat, plan approved)

| ID | Decision |
|---|---|
| C1 | A route is compared with **its own history**, not with the BCVH average (delivery areas differ). |
| C2 | **Capacity** of a route on day D = the upper quartile (P75) of the daily volume of its days **at >= 90 % on time** in the 56 days before D (D excluded). |
| C3 | **Load** of day D = volume of D / capacity. Over 100 % = **quá tải**, 60-100 % = bình thường, under 60 % = **còn dư sức**. |
| C4 | Routes with several postmen on a day: also the volume **per postman** (postmen counted from the first handover, F4.2). |
| C5 | The BCVH average volume per route is shown as a reference only, never used to judge. |
| C6 | Phát tại quầy (NON_POSTMAN) and Tuyến chưa xác định (OTHER) have no capacity. |
| C7 | Show, do not judge (PO 2026-11-04): load is information for the Chuyên quản / GĐ, not a fault. |

## 3. B1 backend (Sonnet) - technical scope

- Source: `f13_cause_parcel` (one row per F1.3 parcel: `ngay_do_kiem`, `ma_bcvh`, `ma_tuyen`, `route_scope`, `danh_gia`, `ma_buu_ta_first`), whose counts equal `fact_f13` (verify 0 differences, F13-WHY-AGG-01). Read only; no new table unless the measurement of section 4 says so.
- Rules C2-C6 in one pure module `backend/src/services/f13v2/RouteCapacity.js` (thresholds `CAPACITY_WINDOW_DAYS = 56`, `CAPACITY_MIN_GOOD_DAYS = 5`, `LOAD_HIGH = 1.0`, `LOAD_LOW = 0.6` in one config object). Fewer than 5 good days in the window: capacity `null`, state `CHUA_DU_DU_LIEU`. Days with no volume do not count.
- Service `RouteCapacityService.js` and the handlers in **`backend/src/routes/f13v2CapacityRoutes.js` only** (already mounted at `/api/f13/v2/capacity`, auth / module / scope inherited). Do not edit `f13v2Routes.js`, `F13V2Controller.js`, `JourneyService.js`, `CauseClassifier.js`, `f13CauseConfig.js`, `f13WhyHelpers.js` (other sessions work on them).
- Endpoints: `GET /capacity/routes` with the usual period (`from`/`to`, `week`, `month` through `periodResolve`) and `bcvh`: one row per route of the period: `ma_bcvh`, `ten_bcvh`, `ma_tuyen`, `ten_tuyen`, `route_scope`, `capacity` (at the last day of the period), `days`, `volume_avg`, `load_avg`, `days_over` / `days_normal` / `days_under`, `postmen_avg`, `volume_per_postman_avg`, `bcvh_avg_per_route` (C5), `rate`. `GET /capacity/route-days?ma_tuyen=` for one route: each day with volume, rate, capacity of that day, load, band, postmen. A BCVH account sees its own unit only.
- Measure on a copy of the database: time of a month for all BCVH (target under 10 s cold; cached afterwards with `cachedRead` if needed); the share of routes with capacity, the distribution of load, and 5 example routes (one overloaded, one normal, one spare) with their days, so Opus can check the rule gives sensible numbers before the screen.
- Tests: the P75 rule on a seeded history (good / bad days, gaps, fewer than 5 good days), bands at exactly 60 % and 100 %, NON_POSTMAN / OTHER without capacity, per-postman volume, scope.
- Restrictions: official F1.3 data and the cause table unchanged; no build on the live database; no restart. Commit by pathspec only (never `User QIS.xlsx`, `.claude/skills/`, `graphify-out/`, `.graphifyignore`). Backend suites with `--experimental-sqlite`, one file at a time.

## 4. U1 screen (Antigravity, after B1 accepted)

A "Năng lực tuyến" page in the F1.3 menu (route list by BCVH with load bands, one route's days as a column chart with the capacity line) and a load column on the route tables of Phân tích nguyên nhân and Hành trình. Required Reading: this manifest; `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md`. Written in detail after B1.

## 5. Change log

- 2026-11-07: created by Claude Code / Opus 5.5 after the PO approved the plan and decisions C1-C7.
