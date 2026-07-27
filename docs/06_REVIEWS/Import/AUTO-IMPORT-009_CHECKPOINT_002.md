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

### 4. Bounded Reactivation Fix

**Root cause confirmed**: The TCT import finalization path treated `TCT_WINDOW_HIDE_FAILED` as a hard import failure after database import, `34/34` ranked-unit parsing, processed-workbook retention, and portal cleanup had already completed. The catch-path also forced `temp_file_deleted` to `false`, which could overwrite true portal-cleanup evidence merely because the later window-hide operation failed.

**Fix applied** in `tctF13BackfillService.js`:
1. Completed TCT data operations now return `SUCCESS` when import, processed retention, and portal cleanup have succeeded, even if final window hiding cannot be confirmed.
2. Window-hide failure is recorded separately in evidence as `operational_warning_code = TCT_WINDOW_HIDE_FAILED`, `operational_warning_message`, and `window_hidden = false`.
3. Actual `portal_cleanup_status` and `temp_file_deleted = true` are preserved after hide failure.
4. Queue retry for a `SUCCESS` item with `TCT_WINDOW_HIDE_FAILED` performs hide-only retry through the active TCT client and does not start a new import queue or re-import data.
5. Successful hide-only retry clears the warning and records `window_hidden = true`.

### 5. LEVEL 1 Targeted Validation

- `node backend\test_tctF13BackfillService.js`: `PASS`

Targeted assertions added:
- hide failure after completed TCT import preserves `34/34`, database import, Processed-file retention, portal cleanup status, and `temp_file_deleted = true`.
- hide failure is recorded as operational warning evidence, not as failed import evidence.
- retry after hide warning invokes only the window-hide operation and does not call the import path again.

## Current Handoff

- Current ticket: `AUTO-IMPORT-009`.
- Current phase: `Bounded TCT window-hide data-finalization remediation`.
- Current manifest: `docs/10_TICKETS/AUTO-IMPORT-009_MANIFEST.md`.
- Current checkpoint: `docs/06_REVIEWS/Import/AUTO-IMPORT-009_CHECKPOINT_002.md`.
- Next action: Product Owner technical/product check for the bounded TCT warning behavior. Do not award PO PASS from Codex.

## Priority Deferral

- `AUTO-IMPORT-009` resulting status is `READY FOR PO CHECK` for the bounded TCT remediation only.
- Defect 2 is not Product Owner `PO PASS`.
- TCT window-hide remediation is technically complete for the data-finalization warning behavior, pending Product Owner check.
- No database, Import data, physical files, or Dashboard files were modified by this remediation.
- `AUTO-IMPORT-008` and earlier tickets remain closed.
- HUE `2026-07-18` and HUE `2026-07-19` remain locked `PO PASS`.
- HUE `2026-07-23` remains `MISSING / NOT AUTHORIZED`.
