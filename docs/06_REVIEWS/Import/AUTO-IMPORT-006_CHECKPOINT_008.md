# AUTO-IMPORT-006 CHECKPOINT 008

## Phase

- Ticket: `AUTO-IMPORT-006`
- Phase: `REMEDIATION-005B / AWAITING REVIEW`
- Baseline: `52d25e5310550631a8211aead577442994687787`
- Runtime port: `5178`
- Product status: `NOT READY`
- PO runtime validation: `PENDING`

## Chief Architect Delta

- R5A commit `52d25e5310550631a8211aead577442994687787` was `REVIEW FAIL`.
- Failure reason: R5A treated CDP `Browser.getWindowForTarget().windowId` as a native Windows `HWND`.
- R5B removes the CDP-windowId-as-HWND path.
- R5B replaces PowerShell-native window enumeration with direct Win32 calls through the minimal prebuilt Node FFI dependency `koffi`.

## Native Window Contract

Authority chain remains:

`exact --user-data-dir` -> `owned PID tree` -> `owned HWND`

Allowed native calls are limited to:

- `EnumWindows`
- `GetWindowThreadProcessId`
- `IsWindowVisible`
- `ShowWindow`

R5B does not:

- use CDP `windowId` as HWND;
- match windows by title;
- switch to minimize/headless/restart behavior;
- change HUE/TCT import formulas, KPI logic, profile lock classification, `LOGIN_IN_PROGRESS`, or single-instance behavior.

## Implementation Notes

- `browserProcessManager` discovers actual browser processes by exact `--user-data-dir`, preserving executable name/path for Playwright Chromium.
- The native window manager enumerates top-level windows and keeps only HWNDs owned by the exact profile PID tree.
- Hide success is based on post-state `IsWindowVisible(hwnd) == false`, not the `ShowWindow` return value.
- Hidden utility HWNDs do not count as hide success.
- Restore re-shows only HWNDs that the manager previously hid for that profile, avoiding broad utility-window restore.
- `hideWindow()` uses profile-owned native HWND discovery only.
- `restoreWindow()` uses profile-owned native HWND restore, then may use CDP `Browser.setWindowBounds` only for normal window state.

## Controlled Smoke Evidence

Non-portal headed Chromium smoke:

- Browser executable: `C:\Users\Admin\AppData\Local\ms-playwright\chromium-1228\chrome-win64\chrome.exe`
- Exact profile process discovery: `SUCCESS`
- Owned HWND discovery: `matchedWindowCount = 13`
- Hide transition: `affectedWindowCount = 1`
- Hidden HWND post-state: `wasVisible = true`, `isVisible = false`
- Browser/page after hide: usable; page title still readable through Playwright
- Process after hide: profile-owned browser processes remained alive
- Restore transition: `matchedWindowCount = 1`, `affectedWindowCount = 1`
- Restored HWND post-state: `wasVisible = false`, `isVisible = true`
- Portal login: not performed
- PO runtime validation: not performed

## Validation

- `node test_browserProfileLock.js`: `PASS`
- `node test_dkclSessionPreflightService.js`: `PASS`
- `node test_tctF13BackfillService.js`: `PASS`
- `node src/pages/dataImportTctScan.test.js`: `PASS`
- `npm run build`: `PASS`
- `npm run lint`: `PASS` with pre-existing warnings only

## PO Recheck Status

The ticket cannot be completed without explicit PO PASS.

Current status remains:

- Current State: `ACTIVE / AWAITING REVIEW`
- Technical Status: `PASS`
- Runtime Status: `AWAITING CHIEF ARCHITECT REVIEW / PO RECHECK`
- PO UI Check Required: `Yes`
- PO Product Status: `NOT READY`
