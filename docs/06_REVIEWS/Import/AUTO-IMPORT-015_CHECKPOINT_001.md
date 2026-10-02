# AUTO-IMPORT-015 Checkpoint 001

## 1. Overview

- **Ticket ID**: `AUTO-IMPORT-015`
- **Ticket Name**: DKCL daily session-expiry hardening (HUE/TCT) -- visible re-login, orphan-process recovery, state reset, real error codes
- **Status**: `PHASE A COMPLETED / IN PROGRESS`
- **Executor**: Antigravity
- **Date**: 2026-10-02
- **Manifest**: `docs/10_TICKETS/AUTO-IMPORT-015_MANIFEST.md`

---

## 2. Phase A Runtime Evidence on Windows

### a. Process Tree, PIDs, and Profile Directories

Live Windows runtime inspection was conducted via PowerShell WMI (`Win32_Process`) and verified:

1. **Backend Server**:
   - **PID**: `8132` (Parent PID: `27348`)
   - **Creation Date**: `10/01/2026 07:44:35`
   - **Command Line**: `"C:\Users\Admin\nodejs_portable_v22\node-v22.12.0-win-x64\node.exe" server.js`
   - **Listening Port**: `5050` (verified via `netstat -ano`)

2. **Chromium HUE Instance**:
   - **Root PID**: `30644` (PPID: `8132`, Creation Date: `10/02/2026 09:47:33`)
   - **Executable**: `C:\Users\Admin\AppData\Local\ms-playwright\chromium-1234\chrome-win64\chrome.exe`
   - **User Data Dir (Exact match)**: `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong\Data DKCL\BrowserProfiles\HUE`
   - **Descendant Processes (Process Tree)**:
     - `PID 15764`: `--type=crashpad-handler` (PPID: `30644`)
     - `PID 32504`: `--type=crashpad-handler` (PPID: `15764`)
     - `PID 21524`: `--type=gpu-process` (PPID: `30644`)
     - `PID 25868`: `--type=utility --utility-sub-type=network.mojom.NetworkService` (PPID: `30644`)
     - `PID 19676`: `--type=utility --utility-sub-type=storage.mojom.StorageService` (PPID: `30644`)
     - `PID 33788`: `--type=renderer` (PPID: `30644`)
     - `PID 16684`: `--type=renderer` (PPID: `30644`)

3. **Chromium TCT Instance**:
   - **Root PID**: `6004` (PPID: `8132`, Creation Date: `10/02/2026 09:50:18`)
   - **Executable**: `C:\Users\Admin\AppData\Local\ms-playwright\chromium-1234\chrome-win64\chrome.exe`
   - **User Data Dir (Exact match)**: `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong\Data DKCL\BrowserProfiles\TCT`
   - **Descendant Processes (Process Tree)**:
     - `PID 25184`: `--type=crashpad-handler` (PPID: `6004`)
     - `PID 32188`: `--type=gpu-process` (PPID: `6004`)
     - `PID 33156`: `--type=utility --utility-sub-type=network.mojom.NetworkService` (PPID: `6004`)
     - `PID 21632`: `--type=utility --utility-sub-type=storage.mojom.StorageService` (PPID: `6004`)
     - `PID 30528`: `--type=renderer` (PPID: `6004`)
     - `PID 33112`: `--type=renderer` (PPID: `6004`)

4. **Window Visibility State**:
   - Both HUE (PID `30644`) and TCT (PID `6004`) have `MainWindowHandle = 0` as reported by OS process queries.
   - Windows were hidden via `nativeWindowManager.js` calling Win32 `ShowWindow(hwnd, SW_HIDE)` (value 0) upon transition to `F13_READY`.
   - When hidden, `IsWindowVisible` returns `false` and the window is invisible to the operator.
   - When the session expired overnight and the automated sync triggered, `stopForSecurityChallenge()` redirected to `https://dkcl.vnpost.vn/sso/login` and called `waitForManualAuthentication()` for 240 seconds while remaining in this hidden window state (`SW_HIDE`), leaving the operator unable to see or interact with the login form.

---

### b. Reproduction of `taskkill` Failure and Swallowed Errors

1. **Reproduction Details**:
   - Executed `taskkill.exe /pid 999999 /t /f` directly and via Node.js `child_process.execFileAsync('taskkill.exe', ['/pid', '999999', '/t', '/f'])`.
   - **Actual Exit Code**: `128` (`ERROR_MOD_NOT_FOUND` / Process not found).
   - **Actual Stderr**: `"ERROR: The process \"999999\" not found.\r\n"`.
   - **Actual Stdout**: `""`.

2. **Root Cause Analysis in Code**:
   - In `backend/src/services/browserProcessManager.js` (lines 538-548):
     ```javascript
     async terminateProcessTree(pid) {
         try {
             if (process.platform === 'win32') {
                 await this.runCommand('taskkill.exe', ['/pid', String(pid), '/t', '/f']);
             } else {
                 await this.runCommand('kill', ['-9', String(pid)]);
             }
             await new Promise(res => setTimeout(res, 2000));
         } catch (err) {
             throw new Error('ORPHAN_PROCESS_RECOVERY_FAILED');
         }
     }
     ```
     `err` (containing `err.code = 128` and `err.stderr`) was completely swallowed and replaced by a bare `new Error('ORPHAN_PROCESS_RECOVERY_FAILED')` with NO error code (`error.code` remained undefined).

   - In `backend/src/controllers/dkclSharedOperationsController.js` (lines 45-55):
     ```javascript
     } catch (error) {
         console.error('[interactiveAuthenticate] Error details:', error);
         const isKnown = error.code && error.code !== 'Error';
         return res.status(400).json({
             success: false,
             error: {
                 code: error.code || 'INTERACTIVE_AUTH_REJECTED',
                 message: isKnown ? error.message : 'Yêu cầu đăng nhập tương tác thất bại. Vui lòng kiểm tra lại trình duyệt và nhật ký hệ thống.'
             }
         });
     }
     ```
     Because `error.code` was undefined, `isKnown` evaluated to `false`. The controller wiped out the error message and returned the generic message `'Yêu cầu đăng nhập tương tác thất bại. Vui lòng kiểm tra lại trình duyệt và nhật ký hệ thống.'` with generic code `'INTERACTIVE_AUTH_REJECTED'`.

   - In `backend/src/services/dkclSessionPreflightService.js` (lines 650-689 vs 727-875):
     ```javascript
     entry.openingPromise = this.withSourceLock(sourceConfig.source, async () => {
         const profileDir = resolveProfileDir(sourceConfig);
         transitionLifecycle(entry, DKCL_LIFECYCLE_STATES.OPENING_BROWSER, {
             lastError: null,
             pendingSourcePageWait: false,
             profileDir
         });
         processManager.clearHiddenHwnds?.(profileDir);

         // R4.1A Automatic Reconciliation
         const classification = await this._classifyLockState(sourceConfig, entry, profileDir);
         ...
         if (classification.lockState === 'UNKNOWN' || classification.lockState === 'LIVE_UNVERIFIED') {
             if (!this.coordinatorEnabled && classification.lockState === 'LIVE_UNVERIFIED' && !entry.client) {
                 await this.reclaimOrphanedProfile(classification, profileDir);
             } ...
         }
         ...
         const client = this.interactiveClientFactory(sourceConfig);
         try {
             this.transitionEntry(sourceConfig.source, entry, DKCL_LIFECYCLE_STATES.OPENING_BROWSER, ...);
     ```
     The `try { ... } catch (error) { ... } finally { entry.openingPromise = null; }` block was placed starting at line 727, **AFTER** the call to `this.reclaimOrphanedProfile(...)`.
     When `reclaimOrphanedProfile` threw `ORPHAN_PROCESS_RECOVERY_FAILED` at line 683:
     - The exception escaped without entering the recovery `catch` block.
     - `entry.state` remained stuck in `OPENING_BROWSER` permanently.
     - `entry.openingPromise` remained stuck with the rejected promise.
     - All subsequent requests to preflight saw `OPENING_BROWSER` and reported `"Đang mở đăng nhập DKCL Huế."` indefinitely.

---

## 3. Transition to Phase B

Phase A evidence collection is complete and verified against live Windows runtime.

---

## 4. Phase B Implementation Record

1. **Pre-flight Active Revalidation & Immediate WAITING_AUTH**:
   - `backend/src/services/dkclHueF13PortalClient.js`: Added `revalidateSession()` which navigates to F1.3 report and verifies session. In `stopForSecurityChallenge()`, added guard: never waits 240s when `windowHidden === true` or `interactiveMode === false`; throws `AUTHENTICATION_REQUIRED` immediately.
   - `backend/src/services/dkclSessionPreflightService.js`: In `probeAndMaybeExpireClient()`, added day-rollover check (`entry.lastValidatedDate !== today`) and idle check (`Date.now() - entry.lastValidatedAt > idleRevalidateMs`). If active revalidation detects session expiry, client is closed and entry transitions to `SESSION_EXPIRED`.
   - `backend/src/services/autoBackfillF13Executors.js` and queue pipeline: `validateSession()` receives `AUTHENTICATION_REQUIRED`, causing queue to record `WAITING_AUTH` and immediately release `GLOBAL_DKCL` lease without holding or stalling.

2. **Visible Interactive Login & User Guidance**:
   - In `dkclHueF13PortalClient.js`: `restoreWindow()` ensures window is shown via native SW_RESTORE.
   - In `dkclSessionPreflightService.js`: `interactiveAuthenticate` sets `client.interactiveMode = true`, calls `showBrowserWindowsByProfile` and `restoreWindow()`, and ensures `windowHidden: false`.
   - In `AutoBackfillOperatorPanel.jsx` & `DataImportCenter.jsx`: Displays explicit operator instruction banner: *"Trình duyệt đã được mở và hiển thị lên màn hình. Vui lòng thao tác đăng nhập DKCL trong cửa sổ trình duyệt. Hệ thống sẽ tự động nhận diện và tiếp tục chạy."*

3. **Robust Orphan Reclaim & State Reset**:
   - In `backend/src/services/browserProcessManager.js`: Added `isProcessDead(pid)` via `process.kill(pid, 0)` checking `ESRCH`. In `terminateProcessTree(pid)`, exit code 128 or process not found or already dead is treated as success. Real unexpected errors preserve exact stderr and throw `ORPHAN_PROCESS_RECOVERY_FAILED`.
   - In `backend/src/services/dkclSessionPreflightService.js`: Wrapped entire opening sequence inside `withSourceLock` in `try / catch / finally`. Any failure during reclaim or initialization transitions `entry` to `SESSION_EXPIRED`, stores `lastError: error.message`, and clears `entry.openingPromise = null` in `finally`. State can NEVER remain stuck in `OPENING_BROWSER`.

4. **Real Error Code & Message Propagation**:
   - `backend/src/controllers/dkclSharedOperationsController.js`: In `preflight` and `interactiveAuthenticate`, preserves `error.code || error.name` and `error.message`. Generic Vietnamese strings only serve as fallback when message is absent.
   - Frontend error banners format errors with `[code]` prefix and real message.

5. **Day-Rollover Active Verification**:
   - Covered in item 1. Active revalidation strictly respects `entry.activeOperation` — never kills or expires a browser owned by an active operation.

---

## 5. Technical Validation Ledger

1. `node --experimental-sqlite --test backend/src/services/autoImport015.test.js`:
   - 7/7 tests PASS (100%):
     - `stopForSecurityChallenge` never waits in background or hidden window.
     - `terminateProcessTree` handles code 128 / not found / dead process as success.
     - `reclaimOrphanedProfile` handles dead processes gracefully.
     - `interactiveAuthenticate` does not get stuck in `OPENING_BROWSER` on error.
     - `dkclSharedOperationsController` preserves real error codes and messages.
     - Day-rollover triggers active revalidation and expires session when SSO expired.
     - Day-rollover does not expire session if actively owned by an operation.
2. Existing regression suites:
   - `node backend/test_browserProfileLock.js`: 12/12 PASS.
   - `node backend/test_autoBackfillSafety.js`: 11/11 PASS.
   - `node backend/test_autoBackfillF13Executors.js`: 19/19 PASS.
   - `node backend/test_autoBackfillQueueService.js`: 45/45 PASS.
   - `node frontend/src/components/AutoBackfillOperatorPanel.test.js`: 24/24 PASS.
   - `node frontend/src/pages/dataImportHueSelection.test.js`: PASS.
   - `node frontend/src/pages/dataImportTctScan.test.js`: PASS.

