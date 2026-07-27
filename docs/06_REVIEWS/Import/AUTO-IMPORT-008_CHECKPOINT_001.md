# AUTO-IMPORT-008 CHECKPOINT 001

## Phase

- Ticket: `AUTO-IMPORT-008`
- Ticket name: `Auto Import PO Defect Remediation`
- Phase: `DEFECT 3 - HISTORICAL IMPORT HISTORY ROW-COUNT CORRECTION AND RELIABLE HUE SOURCE RECOVERY`
- Current state: `ACTIVE / DEFECT 3 AUTHORIZED`
- Technical status: `DEFECT 3 NOT STARTED`
- Runtime status: `N/A - DEFECT 3 DOCUMENTED ACTIVATION ONLY`
- PO product status: `DEFECT 1 PO PASS; DEFECT 2 PO PASS; DEFECT 3 AUTHORIZED FOR IMPLEMENTATION`
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
| 3 | Historical Import History row counts are incorrect; many old records show fewer than `34` rows while newer corrected imports count correctly. Reliable HUE source recovery is required where source evidence is authoritative. | `ACTIVE` | `AUTHORIZED FOR IMPLEMENTATION` |

## Current Authorized Defect

Defect 3 only is authorized.

Handling goal: correct historical Import History row-count evidence and recover reliable HUE source identification only where authoritative evidence supports it, while preserving accepted Import behavior, physical files, locked data, and all closed ticket states.

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

## Current Handoff

- Current ticket: `AUTO-IMPORT-008`.
- Current phase: `DEFECT 3 - HISTORICAL IMPORT HISTORY ROW-COUNT CORRECTION AND RELIABLE HUE SOURCE RECOVERY`.
- Current manifest: `docs/10_TICKETS/AUTO-IMPORT-008_MANIFEST.md`.
- Current checkpoint: `docs/06_REVIEWS/Import/AUTO-IMPORT-008_CHECKPOINT_001.md`.
- Next action: IMPLEMENT DEFECT 3.
- Defect 1 final status: `COMPLETED / PO PASS`.
- Defect 2 final status: `COMPLETED / PO PASS`.
- Defect 3 activation status: `ACTIVE / AUTHORIZED`.
