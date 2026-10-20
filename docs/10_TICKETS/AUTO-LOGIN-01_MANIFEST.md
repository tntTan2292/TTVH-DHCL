# AUTO-LOGIN-01 - Unattended DKCL sign-in (HUE first, TCT second) and scheduled import

Status: BACKEND IMPLEMENTED, OFF BY DEFAULT / WAITING FOR THE PO SUPERVISED PROBE
Owner: Claude Code (Sonnet), 2026-10-20. No screen change.

## 1. PO decisions (2026-10-20)

1. Unattended sign-in with the credentials already in `.env` is allowed.
2. The portal login has no CAPTCHA.
3. HUE first, TCT after. After the sign-in works, schedule the automatic import.

## 2. Design

| Part | What | Where |
| --- | --- | --- |
| Attempt rules | Per source, off unless `DKCL_AUTO_LOGIN_<HUE|TCT>_ENABLED=true`; one attempt per `DKCL_AUTO_LOGIN_MIN_INTERVAL_MS` (30 min); after `DKCL_AUTO_LOGIN_MAX_FAILURES` (2) failures in a row no more attempts until a login succeeds (no account lockout); counters saved in a JSON file beside the browser profiles so a restart or crash loop cannot repeat attempts; the attempt is recorded before it starts; credentials never logged | `src/services/dkclAutoLoginService.js` |
| Sign-in | `tryAutomatedLogin()` on the interactive client page: fills username and password, fills the HRM code only if the portal asks, stops at once on a CAPTCHA / OTP page, never throws, never waits for a human | `dkclHueF13PortalClient.js` |
| Hook | In the interactive login (the window the manual login uses), one automatic attempt runs just before the manual wait. Any failure leaves the manual wait exactly as today | `dkclSessionPreflightService.js` |
| Scheduler | At each time in `AUTO_IMPORT_SCHEDULE_TIMES` (Vietnam time, default 08:30): per lane HUE and TCT, make sure the session is valid (opens the login, which makes its one attempt, and waits up to 5 min), then create one ordinary Auto Backfill run for that lane (missing days + the 3-day refresh window) by user `scheduler`. A lane that cannot sign in is skipped and reported; the other lane is not held back. Fired slots are saved; a missed slot runs once at start-up if less than 3 h late | `src/services/autoImportScheduler.js`, `server.js` |
| Probe | PO-run, observe-only by default, `--attempt` makes the one attempt; structure only in the output | `backend/probe_dkcl_auto_login.js` |

Not covered: the HUE broker mode (`DKCL_HUE_BROKER_ENABLED=true`, off today); a run left in WAITING_AUTH from before is not resumed by the scheduler (resume it from the screen).

## 3. Validation

`test_dkclAutoLogin.js` 6/6 (gates, attempt limits, restart persistence, no secret in logs or state file, client page logic with a fake page: HRM, CAPTCHA, missing form, wrong password, interactive hook order); `test_autoImportScheduler.js` 7/7 (times, once-a-day slots, catch-up window, restart safety, valid / expired / blocked / never-ready sessions, nothing-to-import, no overlap). Related suites unchanged: QueueService 45/45, Safety 11/11, AnchorRun 5/5, autoImport015 7/7, DKCL reclaim / coordinator / broker / sync 4, 1, 1, 1. Known and not from this ticket: `test_dkclSessionPreflightService.js` does not load (a duplicate `cleanupCalled` declaration at line 1146, existing before this work).
No live login has been made: the real portal flow (HRM prompt, page after sign-in, effect on a session already open elsewhere) is unverified until the probe.

## 4. PO steps

1. Stop the backend (it owns the browser profile).
2. Observe only: `node probe_dkcl_auto_login.js HUE` (from the `backend` folder). Report the printed lines.
3. With nobody else using the HUE account: `node probe_dkcl_auto_login.js HUE --attempt`. Report the printed lines. Repeat for TCT.
4. Enable in `.env`: `DKCL_AUTO_LOGIN_HUE_ENABLED=true` (then TCT), restart the backend, watch one real login.
5. Then `AUTO_IMPORT_SCHEDULE_ENABLED=true` and `AUTO_IMPORT_SCHEDULE_TIMES=...` (the PO chooses the times), restart.

Status after the probe and the first scheduled run: to be recorded here (Section 5).
