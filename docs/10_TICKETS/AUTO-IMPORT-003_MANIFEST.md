# AUTO-IMPORT-003 Manifest

- Ticket ID: `AUTO-IMPORT-003`
- Ticket Name: `Scheduled Import, Retry, Monitoring and Operations UI`
- Phase: `Smart Leadership Dashboard Implementation`
- Current state: `COMPLETED / PO PASS`
- PO UI Check Required: `Yes`
- PO Product Status: `PO PASS`
- Activation authority: Product Owner decision `PO DECISION - ACTIVATE AUTO-IMPORT-003`
- Activation date: `2026-07-19`
- PO acceptance authority: Product Owner decision `AUTO-IMPORT-003 PO ACCEPTANCE: PASS`
- PO acceptance date: `2026-07-20`
- Implementation branch: `codex/auto-import-003`

## Required Reading

- [README_AI.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/README_AI.md)
- [docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)
- [docs/10_TICKETS/AUTO-IMPORT-002_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/AUTO-IMPORT-002_MANIFEST.md)
- [docs/06_REVIEWS/Import/AUTO-IMPORT-001_DKCL_SYNC_ATOMIC_IMPORT_HANDOFF.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/AUTO-IMPORT-001_DKCL_SYNC_ATOMIC_IMPORT_HANDOFF.md)
- [docs/06_REVIEWS/Import/AUTO-IMPORT-002_HUE_F13_ACQUISITION_ENGINE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/AUTO-IMPORT-002_HUE_F13_ACQUISITION_ENGINE.md)
- [docs/06_REVIEWS/Import/AUTO-IMPORT-003_CHECKPOINT_001.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/AUTO-IMPORT-003_CHECKPOINT_001.md)
- [docs/06_REVIEWS/Import/AUTO-IMPORT-003_CHECKPOINT_002.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/AUTO-IMPORT-003_CHECKPOINT_002.md)
- [docs/06_REVIEWS/Import/AUTO-IMPORT-003_CHECKPOINT_003.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/AUTO-IMPORT-003_CHECKPOINT_003.md)
- [docs/06_REVIEWS/Import/AUTO-IMPORT-003_PO_ACCEPTANCE_CHECKLIST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/AUTO-IMPORT-003_PO_ACCEPTANCE_CHECKLIST.md)
- [docs/06_REVIEWS/Import/AUTO-IMPORT-003_PO_DEFECT_FIXES.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/AUTO-IMPORT-003_PO_DEFECT_FIXES.md)
- [docs/04_TECHNICAL_PLANNING/Dashboard/DA_IMPLEMENTATION_TICKET_REGISTER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Dashboard/DA_IMPLEMENTATION_TICKET_REGISTER.md)
- [docs/01_GOVERNANCE/DOCUMENT_UPDATE_MATRIX.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/DOCUMENT_UPDATE_MATRIX.md)

## Objective

Extend the existing Data Import Center with Huế F1.3 operations support for missing-date scan, manual backfill queueing, retry, stop, monitoring, and evidence display while reusing the completed AUTO-IMPORT-002 acquisition engine.

## In Scope

- Extend the existing Data Import Center.
- Reuse AUTO-IMPORT-002 Huế F1.3 acquisition APIs and services.
- Add missing-date scanning for Huế F1.3 imported data.
- Allow selection of individual dates or a date range.
- Add an `Update` action for manual backfill.
- Process selected dates through a sequential queue.
- Add retry and stop controls.
- Add progress and status monitoring.
- Show import, export, validation, and error evidence.
- Support manual backfill first.
- Prepare architecture for future daily scheduling without enabling unattended scheduling.

## Out of Scope

- TCT source or nationwide account workflow.
- KPI business formula changes.
- Unattended daily scheduling.
- Force replacement of existing imported data.
- Automatic login, credential storage, or additional DKCL session persistence.
- Broad changes to AUTO-IMPORT-002 beyond minimal compatible integration.
- Bulk or historical portal-file cleanup outside the current AUTO-IMPORT-002 contract.

## Implementation Summary

- Checkpoint 001 implemented the missing-date scan vertical slice and displayed selectable Huế dates in Data Import Center.
- Checkpoint 002 implemented the manual Huế F1.3 sequential backfill queue, `Update`, retry/stop APIs, and operational evidence display.
- Checkpoint 003 completed runtime UX and operational hardening.
- PO defect fixes added coverage summary, corrected Vietnamese Unicode, removed the unsupported 62-day scan limit, and added pre-queue DKCL authentication validation.

## PO Defect Fixes

- `DEFECT-001 - Data Coverage Summary`: fixed by adding Huế F1.3 database coverage summary above manual backfill and explicit existing/missing/completed date lists after scan.
- `DEFECT-002 - Vietnamese Unicode Rendering`: fixed for newly added Huế F1.3 backfill UI strings; UTF-8 Vietnamese wording is used for operator-facing text.
- `DEFECT-003 - Unsupported 62-day limitation`: fixed by removing the unauthorized hard-coded 62-day missing-date scan limit.
- `DEFECT-004 - Queue cannot complete because authentication expires`: fixed by validating DKCL authentication before queue creation and rejecting invalid sessions before any item enters `RUNNING`.

## PO Acceptance

- PO decision: `PASS`
- PO acceptance date: `2026-07-20`
- Final ticket status: `COMPLETED / PO PASS`
- Accepted operational condition:
  - Manual Huế F1.3 backfill requires a valid DKCL authenticated session.
  - The operator does not need to log in for every `Update` while the session remains valid.
  - If the DKCL session is expired or invalid, the system must block queue creation before `RUNNING` and instruct the operator to re-authenticate.
- Explicitly not included in this ticket:
  - automatic login;
  - credential storage;
  - DKCL session persistence beyond the existing authenticated session behavior.

## Technical Contract

- Missing-date scan compares a requested inclusive date window against completed Huế F1.3 import evidence.
- Existing complete dates must not be force reimported.
- Queue processing is sequential for selected dates.
- Queue jobs call the existing one-date AUTO-IMPORT-002 orchestration path with minimal compatible integration flags.
- Retry targets eligible failed or authentication-required queue items only.
- Stop prevents remaining queued dates from starting and does not interrupt data already committed by a completed date.
- Queue creation requires a valid DKCL authenticated session and rejects invalid/expired sessions before any item enters `RUNNING`.
- UI evidence uses safe operational metadata only and must never expose credentials, cookies, tokens, HRM identifiers, authorization headers, or shipment identifiers.

## Validation

- `node backend\test_dkclHueF13BackfillService.js` -> `35 passed, 0 failed`
- `node backend\test_dkclHueF13SyncService.js` -> `84 passed, 0 failed`
- `node frontend\src\pages\dataImportBackfillQueue.test.js` -> passed
- Backend syntax checks -> passed
- Frontend lint/build -> passed with pre-existing warnings/chunk-size warning only
- Runtime scan and queue authentication preflight checks on normal backend `5050` -> passed
- `git diff --check` -> passed

## Completion Gate

This ticket is closed with Product Owner `PO PASS`.

## Next Ticket

- Next ticket ID: `DA-IMPL-004`
- Next ticket name: `Unified BCVH Analysis Table`
- Handoff note: may be activated next through the repository governance flow.
