# AUTO-IMPORT-009 Manifest

- Ticket ID: `AUTO-IMPORT-009`
- Ticket Name: `Auto Import Browser And DKCL Cleanup Remediation`
- Phase: `Auto Import / Bounded Remediation`
- Current State: `ACTIVE / DEFECT 2 AUTHORIZED`
- Technical Status: `TECHNICAL PASS`
- Runtime Status: `PASS`
- PO UI Check Required: `Yes`
- PO Product Status: `DEFECT 1 PO PASS; DEFECT 2 READY FOR PO CHECK`
- Current Phase: `DEFECT 2 - DKCL DOWNLOADED-ITEM LINK/FILE ENTRY REMOVAL AFTER SAFE CLAIM`
- Last Reviewed Phase: `AUTO-IMPORT-009 DEFECT 1 PO ACCEPTANCE / DEFECT 2 ACTIVATION`
- Last Reviewed Commit: `9b0fc0951b1eb7a2179b64c9daf40d6ca2a6a3b5`
- Phase Review Status: `ACTIVE / AUTHORIZED`
- Next Phase Authorization: `Defect 2 only`
- Activation date: `2026-07-27`
- Primary executor: `Antigravity for real-machine browser/login/re-authentication runtime validation; Codex only for bounded code, service, and targeted test support if assigned`

## Fresh-Chat Onboarding Authority

Required onboarding chain:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
3. `docs/10_TICKETS/AUTO-IMPORT-009_MANIFEST.md`
4. Required Reading from this manifest

Current checkpoint: `docs/06_REVIEWS/Import/AUTO-IMPORT-009_CHECKPOINT_001.md`

Required Reading:

- `docs/06_REVIEWS/Import/AUTO-IMPORT-009_CHECKPOINT_001.md`

## Authority

Product Owner accepted `AUTO-IMPORT-008` Defect 3 as `COMPLETED / PO PASS`, closing `AUTO-IMPORT-008` with all three defects `COMPLETED / PO PASS`.

`AUTO-IMPORT-007` remains closed and must not be reopened or altered. HUE `2026-07-18` and HUE `2026-07-19` remain locked `PO PASS`. HUE `2026-07-23` remains `MISSING / NOT AUTHORIZED`.

This ticket records the remaining Auto Import defects in required handling order. Product Owner accepted Defect 1 as `COMPLETED / PO PASS`. Defect 2 is active and authorized.

## Objective

Remediate the remaining Auto Import defects one at a time, preserving accepted Import data, locked-data restrictions, physical files, Dashboard behavior, and completed ticket closures.

## Ordered Defect Register

| Order | Defect | Status | Current Authorization |
| --- | --- | --- | --- |
| 1 | HUE/TCT browser windows may fail to hide after a new login or re-authentication cycle. | `COMPLETED` | `PO PASS` |
| 2 | After a DKCL download is safely completed, the downloaded-item link/file entry on DKCL is not removed as required. | `ACTIVE` | `AUTHORIZED` |

## Current Authorized Defect

Defect 2 is authorized for implementation: remove the DKCL downloaded-item link/file entry only after the local download has been verified complete and safely claimed.

The implementation must remain delta-only and must prove safe completion/claiming before any DKCL downloaded-item link/file entry removal.

## Completed Defect

Defect 1 is `COMPLETED / PO PASS`.

## Defect 2 Safety Rule

Deletion may occur only after the downloaded local file is verified complete and safely claimed. Never delete on failed, incomplete, uncertain, unverified, or unclaimed download. Do not delete the local downloaded file.

## In Scope For Defect 2

- Delta-only discovery and remediation for DKCL downloaded-item link/file entry removal after safe local download verification and claim.
- Preservation of local downloaded files.
- Targeted validation proving no deletion occurs for failed, incomplete, uncertain, unverified, or unclaimed downloads.
- Documentation of implementation evidence and Product Owner checklist.

## Out Of Scope

- Deleting local downloaded files.
- Removing DKCL downloaded-item links/file entries before local file verification and safe claim.
- Reopening or altering completed Defect 1 behavior.
- Reopening or altering `AUTO-IMPORT-007`.
- Reopening or altering `AUTO-IMPORT-008`.
- Modifying HUE `2026-07-18` or `2026-07-19` accepted data.
- Recovering, importing, replacing, investigating, or modifying HUE `2026-07-23`.
- Reimporting, correcting, or modifying operational Import data, Import History records, database fact rows, physical files, or Dashboard behavior unless explicitly required and authorized by Defect 1 scope.
- Automatic scheduling.
- `F1.1`, `F1.2`, or `F4.1` implementation.
- Broad repository audit or unrelated Import redesign.

## Validation Requirements

For this documentation-only transition commit:

- Documentation consistency check.
- `git diff --check`.
- Fresh onboarding simulation from `README_AI.md` to this manifest and checkpoint.
- Commit, push to `origin/codex/da-impl-006`, and verify remote commit.

For Defect 2 implementation after activation:

- LEVEL 1 targeted validation unless Governance explicitly authorizes broader scope.
- Targeted technical checks for any changed code/tests.
- Evidence that DKCL downloaded-item link/file entry removal happens only after the local download is verified complete and safely claimed.
- Evidence that failed, incomplete, uncertain, unverified, or unclaimed downloads do not trigger deletion.
- Evidence that the local downloaded file is not deleted.
- Evidence that locked data restrictions, operational Import data, Import History records, physical files other than the DKCL page/list entry, and Dashboard behavior remain preserved.
- Product Owner acceptance.

## Completion And Handoff

`AUTO-IMPORT-009` remains active until Defect 2 receives separate Product Owner `PO PASS`.

After Defect 2 `PO PASS`, this ticket can be closed if no new Product Owner-authorized Auto Import remediation remains.
