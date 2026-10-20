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
| Measurement | Every status change of a source is appended to `Data DKCL/BrowserProfiles/session-watch.log` with how long the session had been valid ("was valid for 3h30m"), so the real session lifetime is read from facts | same |

Wired in `server.js`.

## 3. Using it

- With the TCT account broken: set `AUTO_IMPORT_SCHEDULE_LANES=HUE` so the schedule is not held back by TCT; when the new TCT user works, set it back to `HUE,TCT` (or remove it). With both lanes configured a TCT failure only makes the hourly retries continue until the day's limit.
- Enable: `AUTO_IMPORT_SCHEDULE_ENABLED=true` in `.env`, then restart the backend (Control Center: Stop System, Start System). The 07:30 import needs a valid DKCL session: sign in by hand the evening before or before 07:30; the keep-alive then tries to keep it alive.
- Where to look: backend log lines `[AUTO-IMPORT-SCHEDULE]` and `[DKCL-KEEPALIVE]`; the Import history tab (actor `scheduler`).

## 4. Validation

`test_autoImportScheduler.js` 9/9: defaults and parsing; off unless enabled and the catch-up window; success on the first attempt (no retry); hourly retry until every lane succeeds (no session, then a run with errors, then success); waiting for runs still working and counting them as unfinished after an hour; nothing-to-import is success and a lane outside `AUTO_IMPORT_SCHEDULE_LANES` is never touched; restart safety and next-day cycle; give up after the maximum attempts; keep-alive touches only live sessions, logs changes with the valid duration, on by default. Related suites unchanged: QueueService 45/45, Safety 11/11, AnchorRun 5/5, autoImport015 7/7, DKCL reclaim / coordinator / broker / sync 4, 1, 1, 1.
Not verified live: a real 07:30 run and whether the keep-alive extends the real session (it is a measurement: read `session-watch.log` after a few days).

## 5. Residuals

- A run left in WAITING_AUTH is not resumed by the scheduler (the screen's resume still works); after the person signs in, the next hourly attempt plans what is left.
- HUE broker mode (`DKCL_HUE_BROKER_ENABLED=true`, off today) has no live client for the keep-alive.

## 6. Portal credentials removed from the environment (PO, 2026-10-21)

The PO asked to delete the DKCL account keys from `.env`: they had been replaced many times and the sign-in is manual (portal.vnpost.vn with a captcha). Removed from the local `.env` (not tracked) and from `.env.example`: `PORTAL_HUE_USERNAME`, `PORTAL_HUE_PASSWORD`, `PORTAL_HUE_HRM_CODE`, `PORTAL_NATIONAL_USERNAME`, `PORTAL_NATIONAL_PASSWORD`, and three unused leftover lines (a hangton URL and `Username` / `password`; the hangton job reads `HANGTON_*` from `backend/.hangton.env`). Kept: `PORTAL_BASE_URL`, the `DKCL_HUE_*` settings, `QIS_VIEWER_*`, `QIS_AGG_READ`.
Effect: nothing in the Auto Backfill flow reads these keys (it uses the live session or `requireExistingSession`). Only the old Data Import Center HUE F1.3 panel (`/import/dkcl/hue/f13/sync` and `backfill-queue`, `dkclHueF13SyncService.runWorkflow`) tried a form login with them, which the SSO portal no longer allows; it now stops with `MISSING_CREDENTIALS` instead of a failed login. `AUTO-IMPORT-001_SECURE_LOCAL_CREDENTIAL_SETUP.md` (2026-07-19) describes the old setup and is historical.
