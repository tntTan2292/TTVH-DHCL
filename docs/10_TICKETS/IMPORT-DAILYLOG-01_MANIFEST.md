# IMPORT-DAILYLOG-01 - "Log ngày mới" tab: did today's automatic import finish, and what needs the PO

Status: IMPLEMENTED / PO UI PASS / CLOSED (2026-10-22)
Owner: Claude Code (Sonnet), 2026-10-22. Does not change the Current Ticket. Companion of IMPORT-SESSION-01.

## 1. PO request (2026-10-22)

A new tab on the Import page that shows whether the 24 jobs of the new day have finished at this moment, and which newly imported or re-imported files failed, so the PO can check or import again at once when it is urgent.

## 2. What "24" is

4 ACTIVE indicators (F1.3, F4.1, F1.1, F1.2) x 2 sources (Huế, TCT) x 3 days = the new day D-1 plus the 2 refresh days (D-2, D-3) of the run made on business day D (Vietnam time). The grid is built from the schedule's own settings (`AUTO_IMPORT_SCHEDULE_LANES`, `AUTO_IMPORT_SCHEDULE_RECENT_DAYS`), so with `LANES=HUE` it shows 12 cells.

## 3. Delivered

| Part | What | Where |
| --- | --- | --- |
| API | `GET /api/import/daily-log[?date=YYYY-MM-DD]` (admin, read-only, never opens a browser; ~40 ms on the real database). Default date = today in Vietnam time | `src/services/importDailyLogService.js`, controller `dailyLog`, `importRoutes.js` |
| Cell state | Per (indicator, source, day) from the jobs of the day's runs, the newest job wins: `OK` (SUCCESS / skipped as already done), `RUNNING`, `QUEUED`, `WAITING_AUTH`, `FAILED` (reason + last attempt's error signature; a failed refresh of a day that already has data says so), `MISSING`. A cell with no job today takes the import log: data present = `OK`, nothing = `MISSING` | same |
| Verdict | One line: `COMPLETE` (all done, nothing to do), `IN_PROGRESS`, `INCOMPLETE` (cells with no import), `ATTENTION` (something needs the PO) | same |
| Needs-attention list | High: failed cell, cell waiting for login, schedule gave up, schedule not started 30 min after its time, a Huế/TCT session not signed in or disconnected (today only), a failed file import not yet re-imported successfully. Medium: schedule retrying (2+ attempts), cell with no import yet (today). Low: old failed days | same |
| Old failed days | Failed days older than the recent window whose newest job is still failed are listed apart, grouped by indicator, source and reason, and never turn the day red (the schedule ignores them in its retry decision too; the real data has 5 from Jan-Mar 2026) | same |
| Other sections | Schedule state read from `auto-import-schedule.json` (attempt, next retry); Huế/TCT session status (shared with IMPORT-SESSION-01); the runs of the day with job counts; imports of the Vietnam day made by a person (manual upload, or a run started by a user) plus every failed import, with "re-imported" marked | same |
| Screen | New tab "Log ngày mới" (second, after "Bù dữ liệu tự động") with a red number on the tab while any high item exists, whichever tab is open (polled every 60 s). Contents: verdict banner with counts, "Việc cần PO xem" (button to the Auto Backfill or manual-upload tab), grid indicator x source x day (hover shows reason, detail, last import), schedule + sessions, runs, old failed days (collapsed), imports of the day. Date picker for earlier days; refresh every 30 s | `components/ImportDailyLogPanel.jsx`, `importDailyLogModel.js`, `pages/DataImportCenter.jsx` |

## 4. Validation

- `backend/test_importDailyLogService.js` 8/8: a full day is COMPLETE; a failed job shows reason and error signature and a later success clears it; waiting-for-login / running / queued cells and IN_PROGRESS vs ATTENTION; a cell without a job uses the import log (OK or MISSING, verdict INCOMPLETE); schedule gave up / overdue / retrying, switched-off schedule, and bad sessions flagged for today only; old failed days grouped, kept out of the grid and dropped once a later job succeeded; failed file imports unresolved vs re-imported, scheduler imports left out, previous day's rows left out; Vietnam-day bounds and invalid date.
- Real database smoke (read-only, 2026-10-22): 24 cells all OK, verdict COMPLETE, schedule cycle "all lanes imported after 2 attempts", 3 old-failure groups (5 days), 41 ms. Past days 2026-10-21 and 2026-10-19 also COMPLETE; a failed file import of 10-19 correctly shown as re-imported.
- Frontend: `importDailyLogModel.test.js` (labels, tooltip, attention targets, schedule wording, wiring), `dkclSessionStripModel.test.js`, the five existing Data Import tests, `oxlint` (only the two old warnings), `vite build` OK. Session suites unchanged and green.
- Not verified: the screen in a browser (PO checks UI) and the route through a running server. Backend restart needed to load `/daily-log`.

## 5. PO UI check

After a backend restart: open the Import page, tab "Log ngày mới". Expect today's 24 cells and a verdict line; hover a cell for details; pick yesterday in the date box. To see a failure case, look at a day with a failed file or run (for example the old failed days section).

## 6. Residuals

- "Report block" standard (camera, click-to-order titles, target lines) was not applied: this is an operations log, not a quality report block. Say so if the PO wants it.
- A day older than today shows that day's runs only; a session alert is deliberately not raised for past days.
- The schedule section reads the saved state, so with the schedule switched off it says so instead of showing a cycle.
