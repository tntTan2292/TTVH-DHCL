# F13 UI Audit Plan Checkpoint 001 - Operation Dashboard UI/UX Audit & Standardization Plan

- Ticket ID: `F13-UI-AUDIT-PLAN`
- Date: `2026-07-29`
- Target Component: `Operation Dashboard (/f13/dashboard)`
- Visual Inspiration: `CRM 3.0 Dashboard (Interface surfaces, depth, saturation, borders, shadows, typography, controls, feedback)`
- Authority: `PO PASS PHASE 1, PHASE 1 REMEDIATION, PHASE 2, PHASE 3 & PHASE 4 — TICKET CLOSED`
- PO Status: `PO PASS PHASE 4 - OPERATION DASHBOARD (2026-08-03, Commit cdb9eab246415a3835210dd70329996e6ef6521c) | All phases PO PASS | CLOSED`

---

## 1. Executive Summary & Recorded PO Decisions

This UI/UX Plan defines the visual, interaction, and structural standardization for the **Operation Dashboard** (`/f13/dashboard`) of QIS V2.

The Product Owner has officially recorded:
- **`PO PASS PHASE 1 REMEDIATION`**
- **`PO PASS PHASE 2 – COMPACT BCVH TABLE UI/UX`**
- **`PO PASS PHASE 3 – CHARTS, OPERATING PATTERNS & ACTION CENTER UI/UX`** (Commit `32c10f5470bf1d3a530a767b42ab1948f7f3e61d`)
- **`PO PASS PHASE 4 - OPERATION DASHBOARD`** (2026-08-03, Commit `cdb9eab246415a3835210dd70329996e6ef6521c`)

### Current Workflow & Handoff Status:
- **Phase 1**: `COMPLETED / PO PASS` (Commit `6ea7819`).
- **Phase 1 Remediation**: `COMPLETED / PO PASS` (Commit `cbe5bc2`).
- **Phase 2**: `COMPLETED / PO PASS` (Commit `dd9cbf5`).
- **Phase 3**: `COMPLETED / PO PASS` (Commit `32c10f5`).
- **Phase 4**: `COMPLETED / PO PASS` (Commit `cdb9eab246415a3835210dd70329996e6ef6521c`).
- **Next State**: `CLOSED / AWAITING PRODUCT OWNER DIRECTION`.

---

## 2. Protected Boundaries & Deferred Findings

### A. Deferred Finding: Executive Insight Content Quality Review
> [!IMPORTANT]
> **Executive Insight Content Quality Review — DEFERRED / NOT AUTHORIZED under current UI/UX implementation phases.**
> 1. **Visual Presentation Accepted**: The visual presentation and layout of *"Bản tin chỉ đạo điều hành"* (full-width CRM 3.0 card banner) is accepted by Product Owner.
> 2. **Scope Isolation**: Its generated wording, recommendations, prioritization, and business usefulness belong to backend content-generation/business-interpretation logic, NOT the current UI/UX scope.
> 3. **Preservation Mandate**: Future Phase 4 work must preserve existing content-generation logic exactly and MUST NOT rewrite, remove, or add generated conclusions.
> 4. **Future Ticket Authorization**: A separately authorized future ticket must trace the content source, determine whether it is rule/template-based or AI-generated, and assess factual accuracy and leadership usefulness.

### B. Deferred Finding: Target-line Semantic Color Normalization
> [!NOTE]
> **Target-line semantic color normalization — MINOR / DEFERRED / NON-BLOCKING.**
> 1. **No Business Impact**: The current target-line color presentation does not affect data, formulas, APIs, permissions, target calculation, or business behavior.
> 2. **Accepted Release Inconsistency**: The local hard-coded color versus central semantic token inconsistency (`#DC2626` local vs `#7c3aed` token) is accepted for the current Phase 3 release.
> 3. **Future Cleanup**: It may be normalized later during a bounded theme/semantic-token cleanup.
> 4. **Non-blocking Authorization**: It MUST NOT block Phase 3 PO PASS or Phase 4 dispatch.

### C. Shared Visual Components Policy
1. The current Phase 1 styling (`GlobalFilterBar` in `SharedLayout.jsx`) that also appears on BCVH Ranking (`/f13/ranking/bcvh`) is accepted by Product Owner.
2. This acceptance applies **ONLY** to the current shared visual treatment.
3. Any future change to a shared component must validate both `/f13/dashboard` and `/f13/ranking/bcvh`.
4. A future BCVH Ranking ticket must not assume that changing shared styling is automatically authorized for Operation Dashboard.

### D. Table Presentation Isolation Policy
1. **Operation Dashboard Table**: Operation Dashboard continues rendering the accepted compact 9-column `BcvhOperationTable` (`src/components/f13/BcvhOperationTable.jsx`).
2. **BCVH Ranking Table**: BCVH Ranking continues rendering the independent detailed `UnifiedBcvhAnalysisTable` (`features/dashboard/components/UnifiedBcvhAnalysisTable.jsx`).
3. **No Reconnection**: Do not reconnect the Ranking table, its adapter, expandable analysis presentation, column model, or detailed ranking behavior to Dashboard.
4. **No Shared Component Replacement**: Do not replace either table with a shared presentation component unless Product Owner explicitly approves a new contract.
5. **Future Verification**: Future BCVH Ranking remediation must verify that Dashboard table structure, styling, and behavior remain unchanged.

### E. SSOT & Scope Boundaries
- **Authoritative SSOT Consumption**: Business-semantic colors, KPI labels, status meanings, thresholds, formulas, target lines, and route-quality classifications remain 100% UNCHANGED, consumed directly from SSOT mappers. The authoritative current dashboard target is 90%, consumed from `QUALITY_TARGET_RATE`.
- **Documentation Only**: Zero product code is modified in this step.

---

## 3. Color Palette & Visual System

### A. Interface & Decorative Palette (UI Surfaces, Navigation & Controls)
*CRM 3.0 inspiration applies exclusively to interface surfaces and controls:*
- **Canvas Backdrop**: `bg-slate-100/80` (`#f8fafc`) — provides crisp visual separation behind content white cards.
- **Card Containers**: `bg-white border-slate-200/80 shadow-sm hover:shadow-md transition-shadow duration-150` — solid white cards with subtle elevation depth.
- **Primary Brand Controls**: `bg-[#003E7E]` / `bg-blue-600` (hover: `bg-blue-700`, active: `bg-blue-800`) — crisp, vivid blue for primary buttons, selected tabs, and focus rings.
- **UI Neutral Text & Dividers**: `text-slate-900` (titles), `text-slate-700` (body), `text-slate-500` (subtitles/labels), `border-slate-200` (dividers).

### B. Business-Semantic Colors — Frozen SSOT

- KPI statuses, operational warnings, risk levels, route-quality classes, volume signals and target-line presentation must reuse the exact existing semantic mapper, token and component contract currently applied by QIS V2.
- Do not manually remap a status label to another semantic color token.
- Do not replace a defined risk color with an unknown or fallback color.
- Do not merge Attention and Warning unless the current authoritative SSOT explicitly maps them to the same presentation.
- Unknown, unavailable and no-data states remain separate from adverse business-performance states.
- The authoritative current dashboard target is 90%, consumed from `QUALITY_TARGET_RATE`.

---

## 4. Interaction, Feedback & Motion Standard

- **Transition Speed**: All hover, focus, and state transitions use strictly `150ms` (restrained 120–200 ms window) with `ease-in-out` curve (`transition-all duration-150 ease-in-out`).
- **No Layout Shift on Press**: Eliminates font resizing or scale bounce on click. Active press feedback uses solid color/shadow state updates (`active:bg-blue-800 active:border-blue-900`).
- **Skeleton Loading Standard**:
  - Restrained opacity pulse (`animate-pulse opacity-70 bg-slate-200 rounded-md`) without harsh white flashing or layout popping.
- **Accessibility Motion Exemption**:
  - Full `prefers-reduced-motion` support (`motion-reduce:transition-none motion-reduce:animate-none`).

---

## 5. Structure & Content Section Inventory

The Operation Dashboard UI consists of **1 Header/QuickNav Area** plus **6 Main Content Sections**:

```
[Header & QuickNav Area] Page Title + "Mở xếp hạng BCVH" Action Button
├── [Section 1] GlobalFilterBar (Date Range, BCVH Selector, Search Input) [Phase 1 COMPLETED / PO PASS]
├── [Section 2] UnifiedCommandSummary (4 Executive KPI Cards + Executive Insight Callout) [Phase 1 Remediation COMPLETED / PO PASS]
├── [Section 3] BcvhOperationTable (Compact 9-Column BCVH Overview Table) [Phase 2 COMPLETED / PO PASS]
├── [Section 4] IntegratedTrendRiskWorkspace (Trend Chart & Leadership D-1/D-7 Grid) [Phase 3 COMPLETED / PO PASS]
├── [Section 5] OperatingPatternTabsCard (Weekday/Month/Heatmap Patterns & Charts) [Phase 3 COMPLETED / PO PASS]
└── [Section 6] UnifiedActionCenter (Executive Bulletin & Recommendation Cards) [Phase 3 COMPLETED / PO PASS]
```

---

## 6. Phase Status & Implementation Summary

### **Phase 1: Filter Bar & Executive Command Belt (Sections 1 & 2) - [COMPLETED / PO PASS]**
- **Status**: `COMPLETED / PO PASS` (Commit `6ea7819`).
- **Remediation Status**: `COMPLETED / PO PASS` (Commit `cbe5bc2` - Expanded Executive Insight to full-width and removed secondary note).
- **PO Decision**: `PO PASS PHASE 1 REMEDIATION.`

### **Phase 2: Compact 9-Column BCVH Table Visual Polish (Section 3) - [COMPLETED / PO PASS]**
- **Status**: `COMPLETED / PO PASS` (Commit `dd9cbf5`).
- **Files Modified**: `src/components/f13/BcvhOperationTable.jsx`.
- **PO Decision**: `PO PASS PHASE 2 – COMPACT BCVH TABLE UI/UX.`

### **Phase 3: Charts, Patterns & Action Center Polish (Sections 4, 5 & 6) - [COMPLETED / PO PASS]**
- **Status**: `COMPLETED / PO PASS` (Commit `32c10f5470bf1d3a530a767b42ab1948f7f3e61d`).
- **PO Decision**: `PO PASS PHASE 3 – CHARTS, OPERATING PATTERNS & ACTION CENTER UI/UX.`
- **Files Modified**:
  - `src/features/dashboard/components/IntegratedTrendRiskWorkspace.jsx`
  - `src/features/dashboard/components/OperatingPatternTabsCard.jsx`
  - `src/features/dashboard/components/UnifiedActionCenter.jsx`
- **Key Outcomes**:
  - **IntegratedTrendRiskWorkspace**: Applied CRM 3.0 depth to chart container (`rounded-2xl border border-slate-200/90 bg-white shadow-sm hover:shadow-md`), volume bar SVG gradient (`#003E7E` to `#2563EB`), high-visibility target reference line (`#DC2626` stroke with label pill for `QUALITY_TARGET_RATE = 90%`), floating dark glass tooltip (`bg-slate-900/95 text-white shadow-xl`), styled D-1/D-7 comparison cards with bold tabular metrics and delta chips.
  - **OperatingPatternTabsCard**: Redesigned tab selectors into a segmented pill-belt (`bg-slate-100 p-1 rounded-xl`), top-accented 5 monthly summary cards (`border-t-2 border-t-[#003E7E]`), high-contrast heatmap cell background fills preserving exact SSOT relative bands with `tabular-nums` readability at 100% zoom, and floating dark detail layer tooltip.
  - **UnifiedActionCenter**: Visually aligned "Bản tin nhanh" with Phase 1 "Bản tin chỉ đạo" identity (`bg-gradient-to-r from-blue-50/90 via-indigo-50/30 to-blue-50/50 border-blue-200/90`), added solid P1 (`bg-red-600`), P2 (`bg-amber-500`), P3 (`bg-blue-600`) priority badges, left accent border cards (`P1 border-l-red-600`, `P2 border-l-amber-500`, `P3 border-l-blue-600`), and CTA action buttons (`bg-[#003E7E]`).
- **Verification Evidence**:
  - `node --test` passed 112/112 tests across dashboard test suite (0 failures).
  - `vite build` completed successfully with 0 errors.
  - `oxlint` completed with 0 errors.
  - BCVH Ranking (`/f13/ranking/bcvh`) verified 100% unaffected.
  - Preserved all SSOT colors, targets, formulas, recommendation text, and data contracts. The authoritative current dashboard target is 90%, consumed from `QUALITY_TARGET_RATE`.

### **Phase 4: Observation Group Viewport Optimization (Operation Dashboard-Wide) - [COMPLETED / PO PASS]**
- **Status**: `COMPLETED / PO PASS` (Commit `235b69d0aa1a5b776b3398fde50c60172f7e4181`, extended by follow-on fixes `32ccdb06`, `525339c2`, `77efbcde`, `cdb9eab2`).
- **Follow-on fixes accepted with Phase 4**: dashboard layout density and 7-day comparison semantics optimization (`32ccdb06`); duplicate pattern legend removed and month-cumulative rank displayed in heatmap (`525339c2`); month-cumulative rank rendered inside the `TB THÁNG` card in heatmap mode, touching `backend/src/services/timelineService.js` (`77efbcde`); `monthly_ytd` array computed correctly in `timelineService` for heatmap mode (`cdb9eab2`).
- **Final Product Owner Acceptance (2026-08-03)**: Heatmap displays the month-cumulative rank inside the `TB THÁNG` cell as intended; backend was restarted to load the `timelineService.js` fix; Product Owner confirmed the runtime result after restart. Result: `PO PASS PHASE 4 - OPERATION DASHBOARD`.
- **Scope**: Layout optimization ensuring each logically connected observation group fits fully (or nearly fully) within one desktop viewport at 100% zoom.
- **Files Modified**:
  - `src/features/dashboard/DashboardPage.jsx` (space-y tightened from `space-y-4` to `space-y-3.5`, header padding reduced)
  - `src/features/dashboard/components/UnifiedCommandSummary.jsx` (vertical padding and card grid gap compressed)
  - `src/components/f13/BcvhOperationTable.jsx` (outer margins and header padding reduced)
  - `src/features/dashboard/components/IntegratedTrendRiskWorkspace.jsx` (TrendChart height set to `h-[280px] lg:h-[300px]`)
  - `src/features/dashboard/components/OperatingPatternTabsCard.jsx` (ComboChartPanel height reduced)
  - `src/features/dashboard/components/UnifiedActionCenter.jsx` (internal card padding and vertical spacing reduced)
- **Observation Groups Defined**:
  1. **Executive Overview** — Global filters + 4 KPI cards + Executive Insight (span: ~720px)
  2. **BCVH Operating Table** — Compact 9-column table + status legend (span: ~665px)
  3. **Trend Analysis Workspace** — D-1/D-7 comparison grid + 30-day chart (span: ~830px)
  4. **Operating Patterns** — Monthly/weekly summary + pattern chart (span: ~823px)
  5. **Action Center** — KPI context + bulletin + priority action cards (span: ~670px)
- **Viewport Fit Results (100% zoom, verified via Playwright headless):**

  | Group | 1920×1080 (main: 1024px) | 1440×900 (main: 844px) | 1366×768 (main: 712px) |
  |-------|--------------------------|------------------------|------------------------|
  | G1 Executive Overview (720px) | ✅ PASS | ✅ PASS | ✅ PASS |
  | G2 BCVH Table (665px) | ✅ PASS | ✅ PASS | ✅ PASS |
  | G3 Trend Workspace (830px) | ✅ PASS | ✅ ~98% | ⚠️ ~86% (90% zoom fallback per spec) |
  | G4 Operating Patterns (823px) | ✅ PASS | ✅ ~98% | ⚠️ ~87% (90% zoom fallback per spec) |
  | G5 Action Center (670px) | ✅ PASS | ✅ PASS | ✅ PASS |

- **Key Findings**:
  - All 5 groups fit fully at 1920×1080 (100% zoom).
  - All 5 groups nearly fully fit at 1440×900 (100% zoom); G3/G4 at ~98%.
  - At 1366×768, G1/G2/G5 fully fit; G3/G4 require 90% zoom per approved fallback criterion.
  - Scrollable container is `<main class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">` (total scroll height: 3708px).
  - Build verification: `npm run build` passed, 0 errors.
  - SSOT colors, targets, formulas, semantic states, and all Phase 1–3 visual outcomes preserved.

---

## 7. Protected Boundaries & Governance State

- **Existing KPI Targets & Thresholds**: Existing KPI targets (the authoritative current dashboard target is 90%, consumed from `QUALITY_TARGET_RATE`) and thresholds remain exactly as defined by authoritative SSOT.
- **No Data or API Contract Changes**: Parameters for `/f13/ranking/bcvh` and `/f13/dashboard/*` remain 100% unchanged.
- **No Generated Content Alteration**: Recommendation texts, priority logic, and bulletin content in Action Center remain 100% untouched.
- **No Permission or Navigation Changes**: Viewer/Admin access levels, port 5178/5050, and route `/f13/dashboard` remain fixed.
- **Governance State**:
  - Phase 1: `COMPLETED / PO PASS`
  - Phase 1 Remediation: `COMPLETED / PO PASS`
  - Phase 2: `COMPLETED / PO PASS`
  - Phase 3: `COMPLETED / PO PASS`
  - Phase 4: `COMPLETED / PO PASS` (Commit `cdb9eab246415a3835210dd70329996e6ef6521c`, 2026-08-03)
  - Next state: `CLOSED / AWAITING PRODUCT OWNER DIRECTION`



