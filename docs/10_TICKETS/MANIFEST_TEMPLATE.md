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

When escalation is required, stop and reference the authoritative document instead of expanding scope.
