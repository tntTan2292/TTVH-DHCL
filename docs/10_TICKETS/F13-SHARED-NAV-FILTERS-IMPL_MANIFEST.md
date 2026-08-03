# F13-SHARED-NAV-FILTERS-IMPL Manifest

## 1. Ticket Information

- Ticket ID: `F13-SHARED-NAV-FILTERS-IMPL`
- Ticket Name: `F1.3 Shared Navigation, Application Frame, and Shared Filters Implementation`
- Phase: `F1.3 Quality Management (Cross-Module Shell & Filters)`
- Owner: `Antigravity`
- Governance Version: `V2 Active`
- Activation authority: `Product Owner PO PLAN PASS (2026-08-03)`
- Baseline commit: `af42d370` (branch `codex/da-impl-006`)
- Activation date: `2026-08-03`

## 2. Objective

Implement the locked, PO-approved scope from `docs/06_REVIEWS/UI/F13_SHARED_NAV_FILTERS_PLAN_CHECKPOINT_001.md` (Revision 2):
1. Parameter Compatibility Strategy (`ma_bcvh` vs `bcvh_id`) with dual-read fallback (`bcvh_id || ma_bcvh`) across Dashboard, BCVH Ranking, and Route Ranking.
2. Route Ranking Title update: Change `PageContainer` title to `"Bảng xếp hạng Tuyến Bưu tá"`.
3. Route Ranking Dynamic BCVH Metadata: Replace static `ROUTE_BCVH_OPTIONS` with dynamic fetch from `/f13/dashboard/meta`.
4. Refine `GlobalFilterBar` default props (`showKpiFilter = false`).
5. Strictly preserve all existing tables, KPI formulas, Import Center, backend APIs, and role permissions.

## 3. Current Status

- Current state: `ACTIVE / IMPLEMENTATION COMPLETED / READY FOR PO UI RECHECK`
- PO UI Check Required: `Yes — implementation ticket`
- PO Product Status: `IMPLEMENTATION REMEDIATED — AWAITING PO UI RECHECK`
- Remediation Note: Implemented `urlPreservation.js` helper (`buildPreservedPath`, `buildPreservedSearchString`) and wired into `SidebarNavigation` (`NavLink`), Dashboard action button (`Mở xếp hạng BCVH`), and `UnifiedActionCenter` (`follow_up.href`) to preserve `from_date`, `to_date`, and `bcvh_id` across cross-module navigation between Dashboard, BCVH Ranking, and Route Ranking.



## 4. Required Reading

- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/10_TICKETS/F13-SHARED-NAV-FILTERS-PLAN_MANIFEST.md`
- `docs/06_REVIEWS/UI/F13_SHARED_NAV_FILTERS_PLAN_CHECKPOINT_001.md` (Revision 2)

## 5. Scope & Target Files

- `frontend/src/features/route/RoutePerformancePage.jsx`
- `frontend/src/features/ranking/BcvhRankingPage.jsx`
- `frontend/src/features/dashboard/DashboardPage.jsx`
- `frontend/src/components/shared/SharedLayout.jsx`

## 6. Acceptance Criteria

1. Navigation Menu Integrity
2. Latest Date Auto-Selection
3. BCVH Filter Data Response
4. State Persistence on Refresh (F5)
5. Legacy URL Parameter (`?ma_bcvh=`) Compatibility
6. Dynamic BCVH List on Route Ranking
7. Role & Security Boundaries (Viewer/Admin)
8. Business Contract & Table Isolation
