# F13 Route Ranking Redesign — Plan Checkpoint 001

- Ticket: `F13-ROUTE-RANKING-REDESIGN-PLAN` (design record) / `F13-ROUTE-RANKING-REDESIGN-IMPL` (implementation, in progress)
- Status: `REMEDIATED / READY FOR PO RECHECK` (recheck scope: Item 2 and new Item 10 — see Section 12; PO NEW FINDING, `2026-08-03`, DELAYED-CASH METRICS MISSING)
- Date: `2026-08-03`
- Authors: static-code inspection by Antigravity (`docs/F13_ROUTE_RANKING_EVIDENCE_HANDOFF.md`), targeted data discovery and design plan by Claude Code–Opus, final scope lock by ChatGPT/CTO.
- Baseline: `7fd33ce130227a0c2b24d3b36aa0980bf8fc9ad3`; no product code changed in this ticket.

## 1. Discovery Basis

- Static code inspection (Antigravity, browser subagent `RESOURCE_EXHAUSTED`, no runtime/visual evidence): `docs/F13_ROUTE_RANKING_EVIDENCE_HANDOFF.md`.
- Targeted data discovery (Claude Code–Opus, read-only queries against `backend/src/db/database.sqlite`, `fact_f13`, 659,454 rows):
  - `fact_f13` has 45 columns; no postman/employee field exists anywhere in the database (6 tables total: `fact_f13`, `fact_f13_national`, `import_log`, `sqlite_sequence`, `sys_kpi_thresholds`, `system_config`). No route-to-postman mapping table exists.
  - `ket_qua_f13` domain is exactly `{Đạt, Không đạt, NULL}` — it is not a root-cause field.
  - Unevaluated (`danh_gia_2026 IS NULL`) share, last 30 days, Hue scope (`ma_tuyen LIKE '53%'`): 5.03% overall; 93.78% concentrated in the 7 PO-confirmed catalog routes; 0.49% in postman-classified routes.
  - `sys_kpi_thresholds` (Xanh ≥70 / Hồng 60–69.99 / Vàng 50–59.99 / Đỏ <50) exists in schema/seed but is read by no backend code, and its seed rows are duplicated 3x.
  - `loai_tuyen_phat` is 100% populated in Hue scope, 11 distinct values, exactly one value per route (verified: 0/92 routes have more than one value on the reference day).
  - Max routes per BCVH per day across all history: 35 (current `page_size=1000` is far in excess — client-side sort/filter confirmed safe).
  - Frontend hardcoded `from_date = '2026-06-23'` is 41 days stale versus the latest valid data date (`2026-08-02`); the database also contains 4 garbage future-dated rows (up to `2098-02-18`) that must be excluded when computing "latest valid date."

## 2. PO-Confirmed Business Objective

Recorded in `F13-ROUTE-RANKING-REDESIGN-PLAN_MANIFEST.md` Section 5 (`2026-08-03`): build an operational decision-support tool for route-level intervention need, priority, root cause, responsible postman, and next action — while preserving the full accepted filter/classification contract, and treating Route → Shipment drill-down as design-only pending separate authorization.

## 3. Locked Design Decisions (PO Approved / CTO Finalized, `2026-08-03`)

These decisions supersede the Opus design-plan draft (`priority tiers`, `<60% intervention threshold`, `≤20% unevaluated exclusion rule`, `Đỏ/Vàng/Xanh badges`) wherever they conflict. CTO explicitly cancelled that inferred threshold/tier logic.

1. **Default sort:** `Tỷ lệ đạt DESC` (passed_rate descending), consistent with BCVH Ranking's sort principle. Not `Không đạt DESC`, not `Tỷ lệ đạt ASC`.
2. **`sys_kpi_thresholds` is NOT used in MVP.** No color tiering, no `Đỏ/Vàng/Xanh` badges, no priority labels (`Cao/Trung bình/Thấp`), no `<60%` intervention threshold, no `≤20%` unevaluated-exclusion rule. All of this inferred logic from the draft plan is cancelled.
3. **Table columns (full set, no priority/tier column):** `Tổng BG`, `Đạt`, `Không đạt`, `Chuyển hoàn`, `Tỷ lệ đạt` — plus route identity columns (`Mã tuyến`, `Tên tuyến`) and the existing `Phân loại` badge. `Loại tuyến phát` may be added as an additional column/filter since it is 100%-covered and 1:1 per route. **[R1 correction, `2026-08-03`]** originally named `Chưa đánh giá`; PO UI Check corrected this to `Chuyển hoàn` (BLACK) — see Section 11.
4. **KPI row (MVP, 4 cards):**
   - Số tuyến phát sinh không đạt (count of routes with `total_failed > 0`)
   - Tỷ lệ đạt toàn BCVH = `ΣĐạt / ΣTổng BG`
   - Tổng BG không đạt = `Σtotal_failed`
   - Tổng số tuyến
5. **New filter:** `Chỉ tuyến có bưu gửi không đạt` (routes where `total_failed > 0`). This is a factual filter (no threshold, no inferred priority).
6. **BLACK / `Chuyển hoàn` data (returned shipments, `danh_gia_2026 IS NULL`):** must be shown as an explicit number/column, labeled `Chuyển hoàn`, not as a data-completeness gap. No color coding, no quality conclusion, no exclusion rule may be applied to routes carrying returned shipments. **[R1 correction, `2026-08-03`]** — originally described as "unevaluated data"; PO's locked SSOT defines this as a genuine classification (bưu gửi chuyển hoàn), not missing/unevaluated data. See Section 11.
7. **Shipment drill-down:** not rendered in MVP, not even as a disabled placeholder. Recorded in Deferred scope only (see Section 5).
8. **Default date:** must resolve to the latest valid data date not exceeding the current date, excluding garbage future-dated rows. The `2026-06-23` hardcode must not remain.
9. **Filter/classification contract:** `Tuyến bưu tá | Tất cả` labels and default, Hue `ma_tuyen LIKE '53%'` scope, the 7 PO-confirmed catalog routes, and `routeRankingFilters.js` remain fully unchanged.

## 4. Layout (PO Approved)

Two-column: ranking table ~65% width, selected-route context panel ~35% width; collapses to a single column below 1200px viewport width.

## 5. Deferred Scope (explicit — insufficient data, not a design choice)

| Item | What is missing | Condition to lift |
|---|---|---|
| Bưu tá phụ trách (responsible postman) | No column in `fact_f13` (45 columns checked); no route-to-postman mapping table anywhere in the database (6 tables checked) | A new data source: a PO-provided mapping catalog, or a postman field confirmed to exist in the upstream F1.3 source file (not yet checked — out of scope for this ticket) |
| Root cause / nguyên nhân F1.3 | `ket_qua_f13` domain is only `{Đạt, Không đạt, NULL}` — no field in `fact_f13` describes a reason | A reason/cause field in the upstream source, or a PO-defined derivation rule from timing fields (`thoi_gian_*`), which are not currently normalized |
| Route → Shipment drill-down | Design-only per PO; runtime requires its own separate validation and authorization | Separate PO/CTO authorization ticket |
| Trend / date-range comparison | Backend accepts a single `ngay_do_kiem = ?`; `to_date` has no path into the backend query | Backend change to accept a date range, out of scope here |

No dead UI, no placeholder blocks, and no fabricated data may be introduced for any Deferred item.

## 6. Explicitly Forbidden Inferences (binding on the implementation ticket)

- No priority tiering, no severity labels, no color-coded row/cell warnings of any kind.
- No `sys_kpi_thresholds` consumption.
- No threshold-based "cần can thiệp" (intervention) classification of any kind — the CTO-approved MVP identifies distress only via factual counts/filters (`Không đạt > 0`), not via a derived priority judgment.
- No quality conclusion drawn about a route from its `Chuyển hoàn` (BLACK/returned-shipment) count — the count must be shown as-is, correctly labeled, and never merged with `Không đạt`.
- No fabricated postman or root-cause data, and no disabled/placeholder UI standing in for them.
- No change to `passed_rate`'s calculation formula, to the filter/classification contract, or to `routeRankingFilters.js`.

## 7. Known Repository Defects Noted But Explicitly Out of Remediation Scope

- `sys_kpi_thresholds` seed rows are duplicated 3x in `backend/src/db/schema.sql`. Not remediated by this ticket or its implementation successor; not to be scoped as an incidental fix.
- 4 garbage future-dated rows exist in `fact_f13` (up to `2098-02-18`). Not remediated as a data-quality fix; the implementation ticket may only apply the minimum date filtering necessary to compute "latest valid date not exceeding current date" for this screen's default, per Section 3 item 8.

## 8. Acceptance Criteria (carried into the implementation ticket)

1. Default sort is `Tỷ lệ đạt DESC`; sortable columns work client-side.
2. Filter/classification contract (`Tuyến bưu tá | Tất cả`, `53%` scope, 7 catalog routes) is byte-identical to the PO-PASS state.
3. Table shows `Tổng BG`, `Đạt`, `Không đạt`, `Chuyển hoàn`, `Tỷ lệ đạt` with no color tiering or priority labels anywhere.
4. KPI row shows exactly the 4 cards in Section 3 item 4, with `Tỷ lệ đạt toàn BCVH` computed as `ΣĐạt / ΣTổng BG`.
5. `Chỉ tuyến có bưu gửi không đạt` filter works and introduces no threshold logic.
6. Routes with returned shipments (BLACK) show the `Chuyển hoàn` count plainly, correctly labeled; no color/quality treatment differs because of it, and it is never merged with `Không đạt`.
7. No Shipment drill-down UI (enabled or disabled) is rendered.
8. Default date resolves to the latest valid date ≤ current date, excluding future-dated garbage rows; no remaining `2026-06-23` hardcode.
9. No bưu tá or root-cause UI, placeholder, or fabricated data is present.

## 9. Handoff

`F13-ROUTE-RANKING-REDESIGN-PLAN` is closed with this checkpoint as its final design record. Next ticket: `F13-ROUTE-RANKING-REDESIGN-IMPL`, authorized by explicit PO approval and CTO scope finalization, executor `Claude Code–Sonnet`. See `docs/10_TICKETS/F13-ROUTE-RANKING-REDESIGN-IMPL_MANIFEST.md`.

## 10. Implementation Evidence (F13-ROUTE-RANKING-REDESIGN-IMPL, `2026-08-03`)

Executor: `Claude Code–Sonnet`. Baseline: `2f98e45f3394e787cf218de85390e6a25a049d36`, branch `codex/da-impl-006`, verified clean worktree before implementation.

Implemented exactly the scope authorized in the `BEGIN IMPLEMENTATION` directive (a subset of Section 3 confirmed as the binding MVP for this pass — `loai_tuyen_phat` from Section 3 item 3 was left unimplemented as it was optional ("may be added") and not named in the implementation directive):

- `frontend/src/features/route/RoutePerformancePage.jsx`: rewritten. Two-column desktop layout (ranking table `min-[1200px]:col-span-8` ≈ 65%, selected-route panel `min-[1200px]:col-span-4` ≈ 35%; single column below 1200px). Client-side sortable table defaulting to `passed_rate` DESC (`Tỷ lệ đạt` giảm dần), independent of the (still-present, contract-preserving) backend `sort`/`order` request parameters. Full column set `Tổng BG / Đạt / Không đạt / Chưa đánh giá / Tỷ lệ đạt` plus route identity and the existing classification badge. New `Chỉ tuyến có bưu gửi không đạt` filter (URL param `only_failed`). KPI row: `Tuyến phát sinh không đạt`, `Tỷ lệ đạt toàn BCVH = ΣĐạt/ΣTổng BG`, `Tổng BG không đạt`, `Tổng số tuyến` — all computed from the full fetched BCVH/route-type scope, unaffected by the local search/only-failed narrowing. Default date resolves via the existing `/f13/dashboard/meta` endpoint's `max_date` (which already excludes future-dated rows via `date(ngay_do_kiem) <= date('now','localtime')`, unmodified) when no `from_date` URL param is present; the `2026-06-23` hardcode is removed. Loading/error/empty/no-selected-route states are explicit; `Chưa đánh giá` is shown as a plain count with no color/quality treatment.
- `frontend/src/features/route/routeRankingCalculations.js`: new — extracted pure functions (`applyRouteFilters`, `sortRouteRows`, `computeRouteKpiStats`, `resolveDefaultRouteDate`, `toNumber`, `formatRate`) for unit testability.
- `frontend/src/features/route/routeRankingFilters.js`: unchanged.
- Deleted (orphaned, no longer imported anywhere, contained fabricated shell content contradicting the locked scope): `RouteExecutiveBrief.jsx`, `RoutePriorityAnalysis.jsx`, `RouteRootCause.jsx`, `RouteRecommendation.jsx`, `RouteDrilldown.jsx`, `RouteShellShared.jsx`.
- `backend/src/repositories/FactBuuGuiRepository.js`: additive only — added `total_unevaluated` to the existing `getRouteRanking` SQL aggregate (`SUM(CASE WHEN danh_gia_2026 IS NULL OR TRIM(danh_gia_2026) = '' THEN 1 ELSE 0 END)`). No WHERE/GROUP BY/scope change.
- `backend/src/services/F13DashboardService.js`: additive only — maps `unevaluated: item.total_unevaluated ?? 0` into the existing response shape. `passed_rate`'s formula (`_calculateRate`) is untouched.
- No `sys_kpi_thresholds` consumption, no color tiers, no priority labels, no intervention threshold, no root-cause or bưu tá UI, no Shipment drill-down UI (enabled or disabled) was introduced, per Section 6.

Validation:

- Backend: `node --test` on the full `backend/src` suite: `52/56` pass; the `4` failures (`live KPI database and HTTP payloads...`, `dashboard KPI invalid code returns HTTP 400`, `KPI all and missing ma_bcvh normalize...`, `monthly rank enrichment uses full prior months...`) are pre-existing at baseline `2f98e45f` (confirmed via `git stash` re-run before this change) and unrelated to Route Ranking; not remediated, per scope.
- Backend: 2 new test files (`FactBuuGuiRepository.routeRanking.test.js`, `F13DashboardService.routeRanking.test.js`), 4 tests, all pass — cover the additive `total_unevaluated` SQL column, the postman-scope `NOT IN` exclusion behavior, and that `passed_rate` is unchanged.
- Frontend: `routeRankingFilters.test.js` (existing PO-PASS contract test, source-string based) — unchanged, still passes (2/2), confirming no regression to the accepted filter/classification contract.
- Frontend: new `routeRankingCalculations.test.js`, 13 tests, all pass — covers default sort (`passed_rate` DESC), sort-direction toggling, the `ΣĐạt/ΣTổng BG` KPI formula (explicitly asserted not to equal a naive per-route average), failed-route counting, the `Chỉ tuyến có bưu gửi không đạt` filter, date-default resolution (explicit param wins; falls back to latest valid date; resolves to empty — missing-data state — when neither exists), and zero/undefined-safe numeric handling.
- Frontend: `oxlint` on all changed files — zero warnings/errors. `vite build` — succeeds.
- Diff scope verified: only Route Ranking frontend/backend files and their new tests changed; no other product code touched.

Residual: implementation not yet browser-verified or PO-accepted. `F13-ROUTE-RANKING-REDESIGN-IMPL` remains `PO UI Check Required = Yes`; this checkpoint does not constitute a PO PASS.

## 11. Remediation Evidence R1 (`2026-08-03`) — PO UI Check Item 2 FAIL, BLACK/Chuyển hoàn naming

PO UI check on commit `ee73feed9adb93300d0d976ef1fd462abbe3e3de`: Items 1, 3, 4, 5, 6, 7, 8, 9 `PASS`. **Item 2 `FAIL`** — the implementation named the `danh_gia_2026 IS NULL` group `unevaluated`/`Chưa đánh giá` (implying missing/incomplete data). PO's locked SSOT: this group is `BLACK` = bưu gửi chuyển hoàn (returned shipment), a genuine business classification, not a data-completeness gap.

SSOT locked by Product Owner:

- `Đạt`: `Đánh giá KPI 2026 = Đạt`.
- `Không đạt`: `Đánh giá KPI 2026 = Không đạt`.
- `BLACK`: bưu gửi chuyển hoàn — not missing/unevaluated.
- `Tổng BG = Đạt + Không đạt + Chuyển hoàn`.
- `Tỷ lệ F1.3 = Đạt / Tổng BG`.
- `Không đạt` and `Chuyển hoàn` must never be merged.

Targeted verification before fixing (no broad audit, no browser):

- `danh_gia_2026`'s only values across the entire `fact_f13` table (not scope-limited to Hue/30-day — 659,454+ rows total) are `{Đạt, Không đạt, NULL}`; no literal `BLACK` string exists. `NULL` is the encoding for BLACK/chuyển hoàn.
- Cross-checked against `docs/06_REVIEWS/Import/TODAY-002-R1_KPI_2026_SOURCE_COLUMN_RECOVERY.md` and `TODAY-002-R2_KPI_2026_DASHBOARD_CONSISTENCY_RECOVERY.md`, both independently describing this same `NULL` population as "returned-shipment ... population inclusion" for `danh_gia_2026`.
- Conclusion: the existing SQL condition (`danh_gia_2026 IS NULL OR TRIM(danh_gia_2026) = ''`) was already counting exactly the BLACK/chuyển hoàn population. This was a **pure naming defect**, not a classification-logic defect — no new logic was introduced.

Fix (rename only):

- `backend/src/repositories/FactBuuGuiRepository.js`: SQL alias `total_unevaluated` → `total_returned`.
- `backend/src/services/F13DashboardService.js`: mapped field `unevaluated` → `returned`.
- `frontend/src/features/route/RoutePerformancePage.jsx`: column/label `Chưa đánh giá` → `Chuyển hoàn`; variable `unevaluated` → `returned`; note text replaced with `Bưu gửi chuyển hoàn, được ghi nhận BLACK trong Đánh giá KPI 2026.`; all "chưa đánh giá / chưa có kết quả / chưa đủ dữ liệu" wording removed.
- Items 1, 3–9 (already PO PASS) untouched: `Tổng BG`, `Đạt`, `Không đạt`, default sort, the 4 KPI cards, the existing filter, the two-column layout, and all previously accepted content.

Validation:

- Backend `node --test` full suite: 50/54 pass; same 4 pre-existing baseline failures as before (unrelated to Route Ranking), unchanged.
- `FactBuuGuiRepository.routeRanking.test.js` + `F13DashboardService.routeRanking.test.js`: 5/5 pass — renamed to `total_returned`/`returned`, plus a new SSOT test asserting `Tổng BG = Đạt + Không đạt + Chuyển hoàn` and that `Không đạt` is never merged with `Chuyển hoàn`.
- New `RoutePerformancePage.blackReturned.test.js`: 2/2 pass — asserts `Chuyển hoàn`/`row.returned`/`route.returned`/BLACK tooltip text are present, asserts `Chưa đánh giá`/`unevaluated` are fully absent, and asserts the PO-PASS items 1/3–9 markers (`Tổng BG`/`Đạt`/`Không đạt` labels, `passed_rate`/`desc` default sort, `only_failed` filter) remain unchanged.
- `routeRankingCalculations.test.js`: 13/13 pass — fixture field renamed for consistency; the calculation functions are field-name-agnostic and required no logic change.
- `routeRankingFilters.test.js` (existing PO-PASS contract): 2/2 pass, unmodified, no regression.
- `oxlint`: zero warnings/errors on changed files. `vite build`: succeeds.
- Diff scope verified: only the `unevaluated` → `returned`/`Chuyển hoàn` rename across Route Ranking files and their tests.

Status after R1: `REMEDIATED / READY FOR PO RECHECK`. **Recheck scope is Item 2 only** — Items 1, 3–9 do not need to be rechecked as they were not touched by this remediation. Not closed; no PO PASS claimed.

## 12. Scope Extension R2 (`2026-08-03`) — PO NEW FINDING: DELAYED-CASH METRICS MISSING (Item 10)

PO finding: Route Ranking was missing two governance-locked KPIs already implemented and `PO PASS` on BCVH Ranking — `Số BG chậm nộp tiền` and `Tỷ lệ chậm nộp tiền`. Authorized as a **targeted scope extension within this open ticket**, explicitly not a Route Ranking redesign re-authorization.

### SSOT read before implementing (targeted, not a broad audit)

- `backend/src/engine/rules/RuleF13302.js`: bypasses `danh_gia_2026 === 'Đạt'`; requires both `thoi_gian_ptc` and `thoi_gian_nop_tien` to parse; delayed only when `nop - ptc > 3` hours (strict).
- `backend/src/engine/rules/RuleRegistry.js`: `execute(facts)` counts `danh_gia_2026 !== 'Đạt'` as the eligible denominator (`totalKhongDat`), runs all registered rules per fact, and computes `f13_303_rate = totalViPham / totalKhongDat` (`0` when denominator is `0`).
- `backend/src/services/F13DashboardService.js`'s existing BCVH Ranking usage: `_buildF13302SummaryMap` (per-BCVH grouping) and `_buildF13302AggregateSummary` (flat aggregate, already shaped exactly as `{ delayed_cash_handover_count, delayed_cash_handover_eligible_count, f13_303_rate }`), wired into `getBcvhRanking`.
- `docs/10_TICKETS/F13-BCVH-RANKING-REDESIGN-IMPL_MANIFEST.md` and `docs/06_REVIEWS/BCVH/F13_BCVH_RANKING_REDESIGN_IMPL_WAVE2_CHECKPOINT_001.md`: confirm the same denominator/threshold contract and record the `2026-07-28` runtime evidence `334/1536 = 21.7%`.

### Reuse, not duplication

- `_buildF13302AggregateSummary(facts)` is called **unmodified** with Route Ranking's route-scoped fact set — no copy, no altered business rule.
- `_buildF13302SummaryMap(facts, groupKey = 'ma_bcvh')` was generalized from a hardcoded `ma_bcvh` grouping to an explicit `groupKey` parameter. The default preserves BCVH Ranking's existing call site byte-for-byte; Route Ranking calls it with `groupKey = 'ma_tuyen'`. `RuleF13302` and `RuleRegistry` themselves were not touched.
- New `FactBuuGuiRepository.getRouteRankingFacts(date, bcvh, options)` mirrors `getRouteRanking()`'s exact WHERE clause (date, BCVH, Hue `53%` scope, postman/all + confirmed-non-postman exclusion), unpaginated, selecting only `ma_tuyen, danh_gia_2026, thoi_gian_ptc, thoi_gian_nop_tien`.

### Implementation

- Backend: `F13DashboardService.getRouteRanking(...)` fetches `routeFacts`, groups by `ma_tuyen`, and attaches `delayed_cash_handover_count`, `delayed_cash_handover_eligible_count`, `f13_303_rate` to each row (replacing the prior hardcoded `f13_303_rate: 0 // Delegate to D4`), plus `meta.delayed_cash_handover_summary` for the aggregate — computed over the full unpaginated route scope, independent of the ranking list's `page`/`page_size`.
- Frontend: `RoutePerformancePage.jsx` table header restructured to a two-row `<thead>` (group row + sortable sub-column row) with a new `Chậm nộp tiền` group (`Số BG chậm nộp tiền`, `Tỷ lệ chậm nộp tiền`) placed after `Kết quả ngày đánh giá` and before `Phân loại`. Cells bind directly to `row.delayed_cash_handover_count`/`row.f13_303_rate` — no client-side division formula. Selected-route panel gained a factual `Chậm nộp tiền` block (count, eligible sample size, rate, caption `Chậm khi thời gian nộp tiền sau thời gian PTC trên 3 giờ.`). No color, threshold, severity, or recommendation text introduced.
- New `formatDelayedCashRate(value)`: `null`/`undefined` → `—` (unavailable per contract); any real number including `0` → a normal percentage, so `0%` is never conflated with unavailable.

### Data-drift note (not a defect)

Re-deriving the PO's cited `2026-07-28` BCVH reference (`334/1536 = 21.7%`) via the same live `_buildF13302AggregateSummary` path on `2026-08-03` produced `390/1553 = 25.1%` for the same historical date. The calculation path is verified byte-identical to BCVH Ranking's (same function, unmodified); the underlying `fact_f13` rows for that date have changed since the reference was captured, consistent with this system's known pattern of later imports/corrections touching historical dates (see `TODAY-002-R1`/`R2`). PO recheck evidence will show current-data numbers, not the cited reference numbers — this is expected, not a scope or logic error.

### Validation

- Backend `node --test` full suite: 61/65 pass; same 4 pre-existing baseline failures as before R1/R2, unchanged. `F13DashboardService.recovery.test.js` (BCVH Ranking regression, 23 tests): 23/23 pass — confirms the `_buildF13302SummaryMap` generalization does not change BCVH Ranking's output.
- New `F13DashboardService.routeDelayedCash.test.js`, 9/9 pass: row-level fields; `>3h` delayed vs exactly-`3h` not delayed; missing/invalid timestamps stay in denominator only; `Đạt` excluded from denominator; zero denominator → `0%`; per-route isolation (no cross-route leakage); aggregate `Σdelayed/Σeligible` not an average of per-route rates; aggregate unaffected by pagination; existing route-classification/exclusion filter passed through unchanged to the facts fetch.
- `FactBuuGuiRepository.routeRanking.test.js` gained 2 tests: `getRouteRankingFacts` WHERE-clause parity with `getRouteRanking`, not paginated, correct postman/all exclusion behavior.
- New `RoutePerformancePage.delayedCash.test.js`, 5/5 pass: `Chậm nộp tiền` group present with the two PO-mandated sub-column labels, positioned after `Kết quả ngày đánh giá`; cells bind to backend fields only (no client formula); selected-route panel shows count/eligible/rate and the exact `>3h` caption; no new severity/threshold/recommendation text; PO-PASS markers (`Chuyển hoàn`, default sort, only-failed filter, `data-testid`) intact.
- `routeRankingCalculations.test.js` gained 3 `formatDelayedCashRate` tests (17/17 total pass).
- `oxlint`: zero warnings/errors. `vite build`: succeeds.
- Diff scope verified: `FactBuuGuiRepository.js` (additive `getRouteRankingFacts`), `F13DashboardService.js` (additive delayed-cash wiring + backward-compatible `_buildF13302SummaryMap` generalization), `RoutePerformancePage.jsx`, `routeRankingCalculations.js`, and their tests. No BCVH Ranking, Dashboard, Import, schema, or historical-data file touched; `RuleF13302`'s `>3h` threshold unchanged.

Status after R2: `REMEDIATED / READY FOR PO RECHECK`. **Recheck scope is Item 2 (BLACK/Chuyển hoàn) and Item 10 (delayed-cash metrics)** — Items 1, 3–9 remain untouched and already PO PASS. Not closed; no PO PASS claimed; no next ticket activated.
