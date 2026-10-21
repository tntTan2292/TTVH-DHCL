# AUTO-IMPORT-SCHEDULE-01 - Scheduled import with hourly retries and DKCL session keep-alive

Status: BACKEND IMPLEMENTED / OFF BY DEFAULT (keep-alive on) / WAITING FOR THE PO TO ENABLE
Owner: Claude Code (Sonnet), 2026-10-21. No screen change.

## 1. PO decisions (2026-10-20/21)

1. The DKCL sign-in has a captcha, so it stays a human step (the existing login window). No unattended sign-in (ticket AUTO-LOGIN-01 closed).
2. Scheduled import at **07:30** Vietnam time.
3. If importing the new day and the refresh days fails, **retry every hour until everything succeeds**.
4. The TCT account is currently broken; the PO will provide another TCT user later.

## 2. Behaviour

| Part | What | Where |
| --- | --- | --- |
| Cycle | At each time of `AUTO_IMPORT_SCHEDULE_TIMES` (default `07:30`) a cycle starts, once per day; a missed time starts once at start-up if less than 3 h late | `src/services/autoImportScheduler.js` |
| Attempt | Per lane of `AUTO_IMPORT_SCHEDULE_LANES` (default `HUE,TCT`): check the DKCL session (preflight); no valid session = failure of this attempt; otherwise one ordinary Auto Backfill run for the lane (every ACTIVE indicator: missing days including the newest day, plus the 3-day refresh window), requested by user `scheduler` | same |
| Success | The attempt succeeds when every lane had a valid session and its run COMPLETED with no failed job, or had nothing to import. The scheduler waits for the runs to end (up to one hour per attempt) | same |
| Retry | Otherwise the next attempt starts one hour after the previous one began (`AUTO_IMPORT_SCHEDULE_RETRY_MS`), up to `AUTO_IMPORT_SCHEDULE_MAX_ATTEMPTS` (16) in the day. A failed day stays missing / not refreshed, so each retry plans exactly what is left | same |
| Restart safety | Slot and cycle state (attempts, next attempt time, open attempt) are saved in `Data DKCL/BrowserProfiles/auto-import-schedule.json`: a restart neither repeats a slot nor forgets a pending retry | same |
| Keep-alive | Every 10 min (`DKCL_KEEPALIVE_INTERVAL_MS`), for a source that has a live browser session, a session re-check (preflight probes the real portal page, which keeps an idle-timeout session active). It never signs in or opens a browser. On by default; `DKCL_KEEPALIVE_ENABLED=false` turns it off | `src/services/dkclSessionKeepAlive.js` |
| Reattach (PO decision 2026-10-21) | A backend restart loses the live browser window the import jobs work in, but the saved portal session usually survives in the browser profile. `reattachSession(source)` checks that the saved session is valid (headless probe) and only then reopens the window; the portal sees a signed-in user, so nothing is typed and no captcha appears. It does nothing without a valid saved session (a person must sign in) and leaves a login in progress alone. The keep-alive runs it about 30 s after start-up and on each tick for a source with no live window (a source with nothing to reattach waits `DKCL_REATTACH_COOLDOWN_MS`, 30 min, before the next look), and the scheduler runs it before each lane check | `dkclSessionPreflightService.js`, `dkclSessionKeepAlive.js`, `autoImportScheduler.js` |
| Measurement | Every status change of a source is appended to `Data DKCL/BrowserProfiles/session-watch.log` with how long the session had been valid ("was valid for 3h30m"), so the real session lifetime is read from facts | same |

Wired in `server.js`.

## 3. Using it

- With the TCT account broken: set `AUTO_IMPORT_SCHEDULE_LANES=HUE` so the schedule is not held back by TCT; when the new TCT user works, set it back to `HUE,TCT` (or remove it). With both lanes configured a TCT failure only makes the hourly retries continue until the day's limit.
- Enable: `AUTO_IMPORT_SCHEDULE_ENABLED=true` in `.env`, then restart the backend (Control Center: Stop System, Start System). The 07:30 import needs a valid DKCL session: sign in by hand the evening before or before 07:30; the keep-alive then tries to keep it alive.
- Where to look: backend log lines `[AUTO-IMPORT-SCHEDULE]` and `[DKCL-KEEPALIVE]`; the Import history tab (actor `scheduler`).

## 4. Validation

`test_autoImportScheduler.js` 14/14 (the last five: reattach gives a valid saved session its window back with nothing typed, does nothing without a valid session, leaves a login in progress alone, the keep-alive retries it with a cooldown, the scheduler runs it before the session check). Earlier nine: defaults and parsing; off unless enabled and the catch-up window; success on the first attempt (no retry); hourly retry until every lane succeeds (no session, then a run with errors, then success); waiting for runs still working and counting them as unfinished after an hour; nothing-to-import is success and a lane outside `AUTO_IMPORT_SCHEDULE_LANES` is never touched; restart safety and next-day cycle; give up after the maximum attempts; keep-alive touches only live sessions, logs changes with the valid duration, on by default. Related suites unchanged: QueueService 45/45, Safety 11/11, AnchorRun 5/5, autoImport015 7/7, DKCL reclaim / coordinator / broker / sync 4, 1, 1, 1.
Not verified live: a real 07:30 run and whether the keep-alive extends the real session (it is a measurement: read `session-watch.log` after a few days).

## 5. Residuals

- A run left in WAITING_AUTH is not resumed by the scheduler (the screen's resume still works); after the person signs in, the next hourly attempt plans what is left.
- HUE broker mode (`DKCL_HUE_BROKER_ENABLED=true`, off today) has no live client for the keep-alive.

## 6. Portal credentials removed from the environment (PO, 2026-10-21)

The PO asked to delete the DKCL account keys from `.env`: they had been replaced many times and the sign-in is manual (portal.vnpost.vn with a captcha). Removed from the local `.env` (not tracked) and from `.env.example`: `PORTAL_HUE_USERNAME`, `PORTAL_HUE_PASSWORD`, `PORTAL_HUE_HRM_CODE`, `PORTAL_NATIONAL_USERNAME`, `PORTAL_NATIONAL_PASSWORD`, and three unused leftover lines (a hangton URL and `Username` / `password`; the hangton job reads `HANGTON_*` from `backend/.hangton.env`). Kept: `PORTAL_BASE_URL`, the `DKCL_HUE_*` settings, `QIS_VIEWER_*`, `QIS_AGG_READ`.
Effect: nothing in the Auto Backfill flow reads these keys (it uses the live session or `requireExistingSession`). Only the old Data Import Center HUE F1.3 panel (`/import/dkcl/hue/f13/sync` and `backfill-queue`, `dkclHueF13SyncService.runWorkflow`) tried a form login with them, which the SSO portal no longer allows; it now stops with `MISSING_CREDENTIALS` instead of a failed login. `AUTO-IMPORT-001_SECURE_LOCAL_CREDENTIAL_SETUP.md` (2026-07-19) describes the old setup and is historical.


## 7. DKCL browser window hides once the session is ready (2026-10-21)

Defect: the interactive DKCL window was hidden only after a typed login. It stayed on screen when the saved session was already valid at open (`interactiveAuthenticatedOnOpen`, the case every `reattachSession` window is in) and when the F1.3 page became ready only on a later probe (SOURCE_PAGE_REQUIRED recovery, `probeAndMaybeExpireClient`). A failed hide was never retried.
Fix (`dkclSessionPreflightService.js`): one `hideWindowIfVisible()` used by the login task and by every ready outcome of the probe. It does nothing when the window is already hidden or an operation owns the session, tolerates a client without a hide function, and a hide that failed is retried by the next ready probe.
Validation: `src/services/dkclSessionWindowHide.test.js` 7/7 (5 of them fail on the previous code); `autoImport015.test.js` 7/7, `test_autoImportScheduler.js` 14/14, `test_autoBackfillSafety.js` 11/11. Not verified live on Windows (needs a backend restart and a look at the real window).
Residual: HUE broker mode has no hide logic (off today).

### 7.1 The window vanished on "Đăng nhập qua portal" (PO live check, 2026-10-21)

Cause (backend_err.log): clicking "Đăng nhập qua portal" while the window was still opening made the portal redirect the page, which cancelled our own `page.goto(baseUrl)` with `net::ERR_ABORTED`; `prepareInteractiveAuthentication` treated that as a failure, the session went to SESSION_EXPIRED and the window was closed before any login. Also, `isAuthenticated()` accepted any page whose text had a signed-in marker, so the portal.vnpost.vn sign-in page could have counted as a signed-in DKCL session.
Fix (`dkclHueF13PortalClient.js`, `dkclSessionPreflightService.js`): navigations during opening go through `gotoInterruptible()` (a cancelled navigation is not a failure; real errors still surface); a page counts as signed in only on the DKCL host; the window is never hidden while the client says it is not signed in.
Tests: `dkclSessionWindowHide.test.js` 10/10. Unrelated, already failing before this change: `test_dkclSessionPreflightService.js` (SyntaxError, `cleanupCalled` declared twice at line 1146) and two real-workbook tests in `test_f11PortalAdapter.js` (TCT workbook reconciliation).

## 8. Old failed days no longer keep the schedule retrying (PO, 2026-10-21)

Review finding: an unscoped scheduled run also plans every older missing day. Five old days (F1.1/HUE 2026-01-08 and 2026-03-20, F1.2/HUE 2026-02-16, F1.2/TCT 2026-02-15 and 2026-02-16) fail every time (`F11_HUE_RECONCILIATION_FAILED` and similar), so each run would end COMPLETED_WITH_ERRORS and the schedule would retry up to 16 times a day.
PO decision: leave those days; the PO handles them by hand. Fix (`autoImportScheduler.js`): a run that ended with errors counts as successful for the retry decision when every failed job is FAILED_TERMINAL and older than `AUTO_IMPORT_SCHEDULE_RECENT_DAYS` (default 4) days before the run's business date, i.e. outside the new day and the 3-day refresh window; the ignored days are logged. A recent failure, a cancelled job or unknown detail still counts as a failure. The run still tries the old days once per cycle.
Tests: `test_autoImportScheduler.js` 16/16 (two new). Still off: add `AUTO_IMPORT_SCHEDULE_ENABLED=true` to `.env` and restart to enable.
