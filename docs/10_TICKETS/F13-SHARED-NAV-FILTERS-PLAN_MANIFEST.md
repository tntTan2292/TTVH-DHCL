# F13-SHARED-NAV-FILTERS-PLAN Manifest

## 1. Ticket Information

- Ticket ID: `F13-SHARED-NAV-FILTERS-PLAN`
- Ticket Name: `F1.3 Shared Navigation, Application Frame, and Shared Filters Audit and Standardization Planning`
- Phase: `F1.3 Quality Management (Cross-Module Shell & Filters)`
- Owner: `Antigravity`
- Governance Version: `V2 Active`
- Activation authority: `PO AUTHORIZATION: DISCOVERY AND PLANNING ONLY / NO IMPLEMENTATION`
- Baseline commit: `db142a065ff1aa7f8471ff0ee5d57bbaefea67be` (verified: matches `HEAD`, working tree clean, branch `codex/da-impl-006`)
- Activation date: `2026-08-03`

## 2. Objective

Audit and propose a comprehensive standardization plan for shared navigation (`SidebarNavigation`, `Topbar`, `Breadcrumb`, `appNavigation.jsx`), application frame (`SharedLayout`, `MainLayout`, container constraints), and shared filter bar (`GlobalFilterBar`) across Operation Dashboard (`/f13/dashboard`), BCVH Ranking (`/f13/ranking/bcvh`), and Route Ranking (`/f13/ranking/route`), WITHOUT modifying any product code, backend, KPI formulas, Import center, or screen-specific business contracts already PO PASS.

## 3. Current Status

- Current state: `ACTIVE / PLANNING ONLY / READY FOR PO PLAN REVIEW`
- PO UI Check Required: `No — planning ticket only`
- PO Product Status: `DISCOVERY & PLANNING COMPLETED — AWAITING PO REVIEW`

## 4. Required Reading

- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/10_TICKETS/F13-UI-AUDIT-PLAN_MANIFEST.md` (Operation Dashboard UI Audit & Implementation closure)
- `docs/10_TICKETS/F13-BCVH-RANKING-REDESIGN-IMPL_MANIFEST.md` (BCVH Ranking Redesign closure)
- `docs/10_TICKETS/F13-ROUTE-RANKING-REDESIGN-IMPL_MANIFEST.md` (Route Ranking Redesign closure)
- `docs/06_REVIEWS/UI/F13_SHARED_NAV_FILTERS_PLAN_CHECKPOINT_001.md` (Planning Checkpoint)

## 5. Scope & Audit Target Files

- `frontend/src/layouts/MainLayout.jsx`
- `frontend/src/components/shared/SharedLayout.jsx`
- `frontend/src/components/Topbar.jsx`
- `frontend/src/navigation/appNavigation.jsx`
- `frontend/src/features/dashboard/DashboardPage.jsx`
- `frontend/src/features/ranking/BcvhRankingPage.jsx`
- `frontend/src/features/route/RoutePerformancePage.jsx`

## 6. Business & Governance Constraints (Must Preserve)

1. **Dashboard (`/f13/dashboard`)**:
   - Preserved URL params: `from_date`, `to_date`, `interval`, `ma_bcvh`, `search`.
   - Preserved `GlobalFilterBar` configuration: Date range (`from_date` -> `to_date`), BCVH selector (`ma_bcvh`), Search input, KPI filter hidden (`showKpiFilter=false`).
   - Preserved compact 9-column BCVH table contract and custom filter dropdown validation.

2. **BCVH Ranking (`/f13/ranking/bcvh`)**:
   - Preserved URL params: `from_date`, `to_date`, `interval`, `bcvh_id`, `search`.
   - Preserved `GlobalFilterBar` configuration: Date range, BCVH selector (`bcvh_id`), Search input, KPI filter hidden (`showKpiFilter=false`).
   - Preserved detailed 17-column ranking table contract, doughnut summary, and auto-resolution of default date to latest available data date (`maxDate`).

3. **Route Ranking (`/f13/ranking/route`)**:
   - Preserved URL params: `from_date`, `to_date`, `interval`, `bcvh_id`, `bcvh_name`, `search`, `route_type`, `only_failed`.
   - Preserved PO-confirmed classification filter contract (`Tuyến bưu tá | Tất cả`, default `Tuyến bưu tá`).
   - Preserved `GlobalFilterBar` configuration: Date range, BCVH selector (`bcvh_id`), Search input, KPI filter hidden, with custom `actions` slot rendering the route-type toggle pills and BCVH status badge.

4. **Role Permissions & System Protection**:
   - Viewer role (`ROLE_VIEWER`) strictly constrained to F1.3 screens (`/f13/dashboard`, `/f13/ranking/bcvh`, `/f13/ranking/route`).
   - Admin-only routes (`/import`, `/kpi-config`, `/system-info`, `/f11`, `/f12`, `/f41`) and System Administration navigation items remain protected by `ProtectedRoute` and `getNavigationForRole()`.
   - No change to backend APIs (`port 5050`), frontend port (`5178`), or LAN deployment setup.

## 7. Next Ticket

- Next ticket ID: `F13-SHARED-NAV-FILTERS-IMPL` (not created — requires explicit PO approval of this plan)
- Next ticket scope: Implementation of standardized shared navigation and filter props interface.

## 8. Validation

- Technical validation: `git status` clean, no product code modified.
- Documentation validation: Checkpoint `F13_SHARED_NAV_FILTERS_PLAN_CHECKPOINT_001.md` created, governance files updated.
