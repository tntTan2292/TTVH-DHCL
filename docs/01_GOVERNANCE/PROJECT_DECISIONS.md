# PROJECT DECISIONS

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. Decision Log](#2-decision-log)
- [3. Business Decisions](#3-business-decisions)
- [4. Architecture Decisions](#4-architecture-decisions)
- [5. Runtime Decisions](#5-runtime-decisions)
- [6. Development Decisions](#6-development-decisions)
- [7. Context Decisions](#7-context-decisions)
- [8. Freeze List](#8-freeze-list)
- [9. Change Control](#9-change-control)
- [10. Open Decision Items](#10-open-decision-items)
- [11. Quick Reference](#11-quick-reference)

## 1. Purpose

This document records the immutable and frozen decisions of QIS V2, together with the architectural reasons behind them.

It exists to:

- preserve the final state of decisions
- prevent accidental re-interpretation of frozen architecture
- provide a quick reference for new ChatGPT, Codex, and developer sessions
- distinguish frozen decisions from still-open decision items

## 2. Decision Log

| Decision ID | Decision Title | Date / Version | Why it was chosen | What it replaces | Impact | Frozen / Not Frozen |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | QIS V2 is a Decision Support System | SSOT v1 | The system must support operational decision making, not only display data | Traditional dashboard-only interpretation | Defines product identity and architecture direction | Frozen |
| DEC-002 | Dashboard is the entry point, not the place to duplicate all logic | SSOT v1 | Keep executive entry lightweight and avoid logic duplication | Dashboard as a full business logic surface | Clarifies layering and prevents overlap with centers | Frozen |
| DEC-003 | BCVH -> Route -> Shipment -> Evidence -> Action is the primary drill-down chain | Cross-center architecture | Establish a progressive operating path from broad signal to action | Flat navigation without ownership boundaries | Defines navigation and context propagation | Frozen |
| DEC-004 | Report Center is an output / feedback layer, not the primary decision engine | SSOT v1 | Final reporting should not replace operational centers | Report-driven decision making | Preserves decision ownership in the centers | Frozen |
| DEC-005 | EIDAF is the cross-system operating framework | SSOT v1 | Maintain a consistent Evidence -> Insight -> Decision -> Action -> Feedback flow | Ad hoc center-by-center logic | Sets the design language across the platform | Frozen |
| DEC-006 | Information Architecture freezes before Widget Specification | Architecture freeze | Prevent widgets from redefining structure | Component-first design without IA lock | Locks screen and information boundaries early | Frozen |
| DEC-007 | Widget Specification freezes before Screen Architecture | Architecture freeze | Components must be defined before screen composition | Screen design without component contract | Makes screen layout depend on stable widgets | Frozen |
| DEC-008 | Screen Architecture freezes before UX Architecture | Architecture freeze | UX must sit on top of stable layout zones and widget placement | UX design without screen contract | Keeps UX implementation aligned | Frozen |
| DEC-009 | UX freezes before Implementation Architecture | UX freeze | Development planning must follow stable UX decisions | Technical planning before UX lock | Reduces rework and implementation churn | Frozen |
| DEC-010 | Implementation Architecture freezes before Technical Planning | Technical planning rules | Keep ticketing and backlog aligned to the implementation map | Planning without implementation structure | Stabilizes release, epic, feature, and backlog planning | Frozen |
| DEC-011 | Runtime lives only in orchestration pages | Runtime architecture | Avoid spreading data orchestration into widgets | Widget-level runtime ownership | Keeps UI components reusable and simple | Frozen |
| DEC-012 | Widgets are props-only and do not call API | Runtime architecture | Enforce separation of concerns | Widget-owned API access | Prevents hidden side effects and contract drift | Frozen |
| DEC-013 | Widgets do not parse URL | Runtime architecture | Preserve routing and context handling in the orchestration layer | Widget-level URL interpretation | Keeps navigation and context propagation stable | Frozen |
| DEC-014 | Shell -> Widgets -> Runtime -> Review PASS is the development delivery flow | Development workflow | Make each center mature in a controlled sequence | Mixed-stage implementation | Supports predictable center-by-center delivery | Frozen |
| DEC-015 | One Bug -> One Ticket -> One Commit | Development workflow | Reduce scope ambiguity and make review traceable | Multi-bug commits and mixed scopes | Improves auditability and rollback clarity | Frozen |
| DEC-016 | Each center must pass Shell, Widgets, Runtime, and Review before the next center starts | Review workflow | Preserve quality gates between centers | Parallel center completion without review gate | Prevents premature downstream development | Frozen |
| DEC-017 | Context must flow Dashboard -> BCVH -> Route -> Shipment -> Evidence -> Action | Cross-center interaction | Preserve drill-down continuity for leadership | Context reset between centers | Enables stable navigation and handoff | Frozen |
| DEC-018 | Project governance must be PO -> ChatGPT -> Codex | AI collaboration | Clarify ownership and coordination | Unstructured AI interaction | Reduces ambiguity in decision and execution flow | Frozen |
| DEC-019 | PO UI acceptance is required for tickets with visible product changes | Governance workflow | Separate technical completion from product acceptance | Generic PASS language that hides product review state | Adds PO gating and traceability for user-visible work | Frozen |

## 3. Business Decisions

- QIS V2 is a Decision Support System
- Dashboard is the entry point, not a full duplication of operational logic
- BCVH -> Route -> Shipment -> Evidence -> Action is the primary drill-down chain
- Report Center is a feedback/output layer, not the main decision engine
- EIDAF is the operating framework for the entire system
- No business rule changes unless explicitly approved by the Product Owner
- PO UI Check Required must be decided for every ticket
- Technical PASS and Runtime PASS do not imply Product PASS

## 4. Architecture Decisions

- EIDAF is the cross-system design principle
- Information Architecture freezes before Widget Specification
- Widget Specification freezes before Screen Architecture
- Screen Architecture freezes before UX Architecture
- UX Architecture freezes before Implementation Architecture
- Implementation Architecture freezes before Technical Planning
- Architecture freeze means downstream documents must follow the frozen contract

## 5. Runtime Decisions

- Widget only receives props
- Widget does not call API
- Widget does not parse URL
- Runtime exists only in the orchestration page
- Runtime adapters and context preparation belong to orchestration
- Business calculations remain in the approved backend/runtime layer
- PO Product PASS belongs to the Product Owner

## 6. Development Decisions

- Shell -> Widgets -> Runtime -> Review PASS
- One Bug -> One Ticket -> One Commit
- Each center must be reviewed before moving to the next center
- Runtime acceptance is the standard for implementation tickets
- No cross-center rewrite unless the Product Owner explicitly approves it
- UI-visible tickets require PO UI Acceptance before Module Completed

## 7. Context Decisions

- Context must flow through Dashboard -> BCVH -> Route -> Shipment -> Evidence -> Action
- Context must not be renamed silently
- Context must not be reset by child screens
- Context must not be overwritten by widgets
- Back navigation must preserve context
- PO findings must be traceable to a responsible ticket, recovery ticket, or future ticket

Mandatory context fields when applicable:

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

## 8. Freeze List

The following decisions are frozen:

- QIS V2 is a Decision Support System
- Dashboard is an entry point
- BCVH -> Route -> Shipment -> Evidence -> Action is the primary chain
- Report Center is output / feedback
- EIDAF is locked
- IA freeze before Widget freeze
- Widget freeze before Screen freeze
- Screen freeze before UX freeze
- UX freeze before Implementation Architecture
- Implementation Architecture freeze before Technical Planning
- Runtime only in orchestration pages
- Widgets are props-only
- Widgets do not call API
- Widgets do not parse URL
- Shell -> Widgets -> Runtime -> Review PASS
- One Bug -> One Ticket -> One Commit
- Context propagation across centers is mandatory

## 9. Change Control

When a decision may be changed:

- only when the Product Owner explicitly requests or approves the change
- only when the change is treated as a new decision item
- only after impact on SSOT, architecture, UX, runtime, and backlog is reviewed

Who can change decisions:

- Product Owner can approve or reverse business decisions
- ChatGPT can propose and document decision changes
- Codex cannot change decisions by itself

If a change is requested:

1. capture the new decision item
2. identify what it replaces
3. review impact on frozen documents
4. obtain Product Owner approval
5. update affected documents only if approved

## 10. Open Decision Items

- None currently recorded in the frozen decision set

## 11. Quick Reference

Most important immutable decisions:

1. QIS V2 is a Decision Support System.
2. EIDAF is the cross-system framework.
3. Dashboard is the entry point, not the full logic surface.
4. BCVH -> Route -> Shipment -> Evidence -> Action is the primary drill-down chain.
5. Report Center is feedback/output, not the primary decision engine.
6. Runtime belongs only to orchestration pages.
7. Widgets are props-only.
8. Widgets do not call API or parse URL.
9. Shell -> Widgets -> Runtime -> Review PASS is the delivery sequence.
10. One Bug -> One Ticket -> One Commit is mandatory.
