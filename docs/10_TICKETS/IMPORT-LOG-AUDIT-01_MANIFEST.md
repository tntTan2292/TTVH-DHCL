# IMPORT-LOG-AUDIT-01 - Import log with user, and "Import cả ngày + bù 3 ngày"

Status: BACKEND IMPLEMENTED / READY FOR UI (Antigravity) / PO UI CHECK PENDING
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

## 4. Screen work for Antigravity (not started)

- A confirmation box before the call: the 3 dates, the indicators and lanes, how many days will be overwritten (use coverage already on screen); checkbox of consent as in Nhập lại. Button "Import cả ngày + bù 3 ngày" at the head of a day column; the call sends only `anchor_date`.
- Import history (Bảng Chi tiết or its own tab): columns user, mode, replaced rows, time in Vietnam time, filters by data date / indicator / lane / user; source `GET /import/log`.
- Day x indicator cell tooltip: last import time, user, mode (from the same endpoint).
- No change to existing API fields; no browser, screenshot or dev server in the executor prompt.

## 5. Validation

`test_autoBackfillAnchorRun.js` 4/4; `test_autoBackfillRefreshWindow.js` 5/5; `test_autoBackfillQueueService.js` 45/45; `test_autoBackfillSafety.js` 11/11; `test_autoBackfillF13Executors.js` 19/19; `test_autoBackfillF41Executors.js` 32/32; `test_f12ImportPipeline.js` 6/6; `test_importProcessor.js`, `test_f41ImportPipeline.js` pass.
`test_f11ImportPipeline.js` 7/9: two failures not caused by this ticket (a stale registry assertion expecting an undefined refresh window, and the known F1.1 TCT real-file case).

## 6. Residuals

- Backend restart needed (new migration runs at start-up).
- Old log rows keep blank user; no inference was made.
- `GET /import/log` is not yet used by any screen; no PO UI check possible until Antigravity delivers.
