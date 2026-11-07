# F13-WHY-NARRATIVE-02 Manifest

## 1. Ticket Information

- Ticket ID: `F13-WHY-NARRATIVE-02` (gap G4 of `docs/03_PLANNING/F13-GOLIVE-PLAN-01.md`)
- Name: `F1.3 Phân tích nguyên nhân: one sentence per route (main cause with its share, the lot when Không trọn lô dominates, little time left at arrival, tồn / hoàn as hints)`
- Owner: Claude Code / Opus 5.5 (scope, review, real render). **B1 backend: Claude Code / Sonnet 5.5. U1 screen: Antigravity** (after B1 is accepted). Does not change the Current Ticket.
- Branch: `codex/da-impl-006`.
- **Status: `B1 DONE - WAITING FOR OPUS REVIEW` (2026-11-07, Sonnet 5.5)**. `PO UI Check Required = Yes` (after U1).

## 2. The PO problem statement (2026-11-05) this answers

"Tuyến 1: 90 % BG rơi vào lô bưu gửi đến không trọn lô nhập phát vào chiều qua nên dẫn đến tỷ lệ sụt giảm chỉ còn 10 % đạt". Today a route row only says "Không trọn lô chiếm x % (n BG)".

PO rules that apply (2026-11-04 / 05): one primary cause per parcel; objective causes before the BCVH are not the BCVH's fault; time left at arrival is a hint only; tồn / hoàn are never a cause, only a hint ("tuyến này tỷ lệ hoàn khá cao"); show, do not judge.

## 3. B1 backend (Sonnet) - technical scope

- Add to every row of `GET /api/f13/v2/why/routes` a `story` object, computed with the same WHERE as the row (counts must add up to the row):
  - `main`: the primary cause with the most failed parcels (Phát with its detail), count and share of the route's failed parcels; the second one when it has at least 20 % of them.
  - `lot` (only when Không trọn lô is the main cause): the lot(s) behind it, at most 3, each with `ma_lo`, failed parcels of the route in it, number of TMS batches of the lot, time of the last batch (from the same lot evidence the classifier uses: TMS scans of every parcel of the lot, BF Phát lot code).
  - `little_time`: failed parcels of the route with the hint `DEN_BCVH_CON_IT_GIO` and their share.
  - `return_hint`: parcels of the route with a return time in F4.2 (`fact_f42.thoi_gian_chuyen_hoan`) and the route's share against the BCVH's share; `stock_hint`: parcels without delivery at the end of the period. Both are reported as numbers only. Measure on a copy how often they are non-zero and propose a threshold for "khá cao" (for example twice the BCVH share and at least 3 parcels) in the report; Opus decides.
- One pure module `backend/src/services/f13v2/RouteStory.js` for the assembly; the queries in `CauseAggQueryService.js`. Do **not** edit `JourneyService.js`, `F13V2Controller.js`, `f13v2Routes.js`, `CauseClassifier.js`, `f13CauseConfig.js` (F13-JOURNEY-ROUTE-02 works on the journey files at the same time).
- Performance: `/why/routes` for a month of all BCVH must stay under 3 s on a copy (report before / after).
- Tests: the PO example (route with 9 of 10 failed parcels in one incomplete lot -> lot with batches and last batch time), second cause rule at 20 %, little-time count, return / stock counts, counts adding up to the row, scope (a BCVH account sees its own routes only).
- Restrictions: official F1.3 data, cause rules and the cause table unchanged; no build on the live database; no restart. Commit by pathspec only (never `User QIS.xlsx`, `.claude/skills/`, `graphify-out/`, `.graphifyignore`). Backend suites with `--experimental-sqlite`, one file at a time.

## 4. U1 screen (Antigravity, after B1 accepted)

The sentence under each route of Phân tích nguyên nhân (and in the route summary card): e.g. "Tuyến Thủy Xuân 1: 90 % BG không đạt rơi vào lô LO123 (2 đợt TMS, đợt cuối 15:40 ngày 05/11) - không trọn lô"; the hints in a lighter style after it ("Tỷ lệ hoàn 8 %, gấp 3 lần bưu cục"). Built in `f13WhyHelpers.js` / `F13V2WhyRouteTable.jsx`. Written in detail after B1.

## 5. Change log

- 2026-11-07: created by Claude Code / Opus 5.5 (plan F13-GOLIVE-PLAN-01 approved by the PO).
- 2026-11-07: B1 implemented by Claude Code / Sonnet 5.5, measured on a copy of the database; results in section 6. Stopped for the Opus review.

## 6. B1 results (Sonnet 5.5, 2026-11-07)

**Files**: new `backend/src/services/f13v2/RouteStory.js` (pure assembly, `STORY_CONFIG`: second cause from 20 %, at most 3 lots), `RouteStory.test.js` (8 tests), `CauseAggQueryService.story.test.js` (7 tests, fixture added up by hand); edited `CauseAggQueryService.js` only (`routes()` adds `story` to every row; new `_routeStories`, `_lotEvidence`, `_optionalAll`; +133 lines, no existing line changed). The files the manifest forbids are untouched. Suites pass with `--experimental-sqlite`, one file at a time: RouteStory 8, story 7, existing CauseAggQueryService 22, f13v2WhyRoutes.scope 5, f13v2Evidence 16.

**`story` object** on every row of `/why/routes` (also the `@NON_POSTMAN` / `@OTHER` rows):
- `main` {code, label, count, share of the row's failed parcels}: the cause line with the most failed parcels; Phát stays as its three lines (Chậm giao bưu tá / Phát chậm sau giao / Phát chưa rõ chi tiết). Only real causes compete: "Chờ Chuyên quản" and "chưa đủ căn cứ" stay in `cause_mix`, never become `main`. Ties keep the line order of `CAUSE_ORDER`. `null` when the route has no failed parcel with a cause.
- `second`: the next line when it has >= 20 % of the failed parcels (exactly 20 % counts).
- `lot`: only when `main` is Không trọn lô, top 3 lots by failed parcels of the route: `ma_lo`, `failed`, `share_of_failed`, `tms_batches`, `first_tms`, `last_tms`. The batches come from the same evidence as the classifier: BF Phát gives the parcels of the lot, F1.3 gives the TMS scan of each (every parcel of the lot, any BCVH; each parcel once; distinct times = batches; last by parsed time). A BCVH account learns batch times only, no other unit's volume. Without BF Phát rows the lot shows `tms_batches: 0`, `last_tms: null` (not an error).
- `little_time` {count, share}: failed parcels of the row with `DEN_BCVH_CON_IT_GIO`.
- `return_hint` / `stock_hint` {count, parcels, share, bcvh_share, ratio}: numbers only, no verdict. Return = distinct parcels of the row with a non-empty `fact_f42.thoi_gian_chuyen_hoan` in the window `D-10 .. D+5` (the journey window); stock = distinct parcels with no rated row (Đạt / Không đạt) in the period. `parcels` equals `distinct_bg` of the row. `bcvh_share` = sum over the BCVH's routes in the same WHERE (so route shares and BCVH share agree; a route filter narrows it as everywhere else). `ratio` = route share / BCVH share, null when the BCVH share is 0.
- Same WHERE as the row; a database without `fact_f42` / `fact_bf_phat` still answers (zeros).

**Measurement** on a copy of `database.sqlite` (October 2026, all BCVH, 125 rows, 114 routes with postmen), `routes()` called in one process:
- Time **before: 0.92-0.97 s** (Oct), 0.85 s (Sep). **After: 2.2-2.5 s first call, 1.7-1.9 s afterwards** (Oct), 1.7 s (Sep). Under the 3 s limit. First version (seven separate queries) took 2.8-4.7 s, so the return / stock / parcel counts were folded into one pass per parcel; lots and little time are two small queries; the lot evidence for 6 lots costs about 0.27 s.
- Main cause of the 114 routes: Phát chậm sau giao 59, Chậm giao bưu tá 46, Khai thác 3, **Không trọn lô 2**, none 4. Second cause (>= 20 %): 91 routes. Little time > 0 on 106 routes, >= 50 % of the failed parcels on 7.
- Example, Ô tô Nam giữa (Thuận Hóa), 1,175 failed: main Không trọn lô 517 (44 %), second Chậm giao bưu tá 304 (25.9 %), lots C340006410203 (162 parcels, 2 batches, last 09/10 08:09), C810011464207 (112, 4 batches, last 28/10 09:39), C600011418882 (69, 2 batches); little time 347 (29.5 %).
- **Return / stock frequency** (114 routes; city: 107,324 parcels, 846 with a return = 0.79 %, 1,059 stock = 0.99 %). BCVH shares: return 0 %-8.2 % (median route share 0.1 %, p90 3.3 %); stock 4.1 %-10.6 % per BCVH.

| Rule for "khá cao" | Return, routes flagged | Stock, routes flagged |
|---|---|---|
| count > 0 | 65 | 76 |
| count >= 3 | 32 | 47 |
| **ratio >= 2 and count >= 3** (the manifest's example) | **1** | **3** |
| ratio >= 1.5 and count >= 3 | 2 | 3 |
| ratio >= 3 and count >= 5 | 1 | 1 |
| share >= 10 % and count >= 3 | 1 | 3 |

  The only return route flagged is Phú Lộc_02 (Phú Lộc): 221 of 311 parcels returned (71 %), BCVH share 8.2 %, ratio 8.7. **Proposal**: `ratio >= 2 and count >= 3` (selective: 1 return route, 3 stock routes in a month; nothing noisy). If the Chuyên quản wants more routes shown, `ratio >= 1.5` adds one, `count >= 3` alone would flag 32 / 47 routes, mostly small routes at the BCVH average, so a ratio is needed. Not implemented in code: B1 delivers numbers only, Opus decides.

**Residual for the review**: Không trọn lô is the main cause of only 2 routes in October (it is 2,328 failed parcels city-wide against about 31,000 Phát), so the lot sentence will be rare; Phát lines dominate. The stock count uses "no rated row in the period", not an explicit delivery-at-period-end check against later months; a parcel rated after the period still counts as stock for that period. No screen (U1), no new table, no cache, nothing run on the live database, no build, no restart.
