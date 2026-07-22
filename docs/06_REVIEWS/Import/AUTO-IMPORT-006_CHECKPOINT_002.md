# AUTO-IMPORT-006 Checkpoint 002: Unified DKCL Auth Recovery Implementation Report

- Ticket: `AUTO-IMPORT-006`
- Phase: `Auto Import / Smart Leadership Dashboard Implementation`
- Technical Status: `PASS`
- Runtime Status: `AWAITING PO CHECK`
- PO UI Check Required: `Yes`
- PO Product Status: `NOT READY`

---

## 1. HUE EXACT ROOT CAUSE & SOLUTION

- **File and Component**: `frontend/src/pages/DataImportCenter.jsx`
- **Function handling Click**: `handleStartBackfillQueue`
- **Endpoint called**: `POST /api/import/dkcl/hue/f13/backfill-queue`
- **Backend route**: `/dkcl/hue/f13/backfill-queue` in `backend/src/routes/importRoutes.js`
- **Controller/Handler**: `dkclHueF13SyncController.startBackfillQueue` in `backend/src/controllers/dkclHueF13SyncController.js`
- **Service**: `DkclHueF13BackfillService` in `backend/src/services/dkclHueF13BackfillService.js`
- **The Defect**: The signature of `DkclHueF13SyncService.start(measurementDate)` did not receive the options argument, thereby dropping the `requireExistingSession: true` parameter and invoking the normal headed browser login internally during background check.
- **The Solution**: 
  - Modified `DkclHueF13BackfillService.validateAuthenticationBeforeQueue` to call `this.sessionPreflightService.preflight('HUE')` and throw `AUTHENTICATION_REQUIRED` immediately if the session is not valid.
  - Forwarded options containing `requireExistingSession` down from `DkclHueF13SyncService.start` to `runWorkflow` and finally to `portalClient.authenticate`.

---

## 2. TCT EXACT ROOT CAUSE & RESOLUTION

- **The Defect**: `interactiveClientFactory` in `dkclSessionPreflightService.js` was defined as `() => new DkclHueF13PortalClient(...)` which dropped the `sourceConfig` parameter. This caused the client to fall back to the default HUE profile directory (`../Data DKCL/BrowserProfiles/HUE`), causing file lock contentions on `HUE.lock` and crashing Chromium before the headed window could become visible.
- **The Solution**: Corrected the factory signature to `(sourceConfig) => new DkclHueF13PortalClient({ ..., source: sourceConfig?.source })` to correctly isolate the profiles directory to `TCT`.

---

## 3. ROUTE REUSE & COMPATIBILITY
- Reused the existing generic endpoint `POST /api/import/dkcl/session/interactive-auth?source=<HUE|TCT>` for both sources. No new backend routes were added, maintaining full backward compatibility.

---

## 4. LIFECYCLE, REGISTRY & MINIMIZE

### 4.1 State Machine Registry Structure
A unified static Map (`globalRegistry`) stores entries keyed by source (`HUE` / `TCT`), containing:
- `state`: `NOT_AUTHENTICATED` | `OPENING_BROWSER` | `WAITING_FOR_LOGIN` | `AUTHENTICATED` | `BACKGROUND_READY` | `SESSION_EXPIRED` | `ERROR`
- `client`: Playwright context page handle
- `openingPromise`: In-flight auth promise (provides anti-duplicate clicking protection)
- `authenticated`: boolean flag
- `backgroundReady`: boolean flag
- `lastError`: string error message or null
- `updatedAt`: ISO timestamp

### 4.2 Temporary vs Persistent Client Lifecycle
- **Preflight (Headless check)**: Launches a temporary headless browser instance that checks the session status and immediately closes and releases locks.
- **Interactive Authentication (Headed login)**: Launches a persistent headed browser window. Once the session is authenticated, it is kept open and minimized for future queue work, instead of being closed. If the browser is closed manually, it immediately updates the registry status to `SESSION_EXPIRED`.

### 4.3 CDP Minimize Limitation
Uses CDP command `Browser.setWindowBounds` with `windowState: 'minimized'` to best-effort minimize the headed window. If minimization is rejected or unsupported, it logs a sanitized warning and falls back to keeping the window visible, preserving the authenticated session.

---

## 5. EXACT PRODUCTION & TEST FILES

### 5.1 Modified Production Files
- [dkclHueF13PortalClient.js](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong_worktree_da_impl_007/backend/src/services/dkclHueF13PortalClient.js): Save `source` property, hook close listener safely, and implement CDP minimize adapter.
- [dkclSessionPreflightService.js](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong_worktree_da_impl_007/backend/src/services/dkclSessionPreflightService.js): Implement global registry, atomic transitions, and fix interactive client factory parameter drop.
- [dkclHueF13SyncService.js](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong_worktree_da_impl_007/backend/src/services/dkclHueF13SyncService.js): Forward options to check for existing session instead of launching a headed browser during background run.
- [dkclHueF13BackfillService.js](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong_worktree_da_impl_007/backend/src/services/dkclHueF13BackfillService.js): Validate Hue preflight status before queue creation and throw `AUTHENTICATION_REQUIRED` on failure.
- [DataImportCenter.jsx](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong_worktree_da_impl_007/frontend/src/pages/DataImportCenter.jsx): Add Hue session state variables, check and display Hue preflight status, add `Mở đăng nhập Huế` trigger, disable update button if not authenticated, and clean up timers on unmount.

### 5.2 Modified Test Files
- [test_dkclHueF13BackfillService.js](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong_worktree_da_impl_007/backend/test_dkclHueF13BackfillService.js): Updated mock registry states to test authentication verification on queue creation.

---

## 6. TEST EVIDENCE & RESULTS

All tests were executed locally inside `backend` or `frontend` workspace directories:

### 6.1 Backend Session Preflight Tests
- **Command**: `node test_dkclSessionPreflightService.js`
- **Cwd**: `backend`
- **Exit Code**: `0`
- **Result**: `RESULT: dkclSessionPreflightService checks passed` (4 tests passed)

### 6.2 Hue Sync Service Tests
- **Command**: `node test_dkclHueF13SyncService.js`
- **Cwd**: `backend`
- **Exit Code**: `0`
- **Result**: `RESULT: 80 passed, 0 failed`

### 6.3 Hue Backfill Service Tests
- **Command**: `node test_dkclHueF13BackfillService.js`
- **Cwd**: `backend`
- **Exit Code**: `0`
- **Result**: `RESULT: 35 passed, 0 failed`

### 6.4 TCT Backfill Service Tests
- **Command**: `node test_tctF13BackfillService.js`
- **Cwd**: `backend`
- **Exit Code**: `0`
- **Result**: `RESULT: tctF13BackfillService checks passed`

### 6.5 E2E Integration Engine Tests
- **Command**: `node test_e2e_import_engine.js`
- **Cwd**: `backend`
- **Exit Code**: `0`
- **Result**: `RESULT: 62 passed, 0 failed`

### 6.6 Git Diff Check
- **Command**: `git diff --check`
- **Exit Code**: `0`
- **Result**: No whitespace or formatting errors detected.

### 6.7 Frontend Build & Lint Verification
- **Build Command**: `npm run build`
- **Lint Command**: `npm run lint`
- **Cwd**: `frontend`
- **Exit Code**: `0`
- **Result**: Compilation completed successfully, outputting optimized bundles. `oxlint` reported 0 errors.
- **Frontend Test Limitation**: No custom frontend testing package is configured for DataImportCenter; visual verification is deferred to runtime.

---

## 7. UNRESOLVED RUNTIME ITEMS & PO UI CHECKLIST

Since we are in a code-remediation-only phase, no credentials or live portal interactions were simulated during implementation. The Product Owner should perform visual/runtime confirmation on Port `5178`:
1. Verify the `Mở đăng nhập Huế` button is displayed in the Huế backfill section when not logged in.
2. Click `Mở đăng nhập Huế`, verify Playwright headed browser appears with the DKCL login form.
3. Log in successfully, verify the browser window automatically minimizes, and the dashboard transitions to ready.
4. Try to click `Update` before logging in, verify it is disabled and doesn't trigger background login.
5. Repeat for TCT and verify no lock contention occurs.
