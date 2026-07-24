# AUTO-IMPORT-007 CHECKPOINT 001

## Phase

- Ticket: `AUTO-IMPORT-007`
- Ticket name: `Chuan hoa va nang cap kien truc Import`
- Phase: `WAITING FOR DOC-GOV-CLEANUP-001`
- Current state: `AUTHORIZED / QUEUED`
- Technical status: `QUEUED`
- Runtime status: `NOT STARTED`
- PO product status: `NOT READY`
- Latest verified remote commit before activation: `671284822ab35324f17cd1205ab63a6b955d23d4`
- Authority: `PO authorized AUTO-IMPORT-007, queued behind DOC-GOV-CLEANUP-001`

## Scope Lock

This checkpoint records the AUTO-IMPORT-007 plan locks, but AUTO-IMPORT-007 is now queued.

Do not run discovery, implement functional code, rewrite import flows, alter browser lifecycle behavior, change database writes, perform portal login, run PO runtime validation, or modify Dashboard/KPI/authentication behavior while `DOC-GOV-CLEANUP-001` is active.

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

Both discovery inputs are recorded for later, but are not authorized while `DOC-GOV-CLEANUP-001` is active.

## Current Handoff

- Current ticket: `AUTO-IMPORT-007`.
- Current phase: `AUTHORIZED / QUEUED`.
- Current manifest: `docs/10_TICKETS/AUTO-IMPORT-007_MANIFEST.md`.
- Current checkpoint: `docs/06_REVIEWS/Import/AUTO-IMPORT-007_CHECKPOINT_001.md`.
- Waiting for: `DOC-GOV-CLEANUP-001`.
- Next action: none for AUTO-IMPORT-007 until DOC-GOV-CLEANUP-001 completes or PO explicitly releases the queue.
- No code implementation is authorized.
