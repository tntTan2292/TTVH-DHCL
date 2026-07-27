# AUTO-IMPORT-009 Manifest

- Ticket ID: `AUTO-IMPORT-009`
- Ticket Name: `Auto Import Browser And DKCL Cleanup Remediation`
- Phase: `Auto Import / Bounded Remediation`
- Current State: `ACTIVE / DEFECT 1 AUTHORIZED`
- Technical Status: `NOT STARTED`
- Runtime Status: `N/A - ACTIVATION ONLY`
- PO UI Check Required: `Yes`
- PO Product Status: `DEFECT 1 AUTHORIZED; DEFECT 2 QUEUED / NOT AUTHORIZED`
- Current Phase: `DEFECT 1 - HUE/TCT BROWSER WINDOW HIDE RELIABILITY AFTER NEW LOGIN OR RE-AUTHENTICATION`
- Last Reviewed Phase: `AUTO-IMPORT-008 CLOSURE / AUTO-IMPORT-009 ACTIVATION`
- Last Reviewed Commit: `e194066c72ec6796c2d85c336ff796c27acf9e3c`
- Phase Review Status: `ACTIVE / AUTHORIZED`
- Next Phase Authorization: `Defect 1 only`
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

This ticket records the remaining Auto Import defects in required handling order. Defect 1 is authorized. Defect 2 is queued and not authorized.

## Objective

Remediate the remaining Auto Import defects one at a time, preserving accepted Import data, locked-data restrictions, physical files, Dashboard behavior, and completed ticket closures.

## Ordered Defect Register

| Order | Defect | Status | Current Authorization |
| --- | --- | --- | --- |
| 1 | HUE/TCT browser windows may fail to hide after a new login or re-authentication cycle. | `ACTIVE` | `AUTHORIZED` |
| 2 | After a DKCL download is safely completed, the downloaded-item link/file entry on DKCL is not removed as required. | `QUEUED` | `NOT AUTHORIZED` |

## Current Authorized Defect

Defect 1 is authorized for implementation: HUE/TCT browser windows may fail to hide after a new login or re-authentication cycle.

The implementation must remain delta-only and must prove the hide reliability behavior across the relevant HUE/TCT browser/login/re-authentication lifecycle without reopening completed ticket scope.

## Queued Defect

Defect 2 remains `QUEUED / NOT AUTHORIZED`.

Safety rule for Defect 2: deletion may occur only after the downloaded local file is verified complete and safely claimed; never delete on failed, incomplete, or uncertain download.

## In Scope For Defect 1

- Delta-only discovery and remediation for HUE/TCT browser-window hide reliability after new login or re-authentication.
- Preservation of HUE/TCT source isolation.
- Targeted validation appropriate for real-machine browser/window behavior.
- Documentation of implementation evidence and Product Owner checklist.

## Out Of Scope

- Implementing Defect 2 or deleting DKCL downloaded-item links/file entries.
- Reopening or altering `AUTO-IMPORT-007`.
- Reopening or altering `AUTO-IMPORT-008`.
- Modifying HUE `2026-07-18` or `2026-07-19` accepted data.
- Recovering, importing, replacing, investigating, or modifying HUE `2026-07-23`.
- Reimporting, correcting, or modifying operational Import data, Import History records, database fact rows, physical files, or Dashboard behavior unless explicitly required and authorized by Defect 1 scope.
- Automatic scheduling.
- `F1.1`, `F1.2`, or `F4.1` implementation.
- Broad repository audit or unrelated Import redesign.

## Validation Requirements

For this documentation-only activation commit:

- Documentation consistency check.
- `git diff --check`.
- Fresh onboarding simulation from `README_AI.md` to this manifest and checkpoint.
- Commit, push to `origin/codex/da-impl-006`, and verify remote commit.

For Defect 1 implementation after activation:

- LEVEL 1 targeted validation unless Governance explicitly authorizes broader scope.
- Targeted technical checks for any changed code/tests.
- Real-machine or equivalent reliable evidence that HUE/TCT browser windows hide correctly after new login or re-authentication.
- Evidence that HUE/TCT source isolation remains preserved.
- Evidence that locked data restrictions, physical files, operational Import data, Import History records, and Dashboard behavior remain preserved.
- Product Owner acceptance.

## Completion And Handoff

`AUTO-IMPORT-009` remains active until Defect 1 receives separate Product Owner `PO PASS`.

Defect 2 must remain queued/not authorized until Product Owner separately activates it.
