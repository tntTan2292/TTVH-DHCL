# DOC-GOV-CLEANUP-001 CHECKPOINT 001

## Phase

- Ticket: `DOC-GOV-CLEANUP-001`
- Ticket name: `Toi gian va chuan hoa he thong tai lieu du an`
- Phase: `PLAN-EXECUTION`
- Current state: `ACTIVE / PLAN-EXECUTION`
- Technical status: `PLANNING`
- Runtime status: `NOT APPLICABLE`
- PO product status: `NOT APPLICABLE`
- Latest verified remote commit before activation: `2c9447d33b25460b0c2b283365535dd6ffe6df5d`
- Authority: `PO authorized governance document cleanup`

## Scope Lock

This checkpoint activates only the governance documentation cleanup.

Do not modify functional code, audit code, change import implementation, alter Dashboard/KPI/authentication, delete historical documents, or change business SSOT.

## Cleanup Plan

1. Inventory the `docs` directory.
2. Identify at most `5` active onboarding documents.
3. Convert old documents to conditional reference or archive status.
4. Correct wrong status entries in `DOCUMENT_INDEX`.
5. Preserve historical evidence and ticket records.

## Queued Work

`AUTO-IMPORT-007` is `AUTHORIZED / QUEUED` and `WAITING FOR DOC-GOV-CLEANUP-001`.

No AUTO-IMPORT-007 discovery or implementation is authorized while this ticket is active.

## Current Handoff

- Current ticket: `DOC-GOV-CLEANUP-001`.
- Current phase: `PLAN-EXECUTION`.
- Current manifest: `docs/10_TICKETS/DOC-GOV-CLEANUP-001_MANIFEST.md`.
- Current checkpoint: `docs/06_REVIEWS/Governance/DOC-GOV-CLEANUP-001_CHECKPOINT_001.md`.
- Next queued ticket: `AUTO-IMPORT-007`.
- Functional code changes are not authorized.
