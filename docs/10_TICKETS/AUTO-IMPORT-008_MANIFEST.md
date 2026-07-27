# AUTO-IMPORT-008 Manifest

- Ticket ID: `AUTO-IMPORT-008`
- Ticket Name: `Auto Import PO Defect Remediation`
- Phase: `Auto Import / Bounded Remediation`
- Current State: `ACTIVE / DEFECT 2 AUTHORIZED`
- Technical Status: `DEFECT 2 NOT STARTED`
- Runtime Status: `N/A - DEFECT 2 DOCUMENTED ACTIVATION ONLY`
- PO UI Check Required: `Yes`
- PO Product Status: `DEFECT 1 PO PASS; DEFECT 2 AUTHORIZED FOR IMPLEMENTATION`
- Current Phase: `DEFECT 2 - IMPORT HISTORY SOURCE IDENTIFICATION AND PRESENTATION`
- Last Reviewed Phase: `AUTO-IMPORT-008 DEFECT 1 PO ACCEPTANCE / DEFECT 2 ACTIVATION`
- Last Reviewed Commit: `206d64a78ae13ef7bf6dc93bf3a9fce0efc1ee5c`
- Phase Review Status: `ACTIVATED`
- Next Phase Authorization: `Defect 2 implementation only`
- Activation date: `2026-07-26`
- Primary executor: `Codex for Import History contract/API/UI and targeted tests`

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

This activation records three Product Owner-confirmed defects in required handling order. Product Owner accepted Defect 1 as `PO PASS` after technical and runtime pass evidence at baseline `206d64a78ae13ef7bf6dc93bf3a9fce0efc1ee5c`. Implementation is authorized for Defect 2 only. Defect 3 is queued and must not be investigated or implemented until Defect 2 receives separate Product Owner `PO PASS` and governance explicitly activates Defect 3.

## Objective

Remediate the three Product Owner-confirmed Auto Import defects one at a time, preserving accepted Import data and completed ticket closures.

## Ordered Defect Register

| Order | Defect | Status | Current Authorization |
| --- | --- | --- | --- |
| 1 | HUE and TCT login/browser windows are not hidden reliably. | `COMPLETED` | `PO PASS` |
| 2 | Import History does not clearly distinguish HUE imports from TCT imports. | `ACTIVE` | `AUTHORIZED FOR IMPLEMENTATION` |
| 3 | Historical Import History row counts are incorrect; many old records show fewer than `34` rows while newer corrected imports count correctly. | `QUEUED` | `NOT AUTHORIZED` |

## Current Authorized Defect

Defect 2 is the only authorized implementation scope.

Expected outcome: each Import History record on the WEB clearly presents available source, report type, business date, original filename, standardized filename, status, row counts, and concise evidence/operator message; HUE and TCT records remain distinguishable even when original portal filenames match.

Executor boundary: primary executor is `Codex` because the active defect concerns Import History data contract, API/service mapping, WEB presentation, and targeted tests. Use authoritative stored metadata, queue identity, import evidence, processed path, or accepted source contracts; do not infer HUE/TCT from unreliable filename text alone.

## Queued Defects

Defect 3 remains queued only. Do not investigate, recalculate, backfill, migrate, repair, reimport, or modify historical Import History row counts until Defect 2 receives separate Product Owner `PO PASS` and governance activates Defect 3.

## In Scope For Defect 2

- Delta-only discovery of Import History database/data contract, API/service mapping, WEB UI, existing HUE/TCT source metadata/evidence helpers, targeted tests, and AUTO-IMPORT-008 Governance documents.
- Presentation of source as HUE, TCT, or honest `UNKNOWN` / `CHUA XAC DINH` when reliable historical evidence is unavailable.
- Preservation of original and standardized filename behavior and all existing physical files, processed evidence, archived artifacts, checksums, operational fact data, and accepted Import data.
- Relevant targeted tests and concise PO WEB retest checklist.
- Separate Product Owner `PO PASS` for Defect 2 before Defect 3 activation.

## Out Of Scope

- Reopening or altering `AUTO-IMPORT-007`.
- Modifying HUE `2026-07-18` or `2026-07-19` accepted data.
- Recovering, importing, replacing, investigating, or modifying HUE `2026-07-23`.
- Implementing Defect 3.
- Correcting historical row counts or bulk-updating old Import History records.
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

For Defect 2 implementation after activation:

- Targeted technical checks for any changed code/tests.
- API/UI contract validation for Import History source identification and presentation.
- Evidence that HUE and TCT records are distinguishable, unknown historical source evidence is labeled honestly, existing status and row-count fields are not regressed, physical files are unchanged, and operational fact data is not modified.
- Product Owner WEB acceptance.
- Defect 2 cannot close and Defect 3 cannot activate until Product Owner records `PO PASS` for Defect 2.

## Completion And Handoff

`AUTO-IMPORT-008` remains active until all three defects are handled in order and each receives separate Product Owner `PO PASS`.

After Defect 1 `PO PASS`, governance may activate Defect 2 only. After Defect 2 `PO PASS`, governance may activate Defect 3 only. After Defect 3 `PO PASS`, this ticket can be closed if no new Product Owner-authorized Auto Import remediation remains.
