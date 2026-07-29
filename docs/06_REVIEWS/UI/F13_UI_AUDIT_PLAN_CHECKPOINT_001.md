# F13 UI Audit Plan Checkpoint 001 - Operation Dashboard UI/UX Audit & Standardization Plan

- Ticket ID: `F13-UI-AUDIT-PLAN`
- Date: `2026-07-29`
- Target Component: `Operation Dashboard (/f13/dashboard)`
- Visual Inspiration: `CRM 3.0 Dashboard (Interface surfaces, depth, saturation, borders, shadows, typography, controls, feedback)`
- Authority: `PO PASS PHASE 1 REMEDIATION & PO PASS PHASE 2 / READY FOR PHASE 3 DISPATCH`
- PO Status: `PO PASS PHASE 1 REMEDIATION; PO PASS PHASE 2 – COMPACT BCVH TABLE UI/UX`

---

## 1. Executive Summary & Recorded PO Decisions

This UI/UX Plan defines the visual, interaction, and structural standardization for the **Operation Dashboard** (`/f13/dashboard`) of QIS V2.

The Product Owner has officially recorded:
- **`PO PASS PHASE 1 REMEDIATION`**
- **`PO PASS PHASE 2 – COMPACT BCVH TABLE UI/UX`**

### Current Workflow & Handoff Status:
- **Phase 1**: `COMPLETED / PO PASS` (Commit `6ea7819`).
- **Phase 1 Remediation**: `COMPLETED / PO PASS` (Commit `cbe5bc2`).
- **Phase 2**: `COMPLETED / PO PASS` (Commit `dd9cbf5`).
- **Phase 3 and Phase 4**: `NOT YET DISPATCHED`. Do not implement additional UI changes or start Phase 3 in this step.
- **Next Action**: Awaiting ChatGPT coordination to issue a separately bounded prompt for Phase 3 implementation (Charts, Patterns & Action Center Polish).

---

## 2. Protected Boundaries & Deferred Findings

### A. Deferred Finding: Executive Insight Content Quality Review
> [!IMPORTANT]
> **Executive Insight Content Quality Review — DEFERRED / NOT AUTHORIZED under current UI/UX implementation phases.**
> 1. **Visual Presentation Accepted**: The visual presentation and layout of *"Bản tin chỉ đạo điều hành"* (full-width CRM 3.0 card banner) is accepted by Product Owner.
> 2. **Scope Isolation**: Its generated wording, recommendations, prioritization, and business usefulness belong to backend content-generation/business-interpretation logic, NOT the current UI/UX scope.
> 3. **Preservation Mandate**: Future Phase 3 and Phase 4 work must preserve existing content-generation logic exactly and MUST NOT rewrite, remove, or add generated conclusions.
> 4. **Future Ticket Authorization**: A separately authorized future ticket must trace the content source, determine whether it is rule/template-based or AI-generated, and assess factual accuracy and leadership usefulness.

### B. Shared Visual Components Policy
1. The current Phase 1 styling (`GlobalFilterBar` in `SharedLayout.jsx`) that also appears on BCVH Ranking (`/f13/ranking/bcvh`) is accepted by Product Owner.
2. This acceptance applies **ONLY** to the current shared visual treatment.
3. Any future change to a shared component must validate both `/f13/dashboard` and `/f13/ranking/bcvh`.
4. A future BCVH Ranking ticket must not assume that changing shared styling is automatically authorized for Operation Dashboard.

### C. Table Presentation Isolation Policy
1. **Operation Dashboard Table**: Operation Dashboard continues rendering the accepted compact 9-column `BcvhOperationTable` (`src/components/f13/BcvhOperationTable.jsx`).
2. **BCVH Ranking Table**: BCVH Ranking continues rendering the independent detailed `UnifiedBcvhAnalysisTable` (`features/dashboard/components/UnifiedBcvhAnalysisTable.jsx`).
3. **No Reconnection**: Do not reconnect the Ranking table, its adapter, expandable analysis presentation, column model, or detailed ranking behavior to Dashboard.
4. **No Shared Component Replacement**: Do not replace either table with a shared presentation component unless Product Owner explicitly approves a new contract.
5. **Future Verification**: Future BCVH Ranking remediation must verify that Dashboard table structure, styling, and behavior remain unchanged.

### D. SSOT & Scope Boundaries
- **Authoritative SSOT Consumption**: Business-semantic colors, KPI labels, status meanings, thresholds, formulas, target lines, and route-quality classifications remain 100% UNCHANGED, consumed directly from SSOT mappers.
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
├── [Section 4] IntegratedTrendRiskWorkspace (Trend Chart & Leadership D-1/D-7 Grid) [Phase 3 Pending Dispatch]
├── [Section 5] OperatingPatternTabsCard (Weekday/Month/Heatmap Patterns & Charts) [Phase 3 Pending Dispatch]
└── [Section 6] UnifiedActionCenter (Executive Bulletin & Recommendation Cards) [Phase 3 Pending Dispatch]
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

### **Phase 3: Charts, Patterns & Action Center Polish (Sections 4, 5 & 6) - [NOT YET DISPATCHED]**
- **Status**: `NOT YET DISPATCHED`.
- **Scope**: Polish `IntegratedTrendRiskWorkspace`, `OperatingPatternTabsCard`, and `UnifiedActionCenter`.

### **Phase 4: Interaction Polish & Motion Support (Operation Dashboard-Wide) - [NOT YET DISPATCHED]**
- **Status**: `NOT YET DISPATCHED`.
- **Scope**: Dashboard-wide 150ms transition and `prefers-reduced-motion` validation.

---

## 7. Protected Boundaries & Handoff Directive

- **Existing KPI Targets & Thresholds**: Existing KPI targets and thresholds remain exactly as defined by the authoritative SSOT.
- **No Data or API Contract Changes**: Parameters for `/f13/ranking/bcvh` and `/f13/dashboard/*` stay unchanged.
- **No Permission or Navigation Changes**: Viewer/Admin access levels, port 5178/5050, and route `/f13/dashboard` remain fixed.
- **Handoff Directive**: Phase 1, Phase 1 Remediation, and Phase 2 are fully completed and awarded PO PASS. Execution stopped. Phase 3 and Phase 4 implementation is NOT dispatched until ChatGPT coordination issues a separately bounded prompt for Phase 3.

