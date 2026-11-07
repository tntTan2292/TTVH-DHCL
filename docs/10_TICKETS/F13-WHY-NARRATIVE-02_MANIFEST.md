# F13-WHY-NARRATIVE-02 Manifest

## 1. Ticket Information

- Ticket ID: `F13-WHY-NARRATIVE-02` (gap G4 of `docs/03_PLANNING/F13-GOLIVE-PLAN-01.md`)
- Name: `F1.3 Phân tích nguyên nhân: one sentence per route (main cause with its share, the lot when Không trọn lô dominates, little time left at arrival, tồn / hoàn as hints)`
- Owner: Claude Code / Opus 5.5 (scope, review, real render). **B1 backend: Claude Code / Sonnet 5.5. U1 screen: Antigravity** (after B1 is accepted). Does not change the Current Ticket.
- Branch: `codex/da-impl-006`.
- **Status: `READY FOR SONNET (B1)`**. `PO UI Check Required = Yes` (after U1).

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
