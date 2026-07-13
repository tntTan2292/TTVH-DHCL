# QIS V2 Architecture

## 1. Direction

QIS V2 is a `Decision Support System` for quality operations.

The architecture is organized around the EIDAF flow:

- Evidence
- Insight
- Decision
- Action
- Feedback

## 2. Operating Centers

The target operating architecture is:

`Dashboard -> BCVH Performance Center -> Route Performance Center -> Shipment Performance Center -> Evidence Center -> Action Center -> Report Center`

### Dashboard

- Entry point for operational visibility.
- Shows top-level decision signals and current performance state.

### BCVH Performance Center

- Focuses on BCVH-level performance monitoring and ranking.
- Serves as the first analytical layer after the Dashboard.

### Route Performance Center

- Focuses on route-level operational performance.
- Supports comparative analysis across routes.

### Shipment Performance Center

- Focuses on shipment-level evidence and violations.
- Supports drill-down from aggregated performance views.

### Evidence Center

- Consolidates the evidence needed for decisions.
- Stores traces that support analysis and review.

### Action Center

- Turns evidence and insight into operational action.
- Tracks what needs to be done next.

### Report Center

- Produces final operational reports.
- Summarizes decisions, actions, and outcomes.

## 3. Architecture Principles

- Dashboard is for visibility, not duplicated business logic.
- Runtime is the acceptance source.
- Business rules stay frozen unless explicitly approved.
- Architecture should support decision flow, not just display flow.
- SSOT documents final decisions only.

## 4. Current Phase

- Business Discovery: `In Progress`
- Freeze Business: `In Progress`
- Information Architecture: `In Progress`

## 5. Scope Boundary

This document is architectural direction only.

It does not modify:

- API
- Database
- Runtime behavior
- Business Rule
- Source code

