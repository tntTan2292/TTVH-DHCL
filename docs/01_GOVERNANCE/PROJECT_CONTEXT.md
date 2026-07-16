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

Chief Solution Architect

↓

Codex

Implementation Engineer

Operational model:

- Product Owner approves business direction and final acceptance
- ChatGPT / Chief Solution Architect defines and preserves the narrative, context, and planning continuity
- Codex implements and validates against the frozen contracts

## 9. Current Project Snapshot

Current snapshot is based on [PROJECT_HANDOVER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_HANDOVER.md) and [PROJECT_PROGRESS.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/PROJECT_PROGRESS.md).

| Field | Value |
| --- | --- |
| Project Name | `TTVH Quality Intelligence System (QIS V2)` |
| Current Phase | `Leadership Dashboard Delivery` |
| Current Development Status | `In Progress` |
| Architecture Status | `Frozen` |
| UX Status | `Frozen` |
| Technical Planning Status | `PASS` |
| Technical Status | `PASS` |
| Runtime Status | `PASS` |
| PO UI Check Required | `Yes` |
| PO Product Status | `NOT READY` |
| Dashboard | `PASS` |
| BCVH | `PASS` |
| Route | `PASS` |
| Shipment | `Runtime integration reviewed` |
| Evidence | `Not started` |
| Action | `Not started` |
| AI | `Not started` |
| Report | `Not started` |
| Current Ticket | `TODAY-003 Quality Delivery Rate Trendline` |
| Current Commit | `f0c01cd870fa3fe4d5a8d51efee965c54a64ed72` |
| Next Milestone | `TODAY-004 Volume Trendline` |

Current PO gate rule:

- tickets with visible UI or product behavior changes require PO UI Check Required = Yes
- internal governance-only tickets use PO UI Check Required = No
- Technical PASS and Runtime PASS do not imply PO Product PASS

## 10. Continuation Rule

A new ChatGPT / Codex session must read the following files before answering:

1. [docs/01_GOVERNANCE/PROJECT_HANDOVER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_HANDOVER.md)
2. [docs/01_GOVERNANCE/PROJECT_CONTEXT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_CONTEXT.md)
3. [docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md)
4. [docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md)
5. [PROJECT_STATUS.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/PROJECT_STATUS.md)
6. [PROJECT_PROGRESS.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/PROJECT_PROGRESS.md)

After that, continue using the frozen architecture and the current project snapshot.

Do not rewrite history from chat memory.
Do not change frozen architecture unless the Product Owner explicitly approves it.
