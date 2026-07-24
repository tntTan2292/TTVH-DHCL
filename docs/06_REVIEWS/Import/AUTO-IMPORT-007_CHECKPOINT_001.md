# AUTO-IMPORT-007 CHECKPOINT 001

## Phase

- Ticket: `AUTO-IMPORT-007`
- Ticket name: `Chuan hoa va nang cap kien truc Import`
- Phase: `PLAN ONLY`
- Current state: `ACTIVE / PLAN ONLY`
- Technical status: `PLAN CONSOLIDATED`
- Runtime status: `NOT STARTED`
- PO product status: `NOT READY`
- Latest verified DOC-GOV-CLEANUP-001 technical pass commit: `366fbe0738a1b1f8d3a5c8753d4930b69a97004f`
- Authority: `PO authorized AUTO-IMPORT-007 plan/discovery after DOC-GOV-CLEANUP-001 technical pass; implementation remains unauthorized`

## Scope Lock

This checkpoint records the AUTO-IMPORT-007 plan locks and reactivation after DOC-GOV-CLEANUP-001 technical pass.

Discovery and planning consolidation are complete. Do not implement functional code, rewrite import flows, alter browser lifecycle behavior, change database writes, perform portal login, run PO runtime validation, or modify Dashboard/KPI/authentication behavior until a later implementation authorization is recorded.

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

## Proposed First Phase

- Phase: shared lifecycle contract/state standardization.
- Executor: `Codex`.
- Scope: contract/state alignment only.
- Exclusions: no UI behavior change, no database behavior change, no portal login, no runtime/browser execution, no Dashboard/KPI change.
- Status: proposed only; implementation remains unauthorized until separately approved.

## Current Handoff

- Current ticket: `AUTO-IMPORT-007`.
- Current phase: `PLAN ONLY`.
- Current manifest: `docs/10_TICKETS/AUTO-IMPORT-007_MANIFEST.md`.
- Current checkpoint: `docs/06_REVIEWS/Import/AUTO-IMPORT-007_CHECKPOINT_001.md`.
- Next action: Product Owner implementation authorization decision for Phase 1.
- No code implementation is authorized.
