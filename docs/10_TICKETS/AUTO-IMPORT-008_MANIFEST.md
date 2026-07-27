# AUTO-IMPORT-008 Manifest

- Ticket ID: `AUTO-IMPORT-008`
- Ticket Name: `Auto Import PO Defect Remediation`
- Phase: `Auto Import / Bounded Remediation`
- Current State: `ACTIVE / DEFECT 3 AUTHORIZED`
- Technical Status: `DEFECT 3 NOT STARTED`
- Runtime Status: `N/A - DEFECT 3 DOCUMENTED ACTIVATION ONLY`
- PO UI Check Required: `Yes`
- PO Product Status: `DEFECT 1 PO PASS; DEFECT 2 PO PASS; DEFECT 3 AUTHORIZED FOR IMPLEMENTATION`
- Current Phase: `DEFECT 3 - HISTORICAL IMPORT HISTORY ROW-COUNT CORRECTION AND RELIABLE HUE SOURCE RECOVERY`
- Last Reviewed Phase: `AUTO-IMPORT-008 DEFECT 2 PO ACCEPTANCE / DEFECT 3 ACTIVATION`
- Last Reviewed Commit: `e8930edd0f30ded7ef8b56be6cede7c2cccb25db`
- Phase Review Status: `ACTIVATED`
- Next Phase Authorization: `Defect 3 implementation only`
- Activation date: `2026-07-26`
- Primary executor: `Codex for Import History database/history evidence, bounded correction logic, reliable HUE source recovery, and targeted tests`

## Fresh-Chat Onboarding Authority

Required onboarding chain:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
3. `docs/10_TICKETS/AUTO-IMPORT-008_MANIFEST.md`
4. Required Reading from this manifest

Current checkpoint: `docs/06_REVIEWS/Import/AUTO-IMPORT-008_CHECKPOINT_001.md`

Required Reading:

- `docs/06_REVIEWS/Import/AUTO-IMPORT-008_CHECKPOINT_001.md`

## Authority

Product Owner authorized a new bounded Auto Import remediation phase after completed `AUTO-IMPORT-007`.

`AUTO-IMPORT-007` remains closed and must not be reopened or altered. Its accepted closure, HUE `2026-07-18` and `2026-07-19` locked `PO PASS`, and HUE `2026-07-23` `MISSING / NOT AUTHORIZED` status remain preserved.

This ticket records three Product Owner-confirmed defects in required handling order. Product Owner accepted Defect 1 as `PO PASS` after technical and runtime pass evidence at baseline `206d64a78ae13ef7bf6dc93bf3a9fce0efc1ee5c`. Product Owner accepted Defect 2 as `COMPLETED / PO PASS` after implementation commit `e8930edd0f30ded7ef8b56be6cede7c2cccb25db`. Defect 3 is now active and authorized for implementation.

## Objective

Remediate the three Product Owner-confirmed Auto Import defects one at a time, preserving accepted Import data and completed ticket closures.

## Ordered Defect Register

| Order | Defect | Status | Current Authorization |
| --- | --- | --- | --- |
| 1 | HUE and TCT login/browser windows are not hidden reliably. | `COMPLETED` | `PO PASS` |
| 2 | Import History does not clearly distinguish HUE imports from TCT imports. | `COMPLETED` | `PO PASS` |
| 3 | Historical Import History row counts are incorrect; many old records show fewer than `34` rows while newer corrected imports count correctly. Reliable HUE source recovery is required where source evidence is authoritative. | `ACTIVE` | `AUTHORIZED FOR IMPLEMENTATION` |

## Current Authorized Defect

Defect 3 is the only authorized implementation scope.

Expected outcome: historical Import History row-count evidence is corrected only within Defect 3 authority, and reliable HUE source recovery is performed only when authoritative evidence supports it.

Executor boundary: primary executor is `Codex` because the active defect concerns Import History database/history evidence, API/service mapping, targeted data correction authority, and validation. Do not infer missing source or row-count evidence from unreliable filename text alone.

## Completed Defects

- Defect 1 is `COMPLETED / PO PASS`.
- Defect 2 is `COMPLETED / PO PASS`.

## In Scope For Defect 3

- Delta-only discovery of historical Import History row-count evidence and reliable HUE source recovery evidence.
- Correction only where Defect 3 authority and repository evidence support safe remediation.
- Preservation of all locked-data restrictions and completed PO PASS states.
- Targeted validation proving corrected history evidence, no unauthorized data/file changes, and no Dashboard impact.

## Out Of Scope

- Reopening or altering `AUTO-IMPORT-007`.
- Modifying HUE `2026-07-18` or `2026-07-19` accepted data.
- Recovering, importing, replacing, investigating, or modifying HUE `2026-07-23`.
- Reopening or altering Defect 1 or Defect 2 accepted behavior.
- Changing product code, tests, database, runtime, Import data, or Dashboard during this documentation-only governance transition commit.
- Automatic scheduling.
- `F1.1`, `F1.2`, or `F4.1` implementation.
- Broad repository audit or unrelated Import redesign.

## Validation Requirements

For this documentation-only governance transition commit:

- Documentation consistency check.
- `git diff --check`.
- Fresh onboarding simulation from `README_AI.md` to this manifest and checkpoint.
- Commit, push to `origin/codex/da-impl-006`, and verify remote commit.

For Defect 3 implementation after activation:

- Targeted technical checks for any changed code/tests.
- Database/history validation proving any corrected historical Import History row-count evidence is authorized, accurate, and bounded.
- Evidence that reliable HUE source recovery uses authoritative evidence and does not guess from filename text alone.
- Evidence that locked data restrictions, physical files, operational Import data, and Dashboard behavior remain preserved unless Defect 3 explicitly authorizes a bounded history correction.
- Product Owner acceptance.

## Completion And Handoff

`AUTO-IMPORT-008` remains active until Defect 3 is handled and receives separate Product Owner `PO PASS`.

After Defect 3 `PO PASS`, this ticket can be closed if no new Product Owner-authorized Auto Import remediation remains.
