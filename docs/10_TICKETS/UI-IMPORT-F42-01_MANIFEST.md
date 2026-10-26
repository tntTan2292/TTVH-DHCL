# UI-IMPORT-F42-01 Manifest

Status: `READY FOR PO CHECK` (2026-10-26). Presentation only: F4.2 in the Data Import Center day view.

## 1. Ticket Information

- Ticket ID: `UI-IMPORT-F42-01`
- Executor: `Antigravity` (UI); backend and data already done by Claude Code (`F42-PHASE-3_MANIFEST.md` Section 8)
- Activation authority: `PO chat 2026-10-26: with "Tất cả Chỉ tiêu" the day view shows only F1.1 to F4.1; F4.2 appears only after choosing the F4.2 chip. Antigravity must fix the layout.`
- Does not change Current Ticket. PO UI Check Required: `Yes`.

## 2. Required Reading

- `docs/10_TICKETS/F42-PHASE-3_MANIFEST.md` Section 8 (what Claude Code already changed: the indicator lists in `autoBackfillUiHelpers.js`, `AutoBackfillSmartDayView.jsx`, `AutoBackfillOperatorPanel.jsx`, `AutoBackfillImportHistory.jsx`).
- `docs/10_TICKETS/IMPORT-LOG-AUDIT-01_MANIFEST.md` (the one-row-per-day layout the PO accepted).

## 3. Observed defect (PO screenshot)

Filter bar shows the F4.2 chip (290 missing days) and the day table header "Chọn cả 5 chỉ tiêu", yet in the "Gộp 1 dòng/ngày" view with "Tất cả Chỉ tiêu" only the columns F1.1, F1.2, F1.3, F4.1 are visible; the F4.2 column (HUE / TCT cells, "Đã hoàn tất" / "Nhập lại") does not show. Choosing the F4.2 chip alone shows it. Likely causes to check, not conclusions: the fifth column pushed out of the visible width inside the `overflow-x-auto` table (each indicator column has `min-w-[176px]`), a place that still builds the visible columns from four indicators, or the "all" view filtering the F4.2 items out.

## 4. Scope

In: the day view (one row per day, five indicator slots), the flat table, the day/indicator select-all controls and the history filter, so F4.2 is a full fifth indicator next to the others with the same HUE / TCT cells and actions, readable at the PO's usual screen width (compact the columns or scroll with a sticky date column, as the screen already does for other widths). Label and short name already set: `F4.2`, "Phát giao bưu tá".

Out: backend, registry, data, the other indicators' behaviour, any new colour family for F4.2 (its report colours belong to the later `F42-DASHBOARD-UI-01`).

## 5. Done when

With "Tất cả Chỉ tiêu" the day view shows F4.2 beside F4.1 for every day (cells follow the coverage data: 25/10 and 10/10 "Đã hoàn tất", the rest missing), "Chọn cả 5 chỉ tiêu" selects the five, frontend tests and `oxlint` unchanged, then PO UI check.

## 6. Implementation & Delivery (Antigravity, 2026-10-26)

- **Root Cause Confirmed**:
  The previous combined view had minimum indicator widths (`min-w-[176px]`) and unwrapped lane rows (~210px) that together with the Date column (~180px), Checkbox column, and Holiday column forced the table width beyond 1350px-1450px. On standard 1366px-1440px displays with the 280px sidebar, the available viewport was ~1038px-1110px. This pushed the 5th column (`F4.2`) and holiday column entirely off-screen to the right inside the horizontal overflow container.
- **Changes Delivered**:
  1. **Dynamic 5-Indicator Display**: In `AutoBackfillSmartDayView.jsx`, computed `displayIndicators` merging `indicatorsList` and `DEFAULT_DAY_VIEW_INDICATORS` to guarantee all 5 indicators (`F1.1`, `F1.2`, `F1.3`, `F4.1`, `F4.2`) are cleanly mapped and rendered side-by-side in both header and rows.
  2. **Compact Column Styling**: Reduced column min-width to `min-w-[148px]`, streamlined `CompactIndicatorCell` internal padding/gaps (`p-1`, `gap-1`), lane tags (`text-[9px]`), status badges (`max-w-[66px]`), and action buttons (`text-[9px] px-1 py-0.5`). All 5 indicators comfortably fit side-by-side on typical 1366px+ laptop/desktop monitors without horizontal clipping.
  3. **Sticky Date & Checkbox Columns**: Added `sticky left-0` (Col 1 selection checkbox) and `sticky left-10` (Col 2 Business Date + Anchor Run) with explicit z-indices (`z-20` on `thead`, `z-10` on `tbody`), border separators, and subtle shadow (`shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)]`) in both Combined View and Flat Table View. On narrow viewports or when zoomed in, scrolling horizontally keeps the date permanently pinned and readable.
  4. **Flat Table & Controls Audit**: Verified flat table displays F4.2 rows, "Chọn cả 5 chỉ tiêu" buttons under date operate smoothly, column header select toggles F4.2 cells across page, and history filter (`AutoBackfillImportHistory.jsx`) provides the F4.2 option.
  5. **Automated Tests**: Updated `autoBackfillAuditHelpers.test.js` to assert F4.2 indicator slot presence and verify slot population with real/mocked F4.2 items.

## 7. Validation

- `node --test` (frontend): **786/786 passed** (0 failures).
- `npm run build`: **pass** (vite build completed clean in ~1.5s).
- `npm run lint`: **0 errors** (42 pre-existing warnings unchanged).
- Backend / registry: untouched.
- Status: `READY FOR PO CHECK`.

