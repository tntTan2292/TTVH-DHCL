# AUTO-IMPORT-006 CHECKPOINT 007 — REMEDIATION 005A NATIVE WINDOW HIDE

- Date: 2026-07-23
- Executor: Codex
- Current State: `ACTIVE / AWAITING REVIEW`
- Technical Status: `PASS`
- Runtime Status: `AWAITING CHIEF ARCHITECT REVIEW / PO RECHECK`
- PO UI Check Required: `Yes`
- PO Product Status: `NOT READY`
- Current Phase: `REMEDIATION-005A / AWAITING REVIEW`
- Baseline Remote HEAD: `3c043f29ada39418f1b7cd2750d2541ce089142d`
- Runtime Port for PO Recheck: `5178`

---

## 1. Correction

REMEDIATION-005 incorrectly treated browser minimize as the accepted Product Owner behavior.

Correct behavior:

`Visible during manual login → native browser window hidden after SESSION_VALID → browser process and persistent session continue running in background.`

The window must disappear from the screen and taskbar without closing the browser, killing the process, replacing the context, or losing the session.

---

## 2. Implementation

- Previous implementation location: `DkclHueF13PortalClient.minimizeWindow()`, backed by CDP `Browser.setWindowBounds` with `windowState: minimized`.
- New primary abstraction: `DkclHueF13PortalClient.hideWindow()`.
- Native mechanism: Windows `user32.dll` `ShowWindow(hwnd, SW_HIDE)` through a PowerShell-hosted native interop call.
- Ownership mapping:
  - browser profile is matched by exact `--user-data-dir`;
  - profile-owning browser root PIDs are expanded to their child process tree;
  - the native window handle from CDP `Browser.getWindowForTarget` is accepted only when `GetWindowThreadProcessId(hwnd)` belongs to that profile-owned process tree;
  - profile-wide native window enumeration is retained as a fallback and still filters by profile-owned PID tree.
- Registry state now uses `windowHidden` and `hideAttempted`.
- API evidence now uses `browser_hidden`.
- Hide failure keeps `SESSION_VALID`, does not close, restart, or kill the browser, and returns `browser_hidden:false`.

---

## 3. Preserved R5/R4 Contracts

- HUE authenticated state remains independent of the TCT F1.3 report-ready marker.
- TCT downloaded workbooks remain retained in `Data DKCL/F1.3/Processed/TCT`.
- Portal cleanup remains after processed persistence.
- `LOGIN_IN_PROGRESS` remains unchanged.
- Five-state browser-profile classification remains unchanged.
- `interactiveAuthenticate()` and `recover()` still use `_classifyLockState()`.
- `cleanupStaleLocks()` remains gated behind `STALE_CONFIRMED`.
- `terminateProcessTree()` is not called from `interactiveAuthenticate()` or `recover()`.

---

## 4. Verification

Automated verification:

- `node test_browserProfileLock.js` — PASS
- `node test_dkclSessionPreflightService.js` — PASS
- `node test_tctF13BackfillService.js` — PASS
- `node src/pages/dataImportTctScan.test.js` — PASS
- `npm run build` — PASS
- `npm run lint` — PASS with existing warnings
- `git diff --check` — PASS with CRLF normalization warnings only

Controlled local smoke:

- A non-portal headed Playwright browser was launched with a throwaway persistent profile.
- The client attempted native hide through the same `hideWindow()` abstraction.
- The current host denied the native hide operation, so `browser_hidden:false` behavior was exercised.
- Browser process remained running after the hide attempt.
- Browser context remained usable after the hide attempt.
- Page title was still readable through the existing client after the hide attempt.
- No DKCL portal, credentials, or PO login were used.

---

## 5. PO Runtime Recheck Checklist

Use `http://localhost:5178/import`.

### HUE
- Open login browser: PASS/FAIL
- Complete login manually: PASS/FAIL
- Browser disappears from screen: PASS/FAIL
- Browser no longer appears on taskbar: PASS/FAIL
- No flash/close/reopen loop: PASS/FAIL
- UI becomes `SESSION_VALID`: PASS/FAIL
- Re-Update still uses the background session: PASS/FAIL

### TCT
- Opens exactly one browser: PASS/FAIL
- No flash/close/reopen loop: PASS/FAIL
- Browser disappears from screen: PASS/FAIL
- Browser no longer appears on taskbar: PASS/FAIL
- UI becomes `SESSION_VALID`: PASS/FAIL
- Re-Update still uses the background session: PASS/FAIL
- Excel file is retained in `Processed/TCT`: PASS/FAIL
- Only the matching DKCL generated-file link/record is cleaned up: PASS/FAIL

---

## 6. Boundary

- No portal credentials were used.
- No real DKCL portal login was performed.
- No PO runtime validation was performed.
- Ticket remains open and cannot be completed without explicit PO PASS.
