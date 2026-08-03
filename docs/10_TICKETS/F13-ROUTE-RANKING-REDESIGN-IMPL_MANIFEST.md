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
- PO UI Check Required: `Yes — recheck required on Item 2 only (BLACK/Chuyển hoàn naming); Items 1, 3-9 already PO PASS on commit ee73feed and unchanged by this remediation`
- PO Product Status: `PO CHECK (commit ee73feed): Items 1, 3, 4, 5, 6, 7, 8, 9 PASS; Item 2 FAILED (wrong name/meaning for the BLACK group) — remediated in commit below, not yet rechecked`

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

- PO finding IDs: none open.
- Status: this ticket exists specifically to implement the PO-approved, CTO-finalized redesign scope; no separate PO finding record applies.

## 10. Documents To Update

- This manifest, on implementation completion/closure.
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`, `PROJECT_PROGRESS.md`, `docs/01_GOVERNANCE/DOCUMENT_INDEX.md` on closure.
- A closure checkpoint under `docs/06_REVIEWS/Route/` recording implementation evidence and PO UI check result.

## 11. Validation

- Initial implementation (commit `ee73feed`): `oxlint` clean, `vite build` succeeds, backend 52/56 pass (4 pre-existing baseline failures unrelated to Route Ranking), 19 Route Ranking-scoped tests pass.
- Remediation (this commit, Item 2 only): `oxlint` on all changed files — zero warnings/errors. `vite build` — succeeds. Backend full suite `node --test`: 50/54 pass; the same 4 pre-existing baseline failures, unchanged, unrelated to Route Ranking.
- Automated tests: `routeRankingFilters.test.js` (existing PO-PASS contract, source-string based) — 2/2 pass, unmodified, no regression. `routeRankingCalculations.test.js` — 13/13 pass. New `RoutePerformancePage.blackReturned.test.js` — 2/2 pass (asserts `Chuyển hoàn`/`row.returned`/BLACK tooltip text present; asserts `Chưa đánh giá`/`unevaluated` fully absent; asserts PO-PASS items 1/3-9 markers still present). `FactBuuGuiRepository.routeRanking.test.js` + `F13DashboardService.routeRanking.test.js` — 5/5 pass, including a new SSOT test asserting `Tổng BG = Đạt + Không đạt + Chuyển hoàn` and that `Không đạt`/`Chuyển hoàn` are never merged.
- Runtime validation: not yet performed — pending PO recheck.
- Browser validation: **required, not yet performed.**
- Diff scope verified: only the `unevaluated → returned` rename across Route Ranking frontend/backend files and their tests; no other file touched.

## 12. Expected Output

- What the ticket must achieve: the MVP described in checkpoint Section 3 and Acceptance Criteria (Section 8), implemented in product code.
- What must remain unchanged: the full filter/classification contract, `routeRankingFilters.js`, Dashboard, BCVH Ranking, Import, and all `sys_kpi_thresholds`/date-garbage data defects (not to be remediated by this ticket beyond the minimum date filtering in Section 5).
- What must not be introduced — explicitly forbidden (binding, carried from checkpoint Section 6):
  - Any priority tiering, severity labels, or color-coded row/cell warnings.
  - Any consumption of `sys_kpi_thresholds`.
  - Any threshold-based "cần can thiệp" classification beyond the factual `Không đạt > 0` filter.
  - Any quality conclusion about a route while it carries unevaluated shipments.
  - Any fabricated postman or root-cause data, or disabled/placeholder UI standing in for them.
  - Any Shipment drill-down UI, enabled or disabled.
  - Any change to the `passed_rate` calculation formula.

## 13. Next Ticket

- Next ticket ID: none identified. Deferred items (postman mapping, root cause, Shipment drill-down runtime, date-range/trend) each require a separate future PO/CTO decision before a next ticket can be scoped — see checkpoint Section 5.
- Blockers or handoff notes: not applicable until this ticket closes with PO UI Check `PASS`.

## 14. PO Acceptance Checklist

- Checklist document: to be produced by the executor at implementation handoff, using checkpoint Section 8 (Acceptance Criteria) as the base.
- PO purpose: confirm the redesigned Route Ranking screen matches the CTO-locked scope with no forbidden inference introduced.
- Screen URL: `/f13/ranking/route`.
- Data conditions: verify against `2026-08-02` (or the latest valid date at check time) with both `Tuyến bưu tá` and `Tất cả` filters, including at least one of the 7 catalog routes under `Tất cả` to confirm the `Chuyển hoàn` display.
- Step-by-step checks: per checkpoint Section 8, items 1–9. **Recheck scope for this remediation is Item 2 only** (BLACK/`Chuyển hoàn` naming and meaning) — Items 1, 3–9 are already PO PASS on commit `ee73feed` and were not touched by this remediation.
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
