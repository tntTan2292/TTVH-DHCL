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

- Current state: `ACTIVE / IMPLEMENTED / READY FOR PO UI CHECK`
- PO UI Check Required: `Yes — required before this ticket can close`
- PO Product Status: `IMPLEMENTED, NOT YET PO-VERIFIED`

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
- Binding scope decisions (PO approved, CTO finalized `2026-08-03` — see checkpoint Section 3 for full text): default sort `Tỷ lệ đạt DESC`; no `sys_kpi_thresholds` usage; no priority tiers, severity labels, color-coded warnings, or intervention thresholds of any kind; full column set `Tổng BG / Đạt / Không đạt / Chưa đánh giá / Tỷ lệ đạt`; 4-card KPI row as specified; new filter `Chỉ tuyến có bưu gửi không đạt`; unevaluated shipments shown as a plain count with no quality conclusion; no Shipment drill-down UI in any form; default date resolves to latest valid date ≤ current date excluding future-dated garbage rows.

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

- Technical validation: `oxlint` on all changed frontend files — zero warnings/errors. `vite build` — succeeds. Backend full suite `node --test` on `backend/src`: 52/56 pass; the 4 failures are pre-existing at baseline (confirmed via stash re-run) and unrelated to Route Ranking.
- Automated tests: `routeRankingFilters.test.js` (existing PO-PASS contract, source-string based) — 2/2 pass, unmodified, no regression. New `routeRankingCalculations.test.js` — 13/13 pass (default sort, sort toggling, KPI formula, only-failed filter, date-default resolution incl. missing-data case, numeric safety). New `FactBuuGuiRepository.routeRanking.test.js` + `F13DashboardService.routeRanking.test.js` — 4/4 pass (additive `unevaluated` field, postman-scope exclusion preserved, `passed_rate` formula unchanged).
- Runtime validation: not yet performed — pending PO UI check.
- Browser validation: **required, not yet performed.** Full detail in checkpoint Section 10.
- Diff scope verified: only Route Ranking frontend/backend files and their new tests changed.

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
- Data conditions: verify against `2026-08-02` (or the latest valid date at check time) with both `Tuyến bưu tá` and `Tất cả` filters, including at least one of the 7 catalog routes under `Tất cả` to confirm unevaluated display.
- Step-by-step checks: per checkpoint Section 8, items 1–9.
- PASS / WARNING / FAIL criteria: FAIL if any forbidden item (Section 12) is present; WARNING if a required field/filter is present but visually unclear; PASS only if all 9 acceptance criteria are met with no forbidden inference.
- Follow-up action after PASS: close ticket, update `PROJECT_SNAPSHOT.md`/`PROJECT_PROGRESS.md`/`DOCUMENT_INDEX.md`, record Deferred items as still-open for future authorization.
- Follow-up action after WARNING: targeted remediation within this ticket, no scope expansion.
- Follow-up action after FAIL: remediation ticket or immediate fix within this ticket per `One Bug → One Ticket → One Commit`, re-run PO UI check.

## 15. Authority Escalation

Escalate instead of implementing if, during implementation, any of the following is discovered:
- A required column/field (Section 5/6) is not actually retrievable as assumed in the checkpoint's data-discovery evidence.
- Implementing the two-column 65/35 layout would require changing a frozen architecture document beyond visual/layout adjustment.
- Any Deferred item (Section 12) appears to require inference to satisfy the objective — do not infer; stop and report.
