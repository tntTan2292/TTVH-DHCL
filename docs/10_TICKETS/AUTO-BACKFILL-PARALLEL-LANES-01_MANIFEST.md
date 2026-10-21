# AUTO-BACKFILL-PARALLEL-LANES-01 - HUE and TCT jobs run in parallel

Status: BACKEND IMPLEMENTED, OPUS REVIEWED (PASS WITH FIXES, fixed) / OFF BY DEFAULT / WAITING FOR THE PO TO ENABLE
Owner: Claude Code (Sonnet), 2026-10-21. Backend only, no screen change. Opened on PO instruction in chat ("Mở ticket ... và làm theo đề xuất").

## 1. Why

The queue runs one job in the whole system (a single `GLOBAL_DKCL` lease and a unique index allowing one RUNNING job). HUE and TCT sign in with two different users and two browser profiles, so they do not depend on each other. The morning import (07:30 schedule: up to 32 jobs, about 30 s each) is serial, about 16-19 minutes; measured jobs of the last days show HUE and TCT carrying nearly equal time (74 and 59 minutes of job time since 14 Oct), so two lanes in parallel should take roughly 55-60% of it.

## 2. Design

| Part | Change | Where |
| --- | --- | --- |
| Shared database connection | Every import writes with `BEGIN ... COMMIT` on the one shared sqlite3 connection of `src/config/db`. Two imports at once would fail at BEGIN or land statements inside each other's transaction (demonstrated in a test). `executeImport` now takes a first-in-first-out in-process write lock, so downloads, waits and file handling overlap but the database work does not. This also protects the manual upload and the old sync services that call `executeImport`. | `src/services/importWriteLock.js`, `importPipeline.js` |
| Lease and index | The lease table accepts `GLOBAL_DKCL` or `DKCL_<LANE>` (one slot per lane); the system-wide one-RUNNING-job index is replaced by one RUNNING job per source lane. Legacy databases are upgraded at start-up (table rebuilt, rows kept, idempotent). | `migrate_auto_backfill_queue_schema.js`, `src/db/schema.sql` |
| Store | `acquireNextJob(worker, { lane })` looks at that lane's slot and takes only that lane's jobs; renew, complete and failure find the lease by job and token; `getCoordinatorState({ lane })` counts that lane only. Without a lane everything is as before (one slot). | `autoBackfillQueueStore.js` |
| Service and coordinator | `processNext({ lane })`; a coordinator bound to a lane drains only that lane. | `autoBackfillQueueService.js`, `autoBackfillWorkerCoordinator.js` |
| Switch | `AUTO_BACKFILL_PARALLEL_LANES=true` in `.env` builds one coordinator per lane (HUE, TCT) behind the same interface; unset or false keeps one coordinator and one job at a time. The log line `[AUTO-BACKFILL-QUEUE] parallel lanes ON ...` or `one job at a time ...` is printed at start-up. | `autoBackfillQueueRuntime.js`, `.env.example` |

Unchanged on purpose: circuit breakers and safety states stay per scope; a run that waits for a login holds its own lane (the schedule and the screen create one run per lane, so the other lane keeps going); the per-source session locks and the audit context (`AsyncLocalStorage`) already isolate lanes.

## 3. Enabling

1. Add `AUTO_BACKFILL_PARALLEL_LANES=true` to `.env` and restart the backend (the migration upgrades the lease table and index on start).
2. Check the log: `[AUTO-BACKFILL-QUEUE] parallel lanes ON: HUE + TCT run at the same time.`
3. To go back: remove the line (or set false) and restart; the new index and lease table stay valid for serial running.


## 4. Independent review (Opus, 2026-10-21): PASS WITH FIXES, all fixed

1. **High, fixed:** the TCT F1.3 backfill calls `importNationalParsedData` directly (not through `executeImport`), so it skipped the write lock; it now takes `withImportWriteLock` itself (`tctF13BackfillService.js`).
2. **High, fixed:** every `processNext` ran a global recovery, so one lane could take the other lane's job whose lease looked expired (a long import can delay the heartbeat) and run it twice. Recovery is now lane scoped (`claimInterruptedJobForRecovery({ lane })`), and the heartbeat survives a failed renewal and stops only on `AUTO_BACKFILL_LEASE_LOST`.
3. **Medium, fixed:** a paused run became PAUSED as soon as one job finished although a job of the other lane was still RUNNING; PAUSING now becomes PAUSED only when no job of the run is RUNNING (`reconcileRun`).
4. **Low, residual:** other code opens transactions on the shared connection without the lock (coverage exceptions, holiday calendar, network map import, hangton snapshots). Not a regression, but two lanes make an overlap with an import more likely; to be put behind the same lock in a later ticket if it ever shows.
5. **Nits, fixed:** a lane coordinator treats an error that names no lane as its own lane; the lease check uses `GLOB 'DKCL_*'` (`_` is not a wildcard); the lease error text no longer says "global". Known and accepted: with the flag off the `JOB_LEASED` event payload gains `lease_name`, and the import lock also queues manual uploads and the file watcher behind backfill imports.

## 5. Validation

`test_autoBackfillParallelLanes.js` 14/14, repeated 12 times without a failure: legacy database upgrade and idempotence, two lanes leased and running at once, one job per lane, serial path unchanged, per-lane coordinators with a rendezvous proving the overlap, a lane waiting for a login does not stop the other, recovery lane scoped, heartbeat, pause, runtime flag, write lock, and a demonstration that unlocked imports corrupt each other.
Related suites unchanged and green: queue service 45/45, safety 11/11, refresh window 6/6, anchor run 5/5, scheduler 16/16, F1.3 executors 19/19, F1.2 pipeline 6/6 and adapter 24/24, queue and safety migrations 2/2 each, backend `src` import/dkcl/backfill tests 102/102.
Fixed on the way (stale after the 2-day window decision): the window expectations in `test_f11ImportPipeline.js`, `test_f12ImportPipeline.js` and `test_f12PortalAdapter.js`.
Already failing before this ticket and untouched: `test_autoBackfillQueueController.js` (2), `test_autoBackfillCoverageController.js` (1), `test_dkclSessionPreflightService.js` (syntax error), and the real-workbook tests (`test_f11ImportPipeline.js` 8, `test_f11PortalAdapter.js` 14 and 17, the real single-day TCT file test).
Not verified live: two lanes against the real portal (needs the flag on and a backend restart).
