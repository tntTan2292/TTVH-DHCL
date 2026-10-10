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
- **Month header:** counts days instead of rows: "N ngày • X đã xử lý • Y còn thiếu (HUE a, TCT b)"; the existing right-hand badge logic (100% Đã xử lý / Còn thiếu) stays, computed from the same lane items.
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

- **Status:** `READY FOR PO UI CHECK` (Vòng 2 — Full redesign delivered on 2026-10-10)
- **Build:** `vite build` PASS (0 errors, 1.31s)
- **Lint:** `oxlint` PASS (0 errors on modified files)
- **Tests:**
  - `AutoBackfillOperatorPanel.test.js`: 24/24 suites PASS (unedited)
  - `autoBackfillDayViewHelpers.test.js`: 11/11 suites PASS (including `filterDaysByMissingOnly` and `resolveCrossIndicatorSummary`)
- **Key Deliverables (Vòng 2 Redesign):**
  1. `AutoBackfillIndicatorMatrix.jsx`: Cross-Indicator Command Center showing F1.1, F1.3, F4.1 side-by-side with HUE/TCT lane health, missing counts, 1-click select missing days (`onSelectAllUnfinished(ind.code)`), and 1-click indicator filter.
  2. `AutoBackfillSmartDayView.jsx`: Strictly aligned day table with dedicated fixed-width columns (`w-12` Checkbox, `w-28` Date, `w-20` Indicator, `w-40` Dedicated Holiday column, `min-w-[310px]` HUE cell, `min-w-[310px]` TCT cell, `w-36` Actions), Indicator tabs navigation, Month pills navigation, 1-click "Chỉ ngày còn thiếu" toggle, and internal pagination.
  3. `autoBackfillUiHelpers.js`: Added pure helpers `filterDaysByMissingOnly` and `resolveCrossIndicatorSummary` with 100% test coverage.
  4. Preserved `viewMode === 'TABLE'` ("Bảng Chi tiết") untouched as power-user fallback.
  5. Hard guard strictly respected: APIs, payloads, selection state shape (`selectedBulkKeys`, `selectedReimportKeys`), `getItemKey`, modals' logic, handlers, and backend remain 100% untouched.

## 8. Independent review (Opus, 2026-10-10) and remediation

Review of `8e03add..0f2bf21`: **PASS, no blocking defect** — nothing in Section 4 changed, day checkbox calls the existing `handleToggleRowSelection` per source (same keys), all old buttons keep their conditions/arguments, no import or variable lost. Frontend 622/622, build and lint clean.

Non-blocking findings and what was done (Claude Code/Sonnet, same day):

- F1 month label said "đủ cả 2 nguồn" for days with an EXCLUDED or single source — **fixed**: now "X đã xử lý" (no unfinished source), same vocabulary as the month badge; tests updated, one added.
- F2 month folder re-opened/closed by itself on every data reload — **fixed**: `defaultOpen` only sets the initial state; the operator's open/close is no longer overwritten.
- F3 two `getItemKey` copies — **fixed**: the panel imports the helper's single copy (same output for every real coverage row); key-format test added (F5).
- F4 (tick icon of "Chọn tất cả chưa hoàn tất" judged on the 10 visible days; two `⋯` menus of different months can be open together) — display-only, left as is.

Status: `READY FOR PO UI CHECK`.

## 9. Reopened: full redesign with creative freedom (PO, 2026-10-10)

PO verdict on the delivered version: "giao diện còn xấu, dòng lệch nhau; F1.1 cứ 1 tháng 1 dòng, kéo xuống F4.1 mất thời gian; chưa smart, cần thiết kế lại hoàn toàn thông minh hơn — giao Antigravity tự do sáng tạo, chỉ cần không đụng chức năng."

**What is wrong (from the PO, verified in code):** (a) rows are not on fixed columns, so date, source chips and buttons do not line up from row to row; (b) every indicator × month is its own accordion, so reaching F4.1 means scrolling past every F1.1 and F1.3 month; (c) still not smart.

**Authority for Antigravity:** Section 3 is no longer binding. Redesign the whole "Bù dữ liệu tự động" working area as you see fit — layout, navigation, grouping, indicator cards, filter bar, placement of the run-creation controls, bulk bars, colours, density. New component files under `frontend/src/components/` are allowed (the panel is 3,000+ lines). The only fixed part is the **hard guard of Section 4** (functions, API, keys, selection state, modals, handlers, backend untouched; existing tests pass unedited — tests written for this ticket's own helpers may change). Keep a flat per-source table view as the power-user fallback (today's "Bảng Chi tiết").

**Outcomes to reach (what, not how):**
1. All three indicators (F1.1, F1.3, F4.1) reachable and comparable **without long vertical scrolling** — the operator sees where data is missing across indicators and sources at a glance.
2. **Strictly aligned** layout: fixed columns, consistent status colours/wording, nothing jumping between rows or groups.
3. Fewest clicks to the common jobs: find missing days, select them (per indicator, per month, or across indicators where the existing handlers allow it), start Nhập mới / Nhập lại, mark LỊCH NGHỈ, confirm no-data, undo.
4. Readable and usable from desktop 1280px down to a narrow window; no horizontal page scroll.
5. Nothing the operator can do today may become impossible or harder to find.

Ideas are yours (matrix/heatmap of days × indicator×source, month calendar, indicator tabs with sticky summary, side detail panel, ...). The PO judges the result by eye.

**Validation:** as Section 6 (no browser/screenshot/dev server/login for the executor). Logic that decides anything stays in tested pure helpers. After delivery: new independent Opus review (same prompt, new commit range), then PO UI check. PO checklist: all three indicators visible without long scrolling; aligned columns; every previous action still reachable and working (Nhập mới, Nhập lại, bulk select, LỊCH NGHỈ, Xác nhận Không phát sinh, Hoàn tác, flat table).

## 10. Round 2 independent review (Opus, 2026-10-10): FAIL on one blocker, fixed

Review of `db0df1f..5ff1d60`: Section 4 not violated (no state, effect, handler or modal lost; all old actions still reachable; hidden selected keys are still counted by the floating bar and modals). **Blocker B1:** in the default "Tất cả chỉ tiêu" view `groupItemsByDay` grouped by date only, so one date of several indicators became one row and the sources overwrote each other (F1.1 missing sources hidden; "Nhập lại" opened the modal of another indicator).

Remediation (Claude Code/Sonnet, same day):

- B1 **fixed**: grouping is per `(indicator, date)`; newest date first, indicators alphabetical; test with F1.1/F1.3/F4.1 on one date added.
- N1 **fixed**: header checkbox uses the panel's existing `toggleSelectAllItems` (select all / none of the page) instead of toggling each source.
- N2 **fixed**: matrix button "Chọn ngày thiếu" now passes the month filter, no misleading count, tooltip says it toggles and follows month/source filters.
- N3 **fixed**: empty source cell shows "—" with a tooltip (was a misspelt, misleading "Không hỗ trợ nguồn").
- N5 **fixed**: "Bảng Chi tiết" page resets whenever indicator/month/source/status filter changes.
- N4 left: the round-1 "auto-open newest month" no longer applies to the table design; the old `MonthlyAccordionGroup` stays as unused code (`eslint-disable`) and can be deleted in a clean-up ticket.

Validation: day-view helper tests 12/12, `AutoBackfillOperatorPanel.test.js` 24/24 unedited, frontend 622/622, build and lint clean. Status: `READY FOR PO UI CHECK`; a short re-review of the fix commit by Opus is optional (logic in tested helpers, no handler touched).

