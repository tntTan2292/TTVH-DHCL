# AUTO-IMPORT-009 CHECKPOINT 002

## Phase

- Ticket: `AUTO-IMPORT-009`
- Ticket name: `Auto Import Browser And DKCL Cleanup Remediation`
- Phase: `BOUNDED TCT WINDOW-HIDE DATA-FINALIZATION REMEDIATION`
- Current state: `READY FOR PO CHECK`
- Technical status: `TECHNICAL PASS`
- Runtime status: `TARGETED TECHNICAL PASS; PO CHECK REQUIRED`
- PO product status: `DEFECT 1 PO PASS; DEFECT 2 NOT PO PASS; TCT WINDOW-HIDE REMEDIATION READY FOR PO CHECK`

## Closure Preservation

- `AUTO-IMPORT-007` remains closed.
- `AUTO-IMPORT-008` is closed.
- HUE `2026-07-18` and `2026-07-19` remain locked `PO PASS`.
- HUE `2026-07-23` remains `MISSING / NOT AUTHORIZED`.

## Ordered Defect Register

| Order | PO-confirmed defect | Status | Authorization |
| --- | --- | --- | --- |
| 1 | HUE/TCT browser windows may fail to hide after a new login or re-authentication cycle. | `COMPLETED` | `PO PASS` |
| 2 | After a DKCL download is safely completed, the downloaded-item link/file entry on DKCL is not removed as required. | `DEFERRED / NOT RESOLVED` | `NOT PO PASS` |

## Reactivated Item

Product Owner temporarily paused `DA-IMPL-008` and reactivated `AUTO-IMPORT-009` for one bounded TCT defect on `2026-07-27`.

Exact reactivated item: `TCT_WINDOW_HIDE_FAILED` must not mark an otherwise completed TCT import as `FAILED` after database import, `34/34` ranked units, portal cleanup, and local Processed-file retention already succeeded.

Preserved pass evidence: import, portal cleanup, WEB cleanup status, and local Processed retention pass.

`AUTO-IMPORT-009` Defect 2 is not `PO PASS`.

Required retry behavior: retry window hiding only; never re-import already completed TCT data for this operational warning.

## Implementation & Validation Evidence

### Technical Fix
1. In `dkclHueF13SyncService.js` (HUE Sync Service), shifted the call to `cleanupPortalExport` to run *only after* `verifyImport` successfully completes. This ensures that any download failure, zip validation failure, row-count mismatch, or database import error will skip file deletion on the portal, preserving the file on DKCL for operator recovery.
2. In `tctF13BackfillService.js` (TCT Backfill Service), verified that `cleanupPortalGeneratedFile` is already called after database insertion and local file retention checks.
3. In `dkclHueF13PortalClient.js` (`deleteGeneratedFile`):
   - Returns `{ status: 'ALREADY_DELETED' }` gracefully if the row is not found, making cleanup retries idempotent.
   - Throws `CLEANUP_ROW_NOT_FOUND` if multiple matching rows are found, preventing cross-deletion.
4. In `tctF13BackfillService.js`, `dkclHueF13SyncService.js` and `dkclHueF13BackfillService.js`:
   - Mapped `temp_file_deleted` dynamically based on portal cleanup status (`SUCCESS`, `ALREADY_DELETED`, or `DELETED`).
   - Assured that failed or unexecuted cleanups show up as `false` ("Không") while successful or idempotent ones show up as `true` ("Có").
5. In `dkclHueF13PortalClient.js` (`openF13Report`):
   - Wait for either report filters (`select[name="TuyChonGR"]`) or login controls (`input[name="login"]`) to be attached, resolving the redirect race condition when sessions are expired.
   - Properly halts with `AUTHENTICATION_REQUIRED` if redirected to login, preventing `FILTER_NOT_FOUND`.
6. In `tctF13BackfillService.js` (`runOneDateImport`):
   - Hides the browser window after the import and portal cleanup attempts are executed.
   - Throws a `TCT_CLEANUP_FAILED` error if the portal cleanup fails or is skipped.
   - Earlier checkpoint behavior verified the boolean result returned by `hideWindowFn` and treated `TCT_WINDOW_HIDE_FAILED` as blocking `SUCCESS` finalization; this behavior is superseded by the bounded reactivation fix below when import, `34/34` ranked units, portal cleanup, and Processed-file retention have already succeeded.

### 1. Automated Preflight Checks
`node test_dkclSessionPreflightService.js`, `node test_browserProfileLock.js` and `node test_tctF13BackfillService.js` passed successfully.

### 2. Safety Contract Verification Tests
Executed safety verification tests:
- `node scratch/test_cleanup_safety.js` (Checks deferred cleanup, idempotency, cleanup failure throws, and strict window hide validation): **PASSED**
- `node scratch/test_redirect_race.js` (Checks redirect race resolution and AUTHENTICATION_REQUIRED on expired sessions): **PASSED**

### 3. Re-authentication Lifecycle Remediation (Final Defect 2 Fix)

**Root cause confirmed**: After re-authentication, the `globalRegistry` interactive client has a fresh browser/PID/HWND but the `browserProcessManager.hiddenHwndsByProfile` HWND cache still contains entries from the **previous session** that was restored to the screen for operator interaction. When finalization called `hideWindowFn`, `processManager` saw `alreadyHasRecord = true` (from stale cache), treated the hide as successful without targeting any live window — so the visible window was never hidden.

Additionally, a **silent early hide** at the readiness check point (`await hideWindow?.call(client).catch(() => {})`) was writing stale HWNDs into the cache before export even started, masking the problem.

**Fix applied** in `tctF13BackfillService.js` (`runOneDateImport`):
1. Removed the pre-export silent-swallow hide at the F13-readiness checkpoint.
2. Before the finalization hide, explicitly call `processManager.clearHiddenHwnds(client.profileDir)` to flush any stale HWND records so the subsequent `hideWindow()` performs a fresh live scan of currently owned windows in the active PID tree.

### 4. TCT Browser Lifecycle, Safe Reuse & Warning Finalization Remediation

**Root cause analysis & fixes**:
1. **Browser/Session Disconnection**: When page/context was closed or disconnected, we now detect it via `client.page.isClosed()`, invalidate the stale preflight registry entry, and cleanly recover or throw `AUTHENTICATION_REQUIRED`.
2. **Safe TCT Tệp Tạm Reuse**: Reusing an existing file is now strictly constrained. The system checks the files list `/files` for files generated within the last 15 minutes, but strictly validates they contain the targeted `measurementDate` in a deterministic format (`YYYYMMDD`, `YYYY.MM.DD`, `DDMMYYYY`, or `DD.MM.YYYY`). Ambiguous files or wrong business dates are never reused, falling back safely to the governed generation path.
3. **Restored Warning Finalization Contract**: As approved in the repository authority chain, when data import and portal cleanup succeed but only the final window hiding fails, the system returns `SUCCESS` with an operational warning (`operational_warning_code: 'TCT_WINDOW_HIDE_FAILED'`, `window_hidden: false`). This prevents blocking success finalization for data operations.
4. **Preserved Cleanup Evidence**: The catch block preserves the computed `temp_file_deleted` status instead of blindly resetting it to `false`.
5. **Hide-only Retry**: A hide-only Retry performs zero export/download/import operations, safely targeting only the window visibility.

### 5. LEVEL 1 Targeted Validation

- `node backend\test_tctF13BackfillService.js`: `PASS`
- `node scratch/test_cleanup_safety.js`: `PASS`
- `node scratch/test_tct_remediation.js` (Targeted suite): `PASS`

Targeted assertions validated:
- Stale client detected -> registry invalidated -> `AUTHENTICATION_REQUIRED` cleanly returned.
- Exact date match reused -> new export skipped.
- Ambiguous/wrong date files -> new export safely generated.
- Hide-only retry -> zero export/download/import calls executed.
- completed import + hide failure -> `SUCCESS` with `TCT_WINDOW_HIDE_FAILED` warning.
- portal cleanup status is accurately preserved.

## Current Handoff

- Current ticket: `AUTO-IMPORT-009`.
- Current phase: `TCT browser lifecycle, safe reuse, and warning finalization remediation`.
- Current manifest: `docs/10_TICKETS/AUTO-IMPORT-009_MANIFEST.md`.
- Current checkpoint: `docs/06_REVIEWS/Import/AUTO-IMPORT-009_CHECKPOINT_002.md`.
- Next action: Product Owner check for TCT browser lifecycle, safe reuse, and warning finalization status. Do not award PO PASS from Codex.

## Priority Deferral

- `AUTO-IMPORT-009` resulting status is `READY FOR PO CHECK`.
- Defect 2 is not Product Owner `PO PASS` yet.
- TCT window-hide remediation is technically complete, pending Product Owner check.
- HUE `2026-07-18` and HUE `2026-07-19` remain locked `PO PASS`.
- HUE `2026-07-23` remains `MISSING / NOT AUTHORIZED`.
