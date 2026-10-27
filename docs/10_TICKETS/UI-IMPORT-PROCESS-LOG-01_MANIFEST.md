# UI-IMPORT-PROCESS-LOG-01 - "Tất cả tiến trình đang mở" and a complete import log

Status: BACKEND API READY (Claude Code) / SCREEN ASSIGNED TO ANTIGRAVITY / PO UI CHECK PENDING
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

1. **Replace the open-runs list by a readable summary.** Show the real total (from `total`, not "(50)"), counts by lane and by state (waiting, running, blocked by login / circuit), what is blocking and the existing actions for it ("Mở đăng nhập", "Tiếp tục Run" keep working), and let the person drill into the individual runs with paging and filters instead of a flat 50-row dump. Group single-job runs sensibly (by lane, indicator, day or actor).
2. **A complete "Nhật ký import" screen** on `GET /import/auto-backfill/jobs`: filters (data day range, indicator, source, state chips with the counts from `stateCounts`, user, mode, created day range), paging, Vietnam time, columns: time, data day, indicator, source, state (Thành công / Thất bại / Đang chạy / Đang chờ / Đã hủy / Bỏ qua), user, mode, attempts, rows and replaced rows, duration, error with the suggested action. Failures easy to reach in one click (state chip) and readable (map known error signatures to Vietnamese text, unknown ones shown as the raw code). A row opens the detail of its run / job (attempts and events from the existing run endpoint).
3. The existing "Lịch sử Import" (file-level `import_log`) stays reachable; the person must see that the two are different (job log vs file log) or the two are presented as one coherent area.

## 5. Guard

Presentation only: no change to existing API fields, payloads, `getItemKey`, selection state, modals or handlers; new logic in pure helpers with tests; existing tests run unchanged; admin-only as today. No browser, screenshots, dev server or login in the executor session (the PO checks the screen).
