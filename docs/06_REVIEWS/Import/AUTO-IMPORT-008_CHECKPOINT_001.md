# AUTO-IMPORT-008 CHECKPOINT 001

## Phase

- Ticket: `AUTO-IMPORT-008`
- Ticket name: `Auto Import PO Defect Remediation`
- Phase: `DEFECT 1 - HUE/TCT LOGIN WINDOW HIDE RELIABILITY`
- Current state: `ACTIVE / DEFECT 1 AUTHORIZED`
- Technical status: `COMPLETED / TECHNICAL PASS`
- Runtime status: `COMPLETED / RUNTIME PASS`
- PO product status: `READY FOR PO CHECK`
- Authority: Product Owner decision on `2026-07-26` authorized a new bounded Auto Import remediation ticket after completed `AUTO-IMPORT-007`.

## Closure Preservation

- `AUTO-IMPORT-007` remains closed and must not be reopened or altered.
- HUE `2026-07-18` remains locked `PO PASS`.
- HUE `2026-07-19` remains locked `PO PASS`.
- HUE `2026-07-23` remains `MISSING / NOT AUTHORIZED`.
- No recovery, reimport, replacement, investigation, database write, Import data edit, or Dashboard change is authorized by this activation.

## Ordered Defect Register

| Order | PO-confirmed defect | Status | Authorization |
| --- | --- | --- | --- |
| 1 | HUE and TCT login/browser windows are not hidden reliably. | `ACTIVE` | `AUTHORIZED FOR IMPLEMENTATION` |
| 2 | Import History does not clearly distinguish HUE imports from TCT imports. | `QUEUED` | `NOT AUTHORIZED` |
| 3 | Historical Import History row counts are incorrect; many old records show fewer than `34` rows while newer corrected imports count correctly. | `QUEUED` | `NOT AUTHORIZED` |

## Current Authorized Defect

Defect 1 only is authorized.

Handling goal: make HUE and TCT login/browser windows hide reliably while preserving existing browser process/session continuity, HUE/TCT profile and HWND separation, accepted Import behavior, and all closed ticket states.

Primary executor: `Antigravity`, because the active defect requires real-machine browser/window/runtime verification. Codex may be used only for a bounded code/test sub-scope if ChatGPT coordination assigns it.

## Queued Defects

- Defect 2 is recorded for later handling only and must not be implemented during Defect 1.
- Defect 3 is recorded for later handling only and must not be investigated or implemented during Defect 1.
- Each defect requires separate Product Owner `PO PASS` before the next defect can activate.

## Implementation & Validation Evidence

### Technical Fix
We refined the visibility success contract in `nativeWindowManager.js`:
- For hide: success requires `windows.length > 0 && windows.every(w => !w.isVisible)`.
- For show: success requires `windows.length > 0 && windows.every(w => w.isVisible)`.
- A window already in the requested state is recorded with `alreadyInTargetState = true` without calling `ShowWindow`.
- Zero windows found is treated as retryable/not-ready (not successful), preventing premature exit of the retry loop.

### 1. Automated Preflight Checks
`node test_dkclSessionPreflightService.js` passed successfully.

### 2. 5-Cycle Hide/Show Verification
The smoke test `node smoke_test_hide.js` executed 5 cycles successfully for HUE and TCT:
- **HUE (Profile Path: D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong\backend\tmp\HUE)**:
  - Cycle 1: Windows initially hidden, `alreadyInTargetState = true` (treated as successful). Show restores both HWNDs (71764970, 23331876).
  - Cycles 2-5: Successfully hides and shows both HWNDs.
- **TCT (Profile Path: D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong\backend\tmp\TCT)**:
  - Cycle 1: Windows initially hidden, `alreadyInTargetState = true` (treated as successful). Show restores both HWNDs (95687474, 71436760).
  - Cycles 2-5: Successfully hides and shows both HWNDs.

- All 5/5 cycles passed for both HUE and TCT.
- HUE and TCT profile paths and PID trees are completely isolated.

## Current Handoff

- Current ticket: `AUTO-IMPORT-008`.
- Current phase: `DEFECT 1 - HUE/TCT LOGIN WINDOW HIDE RELIABILITY`.
- Current manifest: `docs/10_TICKETS/AUTO-IMPORT-008_MANIFEST.md`.
- Current checkpoint: `docs/06_REVIEWS/Import/AUTO-IMPORT-008_CHECKPOINT_001.md`.
- Next action: WAITING FOR PRODUCT OWNER REVIEW (Defect 1 PO PASS).
- Defect 2 activation condition: Product Owner `PO PASS` for Defect 1.
- Defect 3 activation condition: Product Owner `PO PASS` for Defect 2.
