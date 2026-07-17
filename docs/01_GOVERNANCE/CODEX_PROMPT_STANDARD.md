# Canonical Development Ticket Lifecycle Template

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. Canonical Template](#2-canonical-template)
- [3. Canonical Template Rules](#3-canonical-template-rules)
- [4. Documentation Requirements](#4-documentation-requirements)
- [5. Output Standard](#5-output-standard)

## 1. Purpose

This document is the single canonical template that ChatGPT must use to generate a Development Ticket prompt for Codex after AI onboarding PASS.

It standardizes:

- ticket lifecycle
- prompt structure
- documentation synchronization expectations
- validation, commit, and push requirements
- mandatory handoff completion requirements

## 2. TICKET HANDOFF WORKFLOW

Every ticket prompt must make ticket completion self-contained.

The mandatory lifecycle is:

`ACTIVE` -> `IMPLEMENTED` -> `VALIDATED` -> `PO PASS when required` -> `CLOSED` -> `NEXT TICKET ACTIVATED` -> `REMOTE PUBLISHED` -> `FRESH ONBOARDING PASS`

Completion rule:

- a ticket is not done until all applicable handoff steps pass
- technical completion alone is insufficient
- local completion without remote publication is insufficient

## 3. MANDATORY HANDOFF

Codex must perform all applicable actions before reporting completion:

- update the current ticket document and manifest status
- record validation and PO status
- close related PO findings when authorized
- identify the next ticket from the current manifest or roadmap
- create the next manifest if it does not exist
- ensure the next manifest contains actual implementation authority and not only pointer-activation scope
- update `PROJECT_SNAPSHOT`:
  - Current Ticket
  - Current Manifest
  - Current Commit according to the repository convention
  - Current Phase if changed
- register new documents in `DOCUMENT_INDEX`
- commit using One Ticket = One Commit
- push to `origin/main`
- verify the remote commit and all required GitHub Blob URLs
- run a fresh onboarding simulation starting only from `README_AI.md`
- confirm that the fresh AI can reach the active manifest, read Required Reading, and generate the next Codex prompt without repository search, guessing, or user clarification

## 4. FINALIZATION AND HANDOFF

Do not report the ticket as complete until:

- implementation and validation are complete
- governance state is synchronized
- the next ticket is activated
- changes are pushed
- remote URLs are verified
- fresh onboarding passes

If the next ticket is not yet sufficiently defined by authoritative SSOT:

- do not invent business rules
- create a blocker manifest for the next ticket
- set its status to `BLOCKED BY SSOT`
- list the exact missing decisions
- update `PROJECT_SNAPSHOT` to that blocker manifest
- publish it remotely
- ensure fresh onboarding explains the blocker precisely

## 5. ACTIVE MANIFEST READINESS GATE

Before activating a next ticket, Codex must inspect the proposed manifest even when the file already exists.

A manifest is not valid merely because:

- its file exists
- it is registered in `DOCUMENT_INDEX`
- `PROJECT_SNAPSHOT` points to it
- its ticket name matches the roadmap

Codex must migrate an existing manifest before activation when it:

- was created under an older Governance standard
- contains Governance pointer-activation scope instead of actual ticket scope
- duplicates stale mutable state
- lacks sufficient Required Reading
- lacks implementation authority
- lacks an explicit authoritative blocker state
- cannot support automatic Codex prompt generation

Readiness before activation:

- describes the actual active ticket
- contains sufficient implementation authority or an explicit blocker state
- contains concrete, accessible GitHub Blob URLs
- references authoritative business-rule sources
- defines In Scope and Out of Scope
- defines technical, runtime, testing, documentation, PO, completion, and handoff requirements
- identifies the next ticket from an authoritative roadmap
- does not require repository searching, guessing, or user clarification
- passes fresh onboarding validation

Mutable live state ownership:

- `PROJECT_SNAPSHOT.md` exclusively owns mutable current project state, including Current Phase, Current Ticket, Current Manifest, Current Commit, Current Branch, current PO Status, and live next-ticket routing
- manifest templates must reference `PROJECT_SNAPSHOT.md` for mutable live state
- historical commit evidence may remain only when clearly identified as immutable implementation or validation evidence

Mandatory handoff migration check:

1. Identify the authoritative next ticket.
2. Locate or create its manifest.
3. Validate it against the current manifest standard.
4. Migrate it when legacy or incomplete.
5. Confirm actual implementation authority or an explicit blocker state.
6. Update `PROJECT_SNAPSHOT`.
7. Update `DOCUMENT_INDEX` when applicable.
8. Commit and push to `origin/main`.
9. Verify the remote commit and Blob URLs.
10. Run fresh onboarding from `README_AI.md`.
11. Confirm the fresh AI automatically generates the next Codex prompt.

The current ticket must not be reported complete when any applicable step fails.

## 6. POST-ONBOARDING BEHAVIOR

When onboarding PASS completes, Codex behavior depends on the active manifest:

- if the active manifest authorizes implementation and no governance blocker exists, Codex must immediately generate the implementation prompt output without waiting for another user request
- if the manifest explicitly indicates `BLOCKED`, `WAITING FOR PO`, `WAITING FOR SSOT`, `WAITING FOR REQUIREMENT`, or another governance-defined blocking state, Codex may stop after explaining the blocker precisely
- post-onboarding autonomy is governed by repository documentation, not chat history

The required autonomous output is:

- `### Kết quả`
- `### Phương án`
- `### Prompt cho Codex`

## 7. Canonical Template

```text
PROJECT

TTVH QUALITY INTELLIGENCE SYSTEM (QIS V2)

PHASE

[Current Phase]

TICKET

[Current Ticket]

==========================================================

CURRENT PROJECT STATE

Current Phase:
[Current Phase]

Current Ticket:
[Current Ticket]

Development Status:
[Development Status]

Documentation Status:
[Documentation Status]

PO UI Check Required:
[Yes / No]

Decision reason:
[Why PO UI check is or is not required]

==========================================================

REQUIRED READING

- [README_AI.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/README_AI.md)
- [docs/01_GOVERNANCE/MASTER_START_PROMPT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/MASTER_START_PROMPT.md)
- [docs/01_GOVERNANCE/AI_COLLABORATION_PROTOCOL.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/AI_COLLABORATION_PROTOCOL.md)
- [docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md)
- [docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md)
- [docs/01_GOVERNANCE/DOCUMENT_GOVERNANCE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/DOCUMENT_GOVERNANCE.md)
- [docs/01_GOVERNANCE/DOCUMENT_INDEX.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/DOCUMENT_INDEX.md)
- [docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md)
- [PROJECT_STATUS.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/PROJECT_STATUS.md)
- [PROJECT_PROGRESS.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/PROJECT_PROGRESS.md)

==========================================================

CURRENT CONTEXT

[Project context relevant to the ticket]

==========================================================

OBJECTIVE

[Ticket objective]

==========================================================

SCOPE

[In-scope work only]

==========================================================

OUT OF SCOPE

[Explicit exclusions]

==========================================================

IMPLEMENTATION RULES

[Rules for Codex execution]

==========================================================

VALIDATION

[Validation criteria]

==========================================================

DOCUMENTATION SYNCHRONIZATION

After completing the ticket, Codex must:

- identify all documents affected by the ticket
- update documents according to the approved Documentation Architecture
- update PROJECT_PROGRESS if ticket progress or current phase changes
- update PROJECT_STATUS if project status changes
- update PROJECT_HANDOVER if current ticket or project snapshot changes
- update PROJECT_CONTEXT if current context changes
- when PO UI Check Required = Yes, follow `docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md`
- when PO findings exist, update `docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md`
- update the correct document layers according to DOCUMENT_INDEX and DOCUMENT_GOVERNANCE:
  - 01_GOVERNANCE
  - 02_ARCHITECTURE
  - 03_UX
  - 04_TECHNICAL_PLANNING
  - 05_DEVELOPMENT
  - 06_REVIEWS
  - 07_REFERENCE
  - 08_ARCHIVE
  - 09_REPORTS

==========================================================

SELF VALIDATION

[Self-check required before commit]

==========================================================

COMMIT

[Commit instructions]

==========================================================

PUSH

[Push instructions]

==========================================================

REPORT

Files changed

Business impact

Development summary

Technical validation

Validation result

Runtime acceptance

PO UI Check Required

PO UI Acceptance Notice, when required

PO UI ACCEPTANCE REQUIRED

PO Check Status:
READY FOR PO CHECK

Affected Module:
[Module name]

Affected Screen:
[Screen name]

Menu Path:
[Exact navigation path]

Route / URL:
[Exact route or URL]

Required Test Context:
- Date or date range
- KPI
- BCVH
- Route
- Shipment
- User role
- Other required parameters

What Changed:
[Visible changes implemented by the ticket]

Expected Result:
[What the PO should see if implementation is correct]

Business Result:
[What the feature now enables the user or leadership to do]

PO Check Steps:
1. ...
2. ...
3. ...

PO Acceptance Checklist:
- [ ] Navigation works
- [ ] Correct context is preserved
- [ ] Correct runtime data is displayed
- [ ] UI order and labels are understandable
- [ ] Loading state works
- [ ] Empty state works
- [ ] Error state works
- [ ] No shell/demo/placeholder content remains
- [ ] Business behavior matches the expected result
- [ ] The feature is usable for the intended decision or operation

Known Warnings:
[List warnings or None]

Blocking Rule:
[State whether the next ticket or module is blocked until PO acceptance]

PO Response Required:
PASS / WARNING / FAIL

Related PO findings

Git status

Documentation updated

Current Project State updated

Commit hash

GitHub Commit URL

GitHub Blob URL

==========================================================

NEXT PROJECT STATE

If Ticket PASS

↓

[Next Ticket]

If Ticket FAIL

↓

Stop.

If PO UI Check Required = Yes, the ticket is not `Module Completed` until the applicable PO gate is satisfied.
```

## 8. Canonical Template Rules

- ChatGPT must copy this canonical template for every Development Ticket prompt after AI onboarding PASS.
- Only the following placeholders may change:
  - Current Phase
  - Current Ticket
  - Development Status
  - Documentation Status
  - Project context relevant to the ticket
  - Ticket objective
  - In-scope work only
  - Explicit exclusions
  - Rules for Codex execution
  - Validation criteria
  - Self-check required before commit
  - Commit instructions
  - Push instructions
  - Next Ticket
- ChatGPT must not add new sections.
- ChatGPT must not remove sections.
- ChatGPT must not rename sections.
- ChatGPT must not reorder sections.
- ChatGPT must not invent a different prompt structure.

## 9. Documentation Requirements

Every prompt generated from this canonical template must preserve documentation synchronization requirements:

- identify all documents affected by the ticket
- update affected documents according to `DOCUMENT_INDEX.md` and `DOCUMENT_GOVERNANCE.md`
- update project control files when the ticket changes current state
- validate the updated documentation set before commit
- commit and push after validation passes

## 10. Output Standard

Every Codex execution report generated from this template must include:

- Files changed
- Business impact
- Development summary
- Validation result
- Documentation updated
- Current Project State updated
- Commit hash
- GitHub Commit URL
- GitHub Blob URL
