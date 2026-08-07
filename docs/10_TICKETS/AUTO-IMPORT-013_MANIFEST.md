# AUTO-IMPORT-013 Manifest

- Ticket ID: `AUTO-IMPORT-013`
- Ticket Name: `Urgent — TCT interactive login stuck at WAITING_FOR_LOGIN after TCT changed its login flow`
- Phase: `Emergency remediation — discovery only`
- Current State: `DISCOVERY COMPLETE / ROOT CAUSE HYPOTHESIS EVIDENCE-BACKED / NO FIX IMPLEMENTED`
- Technical Status: `Root cause identified via live, currently-reproducing incident inspection (process/window/code). No code changed.`
- PO UI Check Required: `Not yet — no fix has been implemented in this ticket`
- PO Product Status: `NOT PASS — awaiting PO review of discovery before any implementation`
- Activation date: `2026-08-07`
- Primary executor: `Claude Code`

## Fresh-Chat Onboarding Authority

Required onboarding chain:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. `docs/10_TICKETS/AUTO-IMPORT-013_MANIFEST.md`
5. Required Reading from this manifest

Current checkpoint: `docs/06_REVIEWS/Import/AUTO-IMPORT-013_CHECKPOINT_001.md`

Required Reading:

- `docs/06_REVIEWS/Import/AUTO-IMPORT-013_CHECKPOINT_001.md` — full discovery evidence

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

## Proposed Minimum Fix Scope (Not Yet Authorized/Implemented)

Pending Product Owner/CTO review of this discovery, the smallest scoped fix under consideration is:

1. Broaden or replace `isAuthenticated()`'s TCT-side post-login detection so it recognizes TCT's actual current post-login page, determined from a fresh, instrumented reproduction (capturing real body text/URL, not guessed from the window title alone).
2. Preserve manual credential entry exactly as-is — no automated username/password fill is added or changed.
3. Add a clear, bounded diagnostic/timeout outcome: when `waitForManualAuthentication()`'s wait window elapses without detecting success, transition the session to an explicit `FAILED` state with a specific message (e.g., "login detection timed out after Nm — verify the window shows the expected page") instead of leaving the UI to read a generic, and in this case misleading, "window not appearing/closed" message indefinitely.
4. No change to HUE's detection path unless a shared-code change is unavoidable, in which case HUE's existing passing behavior must be regression-tested before and after.

This scope is not authorized for implementation until Product Owner/CTO reviews this discovery report and root-cause evidence.

## Validation Requirements (For The Implementation Phase, Once Authorized)

- A fresh, instrumented reproduction of TCT login (with the Product Owner performing the actual manual login) that captures the real page body text/URL at the moment of the stall, to confirm the detection-mismatch hypothesis directly rather than by inference from the window title.
- After a fix: TCT login → F1.3 report opens → import succeeds, confirmed end-to-end.
- Full HUE regression: HUE login → import succeeds, unchanged from current passing behavior.
- No automated credential entry introduced.
- No UI left indefinitely stuck at "Đang mở trình duyệt" after a bounded timeout.
- `fact_f13` row count and existing imported data unchanged by this ticket; `Data QLML/` and both stashes untouched.
- Product Owner runtime confirmation required before any `PO PASS` is recorded. This ticket's own technical work does not self-award `PO PASS`.

## Completion And Handoff

This ticket does not close in this round. It remains `DISCOVERY COMPLETE`, awaiting Product Owner/CTO decision on the proposed minimum fix scope before any implementation begins.

`NETWORK-MANAGEMENT-001` remains `PAUSED` at its current state, untouched. Do not activate any next ticket beyond what Product Owner explicitly authorizes.
