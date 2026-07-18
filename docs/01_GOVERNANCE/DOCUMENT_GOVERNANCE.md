# DOCUMENT GOVERNANCE

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. Document Governance Principles](#2-document-governance-principles)
- [3. Document Ownership](#3-document-ownership)
- [4. AI Responsibilities](#4-ai-responsibilities)
- [5. Product Owner Responsibilities](#5-product-owner-responsibilities)
- [6. Update Workflow](#6-update-workflow)
- [7. Review Workflow](#7-review-workflow)
- [8. Approval Workflow](#8-approval-workflow)
- [9. Freeze Rules](#9-freeze-rules)
- [10. Change Control](#10-change-control)
- [11. Document Creation Rules](#11-document-creation-rules)
- [12. Document Naming Convention](#12-document-naming-convention)
- [13. Repository Organization](#13-repository-organization)
- [14. Governance Checklist](#14-governance-checklist)
- [15. Document Authority Resolution](#15-document-authority-resolution)
- [16. PO UI Acceptance Governance](#16-po-ui-acceptance-governance)
- [17. Post-Review Remediation Governance](#17-post-review-remediation-governance)

## 1. Purpose

This document defines how project documents in QIS V2 are created, reviewed, frozen, updated, and archived.

Goals:

- preserve SSOT discipline
- keep documentation consistent across phases
- support ChatGPT/Codex handover
- make freeze boundaries explicit
- avoid document drift

## 2. Document Governance Principles

- SSOT is the highest authority for project decisions
- frozen documents must not be changed casually
- documents must have a clear purpose and owner
- update only what is required by the event
- do not mix governance, architecture, UX, and development concerns
- every document must be readable by a new session without chat history
- decisions must be traceable to the Product Owner when applicable

## 3. Document Ownership

| Document Group | Primary Owner | Secondary Reviewer |
| --- | --- | --- |
| SSOT / Decision docs | Product Owner | ChatGPT |
| Architecture docs | ChatGPT | Product Owner |
| UX docs | ChatGPT | Product Owner |
| Planning docs | ChatGPT | Product Owner |
| Development tickets / runtime evidence | Codex | ChatGPT |
| Review docs | ChatGPT | Product Owner |
| Governance / handover docs | ChatGPT | Codex |
| PO UI acceptance workflow | Product Owner | ChatGPT |
| PO findings register | Product Owner | ChatGPT |

Ownership rules:

- Product Owner owns business decisions
- ChatGPT owns structure, continuity, and review framing
- Codex owns implementation evidence
- no document may be updated by a role that does not own its change intent

## 4. AI Responsibilities

### ChatGPT

- maintain project continuity
- synthesize current state from repository docs
- draft governance and handover artifacts
- review architecture, UX, and technical alignment
- propose next steps without changing frozen decisions

### Codex

- implement approved tickets
- produce repository changes
- keep code and docs aligned to frozen contracts
- report runtime and commit evidence

## 5. Product Owner Responsibilities

- approve business decisions
- freeze or unfreeze decision items
- approve architecture and UX changes when required
- accept runtime and review outcomes
- resolve open decision items

## 6. Update Workflow

1. identify trigger event
2. determine affected documents
3. update only the required documents
4. verify consistency with SSOT and frozen docs
5. commit the changes
6. push to GitHub

## 7. Review Workflow

Every doc change must be checked for:

- correctness
- consistency
- completeness
- freeze boundary compliance
- impact on downstream docs

Review outputs may be:

- PASS
- WARNING
- FAIL

When review finds an issue resolvable within the active ticket, ChatGPT/Codex must not stop after reporting the finding. It must immediately generate a remediation prompt for Codex/Antigravity, keep the active ticket current, and require remediation, revalidation, and required PO acceptance before closing or advancing the ticket.

Request a Product Owner decision only when the finding requires a business-rule, SSOT, frozen-behavior, scope, threshold, acceptance, or authority decision.

A failed repository search alone is not sufficient proof that authority does not exist. Authority checks must inspect relevant Governance documents, business-rule sources, shared constants, accepted implementation, API contracts, tests, and Git history before concluding that authority is unavailable.

## 8. Approval Workflow

Approval order:

1. draft changes
2. internal review
3. Product Owner approval if the change affects business, SSOT, or freeze boundaries
4. commit and push
5. publish the updated doc set

## 9. Freeze Rules

- frozen docs are treated as contracts
- any change to a frozen doc must be intentional and approved
- changes to business rules require Product Owner approval
- architecture changes require the corresponding freeze review
- runtime contract changes require downstream compatibility review

## 10. Change Control

If a change is requested:

1. identify the exact document and section
2. determine whether it is frozen
3. determine whether SSOT or business rules are affected
4. determine who must approve
5. update only after approval

## 11. Document Creation Rules

- create documents only when they add governance, clarity, or frozen context
- do not duplicate the same content across multiple docs unless needed by the workflow
- every new document must have a defined scope
- every doc must include a table of contents when it is more than a short note
- use concise, explicit Markdown headings
- create a dedicated authoritative document when a new governance workflow requires its own source of truth

## 12. Document Naming Convention

- use uppercase snake case for governance and handover docs
- use clear center prefixes for architecture docs
- use suffixes that describe the document type:
  - `..._ARCHITECTURE.md`
  - `..._SPECIFICATION.md`
  - `..._REVIEW.md`
  - `..._PLANNING.md`
  - `..._PROTOCOL.md`
  - `..._LIFECYCLE.md`

## 13. Repository Organization

Recommended repository grouping:

- `docs/` for all governance, architecture, UX, planning, and handover documents
- root-level status files for live project state
- development code under source folders only

Principles:

- keep docs discoverable
- avoid hidden or ambiguous file placement
- ensure handover docs are easy to find first

## 14. Governance Checklist

- [ ] Document has a clear purpose
- [ ] Document owner is identifiable
- [ ] Table of contents exists when needed
- [ ] SSOT impact checked
- [ ] Freeze impact checked
- [ ] No business rule drift
- [ ] No architecture drift
- [ ] No status/progress file changed unless required
- [ ] Commit and push completed
- [ ] New session can read the document without chat history

## 15. Document Authority Resolution

### 15.1 Authority Priority

```text
L1
↓
L2
↓
L3
↓
L4
```

### 15.2 Conflict Resolution

If two documents conflict:

1. Prefer the document with the higher Authority Level.
2. If Authority Level is the same, prefer the document with the stronger lifecycle state:
   - Frozen
   - Approved
   - Review
   - Draft

### 15.3 Escalation Rule

If documents have:

- the same Authority Level, and
- the same lifecycle state, and
- different content

then do not decide locally.

Mark the conflict as:

`Product Owner Decision Required`

### 15.4 AI Rule

- ChatGPT must not select a lower-authority document when a higher-authority document exists.
- Codex must not override the authority hierarchy.
- Both AI roles must escalate unresolved conflicts instead of guessing.

## 16. PO UI Acceptance Governance

The authoritative PO UI acceptance workflow is:

- [docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md)

The authoritative PO findings register is:

- [docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md)

Rules:

- PO Product Review PASS belongs to the Product Owner.
- Technical PASS is not Product PASS.
- Runtime PASS is not Product PASS.
- A module cannot be marked completed before the applicable PO gate is satisfied.
- PO findings must be linked to a responsible ticket, recovery ticket, future ticket, or backlog decision.
- The PO findings register is the live traceability record for product observations.

## 17. Post-Review Remediation Governance

The active ticket remains current until review findings within its scope are remediated, revalidated, and accepted through required PO gates.

The next ticket must not be activated before current-ticket PO PASS unless explicit Governance authority permits parallel work.

Responses for post-onboarding continuation, implementation-result review, remediation findings, validation failures, PO handoff, and next-ticket activation must follow the canonical three-part format in `CODEX_PROMPT_STANDARD.md`.
