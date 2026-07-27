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

### 4. Bounded TCT browser/session lifecycle & retry finalization remediation

**Root cause confirmed**:
1. **Disconnected/Closed Page context**: When a TCT page/context became disconnected or was closed by the browser/system, the backfill worker reused the stale registered client instance, leading to Playwright errors like `page.waitForEvent: Target page, context or browser has been closed`.
2. **Duplicate Exports on Retry**: The retry worker blindly clicked filter/submit buttons and requested new exports even if the TCT export was already generated and visible in the portal's "Quản lý tệp" page.
3. **Hide failure contract**: The previous implementation recorded hide failure only as a warning, allowing `SUCCESS` to be published despite the window remaining visible. Furthermore, when hide threw an error, it erroneously reset `temp_file_deleted` to `false` in the catch-block.

**Fixes applied** in `tctF13BackfillService.js`:
1. **Stale/Closed Client Check**: Added check for closed or disconnected client page/context. If the client is stale, it is invalidated in the preflight registry and a fresh client is initiated, ensuring `AUTHENTICATION_REQUIRED` is cleanly returned when manual login is needed.
2. **Avoid Duplicate Exports**: Before starting the export/filter sequence, the client checks the portal's files list (`/files`). If a file matching the target F1.3 report was generated recently (within the last 15 minutes), the export generation steps are safely skipped and the existing file is downloaded.
3. **Hard Finalization Hide Failure**: Enforced that `SUCCESS` requires the window to be confirmed hidden. Hide failure now throws a hard `TCT_WINDOW_HIDE_FAILED` error, resulting in a `FAILED` queue item status.
4. **Preserved Cleanup Evidence**: Fixed the catch-block so that the already computed `temp_file_deleted` status is preserved and not overwritten.

### 5. LEVEL 1 Targeted Validation

- `node backend\test_tctF13BackfillService.js`: `PASS`
- `node scratch/test_cleanup_safety.js`: `PASS`

Targeted assertions validated:
- cleanup success + hide success -> `SUCCESS`
- cleanup failure -> `FAILED` (`TCT_CLEANUP_FAILED`)
- cleanup success + hide throws -> `FAILED` (`TCT_WINDOW_HIDE_FAILED`)
- cleanup success + window remains visible -> `FAILED` (`TCT_WINDOW_HIDE_FAILED`)
- queue evidence records cleanup and hide results accurately.

## Current Handoff

- Current ticket: `AUTO-IMPORT-009`.
- Current phase: `TCT browser lifecycle & retry finalization remediation`.
- Current manifest: `docs/10_TICKETS/AUTO-IMPORT-009_MANIFEST.md`.
- Current checkpoint: `docs/06_REVIEWS/Import/AUTO-IMPORT-009_CHECKPOINT_002.md`.
- Next action: Product Owner check for TCT browser lifecycle, retry, and hard hide-failure finalization status. Do not award PO PASS from Codex.

## Priority Deferral

- `AUTO-IMPORT-009` resulting status is `READY FOR PO CHECK` for the bounded TCT remediation only.
- Defect 2 is not Product Owner `PO PASS`.
- TCT window-hide remediation is technically complete for the data-finalization warning behavior, pending Product Owner check.
- No database, Import data, physical files, or Dashboard files were modified by this remediation.
- `AUTO-IMPORT-008` and earlier tickets remain closed.
- HUE `2026-07-18` and HUE `2026-07-19` remain locked `PO PASS`.
- HUE `2026-07-23` remains `MISSING / NOT AUTHORIZED`.
