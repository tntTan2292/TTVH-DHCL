# IMPORT-TCT-TIMEOUT-01 — MANIFEST

**Status:** IMPLEMENTED / TECH PASS / PENDING RUNTIME VERIFICATION (2026-10-09). Executor: Claude Code (Sonnet 5.5). Backend only, LEVEL 2; `PO UI Check Required = No`. Does not change Current Ticket.

## 1. Defect (Product Owner report, 2026-10-09)

Auto-backfill of F4.1 TCT failed for many dates; the PO had to import 11/06, 14/05 and 07/05 by hand.

Evidence from the live database (`auto_backfill_job` / `auto_backfill_attempt`, 2026-10-09): 16 TCT jobs ended `FAILED_TERMINAL / QUEUE_EXECUTION_ERROR` (class `SYSTEM`) with one identical error signature. Every failed attempt ran 31–43 s after lease, never reached the download (no raw file in `portal-downloads/dkcl/tct/f41/raw` inside any failed window), and the same dates failed repeatedly (06-11, 05-14, 05-07 three or four times each; 08-22 earlier). 30 s plus overhead matches Playwright's default `page.request.*` timeout.

Cause (inferred, not directly observed): `fetchF41OuterRows()` (and the export/detail requests) called `page.request.get/fetch` with no explicit timeout; the portal's report for some dates takes longer than 30 s. The Playwright `TimeoutError` had no `.code`, so `AutoBackfillSafetyCoordinator.classify()` defaulted it to `QUEUE_EXECUTION_ERROR` / `SYSTEM` — never retried — and the queue stored only a one-way hash of the message, so the real text was lost.

## 2. Change

- `dkclHueF13PortalClient.js`: all three F4.1 `page.request` calls (report, export, HUE detail) get an explicit `timeout` (`DKCL_F41_REQUEST_TIMEOUT_MS`, default 120000) and a Playwright timeout is rethrown as coded `F41_PORTAL_REQUEST_TIMEOUT`. Already-coded errors pass through untouched.
- `importIndicatorRegistry.js`: `F41_PORTAL_REQUEST_TIMEOUT` → `TRANSIENT` in `DEFAULT_ERROR_MAP`, so the queue retries it (max 3 attempts, bounded backoff) instead of ending `FAILED_TERMINAL`.
- `autoBackfillSafetyCoordinator.js` / `autoBackfillQueueStore.js`: `classify()` also returns a redacted, 300-char `message` (URLs and token/cookie/password values removed), stored in the attempt `evidence_json` and the `ATTEMPT_FINISHED` event payload. The hash signature and every other field are unchanged.

## 3. Validation (LEVEL 2)

New `backend/src/services/importTctTimeout01.test.js` 5/5 (explicit timeout above 30 s, timeout → coded error for report and export, coded errors pass through, TRANSIENT/retryable classification with redacted message, uncoded error still SYSTEM but now carries its message). Regression, per file: `test_autoBackfillSafety.js` 11/11, `test_autoBackfillF41Executors.js` 32/32, `test_autoBackfillQueueService.js` 45/45, `test_f41HueDetailExport.js` and `test_dkclHueF13SyncService.js` pass, `autoImport015.test.js` 7/7. `oxlint` on touched files: 0 errors (one pre-existing `no-dupe-class-members` warning on `readDetailTableTotal`, untouched).

## 4. Residuals / what is still open

- **Runtime verification pending.** The cause is inferred from timing and code, not observed. It needs the backend restarted (this interrupts the import queue, so wait for a quiet moment) and a re-run of a date that still fails — TCT F4.1 2026-04-28, 04-23, 04-21, 04-07, 04-02 are still INCOMPLETE. If one still fails, the new `message` on its attempt row names the real cause; if the portal needs more than 120 s, raise `DKCL_F41_REQUEST_TIMEOUT_MS`.
- Circuit breaker: a TRANSIENT failure still counts toward the 5-consecutive-same-signature circuit. A date that cannot be fetched at all would now fail 3 times (retries) instead of once, so two such dates back to back would open the TCT circuit (Admin reset needed). A success in between resets the count.
- Separate, not touched: HUE F4.1 jobs for 2026-04 are stuck `QUEUED` waiting for a manual HUE login + Admin Resume; the coverage grid does not auto-refresh while the queue runs.
