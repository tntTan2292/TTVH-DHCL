# IMPORT-LOG-AUDIT-01 - Import log with user, and "Import cả ngày + bù 3 ngày"

Status: IMPLEMENTED / READY FOR PO UI CHECK
Owner: Claude Code (backend, migration, tests) - Antigravity (screens)
Date: 2026-10-16

## 1. Scope

Part A - Import log by indicator: answer "who imported, when, how" for every import.
Part B - One action for a chosen day D: import all four indicators for D, D-1, D-2.

## 2. PO decisions (2026-10-16)

1. Indicators: F1.1, F1.2, F1.3, F4.1 (there is no F1.4).
2. "Bù 3 ngày" = the chosen day D plus D-1 and D-2, three days in all (not D-3).
3. A COMPLETED day is overwritten after one confirmation, like Nhập lại today.
4. Backend and migration: Claude Code. Screens: Antigravity.

## 3. Backend delivered

| Item | Where |
| --- | --- |
| Additive migration: `import_log.actor, run_id, job_id, import_mode, replaced_row_count`; index on (ngay_do_kiem, indicator, source_lane) | `backend/migrate_import_log_audit_01_schema.js`, wired in `server.js`, `schema.sql` |
| `auto_backfill_job.import_mode` (NEW, REIMPORT, REFRESH_WINDOW, REFRESH_DAY) | `migrate_import_bulk_reimport_all_01_schema.js`, `schema.sql` |
| Audit context (AsyncLocalStorage) read by every import_log writer, FAILED rows included; audit columns appended only if the table has them | `src/services/importLogAudit.js`, `importProcessor.js`, `importPipeline.js` |
| Queue job runs the executor inside the context: actor = run `requested_by`, run, job, mode, replaced row count (rows held before a replace) | `autoBackfillQueueService.js` |
| Manual upload: actor = `req.auth.user`, mode MANUAL_UPLOAD / MANUAL_REIMPORT | `importController.js` |
| `GET /import/log` (admin) | `importController.js`, `importRoutes.js` |
| `POST /import/auto-backfill/runs` with `anchor_date` | `autoBackfillQueueService.createAnchorRun`, controller |

### 3.1 `GET /import/log`

Query: `date_from`, `date_to` (YYYY-MM-DD, data date), `indicator`, `lane`, `status`, `actor`, `import_mode`, `page`, `pageSize` (20/50/100).
Response `data`: `items[]` { id, file_name, ngay_do_kiem, indicator, source_lane, trigger_source, status, created_at (UTC ISO), created_at_vn ("YYYY-MM-DD HH:mm:ss", Asia/Ho_Chi_Minh), total_records, error_records, skipped_records, actor, run_id, job_id, import_mode, replaced_row_count }, `pagination`, `audit_columns_present`.
Rows written before this ticket have actor / run_id / job_id / import_mode / replaced_row_count null: show "chưa ghi nhận". They are not inferred.

### 3.2 `POST /import/auto-backfill/runs` with `anchor_date`

Body: `{ "anchor_date": "YYYY-MM-DD" }` only. Combining it with indicator, lane, from_date, to_date, include_excluded or confirm_replace_completed is rejected (400 `AUTO_BACKFILL_ANCHOR_DATE_EXCLUSIVE`); a day after the newest importable day is rejected (400 `AUTO_BACKFILL_ANCHOR_DATE_IN_FUTURE`); admin only.
One run: for D, D-1, D-2 and every ACTIVE indicator on every AUTOMATED lane with a verified executor, a day with no data becomes a normal job and a COMPLETED day becomes a replace job (`force_reimport`). Holiday / exception days, MANUAL_ONLY lanes, paused indicators stay excluded and are listed in `anchor.skipped`. Tuples that already have an open job are skipped by the store (`creation.skippedConflicts`). Maximum 24 jobs (3 days x 4 indicators x 2 lanes).
Response adds `anchor`: { anchor_date, window_dates[3], job_count, replace_count, skipped[] { indicator, source_lane, business_date, reason } }.
Every job has `import_mode = REFRESH_DAY` and the run carries the user in `requested_by`.

## 4. Screen work for Antigravity (DELIVERED — READY FOR PO UI CHECK)

- Button "Import cả ngày + bù 3 ngày" placed at the head of each day column/row (in `AutoBackfillSmartDayView` Col 2 and `TABLE` view). Clicking opens confirmation modal listing the 3 dates (D, D-1, D-2), 4 indicators (F1.1, F1.2, F1.3, F4.1), 2 lanes (HUE, TCT), completed cell overwrite count calculated from screen coverage, consent checkbox, and calling `POST /import/auto-backfill/runs` with `{ anchor_date }` only. Displays `anchor.skipped` summary banner if present. Admin-only.
- Import history dedicated tab / view mode (`AutoBackfillImportHistory.jsx`) powered by `GET /import/log` with columns: ID, Vietnamese time (`created_at_vn`), data date (`ngay_do_kiem`), indicator, lane, actor, mode, replaced rows count, status, total/error records, file/trigger; filter controls (date from/to, indicator, lane, actor, mode, status); pagination (20/50/100); displaying "chưa ghi nhận" for null/legacy rows without speculation. Admin-only.
- Day x indicator cell tooltips: formatted "Lần import cuối: giờ, người dùng, chế độ" powered by `GET /import/log` with "chưa ghi nhận" fallbacks.
- Logic placed in pure helpers (`autoBackfillUiHelpers.js`) with dedicated unit test suite (`autoBackfillAuditHelpers.test.js`, 7/7 suites passed). Existing test suites ran 100% untouched. No change to existing APIs or payloads. Admin gating enforced.

## 5. Validation

`test_autoBackfillAnchorRun.js` 4/4; `test_autoBackfillRefreshWindow.js` 5/5; `test_autoBackfillQueueService.js` 45/45; `test_autoBackfillSafety.js` 11/11; `test_autoBackfillF13Executors.js` 19/19; `test_autoBackfillF41Executors.js` 32/32; `test_f12ImportPipeline.js` 6/6; `test_importProcessor.js`, `test_f41ImportPipeline.js` pass.
`test_f11ImportPipeline.js` 7/9: two failures not caused by this ticket (a stale registry assertion expecting an undefined refresh window, and the known F1.1 TCT real-file case).

## 6. Residuals

- Backend restart needed (new migration runs at start-up).
- Old log rows keep blank user; no inference was made.
- `GET /import/log` is not yet used by any screen; no PO UI check possible until Antigravity delivers.

## 7. Independent review (Opus, 2026-10-16) and fixes

Result FAIL on the screens, backend PASS. Fixed by Claude Code:
- Blocker: the confirmation box counted overwrites on the filtered coverage; it now reads an unfiltered coverage when the box opens.
- Tooltips: no fallback to another lane's log; `GET /import/log?latest=1` returns the newest row per (data date, indicator, lane) instead of the 100 newest rows; the call is made for admins only.
- API now asks for the same confirmation as Nhập lại: `anchor_date` with completed days needs `confirm_replace_completed=true` (409 `AUTO_BACKFILL_ANCHOR_CONFIRM_REQUIRED`); the screen sends it after the tick.
- `anchor.job_count/replace_count` count the jobs really created (0 for a duplicate request); the toast says so.
- Status filter constant in the history screen corrected to SUCCESS (the list is not rendered yet: a status filter is still to add if wanted).
Not covered by tests: `GET /import/log`, migration re-run, real `insertImportLog` write, holiday days inside an anchor run.

## 8. Re-review (Opus) and fixes

Points 2-4 PASS. Fixed: the confirmation box now opens at once with a loading line and shows a coverage-read error with a Close button (no stuck day button); `latest=1` cap raised to 50 000 rows; test added for a window without completed days (no confirmation, no replace). Still untested: `GET /import/log?latest=1` (needs the shared database), and the unfiltered count inside the component (covered by the pure helper test only).

## 9. Day selection brings D-1, D-2 along (PO request 2026-10-19)

PO: picking a day for "Nhập lại" must also pick the days to refresh, or users cannot find how to import and refresh together. Screen only, no API change: (a) picking a completed day for Nhập lại now selects the same indicator and lane on D-1 and D-2 too (each can be unticked; the bar and the confirmation list show all of them); (b) the new-import bar gets "Nhập mới + bù 2 ngày trước (N ô)" which switches to the Nhập lại selection with D-1, D-2 added and opens its confirmation. Pure helper `expandWithPreviousDays` with test. The "Import cả ngày + bù 3 ngày" button (all indicators, both lanes) is unchanged.

## 10. Follow-up from PO check (2026-10-19)

Two defects seen on screen: (1) picking one cell added D-1, D-2 of the same source only, so TCT was left out; (2) the day checkbox was dead on a finished day (only the HUE/TCT cell ticks worked). Fixed in the screen only: the D-1, D-2 expansion now covers every source of the indicator (`expandWithPreviousDays(..., { allLanes: true })`), and the day checkbox on a finished day (or while a Nhập lại selection is open) picks the whole day for Nhập lại with D-1, D-2 of both sources (`resolveDaySelectionState` returns `viaReimport`). Holiday / excluded days stay unselectable. Tests 9 in `autoBackfillAuditHelpers.test.js`.

## 11. PO correction (2026-10-19): when D-1, D-2 come along, and a day for all indicators

1. D-1 and D-2 belong to a first-time import only: picking a new (not yet imported) day shows "Nhập mới + bù 2 ngày trước (N ô)" (sources HUE and TCT of D-1, D-2 for the same indicators). Nhập lại never adds other days: the earlier expansion on a completed cell and on a finished day's checkbox is removed; the day checkbox on a finished day now picks just that day.
2. New "Chọn cả 4 chỉ tiêu" button under each date: one click picks that date for F1.1, F1.2, F1.3 and F4.1 and both sources (respecting the source filter), whatever indicator the screen shows. It reads unfiltered coverage (cached by the server), keeps the cells of D-2..D in a selection pool so the confirmation lists and run requests find indicators that are not on screen, then opens a Nhập lại selection if anything of that day is completed (it also handles the not-yet-imported cells) or a Nhập mới selection if nothing is imported. Screen only; the runs are the same per-cell requests as before.

## 12. Selection fix (Claude Code) and day-per-row redesign (Antigravity), 2026-10-19

PO: "Chọn cả 4 chỉ tiêu" of one day dropped the day picked before, and the day table shows 4 rows per day (one per indicator), so re-importing one day means a long scroll.

Done by Claude Code (selection logic, commit with this section): picking a day for all 4 indicators is now added to the current selection; picking the same day again unticks it; a completed cell anywhere makes the whole selection a Nhập lại selection, otherwise it stays Nhập mới. Pure helper `mergeDayCellsIntoSelection` with tests; the selection pool only grows.

Antigravity (screen only, round 3 of the Bù dữ liệu tự động area, creative freedom as in UI-IMPORT-DAYVIEW-01 Section 9): when the indicator filter is ALL, show **one row per day** with the four indicators side by side (F1.1, F1.2, F1.3, F4.1), each with a compact HUE / TCT status and its own tick or Nhập lại action, plus one day control that calls `onSelectDayAllIndicators(date)` (already wired) and shows whether the day is fully, partly or not picked. A column header control per indicator is welcome (pick that indicator for the visible days). The result must let a user pick several days for all indicators in a few clicks without scrolling through 4 rows per day. Single-indicator filter keeps today's layout.

Delivered by Antigravity (2026-10-19, READY FOR PO UI CHECK):
- **1 row per calendar day layout (`isCombinedView`)**: when `indicatorFilter === 'ALL'`, each day is rendered on a single row featuring 4 compact indicator cells side-by-side (F1.1, F1.2, F1.3, F4.1). Each cell displays HUE and TCT lanes with distinct tags, status chips, tooltips showing last import metadata, lane-level checkboxes (`onToggleSelectItem`), and direct "Nhập lại" / "Nhập mới" buttons (`onReimportClick`).
- **Day-level control**: Col 1 checkbox calls `onSelectDayAllIndicators(date)` with full (`CheckSquare`), partial (`MinusSquare`), or unchecked (`Square`) visual indicators computed via `resolveCalendarDaySelectionState`.
- **Column header controls**: Col 3-6 headers provide quick multi-day selection per indicator across all visible days on the page via `resolveIndicatorColumnSelectionState` and `onToggleSelectAllItems`.
- **Layout switcher & single-indicator retention**: Toolbar offers quick toggle between "Gộp 1 dòng/ngày" (default) and "Bảng phẳng" (fallback) when viewing all indicators; single-indicator filter strictly preserves the classic flat table layout.
- **Responsive design**: Clean layout with fixed-width alignments fitting comfortably within 1280px without horizontal overflow or clipping.
- **Pure helpers with tests**: `groupItemsByCalendarDay`, `resolveCalendarDaySelectionState`, `resolveIndicatorColumnSelectionState`, `filterCalendarDaysByMissingOnly`, and `summarizeCalendarDayGroups` added to `autoBackfillUiHelpers.js`. 4 new test suites (Suites 11-14) added to `autoBackfillAuditHelpers.test.js` (14/14 suites passing). Existing day-view and backend tests run 100% untouched and passing. Zero changes to API, payload, `getItemKey`, selection state shape, modal, or handlers.

Hard guard (unchanged): no API, payload, `getItemKey`, selection state shape, modal or handler change; use the existing props (`onToggleSelectItem`, `onSelectDayAllIndicators`, `onReimportClick`, `onAnchorRunClick`, `selectedBulkKeys`, `selectedReimportKeys`). Logic goes into pure helpers with tests; existing tests run unchanged; the flat table stays as fallback.


## 13. Opus round-3 review (2026-10-19) and fixes

FAIL (B1, S1, S2). Fixed by Claude Code, screen only:
- B1 (blocker): the column-header tick of the one-row-per-day table could not pick completed cells and never reached "full". It now goes through `mergeDayCellsIntoSelection` (new panel handler `handleToggleCells`, prop `onToggleSelectCells`), and `resolveIndicatorColumnSelectionState` counts every pickable cell in either selection; dead fallbacks removed. Test 14 covers a mixed column, tick, untick and a column of finished cells.
- S1: minimum widths reduced (indicator columns 215 -> 176 px, date 150 -> 132, last column 100 -> 88; 972 px in total (48 + 132 + 4 x 176 + 88; corrected by the re-review, the table still widens to its content)). The earlier claim "fits 1280 px" was wrong and is withdrawn: this is an estimate from the code, the PO checks it at 1280 px (the table keeps its own horizontal scroll if needed).
- S2: the one-row-per-day table lost the "Thu hồi" (revoke holiday) button; it is now under the "Nghỉ lễ" badge. The button "Chọn cả 4 chỉ tiêu" is hidden on holiday days.
- Subtitles under the indicator codes use the sidebar names (earlier commit cec7795).
Left as notes: a fifth registered indicator would not get a column (the table draws the four fixed ones; the registry has four).

## 14. Re-review of 8b2d451: PASS (Opus, 2026-10-19)

B1, S2 and no-regression PASS; S1 PASS with notes. Notes handled: the width figure corrected to 972 px; the status chip limit raised from 70 to 92 px so "Chưa hoàn tất" is no longer cut (tooltip kept). The table may still scroll sideways inside its card at 1280 px with the sidebar open: PO to check. Status: **READY FOR PO UI CHECK** (screens of Mục 4, 9-13). Backend restart needed for the migration, anchor run, log API and the faster coverage scan.
