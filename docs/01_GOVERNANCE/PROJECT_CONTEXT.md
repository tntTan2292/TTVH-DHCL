# PROJECT CONTEXT

## Table of Contents

- [1. Project Identity](#1-project-identity)
- [2. Core Architecture](#2-core-architecture)
- [3. Frozen Architecture](#3-frozen-architecture)
- [4. Development Workflow](#4-development-workflow)
- [5. Runtime Rules](#5-runtime-rules)
- [6. Context Propagation](#6-context-propagation)
- [7. Review Workflow](#7-review-workflow)
- [8. AI Collaboration](#8-ai-collaboration)
- [9. Current Project Snapshot](#9-current-project-snapshot)
- [10. Continuation Rule](#10-continuation-rule)

## 1. Project Identity

| Field | Value |
| --- | --- |
| Project Name | `TTVH Quality Intelligence System (QIS V2)` |
| Vision | `Decision Support System` for TTVH quality operations |
| Business Goal | Standardize operational decision making with SSOT, runtime, and evidence-backed flow |
| Decision Support System | QIS V2 is designed as an operational decision support platform, not a traditional dashboard |

## 2. Core Architecture

QIS V2 core architecture is organized as a decision-support chain:

```text
SSOT
↓
EIDAF
↓
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
↓
AI
↓
Report
```

Core responsibilities:

- `SSOT`: single source of truth for frozen project rules and decisions
- `EIDAF`: Evidence -> Insight -> Decision -> Action -> Feedback operating framework
- `Dashboard`: executive entry point and operating overview
- `BCVH`: organization-level quality performance center
- `Route`: route-level performance center
- `Shipment`: shipment-level performance center
- `Evidence`: evidence validation and verification center
- `Action`: action execution and follow-up center
- `AI`: recommendation and intelligence support layer
- `Report`: final reporting and communication layer

## 3. Frozen Architecture

The following architecture layers are frozen and must not be changed casually:

- Information Architecture
- Widget Specification
- Screen Architecture
- UX Architecture
- Cross Center Interaction
- Design System
- UX Principles
- Implementation Architecture
- Release Planning
- Epic Planning
- Feature Planning
- Development Backlog

Supporting frozen documents include:

- [docs/PROJECT_SSOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/PROJECT_SSOT.md)
- [PROJECT_STATUS.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/PROJECT_STATUS.md)
- [PROJECT_PROGRESS.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/PROJECT_PROGRESS.md)
- [docs/02_ARCHITECTURE/QIS_V2_ARCHITECTURE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/02_ARCHITECTURE/QIS_V2_ARCHITECTURE.md)
- [docs/02_ARCHITECTURE/CROSS_CENTER_INTERACTION_ARCHITECTURE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/02_ARCHITECTURE/CROSS_CENTER_INTERACTION_ARCHITECTURE.md)
- [docs/03_UX/shared/QIS_DESIGN_SYSTEM.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/03_UX/shared/QIS_DESIGN_SYSTEM.md)
- [docs/03_UX/shared/QIS_UX_DESIGN_PRINCIPLES.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/03_UX/shared/QIS_UX_DESIGN_PRINCIPLES.md)
- [docs/04_TECHNICAL_PLANNING/Implementation/IMPLEMENTATION_ARCHITECTURE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Implementation/IMPLEMENTATION_ARCHITECTURE.md)
- [docs/04_TECHNICAL_PLANNING/Release/RELEASE_PLANNING.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Release/RELEASE_PLANNING.md)
- [docs/04_TECHNICAL_PLANNING/Epic/EPIC_PLANNING.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Epic/EPIC_PLANNING.md)
- [docs/04_TECHNICAL_PLANNING/Feature/FEATURE_PLANNING.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Feature/FEATURE_PLANNING.md)
- [docs/04_TECHNICAL_PLANNING/Backlog/DEVELOPMENT_BACKLOG.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Backlog/DEVELOPMENT_BACKLOG.md)
- Center-specific IA, Widget, Screen, and UX documents for BCVH, Route, Shipment, Evidence, and Action
- Review documents for completed centers and freeze packages

## 4. Development Workflow

Architecture

↓

UX

↓

Technical Planning

↓

Development

Development must follow:

Shell

↓

Widgets

↓

Runtime

↓

Review

Rules:

- One Bug = One Ticket = One Commit
- No Refactor
- No Rewrite
- No Audit creep
- No business rule changes unless explicitly approved
- Runtime is the acceptance standard

## 5. Runtime Rules

- Runtime only lives in the orchestration page
- Widgets are props-only
- Widgets do not call API
- Widgets do not parse URL
- Widgets do not contain business logic
- Runtime adapters and context preparation belong to the orchestration layer
- Widget-level hardcode is not allowed when a runtime contract exists

## 6. Context Propagation

Cross-center navigation must preserve context across the chain:

```text
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
```

Context fields that must be preserved when applicable:

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

Context rules:

- Context must not be lost
- Context must not be renamed unexpectedly
- Context must not be reset by child centers
- Context must not be overwritten by widgets
- Back navigation must preserve the current context

## 7. Review Workflow

Each center must progress through the same lifecycle:

Shell

↓

Widgets

↓

Runtime

↓

Review PASS

Only after review PASS can the project move to the next center in the roadmap.

Current PO gate rule:

- if a ticket changes visible UI or product behavior, PO UI Check Required = Yes
- if a ticket is internal only, PO UI Check Required = No
- technical PASS and runtime PASS do not imply PO Product PASS

## 8. AI Collaboration

Project collaboration roles:

Product Owner

↓

ChatGPT

Coordination Authority

↓

Codex / Antigravity

Direct Executors

Operational model:

- Product Owner approves business direction and final acceptance
- ChatGPT coordination receives requests, analyzes tickets, finalizes scope, chooses the executor, writes the prompt, reviews results, and requests PO decisions
- only ChatGPT coordination may redirect work between Codex and Antigravity
- Codex directly executes business logic, backend, data flow, contract, validation, test, refactor, technical remediation, and technical governance updates
- Antigravity directly executes layout, UI/UX, responsive behavior, typography, spacing, color, visual hierarchy, chart and heatmap presentation, final visual assembly, browser visual checks, and screenshot evidence
- mixed tickets must be split by ChatGPT coordination: Codex handles logic and contracts first, Antigravity handles UI after the technical boundary is stable
- no executor may stop at discovery and hand the task back to the other executor unless ChatGPT coordination explicitly instructs that handoff

## 9. Current Project Snapshot

Live project state is owned by:

- [README_AI.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/README_AI.md)
- [docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)
- Current Manifest referenced by `PROJECT_SNAPSHOT.md`

Use [PROJECT_HANDOVER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_HANDOVER.md) and [PROJECT_PROGRESS.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/PROJECT_PROGRESS.md) for narrative and historical continuity only.
Use [docs/01_GOVERNANCE/CODEX_DOCUMENTATION_STANDARD.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/CODEX_DOCUMENTATION_STANDARD.md) when documentation workflow rules are needed.

Current PO gate rule:

- tickets with visible UI or product behavior changes require PO UI Check Required = Yes
- internal governance-only tickets use PO UI Check Required = No
- Technical PASS and Runtime PASS do not imply PO Product PASS
- current ticket, next ticket, and repository state are resolved through `PROJECT_SNAPSHOT.md`
- as of `2026-07-20`, `DA-IMPL-006` is `COMPLETED / PO PASS` and `DA-IMPL-007 Smart Dashboard Final Assembly` is active for handoff only
- primary executor for `DA-IMPL-007` is `Antigravity`
- Antigravity must directly execute final visual assembly for `DA-IMPL-007`, must not reopen `DA-IMPL-006`, and must not generate a Codex prompt as its end state
- Codex may be called back only for logic, contract, backend, or technical regression blockers confirmed by ChatGPT coordination

## 10. Continuation Rule

A new ChatGPT / Codex session must read the following files before answering:

1. [README_AI.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/README_AI.md)
2. [docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)
3. Current Manifest referenced by `PROJECT_SNAPSHOT.md`
4. Only the Required Reading listed in the manifest

After that, continue using the frozen architecture and the snapshot-driven state.

Do not rewrite history from chat memory.
Do not change frozen architecture unless the Product Owner explicitly approves it.
