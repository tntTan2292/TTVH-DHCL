# AUTO-IMPORT-007 CHECKPOINT 001

## Phase

- Ticket: `AUTO-IMPORT-007`
- Ticket name: `Chuan hoa va nang cap kien truc Import`
- Phase: `PLAN ONLY`
- Current state: `ACTIVE / PLAN ONLY`
- Technical status: `PLANNING`
- Runtime status: `NOT STARTED`
- PO product status: `NOT READY`
- Latest verified remote commit before activation: `671284822ab35324f17cd1205ab63a6b955d23d4`
- Authority: `PO authorized planning only`

## Scope Lock

This checkpoint activates planning only.

Do not implement functional code, rewrite import flows, alter browser lifecycle behavior, change database writes, perform portal login, run PO runtime validation, or modify Dashboard/KPI/authentication behavior under this checkpoint.

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

Both discovery inputs must be completed before implementation authorization is requested.

## Current Handoff

- Current ticket: `AUTO-IMPORT-007`.
- Current phase: `PLAN ONLY`.
- Current manifest: `docs/10_TICKETS/AUTO-IMPORT-007_MANIFEST.md`.
- Current checkpoint: `docs/06_REVIEWS/Import/AUTO-IMPORT-007_CHECKPOINT_001.md`.
- Next action: collect discovery input `1. Codex code/data analysis`.
- No code implementation is authorized.
