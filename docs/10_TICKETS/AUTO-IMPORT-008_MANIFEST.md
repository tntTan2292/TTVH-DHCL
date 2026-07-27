# AUTO-IMPORT-008 Manifest

- Ticket ID: `AUTO-IMPORT-008`
- Ticket Name: `Auto Import PO Defect Remediation`
- Phase: `Auto Import / Bounded Remediation`
- Current State: `COMPLETED / CLOSED`
- Technical Status: `DEFECT 3 COMPLETED / TECHNICAL PASS`
- Runtime Status: `N/A - API/DB HISTORY VALIDATED`
- PO UI Check Required: `Yes`
- PO Product Status: `DEFECT 1 PO PASS; DEFECT 2 PO PASS; DEFECT 3 PO PASS`
- Current Phase: `TICKET CLOSURE`
- Last Reviewed Phase: `AUTO-IMPORT-008 DEFECT 3 PO ACCEPTANCE / TICKET CLOSURE`
- Last Reviewed Commit: `e194066c72ec6796c2d85c336ff796c27acf9e3c`
- Phase Review Status: `CLOSED / PO PASS`
- Next Phase Authorization: `AUTO-IMPORT-009 Defect 1 only`
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

This ticket records three Product Owner-confirmed defects in required handling order. Product Owner accepted Defect 1 as `PO PASS` after technical and runtime pass evidence at baseline `206d64a78ae13ef7bf6dc93bf3a9fce0efc1ee5c`. Product Owner accepted Defect 2 as `COMPLETED / PO PASS` after implementation commit `e8930edd0f30ded7ef8b56be6cede7c2cccb25db`. Product Owner accepted Defect 3 as `COMPLETED / PO PASS` after implementation commit `e194066c72ec6796c2d85c336ff796c27acf9e3c`.

## Objective

Remediate the three Product Owner-confirmed Auto Import defects one at a time, preserving accepted Import data and completed ticket closures.

## Ordered Defect Register

| Order | Defect | Status | Current Authorization |
| --- | --- | --- | --- |
| 1 | HUE and TCT login/browser windows are not hidden reliably. | `COMPLETED` | `PO PASS` |
| 2 | Import History does not clearly distinguish HUE imports from TCT imports. | `COMPLETED` | `PO PASS` |
| 3 | Historical Import History row counts are incorrect; many old records show fewer than `34` rows while newer corrected imports count correctly. Reliable HUE source recovery is required where source evidence is authoritative. | `COMPLETED` | `PO PASS` |

## Closed Defect 3 Result

Defect 3 is `COMPLETED / PO PASS`.

Technical result: historical HUE source presentation is recovered only where per-import `import_log.total_records` deterministically matches `fact_f13` business-date evidence. Separate same-date TCT `34`-row records remain TCT, unresolved ambiguous low-count rows remain unchanged/UNKNOWN, and synthetic `2098` records are documented as test/anomaly records without guessing.

Dry-run database repair found `55` low-count candidates and `0` authorized deterministic `import_log` row-count writes, so no operational database correction was applied.

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

Defect 3 implementation evidence preserved at closure:

- Targeted technical checks for any changed code/tests.
- Database/history validation proving any corrected historical Import History row-count evidence is authorized, accurate, and bounded.
- Evidence that reliable HUE source recovery uses authoritative evidence and does not guess from filename text alone.
- Evidence that locked data restrictions, physical files, operational Import data, and Dashboard behavior remain preserved unless Defect 3 explicitly authorizes a bounded history correction.
- Product Owner acceptance.

## Completion And Handoff

`AUTO-IMPORT-008` is closed with all three defects `COMPLETED / PO PASS`.

Next active Auto Import ticket: `AUTO-IMPORT-009`.
