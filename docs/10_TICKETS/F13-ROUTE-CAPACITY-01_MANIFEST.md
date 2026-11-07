# F13-ROUTE-CAPACITY-01 Manifest

## 1. Ticket Information

- Ticket ID: `F13-ROUTE-CAPACITY-01` (gap G2 of `docs/03_PLANNING/F13-GOLIVE-PLAN-01.md`)
- Name: `F1.3 route capacity and daily load`
- Owner: Claude Code / Opus 5.5 (scope, review, real render). **B1 backend: Claude Code / Sonnet 5.5. U1 screen: Antigravity** (after B1 is accepted). Does not change the Current Ticket.
- Branch: `codex/da-impl-006`.
- **Status: `B1 CODE ACCEPTED (Opus review, section 7); rule C2 to be revised - PO choice open (section 7)`**. `PO UI Check Required = Yes` (after U1).

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
- 2026-11-07: B1 implemented by Claude Code / Sonnet 5.5, measured on a copy of the database; results in section 6. Stopped for the Opus review.

## 6. B1 results (Sonnet 5.5, 2026-11-07)

**Files** (new, nothing else touched): `backend/src/services/f13v2/RouteCapacity.js` (pure rules + `CAPACITY_CONFIG`), `RouteCapacityService.js`, `RouteCapacity.test.js` (12 tests), `backend/src/routes/f13v2CapacityRoutes.js` (the two handlers), `backend/src/routes/f13v2CapacityRoutes.test.js` (5 tests, real routers, scope, 401/400/403). Both suites pass with `--experimental-sqlite`, run one file at a time.

**Choices to confirm in the review** (the manifest left them open):
- P75 = linear interpolation between ranks (`(n-1)*0.75`), capacity is not rounded inside the rules, only in the response (1 decimal; load 3 decimals).
- A good day = `passed*10 >= 9*volume` over all rows of the route-day (unrated rows count in volume, as in `metricsOf`). Exactly 100 % and exactly 60 % are BINH_THUONG.
- Route key is `ma_bcvh + ma_tuyen`. NON_POSTMAN / OTHER appear in `/capacity/routes` as `@NON_POSTMAN` / `@OTHER` per BCVH with `state = KHONG_AP_DUNG`, volume, rate, no capacity, no load.
- `state` per route: `CO_NANG_LUC`, `CHUA_DU_DU_LIEU` (capacity null at the last day of the period) or `KHONG_AP_DUNG`. A day without capacity inside a route that has it on other days has band `CHUA_DU_DU_LIEU`, counted in `days_no_data`.
- `/capacity/route-days` needs `ma_tuyen` (a `@...` key is refused, 400). If a route code exists in several BCVH and no `bcvh` is given, a city-wide account gets 400 "name the unit" (the code `53...` is unique in practice but the guarantee is not in the data).
- Postmen = `COUNT(DISTINCT ma_buu_ta_first)` of the route-day; per-postman volume = volume / postmen, null when no first handover exists; those days are left out of `postmen_avg` and `volume_per_postman_avg`.
- Route names come from `fact_f13` (`MAX(ten_tuyen)` over the period); the cause table has no name column. Not cached (`cachedRead` not needed, see timing).

**Measurement** on a copy of `database.sqlite` (`...scratchpad/dbcopy.sqlite`, 4.8 GB, f13_cause_parcel 997,168 rows 2026-01-01..2026-11-06). Live database not opened for writing, no build, no restart.
- Time, `/capacity/routes?month=` for all BCVH, cold, one process: **2026-10: 1.35 s** (125 rows); 2026-09: 1.96 s. Target < 10 s met by a wide margin; no cache.
- Share of routes with capacity at the last day of October: **48 of 114 POSTMAN routes = 42.1 %** (September 50 of 113 = 44.2 %). The others have fewer than 5 days at >= 90 % in the 56-day window, i.e. they show `CHUA_DU_DU_LIEU`. Of the 48: capacity < 5 parcels: 10; 5-20: 10; >= 20: 28.
- Load distribution, October, route-days of routes with capacity: **over 35.9 % / normal 40.3 % / under 23.8 %** (515 / 579 / 341 days); another 1,528 route-days had no capacity. Mean load per route (load_avg): p10 0.67, p25 0.79, median 0.90, p75 1.13, p90 1.45, max 2.75. For the 27 routes with capacity >= 20 and >= 15 days: over 31.9 % / normal 44.1 % / under 24.0 %.

**Reading for the Opus check**
1. With capacity = P75 of good days, a quarter of the good days sit above capacity by construction, and an overloaded day usually fails the 90 %, so it never feeds capacity. About a third of days are therefore "quá tải". The numbers are consistent with the rule; whether "quá tải" reads sensibly for the Chuyên quản at that frequency is the review's call (C7: information, not a fault).
2. Tiny routes give extreme loads: route 53722032 (Phú Lộc, Nam Đông_01), capacity 1, volume 3 = 300 %, 15 of 20 days "quá tải"; 10 routes have capacity < 5. **Decision needed**: leave as is, or add a floor (e.g. no band when capacity < 5, or a minimum volume). Not implemented, it would change C3.
3. Routes with sporadic huge days (Ô tô routes, e.g. 533140149 Ô tô Nam giữa: 535 parcels on 19/10 = 357 %, 8-20 parcels on other days) give a wide spread; capacity there is a poor yardstick of one person's work, and load per postman is the better reading.

**Five example routes, October 2026** (day: volume / capacity of that day = load, Q quá tải, B bình thường, C còn dư sức, `pN` = N postmen):
- **Over**, 533140141 Phú Xuân_02 (Thuận Hóa), capacity at end 58, 31 days, load_avg 100.1 %, 15 Q / 15 B / 1 C, postmen_avg 1.55, 38.4 per postman, BCVH average per route 60.4, rate 80.9 %. Days: 01 57/47=121% Q, 02 61/47=130% Q, 03 39/52=75% B, 05 62/52=119% Q p2, 08 52/51=102% Q, 12 67/51=131% Q, 15 80/51=157% Q p3, 19 71/51=139% Q p3, 31 30/58=52% C.
- **Normal**, 53314057 HCC Vỹ Dạ (Thuận Hóa), capacity 70.5, 31 days, load_avg 79.0 %, 6 Q / 19 B / 6 C, postmen_avg 1.84, 37.2 per postman, rate 91.8 %. Days: 01 92/72=127% Q p2, 03 56/76=74% B, 04 27/76=36% C, 07 68/75=91% B, 15 81/69=118% Q p2, 20 39/71=55% C p3, 24 21/63=34% C, 28 59/65=92% B, 31 37/71=53% C p2.
- **Spare**, 533140149 Ô tô Nam giữa (Thuận Hóa), capacity 162, 29 days, load_avg 65.6 %, 5 Q / 5 B / 17 C, postmen_avg 2.21, 52.2 per postman, rate 62.2 %. Days: 01 179/177=101% Q p2, 04 320/168=191% Q p2, 06 27/168=16% C p3, 14 40/174=23% C, 17 and 18 no capacity (fewer than 5 good days), 19 535/150=357% Q p2, 23 14/168=8% C, 28 141/162=87% B p3.
- **Many postmen**, 53547025 Phong Điền_01 (Hương Trà), capacity 64.5, 31 days, 3.16 postmen on average, 14.8 per postman (46.1 per day), load_avg 85.7 %, 11 Q / 13 B / 7 C, rate 80 %. Shows C4: a route of 3-4 postmen runs 40-78 a day, 10-20 each.
- **Tiny route** (the problem of point 2), 53722032 Nam Đông_01 (Phú Lộc), capacity 1, volume 1-6 a day, 15 Q / 5 B / 0 C.

**Not done / residual**: no screen (U1), no cache, no new table. Day-level pairing with F4.2 postmen ("counted from the first handover") uses `ma_buu_ta_first` of the cause table, not F4.2 directly. Backend suites of other tickets not re-run (no shared file touched).


## 7. Opus review of B1 (2026-11-07, Claude Code / Opus 5.5; commit `6e13ed57`)

**Code: ACCEPTED** - C2-C6 implemented exactly as written, thresholds in one config, read only on `f13_cause_parcel`, scope narrows only, own router file, no shared file touched. `RouteCapacity` 12/12, `f13v2CapacityRoutes` 5/5 rerun.

**Rule: the measurement shows that C2 as written (Opus proposal, PO approved) does not do its job.** Independent rerun, read only on the live file, October 2026, postman routes, rules compared on the same data:

| Rule | Routes with a capacity | Days over / normal / under (share of all route-days) | On-time rate on those days | No capacity | Small routes |
|---|---|---|---|---|---|
| A: days >= 90 %, P75 (C2 now) | 57 / 112 | 17,9 / 19,6 / 12,0 % | 76,8 / 82,7 / 79,9 % | 50,6 % | - |
| A2: days >= 90 %, P90 | 57 / 112 | 11,0 / 20,4 / 18,1 % | 74,8 / 83,5 / 77,5 % | 50,6 % | - |
| D2: days >= min(90 %, own median rate), P90 | 106 / 112 | 15,8 / 43,6 / 39,6 % | 57,9 / 67,4 / 63,0 % | 0,9 % | - |
| **D3: D2 + routes under 5 BG a day (median) left out** | **94 / 112** | **14,9 / 41,1 / 36,0 %** | **58,0 / 67,5 / 63,1 %** | 0,2 % | 7,8 % |

- With "days >= 90 %" half of the routes never get a capacity, and they are the weak routes, the ones the GĐ most needs to see. P75 also makes about a third of the days with a capacity read "quá tải" by construction.
- D3: a route's good days are the days at or above its own usual level (its median rate, capped at 90 %). For a route that usually reaches 90 % nothing changes; a weak route is compared with its own better days. P90 keeps "quá tải" for clearly higher days (about 15 %), and those days are about 9 points less on time than normal days: the load carries a real signal. Routes under 5 BG a day get the state `TUYEN_IT_HANG` (load not shown, Sonnet's point 1).
- Ô tô routes (sporadic very large days): keep the volume per postman beside the load (point 3); no special rule.
- Sonnet's open choices (linear P75 / P90, good day in integers, route = BCVH + code, postmen from the first handover) are accepted.

**Recommendation: D3.** It changes PO decision C2 (and adds a small-route state), so the PO chooses. On the PO's choice Sonnet changes `isGoodDay`, `CAPACITY_PERCENTILE` and adds the floor in `CAPACITY_CONFIG` plus tests; then U1.

## 8. PO decision on the review (2026-11-07, in chat) - TCT norm

PO: capacity must follow the **TCT norm** (định mức):
- **N1** Tuyến phát trung tâm tỉnh, thành phố: norm **80 BG / day**. Under the norm the route is fine, whatever its ups and downs.
- **N2** Tuyến phát xã: norm **50 BG / day**, same reading.
- **N3** Special difficult routes are **not judged on volume** (very small incoming volume): the Nam Đông area of BCVH Phú Lộc (Khe Tre, Nam Đông, Long Quảng) and BCVH A Lưới.

Data check (read only, October 2026, `fact_f13.loai_tuyen_phat`): 30 routes "Tuyến phát trung tâm tỉnh, thành phố (02 lần/ngày)", 67 "Tuyến phát xã (01 lần/ ngày)", 6 "Tuyến phát xã (02 lần/ngày)"; also 8 "Tuyến phát trung tâm quận, huyện, thị xã (01 / 02 lần)", 2 "Tuyến phát xã trung tâm tỉnh, thành phố (02 lần/ngày)", 2 "Tuyến phát thời vụ", 1 "Tuyến phát Khu công nghiệp", 8 "Tuyến phát lưu tại bưu cục" (Phát tại quầy, out of scope), and "Khong Xac Dinh". N3 routes in the data: Phú Lộc `Khe Tre_02`, `Nam Đông_01`, `Nam Đông_02`, `Long Quảng_01`, `Long Quảng_02` (by name), and the 13 routes of BCVH A Lưới (535790). With N1 / N2, 7 of 48 town routes and 6 of 83 commune routes have an October daily average above the norm.

Open for the PO before Sonnet changes B1: the norm of the other route types listed above, whether D3 (own history) is dropped or kept as a reference column, and whether a day with several postmen on one route compares the volume per postman with the norm.
