# UI-IMPORT-PROCESS-LOG-01 - "Tất cả tiến trình đang mở" and a complete import log

Status: ANTIGRAVITY DELIVERED / READY FOR PO UI CHECK
Date: 2026-10-27. Parallel ticket (does not change Current Ticket).

## 1. PO request

1. The panel "Tất cả tiến trình đang mở (50)" only ever shows 50 rows and is hard to read.
2. The PO cannot find one place that keeps the full import log, successes and failures alike.

## 2. Audit (real database, 2026-10-27)

| Finding | Evidence |
| --- | --- |
| The panel is capped at 50 runs and says nothing about the rest | `GET /import/auto-backfill/runs` returns at most `limit` = 50 open runs; the database holds **548 open runs** |
| One row per run is the wrong unit | Almost every run is a single job (one cell "Nhập mới / Nhập lại" click makes its own run), so 548 near-identical rows `#id · F4.2 · HUE · RUNNING · 1 job` |
| Finished runs are invisible | The list only has RUNNING / PAUSING / PAUSED; 1 712 runs exist in total |
| `import_log` is not the complete log | It only holds imports that reached the file pipeline (SUCCESS / FAILED + user + mode, tab "Lịch sử Import"). A job that failed earlier (no session, portal error, SQLITE_BUSY, circuit stop) or is queued / cancelled exists only in the queue tables |
| Real failures are many and recurring | 3 698 jobs: 2 271 SUCCESS, **399 FAILED_TERMINAL** (e.g. `SQLITE_BUSY:...`), 549 QUEUED, 477 CANCELLED, 2 RUNNING |
| The detail of one run exists but is buried | `GET /import/auto-backfill/runs/:id` returns jobs, attempts and events; the screen only shows it for the single "active" run |

## 3. Backend delivered (Claude Code)

- `GET /import/auto-backfill/jobs` (admin): the complete job log, every run, newest first. Query: `business_date_from`, `business_date_to` (YYYY-MM-DD, the data day), `created_from`, `created_to` (YYYY-MM-DD Vietnam days), `indicator`, `lane`, `state` (comma list: SUCCESS, FAILED_TERMINAL, QUEUED, RUNNING, RECOVERY_CHECK, CANCELLED, SKIPPED_ALREADY_SUCCESS), `actor`, `import_mode` (NEW, REIMPORT, REFRESH_WINDOW, REFRESH_DAY), `run_id`, `page`, `pageSize` (max 200, default 50).
  `data`: `items[]` { id, run_id, indicator, source_lane, business_date, state, safety_state, import_mode, force_reimport, actor, run_status, attempt_count, last_error_class, last_error_signature, action_required, terminal_reason, created_at / started_at / ended_at (UTC ISO), duration_ms, row_count, replaced_row_count }, `total` (all matches), `stateCounts` (per state, ignoring the state filter, for chips).
- `GET /import/auto-backfill/runs` now also returns `data.total` (all runs matching `status`), with `limit` and `offset` already supported (status list: RUNNING,PAUSING,PAUSED,COMPLETED,COMPLETED_WITH_ERRORS,CANCELLED).
- Existing: `GET /import/auto-backfill/runs/:runId` (jobs, attempts, events of one run), `GET /import/log` (file-level import_log rows with user, mode, replaced rows, Vietnam time), pause / resume / manual login actions.
- Tests: `backend/test_autoBackfillJobLog.js` 4/4.

## 4. Screen work for Antigravity (creative freedom inside the guard)

1. **Replace the open-runs list by a readable summary.** [DELIVERED]
   - Shows real total from `data.total` (not hardcoded 50).
   - KPI strip breaking down by state (Running, Waiting Auth, Blocked, Paused) and by lane (HUE, TCT).
   - Prominent blocking alert banner with working "Mở đăng nhập {lane}" button.
   - Preserves "Tiếp tục Run" and circuit resume actions.
   - Dual view switcher: "Gộp theo nhóm" (aggregates single-job runs by indicator, lane, state, actor with drill-down dropdown) and "Từng run" (with lane/state filters and pagination).
2. **A complete "Nhật ký import" screen** on `GET /import/auto-backfill/jobs`: [DELIVERED]
   - Component `AutoBackfillJobLog.jsx` accessible via top navigation button "Nhật ký Import (Jobs)".
   - Comprehensive filter bar: business date range, indicator, source lane, import mode, user/actor, creation date range.
   - Interactive state chips with live counts from `stateCounts` (Tất cả, Đang chạy, Thành công, Thất bại, Chờ đăng nhập, Đang chờ, Đã hủy, Bỏ qua, Khôi phục).
   - Full column grid: Thời gian tạo (giờ VN UTC+7), Ngày DL, Chỉ tiêu, Nguồn, Trạng thái (Vietnamese badges), Người chạy, Chế độ, Lần thử, Dòng (kèm dòng thay thế), Thời lượng, Lỗi & Hành động yêu cầu.
   - Known error signatures mapped to friendly Vietnamese explanations + action required guidance; unknown error codes preserved in raw format.
   - Clicking any row opens run detail modal with jobs, attempt logs and audit events (`GET /import/auto-backfill/runs/:runId`).
3. **"Lịch sử Import" (file-level `import_log`) coexistence:** [DELIVERED]
   - Kept fully accessible via "Lịch sử Import (File)".
   - Sub-nav toggle in header allows seamless 1-click switching between Job Log and File Log with clear explanatory subtitle distinguishing the two levels.

## 5. Guard

Presentation only: no change to existing API fields, payloads, `getItemKey`, selection state, modals or handlers; new logic in pure helpers with tests; existing tests run unchanged; admin-only as today. No browser, screenshots, dev server or login in the executor session (the PO checks the screen).

## 6. Backend follow-up after the investigation (Claude Code, 2026-10-27)

Investigation (real database): the ~500 one-job open runs came from one bulk selection (the screen sent one request per cell, 499 runs of F4.2); the "399 failed" is the history since August (404 now, 307 of them later imported OK); `SQLITE_BUSY` was only 16 of them (10 on the morning of 27/10, F4.2, HUE and TCT lanes running in parallel) and was classed as a system error that is never retried; the largest group (about 200) carried the catch-all code `QUEUE_EXECUTION_ERROR`, but the message inside was portal data not complete (F1.2 TCT "Missing accepting province code(s)") or a malformed F4.2 HUE CSV.

Delivered (tests `backend/test_autoBackfillFailureAndBulk.js` 7/7; QueueService 46, Safety 11, AnchorRun 5, JobLog 4, RefreshWindow 6, F13/F41 executors 19/32, Scheduler 17, autoImport015 7 unchanged):
1. **Locked database is retried.** `SQLITE_BUSY` / `SQLITE_LOCKED` (code or message) is class TRANSIENT: retried within the lane's three-attempt budget, never sooner than 15 s after a failure, and never counted toward the circuit that stops a lane. A lane that declares its own class for the code keeps it.
2. **Portal data not complete is recognised.** TCT rows without an accepting province, and errors whose code contains RECONCILIATION or OUTER_SUMMARY (the portal summary disagreeing with the file), are class DATA: isolated to that day, not counted toward the circuit, code `DATA_NOT_READY` when the error had no specific code, action text "The portal data for this day is not complete yet; the scheduled import retries it, or re-import it later." A malformed source file (for example the F4.2 HUE CSV line with 33 fields) is deliberately NOT in this group: it stays a system failure for a person to look at (business rule for the PO).
3. **The job log returns the reason.** `GET /import/auto-backfill/jobs` items now also carry `last_error_message` (readable, already redacted message of the latest attempt) and `last_result_code`.
4. **One run for a list of cells.** `POST /import/auto-backfill/runs` with `items: [{ indicator, lane (or source_lane), business_date }]` (max 1000, admin only, not combinable with indicator / lane / from_date / to_date / include_excluded / anchor_date) creates ONE run with one job per cell: a day with no data is a new import, a COMPLETED day of an active automated indicator is a re-import and needs `confirm_replace_completed: true` for the whole request (409 `AUTO_BACKFILL_BULK_CONFIRM_REQUIRED`, with the count). Anything else is skipped and listed. Response adds `bulk` { requested, job_count, new_count, replace_count, skipped_open_conflicts, skipped[] { indicator, source_lane, business_date, reason } }; a repeated request while its run is open creates nothing.

**Screen work delivered by Antigravity (commit 36d62dc6 & UI-IMPORT-BULK-ITEMS-01):**
- Updated `handleExecuteBulkNewImport` and `handleExecuteBulkReimport` in `AutoBackfillOperatorPanel.jsx` to send single requests with `items: [...]` (max 1000 items per chunk using `chunkBulkItems`).
- Reimport includes `confirm_replace_completed: true` when acknowledged.
- Clear reporting of `data.bulk` results: created jobs (`job_count`, `new_count`, `replace_count`), skipped open conflicts, and list of skipped items with Vietnamese translated reason.
- Unit test suite 25 covers bulk payload, chunking, reason translation, and multi-chunk aggregation.

