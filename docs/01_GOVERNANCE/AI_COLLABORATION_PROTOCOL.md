# AI COLLABORATION PROTOCOL

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. Roles](#2-roles)
- [3. Standard Workflow](#3-standard-workflow)
- [4. Development Workflow](#4-development-workflow)
- [5. Review Workflow](#5-review-workflow)
- [6. Ticket Rules](#6-ticket-rules)
- [7. Architecture Protection Rules](#7-architecture-protection-rules)
- [8. Runtime Rules](#8-runtime-rules)
- [9. Context Rules](#9-context-rules)
- [10. Communication Rules](#10-communication-rules)
- [11. Handover Rules](#11-handover-rules)
- [12. Golden Rules](#12-golden-rules)
- [13. Ticket Completion Protocol](#13-ticket-completion-protocol)
- [14. Prompt Standard](#14-prompt-standard)
- [15. Product Owner to ChatGPT Collaboration Workflow](#15-product-owner-to-chatgpt-collaboration-workflow)
- [16. PO UI Acceptance Gate](#16-po-ui-acceptance-gate)

## 1. Purpose

AI Collaboration Protocol defines how Product Owner, ChatGPT, and Codex work together across the full lifecycle of QIS V2.

Purpose:

- keep decisions consistent
- preserve SSOT and frozen architecture
- prevent scope drift
- ensure ticket-by-ticket execution
- maintain continuity across handovers

## 2. Roles

### Product Owner

- decides business direction
- approves or rejects proposals
- prioritizes roadmap
- freezes business decisions
- gives final acceptance

### ChatGPT

- Chief Solution Architect
- Product Architect
- Business Architect
- Technical Auditor
- Reviewer
- Designer
- Coordinator

ChatGPT responsibilities:

- preserve project context
- translate PO intent into structured requirements
- review architecture, UX, and technical consistency
- identify gaps, risks, and technical debt
- ensure continuity for new sessions

### Codex

- Implementation Engineer
- executes only approved tickets
- does not change architecture by itself
- does not change business by itself
- does not invent new scope
- reports runtime and implementation results

## 3. Standard Workflow

Business Discussion

↓

Architecture

↓

UX

↓

Technical Planning

↓

Development

↓

Review

↓

Next Ticket

This workflow is sequential and must not be bypassed unless the Product Owner explicitly changes the process.

## 4. Development Workflow

Each center must be delivered in the following order:

Shell

↓

Widgets

↓

Runtime

↓

Review PASS

↓

Next Center

Rules:

- Shell establishes structure and orchestration
- Widgets add the visual and component layer
- Runtime binds live data and context
- Review confirms readiness before moving forward

## 5. Review Workflow

ChatGPT reviews:

- Architecture
- Runtime
- UX
- Context Propagation
- Technical Debt
- PASS / WARNING / FAIL

Codex must not self-declare PASS for the project lifecycle unless the accepted runtime and review evidence support it.

Review principle:

- PO owns final acceptance
- ChatGPT owns structured review
- Codex owns implementation evidence

## 6. Ticket Rules

Every ticket must include:

- Goal
- Scope
- Runtime Acceptance
- Risk
- Commit
- Push

Additional rules:

- One Bug = One Ticket = One Commit
- no hidden scope expansion
- no unrelated refactor
- no cross-center rewriting
- keep ticket boundaries strict

## 7. Architecture Protection Rules

The following must not be changed without explicit Product Owner approval:

- SSOT
- EIDAF
- Information Architecture
- Widget Specification
- Screen Architecture
- UX Architecture
- Cross Center Interaction
- Design System

If a change affects frozen architecture, it must be treated as a decision item, not a code convenience.

## 8. Runtime Rules

- Widget does not call API
- Widget does not parse URL
- Widget only receives props
- Runtime lives only in the orchestration page
- Adapter / context / API mapping belongs to orchestration layer
- Business calculations stay in approved runtime or backend layers

## 9. Context Rules

Project context must flow across:

Dashboard

↓

BCVH

↓

Route

↓

Shipment

↓

Evidence

↓

Action

Context fields to preserve when applicable:

- `from_date`
- `to_date`
- `interval`
- `bcvh_id`
- `bcvh_name`
- `route_id`
- `shipment_id`
- `search`
- `sort`
- `order`

Rules:

- do not lose context
- do not rename context silently
- do not reset parent context in child screens
- do not overwrite unrelated filters
- preserve back-navigation state

## 10. Communication Rules

Codex must report using the standard format required by the project.

ChatGPT must:

- review before issuing the next ticket when review is required
- keep the conversation anchored to SSOT and frozen documents
- avoid inventing new business rules

Product Owner must:

- approve business changes
- approve architecture freezes
- approve ticket scope changes

## 11. Handover Rules

One conversation serves one ticket or one major delivery wave. Continue remediation and validation for the same bounded ticket or wave in the current conversation. Start a new conversation for a new ticket, a new major wave, or materially different work scope.

ChatGPT, Codex, and Antigravity must proactively warn the Product Owner when the current conversation is excessively long, contains multiple completed phases, or risks mixing obsolete and current authority. Each executor must clearly state when the current conversation should end and a fresh one should begin.

Before changing conversations, update required repository evidence, commit, push, and verify the remote state. Do not open a new conversation to bypass unfinished work, failures, dirty workspace, locks, or a wrong branch.

When moving to a new ChatGPT session, it must read:

1. [README_AI.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/README_AI.md)
2. [docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)
3. Current Manifest referenced by `PROJECT_SNAPSHOT.md`
4. Only the Required Reading listed in the manifest
5. [docs/01_GOVERNANCE/CODEX_DOCUMENTATION_STANDARD.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/CODEX_DOCUMENTATION_STANDARD.md) when documentation workflow rules are needed
6. [docs/01_GOVERNANCE/PROJECT_HANDOVER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_HANDOVER.md) when narrative or continuity is needed
7. [docs/01_GOVERNANCE/PROJECT_CONTEXT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_CONTEXT.md) when governance context is needed
8. [docs/01_GOVERNANCE/AI_COLLABORATION_PROTOCOL.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/AI_COLLABORATION_PROTOCOL.md) when protocol details are needed

The new session must not rely on chat memory as the source of truth.
Repository Governance is authoritative; conversation history is temporary working context. Do not copy full historical conversations into a new session.
Carry only repository, branch, active ticket or wave, and Product Owner decisions not yet stored in the repository.
Governance V1 remains the fallback authority path when the manifest requires it or when authority conflicts need escalation.

## 12. Golden Rules

1. SSOT is the final reference for project decisions.
2. Runtime acceptance is stronger than visual assumptions.
3. No business change without PO approval.
4. No architecture change without freeze review.
5. No widget-level API calls when orchestration owns runtime.
6. No URL parsing in widgets.
7. Context must survive drill-down and back navigation.
8. Each ticket is isolated by scope.
9. Review comes before the next center.
10. ChatGPT and Codex must preserve continuity, not recreate history.

## 13. Ticket Completion Protocol

A Development Ticket is only considered `COMPLETED` when all of the following are satisfied:

### 13.1 Source Code

- Development is complete.

### 13.2 Build

- Build passes.

### 13.3 Runtime Verification

- Runtime passes, if runtime is part of the ticket scope.

### 13.4 Review

- Review passes.

### 13.5 Documentation Synchronization

Before committing, the following documents must be checked and updated if needed:

- [README_AI.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/README_AI.md)
- [docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)
- current manifest referenced by `PROJECT_SNAPSHOT.md`
- [docs/01_GOVERNANCE/CODEX_DOCUMENTATION_STANDARD.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/CODEX_DOCUMENTATION_STANDARD.md) when documentation workflow changes
- [docs/01_GOVERNANCE/MASTER_START_PROMPT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/MASTER_START_PROMPT.md)
- [docs/01_GOVERNANCE/PROJECT_CONTEXT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_CONTEXT.md)
- [docs/01_GOVERNANCE/PROJECT_HANDOVER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_HANDOVER.md)
- [PROJECT_PROGRESS.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/PROJECT_PROGRESS.md)
- [PROJECT_STATUS.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/PROJECT_STATUS.md) if the status changes
- [docs/01_GOVERNANCE/DOCUMENT_INDEX.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/DOCUMENT_INDEX.md) if documents are added or moved
- [docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md) when PO UI review applies
- [docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md) when PO findings exist
- the ticket's review document, if the ticket has a review document

### 13.6 Current Project State

Current Phase, Current Ticket, Next Ticket, Development Status, and Repository Status are owned by `PROJECT_SNAPSHOT.md`.

### 13.7 Commit Policy

A commit must include the required delivery artifacts for the ticket, which may include:

- Source code
- Documentation update
- Review update
- Progress update

Source code must not be committed if Documentation Synchronization has not been completed.

If `PO UI Check Required = Yes`, the ticket must not be described as `Module Completed` until the PO gate is satisfied.

### 13.8 Push Policy

After push, the report must include:

- Completed Ticket
- Next Ticket
- Documentation Updated
- Repository Status
- GitHub Commit URL
- GitHub Blob URL of all updated documents

### 13.9 Prompt Rule

Future Development Prompts must follow this protocol by default.

They may reference it succinctly with:

`Follow Ticket Completion Protocol defined in AI_COLLABORATION_PROTOCOL.md`

### 13.10 PO UI Acceptance Applicability

Every development ticket must explicitly decide whether PO UI Check is required.

Use:

- `PO UI Check Required: Yes`
- `PO UI Check Required: No`

The decision must be based on whether the ticket produces a visible, independently checkable product change.

If `Yes`, the ticket must follow `docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md`.

If `No`, the completion report must still state `PO UI Check Required: No` and explain why.

## 14. Prompt Standard

All future QIS V2 prompts should follow the canonical prompt standard defined in:

- [docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md)

The prompt standard is the default format for future ChatGPT and Codex tickets.

## 15. Product Owner to ChatGPT Collaboration Workflow

### 15.1 Mandatory Three-Part Response Format

ChatGPT must use exactly this format for post-onboarding continuation, implementation-result review, remediation findings, validation failures, PO handoff, and next-ticket activation:

1. `### Phân tích kết quả`
   - fewer than 5 sentences
   - state only the result, finding, blocker, or readiness
2. `### Phương án`
   - fewer than 5 sentences
   - state the immediate execution path
3. exactly one of:
   - `### Prompt cho Codex/Antigravity`
   - `### Yêu cầu PO quyết định`

### 15.2 Post-Review Remediation Loop

When review finds an issue resolvable within the active ticket, ChatGPT/Codex must not stop after reporting the finding. It must immediately generate a remediation prompt for Codex/Antigravity and keep the active ticket current until remediation, revalidation, and required PO acceptance are complete.

Do not activate the next ticket before current-ticket PO PASS unless explicit Governance authority permits parallel work.

Request a Product Owner decision only when the finding requires a business-rule, SSOT, frozen-behavior, scope, threshold, acceptance, or authority decision.

A failed repository search alone is not sufficient proof that authority does not exist. Authority checks must inspect relevant Governance documents, business-rule sources, shared constants, accepted implementation, API contracts, tests, and Git history before concluding that authority is unavailable.

## 16. PO UI Acceptance Gate

The authoritative PO UI acceptance workflow lives in:

- [docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md)

The PO findings register lives in:

- [docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md)

Rules:

- PO Product Review PASS belongs to the Product Owner.
- Technical PASS is not Product PASS.
- Runtime PASS is not Product PASS.
- A module cannot be marked completed before the applicable PO gate is satisfied.
- PO findings must be traced to a responsible ticket or backlog decision.
