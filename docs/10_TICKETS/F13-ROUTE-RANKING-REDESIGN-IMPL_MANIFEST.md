# F13-ROUTE-RANKING-REDESIGN-IMPL Manifest

## 1. Ticket Information

- Ticket ID: `F13-ROUTE-RANKING-REDESIGN-IMPL`
- Ticket Name: `Route Ranking Redesign — Implementation`
- Phase: `F1.3 Operational Module`
- Owner: `Claude Code`
- Governance Version: `V2 Active`
- Activation authority: `PO APPROVED / CTO FINALIZED — IMPLEMENTATION AUTHORIZED`
- Designated executor: `Claude Code–Sonnet`
- Baseline commit: `bf0cfc605530b0f3e989ed50639a9316173f5a05` (branch `codex/da-impl-006`; verify `HEAD` and clean worktree before starting implementation)
- Activation date: `2026-08-03`

## 2. Objective

Implement the CTO-finalized Route Ranking redesign: an operational table/KPI/panel surface that identifies routes with failed shipments and shows evaluation-completeness plainly, without any inferred priority, severity, or color-tier logic, while preserving the accepted filter/classification contract exactly.

## 3. Current Status

- Current state: `ACTIVE / REMEDIATED / READY FOR PO RECHECK`
- PO UI Check Required: `Yes — recheck required on Item 12 (BCVH Ranking default-date fix, Section 16 R7); Items 2, 11, and the shared-engine-synced Item 10 numbers are PO PASS on commit 4e80fdfd; Items 1, 3-9 already PO PASS on commit ee73feed`
- PO Product Status: `PO CHECK (commit ee73feed): Items 1, 3-9 PASS. Item 2 (Chuyển hoàn/BLACK, R1) PO PASS. Item 10 (table/panel delayed-cash UI, commit 185b7dd) PO PASS; its numbers were corrected twice (R5, R6) and PO PASSED the shared-engine-synced result on commit 4e80fdfd. Item 11 (BG CHẬM NỘP TIỀN widget) PO PASS on commit 4e80fdfd. PO NEW FINDING (2026-08-03): BCVH Ranking's date filter defaulted to a hardcoded stale date (2026-07-28) instead of the latest date with real data — implemented as Item 12 (Section 16 R7), a targeted BCVH Ranking fix authorized within this open ticket. Ticket not closed; no PO PASS declared for Item 12 yet.`

## 4. Required Reading

- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/10_TICKETS/F13-ROUTE-RANKING-REDESIGN-PLAN_MANIFEST.md` (closed planning ticket)
- `docs/06_REVIEWS/Route/F13_ROUTE_RANKING_REDESIGN_PLAN_CHECKPOINT_001.md` (binding scope — read in full before writing any code)
- `docs/F13_ROUTE_RANKING_EVIDENCE_HANDOFF.md` (static code inspection evidence)
- `docs/10_TICKETS/F13-INTERNAL-ROUTE-AUDIT_MANIFEST.md` (accepted filter/classification contract, `PO PASS`)
- `docs/07_REFERENCE/Shared_Business/F13_INTERNAL_ROUTE_CATALOG.md` (SSOT route classification catalog)
- `docs/06_REVIEWS/Route/ROUTE_PERFORMANCE_CENTER_REVIEW.md` (frozen architecture review — Screen Architecture zones)
- `docs/02_ARCHITECTURE/ROUTE/ROUTE_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` (frozen information architecture)

## 5. Business Context

- Business problem: current Route Ranking (`/f13/ranking/route`) is a runtime-backed listing with shell-only widgets (`RouteExecutiveBrief`, `RoutePriorityAnalysis`, `RouteRootCause`, `RouteRecommendation`) that carry no real analysis, a broken sort contract (frontend requests `sort=passed_rate` but backend silently falls back to `total_bg` because `passed_rate` is not in `allowedSorts`), developer-facing KPI cards (`Search`, `Interval`), and a stale hardcoded default date.
- Business impact: managers cannot use the screen to identify which routes need attention without reading every row manually.
- Approved business rule constraints — must remain byte-identical to the `PO PASS` state, no exception:
  - Filter labels exactly `Tuyến bưu tá | Tất cả`; default filter `Tuyến bưu tá`.
  - Hue Route Ranking includes only route codes starting with `53`.
  - The 7 PO-confirmed customer-pickup/internal post-office routes are excluded from postman-route counts under `Tuyến bưu tá` and shown as `Nhận tại bưu cục` under `Tất cả`.
  - `frontend/src/features/route/routeRankingFilters.js` is not modified.
- Binding scope decisions (PO approved, CTO finalized `2026-08-03` — see checkpoint Section 3 for full text): default sort `Tỷ lệ đạt DESC`; no `sys_kpi_thresholds` usage; no priority tiers, severity labels, color-coded warnings, or intervention thresholds of any kind; full column set `Tổng BG / Đạt / Không đạt / Chuyển hoàn / Tỷ lệ đạt`; 4-card KPI row as specified; new filter `Chỉ tuyến có bưu gửi không đạt`; no Shipment drill-down UI in any form; default date resolves to latest valid date ≤ current date excluding future-dated garbage rows.
- SSOT business rule locked by Product Owner (`2026-08-03`, PO UI Check on commit `ee73feed`, Item 2 recheck):
  - `Đạt`: bưu gửi có `Đánh giá KPI 2026 = Đạt`.
  - `Không đạt`: bưu gửi có `Đánh giá KPI 2026 = Không đạt`.
  - `BLACK` (`danh_gia_2026 IS NULL` in `fact_f13`): bưu gửi chuyển hoàn — not missing/unevaluated data. Confirmed by `docs/06_REVIEWS/Import/TODAY-002-R1_KPI_2026_SOURCE_COLUMN_RECOVERY.md` and `TODAY-002-R2_KPI_2026_DASHBOARD_CONSISTENCY_RECOVERY.md` ("returned-shipment NULL population"), and by direct query confirming `danh_gia_2026`'s only values across the full `fact_f13` table are `{Đạt, Không đạt, NULL}`.
  - `Tổng BG = Đạt + Không đạt + Chuyển hoàn`.
  - `Tỷ lệ F1.3 = Đạt / Tổng BG` (unchanged formula, now correctly understood as excluding neither Không đạt nor Chuyển hoàn from the denominator, per the existing `_calculateRate(passed, total_bg)`).
  - `Không đạt` and `Chuyển hoàn` (BLACK) must never be merged into a single number or label.
- SSOT delayed-cash business rule (`2026-08-03`, PO NEW FINDING, targeted scope extension — see Section 9/16 R2), authoritative implementation already `PO PASS` on BCVH Ranking (`RuleF13302`/`RuleRegistry`, `F13-BCVH-RANKING-REDESIGN-IMPL_MANIFEST.md`, `F13_BCVH_RANKING_REDESIGN_IMPL_WAVE2_CHECKPOINT_001.md`), reused unmodified for Route Ranking:
  - Denominator (`delayed_cash_handover_eligible_count`): canonical facts in the selected date/scope with `danh_gia_2026 != Đạt`, per `RuleRegistry.execute`'s existing `totalKhongDat` count. **[R5 correction, `2026-08-03`]** — PO corrected this: the denominator must be `danh_gia_2026 = 'Không đạt'` only, excluding `Chuyển hoàn`/BLACK (`danh_gia_2026 IS NULL`) entirely, because returned shipments never go through the cash-remittance workflow. First implemented as a Route-Ranking-local fact filter (R5). **[R6 correction, `2026-08-03`]** — PO directed this be synced into the shared engine instead: `RuleF13302.evaluate` and `RuleRegistry.execute` themselves now restrict both the denominator and the delay evaluation to `danh_gia_2026 = 'Không đạt'`, so BCVH Ranking and Route Ranking compute identically; the Route-Ranking-local filter from R5 was removed as no longer needed. See Section 16 R6 and `docs/07_REFERENCE/Legacy/F1.3/F13_303_DEFINITION.md` Section 5.
  - A shipment counts as delayed only when `thoi_gian_ptc` and `thoi_gian_nop_tien` both parse validly and `thoi_gian_nop_tien - thoi_gian_ptc > 3` hours (strict, per `RuleF13302`; not `2` hours).
  - Missing/invalid timestamps stay in the denominator but are never counted as delayed.
  - Zero denominator publishes `0%`, not a fallback or `—`.
  - Canonical published rate field: `f13_303_rate`. Never `delayed_count / total_bg`; never an average of per-route/per-BCVH rates.
  - No frontend fallback formula is permitted.
  - Runtime reference cited by PO for BCVH scope, `2026-07-28`: `334 / 1536 = 21.7%`. Re-derived via the same live `_buildF13302AggregateSummary` path on `2026-08-03` gave `390 / 1553 = 25.1%` for the same date — expected data drift (later imports/corrections add rows to historical dates in this system; see `TODAY-002-R1`/`R2` for precedent of this behavior), not a defect: the calculation path is verified identical, only the underlying `fact_f13` rows for that date differ from when the reference was captured.

## 6. Technical Context

- Frontend route: `/f13/ranking/route` → `frontend/src/features/route/RoutePerformancePage.jsx` (registered in `frontend/src/App.jsx:81`).
- API client: `frontend/src/api/F13DashboardClient.js:64` — `getRouteRanking(date, bcvh, page, pageSize, sort, order, routeType)`.
- Backend route: `backend/src/routes/f13Routes.js:22` — `GET /ranking/route` → `DashboardController.getRoute`.
- Service: `backend/src/services/F13DashboardService.js:982` — `getRouteRanking(...)`.
- Repository: `backend/src/repositories/FactBuuGuiRepository.js:197` — raw SQL against `fact_f13`; `allowedSorts = ['total_bg','total_passed','total_failed']` (does not include `passed_rate`); hardcoded `ma_tuyen LIKE '53%'` scope.
- Widgets to be replaced/retired: `RouteExecutiveBrief.jsx`, `RoutePriorityAnalysis.jsx`, `RouteRootCause.jsx`, `RouteRecommendation.jsx`, `RouteDrilldown.jsx` (all under `frontend/src/features/route/`). Disposition (edit vs. delete) is an implementation-time technical decision; content of any retained file must match the CTO-locked scope (Section 5) — no shell/placeholder content may remain.
- `sys_kpi_thresholds` table exists (`backend/src/db/schema.sql`) but must NOT be read or consumed by this ticket, per checkpoint Section 2/6.
- Shared delayed-cash engine (`backend/src/engine/rules/RuleF13302.js`, `RuleRegistry.js`): as of R6 (`2026-08-03`), restricts F13_303 to `danh_gia_2026 = 'Không đạt'` for both the denominator and the delay evaluation — used identically by both `F13DashboardService.getBcvhRanking` and `getRouteRanking`. Canonical definition: `docs/07_REFERENCE/Legacy/F1.3/F13_303_DEFINITION.md`.

## 7. Runtime Context

- Implemented, not yet browser/runtime-verified by PO. Implementation evidence and technical validation results are recorded in `docs/06_REVIEWS/Route/F13_ROUTE_RANKING_REDESIGN_PLAN_CHECKPOINT_001.md` Section 10.

## 8. Related Review

- Review document: `docs/06_REVIEWS/Route/F13_ROUTE_RANKING_REDESIGN_PLAN_CHECKPOINT_001.md`
- Review status: `CLOSED / SCOPE LOCKED`
- Key evidence: see checkpoint Sections 1–3 for full data-discovery basis and locked decisions.

## 9. Related PO Findings

- PO NEW FINDING — DELAYED-CASH METRICS MISSING (`2026-08-03`): Route Ranking was missing `Số BG chậm nộp tiền` and `Tỷ lệ chậm nộp tiền`, already implemented and `PO PASS` on BCVH Ranking. Authorized as a targeted scope extension within this open ticket, not a Route Ranking redesign re-authorization.
- Implemented as Item 10 (Section 16 R2), reusing `RuleF13302`/`RuleRegistry` and the same aggregate-summary execution path as BCVH Ranking, unmodified.
- PO RUNTIME FAIL — DELAYED-CASH METRICS ALL ZERO (`2026-08-03`, commit `62753c0`): PO observed `Số BG chậm nộp tiền = 0` and `Tỷ lệ chậm nộp tiền = 0%` on every route, including the selected-route panel. Diagnosed and remediated — see Section 16 R3. Root cause: a stale backend server process, not a code defect. **Confirmed PO PASS on commit `185b7dd`** — the table columns and selected-route panel block are accepted and must not be re-touched absent a regression.
- PO NEW FINDING — DELAYED-CASH KPI WIDGET MISSING (`2026-08-03`, commit `185b7dd`): the 4th KPI widget (`Tổng số tuyến`) must be replaced with a `BG CHẬM NỘP TIỀN` widget bound strictly to `meta.delayed_cash_handover_summary`. Implemented as Item 11 (Section 16 R4). Pending first PO check.
- PO SSOT CORRECTION — DELAYED-CASH DENOMINATOR MUST EXCLUDE CHUYỂN HOÀN (`2026-08-03`, commit `2a0a06d`): while reviewing the new widget, PO identified that the eligible denominator (`543` for `2026-08-02`/BCVH `533140`) included `87` `Chuyển hoàn` (BLACK) facts alongside `456` `Không đạt` facts, and confirmed the correct rate must be `delayed / Không đạt` only (`116/456 = 25.4%`, not `116/543 = 21.4%`) — returned shipments never enter the cash-remittance workflow. Diagnosed and remediated — see Section 16 R5. This corrects the denominator scope stated in Section 5 for Route Ranking specifically; `RuleF13302`/`RuleRegistry` and BCVH Ranking's own denominator are unchanged. **Confirmed PO PASS after being synced into the shared engine on commit `4e80fdfd`** (Section 16 R6) — Items 2, 10, 11 all PO PASS as of that commit.
- PO NEW FINDING — BCVH RANKING DEFAULT DATE FILTER STALE (`2026-08-03`, commit `4e80fdfd`): BCVH Ranking's date filter defaulted to a hardcoded `2026-07-28` instead of the latest date with real data. Authorized as a targeted BCVH Ranking fix within this open ticket (explicitly in scope this time, unlike prior tickets' "do not touch BCVH Ranking" boundary). Implemented as Item 12 (Section 16 R7). Pending PO recheck.

## 10. Documents To Update

- This manifest, on implementation completion/closure.
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`, `PROJECT_PROGRESS.md`, `docs/01_GOVERNANCE/DOCUMENT_INDEX.md` on closure.
- A closure checkpoint under `docs/06_REVIEWS/Route/` recording implementation evidence and PO UI check result.

## 11. Validation

- Initial implementation (commit `ee73feed`): `oxlint` clean, `vite build` succeeds, backend 52/56 pass (4 pre-existing baseline failures unrelated to Route Ranking), 19 Route Ranking-scoped tests pass.
- Remediation R1 (Item 2, commit `6133a46`): `oxlint` clean, `vite build` succeeds, backend 50/54 pass (same 4 pre-existing baseline failures).
- Remediation R2 / scope extension (Item 10, this commit): `oxlint` on all changed files — zero warnings/errors. `vite build` — succeeds. Backend full suite `node --test`: 61/65 pass; the same 4 pre-existing baseline failures, unchanged, unrelated to Route Ranking. `F13DashboardService.recovery.test.js` (BCVH Ranking regression check, 23 tests) — 23/23 pass, confirming the generalized `_buildF13302SummaryMap(facts, groupKey)` did not change BCVH Ranking's output.
- Automated tests: `routeRankingFilters.test.js` (existing PO-PASS contract) — 2/2 pass, unmodified. `routeRankingCalculations.test.js` — 17/17 pass (incl. 4 new `formatDelayedCashRate` tests: genuine `0%` vs `null`/`undefined` → `—`). `RoutePerformancePage.blackReturned.test.js` — 2/2 pass. New `RoutePerformancePage.delayedCash.test.js` — 5/5 pass (column group present with correct sub-column labels and ordering after "Kết quả ngày đánh giá"; cells bind to `row.delayed_cash_handover_count`/`formatDelayedCashRate(row.f13_303_rate)` with no client-side division formula; selected-route panel shows count/eligible/rate and the exact `>3h` caption; no new severity/threshold/recommendation text; PO-PASS markers intact). `FactBuuGuiRepository.routeRanking.test.js` — 4/4 pass (added: `getRouteRankingFacts` mirrors `getRouteRanking`'s WHERE clause, not paginated, and correctly does/does not apply the `NOT IN` exclusion per filter). `F13DashboardService.routeRanking.test.js` — 5/5 pass. New `F13DashboardService.routeDelayedCash.test.js` — 9/9 pass (row-level count/eligible/rate; `>3h` delayed vs exactly-`3h` not delayed; missing timestamps stay in denominator, not numerator; `Đạt` excluded from denominator; zero denominator → `0%`; per-route isolation; aggregate `Σ/Σ` not average; aggregate unaffected by pagination; existing route-classification filter passed through unchanged).
- Remediation R3 (PO RUNTIME FAIL diagnosis, this commit): root cause was **not a code defect** — the backend process listening on port `5050` (PID `6276`) had started at `2026-08-03 09:36:20`, before every one of today's 5 commits (`10:35`→`14:52`), and had never been restarted, so it was still serving the pre-Item-10 code (hardcoded `f13_303_rate: 0`, no `delayed_cash_handover_count`/`eligible_count` fields). Confirmed via direct invocation of `FactBuuGuiRepository.getRouteRankingFacts`, `F13DashboardService._buildF13302SummaryMap`/`_buildF13302AggregateSummary`, and `DashboardController.getRoute` against the real database for `2026-07-28`/BCVH `533140` — all correct and non-zero (see evidence table in Section 16 R3). Fix: restarted the backend process (new PID `28920`) using the project's own standard start command (`node server.js`, per `TTVH_ControlCenter.ps1`); zero product code changed.
- Runtime validation (post-restart, real HTTP against the live server, real database): new `DashboardController.routeDelayedCash.integration.test.js`, 2/2 pass — full end-to-end path (real login, real `/f13/ranking/route` call) confirms nonzero delayed-cash values, `Σrow = aggregate`, aggregate `Sum/Sum` formula holds, and pagination does not shrink the aggregate.
- Browser validation: **not performed** — logging in as the Product Owner's user requires entering credentials, which is not permitted; equivalent evidence was captured via a real authenticated HTTP call using the project's existing test-admin fixture (`admin`/`admin123`, already used by `DashboardController.r6.integration.test.js`). No PO PASS is claimed on this basis.
- Diff scope verified: **zero product code changed** in this remediation. Only one new file added: `backend/src/controllers/DashboardController.routeDelayedCash.integration.test.js`. (Prior remediation's diff — `FactBuuGuiRepository.js` new `getRouteRankingFacts` method, `F13DashboardService.js` generalized `_buildF13302SummaryMap` grouping key + wired delayed-cash fields, `RoutePerformancePage.jsx`, `routeRankingCalculations.js`, and their tests — remains as committed in `62753c0`, confirmed correct.) No BCVH Ranking, Dashboard, Import, schema, or historical-data file touched.
- Item 11 (`BG CHẬM NỘP TIỀN` widget, commit `2a0a06d`): `oxlint` clean on changed files. `vite build` succeeds. Frontend suite `node --test src/features/route/*.test.js`: 33/33 pass — the 25 pre-existing tests (contract, sort, KPI, filter, date, BLACK/`Chuyển hoàn`, delayed-cash table/panel) pass unmodified (no regression), plus 4 new `computeDelayedCashWidget` tests (binds to the aggregate, genuine `0`/`0.0%` vs `—` for a missing contract, ignores any extraneous fields like `total_bg`) and 4 new `RoutePerformancePage.delayedCashWidget.test.js` source-string tests (widget present with the exact label and binding expression, `Tổng số tuyến` fully removed, no page-row summation/average/`RuleF13302` recompute/`delayed_count / total_bg` pattern, all 3 retained widgets and the Item 10 table/panel markers intact, no new severity/threshold text). Diff scope: only `RoutePerformancePage.jsx`, `routeRankingCalculations.js`, and their tests — no backend file touched.
- Remediation R5 (SSOT denominator correction, this commit): verified with real data for `2026-08-02`/BCVH `533140`/`route_type=all`: `456` `Không đạt` facts, `87` BLACK facts, `0` of the `116` delayed facts came from BLACK — confirming the fix is a pure denominator-scope correction with no numerator ambiguity for this sample. Fix: filter `Chuyển hoàn` (BLACK, `danh_gia_2026 IS NULL`) out of `routeFacts` before calling `_buildF13302SummaryMap`/`_buildF13302AggregateSummary` in `F13DashboardService.getRouteRanking`, so only `Đạt` (no-op, already bypassed by the rule) and `Không đạt` facts feed the engine. `RuleF13302`/`RuleRegistry` source code, and their use in BCVH Ranking, are untouched. Confirmed post-fix via a real HTTP call to the restarted backend (new PID `8384`): `116/456 = 25.4%`, matching PO's expectation exactly. `oxlint` clean, backend full suite `node --test`: 66/70 pass (same 4 pre-existing baseline failures). `F13DashboardService.routeDelayedCash.test.js` rewritten with an explicit fixture proving a BLACK fact with a qualifying `>3h` gap is excluded from both numerator and denominator (11/11 pass); `DashboardController.routeDelayedCash.integration.test.js` gained a new real-HTTP test asserting the eligible denominator equals `Σrow.failed` (Không đạt) and explicitly differs from `Σ(failed + returned)` (3/3 pass). Diff scope: `F13DashboardService.js` (the exclusion filter, ~10 lines) and the two delayed-cash test files only.
- **Note on Item 10:** this correction changes the same `delayed_cash_handover_count`/`eligible_count`/`f13_303_rate` fields already displayed in the Route Ranking table's `Chậm nộp tiền` columns and the selected-route panel's block (Item 10, `PO PASS` on commit `185b7dd`). The UI structure of Item 10 is untouched, but the numbers it displays are now corrected (e.g. a route's `Tỷ lệ chậm nộp tiền` will read higher than before, since the denominator shrank). This is flagged in Section 3/9, not silently hidden.

## 12. Expected Output

- What the ticket must achieve: the MVP described in checkpoint Section 3 and Acceptance Criteria (Section 8), implemented in product code, plus the Item 10 delayed-cash column group/aggregate/panel block from the `2026-08-03` PO NEW FINDING (Section 16 R2).
- What must remain unchanged: the full filter/classification contract, `routeRankingFilters.js`, Dashboard, BCVH Ranking, Import, `RuleF13302`/its `>3h` threshold, and all `sys_kpi_thresholds`/date-garbage data defects (not to be remediated by this ticket beyond the minimum date filtering in Section 5).
- What must not be introduced — explicitly forbidden (binding, carried from checkpoint Section 6, extended for delayed-cash):
  - Any priority tiering, severity labels, or color-coded row/cell warnings.
  - Any consumption of `sys_kpi_thresholds`.
  - Any threshold-based "cần can thiệp" classification beyond the factual `Không đạt > 0` filter.
  - Any quality conclusion about a route while it carries unevaluated/returned shipments.
  - Any fabricated postman or root-cause data, or disabled/placeholder UI standing in for them.
  - Any Shipment drill-down UI, enabled or disabled.
  - Any change to the `passed_rate` calculation formula.
  - Any delayed-cash rate computed as `delayed_count / total_bg`, or averaged across routes/BCVH.
  - Any new delayed-cash frontend fallback formula, threshold, severity, or recommendation text.
  - Any change to `RuleF13302`'s `>3h` threshold or to `RuleRegistry`.

## 13. Next Ticket

- Next ticket ID: none identified. Deferred items (postman mapping, root cause, Shipment drill-down runtime, date-range/trend) each require a separate future PO/CTO decision before a next ticket can be scoped — see checkpoint Section 5.
- Blockers or handoff notes: not applicable until this ticket closes with PO UI Check `PASS`.

## 14. PO Acceptance Checklist

- Checklist document: to be produced by the executor at implementation handoff, using checkpoint Section 8 (Acceptance Criteria) as the base.
- PO purpose: confirm the redesigned Route Ranking screen matches the CTO-locked scope with no forbidden inference introduced.
- Screen URL: `/f13/ranking/route`.
- Data conditions: verify against `2026-08-02` (or the latest valid date at check time) with both `Tuyến bưu tá` and `Tất cả` filters, including at least one of the 7 catalog routes under `Tất cả` to confirm the `Chuyển hoàn` display, and at least one route with a nonzero delayed-cash count to confirm Item 10.
- Step-by-step checks: per checkpoint Section 8, items 1–9, plus new Item 10 (Section 16 R2). **Recheck scope is Item 2** (BLACK/`Chuyển hoàn` naming and meaning) **and Item 10** (`Số BG chậm nộp tiền` / `Tỷ lệ chậm nộp tiền` column group, aggregate, and selected-route panel block) — Items 1, 3–9 are already PO PASS on commit `ee73feed` and were not touched by either remediation.
- PASS / WARNING / FAIL criteria: FAIL if any forbidden item (Section 12) is present; WARNING if a required field/filter is present but visually unclear; PASS only if all 9 acceptance criteria are met with no forbidden inference.
- Follow-up action after PASS: close ticket, update `PROJECT_SNAPSHOT.md`/`PROJECT_PROGRESS.md`/`DOCUMENT_INDEX.md`, record Deferred items as still-open for future authorization.
- Follow-up action after WARNING: targeted remediation within this ticket, no scope expansion.
- Follow-up action after FAIL: remediation ticket or immediate fix within this ticket per `One Bug → One Ticket → One Commit`, re-run PO UI check.

## 15. Authority Escalation

Escalate instead of implementing if, during implementation, any of the following is discovered:
- A required column/field (Section 5/6) is not actually retrievable as assumed in the checkpoint's data-discovery evidence.
- Implementing the two-column 65/35 layout would require changing a frozen architecture document beyond visual/layout adjustment.
- Any Deferred item (Section 12) appears to require inference to satisfy the objective — do not infer; stop and report.

## 16. Remediation Log

### R1 (`2026-08-03`) — PO UI Check Item 2 FAIL: wrong name/meaning for the BLACK group

- PO check on commit `ee73feed9adb93300d0d976ef1fd462abbe3e3de`: Items 1, 3, 4, 5, 6, 7, 8, 9 `PASS`. Item 2 `FAIL` — the implementation labeled `danh_gia_2026 IS NULL` rows as "Chưa đánh giá" (not yet evaluated / missing data), but PO's locked SSOT defines this group as `BLACK` = bưu gửi chuyển hoàn (returned shipment), a genuine classification, not a data-completeness gap.
- Verification before fixing: confirmed `danh_gia_2026`'s only values across the full `fact_f13` table (659,454+ rows, not scope-limited) are `{Đạt, Không đạt, NULL}` — no literal `BLACK` string exists; `NULL` is the BLACK/returned-shipment encoding. Cross-checked against `docs/06_REVIEWS/Import/TODAY-002-R1_KPI_2026_SOURCE_COLUMN_RECOVERY.md` and `TODAY-002-R2_KPI_2026_DASHBOARD_CONSISTENCY_RECOVERY.md`, both of which independently describe this same `NULL` population as "returned-shipment ... population inclusion" for the `danh_gia_2026` column. No new classification logic was introduced — the existing `IS NULL OR TRIM(...) = ''` condition was already counting exactly the BLACK/returned population; only the name was wrong.
- Fix (pure rename, no logic change): `backend/src/repositories/FactBuuGuiRepository.js` SQL alias `total_unevaluated` → `total_returned`; `backend/src/services/F13DashboardService.js` mapped field `unevaluated` → `returned`; `frontend/src/features/route/RoutePerformancePage.jsx` column/label `Chưa đánh giá` → `Chuyển hoàn`, variable `unevaluated` → `returned`, and the conditional note text replaced with `Bưu gửi chuyển hoàn, được ghi nhận BLACK trong Đánh giá KPI 2026.` All "chưa đánh giá / chưa có kết quả / chưa đủ dữ liệu" wording removed.
- Items 1, 3–9 (already PO PASS) were not touched: `Tổng BG`, `Đạt`, `Không đạt`, `Tỷ lệ đạt` sort default, the 4 KPI cards, the existing filter, the two-column layout, and all previously accepted content are unchanged by this remediation.
- New/updated tests: `FactBuuGuiRepository.routeRanking.test.js` and `F13DashboardService.routeRanking.test.js` renamed to `total_returned`/`returned` and gained a new SSOT test (`Tổng BG = Đạt + Không đạt + Chuyển hoàn`, `Không đạt` never merged with `Chuyển hoàn`). New `RoutePerformancePage.blackReturned.test.js` asserts the frontend shows `Chuyển hoàn`/BLACK tooltip text and contains no `Chưa đánh giá`/`unevaluated` residue, while confirming the PO-PASS items' markers remain present. `routeRankingCalculations.test.js` fixture field renamed for consistency (the calculation functions themselves are field-name-agnostic and needed no logic change).

### R2 (`2026-08-03`) — PO NEW FINDING: DELAYED-CASH METRICS MISSING (Item 10, targeted scope extension)

- PO finding: Route Ranking was missing `Số BG chậm nộp tiền` and `Tỷ lệ chậm nộp tiền`, already implemented and `PO PASS` on BCVH Ranking. Authorized as a targeted scope extension within this open ticket.
- Verification before implementing: read `backend/src/engine/rules/RuleF13302.js` (delayed = `thoi_gian_nop_tien - thoi_gian_ptc > 3` hours, strict; bypasses `danh_gia_2026 === 'Đạt'`; returns `false` on missing/invalid timestamps), `RuleRegistry.js` (`execute()` counts `danh_gia_2026 !== 'Đạt'` as the eligible denominator, evaluates all registered rules, and computes `f13_303_rate = totalViPham / totalKhongDat`, `0` when `totalKhongDat === 0`), and `F13DashboardService.js`'s existing BCVH Ranking usage (`_buildF13302SummaryMap`, `_buildF13302AggregateSummary`, wired into `getBcvhRanking` at lines ~769-771 and ~814-815/899-901). Cross-checked against `F13-BCVH-RANKING-REDESIGN-IMPL_MANIFEST.md` and `F13_BCVH_RANKING_REDESIGN_IMPL_WAVE2_CHECKPOINT_001.md`, both recording the same rule/denominator contract and the `2026-07-28` `334/1536 = 21.7%` runtime evidence.
- Reused, not copied-and-modified: `_buildF13302AggregateSummary(facts)` (already exactly the target `{ delayed_cash_handover_count, delayed_cash_handover_eligible_count, f13_303_rate }` shape used by BCVH Ranking's total row) is called unmodified with Route Ranking's route-scoped fact set. `_buildF13302SummaryMap(facts, groupKey)` was generalized from a hardcoded `ma_bcvh` grouping to an explicit `groupKey` parameter (default `'ma_bcvh'`, so the existing BCVH Ranking call site is unchanged in behavior) so Route Ranking can call it with `groupKey = 'ma_tuyen'`. Both changes are additive; `RuleF13302`/`RuleRegistry` themselves were not touched.
- New backend method: `FactBuuGuiRepository.getRouteRankingFacts(date, bcvh, options)` — selects raw `ma_tuyen, danh_gia_2026, thoi_gian_ptc, thoi_gian_nop_tien` using the exact same WHERE clause (date, BCVH, Hue `53%` scope, postman/all + confirmed-non-postman exclusion) as `getRouteRanking()`, unpaginated, so the rule engine always sees the full route-classification scope regardless of the ranking list's pagination.
- `F13DashboardService.getRouteRanking(...)` now also fetches `routeFacts` via the new repository method, groups them by `ma_tuyen` through `_buildF13302SummaryMap`, and computes the aggregate via `_buildF13302AggregateSummary(routeFacts)`. Each mapped row gets `delayed_cash_handover_count`, `delayed_cash_handover_eligible_count`, `f13_303_rate` (replacing the prior hardcoded `f13_303_rate: 0 // Delegate to D4` placeholder); `meta.delayed_cash_handover_summary` carries the aggregate.
- Frontend (`RoutePerformancePage.jsx`): table header restructured to a two-row `<thead>` — a new `Chậm nộp tiền` group (2 sub-columns: `Số BG chậm nộp tiền`, `Tỷ lệ chậm nộp tiền`) placed after the existing `Kết quả ngày đánh giá` group and before `Phân loại`, both sortable via the existing client-side sort mechanism. Cells bind directly to `row.delayed_cash_handover_count` and `row.f13_303_rate` — no client-side division formula. Selected-route panel gained a factual `Chậm nộp tiền` block (count, eligible sample size, rate, and the exact caption `Chậm khi thời gian nộp tiền sau thời gian PTC trên 3 giờ.`). No color, threshold, severity, or recommendation text was added anywhere.
- New `routeRankingCalculations.formatDelayedCashRate(value)`: renders `null`/`undefined` as `—` (backend-declared unavailable) and any real number, including `0`, as a normal percentage — so a genuine `0%` is never conflated with an unavailable rate.
- Data-drift note (not a defect): re-deriving the PO's cited `2026-07-28` BCVH reference (`334/1536 = 21.7%`) via the same live `_buildF13302AggregateSummary` path on `2026-08-03` produced `390/1553 = 25.1%` for the same historical date. The calculation path is verified byte-identical to BCVH Ranking's; the underlying `fact_f13` rows for that date have changed since the reference was captured (consistent with this system's known pattern of later imports/corrections touching historical dates, per `TODAY-002-R1`/`R2`). PO recheck evidence will therefore show current-data numbers, not the cited reference numbers.
- PO-PASS items 1, 3–9 untouched; Item 2 (`Chuyển hoàn`/BLACK) untouched by this extension.
- New/updated tests: `FactBuuGuiRepository.routeRanking.test.js` gained 2 tests for `getRouteRankingFacts` (WHERE-clause parity with `getRouteRanking`, no pagination, correct postman/all exclusion behavior). New `F13DashboardService.routeDelayedCash.test.js`, 9 tests, covering every PO-mandated case (row-level fields; `>3h` vs exactly-`3h`; missing timestamps in denominator only; `Đạt` excluded; zero denominator → `0%`; per-route isolation; aggregate `Σ/Σ` not average; pagination-independent aggregate; unchanged route filter passed through). New `RoutePerformancePage.delayedCash.test.js`, 5 tests, covering the frontend requirements. `routeRankingCalculations.test.js` gained 3 `formatDelayedCashRate` tests. Full `F13DashboardService.recovery.test.js` (BCVH Ranking regression, 23 tests) re-run and passing, confirming the `_buildF13302SummaryMap` generalization does not change BCVH Ranking's output.

### R3 (`2026-08-03`) — PO RUNTIME FAIL: delayed-cash metrics all zero (Item 10)

**Symptom:** PO observed `Số BG chậm nộp tiền = 0` and `Tỷ lệ chậm nộp tiền = 0%` on every route row and in the selected-route panel, on commit `62753c0`.

**Diagnostic sequence performed** (targeted, no broad repository audit):

1. Confirmed `HEAD = 62753c0`, worktree clean, re-read the Item 10 diff.
2. Reproduced with real data for `2026-07-28` by calling the production code directly (not mocks) against the live `database.sqlite`: `FactBuuGuiRepository.getRouteRankingFacts('2026-07-28', '533140', { routeType: 'all', confirmedNonPostmanRouteCodes: [] })`, then `F13DashboardService._buildF13302SummaryMap(facts, 'ma_tuyen')` / `_buildF13302AggregateSummary(facts)`, then the full `F13DashboardService.getRouteRanking(...)`, then `DashboardController.getRoute(req, res)` with a captured mock `res`. Every layer returned correct, non-zero values (see evidence table below) — **the committed code has no defect.**
3. Repository contract check: `getRouteRankingFacts` selects exactly `ma_tuyen, danh_gia_2026, thoi_gian_ptc, thoi_gian_nop_tien` (the fields `RuleF13302` reads) using the identical WHERE clause as `getRouteRanking` (same date/BCVH/Hue-prefix/postman-exclusion contract); 0 facts had a null/empty route code; the fetch is unpaginated (no `LIMIT`).
4. Route-grouping check: `_buildF13302SummaryMap(facts, 'ma_tuyen')` produced keys (e.g. `"53314018"`) that are the exact same `ma_tuyen` values `getRouteRanking()`'s rows use — confirmed by summing all row-level `delayed_cash_handover_count` values and finding they equal the aggregate exactly (`229 = 229` for BCVH `533140`/`2026-07-28`/`all`, and again `227 = 227` for the frontend's actual default filter, `postman`). No silent "key not found → 0" was occurring.
5. Service/API response check: captured the real `DashboardController.getRoute` output (direct invocation, then again over real HTTP after the fix below) — every row carried `delayed_cash_handover_count`, `delayed_cash_handover_eligible_count`, `f13_303_rate` as real numbers; `meta.delayed_cash_handover_summary` present and correct.
6. "Missing become zero" check: reviewed every `?? 0` in the touched code (`F13DashboardService.js` lines ~652-679, ~816-817, ~1013-1015) — all are defensive fallbacks for a genuinely absent map entry, not masking a live defect; confirmed no defect is currently triggering them for real routes on this date/BCVH.

**Root cause:** the backend process listening on port `5050` (PID `6276`) had a start time of `2026-08-03 09:36:20`, which **predates all five of today's commits** (`10:35:57` → `14:52:22`, including the very first governance commit of this session). It is a plain `node server.js` process (no file-watch/hot-reload, per `backend/package.json`'s `start` script), so it was still serving the pre-Item-10 code: no `delayed_cash_handover_count`/`delayed_cash_handover_eligible_count` fields at all (frontend's `toNumber(undefined)` → `0`) and a hardcoded `f13_303_rate: 0`. **This was an operational/deployment issue, not a code defect** — consistent with this project's documented recurring pattern of requiring a backend restart to load a service fix (e.g. `F13-UI-AUDIT-PLAN` Phase 4 closure).

**Fix:** stopped the stale process (port `5050`) and started a fresh one using the project's own standard command (`Start-Process node server.js ...`, matching `TTVH_ControlCenter.ps1`'s `Start-System` function exactly), new PID `28920`, confirmed listening with no crash (only a pre-existing, unrelated `ExperimentalWarning` about `chokidar`/`importWatcher.js`). **Zero product code was changed.**

**Evidence table** (date `2026-07-28`, BCVH `533140`, `route_type=all` unless noted):

| Layer | Observed value | Expected value | Conclusion |
|---|---|---|---|
| Backend process (before fix) | PID `6276`, started `09:36:20`, predates all 5 commits today | Should be running code from `62753c0` | **Stale — root cause** |
| Repository facts (`getRouteRankingFacts`, direct call) | 1617 total facts, 806 with `danh_gia_2026 != Đạt`, 1563 with valid `thoi_gian_ptc`, 704 with valid `thoi_gian_nop_tien`, 704 with both, 32 distinct route codes, 0 null/empty route codes | Real facts present for this date/BCVH/scope | Correct — no defect |
| Rule/grouping result (`_buildF13302SummaryMap`/`_buildF13302AggregateSummary`, direct call) | `delayed_cash_handover_count=229`, `eligible_count=806`, `f13_303_rate=28.4%`; 22/32 routes with a nonzero count | Nonzero, matches BCVH-wide reference figure for the same BCVH/date | Correct — no defect |
| API route row (`DashboardController.getRoute`, direct invocation + confirmed again over live HTTP after restart) | e.g. route `533140133`: `count=52`, `eligible=89`, `rate=58.4%` | Nonzero per-route data | Correct |
| API aggregate (`meta.delayed_cash_handover_summary`, direct + live HTTP after restart) | `count=229`, `eligible=806`, `rate=28.4%`; `Σ`row counts `=229` (exact match) | Aggregate `=` sum of per-route counts, not an average | Correct |
| Frontend display (PO's browser, reported before restart) | `0` / `0%` on every route and in the panel | Nonzero per the evidence above | Caused entirely by the stale backend process serving pre-Item-10 code; not a frontend or data-pipeline defect |

**Runtime validation after the fix (real HTTP, real database, live restarted server):** new `backend/src/controllers/DashboardController.routeDelayedCash.integration.test.js` (2 tests, both pass) logs in via the real `/auth/login` endpoint (project's existing test-admin fixture `admin`/`admin123`, the same one `DashboardController.r6.integration.test.js` already uses) and calls the real `/f13/ranking/route` endpoint:
- Confirms every row's `delayed_cash_handover_count`/`eligible_count`/`f13_303_rate` are numbers, route codes match the Hue `53%` contract, and eligible `>=` delayed for every row.
- Confirms `Σ`row-level counts/eligibles exactly equal `meta.delayed_cash_handover_summary`'s totals (proves route-key matching is correct end-to-end over real HTTP, not just in-process).
- Confirms the aggregate and every per-route rate independently satisfy `count/eligible*100` rounded to 1 decimal (not an average).
- Confirms at least one route has a nonzero delayed count for this known date/BCVH (positive evidence, not just structural checks).
- Confirms paginating to `page_size=3` does not shrink the aggregate versus the full unpaginated fetch.

**Note (discovered, out of scope):** the 2 pre-existing baseline test failures named `live KPI database and HTTP payloads...` and `dashboard KPI invalid code...` (in `DashboardController.r6.integration.test.js`) were found, in the course of this diagnosis, to fail because Node's `fetch` resolves `"localhost"` to `::1` first in this sandboxed environment, which this backend (bound to `0.0.0.0`, IPv4-only) refuses — an environment/DNS-resolution quirk, unrelated to Route Ranking. The new integration test above avoids this by using `127.0.0.1` explicitly in a self-contained request helper, rather than editing the shared `test_support/httpTestClient.js` (which the pre-existing failing tests depend on) — that shared file was intentionally left untouched, per the "no baseline fixes outside scope" boundary.

**Browser validation:** not performed. Logging in as would require entering credentials into a live login form, which is not permitted; the HTTP integration test above is the closest available equivalent (real auth, real endpoint, real database) without doing so. No PO PASS is claimed.

Status after R3: `REMEDIATED / READY FOR PO RECHECK`. Recheck scope remains **Item 2** and **Item 10**. Not closed; no PO PASS claimed; no next ticket activated.

### R4 (`2026-08-03`) — PO NEW FINDING: DELAYED-CASH KPI WIDGET MISSING (Item 11)

**PO confirmation received first:** on commit `185b7dd`, the Route Ranking table's `Số BG chậm nộp tiền`/`Tỷ lệ chậm nộp tiền` columns and the selected-route panel's delayed-cash block are `PO PASS`. Not re-touched in this update, per explicit PO instruction ("Không sửa lại bảng và selected-route panel nếu không có lỗi regression").

**New requirement:** replace the 4th KPI widget, `Tổng số tuyến`, with a `BG CHẬM NỘP TIỀN` widget:
- Main value: total `delayed_cash_handover_count`.
- Subline: `{f13_303_rate}% / {delayed_cash_handover_eligible_count} BG thuộc mẫu`.
- Bound only to `meta.delayed_cash_handover_summary` from the Route Ranking API response — no page-row summation, no per-route rate averaging, no frontend re-derivation of `RuleF13302`, no `delayed_count / total_bg`, no fabricated `0` for a missing contract.

**Implementation:**

- `routeRankingCalculations.js`: new `computeDelayedCashWidget(summary)` — reads only `summary.delayed_cash_handover_count`, `summary.delayed_cash_handover_eligible_count`, `summary.f13_303_rate`. Returns `{ value: '—', delta: '—' }` when `summary` is absent or `delayed_cash_handover_count` is `null`/`undefined` (contract unavailable — never rendered as a fabricated `0`); otherwise returns the real count and a subline built from `formatDelayedCashRate` (already distinguishes a genuine `0%` from unavailable) and the eligible count. No other argument (rows, total_bg, etc.) is read.
- `RoutePerformancePage.jsx`: re-introduced a `meta` state (removed as unused in an earlier pass, now needed again) populated from `getRouteRanking(...)`'s response `meta` on every fetch — the same fetch effect that already reacts to date/BCVH/route-type/sort/order changes, so the widget updates whenever the evaluation date, selected BCVH, or `Tuyến bưu tá | Tất cả` filter changes, exactly like the table and the other 3 widgets. The 4th `summaryStats` entry became `{ label: 'BG CHẬM NỘP TIỀN', value: delayedCashWidget.value, delta: delayedCashWidget.delta, tone: 'success' }` (same static `tone` slot as the widget it replaces — a fixed visual choice, not a value-driven judgment). The other 3 widgets (`Tuyến phát sinh không đạt`, `Tỷ lệ đạt toàn BCVH`, `Tổng BG không đạt`), the 4-widget row layout, the table, and the selected-route panel are untouched.

**Tests:** 4 new `computeDelayedCashWidget` tests in `routeRankingCalculations.test.js` (binds to the aggregate and renders count/rate/eligible; a genuine zero-denominator summary renders `0`/`0.0%`, not `—`; a missing/absent/empty summary renders `—`/`—`, never a fabricated `0`; ignores extraneous fields such as `total_bg` even if present). New `RoutePerformancePage.delayedCashWidget.test.js`, 4 tests: the widget is present with the exact label and is bound to `computeDelayedCashWidget(meta?.delayed_cash_handover_summary)`; `Tổng số tuyến` is fully removed; no page-row summation, per-route averaging, `RuleF13302`-recompute, or `delayed_count / total_bg` pattern appears in the page source; the other 3 widgets and the already-PO-PASS table/panel markers (`Số BG chậm nộp tiền`, `Tỷ lệ chậm nộp tiền`, the `>3h` caption, `Chuyển hoàn`, default sort) remain present; no new severity/threshold/`sys_kpi_thresholds` text was introduced.

**Validation:** `oxlint` clean. `vite build` succeeds. `node --test src/features/route/*.test.js`: 33/33 pass — all 25 pre-existing Route Ranking frontend tests pass unmodified (no regression to Items 1–10), plus the 8 new tests above. No backend file touched; no BCVH Ranking/Dashboard/Import/schema file touched; `RuleF13302` untouched.

Status after R4: `REMEDIATED / READY FOR PO RECHECK`. Recheck scope: **Item 2** (`Chuyển hoàn`/BLACK, still pending from R1) and **Item 11** (the new widget). Item 10 (table/panel) remains PO PASS and is not part of this recheck. Not closed; no PO PASS claimed; no next ticket activated.

### R5 (`2026-08-03`) — PO SSOT correction: delayed-cash denominator must exclude Chuyển hoàn

**PO's own words, verbatim intent:** "Tỉ lệ chậm nộp tiền nếu đúng thì phải là 116/456 chứ vì 543 là bao gồm cả chuyển hoàn trong đó rồi." While reviewing the new `BG CHẬM NỘP TIỀN` widget (`116/543 = 21.4%` for `2026-08-02`/BCVH `533140`/`Tất cả`), PO determined the denominator must be `Không đạt` only (`456`), not the broader `!= Đạt` population (`543 = 456 Không đạt + 87 Chuyển hoàn`) that `RuleRegistry.execute` computes by default — because returned shipments (`Chuyển hoàn`/BLACK) never go through the cash-remittance workflow and should not dilute the rate.

This corrects the denominator scope originally stated for Route Ranking's delayed-cash metric (Section 5, R2); it does not change `RuleF13302`'s `>3h` threshold, `RuleRegistry`'s code, or BCVH Ranking's own (unmodified, still broader) denominator.

**Verification with real data before fixing** (`2026-08-02`, BCVH `533140`, `route_type=all`):

| Metric | Value |
|---|---|
| Total facts in route scope | 1483 |
| `Không đạt` facts | 456 |
| `Chuyển hoàn` (BLACK) facts | 87 |
| Delayed facts among `Không đạt` | 116 |
| Delayed facts among `Chuyển hoàn` | 0 |

Zero of the 116 delayed facts came from `Chuyển hoàn` — confirming this is a pure denominator-scope correction with no numerator ambiguity for this sample (the fix still defensively excludes BLACK from the numerator too, in case some other date/BCVH has a BLACK fact with qualifying timestamps).

**Fix:** in `F13DashboardService.getRouteRanking`, the `routeFacts` fetched from `getRouteRankingFacts` are filtered to exclude any fact where `danh_gia_2026` is `null`/`undefined`/empty, before being passed to `_buildF13302SummaryMap`/`_buildF13302AggregateSummary`. Only `Đạt` (a no-op, already bypassed inside `RuleF13302.evaluate`) and `Không đạt` facts reach the engine. `RuleF13302.js` and `RuleRegistry.js` source files are unmodified; BCVH Ranking's call sites (`_buildF13302SummaryMap(currentFacts)`, `_buildF13302AggregateSummary(canonicalCurrentFacts)`) are untouched and still use the full, unfiltered fact set.

**Runtime confirmation after the fix:** restarted the backend (new PID `8384`, same standard `node server.js` command) and called the real `/f13/ranking/route` endpoint for `2026-08-02`/BCVH `533140`/`Tất cả`: `meta.delayed_cash_handover_summary` now reads `{ delayed_cash_handover_count: 116, delayed_cash_handover_eligible_count: 456, f13_303_rate: 25.4 }` — exactly matching PO's expected `116/456`.

**Tests:** `F13DashboardService.routeDelayedCash.test.js` rewritten (11 tests) with an explicit fixture proving a BLACK fact carrying a `>3h`-qualifying gap is excluded from both numerator and denominator, plus a route made entirely of `Chuyển hoàn` facts publishing a `0` eligible denominator. New test in `DashboardController.routeDelayedCash.integration.test.js` (now 3 tests) asserts, over real HTTP against the restarted server, that the eligible denominator equals `Σrow.failed` (Không đạt) and explicitly differs from `Σ(failed + returned)`.

**Validation:** `oxlint` clean. Backend full suite `node --test`: 66/70 pass — same 4 pre-existing baseline failures, unchanged. Diff scope: `F13DashboardService.js` (the exclusion filter only) and the two delayed-cash test files; no frontend file touched (the widget/table/panel already bind to whatever the backend returns, so no UI code change was needed); no BCVH Ranking, Dashboard, Import, schema, or `RuleF13302`/`RuleRegistry` file touched.

**Note on Item 10:** the Route Ranking table's `Chậm nộp tiền` columns and the selected-route panel's delayed-cash block (`PO PASS` on commit `185b7dd`) read these same fields, so their displayed numbers are also corrected by this fix even though their UI/structure is untouched. Flagged transparently, not hidden.

Status after R5: `REMEDIATED / READY FOR PO RECHECK`. Recheck scope: **Item 2**, **Item 11**, and a data-only glance at **Item 10**'s now-corrected numbers (structure unchanged, values changed). Not closed; no PO PASS claimed; no next ticket activated.

### R6 (`2026-08-03`) — PO directive: sync the SSOT correction into the shared engine; both screens must agree

PO confirmed R5's correction (`116/456`) was right, then directed the fix be moved from a Route-Ranking-local filter into the shared `RuleF13302`/`RuleRegistry` engine itself, so BCVH Ranking and Route Ranking compute delayed-cash identically, and the local Route Ranking filter be removed if no longer needed.

**Canonical SSOT re-confirmed:** `docs/07_REFERENCE/Legacy/F1.3/F13_303_DEFINITION.md` Section 3 already stated "Mẫu số: Tổng số BG Không đạt" — the shared engine's prior `!= Đạt` implementation had never fully matched its own written definition once `Chuyển hoàn`/BLACK became a recognized third category distinct from `Không đạt`. This change brings the code in line with the pre-existing doc, not a new business decision layered on top of it; the doc was additionally annotated to make the `Chuyển hoàn` exclusion explicit for future implementers.

**Fix (shared engine, both consumers affected identically):**
- `RuleF13302.evaluate(fact)`: bypass condition changed from `fact.danh_gia_2026 === 'Đạt'` to `fact.danh_gia_2026 !== 'Không đạt'` — so `Đạt` and `Chuyển hoàn` (and any other non-`'Không đạt'` value) are both bypassed; only `Không đạt` facts can ever be flagged delayed.
- `RuleRegistry.execute(facts)`: denominator condition (`totalKhongDat`) changed from `fact.danh_gia_2026 !== 'Đạt'` to `fact.danh_gia_2026 === 'Không đạt'`.
- `F13DashboardService.getRouteRanking`: removed the R5 local `delayedCashEligibleFacts` filter — the full unfiltered `routeFacts` is now passed to `_buildF13302SummaryMap`/`_buildF13302AggregateSummary` directly, exactly like BCVH Ranking's own call sites, since the shared engine now does the right thing on its own.
- No other file changed. `RuleF13302`'s `>3h` threshold is unchanged; only the eligibility/bypass condition changed.

**Regression check before changing shared code:** every existing BCVH Ranking test fixture (`F13DashboardService.recovery.test.js`) that exercises delayed-cash uses only `'Đạt'`/`'Không đạt'` values, never `null`/BLACK — confirmed by direct inspection of all 3 fixtures. So `!= Đạt` and `= Không đạt` produce byte-identical results for every existing BCVH Ranking test; **zero regression risk** to those tests was established before making the change, and confirmed after by running them (all pass).

**Runtime confirmation (real HTTP, both screens, backend restarted to new PID `26416`):**
- Route Ranking, `2026-08-02`/BCVH `533140`/`Tất cả`: `{ delayed_cash_handover_count: 116, delayed_cash_handover_eligible_count: 456, f13_303_rate: 25.4 }` — same result as R5's local filter, now produced by the shared engine with no local filter at all.
- BCVH Ranking, `2026-08-02` (all canonical BCVH): `{ delayed_cash_handover_count: 163, delayed_cash_handover_eligible_count: 907, f13_303_rate: 18.0 }` — BCVH Ranking's own numbers changed too (previously computed over the broader `!= Đạt` population), confirming both screens now share one formula.

**Tests:** new `backend/src/engine/rules/RuleF13302.test.js` (6 tests) and `RuleRegistry.test.js` (3 tests) — unit-level coverage directly on the shared engine: `Đạt` bypassed, `Chuyển hoàn`/BLACK bypassed even with a qualifying `>3h` gap, empty-string `danh_gia_2026` bypassed, `>3h` strictly delayed, exactly-`3h` not delayed, missing/invalid timestamps not delayed; `RuleRegistry.execute`'s denominator/numerator/rate and `is_late_payment` flagging verified directly. Backend full suite (correctly enumerated this time with `shopt -s globstar`, which the prior remediation's grep-based test counts had silently under-counted by skipping two-level-deep test files): **82 tests, 78 pass**, same 4 pre-existing baseline failures, unchanged — no regression to BCVH Ranking or any other suite.

**Validation:** backend-only change; no `oxlint` config exists for `backend/` (frontend-only tooling), so correctness was validated via the full test suite plus direct real-HTTP verification against the restarted server for both screens. Diff scope: `RuleF13302.js`, `RuleRegistry.js`, `F13DashboardService.js` (filter removal), and 2 new engine test files. No frontend file, no BCVH Ranking UI file, no Dashboard/Import/schema file touched.

**Note on Item 10 (again):** the table/panel numbers change a second time as a result of this sync (values move from R5's Route-Ranking-only-corrected figures to the now-shared-engine figures — for this sample they happen to be identical, `116/456`, since Route Ranking's own facts had no BLACK-with-qualifying-gap case, but this is not guaranteed for every date/BCVH). Structure/UI unchanged.

Status after R6: `REMEDIATED / READY FOR PO RECHECK`. Recheck scope: **Item 2**, **Item 11**, and a data-only glance at **Item 10**'s numbers (now computed via the shared, synced engine). Not closed; no PO PASS claimed; no next ticket activated.

**PO PASS confirmed on commit `4e80fdfd`:** Items 2, 10 (shared-engine-synced numbers), and 11 all accepted. No further recheck needed on these.

### R7 (`2026-08-03`) — PO NEW FINDING: BCVH Ranking default date filter stale (Item 12)

PO finding: opening BCVH Ranking, the date filter defaults to `28/07/2026` instead of the latest date with real data — the same class of bug already fixed on Route Ranking earlier in this ticket (Section 16 R1-era work, prior to this manifest's numbering). Authorized as a targeted BCVH Ranking fix within this open ticket; explicitly in scope this time (unlike earlier tickets' "do not touch BCVH Ranking" boundary, which applied when only Route Ranking was authorized).

**Root cause:** `frontend/src/features/ranking/BcvhRankingPage.jsx` hardcoded `searchParams.get('from_date') || '2026-07-28'` and the equivalent for `to_date`, ignoring the `max_date` the page's own `useEffect` already fetches from `/f13/dashboard/meta` into `metaState.maxDate` — the metadata was already being loaded, just never wired into the default. No backend change was needed; `/f13/dashboard/meta` already excludes future-dated garbage rows (unmodified, same endpoint Route Ranking already uses).

**Fix (frontend only, self-contained, no shared utility extracted):**
- `fromDate`/`toDate` now resolve as `fromDateParam || metaState.maxDate || ''` / `toDateParam || metaState.maxDate || ''` — the URL param (user's explicit date pick) always wins; the fetched latest-valid-date is only the fallback.
- The BCVH ranking-fetch `useEffect` now returns early when `!fromDate || !toDate` (waiting for `/f13/dashboard/meta` to resolve), so the API is never called with empty dates while metadata is still loading.
- Users can still pick any older date exactly as before — `updateParam('from_date', ...)`/`updateParam('to_date', ...)` and the date inputs are unchanged.
- No formula, `RuleF13302`/`RuleRegistry`, BCVH Ranking business logic, or unrelated module was touched.

**Runtime confirmation:** the shared `/f13/dashboard/meta` endpoint (real HTTP, live backend) returns `max_date: "2026-08-02"` — the value BCVH Ranking will now default to.

**Tests:** new `frontend/src/features/ranking/BcvhRankingPage.defaultDate.test.js`, 4 tests: the hardcoded `2026-07-28` string is fully removed; `fromDate`/`toDate` resolve from `metaState.maxDate` with the URL param still taking priority; the ranking-fetch effect guards against calling the API with empty dates; the date inputs remain bound to `updateParam` unchanged (user can still pick an older date). All 4 pass.

**Validation:** `oxlint` clean on `frontend/src/features/ranking/`. `vite build` succeeds. Ran the full existing test set touching this area (`src/features/ranking/*.test.js`, `src/App.role-routing.test.js`, `src/features/dashboard/components/*.test.js`): 111/113 pass; the 2 failures (`dashboardFilterOptions.test.js`, `dashboardLanguageSemantics.test.js`) are pre-existing baseline failures unrelated to `BcvhRankingPage.jsx` — confirmed via `git stash` re-run before this change, same 2 failures present at baseline. Diff scope: `BcvhRankingPage.jsx` and one new test file only. No backend file, no `RuleF13302`/`RuleRegistry`, no Route Ranking file, no Dashboard/Import/schema file touched.

Status after R7: `REMEDIATED / READY FOR PO RECHECK`. Recheck scope: **Item 12** only (BCVH Ranking default date). Items 1-11 remain PO PASS and are not part of this recheck. Not closed; no PO PASS claimed; no next ticket activated; no Governance Closure performed.
