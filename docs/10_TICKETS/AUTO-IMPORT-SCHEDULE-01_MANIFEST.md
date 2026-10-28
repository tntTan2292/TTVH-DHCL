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
| Attempt | Per lane of `AUTO_IMPORT_SCHEDULE_LANES` (default `HUE,TCT`): check the DKCL session (preflight); no valid session = failure of this attempt; otherwise one ordinary Auto Backfill run for the lane (every ACTIVE indicator: missing days including the newest day, plus the 2-day refresh window), requested by user `scheduler` | same |
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

## 9. Refresh window is 2 days, not 3 (PO, 2026-10-21)

PO decision: the scheduled import is the new day D-1 (import new) plus D-2 and D-3 (import again), where D is the day the schedule runs. `refreshWindowDays` was 3 (D-2, D-3, D-4); it is now **2** for F1.1, F1.2, F1.3 and F4.1 (`importIndicatorRegistry.js`), which also applies to the unscoped Auto Backfill run. `AUTO_IMPORT_SCHEDULE_RECENT_DAYS` default is now 3 (a failed day older than D-3 is an old gap, Section 8). The "Import cả ngày + bù 3 ngày" button is unchanged: it imports the chosen day and the two days before it (3 days in total).
Read-only simulation with the real registry (22 Oct, newest day 21 Oct, both lanes): 24 jobs = 8 new (21 Oct) + 8 re-import (20 Oct) + 8 re-import (19 Oct). With HUE only: 12 jobs (4 + 4 + 4). Tests: `test_autoBackfillRefreshWindow.js` 6/6 (registry expectation now 2), `test_autoImportScheduler.js` 16/16, queue service 45/45, anchor run 5/5, safety 11/11, coverage 17/17, F13 executors 19/19.

## 7. Retry interval shortened to 30 minutes (PO, 2026-10-27)

The wait between attempts is now 30 minutes (was one hour), so that when the TCT data is not yet synced from the DKCL portal at 07:30 the next look comes at 08:00, not 08:30. Default of `AUTO_IMPORT_SCHEDULE_RETRY_MS` = 1 800 000 ms (override in `.env` if needed). The same value is the longest an attempt waits for its runs to finish before the next attempt starts (open runs are not duplicated: a tuple with an open job is skipped by the queue). Sections 2 to 4 above that say "hourly" / "one hour" now read 30 minutes. Test: `test_autoImportScheduler.js` 17/17 (the earlier scenarios pin one hour through the env so they stay readable; a new test covers the 30-minute default). A backend restart applies it.

## 8. Reopened windows no longer pop up (2026-10-27)

Symptom (PO): the HUE and TCT sign-in windows kept appearing for a few seconds and then disappearing. Cause: every backend start (and every keep-alive reattach after a lost window) reopens each window from the saved session through the interactive login path, which launched the window normally, brought it to the front and restored it before the 3-second grace hide. Fix: `reattachSession` now opens quietly (`interactiveAuthenticate(source, { quiet: true })` and `prepareInteractiveAuthentication({ quiet: true })`): the window starts minimized (`--start-minimized`), is hidden at once and is not brought forward or restored. If the portal turns out to need a sign-in, the client shows the window (a person must see it). A sign-in the person starts is unchanged. Tests: `dkclSessionWindowHide.test.js` 13/13 (3 new). A backend restart applies it.

## 9. A retry only runs the lanes that are not finished (2026-10-27)

Symptom: the schedule retried every 30 minutes because TCT was still working, and each retry created a new HUE run over the whole history (93 jobs of old gap days, including F1.1 for 08/01), although HUE had already finished. Fix: the cycle remembers `doneLanes` (a lane whose run completed, whose only failures are old days, or that had nothing to import); the next attempt skips those lanes entirely (no session check, no new run). It is saved while the runs are still being waited for, so a restart keeps it. Test: `test_autoImportScheduler.js` 19/19 (the retry scenario now expects HUE to run once only; a new test covers a lane still running after an hour).

Finding, not changed: F4.2 TCT for 08/07 times out (`EXPORT_TIMEOUT`, 15 minutes each) on every attempt, while neighbouring days export in about 1.5 minutes (07/06, 07/07, 07/09, 07/10). The portal never produces the export file for that one date, so it is not slowness and a longer wait would not help; the date needs checking on the portal.

### 10. The queue waits 2 minutes, not 15, for an F4.2 export (2026-10-27)

PO decision. A healthy portal produces the F4.2 export in 0.7-1.6 minutes, but on 27/10 more than the four dates the PO checked (04, 05, 08, 11/07, then also 02/07, 03/07, 29/06, 30/06) never produced it, and every one blocked its lane for 15 minutes (about half of the lane's time). The queue's own F4.2 services now wait `F42_BACKFILL_EXPORT_TIMEOUT_MS = 300000` (`autoBackfillF42Executors.js`), same pattern as the F1.3 queue executor; the plain `F42SingleDateService` default stays 900000. Test: `test_f42PortalAdapter.js` 31/31. Needs a backend restart (the backfill stays paused until the PO presses Tiếp tục Run).

Same day, PO correction: set to 2 minutes (`F42_BACKFILL_EXPORT_TIMEOUT_MS = 120000`), since the export (all postmen nationwide) past 2 minutes means the portal failed. First run with 5 minutes already showed 27/06 timing out at 5.6 minutes instead of about 15.5. Longest healthy export seen is 1.6 minutes.

### 11. Each source has its own first day for F4.2 (2026-10-28)

PO checked the portal: no real data on 15/03 (HUE) and on 01/05 and 10/06 (TCT). F4.2 HUE had 84 days (01/01-31/03) failing in 0.1 s with `F42_HUE_OUTER_SUMMARY_INVALID` (summary without `totalVolume`), the first success being 01/04; each of those days had also been re-created about 8 times by the old retry behaviour (733 failed jobs for 101 days). A lane may now carry its own `trackingStartDate` (`importIndicatorRegistry.js`, `createLane`; never before the indicator's; coverage `autoBackfillCoverageService.js` scans a lane from its own date and reports it). F4.2: HUE from 2026-04-01, TCT from 2026-06-11 (the day after the last empty day checked; 11/06-22/06 stay in coverage because they were not verified). Other indicators unchanged (`null`). Test: `test_autoBackfillCoverageService.js` 19/19. `test_autoBackfillCoverageController.js` has one failing clock test that also fails without this change.

Queue clean-up (direct SQL, same guarded pattern as section 15 of the runtime manifest, one transaction, events written): the 155 still-QUEUED F4.2 TCT jobs for 01/01-10/06 and their runs were set to CANCELLED (reason `PO_APPROVED_QUEUE_CLEANUP`); 28 queued F4.2 TCT jobs remain (11/06 onward). Needs a backend restart for the new start dates to apply.

### 12. The queue waits 3 minutes for F1.1, F1.2 and F4.2 exports; a timeout is logged (2026-10-28)

On 28/10 the 07:30 schedule left F1.1 and F1.2 of TCT (day 27/10) waiting 15.1 minutes each for an export that never reached the machine (no file downloaded), blocking the TCT lane for 30 minutes; the same happened on 26/10 (F1.2, day 25/10, two 15-minute waits, then success at 09:32). Healthy F1.1 / F1.2 exports take 0.3-1.4 minutes. PO decision: the queue's own F1.1, F1.2 and F4.2 services wait `*_BACKFILL_EXPORT_TIMEOUT_MS = 180000` (`autoBackfillF11Executors.js`, `autoBackfillF12Executors.js`, `autoBackfillF42Executors.js`; same pattern as F1.3). F4.2 is 3 minutes rather than the 2 set earlier the same day: F4.2 TCT successes reach 3.3 minutes in total (about 2.7 of waiting). The plain services keep their 15-minute default.

When a wait for a generated file ends without a match, `logGeneratedFileTimeout` (`dkclHueF13PortalClient.js`, called by `pollGeneratedFile` and `pollF42GeneratedFile`) writes one warning with `requestedAt`, the name filter and the first five rows of the portal's file list (name, time as read and as parsed, whether the name matched, whether a link was found), so the next timeout shows whether the portal list held the file. Why the app does not see a file the PO sees on the portal is still unknown. Tests: `test_f11PortalAdapter.js` 26 pass (the two failures, tests 14 and 17, predate this), `test_f12PortalAdapter.js` 25/25, `test_f42PortalAdapter.js` 31/31.
