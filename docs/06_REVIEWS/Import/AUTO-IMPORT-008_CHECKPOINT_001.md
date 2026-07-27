# AUTO-IMPORT-008 CHECKPOINT 001

## Phase

- Ticket: `AUTO-IMPORT-008`
- Ticket name: `Auto Import PO Defect Remediation`
- Phase: `DEFECT 2 - IMPORT HISTORY SOURCE IDENTIFICATION AND PRESENTATION`
- Current state: `ACTIVE / DEFECT 2 READY FOR PO CHECK`
- Technical status: `DEFECT 2 COMPLETED / TECHNICAL PASS`
- Runtime status: `N/A - API/UI BUILD VALIDATED`
- PO product status: `DEFECT 1 PO PASS; DEFECT 2 READY FOR PO CHECK`
- Authority: Product Owner decision on `2026-07-26` authorized a new bounded Auto Import remediation ticket after completed `AUTO-IMPORT-007`; Product Owner decision on `2026-07-27` accepted Defect 1 as `PO PASS` and activated Defect 2.

## Closure Preservation

- `AUTO-IMPORT-007` remains closed and must not be reopened or altered.
- HUE `2026-07-18` remains locked `PO PASS`.
- HUE `2026-07-19` remains locked `PO PASS`.
- HUE `2026-07-23` remains `MISSING / NOT AUTHORIZED`.
- No recovery, reimport, replacement, investigation, database write, Import data edit, or Dashboard change is authorized by this activation.

## Ordered Defect Register

| Order | PO-confirmed defect | Status | Authorization |
| --- | --- | --- | --- |
| 1 | HUE and TCT login/browser windows are not hidden reliably. | `COMPLETED` | `PO PASS` |
| 2 | Import History does not clearly distinguish HUE imports from TCT imports. | `TECHNICAL PASS / READY FOR PO CHECK` | `AWAITING PO CHECK` |
| 3 | Historical Import History row counts are incorrect; many old records show fewer than `34` rows while newer corrected imports count correctly. | `QUEUED` | `NOT AUTHORIZED` |

## Current Authorized Defect

Defect 2 implementation is technically complete and awaiting Product Owner WEB check.

Handling goal: make Import History clearly identify and present source, report, business date, filenames, status, row counts, and concise evidence/message while preserving accepted Import behavior, physical files, historical data, and all closed ticket states.

Primary executor: `Codex`, because the active defect concerned Import History contract/API/UI mapping and targeted validation.

## Queued Defects

- Defect 3 is recorded for later handling only and must not be investigated or implemented during Defect 2.
- Each defect requires separate Product Owner `PO PASS` before the next defect can activate.

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

## Current Handoff

- Current ticket: `AUTO-IMPORT-008`.
- Current phase: `DEFECT 2 - IMPORT HISTORY SOURCE IDENTIFICATION AND PRESENTATION`.
- Current manifest: `docs/10_TICKETS/AUTO-IMPORT-008_MANIFEST.md`.
- Current checkpoint: `docs/06_REVIEWS/Import/AUTO-IMPORT-008_CHECKPOINT_001.md`.
- Next action: PRODUCT OWNER WEB CHECK for Defect 2.
- Defect 1 final status: `COMPLETED / PO PASS`.
- Defect 2 status: `TECHNICAL PASS / READY FOR PO CHECK`.
- Defect 3 activation condition: Product Owner `PO PASS` for Defect 2.
