# CHECKPOINT 001: F13 Shared Navigation, Application Frame, and Shared Filters Planning (Revision 2)

- Ticket ID: `F13-SHARED-NAV-FILTERS-PLAN`
- Ticket Name: `F1.3 Shared Navigation, Application Frame, and Shared Filters Audit and Standardization Planning`
- Date: `2026-08-03`
- Author: `Antigravity`
- Status: `COMPLETED / PO PLAN PASS / IMPLEMENTATION PO UI PASS / CLOSED`

---

## 1. Executive Summary

This planning checkpoint establishes the refined, zero-code standardization blueprint for **shared navigation**, **application frame**, and **shared filter bar** across the 3 PO PASS operational modules of F1.3:
1. **Operation Dashboard** (`/f13/dashboard`)
2. **BCVH Ranking** (`/f13/ranking/bcvh`)
3. **Route Ranking** (`/f13/ranking/route`)

This revision addresses all 4 PO requirements:
1. Lock URL parameter compatibility strategy between `ma_bcvh` and `bcvh_id` without backend changes.
2. Complete Before-vs-After Scope & Component Matrix with risks and safeguards.
3. Explicit clarification of modified vs. unchanged components.
4. Rigorous No-Code Acceptance Criteria for future implementation validation.

---

## 2. Parameter Compatibility Strategy (`ma_bcvh` vs `bcvh_id`)

### 2.1 Problem Definition
- **Dashboard (`/f13/dashboard`)**: Reads/writes URL search parameter `ma_bcvh`. Calls API `GET /f13/dashboard/kpi?bcvh=...`.
- **BCVH Ranking (`/f13/ranking/bcvh`)**: Reads/writes URL search parameter `bcvh_id`. Calls API `GET /f13/ranking/bcvh?bcvh_id=...`.
- **Route Ranking (`/f13/ranking/route`)**: Reads/writes URL search parameter `bcvh_id`. Calls API `GET /f13/ranking/route?bcvh=...`.

### 2.2 Locked Parameter Resolution Strategy (Zero Backend Changes)
1. **Canonical Internal Standard**: `bcvh_id` is adopted as the primary internal parameter name for BCVH unit selection across frontend ranking modules.
2. **Dual-Read Dual-Sync Fallback Engine**:
   - Every page reading BCVH filter will perform dual fallback resolution:
     `const bcvhId = searchParams.get('bcvh_id') || searchParams.get('ma_bcvh') || 'all';`
   - When a user selects a BCVH unit in `GlobalFilterBar`:
     - Dashboard updates `bcvh_id` (and mirrors `ma_bcvh` if present) to guarantee legacy bookmarks and shared links with `?ma_bcvh=533140` remain 100% functional.
     - BCVH Ranking & Route Ranking update `bcvh_id` seamlessly.
3. **Refresh & Deep-Link Safeguard**:
   - Browser refresh retains full URL search params via React Router `useSearchParams`.
   - Navigating between modules via Quick Links or Navigation Map passes active `bcvh_id` and date range (`from_date`, `to_date`), ensuring state continuity when jumping from Dashboard -> BCVH Ranking -> Route Ranking.
4. **Backend API Isolation**:
   - Backend APIs require no modifications. API client callers map frontend `bcvh_id` / `ma_bcvh` to backend parameter keys (`bcvh` or `bcvh_id`) as defined by existing controller contracts.

---

## 3. Scope & Modification Boundaries (Strictly Defined)

### 3.1 Components Modified during Implementation (4 Target Files)

| Component / Target File | Current Behavior | Proposed Behavior After Implementation | Unchanged Content / Boundaries | Risk & Protection Strategy |
|---|---|---|---|---|
| [`RoutePerformancePage.jsx`](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/frontend/src/features/route/RoutePerformancePage.jsx) | Page title in `PageContainer` is `"Route Performance Center"`. Loads BCVH list from static array `ROUTE_BCVH_OPTIONS` (6 items). Reads `bcvh_id`. | Title updated to `"Bảng xếp hạng Tuyến Bưu tá"`. BCVH options loaded dynamically from `/f13/dashboard/meta`. Dual-reads `bcvh_id` / `ma_bcvh`. | Table columns, 4 KPI cards, delayed cash calculations (`RuleF13302`), filter pills (`Tuyến bưu tá \| Tất cả`), `only_failed` filter, 2-column layout remain 100% untouched. | **Low Risk**: Wrap dynamic BCVH loading in existing `useEffect` meta fetch. Fallback to `533140` if meta fails. |
| [`BcvhRankingPage.jsx`](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/frontend/src/features/ranking/BcvhRankingPage.jsx) | Reads `bcvh_id`. Title is `"Bảng xếp hạng BCVH"`. | Dual-reads `bcvh_id` / `ma_bcvh` for URL compatibility. Keeps title `"Bảng xếp hạng Bưu cục Vận hành (BCVH)"`. | Detailed 17-column ranking table, Doughnut summary card, `maxDate` resolution logic, KPI tones remain 100% untouched. | **Zero Risk**: Simple fallback reading on `searchParams`. |
| [`DashboardPage.jsx`](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/frontend/src/features/dashboard/DashboardPage.jsx) | Reads `ma_bcvh`. Title is `"Operation Dashboard"`. | Dual-reads `bcvh_id` / `ma_bcvh`. When updating URL, sets `bcvh_id` and mirrors `ma_bcvh`. | Compact 9-column BCVH table, heatmap `TB THÁNG`, Action Center, trend risk chart, KPI summary cards remain 100% untouched. | **Zero Risk**: Backwards-compatible parameter writing. |
| [`GlobalFilterBar` in SharedLayout.jsx](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/frontend/src/components/shared/SharedLayout.jsx) | Default prop `showKpiFilter=true` (unused). Generic select classes. | Set default prop `showKpiFilter=false`. Refine responsive flex wrapping & focus ring styles. | Filter inputs (Date, BCVH, Search, Actions slot) layout structure remains identical. | **Low Risk**: Shared component change; verify all 3 pages after edit. |

### 3.2 Unchanged Components (Strictly Preserved Framework)

| Component / Subsystem | Preservation Commitment |
|---|---|
| **`SharedLayout.jsx` (Frame Structure)** | Container width `max-w-[1600px]`, background `bg-vnpost-bg`, outer padding `p-4 md:p-6` remain unchanged. |
| **`SidebarNavigation` & `appNavigation.jsx`** | Left sidebar gradient, collapse state (280px / 80px), role filtering (`ROLE_VIEWER` vs `ROLE_ADMIN`), icon mappings remain unchanged. |
| **`Topbar.jsx`** | Topbar height (`h-14`), branding (`VNPost Huế`), user badge, avatar, and Logout behavior remain unchanged. |
| **`Breadcrumb.jsx`** | Automatic path segment parsing (`Home > f13 > ...`) remains unchanged. |
| **Backend & APIs (`port 5050`)** | `DashboardController`, `F13DashboardService`, `FactBuuGuiRepository`, SQLite schema remain untouched. |
| **Import Center (`/import`)** | Protected route, admin-only access, file watcher, upload pipelines remain untouched. |
| **Data & Formula SSOT** | `RuleF13302`, `RuleRegistry`, KPI 2026 targets (`QUALITY_TARGET_RATE = 90%`), delayed-cash formulas remain untouched. |

---

## 4. Rigorous No-Code Acceptance Criteria (PO Acceptance Checklist)

The future implementation ticket (`F13-SHARED-NAV-FILTERS-IMPL`) MUST satisfy 100% of the following criteria without exception:

1. **Navigation Menu Integrity**:
   - Clicking `Operation Dashboard`, `BCVH Ranking`, and `Tuyến Ranking` in the left sidebar opens each respective page cleanly without console errors.
2. **Latest Date Auto-Selection**:
   - Opening BCVH Ranking or Route Ranking without date parameters automatically resolves `from_date` and `to_date` to the latest valid data date (`maxDate` from backend meta).
3. **BCVH Filter Data Response**:
   - Selecting any BCVH unit (e.g. `Thuận Hóa`, `Hương Trà`, `Phú Lộc`) updates the displayed table data and KPI summary cards accurately on all 3 screens.
4. **State Persistence on Browser Refresh**:
   - Pressing `F5` / Refresh with active filters (`?from_date=2026-06-23&to_date=2026-06-23&bcvh_id=533140&search=Phú+Hội`) retains 100% of the filter selections and search query.
5. **Legacy URL Parameter Compatibility**:
   - Accessing a legacy link containing `?ma_bcvh=533140` correctly loads data for BCVH Thuận Hóa on Dashboard, BCVH Ranking, and Route Ranking.
6. **Dynamic BCVH Metadata**:
   - The BCVH dropdown in Route Ranking displays the full dynamic list from backend metadata (matching Dashboard and BCVH Ranking) instead of a hardcoded 6-item list.
7. **Security & Role Boundaries**:
   - Accounts with `ROLE_VIEWER` remain strictly limited to `/f13/dashboard`, `/f13/ranking/bcvh`, `/f13/ranking/route`. Access to `/import` or system admin settings remains strictly forbidden (redirects to `/unauthorized` or `/login`).
8. **Business & Table Integrity**:
   - All 12 items approved under `F13-ROUTE-RANKING-REDESIGN-IMPL` (delayed cash counts, `BLACK` = `Chuyển hoàn`, only-failed toggle, heatmap month-cumulative rank) remain 100% identical in numbers and visual formatting.

---

## 5. Next Steps

This plan was awarded **PO PLAN PASS** on `2026-08-03`. Implementation was executed under `F13-SHARED-NAV-FILTERS-IMPL`.

---

## 6. Implementation & Remediation Record (`F13-SHARED-NAV-FILTERS-IMPL`)

- **Implementation Commit**: `3b9b836f` (initial implementation of parameter dual-read, Route Ranking title update, dynamic BCVH meta).
- **Remediation Commit 1**: `01c3e023` (synchronized URL write & clear logic for `bcvh_id` and legacy `ma_bcvh`).
- **Remediation Commit 2 (Final Accepted)**: `e4c57e0d` (cross-module URL parameter preservation via `urlPreservation.js` helper: `buildPreservedPath` / `buildPreservedSearchString` integrated into `SidebarNavigation`, Dashboard quick links, and `UnifiedActionCenter`).
- **Product Owner UI Acceptance**: **PO UI PASS** awarded on `2026-08-04`.
