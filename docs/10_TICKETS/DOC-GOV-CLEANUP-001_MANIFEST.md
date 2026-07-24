# DOC-GOV-CLEANUP-001 Manifest

- Ticket ID: `DOC-GOV-CLEANUP-001`
- Ticket Name: `Toi gian va chuan hoa he thong tai lieu du an`
- Phase: `Governance Documentation Cleanup`
- Current State: `ACTIVE / READY FOR PO REVIEW`
- Technical Status: `PASS`
- Runtime Status: `NOT APPLICABLE`
- PO UI Check Required: `No`
- PO Product Status: `NOT APPLICABLE`
- Current Phase: `DOCUMENT CLEANUP EXECUTED`
- Last Reviewed Phase: `AUTO-IMPORT-007 plan activation`
- Last Reviewed Commit: `2c9447d33b25460b0c2b283365535dd6ffe6df5d`
- Phase Review Status: `READY FOR PO REVIEW`
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

## Cleanup Result

- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md` now defines the compact active onboarding chain and classifies non-onboarding documents as `Conditional Reference` or `Archive`.
- Fresh onboarding is capped at `5` steps: `README_AI.md` -> `CODEX_PROMPT_STANDARD.md` -> `PROJECT_SNAPSHOT.md` -> Current Manifest -> Required Reading.
- Inventory before cleanup: `306` files under `docs`.
- Inventory after cleanup: `306` files under `docs`.
- No historical file was deleted, moved, merged, or archived by filesystem move.
- No functional code, business SSOT, Dashboard, KPI, import execution, or authentication file was changed.
- Duplicate content proposal only: two empty `.gitkeep` placeholders are exact duplicates and should be kept unless a later cleanup specifically authorizes consolidation.

## Out of Scope

- Functional source code changes.
- Import implementation, browser lifecycle, queue execution, database writes, Dashboard, KPI, or authentication changes.
- Deleting historical documents.
- Rewriting business rules or changing frozen SSOT content.
- AUTO-IMPORT-007 discovery or implementation.

## AUTO-IMPORT-007 Relationship

`AUTO-IMPORT-007` is queued and waiting for `DOC-GOV-CLEANUP-001`.

Do not run AUTO-IMPORT-007 discovery or implementation until this governance cleanup is completed or explicitly released by PO authority.
