# AUTO-IMPORT-013 CHECKPOINT 001

## Executive State

- Ticket: `AUTO-IMPORT-013`
- Current state: `DISCOVERY COMPLETE / NO FIX IMPLEMENTED`
- This checkpoint records raw evidence gathered from a live, already-in-progress incident on `2026-08-07`. No code was changed. No credentials were requested, read, logged, or stored.

## Evidence Log

### 1. Backend runtime state

```
tail backend/backend.log
====================================
Backend Runtime Started
PID: 29508
...
Time: 2026-08-07T08:45:43.519Z
====================================
```

No restart since. Command run at `2026-08-07 16:14:04` local — backend has been continuously running for ~7.5 hours.

### 2. Profile locks

```
Data DKCL/BrowserProfiles/HUE.lock  -> does not exist
Data DKCL/BrowserProfiles/TCT.lock  -> exists (directory), created 15:46, modified 16:13
```

HUE's absence of a lock is consistent with a normal completed-and-released session. TCT's lock, held continuously and still present at inspection time, corresponds to the stuck session the Product Owner reported.

### 3. Live process tree (TCT profile only)

`Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object {$_.CommandLine -match "BrowserProfiles"}`:

- Main process PID `23140`, parent `29508` (the backend), launched `2026-08-07 15:46:02`, `--user-data-dir=...BrowserProfiles\TCT`, binary `ms-playwright\chromium-1234\chrome-win64\chrome.exe` reporting `Google Chrome for Testing` version `151.0.7922.34` (crashpad annotation).
- Child processes: crashpad-handler (x2), gpu-process, two utility processes, and **two renderer processes** (`--renderer-client-id=5` and `=6`).

No corresponding HUE process tree was found — consistent with HUE having completed and its context having been closed normally.

### 4. Window inspection (title only — no page content, no credentials)

Via `EnumWindows`/`GetWindowText`/`IsWindowVisible` (Win32 API, PowerShell `Add-Type`), scoped to the TCT process tree's PIDs only:

```
PID=23140 Visible=True Title='Quản trị nội dung - Google Chrome for Testing'
(handle 12456528)
```

The window is open and in the foreground. Its title does not match any success marker in `isAuthenticated()`.

### 5. Detection code (unchanged, read for analysis only)

`backend/src/services/dkclHueF13PortalClient.js`, `isAuthenticated()` — shared verbatim between HUE and TCT, no per-source override exists anywhere in the codebase (`grep -rn "class.*extends DkclHueF13PortalClient"` — no matches; `grep -n "isAuthenticated"` across `backend/src/services/*.js` shows only call sites, no override):

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

None of `Quan ly tep`, `Quản lý tệp`, `Tra cứu thông tin bưu gửi`, `Dang xuat`/`Đăng xuất`, `Logout`, or `tantn.bdtth` corresponds to `Quản trị nội dung` (the observed window title).

### 6. Wait/timeout configuration (unchanged, read for analysis only)

`backend/src/services/dkclSessionPreflightService.js`:

```js
manualAuthWaitMs: Number(process.env.DKCL_INTERACTIVE_AUTH_WAIT_MS || 240000)
```

Default 4-minute wait. The live TCT lock had already been held for ~28 minutes at inspection time — well past this window — yet the frontend continued to display the stuck-login state rather than a distinct timeout/failure message.

### 7. Frontend message source (unchanged, read for analysis only)

`frontend/src/pages/DataImportCenter.jsx`:

```js
// tctLoginStuck: server returned LOGIN_IN_PROGRESS and we are not actively loading — window may not have appeared
const tctLoginStuck = tctSessionStatus === 'LOGIN_IN_PROGRESS' || tctSessionStatus === 'SESSION_CHECK_FAILED';
```

```jsx
<span>Cửa sổ đăng nhập TCT không xuất hiện hoặc đã bị đóng. Nhấn <strong>Thử lại</strong>...</span>
```

The message is derived purely from backend status, not from any independent check of window existence — confirmed by its own source comment ("window may not have appeared", a guess, not a verified fact). This message is misleading in the observed case, where the window is demonstrably open.

### 8. Shared vs. per-source URL/config check

`backend/src/services/dkclSessionPreflightService.js`, `SOURCE_CONFIG` and `portalBaseUrl` — HUE and TCT use the identical `https://dkcl.vnpost.vn/` base URL and login path; no TCT-specific branching exists in `browserProcessManager.js` either (`grep -n "'TCT'"` — no matches). The divergence is therefore isolated to what TCT's own post-login page now renders, not to any URL/config difference on the QIS side.

### 9. Recent code history (ruling out a QIS-side regression)

```
git log --oneline -15 -- backend/src/services/dkclHueF13PortalClient.js backend/src/services/dkclSessionPreflightService.js backend/src/services/browserProcessManager.js
```

Most recent touching commit: `1ca7eee1` (`AUTO-IMPORT-010`, `2026-07-31`). No commit since then has changed this code. The stall is not explained by a recent change on the QIS side.

## Conclusion

Evidence supports "login completed, detector does not recognize it" as the primary root-cause hypothesis, with the specific mechanism being `isAuthenticated()`'s hardcoded Vietnamese success-marker regex not matching TCT's new post-login page (observed title: `Quản trị nội dung`). This was not fully confirmed at the page-content level (body text/URL), which would require a fresh, instrumented reproduction rather than inspection of an already-in-progress incident. No fix has been implemented pending Product Owner/CTO review.

## Residuals

- Page-level (body text/URL) confirmation of the detection mismatch is outstanding.
- Whether the two renderer processes indicate a second tab/popup the code does not track is outstanding.
- No persistent per-request backend log exists to capture the exact moment of the stall for a future reproduction; the same gap was already noted under `AUTO-IMPORT-011_CHECKPOINT_002.md`.

## Next Action

Await Product Owner/CTO review of the proposed minimum fix scope in `docs/10_TICKETS/AUTO-IMPORT-013_MANIFEST.md` before any implementation. `NETWORK-MANAGEMENT-001` remains paused, untouched.
