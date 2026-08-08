# AUTO-IMPORT-014 CHECKPOINT 002 — Phase 2 Implementation (Technical Gate)

## Executive State

- Ticket: `AUTO-IMPORT-014`
- Current state: `TECHNICAL GATE PASS — AWAITING PO RUNTIME ACCEPTANCE`
- Product Owner authorized bounded implementation of the Phase 1 remediation design at governance commit `964428bd`, in four small phases: A) tests reproducing the bugs, B) implementation, C) automated regression, D) this report + PO runtime checklist. No `PO PASS`/`CLOSED` is declared; no PO runtime testing was required before this Technical Gate.

## Phase A — Tests Reproducing The Bugs (written before/alongside the fix, verified failing against the pre-fix code path where practical)

New tests, all in `backend/test_dkclSessionPreflightService.js` unless noted:

- **TEST 14**: a single transient false `isF13ReportReady()`/`isAuthenticated()` reading — reproduces the exact destructive-close bug from Checkpoint 001 finding 2.
- **TEST 15**: confirmed logged-out (real login form present) after the bounded retry — proves a *genuine* failure still expires correctly.
- **TEST 16**: inconclusive reading (never ready/authenticated, no login form either) — reproduces the "ambiguous transient state" class the old code had no way to distinguish from a real failure.
- **TEST 17**: `activeOperation` protection, parameterized over **both** `HUE` and `TCT` — reproduces the "no TCT equivalent" gap from Checkpoint 001 finding 3.
- **TEST 18**: concurrent callers for the same source vs. across sources — reproduces the "no serialization at all" gap from Checkpoint 001 finding 1/2, and proves HUE/TCT independence.
- **TEST 19**: HUE → TCT → HUE in immediate succession — the exact sequence the Product Owner reported.
- **TEST 20**: repeated login/cancel cycles (soak-lite) — checks for accumulating registry entries or unclosed clients.
- **TEST 9-HUE** (renamed from the former HUE-blocking assertion in TEST 9): reproduces the "HUE never reconciles an orphan, only TCT does" gap from Checkpoint 001 finding 5.
- `backend/test_dkclHueF13SyncService.js` **TEST 22-25**: multi-page rebind, closing a stray page not failing the session, a genuine no-authenticated-page failure, and `hasLoginForm()`'s classification — reproduce Checkpoint 001 findings 3/4 at the portal-client level, using the real `DkclHueF13PortalClient` class (not a mock).

## Phase B — Implementation

1. **Per-source mutex (item 1)** — `backend/src/services/dkclSessionPreflightService.js`: new `SourceOperationLock` class + `getSourceLock(source)` (module-scope map, one lock per source string) + `DkclSessionPreflightService.withSourceLock(source, fn)`. HUE and TCT get independent lock instances — proven by `getSourceLock('HUE') !== getSourceLock('TCT')` and by TEST 18's concurrency timing. Wired into:
   - `probeAndMaybeExpireClient()`'s actual expire-and-close branch (below).
   - `interactiveAuthenticate()`'s reconciliation + launch section (`entry.openingPromise = this.withSourceLock(source, async () => {...})`) — held only through the classification/reconciliation/launch/`prepareInteractiveAuthentication()` phase, released as soon as that returns (the fire-and-forget background manual-login wait, up to 4 minutes, is *not* held inside the lock — it doesn't need to be, since `preflight()`'s fast path already exits before ever touching the lock while `DKCL_IN_PROGRESS_STATES` covers the session).
   - Both backfill services' `processQueueItem()`, around the actual `adapter.runOneDate(...)` call (with a safe fallback when a test-injected `sessionPreflightService` mock lacks `withSourceLock`).

2. **Generalized operation-ownership exemption (item 2)** — `preflight()`'s HUE-only `entry.activeOperation === 'HUE_QUEUE_RUNNING'` check is replaced by a source-agnostic `entry.activeOperation && entry.authenticated` check. Any owning operation for either source — a running queue, an Update/Re-update, or any future operation that sets `activeOperation` — now exempts the whole session from ever having its client touched by a poll.

3. **Bounded retry + error classification before cleanup (item 3)** — new `probeAndMaybeExpireClient(sourceConfig, entry)` replaces the old single-reading destructive branch:
   - Checks `isAuthenticated()` (which itself now rebinds — see item 4) then `isF13ReportReady()` then `hasLoginForm()` (new method).
   - On a false reading, waits `this.reprobeRetryDelayMs` (default 750ms, `DKCL_REPROBE_RETRY_MS` env override, 0 in tests) and checks once more before drawing any conclusion.
   - If an operation claims ownership while probing/retrying, defers to it — never expires a session another operation now owns.
   - If still inconclusive (not ready, not authenticated, but *no confirmed login form either*) after the retry, reports `LOGIN_IN_PROGRESS` and keeps the session — does not guess.
   - Only a confirmed login form (`hasLoginForm() === true`) after the bounded retry triggers an actual expire, and that expire runs inside `withSourceLock(source, ...)`, re-checking `entry.client === client` first in case another path already replaced it while waiting for the lock.

4. **Rebind to the authenticated page; multi-page support (item 4)** — `backend/src/services/dkclHueF13PortalClient.js`: detection logic factored into `_checkPageAuthenticated(page)` (byte-for-byte identical markers to before this ticket — nothing about *what* counts as authenticated changed, only *which page* gets checked). `isAuthenticated()` now checks `this.page` first, and if that fails, calls new `findAuthenticatedPage()`, which scans `this.context.pages()` for another open page that passes the same check and rebinds `this.page` to it. A stray/duplicate page being closed no longer fails the session as long as one authenticated page remains open in the same context.

5. **Reconciliation before retry, generalized to both sources, ownership-scoped (item 5)** — `reclaimTctOrphanedProfile` renamed to `reclaimOrphanedProfile`, the `sourceConfig.source === 'TCT'` restriction removed. Ownership safety is unchanged and was already correct: `selectExactProfileRootPids()` only ever returns PIDs whose own `--user-data-dir` command-line argument matches *this exact* profile directory (`exactProfileMatch`) — a personal or unrelated Chrome process is never selected or terminated, for either source.

6. **Update/Re-update reuse + prompt hide (item 6)** — a direct, no-extra-code consequence of items 2/3: once the destructive-close bug is fixed and both sources set `activeOperation` for their queue duration, Update/Re-update naturally reuses the existing `entry.client` (`getInteractiveClient(source)`, unchanged) instead of being forced into a fresh, visible re-authentication. `dkclHueF13BackfillService.js`'s existing per-item `hideWindow()` call before each import (unchanged) now reliably applies to the *same, already-hidden* session rather than a freshly-reopened, visible one.

**TCT's own `activeOperation` gap (finding 3 of Checkpoint 001) is closed**: `tctF13BackfillService.js`'s `processQueue()` now sets `entry.activeOperation = 'TCT_QUEUE_RUNNING'` at the start (mirroring HUE) and `finishQueueIfTerminal()` clears it — except when the queue ends in `BLOCKED` (a pre-existing TCT-specific pause state with no HUE equivalent, deliberately left unmarked-terminal by the pre-existing code so a `BLOCKED` queue can be retried without restarting); leaving `activeOperation` set while `BLOCKED` errs toward *not* letting `preflight()` destructively touch a paused-but-not-abandoned session, which is consistent with, not contrary to, this ticket's intent.

## Phase C — Automated Regression

```
node backend/test_dkclSessionPreflightService.js     -> RESULT: dkclSessionPreflightService checks passed (26 pre-existing + 8 new AUTO-IMPORT-014 test blocks, all pass)
node backend/test_dkclHueF13SyncService.js            -> RESULT: 135 passed, 0 failed (129 pre-existing + 6 new, real DkclHueF13PortalClient class)
node backend/test_dkclHueF13BackfillService.js        -> RESULT: 39 passed, 0 failed (unchanged)
node backend/test_tctF13BackfillService.js             -> all named blocks pass (unchanged)
node backend/test_dkclHueBrowserBroker.js              -> PASS (unchanged)
node backend/test_browserProfileLock.js                -> All tests passed (unchanged; file not touched)
```

`oxlint` on all 4 changed source files: 6 warnings, all confirmed pre-existing on untouched lines (verified via `git stash`/rerun/`git stash pop` — only line numbers shifted). No new warnings.

`test_hide2.js`/`test_run.js` (real, visible-browser exploratory scripts, not part of the automated suite) were not run — they open a real Chrome window and are not assertion-based regression tests.

## Scope Confirmation

```
git diff --stat
 backend/src/services/dkclHueF13BackfillService.js  |  17 +-
 backend/src/services/dkclHueF13PortalClient.js     |  45 +++-
 backend/src/services/dkclSessionPreflightService.js| 224 ++++++++++++++-----
 backend/src/services/tctF13BackfillService.js      |  24 +-
 backend/test_dkclHueF13SyncService.js              |  49 +++++
 backend/test_dkclSessionPreflightService.js        | 242 ++++++++++++++++++++-
```
4 backend service files + 2 backend test files only. No frontend change was needed this round (the frontend already polls and displays session status correctly, per `AUTO-IMPORT-013`). `NETWORK-MANAGEMENT-001` / Module QLML: not touched. Production DB / imported data: not touched (this ticket never runs a real import). `Data QLML/` and both git stashes: confirmed present/untouched. No credential, cookie, token, or raw page content was read, logged, or stored at any point.

## Residuals / Known Limitations

- The bounded retry + inconclusive-state handling (item 3) means a session in a genuinely ambiguous state (never resolves to ready/authenticated, but also never shows a login form — e.g. a portal-side error page) will be kept and reported `LOGIN_IN_PROGRESS` indefinitely rather than being force-expired. This is the deliberate, PO-directed trade-off ("không hủy phiên chỉ vì một lần authentication check trả false tạm thời... phân loại lỗi trước khi cleanup") — it trades a theoretical indefinite-ambiguous-state risk for eliminating the confirmed destructive-close bug. Not observed in any test or prior incident; noted as a residual to watch during PO runtime use.
- TCT's `BLOCKED` queue status leaves `activeOperation` set (see Phase B item 6 note) — intentional, consistent with existing `BLOCKED`-is-retryable semantics, but means a `BLOCKED` TCT queue is protected from `preflight()`'s probe until explicitly retried or cancelled.
- No live browser / real DKCL portal session was opened in this implementation round — all new coverage is unit-level (mocked Playwright objects, mocked service dependencies) plus the existing regression suites. A real end-to-end soak test (the repeated-cycle scenario against the actual portal) is part of the PO Runtime Acceptance Checklist below, not something this round could self-certify.

## Next Action

Await Product Owner runtime acceptance per the checklist below. This ticket does not close and no `PO PASS` is declared in this round.
