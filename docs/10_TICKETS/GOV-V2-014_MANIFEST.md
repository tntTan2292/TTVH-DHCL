# GOV-V2-014 Ticket Manifest

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

- Ticket ID: `GOV-V2-014`
- Ticket Name: `Active Manifest Readiness Gate`
- Phase: `Governance V2 Hardening`
- Owner: `Codex`
- Governance Version: `V2 Active`

## 2. Objective

Establish the permanent active manifest readiness gate so future manifests must be migrated and validated before `PROJECT_SNAPSHOT.md` can point to them.

## 3. Current Status

- Current state: `TECHNICAL PASS / REMOTE PUBLISHED / CLOSED`
- PO UI Check Required: `No`
- PO Product Status: `NOT REQUIRED`
- Live mutable state is owned by `PROJECT_SNAPSHOT.md`

## 4. Required Reading

Only the following documents are required to continue this ticket:

- [README_AI.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/README_AI.md)
- [docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)
- [docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md)
- [docs/10_TICKETS/MANIFEST_TEMPLATE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/MANIFEST_TEMPLATE.md)
- [docs/01_GOVERNANCE/DOCUMENT_INDEX.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/DOCUMENT_INDEX.md)
- [docs/01_GOVERNANCE/PROJECT_CONTEXT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_CONTEXT.md)
- [docs/01_GOVERNANCE/PROJECT_HANDOVER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_HANDOVER.md)
- [docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md)
- [docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md)
- [docs/04_TECHNICAL_PLANNING/Backlog/DEVELOPMENT_BACKLOG.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Backlog/DEVELOPMENT_BACKLOG.md)

## 5. Business Context

- Business problem: future active manifests must not be activated unless they already authorize actual implementation or an explicit blocker state.
- Business impact: this prevents fresh AI sessions from stopping at pointer-only manifests or needing manual cleanup before generating the next Codex prompt.
- Approved business rule constraints:
  - manifest validity must be judged before activation
  - mutable live state belongs in `PROJECT_SNAPSHOT.md`
  - legacy or incomplete manifests must be migrated
  - onboarding must remain autonomous after `README_AI.md`

## 6. Technical Context

- Relevant frontend files: `N/A`
- Relevant backend files: `N/A`
- Relevant route(s): `N/A`
- Relevant state or contract constraints:
  - `PROJECT_SNAPSHOT.md` exclusively owns mutable live state
  - `MANIFEST_TEMPLATE.md` must not duplicate mutable current state
  - readiness gate logic belongs to governance documents and manifest standards

## 7. Runtime Context

- Current runtime endpoint: `N/A`
- Browser origin: `N/A`
- Backend origin: `N/A`
- Observed validation state:
  - `GOV-V2-013-R1` was already published
  - the new governance ticket is separate and must not rewrite the completed remediation history

## 8. Related Review

- Review document: `docs/06_REVIEWS/Import/TODAY-004_ACTIVE_MANIFEST_REMEDIATION.md`
- Review status: `Reference`
- Key evidence:
  - active-manifest migration is required when a manifest is pointer-only or stale
  - fresh onboarding must be able to generate the next Codex prompt autonomously

## 9. Related PO Findings

- PO finding IDs: `N/A`
- Status: `N/A`
- Closure or recheck requirement: none

## 10. Documents To Update

- `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
- `docs/10_TICKETS/MANIFEST_TEMPLATE.md`
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md`
- `docs/10_TICKETS/GOV-V2-014_MANIFEST.md`

## 11. Validation

- Technical validation: readiness gate rules appear in both governance and template documents
- Runtime validation: a fresh AI starting from `README_AI.md` can determine when to migrate a manifest before activation
- Browser validation: not applicable
- Build or lint validation: not applicable

## 12. Expected Output

- future manifests must be validated and migrated before activation
- pointer-only or stale manifests cannot become active via `PROJECT_SNAPSHOT.md`
- `PROJECT_SNAPSHOT.md` continues to own mutable live state

## 13. Next Ticket

- Next ticket ID: `TODAY-004`
- Next ticket name: `Volume Trendline`
- Blockers or handoff notes: handoff activated to the already remediated TODAY-004 implementation manifest

## 14. PO Acceptance Checklist

PO Acceptance Checklist:

- `N/A`

PO UI Check Required: `No`
PO Product Status: `NOT REQUIRED`
Valid outcomes: `PASS`, `WARNING`, `FAIL`

## 15. Authority Escalation

Escalate instead of guessing when:

- a proposed manifest is pointer-only, stale, or incomplete
- the active manifest would duplicate live mutable state
- a next ticket manifest cannot support automatic Codex prompt generation
- `PROJECT_SNAPSHOT.md` and the proposed manifest disagree on live state ownership

When escalation is required, stop and reference the authoritative document instead of expanding scope.
