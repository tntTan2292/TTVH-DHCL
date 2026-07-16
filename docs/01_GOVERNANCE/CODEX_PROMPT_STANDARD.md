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

## 2. Canonical Template

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

## 3. Canonical Template Rules

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

## 4. Documentation Requirements

Every prompt generated from this canonical template must preserve documentation synchronization requirements:

- identify all documents affected by the ticket
- update affected documents according to `DOCUMENT_INDEX.md` and `DOCUMENT_GOVERNANCE.md`
- update project control files when the ticket changes current state
- validate the updated documentation set before commit
- commit and push after validation passes

## 5. Output Standard

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
