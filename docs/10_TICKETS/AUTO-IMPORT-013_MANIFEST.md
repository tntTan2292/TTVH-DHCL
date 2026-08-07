# AUTO-IMPORT-013 Manifest

- Ticket ID: `AUTO-IMPORT-013`
- Ticket Name: `Urgent — TCT interactive login stuck at WAITING_FOR_LOGIN after TCT changed its login flow`
- Phase: `Emergency remediation — CLOSED`
- Current State: `COMPLETED / PO RUNTIME PASS / CLOSED`
- Technical Status: `Diagnostic instrumentation, a bounded login-timeout terminal state, and a frontend false-positive-warning fix (commit f7a74d4f) resolved the reported symptom. Real diagnostic evidence captured during the PO's actual TCT login confirmed isAuthenticated()'s existing marker regex matched correctly on TCT's post-login page — no detector change was needed.`
- PO UI Check Required: `No further check — Product Owner confirmed TCT manual login → F1.3 → Import end-to-end, and HUE regression, in this round.`
- PO Product Status: `PO RUNTIME PASS (2026-08-07)`
- Activation date: `2026-08-07`
- Closed date: `2026-08-07`
- Primary executor: `Claude Code`

## Closure — PO Runtime PASS (2026-08-07)

Product Owner confirmed: TCT manual login succeeded; QIS recognized the session and proceeded correctly; TCT Import succeeded; no longer stuck at "Đang mở trình duyệt"; manual credential entry accepted as the permanent mechanism (no auto-login requested); HUE unaffected. Full evidence, including the real diagnostic log captured during the PO's actual login (confirming `isAuthenticated()` did not need broadening): `docs/06_REVIEWS/Import/AUTO-IMPORT-013_CHECKPOINT_003.md`.

No code changed in this closure round (governance-only). `NETWORK-MANAGEMENT-001` remains `PAUSED`, untouched. Production DB, `Data QLML/`, and both git stashes untouched. Ticket is now closed; do not reopen without a new symptom and a new ticket.

## Phase 2 — PO-Authorized Bounded Implementation (2026-08-07)

Product Owner authorized bounded implementation at governance commit `d380ddd9`, scoped to 8 numbered items (instrumentation; no credential automation; detector fix based on fresh evidence; bounded timeout; HUE preserved as control baseline; mandatory tests; no interference with the then-live TCT session until safe evidence was exhausted; preserve production DB/May import/NETWORK-MANAGEMENT-001/Data QLML//stashes).

**What was implemented this round (items 1, 4, 5, 6, 7, 8 — item 3's marker change deferred, see below):**

1. **Diagnostic instrumentation** (`backend/src/services/dkclHueF13PortalClient.js`, new `captureLoginDiagnostics(label)` method): logs URL, page title, page/tab count, body-text length, and boolean marker matches — never raw body text, form values, cookies, or credentials. Called at the start/success/timeout points of `waitForManualAuthentication()` and once inside `openF13Report()`. Prefixed `[AUTO-IMPORT-013]` in `backend.log` for easy filtering.
2. **Bounded login-timeout terminal state** (item 4): added `DKCL_LEGACY_STATES.LOGIN_TIMEOUT` (`dkclLifecycleContract.js`) and `PREFLIGHT_STATUSES.LOGIN_TIMEOUT` (`dkclSessionPreflightService.js`). Root-caused precisely by code reading (no fresh evidence needed): `waitInteractiveAuthentication()` throws `AUTHENTICATION_REQUIRED` from exactly one place — `waitForManualAuthentication()` returning `false` after its full wait window (`DKCL_INTERACTIVE_AUTH_WAIT_MS`, default 4 min) elapses; in the interactive flow credentials are always typed by the PO directly in the browser (no automated `performOneLoginAttempt` call exists on this path), so that error code is unambiguous — it is never a "still on the login form, retry credentials" case here. The background task's catch block previously treated it identically to `SOURCE_PAGE_REQUIRED` (kept `WAITING_FOR_LOGIN`, window open, lock held, and the background poll never restarted — matching the observed indefinite hang exactly). Now: on this specific timeout, the entry transitions to `LOGIN_TIMEOUT` with a specific message (`"Không xác nhận được đăng nhập DKCL {source} trong N phút. Trình duyệt đã đóng và hồ sơ đã được giải phóng."`), and `client.close()` releases the browser context and the profile lock. `preflight()` surfaces `LOGIN_TIMEOUT` exactly once with that message, then resets the entry to `NOT_AUTHENTICATED` so the next poll re-checks the (already-released, cookie-persisted) profile fresh. `SOURCE_PAGE_REQUIRED` (login succeeded, F1.3 page not ready) is unchanged — window stays open, as before.
3. **Frontend false-positive fix** (`frontend/src/pages/DataImportCenter.jsx`): found while implementing item 4 — `tctLoginStuck`/`hueLoginStuck` fired on the *first* poll showing `LOGIN_IN_PROGRESS`, i.e. within seconds of a perfectly normal login opening, showing "Cửa sổ đăng nhập TCT không xuất hiện hoặc đã bị đóng" even though the window had just opened correctly. This alone plausibly explains much of the reported "kẹt" perception. Fixed: `tctLoginStuck`/`hueLoginStuck` now key off `LOGIN_TIMEOUT` (the new accurate, one-shot backend signal) and `SESSION_CHECK_FAILED` only — `LOGIN_IN_PROGRESS` is treated as the normal in-progress state for the whole wait window, no longer as "stuck". `preflightTctSession`/`preflightHueSession` now also capture the backend's specific `LOGIN_TIMEOUT` diagnostic message (arrives on the success path, not an HTTP error) into `tctSessionError`/`hueSessionError`, and the stuck-banner text shows that real message instead of the generic guess when the cause is a genuine timeout.
4. **HUE preserved (item 5):** no change to `isAuthenticated()` or any HUE-specific code path. The timeout-state fix touches the *same shared* `waitInteractiveAuthentication()` catch handling used by both sources (this was already shared before this change), which is a state-machine/lifecycle correction, not a detection-logic change — HUE regression is covered below.

**Deferred, NOT implemented this round (item 3 — detector marker change):** `isAuthenticated()`'s hardcoded Vietnamese marker regex is unchanged. Per the PO's own explicit sequencing ("Trước khi sửa detector, báo ngắn evidence instrumentation thực tế"), this requires real evidence from a *fresh* instrumented reproduction, which requires the PO to perform one new manual TCT login now that the instrumented code is deployed. The previously-live incident (used for Discovery in Phase 1) could only be inspected via OS-level window-title enumeration and offered nothing further before this round's cleanup (see Runtime Cleanup below); it was exhausted as an evidence source, not converted into a fresh instrumented run.

**Runtime cleanup performed (item 7, explicitly authorized: "sau đó dọn tiến trình/lock theo đúng lifecycle, không xóa lock cưỡng bức khi owner process còn hoạt động"):** the TCT session that had been stuck since `15:46` was still live at the start of this implementation round with no further safe evidence extractable (confirmed: a `PrintWindow`/full-screen capture attempt returned no additional signal — the window was not present on the physically capturable display, likely a different virtual desktop/session context; no interaction with the window itself was attempted). Backend PID `29508` was stopped first (graceful `Stop-Process`); the child TCT Chromium process (PID `23140`) exited on its own once the parent's automation pipe closed (`--remote-debugging-pipe`) — no separate force-kill of a still-owned process was needed; `TCT.lock` was then removed only after the owning process was confirmed gone (`Get-Process` returned nothing). Backend restarted via the same invocation the Product Owner's own `TTVH_ControlCenter.ps1` uses (`node server.js`, same `backend.log`/`backend_err.log`), now running the instrumented code as PID `11000`. `HUE.lock` was already absent before this round (no live HUE session existed) and remains untouched.

**Validation (item 6):**
- `node backend/test_dkclSessionPreflightService.js` — all 26 named test blocks pass unchanged (confirms `SOURCE_PAGE_REQUIRED` handling, HUE lifecycle, TCT lifecycle, coordinator recovery, cancel/recover paths are all unaffected).
- `node backend/test_dkclHueF13SyncService.js` — 129/129 passed (exercises the *real* `DkclHueF13PortalClient`, incl. `isAuthenticated`/`waitForManualAuthentication`/`openF13Report` with the new diagnostics calls wired in — no behavior change, no new failures).
- `node backend/test_dkclHueF13BackfillService.js` — 39/39 passed (HUE backfill queue regression, mocked client — unaffected).
- `node backend/test_tctF13BackfillService.js` — all named blocks passed (TCT backfill queue regression, mocked client — unaffected).
- `node backend/test_dkclHueBrowserBroker.js` — passed.
- Frontend: `dataImportTctScan.test.js`, `dataImportWave3Ui.test.js` (checks the still-present `hue-login-stuck` test id), `dataImportHueSelection.test.js`, `importDashboardReconciliation.test.js` (4/4), `NetworkMapClient.test.js` (13/13) — all pass. `dataImportBackfillQueue.test.js` fails on an unrelated, pre-existing assertion about `api/client.js`'s base-URL fallback string, confirmed failing identically on `HEAD` before this change (not touched by this ticket).
- `oxlint` on all 4 changed files: no new warnings versus the pre-change baseline (2 pre-existing warnings in `DataImportCenter.jsx` on untouched lines, 2 pre-existing warnings in backend services on untouched lines — line numbers only shifted).
- Not yet run (requires the PO): TCT manual login → F1.3 open → import end-to-end; HUE manual login → import end-to-end; a tab/redirect scenario; a genuine timeout→cleanup scenario. See Validation Requirements below.

**Untouched, confirmed:** production DB, May-2026 delivery-routes import data, `NETWORK-MANAGEMENT-001` (still paused at its exact prior state), `Data QLML/`, both git stashes (`stash@{0}`, `stash@{1}`). No credentials requested, read, logged, or stored at any point.

## Fresh-Chat Onboarding Authority

Required onboarding chain:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. `docs/10_TICKETS/AUTO-IMPORT-013_MANIFEST.md`
5. Required Reading from this manifest

Current checkpoint: `docs/06_REVIEWS/Import/AUTO-IMPORT-013_CHECKPOINT_003.md` (closure)

Required Reading:

- `docs/06_REVIEWS/Import/AUTO-IMPORT-013_CHECKPOINT_001.md` — Phase 1 discovery evidence
- `docs/06_REVIEWS/Import/AUTO-IMPORT-013_CHECKPOINT_002.md` — Phase 2 bounded-implementation evidence (code changes, tests, live-system cleanup)
- `docs/06_REVIEWS/Import/AUTO-IMPORT-013_CHECKPOINT_003.md` — closure: PO runtime PASS + real diagnostic evidence from the PO's actual TCT login

## Authority

Emergency ticket activated directly by Product Owner priority directive, `2026-08-07`. Does not reopen `AUTO-IMPORT-011` (closed `2026-08-05`, Symptom B there was recovered by restart and never technically root-caused — this is a materially different, now-reproduced symptom with different evidence).

`NETWORK-MANAGEMENT-001` is paused at its current state by explicit Product Owner instruction. Its Delivery Routes (Sơ đồ tuyến phát) Import component, already `PO PASS`, is not touched or rolled back.

## Objective

Determine, with evidence, why the TCT interactive login flow stalls at `WAITING_FOR_LOGIN` ("Đang mở trình duyệt") after the Product Owner manually completes login in the visible browser window, given that:

- TCT has recently changed its login mechanism.
- The Product Owner still types username/password manually in the browser (unchanged on the QIS side).
- HUE (using a new account) logs in and imports successfully — HUE is the control baseline and was not touched.
- The UI shows: "Cửa sổ đăng nhập TCT không xuất hiện hoặc đã bị đóng" ("TCT login window did not appear or was closed").

Per instruction, discovery only. No credentials were requested, read, logged, or stored at any point.

## Reproduction Result

**A live, already-in-progress incident was found and inspected directly** (not separately triggered by this session):

- The backend process (port `5050`, PID `29508`) has been running continuously since `2026-08-07 08:45:43` (no restart).
- `Data DKCL/BrowserProfiles/TCT.lock` exists right now (directory, created `15:46`, last modified `16:13` — actively held at the time of inspection). `HUE.lock` does not exist, consistent with HUE having completed and released its lock normally.
- A live Chromium process tree for the TCT profile is running: main process PID `23140` (child of the backend PID `29508`), launched `2026-08-07 15:46:02`, using `--user-data-dir=...BrowserProfiles\TCT`. This has been alive for roughly 28 minutes at the time of inspection — well past the `240000ms` (4-minute) default interactive-auth wait window (`DKCL_INTERACTIVE_AUTH_WAIT_MS`, `dkclSessionPreflightService.js`).
- **The TCT browser window is open and visible right now.** Its title (read via `EnumWindows`/`GetWindowText`, no page content accessed): `"Quản trị nội dung - Google Chrome for Testing"` ("Content Administration"). This directly contradicts the UI's message that the window "did not appear or was closed" — the window is present and in the foreground.
- Two renderer processes exist under the same browser context (`--renderer-client-id=5` and `=6`), consistent with either two open tabs/frames or one visible tab plus a background/prerendered frame; which of these it is was not determined (would require CDP page enumeration, not attempted — see Residuals).

## Root Cause — Evidence-Backed Hypothesis

**Classification (per the three possibilities to distinguish): login is genuinely complete, but the detector does not recognize it.** Not "login incomplete" (window shows a plausible authenticated destination, not a login form). Weak evidence against "handle lost after redirect" (the same browser context has stayed alive the whole time; no process crash or relaunch occurred), but this is not conclusively ruled out — see Residuals.

**Mechanism**: `backend/src/services/dkclHueF13PortalClient.js`, method `isAuthenticated()` (shared, unmodified, identical code path for both HUE and TCT — confirmed no per-source override exists anywhere in the codebase):

```js
async isAuthenticated() {
    if (this.page.url().includes('/login')) return false;
    const bodyText = await this.page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
    const loginInputCount = await this.page.locator('input[name="login"], input[id="login"], input[type="password"]').count().catch(() => 0);
    if (loginInputCount > 0) return false;
    if (/Thá»‘ng kÃª/iu.test(bodyText)) return true;
    return /Quan ly tep|Quản lý tệp|Tra cứu thông tin bưu gửi|Tra cuu thong tin buu gui|Dang xuat|Đăng xuất|Logout|tantn\.bdtth/i.test(bodyText);
}
```

This function detects a successful login only by matching specific hardcoded Vietnamese phrases expected to appear in the post-login page body. The observed live window title — `"Quản trị nội dung"` — does not match any of these phrases. If TCT's redesigned login now lands on a page whose body text does not contain any of them either (plausible, since the visible window title itself is a different phrase from all of them), `isAuthenticated()` returns `false` forever, `waitForManualAuthentication()` polls until its wait window elapses without ever detecting success, and the session remains reported as `WAITING_FOR_LOGIN`/`LOGIN_IN_PROGRESS` indefinitely — which the frontend (`DataImportCenter.jsx`) then displays as `tctLoginStuck`, a message text that only reflects the backend's `LOGIN_IN_PROGRESS`/`SESSION_CHECK_FAILED` status and does not independently verify whether the window is actually open or closed (confirmed by reading its derivation: `const tctLoginStuck = tctSessionStatus === 'LOGIN_IN_PROGRESS' || tctSessionStatus === 'SESSION_CHECK_FAILED';`). The message text is misleading for this specific case — the window is not gone, the detector simply never fired.

## Evidence Still Missing / Not Determined

- The exact page content (body text, URL, DOM) of the live TCT window was **not** inspected — only its window title, via OS-level `EnumWindows`, which touches no page content and required no credentials. Confirming the body-text mismatch directly (rather than inferring it from the title) requires either a live CDP/Playwright page inspection during a fresh reproduction, or backend console/log capture at the moment of the stall — neither was available for this specific already-in-progress incident (no persistent per-request log; see `AUTO-IMPORT-011_CHECKPOINT_002.md` for the same limitation noted previously).
- Whether TCT's post-login flow uses a genuinely new destination URL/domain, a popup/second tab, or a client-side (SPA) navigation that changes body text without changing `page.url()` in a way Playwright's `page` reference would miss, is **not determined**. The two-renderer-process observation is suggestive of a second page/tab but not conclusive.
- Whether the in-memory `this.page` reference in the running backend process still points at a page showing the correct, current content (i.e., whether the "handle lost after redirect" case is fully ruled out) requires live instrumentation that was not performed, per the discovery-only boundary and to avoid disturbing the live incident before evidence could be captured.

## Distinguishing The Three Cases (Task Requirement)

1. **Login genuinely not completed** — evidence weighs against this: the window shows what is very likely an authenticated destination page ("Quản trị nội dung"), not a login form, and the Product Owner reports manual login succeeded.
2. **Login completed but the old detector does not recognize it** — evidence supports this as the primary hypothesis: the visible page title matches none of `isAuthenticated()`'s hardcoded success markers, and no per-source override exists to handle a TCT-specific post-login page shape.
3. **Browser/client handle lost after redirect** — not supported by process evidence (same browser context has remained alive throughout, no crash/relaunch observed), but not fully excluded without page-level (CDP) inspection during a fresh, instrumented reproduction.

## Out Of Scope (This Ticket, Discovery Phase)

- Any code change. No fix has been implemented.
- `NETWORK-MANAGEMENT-001` — untouched, remains paused at its current state exactly.
- The Delivery Routes (Sơ đồ tuyến phát) Import component and its already-PO-PASS May data — untouched, not rolled back.
- `AUTO-IMPORT-011` — not reopened.
- HUE — not modified in any way; HUE continues to work and was used only as an unmodified control baseline for comparison.
- Reading, requesting, logging, or storing the Product Owner's TCT username/password — never done.
- `Data QLML/` and both pre-existing stashes — untouched.

## Proposed Minimum Fix Scope — Final Status (Closed)

Original 4-item proposal, final disposition:

1. **Resolved without a code change.** The fresh instrumented reproduction happened via the Product Owner's own real TCT login. Captured evidence (`docs/06_REVIEWS/Import/AUTO-IMPORT-013_CHECKPOINT_003.md`) shows `isAuthenticated()`'s existing marker regex correctly matched TCT's post-login page (`has_quan_ly_tep: true`) and `openF13Report()` reached the real F1.3 page cleanly. The Phase 1 window-title observation ("Quản trị nội dung") was not representative of the actual body-text marker the detector uses. **No detector change was needed; none was made.**
2. **Done, unchanged.** Manual credential entry is untouched — no automated username/password fill exists anywhere in this code path.
3. **Done.** Bounded diagnostic/timeout implemented: `LOGIN_TIMEOUT` terminal state, browser/lock released, specific message surfaced once via `preflight()`, `WAITING_FOR_LOGIN` no longer parks indefinitely after the wait window elapses.
4. **Done.** No change to HUE's detection path (`isAuthenticated()` untouched). Product Owner confirmed HUE continues to work normally.

## Validation Requirements — Final Status (All Complete)

- [x] `oxlint` on all 4 changed files — no new warnings vs. pre-change baseline.
- [x] `test_dkclSessionPreflightService.js`, `test_dkclHueF13SyncService.js`, `test_dkclHueF13BackfillService.js`, `test_tctF13BackfillService.js`, `test_dkclHueBrowserBroker.js` — all pass unchanged.
- [x] Frontend `dataImportTctScan.test.js`, `dataImportWave3Ui.test.js`, `dataImportHueSelection.test.js`, `importDashboardReconciliation.test.js`, `NetworkMapClient.test.js` — all pass.
- [x] `fact_f13` row count and existing imported data unchanged; `Data QLML/` and both stashes untouched; no credentials touched.
- [x] Real instrumented TCT reproduction (Product Owner performing the actual manual login) — captured real evidence, confirming the detection mismatch hypothesis was not the actual cause.
- [x] TCT login → F1.3 report opens → import succeeds, confirmed end-to-end by the Product Owner.
- [x] Full HUE regression confirmed by the Product Owner: HUE login → import succeeds, unchanged.
- [x] Product Owner runtime confirmation recorded — `PO RUNTIME PASS`, `docs/06_REVIEWS/Import/AUTO-IMPORT-013_CHECKPOINT_003.md`.

## Completion And Handoff

`AUTO-IMPORT-013` is `COMPLETED / PO RUNTIME PASS / CLOSED` (2026-08-07). Root cause was the frontend false-positive warning plus the missing bounded timeout (both fixed in commit `f7a74d4f`), not a detector mismatch — confirmed by real evidence from the Product Owner's own login. Do not reopen without a new symptom and a new ticket.

`NETWORK-MANAGEMENT-001` remains `PAUSED` at its current state, untouched. Do not activate any next ticket beyond what Product Owner explicitly authorizes.
