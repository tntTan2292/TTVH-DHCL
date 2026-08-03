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
- PO UI Check Required: `Yes — recheck required on Item 2 (BLACK/Chuyển hoàn naming) and new Item 10 (Số BG chậm nộp tiền / Tỷ lệ chậm nộp tiền); Items 1, 3-9 already PO PASS on commit ee73feed and unchanged since`
- PO Product Status: `PO CHECK (commit ee73feed): Items 1, 3-9 PASS, Item 2 FAILED (remediated, pending recheck). PO NEW FINDING (2026-08-03): Route Ranking missing delayed-cash metrics already implemented on BCVH Ranking — implemented as Item 10, pending first PO check. Ticket not closed; no PO PASS declared.`

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
  - Denominator (`delayed_cash_handover_eligible_count`): canonical facts in the selected date/scope with `danh_gia_2026 != Đạt`, per `RuleRegistry.execute`'s existing `totalKhongDat` count.
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

## 7. Runtime Context

- Implemented, not yet browser/runtime-verified by PO. Implementation evidence and technical validation results are recorded in `docs/06_REVIEWS/Route/F13_ROUTE_RANKING_REDESIGN_PLAN_CHECKPOINT_001.md` Section 10.

## 8. Related Review

- Review document: `docs/06_REVIEWS/Route/F13_ROUTE_RANKING_REDESIGN_PLAN_CHECKPOINT_001.md`
- Review status: `CLOSED / SCOPE LOCKED`
- Key evidence: see checkpoint Sections 1–3 for full data-discovery basis and locked decisions.

## 9. Related PO Findings

- PO NEW FINDING — DELAYED-CASH METRICS MISSING (`2026-08-03`): Route Ranking was missing `Số BG chậm nộp tiền` and `Tỷ lệ chậm nộp tiền`, already implemented and `PO PASS` on BCVH Ranking. Authorized as a targeted scope extension within this open ticket, not a Route Ranking redesign re-authorization.
- Status: implemented as Item 10 (Section 16 R2), reusing `RuleF13302`/`RuleRegistry` and the same aggregate-summary execution path as BCVH Ranking, unmodified. Pending first PO check.

## 10. Documents To Update

- This manifest, on implementation completion/closure.
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`, `PROJECT_PROGRESS.md`, `docs/01_GOVERNANCE/DOCUMENT_INDEX.md` on closure.
- A closure checkpoint under `docs/06_REVIEWS/Route/` recording implementation evidence and PO UI check result.

## 11. Validation

- Initial implementation (commit `ee73feed`): `oxlint` clean, `vite build` succeeds, backend 52/56 pass (4 pre-existing baseline failures unrelated to Route Ranking), 19 Route Ranking-scoped tests pass.
- Remediation R1 (Item 2, commit `6133a46`): `oxlint` clean, `vite build` succeeds, backend 50/54 pass (same 4 pre-existing baseline failures).
- Remediation R2 / scope extension (Item 10, this commit): `oxlint` on all changed files — zero warnings/errors. `vite build` — succeeds. Backend full suite `node --test`: 61/65 pass; the same 4 pre-existing baseline failures, unchanged, unrelated to Route Ranking. `F13DashboardService.recovery.test.js` (BCVH Ranking regression check, 23 tests) — 23/23 pass, confirming the generalized `_buildF13302SummaryMap(facts, groupKey)` did not change BCVH Ranking's output.
- Automated tests: `routeRankingFilters.test.js` (existing PO-PASS contract) — 2/2 pass, unmodified. `routeRankingCalculations.test.js` — 17/17 pass (incl. 4 new `formatDelayedCashRate` tests: genuine `0%` vs `null`/`undefined` → `—`). `RoutePerformancePage.blackReturned.test.js` — 2/2 pass. New `RoutePerformancePage.delayedCash.test.js` — 5/5 pass (column group present with correct sub-column labels and ordering after "Kết quả ngày đánh giá"; cells bind to `row.delayed_cash_handover_count`/`formatDelayedCashRate(row.f13_303_rate)` with no client-side division formula; selected-route panel shows count/eligible/rate and the exact `>3h` caption; no new severity/threshold/recommendation text; PO-PASS markers intact). `FactBuuGuiRepository.routeRanking.test.js` — 4/4 pass (added: `getRouteRankingFacts` mirrors `getRouteRanking`'s WHERE clause, not paginated, and correctly does/does not apply the `NOT IN` exclusion per filter). `F13DashboardService.routeRanking.test.js` — 5/5 pass. New `F13DashboardService.routeDelayedCash.test.js` — 9/9 pass (row-level count/eligible/rate; `>3h` delayed vs exactly-`3h` not delayed; missing timestamps stay in denominator, not numerator; `Đạt` excluded from denominator; zero denominator → `0%`; per-route isolation; aggregate `Σ/Σ` not average; aggregate unaffected by pagination; existing route-classification filter passed through unchanged).
- Runtime validation: not yet performed — pending PO recheck.
- Browser validation: **required, not yet performed.**
- Diff scope verified: `FactBuuGuiRepository.js` (new `getRouteRankingFacts` method, additive), `F13DashboardService.js` (generalized `_buildF13302SummaryMap` grouping key + wired delayed-cash fields into `getRouteRanking`, additive), `RoutePerformancePage.jsx`, `routeRankingCalculations.js`, and their tests. No BCVH Ranking, Dashboard, Import, schema, or historical-data file touched.

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
