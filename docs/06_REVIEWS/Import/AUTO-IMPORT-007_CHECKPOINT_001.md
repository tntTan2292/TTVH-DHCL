# AUTO-IMPORT-007 CHECKPOINT 001

## Phase

- Ticket: `AUTO-IMPORT-007`
- Ticket name: `Chuan hoa va nang cap kien truc Import`
- Phase: `PLAN ONLY`
- Current state: `ACTIVE / PLAN ONLY`
- Technical status: `PLANNING`
- Runtime status: `NOT STARTED`
- PO product status: `NOT READY`
- Latest verified DOC-GOV-CLEANUP-001 technical pass commit: `366fbe0738a1b1f8d3a5c8753d4930b69a97004f`
- Authority: `PO authorized AUTO-IMPORT-007 plan/discovery after DOC-GOV-CLEANUP-001 technical pass`

## Scope Lock

This checkpoint records the AUTO-IMPORT-007 plan locks and reactivation after DOC-GOV-CLEANUP-001 technical pass.

Discovery is authorized as the next action. Do not implement functional code, rewrite import flows, alter browser lifecycle behavior, change database writes, perform portal login, run PO runtime validation, or modify Dashboard/KPI/authentication behavior until a later implementation authorization is recorded.

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

## Discovery Inputs Required

1. Codex code/data analysis.
2. Antigravity runtime/UI analysis.

Both discovery inputs remain required before implementation authorization is requested.

## Current Handoff

- Current ticket: `AUTO-IMPORT-007`.
- Current phase: `PLAN ONLY`.
- Current manifest: `docs/10_TICKETS/AUTO-IMPORT-007_MANIFEST.md`.
- Current checkpoint: `docs/06_REVIEWS/Import/AUTO-IMPORT-007_CHECKPOINT_001.md`.
- Next action: discovery input `1. Codex code/data analysis`.
- No code implementation is authorized.
