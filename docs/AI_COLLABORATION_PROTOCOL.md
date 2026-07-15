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

When moving to a new ChatGPT session, it must read:

1. `docs/PROJECT_HANDOVER.md`
2. `docs/PROJECT_CONTEXT.md`
3. `docs/AI_COLLABORATION_PROTOCOL.md`
4. `PROJECT_STATUS.md`
5. `PROJECT_PROGRESS.md`

The new session must not rely on chat memory as the source of truth.

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
