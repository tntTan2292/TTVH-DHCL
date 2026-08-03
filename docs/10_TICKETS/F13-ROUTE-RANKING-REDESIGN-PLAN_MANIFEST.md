# F13-ROUTE-RANKING-REDESIGN-PLAN Manifest

Status: `COMPLETED / CLOSED (2026-08-03)`. Final locked design decisions are recorded in `docs/06_REVIEWS/Route/F13_ROUTE_RANKING_REDESIGN_PLAN_CHECKPOINT_001.md`. Implementation is owned by `F13-ROUTE-RANKING-REDESIGN-IMPL`.

## 1. Ticket Information

- Ticket ID: `F13-ROUTE-RANKING-REDESIGN-PLAN`
- Ticket Name: `Route Ranking Redesign — Discovery and Planning`
- Phase: `F1.3 Operational Module`
- Owner: `Claude Code`
- Governance Version: `V2 Active`
- Activation authority: `PO AUTHORIZATION: DISCOVERY AND PLANNING ONLY / NO IMPLEMENTATION`
- Baseline commit: `7fd33ce130227a0c2b24d3b36aa0980bf8fc9ad3` (verified: matches `HEAD`, working tree clean, branch `codex/da-impl-006`)
- Activation date: `2026-08-03`

## 2. Objective

Produce a discovery-backed plan for redesigning Route Ranking without implementing any code, product, or business-rule change.

## 3. Current Status

- Current state: `COMPLETED / CLOSED / PO APPROVED / CTO FINALIZED`
- PO UI Check Required: `No — planning ticket only`
- PO Product Status: `DESIGN PLAN ACCEPTED (2026-08-03) — see checkpoint for final locked scope`

## 4. Required Reading

- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/10_TICKETS/F13-INTERNAL-ROUTE-AUDIT_MANIFEST.md` (last accepted Route Ranking runtime contract, `COMPLETED / PO PASS`)
- `docs/06_REVIEWS/Route/F13_INTERNAL_COUNTER_ROUTE_AUDIT.md`
- `docs/07_REFERENCE/Shared_Business/F13_INTERNAL_ROUTE_CATALOG.md` (SSOT route classification catalog)
- `docs/06_REVIEWS/Route/ROUTE_PERFORMANCE_CENTER_REVIEW.md` (frozen architecture review, `WARNING` with tracked technical debt)
- `docs/02_ARCHITECTURE/ROUTE/ROUTE_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` (frozen information architecture)

## 5. Business Context

- Business problem (Product Owner confirmed, `2026-08-03`): build an operational decision-support tool that identifies which routes require intervention, their priority level, root cause, the responsible postman, and the next action.
- Business impact: elevates Route Ranking from a runtime-backed listing to an executive decision-support surface, per the confirmed objective.
- Approved business rule constraints (must be preserved by any future redesign, per `F13-INTERNAL-ROUTE-AUDIT_MANIFEST.md` and the route catalog) — Product Owner reconfirmed these must remain fully intact:
  - Filter labels exactly `Tuyến bưu tá | Tất cả`; default filter `Tuyến bưu tá`.
  - Hue Route Ranking includes only route codes starting with `53`.
  - The `7` PO-confirmed customer-pickup/internal post-office routes (see `F13_INTERNAL_ROUTE_CATALOG.md`) are excluded from postman-route counts under `Tuyến bưu tá` and shown as `Nhận tại bưu cục` under `Tất cả`.
- Product Owner decisions recorded (`2026-08-03`), resolving the prior open questions:
  1. Redesign objective: a decision-support tool covering route-level intervention need, priority, root cause, responsible postman, and recommended next action.
  2. Filter/classification contract: unchanged — the full accepted `Tuyến bưu tá | Tất cả` filter/classification contract from Section 5's constraints above must be preserved as-is.
  3. Route → Shipment drill-down: design-only for this redesign. Runtime implementation of the drill-down remains explicitly not authorized until it receives its own separate validation and authorization.

## 6. Technical Context

Current live implementation (delta-only discovery, verified against baseline `7fd33ce1`):

- Frontend route: `/f13/ranking/route` → [`RoutePerformancePage.jsx`](../../frontend/src/features/route/RoutePerformancePage.jsx) (registered in [`App.jsx`](../../frontend/src/App.jsx):81). Orchestrates `GlobalFilterBar`, an inline `RouteRankingTable`, and widgets `RouteExecutiveBrief`, `RoutePriorityAnalysis`, `RouteRootCause`, `RouteRecommendation`, `RouteDrilldown` (all under `frontend/src/features/route/`).
- Route type filter logic: [`frontend/src/features/route/routeRankingFilters.js`](../../frontend/src/features/route/routeRankingFilters.js) with test coverage in `routeRankingFilters.test.js`.
- API client: [`F13DashboardClient.js`](../../frontend/src/api/F13DashboardClient.js):64 — `getRouteRanking(date, bcvh, page, pageSize, sort, order, routeType)` → `GET /f13/ranking/route`.
- Backend route: [`backend/src/routes/f13Routes.js`](../../backend/src/routes/f13Routes.js):22 — `GET /ranking/route` → `dashboardController.getRoute`.
- Controller: [`DashboardController.js`](../../backend/src/controllers/DashboardController.js) around line 95-105 — validates `date`/`bcvh`, delegates to service.
- Service: [`F13DashboardService.js`](../../backend/src/services/F13DashboardService.js):982 — `getRouteRanking(...)` maps repository rows, applies `classifyRoute`, computes `passed_rate`, attaches `route_filter`/`route_scope`/`route_classification` meta.
- Repository: [`FactBuuGuiRepository.js`](../../backend/src/repositories/FactBuuGuiRepository.js):197 — raw SQL against `fact_f13`, hardcoded `ma_tuyen LIKE '53%'` scope, sortable by `total_bg`/`total_passed`/`total_failed` only.
- Dead/unused legacy files found but not in the active route tree (do not treat as current scope, no action taken): `frontend/src/features/ranking/RouteRankingPage.jsx`, `frontend/src/pages/F13RouteRanking.jsx` — neither is referenced by `App.jsx`.

## 7. Runtime Context

- Not applicable — no runtime change made. Route Ranking's last accepted runtime/PO-PASS state remains `F13-INTERNAL-ROUTE-AUDIT_MANIFEST.md`, unmodified by this ticket.

## 8. Related Review

- Review document: `docs/06_REVIEWS/Route/ROUTE_PERFORMANCE_CENTER_REVIEW.md`
- Review status: `WARNING` (architecture/runtime `PASS`; tracked technical debt, not a defect)
- Key evidence carried into this plan as known technical debt to consider during redesign scoping:
  1. Shipment drill-down target is a prepared contract only, not yet a live runtime destination.
  2. Some route summary surfaces fall back to row counts when optional meta fields are absent.
  3. `RoutePerformancePage` still owns a large share of orchestration/state wiring (acceptable today, should not be pushed into widgets).

## 9. Related PO Findings

- PO finding IDs: none open against Route Ranking.
- Status: last Route Ranking-specific PO decision is `PO PASS` recorded in `F13-INTERNAL-ROUTE-AUDIT_MANIFEST.md` (2026-07-28).

## 10. Documents To Update

- This manifest, on future discovery updates or on ticket closure/handoff.
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`, `PROJECT_PROGRESS.md`, and `docs/01_GOVERNANCE/DOCUMENT_INDEX.md` — updated as part of this activation.

## 11. Validation

- Technical validation: not applicable — no code changed.
- Runtime validation: not applicable.
- Browser validation: not applicable.
- Build or lint validation: not applicable.

## 12. Expected Output

- What the ticket must achieve: a discovery-backed inventory of the current Route Ranking implementation (this manifest) plus an explicit list of open questions Product Owner must answer to define redesign scope.
- What must remain unchanged: all Route Ranking product code, the accepted filter/classification contract, Dashboard, BCVH Ranking, and Import.
- What must not be introduced: any implementation, business-rule inference, or code change.

## 13. Next Ticket

- Next ticket ID: `F13-ROUTE-RANKING-REDESIGN-IMPL` (created and authorized)
- Next ticket name: `Route Ranking Redesign — Implementation`
- Handoff: design plan finalized in `docs/06_REVIEWS/Route/F13_ROUTE_RANKING_REDESIGN_PLAN_CHECKPOINT_001.md` with PO-approved objective and CTO-locked scope. Route → Shipment drill-down remains Deferred, not rendered even as a disabled placeholder in MVP, and requires its own separate validation/authorization before any future scoping.

## 14. PO Acceptance Checklist

Not applicable — `PO UI Check Required = No` for this planning ticket.

## 15. Authority Escalation

Resolved: Product Owner confirmed the redesign objective and approved the design plan; ChatGPT/CTO finalized the implementation scope in `F13_ROUTE_RANKING_REDESIGN_PLAN_CHECKPOINT_001.md`, cancelling all inferred priority-tier/threshold logic from the draft design. No further escalation open on this ticket.
