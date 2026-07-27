# AUTO-IMPORT-009 Manifest

- Ticket ID: `AUTO-IMPORT-009`
- Ticket Name: `Auto Import Browser And DKCL Cleanup Remediation`
- Phase: `Auto Import / Bounded Remediation`
- Current State: `DEFERRED / NOT RESOLVED`
- Technical Status: `PARTIAL PASS / DEFERRED`
- Runtime Status: `PARTIAL PASS / DEFERRED`
- PO UI Check Required: `Yes`
- PO Product Status: `DEFECT 1 PO PASS; DEFECT 2 NOT PO PASS; TCT WINDOW-HIDE DEFERRED / NOT RESOLVED`
- Current Phase: `PRIORITY DEFERRED`
- Last Reviewed Phase: `AUTO-IMPORT-009 PRIORITY DEFERRAL`
- Last Reviewed Commit: `2733184121e057a1c85610c20577aec1a5704e1a`
- Phase Review Status: `DEFERRED / NOT RESOLVED`
- Next Phase Authorization: `None; priority moved to DA-IMPL-008`
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

This ticket records the remaining Auto Import defects in required handling order. Product Owner accepted Defect 1 as `COMPLETED / PO PASS`. Product Owner stopped further remediation of the TCT window-hide issue for now and did not accept Defect 2 as `PO PASS`.

## Objective

Remediate the remaining Auto Import defects one at a time, preserving accepted Import data, locked-data restrictions, physical files, Dashboard behavior, and completed ticket closures.

## Ordered Defect Register

| Order | Defect | Status | Current Authorization |
| --- | --- | --- | --- |
| 1 | HUE/TCT browser windows may fail to hide after a new login or re-authentication cycle. | `COMPLETED` | `PO PASS` |
| 2 | After a DKCL download is safely completed, the downloaded-item link/file entry on DKCL is not removed as required. | `DEFERRED / NOT RESOLVED` | `NOT PO PASS` |

## Deferred Item

Further remediation of the TCT window-hide issue is stopped for now.

Exact deferred item: TCT window may remain visible after re-authentication.

Preserved evidence: import, portal cleanup, WEB cleanup status, and local Processed retention pass.

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

For this documentation-only priority transition commit:

- Documentation consistency check.
- `git diff --check`.
- Fresh onboarding simulation from `README_AI.md` to this manifest and checkpoint.
- Commit, push to `origin/codex/da-impl-006`, and verify remote commit.

## Completion And Handoff

`AUTO-IMPORT-009` is `DEFERRED / NOT RESOLVED`.

Current priority moved to `DA-IMPL-008`.
