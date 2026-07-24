# DOC-GOV-CLEANUP-001 Manifest

- Ticket ID: `DOC-GOV-CLEANUP-001`
- Ticket Name: `Toi gian va chuan hoa he thong tai lieu du an`
- Phase: `Governance Documentation Cleanup`
- Current State: `ACTIVE / PLAN-EXECUTION`
- Technical Status: `PLANNING`
- Runtime Status: `NOT APPLICABLE`
- PO UI Check Required: `No`
- PO Product Status: `NOT APPLICABLE`
- Current Phase: `PLAN-EXECUTION`
- Last Reviewed Phase: `AUTO-IMPORT-007 plan activation`
- Last Reviewed Commit: `2c9447d33b25460b0c2b283365535dd6ffe6df5d`
- Phase Review Status: `PO AUTHORIZED`
- Next Phase Authorization: `Governance document cleanup only`
- Activation date: `2026-07-24`
- Next queued ticket: `AUTO-IMPORT-007`

## Fresh-Chat Onboarding Authority

Required onboarding chain:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
3. `docs/10_TICKETS/DOC-GOV-CLEANUP-001_MANIFEST.md`
4. `docs/06_REVIEWS/Governance/DOC-GOV-CLEANUP-001_CHECKPOINT_001.md`

Current checkpoint: `docs/06_REVIEWS/Governance/DOC-GOV-CLEANUP-001_CHECKPOINT_001.md`

## Authority

Product Owner authorized a narrow governance documentation cleanup ticket.

Functional code changes are not authorized. Business SSOT changes are not authorized. Repository code audit is not authorized.

## Scope

Authorized scope:

- inventory the `docs` directory;
- identify at most `5` active documents in onboarding;
- convert old documents to conditional reference or archive status;
- correct wrong status entries in `DOCUMENT_INDEX`;
- preserve history;
- avoid code audit;
- avoid business SSOT changes.

## Out of Scope

- Functional source code changes.
- Import implementation, browser lifecycle, queue execution, database writes, Dashboard, KPI, or authentication changes.
- Deleting historical documents.
- Rewriting business rules or changing frozen SSOT content.
- AUTO-IMPORT-007 discovery or implementation.

## AUTO-IMPORT-007 Relationship

`AUTO-IMPORT-007` is queued and waiting for `DOC-GOV-CLEANUP-001`.

Do not run AUTO-IMPORT-007 discovery or implementation until this governance cleanup is completed or explicitly released by PO authority.
