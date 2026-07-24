# AUTO-IMPORT-007 CHECKPOINT 001

## Phase

- Ticket: `AUTO-IMPORT-007`
- Ticket name: `Chuan hoa va nang cap kien truc Import`
- Phase: `ACCELERATED DELIVERY WAVE 1`
- Current state: `ACTIVE / WAVE 1 IMPLEMENTED`
- Technical status: `WAVE 1 TECHNICAL PASS`
- Runtime status: `NOT STARTED`
- PO product status: `NOT READY`
- Latest verified DOC-GOV-CLEANUP-001 technical pass commit: `366fbe0738a1b1f8d3a5c8753d4930b69a97004f`
- Authority: `PO authorized AUTO-IMPORT-007 Wave 1 implementation at baseline dff97ba5ac79551bf18a3125f22ff9689dd761a8; further implementation remains unauthorized`

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
- Current phase: `ACCELERATED DELIVERY WAVE 1`.
- Current manifest: `docs/10_TICKETS/AUTO-IMPORT-007_MANIFEST.md`.
- Current checkpoint: `docs/06_REVIEWS/Import/AUTO-IMPORT-007_CHECKPOINT_001.md`.
- Next action: Product Owner authorization decision for Accelerated Delivery Wave 2.
- No further code implementation is authorized.
