# AUTO-IMPORT-008 Manifest

- Ticket ID: `AUTO-IMPORT-008`
- Ticket Name: `Auto Import PO Defect Remediation`
- Phase: `Auto Import / Bounded Remediation`
- Current State: `ACTIVE / DEFECT 1 AUTHORIZED`
- Technical Status: `COMPLETED / TECHNICAL PASS`
- Runtime Status: `COMPLETED / RUNTIME PASS`
- PO UI Check Required: `Yes`
- PO Product Status: `READY FOR PO CHECK`
- Current Phase: `DEFECT 1 - HUE/TCT LOGIN WINDOW HIDE RELIABILITY`
- Last Reviewed Phase: `AUTO-IMPORT-008 ACTIVATION`
- Last Reviewed Commit: `this activation commit`
- Phase Review Status: `ACTIVATED`
- Next Phase Authorization: `Defect 1 implementation only`
- Activation date: `2026-07-26`
- Primary executor: `Antigravity for real-machine browser/window runtime; Codex only for bounded code/test support if assigned by ChatGPT coordination`

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

This activation records three Product Owner-confirmed defects in required handling order. Implementation is authorized for Defect 1 only. Defects 2 and 3 are queued and must not be implemented until the immediately prior defect receives separate Product Owner `PO PASS` and the next defect is explicitly activated in governance.

## Objective

Remediate the three Product Owner-confirmed Auto Import defects one at a time, preserving accepted Import data and completed ticket closures.

## Ordered Defect Register

| Order | Defect | Status | Current Authorization |
| --- | --- | --- | --- |
| 1 | HUE and TCT login/browser windows are not hidden reliably. | `ACTIVE` | `AUTHORIZED FOR IMPLEMENTATION` |
| 2 | Import History does not clearly distinguish HUE imports from TCT imports. | `QUEUED` | `NOT AUTHORIZED` |
| 3 | Historical Import History row counts are incorrect; many old records show fewer than `34` rows while newer corrected imports count correctly. | `QUEUED` | `NOT AUTHORIZED` |

## Current Authorized Defect

Defect 1 is the only authorized implementation scope.

Expected outcome: HUE and TCT login/browser windows hide reliably after the operator-visible authenticated/runtime-ready point while preserving browser process, profile, session, HUE/TCT separation, and existing accepted Import behavior.

Executor boundary: primary executor is `Antigravity` because the defect concerns real-machine browser windows, native window visibility, process/HWND behavior, and runtime evidence. If code or tests are needed, ChatGPT coordination may assign a bounded Codex sub-scope, but Defects 2 and 3 remain excluded.

## Queued Defects

Defect 2 remains queued only. Do not change Import History source labeling, metadata display, API shape, database fields, or UI wording for this defect until Defect 1 receives separate Product Owner `PO PASS` and governance activates Defect 2.

Defect 3 remains queued only. Do not investigate, recalculate, backfill, migrate, repair, reimport, or modify historical Import History row counts until Defect 2 receives separate Product Owner `PO PASS` and governance activates Defect 3.

## In Scope For Defect 1

- Delta-only discovery of HUE/TCT login/browser window hide reliability.
- Real-machine runtime evidence for HUE and TCT window visibility behavior.
- Preservation of HUE/TCT account, profile, registry, PID tree, HWND, and session separation.
- Targeted remediation only where required to make browser windows hide reliably.
- Separate Product Owner `PO PASS` for Defect 1 before Defect 2 activation.

## Out Of Scope

- Reopening or altering `AUTO-IMPORT-007`.
- Modifying HUE `2026-07-18` or `2026-07-19` accepted data.
- Recovering, importing, replacing, investigating, or modifying HUE `2026-07-23`.
- Implementing Defect 2 or Defect 3.
- Changing product code, tests, database, runtime, Import data, or Dashboard during this activation commit.
- Automatic scheduling.
- `F1.1`, `F1.2`, or `F4.1` implementation.
- Broad repository audit or unrelated Import redesign.

## Validation Requirements

For this activation commit:

- Documentation consistency check.
- `git diff --check`.
- Fresh onboarding simulation from `README_AI.md` to this manifest and checkpoint.
- Commit, push to `origin/codex/da-impl-006`, and verify remote commit.

For Defect 1 implementation after activation:

- Targeted technical checks for any changed code/tests.
- Real-machine HUE and TCT runtime evidence proving reliable hide behavior.
- Product Owner runtime/UI acceptance.
- Defect 1 cannot close and Defect 2 cannot activate until Product Owner records `PO PASS` for Defect 1.

## Completion And Handoff

`AUTO-IMPORT-008` remains active until all three defects are handled in order and each receives separate Product Owner `PO PASS`.

After Defect 1 `PO PASS`, governance may activate Defect 2 only. After Defect 2 `PO PASS`, governance may activate Defect 3 only. After Defect 3 `PO PASS`, this ticket can be closed if no new Product Owner-authorized Auto Import remediation remains.
