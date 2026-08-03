# CHECKPOINT 001: F13 Shared Navigation, Application Frame, and Shared Filters Planning

- Ticket ID: `F13-SHARED-NAV-FILTERS-PLAN`
- Ticket Name: `F1.3 Shared Navigation, Application Frame, and Shared Filters Audit and Standardization Planning`
- Date: `2026-08-03`
- Author: `Antigravity`
- Status: `COMPLETED / PLANNING ONLY / READY FOR PO PLAN REVIEW`

---

## 1. Executive Summary

This planning checkpoint establishes a comprehensive audit and standardization blueprint for the **shared navigation**, **application frame**, and **shared filter bar** across the 3 PO PASS operational modules of F1.3:
1. **Operation Dashboard** (`/f13/dashboard`)
2. **BCVH Ranking** (`/f13/ranking/bcvh`)
3. **Route Ranking** (`/f13/ranking/route`)

All proposed changes strictly preserve existing business rules, table data structures, KPI formulas, PO-confirmed filter contracts, and viewer/admin security boundaries. No product code is modified during this planning step.

---

## 2. Current Implementation Audit & Discrepancy Findings

### 2.1 Shared Navigation & Frame Structure
- **Frame Wrapper**: `MainLayout.jsx` wraps content in `SharedLayout.jsx`.
- **Sidebar**: `SidebarNavigation` renders a fixed left navigation sidebar (collapsible on desktop 280px -> 80px, overlay drawer on mobile).
  - Navigation links are populated via `getNavigationForRole(user?.role)` in `appNavigation.jsx`.
  - Active group state (`expandedGroups`) defaults to `F1.3 Quality Management: true` and `System Administration: false`.
- **Topbar**: `Topbar.jsx` renders a fixed header (56px / `h-14`) with system branding (`VNPost Huế`), notification bell placeholder, user display name, role badge, avatar, and explicit Logout button.
- **Breadcrumb**: `Breadcrumb.jsx` automatically parses URL path segments (`/f13/dashboard` -> `Home > F13 > Dashboard`).
- **Discrepancy / Visual Inconsistency Found**:
  - `SharedLayout.jsx` renders `Breadcrumb` and page `title` at the layout level if passed as props, BUT `DashboardPage`, `BcvhRankingPage`, and `RoutePerformancePage` currently do NOT pass `title` or `globalFilters` to `SharedLayout`. Instead, each page renders its own `PageContainer` with custom title/subtitle/badges inside the children slot.
  - Page titles:
    - Dashboard: `Operation Dashboard` (subtitle: `Trung tâm điều hành chỉ đạo chất lượng phát liên tỉnh...`)
    - BCVH Ranking: `Bảng xếp hạng BCVH` (subtitle: `Bưu cục vận hành · F1.3 Chất lượng...`)
    - Route Ranking: `Route Performance Center` (subtitle: `Đang tải dữ liệu Tuyến Ranking...` / `Danh sách tuyến...`)
  - Title naming convention discrepancy: Route Ranking uses English name `"Route Performance Center"` in `PageContainer`, whereas Dashboard and BCVH Ranking use Vietnamese titles (`Operation Dashboard`, `Bảng xếp hạng BCVH`).

### 2.2 Shared Filter Bar (`GlobalFilterBar`) Discrepancies

The shared component `GlobalFilterBar` in `SharedLayout.jsx` provides:
1. `fromDate` (Date input)
2. `toDate` (Date input)
3. `showKpiFilter` (`select` for `all`/`pass`/`fail`, default `true`)
4. `bcvhValue` / `bcvhOptions` (`select` for BCVH units)
5. `searchValue` / `onSearchChange` (Search input)
6. `actions` slot (custom JSX passed by parent page)

#### Audit of Cross-Module `GlobalFilterBar` Usage:

| Dimension | Operation Dashboard | BCVH Ranking | Route Ranking | Discrepancy / Finding |
|---|---|---|---|---|
| **Date Range Inputs** | `from_date` & `to_date` (controlled via `resolveDashboardDateRange`) | `from_date` & `to_date` (auto-fallback to `maxDate`) | `from_date` & `to_date` (auto-fallback to `metaMaxDate`) | Standardized date inputs, but URL parameter resolution logic differs slightly across pages. |
| **BCVH Filter Parameter** | Uses `ma_bcvh` | Uses `bcvh_id` | Uses `bcvh_id` | **URL Parameter Mismatch**: Dashboard uses `ma_bcvh` while BCVH & Route Ranking use `bcvh_id`. |
| **BCVH Default Option** | `{ value: 'all', label: 'Tất cả BCVH' }` + dynamic options from `/f13/dashboard/meta` | `{ value: 'all', label: 'Tất cả BCVH' }` + dynamic options from `/f13/dashboard/meta` | Hardcoded `ROUTE_BCVH_OPTIONS` (6 BCVHs) without 'all' option. | **Option Source Mismatch**: Dashboard & BCVH load dynamic options from API meta; Route Ranking relies on static 6-BCVH array. |
| **KPI Filter (`showKpiFilter`)** | Hidden (`showKpiFilter={false}`) | Hidden (`showKpiFilter={false}`) | Hidden (`showKpiFilter={false}`) | All 3 pages set `showKpiFilter={false}`. `showKpiFilter=true` is unused across F1.3. |
| **Search Input** | Used for filtering BCVH table client-side | Used for filtering BCVH ranking table client-side | Used for filtering route table client-side | Consistent behavior across all 3 pages. |
| **Custom Actions Slot** | Renders 4 action buttons (Báo cáo, v.v.) / status badges | Renders Refresh & Export buttons / badges | Renders Route Type filter pills (`Tuyến bưu tá` \| `Tất cả`) + StatusBadges | Custom actions slot flexible and working as intended. |

---

## 3. Standardization Plan & Proposed Architecture

### 3.1 Principle of Preservation
- **Zero Breaking Changes**: All URL parameters (`from_date`, `to_date`, `interval`, `ma_bcvh`, `bcvh_id`, `search`, `route_type`, `only_failed`) and API payload signatures MUST remain 100% backward compatible.
- **Zero Business Logic Alteration**: KPI calculations, table columns, color badges, and data ordering MUST remain identical.
- **Isolated Table Contracts**: Dashboard compact 9-column BCVH table, BCVH detailed 17-column table, and Route Ranking 11-column table MUST remain separate components.

### 3.2 Standardization Items (Proposed for Implementation Phase)

#### Item 1: Title & Header Naming Alignment
- Standardize header naming in `PageContainer` across all 3 screens to Vietnamese operational terminology:
  - Dashboard: `Operation Dashboard` — *Trung tâm điều hành chất lượng phát liên tỉnh*
  - BCVH Ranking: `Bảng xếp hạng Bưu cục Vận hành (BCVH)` — *Đánh giá hiệu quả chất lượng theo bưu cục*
  - Route Ranking: `Bảng xếp hạng Tuyến Bưu tá` — *Đánh giá hiệu quả và quản lý chất lượng theo tuyến* (replaces raw English `Route Performance Center`).

#### Item 2: BCVH Option Data Source Synchronization
- Update `RoutePerformancePage` to consume dynamic BCVH options from `/f13/dashboard/meta` (via `buildBcvhOptions`) instead of static `ROUTE_BCVH_OPTIONS`, ensuring new BCVHs automatically appear across all 3 screens when updated in backend metadata.

#### Item 3: `GlobalFilterBar` Cleanups & Refinements
- Clean up unused default props in `GlobalFilterBar` (e.g. `showKpiFilter` default to `false` unless explicitly enabled).
- Ensure consistent styling, hover/focus rings, and responsive wrapping behavior across all viewports (desktop `1600px` down to mobile `375px`).

#### Item 4: Navigation Active State & Accessibility
- Verify `SidebarNavigation` active highlight correctly highlights child routes (e.g., `/f13/ranking/route`) when active.
- Ensure ARIA labels and focus outlines on `GlobalFilterBar` inputs and topbar elements meet WCAG AA standards.

---

## 4. Verification & Testing Plan

1. **Automated Verification**:
   - `npm test`: Run existing frontend unit tests to ensure no regressions in filter logic or component rendering.
2. **Manual & Visual Verification**:
   - Verify navigation between Dashboard (`/f13/dashboard`), BCVH Ranking (`/f13/ranking/bcvh`), and Route Ranking (`/f13/ranking/route`).
   - Verify role-based navigation for `ROLE_VIEWER` vs `ROLE_ADMIN`.
   - Verify filter interaction on all 3 pages (changing dates, selecting BCVHs, typing search query).

---

## 5. Handoff & Next Steps

This plan is **READY FOR PO REVIEW**. Upon Product Owner approval, implementation can be authorized under ticket `F13-SHARED-NAV-FILTERS-IMPL`.
