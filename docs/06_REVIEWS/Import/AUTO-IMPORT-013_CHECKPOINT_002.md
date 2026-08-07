# AUTO-IMPORT-013 CHECKPOINT 002 — Phase 2 Bounded Implementation

## Executive State

- Ticket: `AUTO-IMPORT-013`
- Current state: `INSTRUMENTATION + TIMEOUT FIX IMPLEMENTED AND TESTED / DETECTOR MARKER CHANGE DEFERRED / AWAITING PO RUNTIME RECHECK`
- Authorization: Product Owner authorized bounded implementation at governance commit `d380ddd9` (8 numbered scope items).
- This checkpoint records the code changes made, the tests run, and the live-system cleanup performed. No credentials were requested, read, logged, or stored at any point.

## Code Changes

1. `backend/src/services/dkclHueF13PortalClient.js`
   - New method `captureLoginDiagnostics(label)`: logs URL, page title, page/tab count, body-text length, and boolean marker matches only (never raw body text, form values, cookies, or credentials). Prefixed `[AUTO-IMPORT-013][PortalClient <source>]`.
   - Wired into `waitForManualAuthentication()` at `wait_start`, `wait_detected_authenticated` (on success), and `wait_timed_out` (on timeout) — replaces the previously undocumented "moment of stall" with a real log record.
   - Wired into `openF13Report()` at `open_f13_report`, right after the F1.3-controls-or-login-inputs race, before the existing login-check throw.
   - `isAuthenticated()` itself is **unchanged** — no marker regex was added, removed, or reordered.

2. `backend/src/services/dkclLifecycleContract.js`
   - Added `DKCL_LEGACY_STATES.LOGIN_TIMEOUT`, picked up automatically by `isKnownLifecycleState()` (iterates `Object.values(DKCL_LEGACY_STATES)`).

3. `backend/src/services/dkclSessionPreflightService.js`
   - Added `PREFLIGHT_STATUSES.LOGIN_TIMEOUT`.
   - Background-task catch block in `interactiveAuthenticate()`: `AUTHENTICATION_REQUIRED` thrown from `waitInteractiveAuthentication()` is now handled distinctly from `SOURCE_PAGE_REQUIRED`. Code-read confirmation that this is unambiguous: `waitInteractiveAuthentication()` throws `AUTHENTICATION_REQUIRED` from exactly one call site — `waitForManualAuthentication()` returning `false` after the full wait window elapses — and the interactive flow never calls `performOneLoginAttempt()` (credentials are always typed by the human in the visible browser), so there is no other case that could produce this code here. On this timeout: transition to `LOGIN_TIMEOUT` with a specific Vietnamese message including the actual configured wait minutes, close the client (releases browser context + profile lock), and return (background task ends). `SOURCE_PAGE_REQUIRED` keeps its prior behavior unchanged (window stays open, authenticated but F1.3 not ready).
   - `preflight()`: new branch reports `LOGIN_TIMEOUT` exactly once with the stored diagnostic message, then resets the entry to `NOT_AUTHENTICATED` so the following poll re-checks the (already-released, cookie-persisted) profile fresh via the existing `requireExistingSession` path.

4. `frontend/src/pages/DataImportCenter.jsx`
   - Found while implementing the above: `tctLoginStuck`/`hueLoginStuck` fired as soon as the backend reported `LOGIN_IN_PROGRESS` — i.e., within the first poll of a perfectly normal login opening, well before any real problem could exist. This is a second, independent contributor to the reported "stuck" perception, on top of the detector question.
   - Fixed: both flags now key off the new `LOGIN_TIMEOUT` status (and `SESSION_CHECK_FAILED`, a genuine check failure) instead of `LOGIN_IN_PROGRESS`. `LOGIN_IN_PROGRESS` is treated purely as the normal in-progress state for the whole wait window.
   - `preflightTctSession`/`preflightHueSession` now capture the backend's `LOGIN_TIMEOUT` diagnostic message (arrives on the success path of the preflight call, not as an HTTP error) into `tctSessionError`/`hueSessionError`.
   - The `tct-login-stuck` banner now shows the real timeout message when the cause is a genuine timeout, and a distinct, honest message otherwise, instead of always claiming "cửa sổ không xuất hiện hoặc đã bị đóng" regardless of what actually happened.

## Test Evidence

```
node backend/test_dkclSessionPreflightService.js
```
All 26 named `TEST ...` blocks through `RESULT: dkclSessionPreflightService checks passed` — including `TEST 6B`/`TEST 6C` which specifically exercise `SOURCE_PAGE_REQUIRED` handling, confirming that path is unaffected.

```
node backend/test_dkclHueF13SyncService.js
```
`RESULT: 129 passed, 0 failed` — this suite exercises the real `DkclHueF13PortalClient` (not a mock), including `TEST 17: visible profile waits for manual authentication after security step`, confirming the new `captureLoginDiagnostics()` calls inside `waitForManualAuthentication()`/`openF13Report()` do not alter behavior or throw against the suite's test doubles.

```
node backend/test_dkclHueF13BackfillService.js   → RESULT: 39 passed, 0 failed
node backend/test_tctF13BackfillService.js       → all named blocks pass
node backend/test_dkclHueBrowserBroker.js         → PASS test_dkclHueBrowserBroker
```

Frontend:
```
node frontend/src/pages/dataImportTctScan.test.js        → passed
node frontend/src/pages/dataImportWave3Ui.test.js        → passed (still asserts hue-login-stuck testid present)
node frontend/src/pages/dataImportHueSelection.test.js   → passed
node frontend/src/pages/importDashboardReconciliation.test.js → 4/4 passed
node frontend/src/api/NetworkMapClient.test.js           → 13/13 passed
```
`dataImportBackfillQueue.test.js` fails on an unrelated pre-existing assertion about `frontend/src/api/client.js`'s base-URL fallback string; confirmed identical failure on `HEAD` (commit `d380ddd9`, via `git stash`/rerun/`git stash pop`) before any change in this ticket — not touched by this ticket, not a regression.

`oxlint` on all 4 changed files: 2 warnings in `DataImportCenter.jsx` (unused `_err` catch params) and 2 in the backend services (`no-useless-fallback-in-spread`, `no-dupe-class-members`) — all 4 confirmed pre-existing on untouched lines by re-running `oxlint` against `HEAD` via `git stash`/`git stash pop`; only line numbers shifted.

## Live-System Cleanup (Item 7)

The TCT session discovered stuck in Phase 1 (Checkpoint 001) was still live at the start of this round:
- Attempted one more safe evidence-gathering step before touching anything: a `PrintWindow`/full-virtual-screen capture. Result: the TCT window was not present on the physically capturable display (the capture showed an unrelated IDE window in the foreground), and the window's own `GetWindowRect` returned a degenerate `160x28` size — consistent with the window living in a different session/virtual-desktop context not capturable this way. No interaction with the window itself (click, focus, keystroke) was attempted. This exhausted the safe evidence available from the already-live incident without interacting with it.
- Backend Node process (PID `29508`) stopped via `Stop-Process -Force` (its own launcher, `TTVH_ControlCenter.ps1`, does not monitor/auto-restart it, confirmed by reading the script).
- The child TCT Chromium process (PID `23140`) exited on its own once the parent's `--remote-debugging-pipe` connection closed — no separate force-kill of a still-running process was needed or performed.
- `TCT.lock` (plus `SingletonLock`/`SingletonCookie`, neither present) removed only after `Get-Process -Id 23140` confirmed the owning process was gone — never force-removed while an owner process was still alive.
- Backend restarted with the exact same invocation the Product Owner's own control-center script uses: `node server.js` from `backend/`, minimized, logging to `backend/backend.log`/`backend/backend_err.log`. New PID `11000`, confirmed via `backend.log`'s startup banner and a live `404` response from the Express server (route probed did not exist, confirming the process is listening and routing).
- Verified after cleanup: no `chrome.exe` process referencing `BrowserProfiles` remains; `TCT.lock` absent; `HUE.lock` was already absent before this round (no live HUE session existed) and remains untouched; `git stash list` still shows both `stash@{0}`/`stash@{1}`; `Data QLML/` still present and untracked; `git status --short` shows only the 4 intended source files modified plus the pre-existing untracked `Data QLML/`.

## Conclusion

Instrumentation and the bounded-timeout/false-positive-warning fix are implemented, tested, and deployed to the running backend. The detector marker change is deliberately deferred — it requires the Product Owner to perform one fresh TCT manual login now that the instrumented code is live, so the real evidence (not inferred from a window title) can be captured and reported before that specific change is made.

## Next Action

1. Product Owner opens Import Center, clicks "Mở đăng nhập TCT", completes one real manual login (credentials never touched by this ticket).
2. Whatever the outcome (detected-authenticated, or a bounded `LOGIN_TIMEOUT` instead of an indefinite hang), the new diagnostics in `backend/backend.log` (search `[AUTO-IMPORT-013]`) will be read and reported back — this is the evidence the detector change has been waiting on.
3. Only after that evidence is reported: decide whether `isAuthenticated()`'s marker list needs a change, implement if so, then run the full validation list (TCT login → F1.3 → import; HUE regression) and hand back to the Product Owner for runtime recheck before any `PO PASS`.

`NETWORK-MANAGEMENT-001` remains paused, untouched.
