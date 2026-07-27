# AUTO-IMPORT-008 CHECKPOINT 001

## Phase

- Ticket: `AUTO-IMPORT-008`
- Ticket name: `Auto Import PO Defect Remediation`
- Phase: `DEFECT 3 - HISTORICAL IMPORT HISTORY ROW-COUNT CORRECTION AND RELIABLE HUE SOURCE RECOVERY`
- Current state: `ACTIVE / DEFECT 3 READY FOR PO CHECK`
- Technical status: `DEFECT 3 COMPLETED / TECHNICAL PASS`
- Runtime status: `N/A - API/DB HISTORY VALIDATED`
- PO product status: `DEFECT 1 PO PASS; DEFECT 2 PO PASS; DEFECT 3 READY FOR PO CHECK`
- Authority: Product Owner decision on `2026-07-26` authorized a new bounded Auto Import remediation ticket after completed `AUTO-IMPORT-007`; Product Owner decision on `2026-07-27` accepted Defect 1 as `PO PASS` and activated Defect 2; Product Owner decision on `2026-07-27` accepted Defect 2 as `PO PASS` and activated Defect 3.

## Closure Preservation

- `AUTO-IMPORT-007` remains closed and must not be reopened or altered.
- HUE `2026-07-18` remains locked `PO PASS`.
- HUE `2026-07-19` remains locked `PO PASS`.
- HUE `2026-07-23` remains `MISSING / NOT AUTHORIZED`.
- Locked HUE `2026-07-23` recovery, reimport, replacement, investigation, database write, Import data edit, or Dashboard change remains not authorized by this activation.

## Ordered Defect Register

| Order | PO-confirmed defect | Status | Authorization |
| --- | --- | --- | --- |
| 1 | HUE and TCT login/browser windows are not hidden reliably. | `COMPLETED` | `PO PASS` |
| 2 | Import History does not clearly distinguish HUE imports from TCT imports. | `COMPLETED` | `PO PASS` |
| 3 | Historical Import History row counts are incorrect; many old records show fewer than `34` rows while newer corrected imports count correctly. Reliable HUE source recovery is required where source evidence is authoritative. | `TECHNICAL PASS / READY FOR PO CHECK` | `AWAITING PO CHECK` |

## Current Authorized Defect

Defect 3 implementation is technically complete and awaiting Product Owner check.

Handling result: historical Import History now recovers reliable HUE source presentation only where authoritative count evidence supports it, while preserving accepted Import behavior, physical files, locked data, and all closed ticket states.

Primary executor: `Codex`, because the active defect concerns Import History database/history evidence, API/service mapping, targeted data correction authority, and validation.

## Completed Defects

- Defect 1 is `COMPLETED / PO PASS`.
- Defect 2 is `COMPLETED / PO PASS`.

## Implementation & Validation Evidence

### Technical Fix
We refined the visibility success contract in `nativeWindowManager.js`:
- For hide: success requires `windows.length > 0 && windows.every(w => !w.isVisible)`.
- For show: success requires `windows.length > 0 && windows.every(w => w.isVisible)`.
- A window already in the requested state is recorded with `alreadyInTargetState = true` without calling `ShowWindow`.
- Zero windows found is treated as retryable/not-ready (not successful), preventing premature exit of the retry loop.

### 1. Automated Preflight Checks
`node test_dkclSessionPreflightService.js` and `node test_browserProfileLock.js` passed successfully.

### 2. 5-Cycle Hide/Show Verification (Smoke test)
`node smoke_test_hide.js` successfully ran 5/5 cycles for HUE and TCT tmp profiles.

### 3. Actual HUE/TCT Operational Profile Validation
Executed `node scratch/validate_real_profiles.js` to verify behavior using the actual operational directory paths:

#### HUE Profile Evidence
- **Actual profile path**: `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong\Data DKCL\BrowserProfiles\HUE`
- **PID tree**:
  - Root: `25884,75000,78640,40156,47460`
  - Descendants: `[25884,75000,78640,40156,47460]`
- **Detected HWNDs**: `[15798240,6099046]`
- **Manual interaction state**: Windows visible (`VISIBLE`)
- **Hide state (after F13_READY)**: Both HWNDs hidden successfully (`HIDDEN`), `Hide Success result: true`
- **Already hidden check**: Returns success `true`, flags: `[true,true]` (no redundant `ShowWindow` calls)
- **Restore behavior**: Both HWNDs become visible (`VISIBLE`), `Restore success result: true`

#### TCT Profile Evidence
- **Actual profile path**: `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong\Data DKCL\BrowserProfiles\TCT`
- **PID tree**:
  - Root: `65260,34852,97608,59956,71948,54544`
  - Descendants: `[65260,34852,97608,59956,71948,54544]`
- **Detected HWNDs**: `[54397962,44108764,28184220]`
- **Manual interaction state**: Windows visible (`VISIBLE`)
- **Hide state (after F13_READY)**: All HWNDs hidden successfully (`HIDDEN`), `Hide Success result: true`
- **Already hidden check**: Returns success `true`, flags: `[true,true,true]`

#### Source Isolation Proof
- HUE browser is hidden (HUE windows visible = `false`).
- Restoring TCT browser: TCT windows become visible (`true`) while HUE windows remain hidden (`false`).
- **SOURCE ISOLATION CONFIRMED**: `true`. HUE and TCT profiles, sessions, PID trees, and HWND ownership are completely isolated.

## Defect 2 Implementation & Validation Evidence

### Technical Fix
- Added an Import History presentation mapper that preserves legacy response fields and adds source, report type, business date, original filename, standardized filename, status, total rows, imported/success rows, error rows, skipped rows, and concise evidence message.
- Source identification uses linked `fact_f13.import_log_id` evidence for HUE, processed TCT artifact path evidence when available, or accepted successful `fact_f13_national` business-date evidence for TCT.
- Historical records without reliable source evidence return `UNKNOWN` / `CHUA XAC DINH`; filename text alone is not used to infer HUE/TCT.
- WEB Import History now displays Source, Report, filename evidence, status, row counts, and evidence message while preserving existing status/count readability and Dashboard reconciliation action.

### Scope Preservation
- No physical historical file was renamed, moved, replaced, deleted, rewritten, or migrated.
- No operational Import data, Dashboard data, row-count correction, or Defect 3 work was performed.
- Original filename and standardized filename are only populated from authoritative metadata/evidence already present in the response/evidence path; otherwise the WEB displays `UNKNOWN`.

### Targeted Validation
- `node backend/test_importHistoryPresenter.js` PASS: proves HUE and TCT remain distinguishable with identical filenames, unresolved source becomes `UNKNOWN`, and status/row-count fields remain stable.
- `node -c backend/src/controllers/importController.js` PASS.
- `node -c backend/src/services/importHistoryPresenter.js` PASS.
- Direct read-only controller call for Import History status PASS: response returned HTTP `200`, new source/report/filename/evidence fields, and legacy keys (`ten_file`, `ngay_so_lieu`, `so_luong_bg`, `so_bi_bo_qua`, `so_loi`, `trang_thai`) together.
- `npm.cmd run lint` PASS with existing warnings only.
- `npm.cmd run build` PASS with existing chunk-size warning only.
- `git diff --check` PASS.

## Defect 2 PO Acceptance And Defect 3 Activation

- Product Owner accepted Defect 2 as `COMPLETED / PO PASS`.
- Defect 3, historical Import History row-count correction and reliable HUE source recovery, is now `ACTIVE / AUTHORIZED`.
- This transition is documentation-only.
- No product code, tests, database, Import History records, physical files, operational Import data, or Dashboard files were modified by this transition.
- Defect 1 remains `COMPLETED / PO PASS`.
- Defect 2 remains `COMPLETED / PO PASS`.
- `AUTO-IMPORT-007` remains closed.
- HUE `2026-07-18` and HUE `2026-07-19` remain locked `PO PASS`.
- HUE `2026-07-23` remains `MISSING / NOT AUTHORIZED`.

## Defect 3 Implementation & Validation Evidence

### Technical Fix
- Extended Import History API history evidence with same-date `fact_f13` count and matching HUE import count.
- Updated Import History presentation so historical HUE rows are recovered as HUE only when the row's own `total_records` is greater than `34`, equals same-date `fact_f13` count, and exactly one same-date import log has that matching count.
- TCT `34`-row records with processed TCT evidence remain TCT, even when original filename and business date match a HUE record.
- Low-count records without deterministic HUE import evidence remain unchanged/UNKNOWN.
- Synthetic `2098` business-date records are treated as test/anomaly records; they are preserved and not guessed unless linked `fact_f13.import_log_id` evidence exists.

### Database Correction Finding
- Dry-run repair scan: `55` low-count Import History candidates, `0` authorized deterministic row-count writes, `55` preserved.
- Reason: linked HUE rows with low counts already matched their linked `fact_f13` rows; most `34`-row historical candidates share the same business date with multiple imports and therefore cannot be corrected from business-date totals without cross-contaminating HUE and TCT records.
- No `--apply` database repair was run.
- No `import_log`, `fact_f13`, `fact_f13_national`, Dashboard data, or physical files were modified.

### Targeted Before/After Evidence
- Same filename/date `F1.3-2026.07.20.xlsx`:
  - HUE record `id=565` presents source `HUE`, total rows `4372`, evidence `FACT_F13_IMPORT_LOG_LINK`.
  - TCT records `id=566` and `id=714` present source `TCT`, total rows `34`, evidence `PROCESSED_TCT_PATH`.
- Same filename/date `F1.3-2026.07.16.xlsx`:
  - TCT records `id=569` and `id=731` remain source `TCT`, total rows `34`.
- Synthetic `2098` examples:
  - `id=704` and `id=706` are HUE only because linked `fact_f13.import_log_id` evidence exists.
  - `id=705` and `id=709` remain `UNKNOWN`.

### Targeted Validation
- `node backend/test_importHistoryPresenter.js` PASS.
- `node backend/test_importHistoryDefect3Recovery.js` PASS.
- `node backend/repair_import_history_defect3.js` DRY_RUN PASS: `candidateCount=55`, `correctionCount=0`, `preservedCount=55`.
- `node -c backend/src/controllers/importController.js` PASS.
- `node -c backend/src/services/importHistoryPresenter.js` PASS.
- `node -c backend/src/services/importHistoryDefect3Recovery.js` PASS.
- `node -c backend/repair_import_history_defect3.js` PASS.
- Direct read-only Import History controller call PASS for representative HUE/TCT/2098 records.

## Current Handoff

- Current ticket: `AUTO-IMPORT-008`.
- Current phase: `DEFECT 3 - HISTORICAL IMPORT HISTORY ROW-COUNT CORRECTION AND RELIABLE HUE SOURCE RECOVERY`.
- Current manifest: `docs/10_TICKETS/AUTO-IMPORT-008_MANIFEST.md`.
- Current checkpoint: `docs/06_REVIEWS/Import/AUTO-IMPORT-008_CHECKPOINT_001.md`.
- Next action: PRODUCT OWNER CHECK for Defect 3.
- Defect 1 final status: `COMPLETED / PO PASS`.
- Defect 2 final status: `COMPLETED / PO PASS`.
- Defect 3 status: `TECHNICAL PASS / READY FOR PO CHECK`.
