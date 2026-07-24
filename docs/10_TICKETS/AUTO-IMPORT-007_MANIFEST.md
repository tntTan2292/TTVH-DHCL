# AUTO-IMPORT-007 Manifest

- Ticket ID: `AUTO-IMPORT-007`
- Ticket Name: `Chuan hoa va nang cap kien truc Import`
- Phase: `Auto Import / Architecture Planning`
- Current State: `ACTIVE / WAVE 1 IMPLEMENTED`
- Technical Status: `WAVE 1 TECHNICAL PASS`
- Runtime Status: `NOT STARTED`
- PO UI Check Required: `No`
- PO Product Status: `NOT READY`
- Current Phase: `ACCELERATED DELIVERY WAVE 1`
- Last Reviewed Phase: `AUTO-IMPORT-007 WAVE 1`
- Last Reviewed Commit: `this Wave 1 delivery commit`
- Phase Review Status: `TECHNICAL PASS`
- Next Phase Authorization: `READY FOR ACCELERATED DELIVERY WAVE 2 AUTHORIZATION`
- Activation date: `2026-07-24`
- Primary executor: `Codex for code/data analysis; Antigravity for runtime/UI analysis`

## Fresh-Chat Onboarding Authority

Required onboarding chain:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
3. `docs/10_TICKETS/AUTO-IMPORT-007_MANIFEST.md`
4. Required Reading from this manifest

Current checkpoint: `docs/06_REVIEWS/Import/AUTO-IMPORT-007_CHECKPOINT_001.md`

Required Reading:

- `docs/06_REVIEWS/Import/AUTO-IMPORT-007_CHECKPOINT_001.md`

## Authority

Product Owner authorized `AUTO-IMPORT-007` for plan/discovery after `DOC-GOV-CLEANUP-001` technical pass.

Product Owner authorized Accelerated Delivery Wave 1 at baseline `dff97ba5ac79551bf18a3125f22ff9689dd761a8`.

Wave 1 implementation scope is complete for shared lifecycle contract/state standardization. Do not modify queue execution, import execution, database writes, Dashboard, KPI, frontend visual behavior, adapter extraction, portal login, or PO runtime validation until a later implementation authorization is recorded.

## Objective

Plan the standardization and architecture upgrade of Import while preserving passing behavior from `AUTO-IMPORT-006` and earlier accepted import tickets.

The architecture must reuse code that is already `PASS`; do not plan a full rewrite unless later discovery proves a bounded replacement is required and PO authorizes it.

## Locked Plan Direction

### Shared DKCL Lifecycle SSOT

The plan must define one shared DKCL lifecycle SSOT:

`SOURCE_SELECTED` -> `SESSION_CHECK` -> `OPENING_BROWSER` -> `WAITING_FOR_LOGIN` -> `AUTHENTICATED` -> `F13_OPENING` -> `F13_READY`.

HUE and TCT must use the same lifecycle contract and state semantics.

### Source Separation

HUE and TCT must remain separated by:

- account;
- `profileDir`;
- Registry entry;
- PID tree;
- HWND;
- session.

Shared lifecycle code must never collapse HUE and TCT into one browser/session identity.

### Adapter Boundary

The architecture may branch only after `F13_READY`.

Allowed post-`F13_READY` adapters:

- `HueF13Adapter`;
- `TctF13Adapter`.

Portal-specific acquisition differences belong behind those adapters.

### Operations Contract

The plan must standardize:

- queue;
- retry;
- stop;
- progress;
- error;
- import history.

The standard contract must preserve idempotent import behavior and operator-visible evidence.

### Metadata Contract

Import metadata must always distinguish source even when original portal filenames are identical.

Required metadata planning must cover source identity in queue items, files, logs, processed artifacts, history records, and import evidence.

### Extensibility

The architecture must be extensible to:

- `F1.1`;
- `F1.2`;
- `F4.1`.

The plan must identify which contracts are DKCL-general, F13-specific, and source-specific.

## Completed Discovery Inputs

1. Codex code/data analysis.
2. Antigravity runtime/UI analysis.

Both discovery inputs are completed and accepted by the Product Owner. These discovery inputs do not authorize implementation.

## Product Owner Planning Decisions

- HUE and TCT use the same operator-visible stages: `OPENING_BROWSER` -> `WAITING_FOR_LOGIN` -> `F13_OPENING` -> `F13_READY`.
- Manual login timeout default remains `4` minutes.
- Operator errors must be concise, actionable Vietnamese.
- Technical detail remains in logs.
- Product Owner approved the six-phase architecture plan.

## Preserved PASS Behaviors

- Existing HUE/TCT source separation, sessions, profiles, registry identity, PID tree, HWND handling, files, logs, queue items, and history must remain preserved.
- Existing HUE session reuse, controlled Re-Update/idempotency, TCT incomplete-date selection, manual login behavior, and accepted import evidence contracts must remain preserved.
- Existing Dashboard/KPI accepted behavior is out of scope for AUTO-IMPORT-007 implementation.

## Executor Responsibility Boundaries

- Codex owns shared lifecycle contract, backend/API/data contracts, queue/history contracts, tests, and governance documentation.
- Antigravity owns real-machine runtime/UI validation, browser window behavior, operator-visible lifecycle behavior, and OS/HWND evidence.
- Neither executor may self-authorize implementation or broaden scope beyond the phase authorized by the Product Owner.

## Approved Six-Phase Implementation Plan

Each phase must be independently verifiable and separately authorized before execution.

1. Shared lifecycle contract/state standardization. Executor: `Codex`. Scope: contract/state alignment only; no UI or database behavior change.
2. Shared source/session registry and profile ownership hardening. Executor: `Codex`, with Antigravity runtime evidence where needed.
3. Operator-visible lifecycle/runtime behavior alignment for HUE and TCT. Executor: `Antigravity`.
4. Shared queue, retry, stop, progress, error, and history contract standardization. Executor: `Codex`.
5. Post-`F13_READY` adapter extraction for `HueF13Adapter` and `TctF13Adapter`. Executor: `Codex`.
6. Metadata/source identity completion and extension readiness for `F1.1`, `F1.2`, and `F4.1`. Executor: `Codex`.

## Wave 1 Implementation Result

- Phase: shared lifecycle contract/state standardization.
- Executor: `Codex`.
- Scope: standardized lifecycle contract/state naming and backend-facing state semantics.
- Result: `TECHNICAL PASS`.
- Public response compatibility: existing preflight `status` values are preserved; shared lifecycle details are exposed through `lifecycle_state` and `lifecycle`.
- Final regression closure: TCT `LOGIN_IN_PROGRESS` frontend recognition compatibility restored without introducing Wave 2 visual lifecycle UI.
- Exclusions: no UI behavior change, no database behavior change, no portal login, no browser runtime execution, no Dashboard/KPI change.
- Commit: `this Wave 1 delivery commit`.

## Current Status

- AUTO-IMPORT-007 Wave 1 is implemented.
- Discovery inputs are completed and accepted.
- Six-phase architecture plan is approved.
- No further implementation is authorized.
- No portal login is authorized.
- No PO runtime validation is authorized.
- Next required action: Product Owner authorization decision for Accelerated Delivery Wave 2.
- Fresh-chat condition: Accelerated Delivery Wave 2 must begin in a fresh Codex conversation after this Governance commit is pushed and remote state is verified.
