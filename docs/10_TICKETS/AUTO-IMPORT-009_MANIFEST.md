# AUTO-IMPORT-009 Manifest

- Ticket ID: `AUTO-IMPORT-009`
- Ticket Name: `Auto Import Browser And DKCL Cleanup Remediation`
- Phase: `Auto Import / Bounded Remediation`
- Current State: `REACTIVATED / READY FOR PO CHECK`
- Technical Status: `TECHNICAL PASS`
- Runtime Status: `TARGETED TECHNICAL PASS; PO CHECK REQUIRED`
- PO UI Check Required: `Yes`
- PO Product Status: `DEFECT 1 PO PASS; DEFECT 2 NOT PO PASS; TCT WINDOW-HIDE REMEDIATION READY FOR PO CHECK`
- Current Phase: `BOUNDED REMEDIATION REACTIVATED`
- Last Reviewed Phase: `AUTO-IMPORT-009 TCT WINDOW-HIDE FAILURE DATA-FINALIZATION REMEDIATION`
- Last Reviewed Commit: `d0ea458bc042c26bea6d048bfce527b245960622`
- Phase Review Status: `READY FOR PO CHECK`
- Next Phase Authorization: `Return to DA-IMPL-008 only after Product Owner check/decision`
- Activation date: `2026-07-27`
- Primary executor: `Antigravity for real-machine browser/login/re-authentication runtime validation; Codex only for bounded code, service, and targeted test support if assigned`

## Fresh-Chat Onboarding Authority

Required onboarding chain:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
3. `docs/10_TICKETS/AUTO-IMPORT-009_MANIFEST.md`
4. Required Reading from this manifest

Current checkpoint: `docs/06_REVIEWS/Import/AUTO-IMPORT-009_CHECKPOINT_002.md`

Required Reading:

- `docs/06_REVIEWS/Import/AUTO-IMPORT-009_CHECKPOINT_002.md`

## Authority

Product Owner accepted `AUTO-IMPORT-008` Defect 3 as `COMPLETED / PO PASS`, closing `AUTO-IMPORT-008` with all three defects `COMPLETED / PO PASS`.

`AUTO-IMPORT-007` remains closed and must not be reopened or altered. HUE `2026-07-18` and HUE `2026-07-19` remain locked `PO PASS`. HUE `2026-07-23` remains `MISSING / NOT AUTHORIZED`.

Additional Product Owner decision on `2026-07-27`: temporarily pause `DA-IMPL-008` and reactivate `AUTO-IMPORT-009` for one bounded TCT defect only. Prevent `TCT_WINDOW_HIDE_FAILED` from marking an otherwise completed TCT import as `FAILED` when database import, `34/34` ranked units, portal cleanup, and Processed-file retention already succeeded.

This ticket records Auto Import remediation history and the current bounded reactivation. Product Owner accepted Defect 1 as `COMPLETED / PO PASS`; the new `2026-07-27` reactivation is limited to preventing a later TCT window-hide operational failure from overturning already completed TCT data finalization. Defect 2 remains not accepted as `PO PASS`.

## Objective

Remediate the remaining Auto Import defects one at a time, preserving accepted Import data, locked-data restrictions, physical files, Dashboard behavior, and completed ticket closures.

## Ordered Defect Register

| Order | Defect | Status | Current Authorization |
| --- | --- | --- | --- |
| 1 | HUE/TCT browser windows may fail to hide after a new login or re-authentication cycle. | `COMPLETED` | `PO PASS` |
| 2 | After a DKCL download is safely completed, the downloaded-item link/file entry on DKCL is not removed as required. | `DEFERRED / NOT RESOLVED` | `NOT PO PASS` |

## Reactivated Item

Exact reactivated item: TCT window-hide failure must be recorded separately as an operational warning after completed import data is finalized.

Preserved evidence: import, portal cleanup, WEB cleanup status, and local Processed retention pass.

Retry rule: retry window hiding only; never re-import already completed TCT data for this warning.

`AUTO-IMPORT-009` Defect 2 must not be recorded as `PO PASS`.

## Completed Defect

Defect 1 is `COMPLETED / PO PASS`.

## Preserved Defect 2 Safety Rule

Deletion may occur only after the downloaded local file is verified complete and safely claimed. Never delete on failed, incomplete, uncertain, unverified, or unclaimed download. Do not delete the local downloaded file.

## Out Of Scope

- Deleting local downloaded files.
- Further AUTO-IMPORT-009 remediation until separately reauthorized.
- Recording Defect 2 as Product Owner `PO PASS`.
- Removing DKCL downloaded-item links/file entries before local file verification and safe claim.
- Reopening or altering completed Defect 1 behavior.
- Reopening or altering `AUTO-IMPORT-007`.
- Reopening or altering `AUTO-IMPORT-008`.
- Modifying HUE `2026-07-18` or `2026-07-19` accepted data.
- Recovering, importing, replacing, investigating, or modifying HUE `2026-07-23`.
- Reimporting, correcting, or modifying operational Import data, Import History records, database fact rows, physical files, or Dashboard behavior.
- Automatic scheduling.
- `F1.1`, `F1.2`, or `F4.1` implementation.
- Broad repository audit or unrelated Import redesign.

## Validation Requirements

For this bounded reactivation:

- LEVEL 1 targeted service validation.
- Documentation consistency check.
- `git diff --check`.
- Fresh onboarding simulation from `README_AI.md` to this manifest and checkpoint.
- Commit, push to `origin/codex/da-impl-006`, and verify remote commit.

## Completion And Handoff

`AUTO-IMPORT-009` is `READY FOR PO CHECK` for the bounded TCT data-finalization/window-hide-warning remediation.

Do not award Product Owner `PASS`. After Product Owner check/decision, return priority to `DA-IMPL-008` unless the Product Owner gives a different explicit decision.
