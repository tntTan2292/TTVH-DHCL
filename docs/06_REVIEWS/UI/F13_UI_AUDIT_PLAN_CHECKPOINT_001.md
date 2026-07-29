# F13 UI Audit Plan Checkpoint 001 - Operation Dashboard UI/UX Audit & Standardization Plan

- Ticket ID: `F13-UI-AUDIT-PLAN`
- Date: `2026-07-29`
- Target Component: `Operation Dashboard (/f13/dashboard)`
- Visual Inspiration: `CRM 3.0 Dashboard (Interface surfaces, depth, saturation, borders, shadows, typography, controls, feedback)`
- Authority: `PHASE 1 IMPLEMENTED / READY FOR PO CHECK`
- PO Status: `READY FOR PO CHECK (Phase 1 Implementation Complete)`

---

## 1. Executive Summary & Design Scope Clarification

This UI/UX Plan defines the visual, interaction, and structural standardization for the **Operation Dashboard** (`/f13/dashboard`) of QIS V2.

The Product Owner previously recorded: **`PO APPROVE UI/UX AUDIT AND STANDARDIZATION PLAN.`**

### Phase 1 Implementation Status:
- **Scope Implemented**: Phase 1 (`GlobalFilterBar` & `UnifiedCommandSummary` on `/f13/dashboard`).
- **UI Treatment Applied**: CRM 3.0-inspired surface depth (`bg-white` cards with `border-slate-200/90` and `shadow-sm hover:shadow-md`), input hover/focus-within ring outlines, tag chips for metric questions, prominent Executive Insight Callout banner, 150ms transitions (`motion-reduce:transition-none`), and geometry-matched pulse skeletons.
- **Validation**: 100% focused unit tests passed (`node --test frontend/src/features/dashboard/components/unifiedCommandSummary.test.js`). 110+ dashboard suite tests passed. Zero business logic or API contracts changed.
- **Current State**: Stopped at `READY FOR PO CHECK`. Phase 2, 3, and 4 implementation is NOT dispatched.

---

## 2. Color Palette & Visual System

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

> **Implementation Guard**: Future UI implementation may change interface surfaces, visual depth, typography and interaction styling, but must preserve each component’s existing semantic resolver instead of assigning new business-semantic Tailwind classes directly.

---

## 3. Interaction, Feedback & Motion Standard

- **Transition Speed**: All hover, focus, and state transitions use strictly `150ms` (restrained 120–200 ms window) with `ease-in-out` curve (`transition-all duration-150 ease-in-out`).
- **No Layout Shift on Press**: Eliminates font resizing or scale bounce on click. Active press feedback uses solid color/shadow state updates (`active:bg-blue-800 active:border-blue-900`).
- **Control Feedback Specifications**:
  - **Input Fields & Dropdowns**:
    * Default: `bg-white border-slate-200 text-slate-800 text-sm rounded-lg shadow-sm transition-all duration-150`
    * Hover: `hover:border-blue-400 hover:bg-slate-50/50`
    * Focus-visible / Focus-within: `focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-blue-600`
    * Disabled: `disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed`
  - **Action Buttons & Mode Tabs**:
    * Selected Tab: `bg-[#003E7E] text-white font-semibold shadow-sm`
    * Unselected Tab: `bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 font-medium`
    * Primary CTA Button: `bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1`
  - **Existing Expand / Collapse Drawer (Table Row & Guidance)**:
    * Smooth max-height and opacity transition (`transition-[max-height,opacity] duration-200 ease-in-out`).
    * Chevron icon rotation (`transition-transform duration-150 ease-in-out`).
- **Skeleton Loading Standard**:
  - Restrained opacity pulse (`animate-pulse opacity-60 bg-slate-200 rounded-md`) without harsh white flashing or layout popping.
- **Accessibility Motion Exemption**:
  - Full `prefers-reduced-motion` support (`motion-reduce:transition-none motion-reduce:animate-none`).

---

## 4. Structure & Exact Content Section Inventory

The Operation Dashboard UI consists of **1 Header/QuickNav Area** plus **6 Main Content Sections**:

```
[Header & QuickNav Area] Page Title + "Mở xếp hạng BCVH" Action Button
├── [Section 1] GlobalFilterBar (Date Range, BCVH Selector, Search Input) [Phase 1 Implemented]
├── [Section 2] UnifiedCommandSummary (4 Executive KPI Cards + Executive Insight Callout) [Phase 1 Implemented]
├── [Section 3] BcvhOperationTable (Compact 9-Column BCVH Overview Table) [Phase 2 Pending]
├── [Section 4] IntegratedTrendRiskWorkspace (Trend Chart & Leadership D-1/D-7 Grid) [Phase 3 Pending]
├── [Section 5] OperatingPatternTabsCard (Weekday/Month/Heatmap Patterns & Charts) [Phase 3 Pending]
└── [Section 6] UnifiedActionCenter (Executive Bulletin & Recommendation Cards) [Phase 3 Pending]
```

### Exact Skeleton Loading Scope by Section
When data is loading, exact structural pulse skeletons are rendered:
- **Section 1 (`GlobalFilterBar`)**: Skeleton select box during metadata loading. [Phase 1 Implemented]
- **Section 2 (`UnifiedCommandSummary`)**: 4 Skeleton KPI Cards (stat value + subtitle label) + 1 Skeleton Insight Box. [Phase 1 Implemented]
- **Section 3 (`BcvhOperationTable`)**: 6 Skeleton Table Rows with sticky cell placeholders.
- **Section 4 (`IntegratedTrendRiskWorkspace`)**: 2 Skeleton Comparison Cards + 1 Skeleton Chart Container.
- **Section 5 (`OperatingPatternTabsCard`)**: 1 Skeleton Summary Box + 1 Skeleton Chart / Heatmap Matrix.
- **Section 6 (`UnifiedActionCenter`)**: 4 Skeleton Context Blocks + 3 Skeleton Action Cards.

---

## 5. Phase 1 Implementation Evidence & PO Checklists

### **Phase 1: Filter Bar & Executive Command Belt (Sections 1 & 2) - [IMPLEMENTED]**
- **Files Modified**:
  - `frontend/src/components/shared/SharedLayout.jsx` (`GlobalFilterBar`)
  - `frontend/src/features/dashboard/components/UnifiedCommandSummary.jsx` (`CommandCard`, `CommandSummarySkeleton`, `Executive Insight Banner`)
- **Key Enhancements Implemented**:
  1. Filter inputs upgraded with hover highlight (`hover:border-blue-400 hover:bg-slate-50/50`) and focus ring outline (`focus-within:ring-2 focus-within:ring-blue-600`).
  2. 4 Executive KPI Cards upgraded with metric tag chips (`card.question`), bold tabular numbers (`text-2xl xl:text-3xl font-black tabular-nums`), and preserved semantic tone classes (`success`, `comparison`, `volume`, `danger`).
  3. Executive Insight Callout transformed into a prominent Bản tin chỉ đạo điều hành banner with brand blue badge icon (`#003E7E`) and subtle gradient backdrop (`from-blue-50/90 via-indigo-50/30 to-blue-50/50`).
  4. Restrained geometry-matched pulse skeletons (`CommandSummarySkeleton`) implemented for loading states with `motion-reduce:animate-none` support.
  5. 150ms transitions applied without layout shift.
- **PO Visual Verification Checklist Phase 1**:
  - [ ] **Filter Bar Inputs**: Hover over date inputs, BCVH dropdown, and search input to observe smooth blue border highlights and focus-within ring outlines.
  - [ ] **KPI Command Cards**: Verify 4 cards render metric tag chips ("Chất lượng", "Vị thế toàn quốc", "Quy mô", "Cần xử lý"), bold tabular metrics, and smooth hover depth.
  - [ ] **Executive Insight Banner**: Observe high-visibility "Bản tin chỉ đạo điều hành" callout with brand icon and blue accent border.
  - [ ] **Loading Skeleton**: Verify restrained geometry-matched pulse skeleton cards display smoothly during fetch.

---

## 6. Protected Boundaries & Handoff Directive

- **Existing KPI Targets & Thresholds**: Existing KPI targets and thresholds remain exactly as defined by the authoritative SSOT.
- **No Data or API Contract Changes**: Parameters for `/f13/ranking/bcvh` and `/f13/dashboard/*` stay unchanged.
- **No Permission or Navigation Changes**: Viewer/Admin access levels, port 5178/5050, and route `/f13/dashboard` remain fixed.
- **Preserve Semantic SSOT Colors**: Operational status colors, labels, and thresholds remain 100% untouched in meaning and logic, consumed directly from current SSOT.
- **Preserve Compact 9-Column BCVH Contract**: Dashboard uses compact 9-column `BcvhOperationTable`. Detailed 22-column ranking stays on `/f13/ranking/bcvh`.
- **Handoff Directive**: Phase 1 implementation complete. Execution stopped at `READY FOR PO CHECK`. Phase 2, 3, and 4 implementation is NOT dispatched until PO reviews and approves Phase 1.

