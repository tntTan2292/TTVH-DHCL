# AUTO-IMPORT-009 CHECKPOINT 002

## Phase

- Ticket: `AUTO-IMPORT-009`
- Ticket name: `Auto Import Browser And DKCL Cleanup Remediation`
- Phase: `DEFECT 2 - DKCL DOWNLOADED-ITEM LINK/FILE ENTRY REMOVAL AFTER SAFE CLAIM`
- Current state: `ACTIVE / DEFECT 2 AUTHORIZED`
- Technical status: `TECHNICAL PASS`
- Runtime status: `PASS`
- PO product status: `DEFECT 1 PO PASS; DEFECT 2 READY FOR PO CHECK`

## Closure Preservation

- `AUTO-IMPORT-007` remains closed.
- `AUTO-IMPORT-008` is closed.
- HUE `2026-07-18` and `2026-07-19` remain locked `PO PASS`.
- HUE `2026-07-23` remains `MISSING / NOT AUTHORIZED`.

## Ordered Defect Register

| Order | PO-confirmed defect | Status | Authorization |
| --- | --- | --- | --- |
| 1 | HUE/TCT browser windows may fail to hide after a new login or re-authentication cycle. | `COMPLETED` | `PO PASS` |
| 2 | After a DKCL download is safely completed, the downloaded-item link/file entry on DKCL is not removed as required. | `READY FOR PO` | `AUTHORIZED` |

## Current Authorized Defect

Defect 2 implementation is completed.

Handling goal: remove the corresponding downloaded item/link entry from DKCL only after the local file has been successfully verified and claimed by the import workflow.

Primary executor: `Antigravity`.

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
   - Verifies the boolean result returned by `hideWindowFn` and throws `TCT_WINDOW_HIDE_FAILED` if the hide operation fails, is missing, or throws, preventing `SUCCESS` finalization when browser is still visible.

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

## Current Handoff

- Current ticket: `AUTO-IMPORT-009`.
- Current phase: `DEFECT 2 - DKCL DOWNLOADED-ITEM LINK/FILE ENTRY REMOVAL AFTER SAFE CLAIM`.
- Current manifest: `docs/10_TICKETS/AUTO-IMPORT-009_MANIFEST.md`.
- Current checkpoint: `docs/06_REVIEWS/Import/AUTO-IMPORT-009_CHECKPOINT_002.md`.
- Next action: WAITING FOR PRODUCT OWNER REVIEW (Defect 2 Final PO PASS / Ticket Closure).

