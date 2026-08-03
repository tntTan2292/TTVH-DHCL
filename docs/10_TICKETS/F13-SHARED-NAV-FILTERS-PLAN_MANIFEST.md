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
- Revision date: `2026-08-03` (Revision 2 - Enhanced Scope & No-Code Acceptance Criteria)

## 2. Objective

Audit and propose a comprehensive standardization plan for shared navigation (`SidebarNavigation`, `Topbar`, `Breadcrumb`, `appNavigation.jsx`), application frame (`SharedLayout`, `MainLayout`, container constraints), and shared filter bar (`GlobalFilterBar`) across Operation Dashboard (`/f13/dashboard`), BCVH Ranking (`/f13/ranking/bcvh`), and Route Ranking (`/f13/ranking/route`), WITHOUT modifying any product code, backend, KPI formulas, Import center, or screen-specific business contracts already PO PASS.

## 3. Current Status

- Current state: `ACTIVE / PLANNING ONLY / READY FOR PO PLAN RECHECK`
- PO UI Check Required: `No — planning ticket only`
- PO Product Status: `REVISED DISCOVERY & PLANNING COMPLETED — AWAITING PO RECHECK`

## 4. Required Reading

- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/10_TICKETS/F13-UI-AUDIT-PLAN_MANIFEST.md` (Operation Dashboard UI Audit & Implementation closure)
- `docs/10_TICKETS/F13-BCVH-RANKING-REDESIGN-IMPL_MANIFEST.md` (BCVH Ranking Redesign closure)
- `docs/10_TICKETS/F13-ROUTE-RANKING-REDESIGN-IMPL_MANIFEST.md` (Route Ranking Redesign closure)
- `docs/06_REVIEWS/UI/F13_SHARED_NAV_FILTERS_PLAN_CHECKPOINT_001.md` (Planning Checkpoint Revision 2)

## 5. Scope & Audit Target Files

- `frontend/src/layouts/MainLayout.jsx`
- `frontend/src/components/shared/SharedLayout.jsx`
- `frontend/src/components/Topbar.jsx`
- `frontend/src/navigation/appNavigation.jsx`
- `frontend/src/features/dashboard/DashboardPage.jsx`
- `frontend/src/features/ranking/BcvhRankingPage.jsx`
- `frontend/src/features/route/RoutePerformancePage.jsx`

## 6. Key Planning Clarifications (Revision 2)

1. **Parameter Compatibility Strategy**:
   - `bcvh_id` adopted as primary frontend parameter.
   - Dual-read fallback engine (`bcvh_id || ma_bcvh`) implemented on frontend only. Legacy bookmarks with `?ma_bcvh=` remain 100% functional.
   - Zero backend API changes required.

2. **Explicit Scope Matrix**:
   - Title update: Route Ranking title in `PageContainer` changed to `"Bảng xếp hạng Tuyến Bưu tá"`.
   - Dynamic Metadata: Route Ranking static `ROUTE_BCVH_OPTIONS` replaced by dynamic `/f13/dashboard/meta` fetch.
   - Preserved Components: `SharedLayout` frame, `SidebarNavigation`, `Topbar`, `Breadcrumb`, all 3 tables, KPI formulas, Import Center, and role security remain strictly unchanged.

3. **No-Code Acceptance Criteria**:
   - Defined 8 explicit verification criteria covering menu navigation, date auto-selection, BCVH filtering, F5 refresh persistence, legacy URL support, dynamic meta list, role protection, and business contract isolation.

## 7. Next Ticket

- Next ticket ID: `F13-SHARED-NAV-FILTERS-IMPL` (not created — requires explicit PO approval of this plan)
- Next ticket scope: Implementation of standardized shared navigation and filter props interface.

## 8. Validation

- Technical validation: `git status` clean, no product code modified.
- Documentation validation: Checkpoint `F13_SHARED_NAV_FILTERS_PLAN_CHECKPOINT_001.md` updated to Revision 2, governance files updated.
