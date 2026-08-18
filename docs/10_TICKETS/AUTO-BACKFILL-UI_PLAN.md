# Final UI/UX Audit & Redesign Plan - Data Import Center (`AUTO-BACKFILL-UI`)

Status: `READY FOR PO FINAL PLAN APPROVAL` (2026-08-18).
Repository Plan Path: `docs/10_TICKETS/AUTO-BACKFILL-UI_PLAN.md` ([AUTO-BACKFILL-UI_PLAN.md](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/docs/10_TICKETS/AUTO-BACKFILL-UI_PLAN.md)).
Document Index: [DOCUMENT_INDEX.md](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/docs/DOCUMENT_INDEX.md).

> [!IMPORTANT]
> This document is a **Remediated Plan & Design System Audit ONLY**. Implementation is completely frozen per Product Owner directive until explicit PO review and final plan approval. No product source code modifications or execution will occur during this planning phase.

---

## 1. User Review Required

> [!CAUTION]
> **Key Governance & Technical Scope Items Submitted for Final Product Owner Approval**:
>
> 1. **Coverage Pagination & Bounded Container Heights (Zero Infinite Scroll)**:
>    - Default pagination: **10 rows per page** (with selectable options: `10 / 20 / 50`).
>    - Enforces explicit max-height bounds on content sections (e.g., `max-h-[420px] overflow-y-auto`) to strictly prevent endless page scrolling.
>
> 2. **Strict Isolation & Positioning of 2 Distinct Audit Histories**:
>    - **Auto Backfill Audit Events**: System queue execution logs (`JOB_CREATED`, `LEASE_ACQUIRED`, `WAITING_AUTH`, `CIRCUIT_OPEN`). Accessible **ONLY via the Slide-out Right Drawer on Tab 1**.
>    - **Legacy Manual Import History**: File upload history of Excel files uploaded manually. Scoped exclusively inside **Tab 3 ("Nạp thủ công")**. NEVER merged on the main auto backfill screen.
>
> 3. **Locked Interaction Model for Audit Events & PO Report**:
>    - **Audit Events Access**: Accessible **ONLY via Slide-out Right Drawer (`<AuditEventsDrawer />`) on Tab 1**. (Tab 2 contains ONLY formal PO Reconciliation Reports).
>    - **UX Rationale**: A slide-out drawer enables operators to inspect real-time execution logs side-by-side with active operations without leaving Tab 1 or losing context.
>
> 4. **Zero Frontend Code Extensibility & Minimal Additive Read-Only Backend Scope**:
>    - "Zero-code" means **Zero Frontend Code Modifications**: adding new indicators requires registration in the shared backend indicator registry.
>    - **Backend Coverage API Scope**: Adding the `data.indicators` metadata array to `GET /api/import/auto-backfill/coverage` is a **minimal additive read-only backend change belonging to this ticket (`AUTO-BACKFILL-UI`)**.
>    - **Strict Backend Boundaries**: Does **NOT** modify Queue engine, Safety controls, database schema, or Import business rules.
>    - **Neutral Token Theme**: Uses strictly approved design-token palette (`blue`, `teal`, `indigo`, `purple`, `emerald`). If `badge_theme` is absent, uses a single fixed neutral fallback token: **`slate`** (`bg-slate-100 text-slate-700 border-slate-200`). NO color hashing.

---

## 2. Deep UI/UX Audit Findings & PO Alignment

| PO Issue Reported | Technical & Design Root Cause | Remediated Solution |
| --- | --- | --- |
| **Trang quá dài, phải kéo liên tục** | Vertical stacking of unpaginated tables and drawers. | **10 rows/page default pagination** + **bounded height containers (`max-h-[420px]`)** + **3-Tab Navigation**. |
| **Dồn ép 2 loại nhật ký lộn xộn** | Auto Backfill Queue events and Manual Excel upload history competing on screen. | **Strict Isolation**: Auto Backfill Audit Events -> **Slide-out Right Drawer (Tab 1 Only)**; Manual Excel Upload History -> **Tab 3 ("Nạp thủ công")**. |
| **Interaction model thiếu nhất quán** | Ambiguous drawer vs. tab placement for event logs and PO reports. | **Locked Model**: Slide-out Right Drawer (`<AuditEventsDrawer />`) exclusively on Tab 1 for real-time audit logs; Tab 2 exclusively for PO Reports. |
| **Tên tab bị khóa theo chỉ tiêu** | Label "Platform F1.3 & F4.1" hardcoded indicator names. | **Neutral Naming**: Tab 1 labeled **"Bù dữ liệu tự động"**. Indicators generated dynamically from backend API. |
| **Chưa chứng minh 4+ chỉ tiêu** | Statically mapped indicator cards (2-column layout). | **Zero Frontend Code Extensibility**: Renders 1, 2, 4, to N indicators automatically from API registry. |

---

## 3. Design System Alignment & Token Rules

To ensure 100% visual consistency with the existing Dashboard (`SharedComponents.jsx`, `index.css`), the redesigned Import Center adheres strictly to project tokens:

### 3.1 Color Tokens

- **Brand Primary**: `var(--color-vnpost-blue)` (`#0054A6`)
- **Brand Dark Accent**: `var(--color-vnpost-blue-dark)` (`#003E7E`)
- **Text Main**: `var(--color-text-main)` (`#0f172a` / Slate-900)
- **Text Muted**: `var(--color-text-muted)` (`#64748b` / Slate-500)
- **Card Background**: `#ffffff` (Pure white)
- **Surface Layer 1**: `var(--color-surface-50)` (`#f8fafc` / Slate-50)
- **Surface Layer 2**: `var(--color-surface-100)` (`#f1f5f9` / Slate-100)
- **Border Token**: `var(--color-surface-200)` (`#e2e8f0` / Slate-200)

### 3.2 Status Badge Tokens

- **`SUCCESS` / `SKIPPED`**: Emerald pill (`bg-emerald-50 text-emerald-800 border-emerald-200`)
- **`MISSING`**: Amber pill (`bg-amber-50 text-amber-900 border-amber-300`)
- **`INCOMPLETE` / `RUNNING`**: Sky Blue pill (`bg-blue-50 text-blue-800 border-blue-200`)
- **`MANUAL_REVIEW_REQUIRED`**: Rose Red pill (`bg-rose-50 text-rose-800 border-rose-200`)
- **`MANUAL_ONLY_MISSING`**: Slate pill (`bg-slate-100 text-slate-700 border-slate-200`)

---

## 4. 3-Tab Architecture & Information Isolation

```
+---------------------------------------------------------------------------------------------------+
|  DATA IMPORT CENTER                                                                               |
|  [Làm mới Hệ thống]                                                                               |
+---------------------------------------------------------------------------------------------------+
|  NAVIGATION TABS:                                                                                |
|  [ (1) Bù dữ liệu tự động ]      [ (2) Báo cáo & Đối chiếu PO ]    [ (3) Nạp thủ công (Excel) ]  |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  TAB 1: BÙ DỮ LIỆU TỰ ĐỘNG (Default Primary Hero View)                                           |
|                                                                                                   |
|  +-- SYSTEM HEALTH BAR ------------------------------------------------------------------------+  |
|  | Run ID: run_101 | Status: [ RUNNING ] | Tiến độ: 14/20 (70%)                                |  |
|  | Actions: [Tạm dừng] [Tiếp tục] [Khôi phục Mạch] | [Mở Drawer Audit Events (3)]                 |  |
|  +----------------------------------------------------------------------------------------------+  |
|                                                                                                   |
|  +-- DYNAMIC INDICATOR HEALTH CARDS (Scales dynamically for 1, 2, 4, N Indicators) ------------+  |
|  | [F1.3 KPI: 5 Thiếu]  [F4.1 Phát BC: 2 Thiếu]  [F2.TEST: 0 Thiếu]  [F5.TEST: 1 Thiếu]          |  |
|  +----------------------------------------------------------------------------------------------+  |
|                                                                                                   |
|  +-- SAFETY WARNING OVERLAY (Rendered only when WAITING_AUTH / CIRCUIT_OPEN) --------------------+  |
|  | [!] WAITING_AUTH: Yêu cầu đăng nhập phiên Huế -> [Mở đăng nhập Huế]  [Tiếp tục Run]            |  |
|  +----------------------------------------------------------------------------------------------+  |
|                                                                                                   |
|  +-- COVERAGE CONTROL & FILTER BAR -------------------------------------------------------------+  |
|  | Lọc Chỉ tiêu: [Tất cả|F1.3|F4.1|F2.TEST|F5.TEST] | Nguồn: [Tất cả|HUE|TCT] | Trạng thái: [...]     |  |
|  | Hiển thị: [(o) Thẻ Ngày | ( ) Bảng] | Dòng/trang: [10 (v) | 20 | 50]                             |  |
|  +----------------------------------------------------------------------------------------------+  |
|                                                                                                   |
|  +-- DATA LIST CONTAINER (Bounded Height max-h-[420px] - Zero Infinite Scroll!) ----------------+  |
|  |  [Row/Card 1: 2026-08-18 | F1.3 | HUE | MISSING | Sẵn sàng nạp]                                |  |
|  |  [Row/Card 2: 2026-08-18 | F4.1 | TCT | SUCCESS | Đã lưu kho]                                  |  |
|  |  ... (10 items per page max)                                                                 |  |
|  |  PAGINATION: [< Trang trước]  Trang 1 / 4  [Trang sau >]                                      |  |
|  +----------------------------------------------------------------------------------------------+  |
|                                                                                                   |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  SLIDE-OUT RIGHT DRAWER: <AuditEventsDrawer /> (Accessible ONLY from Tab 1 System Health Bar)     |
|  +---------------------------------------------------------------------------------------------+  |
|  |  X  NHẬT KÝ SỰ KIỆN AUTO BACKFILL AUDIT (Run run_101)                                      |  |
|  |  -----------------------------------------------------------------------------------------  |  |
|  |  17:35:01 - JOB_CREATED (F1.3/HUE/2026-08-18)                                               |  |
|  |  17:35:02 - LEASE_ACQUIRED (Worker_01)                                                      |  |
|  |  17:35:03 - WAITING_AUTH (Phát hiện hết hạn phiên Huế)                                      |  |
|  +---------------------------------------------------------------------------------------------+  |
|                                                                                                   |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  TAB 2: BÁO CÁO & ĐỐI CHIẾU PO (PO Reconciliation Reports ONLY)                                  |
|  +----------------------------------------------------------------------------------------------+  |
|  |  PO RECONCILIATION REPORT CARDS (Summary metrics, totals, action_required recommendations)    |  |
|  +----------------------------------------------------------------------------------------------+  |
|                                                                                                   |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  TAB 3: NẠP THỦ CÔNG (Isolated Manual Import Workspace)                                          |
|  +----------------------------------------------------------------------------------------------+  |
|  |  <UploadWidget /> (Drag & drop Excel file upload area)                                       |  |
|  |  ------------------------------------------------------------------------------------------  |  |
|  |  LEGACY MANUAL IMPORT FILE HISTORY TABLE (History of uploaded Excel files)                    |  |
|  +----------------------------------------------------------------------------------------------+  |
|                                                                                                   |
+---------------------------------------------------------------------------------------------------+
```

---

## 5. Future-State Readiness (4+ Indicators Proof & Contract Specification)

### 5.1 Simulated 4-Indicator Architecture (F1.3, F4.1, F2.TEST, F5.TEST)

The redesigned frontend uses dynamic registry iteration to render indicator summary cards and filters without hardcoding specific codes:

```
+---------------------------------------------------------------------------------------------------+
| DYNAMIC INDICATOR HEALTH CARDS GRID (Desktop: 4 columns; Mobile: scroll ribbon)                   |
+---------------------------------+---------------------------------+-------------------------------+
| F1.3 KPI Chất lượng             | F4.1 Chất lượng Phát BC         | F2.TEST Giả lập               |
| 5 Ngày thiếu / 20 Hoàn tất      | 2 Ngày thiếu / 23 Hoàn tất      | 0 Ngày thiếu / 25 Hoàn tất    |
| Status: [ ACTIVE ]              | Status: [ ACTIVE ]              | Status: [ SUCCESS ]           |
+---------------------------------+---------------------------------+-------------------------------+
| F5.TEST Giả lập 2                                                                                 |
| 1 Ngày thiếu / 24 Hoàn tất                                                                        |
| Status: [ ATTENTION ]                                                                             |
+---------------------------------------------------------------------------------------------------+
```

### 5.2 Minimum Backend Contract Metadata Specification & Additive Backend Scope

To support seamless **zero frontend code modifications** for present and future indicators, the backend Coverage API payload schema contract is specified as follows:

```json
{
  "success": true,
  "data": {
    "indicators": [
      {
        "code": "F1.3",
        "display_name": "F1.3 KPI Chất lượng",
        "display_order": 1,
        "tracking_start_date": "2026-01-01",
        "supported_lanes": ["HUE", "TCT"],
        "automation_mode": "AUTOMATED",
        "badge_theme": "blue"
      },
      {
        "code": "F4.1",
        "display_name": "F4.1 Chất lượng Phát BC",
        "display_order": 2,
        "tracking_start_date": "2026-01-01",
        "supported_lanes": ["HUE", "TCT"],
        "automation_mode": "AUTOMATED",
        "badge_theme": "teal"
      },
      {
        "code": "F2.TEST",
        "display_name": "F2.TEST Giả lập 1",
        "display_order": 3,
        "tracking_start_date": "2026-01-01",
        "supported_lanes": ["HUE"],
        "automation_mode": "AUTOMATED",
        "badge_theme": "indigo"
      },
      {
        "code": "F5.TEST",
        "display_name": "F5.TEST Giả lập 2",
        "display_order": 4,
        "tracking_start_date": "2026-01-01",
        "supported_lanes": ["TCT"],
        "automation_mode": "MANUAL_ONLY",
        "badge_theme": "amber"
      }
    ],
    "items": []
  }
}
```

> [!IMPORTANT]
> **Minimal Additive Read-Only Backend Scope (Belonging to `AUTO-BACKFILL-UI`)**:
> - Adding `data.indicators` metadata to `GET /api/import/auto-backfill/coverage` is a **minimal additive read-only backend enhancement** within the scope of this ticket (`AUTO-BACKFILL-UI`).
> - Does **NOT** touch Queue engine, Safety controls, database schema, or Import business rules.
>
> **Target Backend Files for Implementation Phase**:
> - `backend/src/controllers/autoBackfillCoverageController.js` (Include `indicators` registry metadata in response payload).
> - `backend/src/services/autoBackfillCoverageService.js` (Read-only metadata assembly).
>
> **Corresponding Backend Test Contract File**:
> - `backend/test_autoBackfillCoverageService.js` (Verifies payload contract structure).
>
> **Frontend Fallback Token Handling (No Color-Hashing)**:
> - `display_name`: Defaults to `${indicatorCode}`.
> - `badge_theme`: Uses ONLY approved design-token theme if present (`blue`, `teal`, `indigo`, `purple`, `emerald`). If `badge_theme` is absent/missing, uses a **single fixed neutral fallback token: `slate` (`bg-slate-100 text-slate-700 border-slate-200`)**. No arbitrary color hashing.

---

## 6. Responsiveness Strategy (Desktop & Narrow Viewports)

| Viewport Size | Indicator Health Grid | Coverage Data View | Navigation Tabs |
| --- | --- | --- | --- |
| **Desktop (≥ 1024px)** | 4-Column Grid (`grid-cols-4`) | Table or 2-column Timeline Cards | Full horizontal tab bar |
| **Tablet (768px - 1023px)** | 2-Column Grid (`grid-cols-2`) | Single column Cards or scrollable Table | Compact horizontal tab bar |
| **Mobile / Narrow (< 768px)** | Horizontal Scroll Ribbon (`flex overflow-x-auto`) | Single column Cards with 10 rows/page | Dropdown / Segmented tab control |

---

## 7. Proposed Code Changes & File Strategy

Horizontal rules separate individual files for visual clarity:

---

### Component: `backend/src/controllers/autoBackfillCoverageController.js`

#### [MODIFY] [autoBackfillCoverageController.js](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/backend/src/controllers/autoBackfillCoverageController.js)

- Add `indicators` metadata array to payload response of `GET /api/import/auto-backfill/coverage` (read-only additive).

---

### Component: `frontend/src/components/autoBackfillUiHelpers.js`

#### [MODIFY] [autoBackfillUiHelpers.js](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/frontend/src/components/autoBackfillUiHelpers.js)

- Retain pure functions: `resolveEffectiveRunState`, `resolveWaitingAuthLanes`, `aggregateReportTotals`, `resolveRunActionButtons`, `groupItemsByIndicator`, `groupItemsByDate`.
- Add `paginateItems(items, page, pageSize = 10)` for 10-rows-per-page pagination with selectable page size (`10 / 20 / 50`).
- Add `resolveDynamicIndicators(coverageData)` using approved design tokens with single neutral `slate` fallback.

---

### Component: `frontend/src/components/AutoBackfillOperatorPanel.jsx`

#### [MODIFY] [AutoBackfillOperatorPanel.jsx](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/frontend/src/components/AutoBackfillOperatorPanel.jsx)

- Align theme with VNPost Light Dashboard (`bg-white border-slate-200 shadow-sm`).
- Implement 10-rows-per-page default pagination with selector (`10 / 20 / 50`) and bounded height container (`max-h-[420px]`).
- Render Indicator Health Cards dynamically over `resolveDynamicIndicators`.
- Implement slide-out right drawer `<AuditEventsDrawer />` accessible ONLY from Tab 1 System Health Bar for Auto Backfill Queue audit events.

---

### Component: `frontend/src/pages/DataImportCenter.jsx`

#### [MODIFY] [DataImportCenter.jsx](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/frontend/src/pages/DataImportCenter.jsx)

- Implement neutral 3-Tab Architecture:
  - Tab 1: `Bù dữ liệu tự động` [DEFAULT HERO]
  - Tab 2: `Báo cáo & Đối chiếu PO` (PO Reconciliation Reports ONLY)
  - Tab 3: `Nạp thủ công (Excel)` (Contains `UploadWidget` and legacy manual import file history).

---

## 8. Verification & Visual Gate Acceptance Checklist

### 8.1 Automated Verification Plan

- Run contract test suite with **4-Indicator Fixture** (`F1.3`, `F4.1`, `F2.TEST`, `F5.TEST`):
  `node src/components/AutoBackfillOperatorPanel.test.js` (Must PASS 100%)
- Run backend coverage contract suite:
  `node test_autoBackfillCoverageService.js` (Must PASS 100%)
- Run frontend linter:
  `npm run lint` (Must have 0 errors)
- Run frontend build:
  `npm run build` (Must complete cleanly)
- Run backend safety & queue regressions:
  `node test_autoBackfillSafety.js && node test_autoBackfillQueueService.js` (Must PASS 100%)

### 8.2 Visual Gate 6 Acceptance Checklist

- [ ] **Default 10 Rows/Page Pagination**: Coverage list defaults to 10 rows per page with page size selector (`10 / 20 / 50`).
- [ ] **Bounded Height Containers**: List container height capped (`max-h-[420px]`) with vertical scroll, eliminating infinite page scrolling.
- [ ] **Audit History Isolation**: Auto Backfill Queue Audit Events accessible ONLY via Slide-out Right Drawer on Tab 1; Legacy Manual Import History isolated in Tab 3 ("Nạp thủ công").
- [ ] **Single Interaction Model**: Real-time event log opens in Slide-out Right Drawer (`<AuditEventsDrawer />`) on Tab 1; Tab 2 dedicated exclusively to PO Reports.
- [ ] **Neutral Platform Naming**: Tab 1 named "Bù dữ liệu tự động".
- [ ] **Zero Frontend Code 4+ Indicator Fixture Verification**: Adding `F2.TEST` and `F5.TEST` to API fixture automatically renders their health cards and filter options without frontend code changes.
- [ ] **Neutral Fallback Token**: Missing `badge_theme` renders using fixed neutral `slate` token (`bg-slate-100 text-slate-700 border-slate-200`). No color hashing.
