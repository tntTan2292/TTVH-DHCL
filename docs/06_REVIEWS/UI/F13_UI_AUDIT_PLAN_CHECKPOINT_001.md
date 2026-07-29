# F13 UI Audit Plan Checkpoint 001 - Operation Dashboard UI/UX Audit & Standardization Plan

- Ticket ID: `F13-UI-AUDIT-PLAN`
- Date: `2026-07-29`
- Target Component: `Operation Dashboard (/f13/dashboard)`
- Visual Inspiration: `CRM 3.0 Dashboard (Interface surfaces, depth, saturation, borders, shadows, typography, controls, feedback)`
- Authority: `PO PASS PHASE 1 / READY FOR PHASE 2 DISPATCH`
- PO Status: `PO PASS PHASE 1 – OPERATION DASHBOARD UI/UX`

---

## 1. Executive Summary & Recorded PO Decision

This UI/UX Plan defines the visual, interaction, and structural standardization for the **Operation Dashboard** (`/f13/dashboard`) of QIS V2.

The Product Owner has officially recorded: **`PO PASS PHASE 1 – OPERATION DASHBOARD UI/UX.`**

The Product Owner also accepts the current shared visual styling impact on BCVH Ranking (`GlobalFilterBar` styling) because it remains visually suitable and reduces future standardization effort.

### Current Workflow & Handoff Status:
- **Phase 1 Status**: `COMPLETED / PO PASS`.
- **Phase 2, Phase 3, Phase 4**: Not yet dispatched. Do not implement additional UI changes in this step.
- **Next Action**: Awaiting ChatGPT coordination to issue a separately bounded prompt for Phase 2 implementation (Compact 9-Column BCVH Table Visual Polish).

---

## 2. Protected Boundaries & Component Isolation Rules

### A. Shared Visual Components Policy
1. The current Phase 1 styling (`GlobalFilterBar` in `SharedLayout.jsx`) that also appears on BCVH Ranking (`/f13/ranking/bcvh`) is accepted by Product Owner.
2. This acceptance applies **ONLY** to the current shared visual treatment.
3. Any future change to a shared component must validate both `/f13/dashboard` and `/f13/ranking/bcvh`.
4. A future BCVH Ranking ticket must not assume that changing shared styling is automatically authorized for Operation Dashboard.

### B. Table Presentation Isolation Policy
1. **Operation Dashboard Table**: Operation Dashboard must continue rendering the accepted compact 9-column `BcvhOperationTable` (`src/components/f13/BcvhOperationTable.jsx`).
2. **BCVH Ranking Table**: BCVH Ranking must continue rendering the independent detailed `UnifiedBcvhAnalysisTable` (`features/dashboard/components/UnifiedBcvhAnalysisTable.jsx`).
3. **No Reconnection**: Do not reconnect the Ranking table, its adapter, expandable analysis presentation, column model, or detailed ranking behavior to Dashboard.
4. **No Shared Component Replacement**: Do not replace either table with a shared presentation component unless Product Owner explicitly approves a new contract.
5. **Future Verification**: Future BCVH Ranking remediation must verify that Dashboard table structure, styling, and behavior remain unchanged.

### C. SSOT & Scope Boundaries
- **Authoritative SSOT Consumption**: Business-semantic colors, KPI labels, status meanings, thresholds, formulas, target lines, and route-quality classifications remain 100% UNCHANGED, consumed directly from SSOT mappers.
- **No Code Implementation in this Step**: Documentation, commit, and push pass only.

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

> **Implementation Guard**: Future UI implementation may change interface surfaces, visual depth, typography and interaction styling, but must preserve each component’s existing semantic resolver instead of assigning new business-semantic Tailwind classes directly.

---

## 4. Interaction, Feedback & Motion Standard

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

## 5. Structure & Content Section Inventory

The Operation Dashboard UI consists of **1 Header/QuickNav Area** plus **6 Main Content Sections**:

```
[Header & QuickNav Area] Page Title + "Mở xếp hạng BCVH" Action Button
├── [Section 1] GlobalFilterBar (Date Range, BCVH Selector, Search Input) [Phase 1 COMPLETED / PO PASS]
├── [Section 2] UnifiedCommandSummary (4 Executive KPI Cards + Executive Insight Callout) [Phase 1 COMPLETED / PO PASS]
├── [Section 3] BcvhOperationTable (Compact 9-Column BCVH Overview Table) [Phase 2 Pending]
├── [Section 4] IntegratedTrendRiskWorkspace (Trend Chart & Leadership D-1/D-7 Grid) [Phase 3 Pending]
├── [Section 5] OperatingPatternTabsCard (Weekday/Month/Heatmap Patterns & Charts) [Phase 3 Pending]
└── [Section 6] UnifiedActionCenter (Executive Bulletin & Recommendation Cards) [Phase 3 Pending]
```

---

## 6. Phase Status & Remediation Roadmap

### **Phase 1: Filter Bar & Executive Command Belt (Sections 1 & 2) - [PO PASS]**
- **Status**: `COMPLETED / PO PASS`.
- **Files Modified**: `SharedLayout.jsx` (`GlobalFilterBar`), `UnifiedCommandSummary.jsx`.
- **Commit**: `6ea7819`.

### **Phase 2: Compact 9-Column BCVH Table Visual Polish (Section 3) - [NOT DISPATCHED]**
- **Status**: `NOT YET DISPATCHED`.
- **Scope**: Upgrade `BcvhOperationTable` (`src/components/f13/BcvhOperationTable.jsx`) header `bg-slate-50`, sticky drop shadow, progress bar, and restyle existing guidance drawer.

### **Phase 3: Charts, Patterns & Action Center Polish (Sections 4, 5 & 6) - [NOT DISPATCHED]**
- **Status**: `NOT YET DISPATCHED`.
- **Scope**: Polish `IntegratedTrendRiskWorkspace`, `OperatingPatternTabsCard`, and `UnifiedActionCenter`.

### **Phase 4: Interaction Polish & Motion Support (Operation Dashboard-Wide) - [NOT DISPATCHED]**
- **Status**: `NOT YET DISPATCHED`.
- **Scope**: Dashboard-wide 150ms transition and `prefers-reduced-motion` validation.

