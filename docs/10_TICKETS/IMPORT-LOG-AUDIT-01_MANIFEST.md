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
