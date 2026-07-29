# F13 UI Audit Plan Checkpoint 001 - Operation Dashboard UI/UX Audit & Standardization Plan

- Ticket ID: `F13-UI-AUDIT-PLAN`
- Date: `2026-07-29`
- Target Component: `Operation Dashboard (/f13/dashboard)`
- Visual Inspiration: `CRM 3.0 Dashboard (Interface surfaces, depth, saturation, borders, shadows, typography, controls, feedback)`
- Authority: `PHASE 1 REMEDIATED & PHASE 2 IMPLEMENTED / READY FOR PO CHECK`
- PO Status: `READY FOR PO CHECK (Phase 1 Remediation & Phase 2 Complete)`

---

## 1. Executive Summary & Design Scope Clarification

This UI/UX Plan defines the visual, interaction, and structural standardization for the **Operation Dashboard** (`/f13/dashboard`) of QIS V2.

### Phase 1 Visual Remediation & Phase 2 Status:
- **Phase 1 Remediation Implemented**: Removed secondary note *"Chuyển hoàn được giữ riêng trong mẫu đo kiểm, không tính vào bưu gửi cần xử lý."* from `UnifiedCommandSummary`. Expanded the "Bản tin chỉ đạo điều hành" block to use the 100% full available width of that row.
- **Phase 2 Implemented**: CRM 3.0-inspired neutral header surfaces (`bg-slate-100 text-slate-700 font-bold`), visual shadow separator for sticky `Tên BCVH` column (`shadow-[4px_0_10px_-4px_rgba(0,0,0,0.12)]`), tabular number readability (`tabular-nums`), visually restyled guidance drawer with clean status cards, 150ms transitions (`motion-reduce:transition-none`), and geometry-matched skeleton loading rows.
- **Validation**: 100% unit tests passed. Presentation isolation verified for both `/f13/dashboard` and `/f13/ranking/bcvh`. Zero business logic or API contracts changed.
- **Current State**: Stopped at `READY FOR PO CHECK`. Phase 3 and Phase 4 implementation is NOT dispatched.

---

## 2. Protected Boundaries & Component Isolation Rules

### A. Shared Visual Components Policy
1. The current Phase 1 styling (`GlobalFilterBar` in `SharedLayout.jsx`) that also appears on BCVH Ranking (`/f13/ranking/bcvh`) is accepted by Product Owner.
2. This acceptance applies **ONLY** to the current shared visual treatment.
3. Any future change to a shared component must validate both `/f13/dashboard` and `/f13/ranking/bcvh`.
4. A future BCVH Ranking ticket must not assume that changing shared styling is automatically authorized for Operation Dashboard.

### B. Table Presentation Isolation Policy
1. **Operation Dashboard Table**: Operation Dashboard continues rendering the accepted compact 9-column `BcvhOperationTable` (`src/components/f13/BcvhOperationTable.jsx`).
2. **BCVH Ranking Table**: BCVH Ranking continues rendering the independent detailed `UnifiedBcvhAnalysisTable` (`features/dashboard/components/UnifiedBcvhAnalysisTable.jsx`).
3. **No Reconnection**: Do not reconnect the Ranking table, its adapter, expandable analysis presentation, column model, or detailed ranking behavior to Dashboard.
4. **No Shared Component Replacement**: Do not replace either table with a shared presentation component unless Product Owner explicitly approves a new contract.
5. **Future Verification**: Future BCVH Ranking remediation must verify that Dashboard table structure, styling, and behavior remain unchanged.

### C. SSOT & Scope Boundaries
- **Authoritative SSOT Consumption**: Business-semantic colors, KPI labels, status meanings, thresholds, formulas, target lines, and route-quality classifications remain 100% UNCHANGED, consumed directly from SSOT mappers.
- **No Phase 3 or 4 Code Implementation**: Execution stops at `READY FOR PO CHECK`.

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
├── [Section 2] UnifiedCommandSummary (4 Executive KPI Cards + Executive Insight Callout) [Phase 1 REMEDIATED / READY FOR PO CHECK]
├── [Section 3] BcvhOperationTable (Compact 9-Column BCVH Overview Table) [Phase 2 IMPLEMENTED / READY FOR PO CHECK]
├── [Section 4] IntegratedTrendRiskWorkspace (Trend Chart & Leadership D-1/D-7 Grid) [Phase 3 Pending]
├── [Section 5] OperatingPatternTabsCard (Weekday/Month/Heatmap Patterns & Charts) [Phase 3 Pending]
└── [Section 6] UnifiedActionCenter (Executive Bulletin & Recommendation Cards) [Phase 3 Pending]
```

---

## 6. Phase Status & Implementation Evidence

### **Phase 1: Filter Bar & Executive Command Belt (Sections 1 & 2) - [REMEDIATED / READY FOR PO CHECK]**
- **Status**: `REMEDIATED / READY FOR PO CHECK`.
- **Files Modified**: `UnifiedCommandSummary.jsx`, `unifiedCommandSummary.test.js`.
- **Key Remediation**: Removed secondary note *"Chuyển hoàn được giữ riêng trong mẫu đo kiểm, không tính vào bưu gửi cần xử lý."* to the right of Executive Insight. Expanded "Bản tin chỉ đạo điều hành" banner to full available width (100%) of the row.

### **Phase 2: Compact 9-Column BCVH Table Visual Polish (Section 3) - [IMPLEMENTED / READY FOR PO CHECK]**
- **Status**: `READY FOR PO CHECK` (Commit `dd9cbf5`).
- **Files Modified**: `src/components/f13/BcvhOperationTable.jsx`.
- **Key Enhancements**: CRM 3.0 header surfaces, sticky column shadow separator, tabular numbers, guidance drawer restyling, pulse skeleton rows.

---

## 7. Protected Boundaries & Handoff Directive

- **Existing KPI Targets & Thresholds**: Existing KPI targets and thresholds remain exactly as defined by the authoritative SSOT.
- **No Data or API Contract Changes**: Parameters for `/f13/ranking/bcvh` and `/f13/dashboard/*` stay unchanged.
- **No Permission or Navigation Changes**: Viewer/Admin access levels, port 5178/5050, and route `/f13/dashboard` remain fixed.
- **Handoff Directive**: Phase 1 remediation and Phase 2 implementation complete. Execution stopped at `READY FOR PO CHECK`. Phase 3 and Phase 4 implementation is NOT dispatched until PO reviews and approves Phase 1 & 2.

