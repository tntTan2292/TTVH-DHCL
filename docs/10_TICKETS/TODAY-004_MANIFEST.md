# TODAY-004 Ticket Manifest

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

- Ticket ID: `TODAY-004`
- Ticket Name: `Volume Trendline`
- Phase: `Leadership Dashboard Delivery`
- Owner: `Codex`
- Governance Version: `V2 Active`

## 2. Objective

Activate the next leadership dashboard ticket with an authoritative manifest pointer so `PROJECT_SNAPSHOT.md` always resolves to a concrete current manifest URL instead of an ambiguous placeholder.

## 3. Current Status

- Current state: `Governance activation in progress`
- PO UI Check Required: `No`
- PO Product Status: `N/A`
- Current Commit: `8575d7b6ab67f5a19af2e408e044d9143dff1c8b`
- Current Branch: `main`

## 4. Required Reading

Only the following documents are required to continue this ticket:

- [README_AI.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/README_AI.md)
- [docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)
- [docs/10_TICKETS/TODAY-003-R2_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/TODAY-003-R2_MANIFEST.md)
- [docs/09_REPORTS/Documentation/GOVERNANCE_V2_ONBOARDING_VALIDATION.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/09_REPORTS/Documentation/GOVERNANCE_V2_ONBOARDING_VALIDATION.md)
- [docs/10_TICKETS/MANIFEST_TEMPLATE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/MANIFEST_TEMPLATE.md)
- [docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md)

## 5. Business Context

- Business problem: `PROJECT_SNAPSHOT.md` currently exposes an ambiguous `Current Manifest` pointer that breaks deterministic onboarding.
- Business impact: a fresh AI can misread the active ticket scope, fail validation, or require manual clarification before continuing.
- Approved business rule constraints: `PROJECT_SNAPSHOT.Current Manifest` must always be a concrete GitHub Blob URL for the active manifest; placeholder text is forbidden.

## 6. Technical Context

- Relevant frontend files: `N/A`
- Relevant backend files: `N/A`
- Relevant route(s): `N/A`
- Relevant state or contract constraints:
  - `PROJECT_SNAPSHOT.md` is the authoritative live-state SSOT for Governance V2 onboarding
  - the active manifest must be a specific ticket file, not a descriptive label
  - onboarding must continue from `README_AI.md` -> `PROJECT_SNAPSHOT.md` -> current manifest -> required reading

## 7. Runtime Context

- Current runtime endpoint: `N/A`
- Browser origin: `N/A`
- Backend origin: `N/A`
- Observed validation state:
  - snapshot currently points `Current Manifest` to placeholder text
  - validation fails until the active manifest pointer is updated to a GitHub Blob URL

## 8. Related Review

- Review document: `docs/09_REPORTS/Documentation/GOVERNANCE_V2_ONBOARDING_VALIDATION.md`
- Review status: `PASS` for the previous onboarding chain
- Key evidence:
  - onboarding chain is `README_AI.md` -> `PROJECT_SNAPSHOT.md` -> manifest -> required reading
  - current work is to keep that chain deterministic by removing the ambiguous pointer

## 9. Related PO Findings

- PO finding IDs: `N/A`
- Status: `N/A`
- Closure or recheck requirement: none

## 10. Documents To Update

- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/10_TICKETS/TODAY-004_MANIFEST.md`
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md` if manifest inventory must be kept in sync

## 11. Validation

- Technical validation: `PROJECT_SNAPSHOT.md` contains the GitHub Blob URL for `docs/10_TICKETS/TODAY-004_MANIFEST.md`
- Runtime validation: a fresh AI starting from `README_AI.md` can reach the active manifest without guessing
- Browser validation: `N/A`
- Build or lint validation: `N/A`

## 12. Expected Output

- The active manifest pointer is concrete and authoritative
- A fresh AI can onboard without manual repository search
- No placeholder text remains in `PROJECT_SNAPSHOT.Current Manifest`
- Governance V2 onboarding remains deterministic

## 13. Next Ticket

- Next ticket ID: `N/A`
- Next ticket name: `N/A`
- Blockers or handoff notes: this governance activation ticket exists to make the current ticket pointer unambiguous before any downstream work

## 14. PO Acceptance Checklist

PO Acceptance Checklist:

- `N/A`

PO UI Check Required: `No`
Valid outcomes: `PASS`, `WARNING`, `FAIL`

## 15. Authority Escalation

Escalate instead of guessing when:

- `PROJECT_SNAPSHOT.md` conflicts with the manifest pointer
- the manifest would need to contain a descriptive pointer instead of a concrete GitHub Blob URL
- a second source of truth would be introduced for current ticket routing
- a future ticket is referenced without a corresponding manifest file

When escalation is required, stop and reference the authoritative document instead of expanding scope.
