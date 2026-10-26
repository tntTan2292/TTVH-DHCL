# UI-IMPORT-F42-01 Manifest

Status: `OPEN / FOR ANTIGRAVITY` (2026-10-26). Presentation only: F4.2 in the Data Import Center day view.

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
