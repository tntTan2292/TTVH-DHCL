# AUTO-IMPORT-016 Manifest

## Table of Contents

- [1. Ticket Information](#1-ticket-information)
- [2. Incident And Evidence](#2-incident-and-evidence)
- [3. Scope Delivered](#3-scope-delivered)
- [4. Validation](#4-validation)
- [5. Residuals And Decisions For CTO](#5-residuals-and-decisions-for-cto)

## 1. Ticket Information

- Ticket ID: `AUTO-IMPORT-016`
- Ticket Name: F1.3 HUE detail-table timeout -- the shared DKCL page is navigated by something else mid-job
- Level: `LEVEL 2` (touches three components that share the DKCL page / source lock). PO UI Check Required: `No`.
- Owner: Claude Code / Sonnet 5.5 (executor). Opus reviews the diff before the backend is restarted. Parallel line; does not change Current Ticket.
- Status: `READY FOR CTO REVIEW` (2026-11-16). Nothing restarted, nothing pushed to the live runtime.
- Required Reading: `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`, `docs/10_TICKETS/AUTO-IMPORT-015_MANIFEST.md` (preflight and lock context).

## 2. Incident And Evidence

16/11/2026, slot 07:30: F1.3 HUE for 14 and 15/11 failed with `F13_DETAIL_TABLE_TIMEOUT` (three jobs, each used up its three attempts). The PO checked the portal: the data for 15/11 exists and loads in under 30 s. F1.3 HUE 14/11 succeeded at 01:48 UTC once the HUE lane was quiet.

Code evidence (both checked in the source before this ticket):

- (a) `dkclLeftoverCleanup.js` raced the cleanup against a timer; when the timer won it released the source lock while `deleteLeftoverGeneratedFiles` kept navigating the shared page. Log: `[DKCL-LEFTOVER] HUE cleanup failed: page.goto "/files" is interrupted by another navigation to ...chat-luong-phat-thanh-cong-cua-buu-cuc` and two `TCT cleanup did not finish within 75000 ms`.
- (b) `validateSession()` runs `preflight()` before `withSourceLock`; preflight could call `openF13Report()` / `revalidateSession()` while the lock was held but `activeOperation` was not yet set (or was set after the probe began).
- The F1.3 wait itself clicked the detail cell once, waited a fixed 1 s, then waited 30 s for the form, with no re-click and no record of what the page looked like.

## 3. Scope Delivered

| Part | Change | Files |
| --- | --- | --- |
| P0 | Every console line gets an ISO UTC time (`install()` first in `server.js`). On `F13_DETAIL_TABLE_TIMEOUT`: one `[F13-DETAIL-TIMEOUT]` line (URL, title, form present, `td.ajax_cell` count, "Tổng số" text, ms since first click, clicks, longest event-loop delay) plus screenshot and HTML in `backend/diagnostics/f13-detail-timeout/` (newest 20 kept, folder already git-ignored). Every success logs `[F13-DETAIL] ... click_to_form_ms=N clicks=N loop_delay_max_ms=N`. | `src/config/logTimestamp.js`, `src/services/dkclDetailTimeoutEvidence.js`, `server.js` |
| P1 | The time budget lives inside `deleteLeftoverGeneratedFiles` / `deleteGeneratedFile` (one deadline; every goto and wait is cut to the time left; a deletion starting after the deadline refuses with `CLEANUP_DEADLINE`). `sweepLeftoverFiles` no longer races: it awaits the client, so the source is released only after the page work ended. | `dkclHueF13PortalClient.js`, `dkclLeftoverCleanup.js` |
| P2 | `SourceOperationLock` counts holders/waiters (`isBusy()`); `isSourceBusy()` = `activeOperation` or lock held/awaited. `preflight()` answers `SESSION_VALID` (busy) without touching the client when the source is busy; `probeAndMaybeExpireClient()` re-checks before `revalidateSession()` and before each `openF13Report()` and no longer expires a session another operation owns. Grep of every `goto`/`openF13Report` on the shared page: all queue executors, the idle sweep and the TCT/HUE backfill services already run under `withSourceLock`; the remaining callers are the preflight paths fixed here and the manual Import (see R1). | `dkclSessionPreflightService.js` |
| P3 | `openDetailTable()` clicks, waits 20 s for the form; if absent and the page URL is still the F1.3 report it clicks once more and waits the remaining 40 s (60 s in all); on failure it saves the P0 evidence and throws `F13_DETAIL_TABLE_TIMEOUT`. The dead duplicate `readDetailTableTotal` (first definition) is removed; the live one now only does a 5 s guard. | `dkclHueF13PortalClient.js` |
| P4 | A job that used up its attempts on a `TRANSIENT` error (not authentication/session) is queued once more after 3 minutes; recognised by attempt number `maxAttempts + 1` (no schema change). If that attempt fails too: `FAILED_TERMINAL`, "Product Owner review is required". | `autoBackfillQueueStore.js` |

Not touched, as instructed: home warmup, agg-shadow, the number of days piled into one run. The backend was not restarted; the new code runs after the next restart.

## 4. Validation

- New: `backend/src/services/autoImport016.test.js` (12 tests: P0 timestamp, evidence retention and capture; P3 one click, re-click, double failure with evidence, no re-click off the report page, duplicate removed; P2 owned source, held lock, job takes the source mid-probe, idle source still probed).
- Updated for the new rules: `test_dkclLeftoverCleanup.js` (13/13; P1 tests: slow cleanup awaited and lock released after it, deadline cut, late deletion refuses), `test_autoBackfillSafety.js` (13/13; P4 exhaustion, extra attempt succeeds, non-transient not requeued), `test_autoBackfillQueueService.js` (47/47), `test_autoBackfillFailureAndBulk.js` (12/12; the lock-contention budget is now three attempts plus the one extra).
- Whole backend sweep: `node --experimental-sqlite --test` (1209 tests) and every root `test_*.js` run per file. Every failure left also fails on an export of `HEAD` taken before the change, so none comes from this ticket: `importTctTimeout01.test.js` (uncoded error now classified TRANSIENT, test not updated), `DashboardController.recovery.test.js`, `f11TctExcelParser.test.js`, `timelineService.recovery.test.js`, and root `test_autoBackfillCoverageController.js`, `test_bcvhMonthToDateContract.js`, `test_f11CompletionPolicy.js`, `test_f11ImportPipeline.js`, `test_f11PortalAdapter.js`, `test_dashboardNationalRankRange.js`, `test_dbBusyTimeoutConfig.js`, `test_enum.js`, `test_f41RankingReconciliation.js`, `test_hide.js`, `test_hide2.js`, `test_run.js`. `test_dkclSessionPreflightService.js` has a SyntaxError at HEAD (`let cleanupCalled` declared twice, from the WIP commit 06c289af), so its tests do not run; the new preflight tests are in `autoImport016.test.js` instead.

## 5. Residuals And Decisions For CTO

- R1 (not fixed, outside the ticket's list): the manual Import path (`dkclHueF13SyncController` -> `DkclHueF13SyncService.run` -> `openF13Report`) is not wrapped in `withSourceLock`, so a manual Import can still navigate the page under a queue job.
- R2: with the race removed, a cleanup call that hangs inside Playwright with no timeout (for example a `page.evaluate` on a frozen page) would now hold the lane instead of being abandoned. Every goto and wait is bounded, so this should not happen; there is no hard backstop by design (PO: no abandoned cleanup).
- R3 (interpretation of P4): "một lượt" was implemented as one extra attempt, not another cycle of three. If another cycle was meant, change `realAttemptNumber === maxAttempts` in `recordLeasedFailure`.
- R4: the cause is not proven by a live run. The new log lines (P0) will show click-to-form times and event-loop delay at the next 07:30 slot; compare them before calling the incident closed.
- R5: the two schedule-created runs (b54094ea, 85b01c4f) and the queued F1.3 HUE 13/11 job existed before this ticket; F1.3 HUE 15/11 is still missing from the database and needs a re-run after the CTO review and the backend restart.
