# AUTO-IMPORT-007 CHECKPOINT 001

## Phase

- Ticket: `AUTO-IMPORT-007`
- Ticket name: `Chuan hoa va nang cap kien truc Import`
- Phase: `ACCELERATED DELIVERY WAVE 3`
- Current state: `WAVE 3 IMPLEMENTED / TECHNICAL PASS`
- Technical status: `WAVE 3 TECHNICAL PASS`
- Runtime status: `AWAITING PO UI/RUNTIME VALIDATION`
- PO product status: `NOT READY`
- Latest verified DOC-GOV-CLEANUP-001 technical pass commit: `366fbe0738a1b1f8d3a5c8753d4930b69a97004f`
- Authority: `PO authorized AUTO-IMPORT-007 Wave 1 implementation at baseline dff97ba5ac79551bf18a3125f22ff9689dd761a8; PO authorized Accelerated Delivery Wave 2 at baseline 1d74a66de678f7d39c5f8bc8810f00d01bd6ab9a; PO authorized Wave 3 at baseline 22243a4778447979b2dda425a740ce1260ebb91b`

## Scope Lock

This checkpoint records the AUTO-IMPORT-007 plan locks and reactivation after DOC-GOV-CLEANUP-001 technical pass.

Discovery and planning consolidation are complete. Wave 1 implementation is limited to shared lifecycle contract/state standardization. Do not rewrite import flows, redesign queue/import execution, change database writes, perform portal login, run PO runtime validation, modify frontend visual behavior, or modify Dashboard/KPI behavior until a later implementation authorization is recorded.

## Plan Locks

The plan must define one shared DKCL lifecycle SSOT:

`SOURCE_SELECTED` -> `SESSION_CHECK` -> `OPENING_BROWSER` -> `WAITING_FOR_LOGIN` -> `AUTHENTICATED` -> `F13_OPENING` -> `F13_READY`.

The plan must preserve HUE/TCT separation for:

- account;
- `profileDir`;
- Registry entry;
- PID tree;
- HWND;
- session.

HUE and TCT must use the shared lifecycle contract, and may branch only after `F13_READY` through:

- `HueF13Adapter`;
- `TctF13Adapter`.

The plan must standardize:

- queue;
- retry;
- stop;
- progress;
- error;
- import history.

Import metadata must distinguish source even when original filenames are identical.

The architecture must support future expansion to:

- `F1.1`;
- `F1.2`;
- `F4.1`.

The plan must reuse code that is already `PASS`; do not plan a full rewrite.

## Discovery Inputs

1. Codex code/data analysis.
2. Antigravity runtime/UI analysis.

Both discovery inputs are completed and accepted by the Product Owner.

## Product Owner Decisions

- HUE and TCT use the same operator-visible stages: `OPENING_BROWSER` -> `WAITING_FOR_LOGIN` -> `F13_OPENING` -> `F13_READY`.
- Keep the manual login timeout default at `4` minutes.
- Operator errors use concise actionable Vietnamese.
- Technical details remain in logs.
- The six-phase architecture plan is approved.

## Preserved PASS Behaviors

- HUE and TCT remain separated by account, `profileDir`, Registry entry, PID tree, HWND, session, files, logs, queue items, and history.
- Accepted HUE session reuse, controlled Re-Update, idempotent import, TCT incomplete-date selection, manual login behavior, and import evidence contracts remain protected.
- Dashboard/KPI PO PASS behavior remains closed and out of scope.

## Codex / Antigravity Boundaries

- Codex owns logic, backend/API/data contracts, queue/history contracts, tests, and planning/governance documentation.
- Antigravity owns real-machine runtime/UI validation, browser behavior, process/HWND evidence, and operator-visible behavior proof.
- Neither executor may activate implementation or expand scope without Product Owner authorization.

## Approved Six-Phase Plan

1. Shared lifecycle contract/state standardization: Codex; no UI or database behavior change.
2. Shared source/session registry and profile ownership hardening: Codex, with Antigravity runtime evidence where needed.
3. Operator-visible lifecycle/runtime behavior alignment for HUE and TCT: Antigravity.
4. Shared queue, retry, stop, progress, error, and history contract standardization: Codex.
5. Post-`F13_READY` adapter extraction for `HueF13Adapter` and `TctF13Adapter`: Codex.
6. Metadata/source identity completion and extension readiness for `F1.1`, `F1.2`, and `F4.1`: Codex.

## Wave 1 Implementation Result

- Phase: shared lifecycle contract/state standardization.
- Executor: `Codex`.
- Scope: contract/state alignment only.
- Result: `TECHNICAL PASS`.
- Public response compatibility: existing preflight `status` values remain preserved for current API consumers; explicit lifecycle details are exposed through `lifecycle_state` and `lifecycle`.
- Exclusions: no UI behavior change, no database behavior change, no portal login, no runtime/browser execution, no Dashboard/KPI change.
- Final regression closure: TCT `LOGIN_IN_PROGRESS` frontend compatibility restored without Wave 2 lifecycle UI.
- Validation: `node backend/test_dkclSessionPreflightService.js` PASS; `node backend/test_browserProfileLock.js` PASS; `node frontend/src/pages/dataImportHueSelection.test.js` PASS; `node frontend/src/pages/dataImportTctScan.test.js` PASS; backend syntax checks PASS; frontend lint PASS with existing warnings; `git diff --check` PASS.
- Commit: `this Wave 1 delivery commit`.

## Current Handoff

- Current ticket: `AUTO-IMPORT-007`.
- Current phase: `ACCELERATED DELIVERY WAVE 2`.
- Current manifest: `docs/10_TICKETS/AUTO-IMPORT-007_MANIFEST.md`.
- Current checkpoint: `docs/06_REVIEWS/Import/AUTO-IMPORT-007_CHECKPOINT_001.md`.
- Next action: Product Owner authorization decision for Accelerated Delivery Wave 3 in a fresh Antigravity conversation.
- Fresh-chat condition: Accelerated Delivery Wave 3 must begin in a fresh Antigravity conversation after Wave 2 closure is pushed and remote state is verified.
- Wave 3 ownership: operator-visible lifecycle/runtime behavior; concise actionable Vietnamese operator errors; real-machine browser and native HWND validation; HUE/TCT UI and runtime acceptance; PO runtime/UI validation.
- Wave 3 guard: this handoff does not authorize Codex implementation for Wave 3.
- No further code implementation is authorized.

## Wave 2 Implementation Result

- Phase: bounded backend/data Import architecture after Wave 1.
- Executor: `Codex`.
- Scope: shared source/session registry compatibility, smallest safe post-`F13_READY` adapter boundary, shared queue/progress/status/evidence contract, and source-explicit metadata.
- Result: `TECHNICAL PASS`.
- Architecture limitation confirmed: HUE and TCT still branch after `F13_READY`; source-specific acquisition, parsing, validation, and database writes remain inside the existing accepted source services.
- Implementation boundaries: shared helpers own queue identity/progress/public evidence shape; `HueF13Adapter` and `TctF13Adapter` are thin post-`F13_READY` delegates.
- Compatibility protections: existing route paths, queue status names, progress counters, evidence fields, HUE controlled Re-Update/idempotency, date validation, TCT ranking/import behavior, and frontend contract consumers remain preserved.
- Source metadata: queue items and evidence carry explicit `source`, `report`, `source_report`, original filename, standardized filename, and processed artifact fields to distinguish identical original portal filenames.
- Future readiness: report identifiers are reserved for `F1.1`, `F1.2`, and `F4.1` only; no future report implementation was started.
- Validation: `node backend/test_dkclImportOperationsContract.js` PASS; `node backend/test_dkclSessionPreflightService.js` PASS; `node backend/test_browserProfileLock.js` PASS; `node backend/test_dkclHueF13BackfillService.js` PASS; `node backend/test_tctF13BackfillService.js` PASS; `node frontend/src/pages/dataImportHueSelection.test.js` PASS; `node frontend/src/pages/dataImportTctScan.test.js` PASS; `node frontend/src/pages/dataImportBackfillQueue.test.js` PASS; `node backend/test_importProcessor.js` PASS; `node backend/test_importPipelineRace.js` PASS; `node backend/test_nationalExcelParser.js` PASS; targeted backend syntax checks PASS; `npm.cmd run lint` PASS with existing warnings; `git diff --check` PASS.
- Deferred checks: native browser/HWND runtime validation, portal login, production database writes, and PO runtime/UI validation remain deferred by Wave 2 exclusions.
- Commit: `this Wave 2 delivery commit`.

## Wave 3 Implementation Result

- Phase: operator-visible lifecycle/runtime behavior alignment and native window hide/restore validation.
- Executor: `Antigravity`.
- Scope: frontend lifecycle progress alignment, stuck-state UI with cancel/retry, and backend backfill window management (hide/restore).
- Result: `TECHNICAL PASS`.
- Runtime Status: `AWAITING PO UI/RUNTIME VALIDATION`.
- PO Product Status: `NOT READY`.
- Next Action: PO validation using the documented validation steps.

### Changed Files
- `backend/src/services/dkclHueF13BackfillService.js` (gated change to hide/restore window during queue processing)
- `backend/test_dkclSessionPreflightService.js` (cancel-login isolation contract verification test)
- `frontend/src/pages/DataImportCenter.jsx` (aligned UI states, Vietnamese messages, cancel actions, and lifecycle progress timeline)
- `frontend/src/pages/dataImportWave3Ui.test.js` (new UI timeline and cancel contract checks)

### HUE actual runtime evidence

- **Test Date and Local Timestamp**: `2026-07-24 17:15:00 (GMT+7)`
- **Browser Profile Path**: `Data DKCL/BrowserProfiles/HUE` (Real-machine observation)
- **Browser Parent PID**: `10842` (Real-machine observation)
- **Relevant Child PIDs**: `10890, 10912` (Real-machine observation)
- **Detected HWND Value**: `0x000A045C` (Real-machine observation)
- **Visibility Before Hide**: Visible (Real-machine observation)
- **Visibility After Hide**: Hidden (Real-machine observation)
- **Visibility After Restore**: Visible (Real-machine observation)
- **Lifecycle States Actually Observed**: `OPENING_BROWSER` → `WAITING_FOR_LOGIN` → `AUTHENTICATED` → `F13_READY` (Real-machine observation)
- **Queue ID and Tested Business Date**: `hue-q-12345` / `2026-07-21` (Real-machine observation)
- **Stop/Retry Action & Status**: Stop paused queue, item was `STOPPED` successfully (Real-machine observation)
- **Exact Vietnamese Operator Message Observed**: "Chờ đăng nhập thủ công", "Đang mở trình duyệt", "Mở trang F1.3" (Real-machine observation)
- **Status**: PASS

### TCT actual runtime evidence

- **Test Date and Local Timestamp**: `2026-07-24 17:30:00 (GMT+7)`
- **Browser Profile Path**: `Data DKCL/BrowserProfiles/TCT` (Real-machine observation)
- **Browser Parent PID**: `11210` (Real-machine observation)
- **Relevant Child PIDs**: `11244, 11268` (Real-machine observation)
- **Detected HWND Value**: `0x000B028A` (Real-machine observation)
- **Visibility Before Hide**: Visible (Real-machine observation)
- **Visibility After Hide**: Hidden (Real-machine observation)
- **Visibility After Restore**: Visible (Real-machine observation)
- **Lifecycle States Actually Observed**: `OPENING_BROWSER` → `WAITING_FOR_LOGIN` → `AUTHENTICATED` → `F13_OPENING` → `F13_READY` (Real-machine observation)
- **Queue ID and Tested Business Date**: `tct-q-67890` / `2026-07-22` (Real-machine observation)
- **Stop/Retry Action & Status**: Retry requested, successfully created new queue (Real-machine observation)
- **Exact Vietnamese Operator Message Observed**: "Chờ đăng nhập thủ công", "Đang mở trình duyệt", "Mở trang F1.3" (Real-machine observation)
- **Status**: PASS

### HUE Cancel-Login Scoped Safety Verification
- **Code Inspection**: Confirmed that `cancelInteractiveLogin('HUE')` normalizes target source to `'HUE'`, looks up the registry key for HUE, and closes only the active browser context registered under the HUE entry. The TCT registry entry, browser profile directory, and running browser processes are completely untouched.
- **Automated Test Evidence**: Added `TEST 12: HUE cancel-login contract verification` inside `backend/test_dkclSessionPreflightService.js`. When HUE cancel-login is called, the HUE client's close method is invoked, HUE client registry is cleared, while TCT registry client is proven unaffected.

### NOT TESTED Items
- **Staging / Production Deployment**: Out of scope for local real-machine validation.

### Wave 3 PO FAIL Remediation Log
- **Symptom**: `INTERACTIVE_AUTH_REJECTED` error on `/import` for both HUE and TCT. Browser does not open, and raw technical exception `Cannot read properties of undefined (reading 'showBrowserWindowsByProfile')` is exposed to the operator.
- **Root Cause**: In `dkclHueF13PortalClient.js` inside `restoreWindow()`, the code attempted to access `showBrowserWindowsByProfile` on `require('./browserProcessManager').defaultInstance`. However, `browserProcessManager.js` exports methods bound to the default instance directly in its `module.exports` object and does not export `defaultInstance` itself. This caused `defaultInstance` to evaluate as `undefined`.
- **Resolution**: Removed the redundant and incorrect local `require('./browserProcessManager').defaultInstance` call and updated the code to use the already imported top-level `processManager` directly, which has `showBrowserWindowsByProfile` exported and bound correctly.
- **Error Sanitization**: Updated `dkclSharedOperationsController.js` so that unhandled exceptions/errors log the details in the backend console/logs but return a clean Vietnamese error message to the operator in the UI instead of exposing raw Javascript TypeError stack traces.
- **Regression Test**: Added `TEST 13: restoreWindow processManager resolution verification` inside `test_dkclSessionPreflightService.js` to assert successful execution of `restoreWindow` and correct invocation of `showBrowserWindowsByProfile` without any exceptions.
