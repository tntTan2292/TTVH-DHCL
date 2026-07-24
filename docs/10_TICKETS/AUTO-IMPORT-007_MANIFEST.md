# AUTO-IMPORT-007 Manifest

- Ticket ID: `AUTO-IMPORT-007`
- Ticket Name: `Chuan hoa va nang cap kien truc Import`
- Phase: `Auto Import / Architecture Planning`
- Current State: `AUTHORIZED / QUEUED`
- Technical Status: `QUEUED`
- Runtime Status: `NOT STARTED`
- PO UI Check Required: `No`
- PO Product Status: `NOT READY`
- Current Phase: `WAITING FOR DOC-GOV-CLEANUP-001`
- Last Reviewed Phase: `AUTO-IMPORT-006 TCT unfinished bulk-selection PO PASS`
- Last Reviewed Commit: `671284822ab35324f17cd1205ab63a6b955d23d4`
- Phase Review Status: `PO AUTHORIZED PLAN`
- Next Phase Authorization: `WAIT FOR DOC-GOV-CLEANUP-001`
- Activation date: `2026-07-24`
- Primary executor: `Queued - no discovery or implementation while DOC-GOV-CLEANUP-001 is active`

## Fresh-Chat Onboarding Authority

Required onboarding chain:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
3. `docs/10_TICKETS/AUTO-IMPORT-007_MANIFEST.md`
4. `docs/06_REVIEWS/Import/AUTO-IMPORT-007_CHECKPOINT_001.md`

Current checkpoint: `docs/06_REVIEWS/Import/AUTO-IMPORT-007_CHECKPOINT_001.md`

## Authority

Product Owner authorized `AUTO-IMPORT-007`, but it is queued behind `DOC-GOV-CLEANUP-001`.

Functional source-code changes, discovery, and implementation are not authorized while `DOC-GOV-CLEANUP-001` is active. Do not modify import execution, browser lifecycle, queue execution, database writes, Dashboard, KPI, or authentication behavior until a later authorization is recorded.

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

## Required Discovery Inputs

1. Codex code/data analysis.
2. Antigravity runtime/UI analysis.

These are discovery inputs only. They do not authorize implementation.

## Current Status

- AUTO-IMPORT-007 is `AUTHORIZED / QUEUED`.
- AUTO-IMPORT-007 is `WAITING FOR DOC-GOV-CLEANUP-001`.
- No functional code changes are authorized.
- No discovery is authorized.
- No implementation is authorized.
- No portal login is authorized.
- No PO runtime validation is authorized.
- Next required action: complete or explicitly release `DOC-GOV-CLEANUP-001` before AUTO-IMPORT-007 proceeds.
