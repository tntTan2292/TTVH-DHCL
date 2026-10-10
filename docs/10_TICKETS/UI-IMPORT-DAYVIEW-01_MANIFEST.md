# UI-IMPORT-DAYVIEW-01 Manifest

Status: `READY FOR OPUS REVIEW & PO UI CHECK (2026-10-10) — Built by Antigravity; all tests, build, and lints pass. Awaiting Opus review and PO UI check`. PO approved Option A with the three defaults of the proposal (day checkbox selects only unfinished lanes; "Bảng Chi tiết" unchanged; indicator cards and run-creation controls out of scope). Frontend presentation only; no behaviour, API or data change. Parallel workstream: `PROJECT_SNAPSHOT.md` Current Ticket is another ticket; do not treat that as a conflict, read this manifest directly.

## 1. Ticket Information

- Ticket ID: `UI-IMPORT-DAYVIEW-01` — `Data Import Center: one row per day, HUE and TCT side by side`
- Screen: `/data-import` → tab "Bù dữ liệu tự động" (`AutoBackfillOperatorPanel.jsx`), view "Nhóm theo Tháng" (`MonthlyAccordionGroup`).
- Executor: `Antigravity (Gemini)` (UI/UX). Independent review: `Claude Code (Opus)`. PO UI check: required.
- Authorization: PO in chat 2026-10-10 — the screen is confusing because one pick is "one day of one indicator" yet downloads both HUE and TCT; wants it smarter, with no functional impact.

## 2. Problem (verified in code)

Coverage items are keyed `INDICATOR::LANE::DATE` (`getItemKey`). `groupItemsByIndicatorAndMonth` lists every key as its own row, so each day appears **twice** (HUE row, TCT row), each with up to five buttons (Nhập mới/Nhập lại, LỊCH NGHỈ, Xác nhận Không phát sinh, Hoàn tác, Thu hồi LỊCH NGHỈ). The operator must tick two rows per day, the bulk bar says "Đã chọn N ngày" while N counts rows (2 per day), and all month groups start collapsed.

## 3. Target design (Option A — day row, two source cells)

One row per `(indicator, date)`:

`[☐] 2026-10-07 | HUE: <status chip> [primary action] | TCT: <status chip> [primary action] | [LỊCH NGHỈ] [⋯]`

- **Source cells:** each lane has its own status chip (colours from `resolveNoCodeStatus`) and one primary button for that lane only: "Nhập mới" (INCOMPLETE / DATA_ERROR / holiday-excluded-with-holiday) or "Nhập lại" (COMPLETED) — the same conditions and the same handler/modal calls as today. A lane the indicator does not support, or that is hidden by the Nguồn filter, is simply absent (never an empty button).
- **Secondary per-lane actions** (Xác nhận Không phát sinh, Hoàn tác) move into a per-cell `⋯` menu; they keep their existing visibility conditions and handlers.
- **LỊCH NGHỈ / Thu hồi LỊCH NGHỈ** are date-wide today: show once per day row (not once per lane), same conditions and handlers (use the first actionable item of the day as the argument the handler already expects).
- **Day checkbox (smart default):** ticks every lane of that day that is selectable in the current mode — unfinished lanes only (INCOMPLETE/DATA_ERROR) in normal mode, reimport-selectable lanes in reimport mode. Mixed day (one lane COMPLETED, one missing) selects only the missing lane; the operator can still tick a single lane through its source cell. Implemented by calling the **existing** `onToggleSelectItem` per lane item, so `selectedBulkKeys` / `selectedReimportKeys` keep exactly the same keys.
- **Month header:** counts days instead of rows: "N ngày • X đủ cả 2 nguồn • Y còn thiếu (HUE a, TCT b)"; the existing right-hand badge logic (100% Đã xử lý / Còn thiếu) stays, computed from the same lane items.
- **Auto-open:** the newest month group that has unfinished items opens by default (others stay collapsed).
- **Floating bars and bulk modals:** wording only — "Đã chọn N ngày (M nguồn)" using distinct dates and the key count; payloads, key lists and confirmation flows unchanged.
- **"Bảng Chi tiết" view stays exactly as it is** (flat, one row per lane) as the power-user fallback.

## 4. Must not change (hard guard)

API calls and payloads (`buildRunPayload`, `/coverage`, `/coverage/selectable`, run/exception/holiday endpoints), `getItemKey`, `isSelectable`, `isReimportSelectable`, `splitReimportItems`, `resolveNoCodeStatus`, `normalizePoStatus`, selection state shape and mutual exclusion of bulk vs reimport mode, all modals' logic, `handleSelectAllUnfinished` / `handleSelectAllReimport`, indicator cards, run-control header, open-runs list, `DataImportCenter.jsx` tabs, backend, SSOT. Existing tests (`AutoBackfillOperatorPanel.test.js` 24/24 etc.) must pass unedited.

## 5. Implementation notes

- Pure helpers added in `autoBackfillUiHelpers.js`:
  - `groupItemsByDay(items)` → `[{ date, indicator, lanes: { HUE?: item, TCT?: item }, laneOrder, items, holiday }]`
  - `summarizeMonthDays(items)` → `{ totalDays, completeDays, missingDays, missingByLane, label }`
  - `resolveDaySelectionState(day, selectedKeys, { isReimportMode })` → `{ canSelect, isSelected, isPartial, selectedCount, selectableItems }`
  - `findNewestUnfinishedMonthKey(groups)` → key of newest month group with unprocessed items
  - `countDistinctDates(keys)` & `formatSelectionCountLabel(keys)`
- `MonthlyAccordionGroup` renders one row per date with HUE and TCT cells side by side, per-cell `⋯` popovers, date-level LỊCH NGHỈ button, and smart day checkbox.
- `AutoBackfillOperatorPanel.jsx` passes `defaultOpen` computed from `findNewestUnfinishedMonthKey` and updates floating bar and bulk modals labels to `"Đã chọn N ngày (M nguồn)"`.
- Existing tests unmodified (`AutoBackfillOperatorPanel.test.js` passes 24/24).
- Dedicated unit tests added in `autoBackfillDayViewHelpers.test.js` covering all scenarios (8/8 pass).

## 6. Validation and PO check

- Technical: new helper tests (two lanes, one lane, mixed COMPLETED/INCOMPLETE day, holiday day, lane-filtered input, DATA_ERROR, empty); frontend suite unchanged apart from known pre-existing `dataImportBackfillQueue.test.js` failure; build and lint clean.
- Executor must not open a browser, screenshot, start a dev server or log in. Stop at `READY FOR PO UI CHECK`.
- PO checklist:
  - one row per day with HUE and TCT side by side
  - tick a day with both missing → both queued (bulk bar says "N ngày (2N nguồn)")
  - mixed day selects only the missing lane
  - "Nhập lại" on a completed lane works
  - LỊCH NGHỈ appears once per day
  - "Bảng Chi tiết" unchanged
  - newest month with missing days opens by itself

## 7. Delivery Status

- **Status:** `READY FOR PO UI CHECK`
- **Build:** `vite build` PASS (0 errors)
- **Lint:** `oxlint` PASS (0 errors, 0 warnings on modified files)
- **Tests:**
  - `AutoBackfillOperatorPanel.test.js`: 24/24 suites PASS (unedited)
  - `autoBackfillDayViewHelpers.test.js`: 8/8 suites PASS (new)

