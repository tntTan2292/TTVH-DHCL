# Ticket Manifest Template

## Table of Contents

- [1. Ticket Information](#1-ticket-information)
- [2. Objective](#2-objective)
- [3. Current Status](#3-current-status)
- [4. Required Reading](#4-required-reading)
- [5. Business Context](#5-business-context)
- [6. Technical Context](#6-technical-context)
- [7. Runtime Context](#7-runtime-context)
- [8. Related Review](#8-related-review)
- [9. Related PO Findings](#9-related-po-findings)
- [10. Documents To Update](#10-documents-to-update)
- [11. Validation](#11-validation)
- [12. Expected Output](#12-expected-output)
- [13. Next Ticket](#13-next-ticket)
- [14. PO Acceptance Checklist](#14-po-acceptance-checklist)
- [15. Authority Escalation](#15-authority-escalation)

## 1. Ticket Information

- Ticket ID:
- Ticket Name:
- Phase:
- Owner:
- Governance Version:

## 2. Objective

- Single-sentence objective for the ticket.

## 2.1 Ticket Handoff Workflow

- A ticket is not complete until the handoff workflow is finished.
- Technical completion alone is insufficient.
- If the ticket introduces a next ticket, the next ticket manifest must be created and activated before closure.

## 2.2 Mandatory Handoff

Before reporting completion, Codex must:

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

## 2.3 Finalization And Handoff

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

## 3. Current Status

- Current state:
- PO UI Check Required:
- PO Product Status:
- Current Commit:
- Current Branch:

## 4. Required Reading

List only the documents directly relevant to this ticket.

- `README_AI.md`
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/01_GOVERNANCE/CODEX_DOCUMENTATION_STANDARD.md` when the ticket changes documentation workflow
- active ticket review document
- related PO findings register rows or closure docs
- any ticket-specific implementation or evidence docs

## 5. Business Context

- Business problem:
- Business impact:
- Approved business rule constraints:

## 6. Technical Context

- Relevant frontend files:
- Relevant backend files:
- Relevant route(s):
- Relevant state or contract constraints:

## 7. Runtime Context

- Current runtime endpoint:
- Browser origin:
- Backend origin:
- Observed validation state:

## 8. Related Review

- Review document:
- Review status:
- Key evidence:

## 9. Related PO Findings

- PO finding IDs:
- Status:
- Closure or recheck requirement:

## 10. Documents To Update

- Required updates for this ticket:
- `docs/01_GOVERNANCE/CODEX_DOCUMENTATION_STANDARD.md` if the ticket changes Codex documentation workflow

## 11. Validation

- Technical validation:
- Runtime validation:
- Browser validation:
- Build or lint validation:

## 12. Expected Output

- What the ticket must achieve:
- What must remain unchanged:
- What must not be introduced:

## 13. Next Ticket

- Next ticket ID:
- Next ticket name:
- Blockers or handoff notes:

## 14. PO Acceptance Checklist

If `PO UI Check Required = Yes`, include or link the ticket-specific PO acceptance checklist here.

- Checklist document:
- PO purpose:
- Screen URL:
- Data conditions:
- Step-by-step checks:
- PASS / WARNING / FAIL criteria:
- Follow-up action after PASS:
- Follow-up action after WARNING:
- Follow-up action after FAIL:
- Documents to update per result:

## 15. Authority Escalation

Escalate instead of guessing when:

- the manifest conflicts with `PROJECT_SNAPSHOT.md`
- a higher-authority document exists
- a frozen document or SSOT would need to change
- the ticket scope is unclear
- the update would add a second source of truth
- the next ticket is not yet sufficiently defined by authoritative SSOT

When escalation is required, stop and reference the authoritative document instead of expanding scope.
