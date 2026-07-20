# DA-IMPL-006 Manifest

- Ticket ID: `DA-IMPL-006`
- Ticket Name: `Unified Action Center`
- Phase: `Smart Leadership Dashboard Implementation`
- Current state: `ACTIVE / IMPLEMENTATION`
- Technical Status: `NOT STARTED`
- Runtime Status: `NOT STARTED`
- PO UI Check Required: `Yes`
- PO Product Status: `NOT READY`
- Activation authority: Product Owner governance handoff request after `AUTO-IMPORT-005 = PO PASS`
- Activation date: `2026-07-20`
- Implementation branch: `codex/da-impl-006`
- Prior ticket gates: `DA-IMPL-005 COMPLETED / PO PASS`; `AUTO-IMPORT-005 COMPLETED / PO PASS`

## Objective

Consolidate Dashboard recommendations, Daily Brief, message generation, row-level guidance, and follow-up into one governed Unified Action Center so each operational issue appears once with its source, confidence, evidence, recommended action, and follow-up entry point.

## Required Reading

- [README_AI.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/README_AI.md)
- [docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)
- [docs/04_TECHNICAL_PLANNING/Dashboard/SMART_DASHBOARD_IMPLEMENTATION_PLAN.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Dashboard/SMART_DASHBOARD_IMPLEMENTATION_PLAN.md)
- [docs/04_TECHNICAL_PLANNING/Dashboard/DA_IMPLEMENTATION_TICKET_REGISTER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Dashboard/DA_IMPLEMENTATION_TICKET_REGISTER.md)
- [docs/01_GOVERNANCE/DOCUMENT_UPDATE_MATRIX.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/DOCUMENT_UPDATE_MATRIX.md)

## Approved Scope

- Inspect and map existing recommendation, Daily Brief, message-generation, row-level guidance, and follow-up surfaces.
- Define one Unified Action Center contract using existing authoritative Dashboard data sources and approved calculations only.
- Render each operational issue once, with priority, issue, unit, evidence or confirmed cause where available, recommended action, source/confidence, status where already available, and a follow-up or detail entry point.
- Preserve active Dashboard date and BCVH filter context.
- Preserve unknown or unavailable values instead of inventing owner, cause, deadline, status, confidence, or role/permission rules.
- Prepare final Dashboard assembly handoff to `DA-IMPL-007`.

## Out of Scope

- No new KPI formulas.
- No SSOT changes.
- No business-rule, threshold, BCVH mapping, or ranking-rule changes.
- No backend API or schema changes without explicit checkpoint evidence and authority.
- No invented owner, cause, deadline, status, confidence, role, or permission rules.
- No AUTO-IMPORT, TCT, or DKCL workflow changes.
- No Route Performance Center repair or expansion.
- No Architecture Freeze changes.
- No Product Owner UI acceptance testing by Codex.
- No PO PASS by Codex.

## Checkpoints

### Checkpoint 001 - Discovery and Contract Definition

- Inspect current recommendation, Daily Brief, message generation, row-level guidance, and follow-up surfaces.
- Inspect current frontend data models, selectors, components, API contracts, backend services, and authoritative fields supporting those surfaces.
- Document duplicate, conflicting, mock-backed, or disconnected implementations.
- Define the Unified Action Center contract, source mapping, filter propagation, loading/empty/partial/error states, and the narrowest Checkpoint 002 vertical slice.
- Evidence: `docs/06_REVIEWS/Dashboard/DA-IMPL-006_CHECKPOINT_001.md`.
- Status: `PENDING`.

### Checkpoint 002 - Smallest Vertical Slice

- Implement the smallest compatible Unified Action Center vertical slice in the existing Dashboard path.
- Reuse existing components, selectors, endpoints, and calculations where authoritative.
- Preserve Dashboard behavior outside the targeted action-center area.
- Add focused mapper/component tests and preserve existing regressions.
- Evidence: `docs/06_REVIEWS/Dashboard/DA-IMPL-006_CHECKPOINT_002.md`.
- Status: `PENDING`.

### Checkpoint 003 - Technical Hardening and PO Preparation

- Verify runtime robustness, filter synchronization, null/partial-data handling, loading/empty/error states, and detail/follow-up entry context.
- Fix only genuine technical defects within approved scope.
- Create PO Acceptance Checklist and update governance to `READY FOR PO CHECK` only after technical acceptance passes.
- Evidence: `docs/06_REVIEWS/Dashboard/DA-IMPL-006_CHECKPOINT_003.md`; `docs/06_REVIEWS/Dashboard/DA-IMPL-006_PO_ACCEPTANCE_CHECKLIST.md`.
- Status: `PENDING`.

## PO Acceptance Boundary

Codex may prepare `READY FOR PO CHECK` after Checkpoint 003 technical acceptance, but must not mark `PO PASS`. Product Owner acceptance is required for final closure.

## Evidence Locations

- Checkpoint 001 review: `docs/06_REVIEWS/Dashboard/DA-IMPL-006_CHECKPOINT_001.md`
- Checkpoint 002 review: `docs/06_REVIEWS/Dashboard/DA-IMPL-006_CHECKPOINT_002.md`
- Checkpoint 003 review: `docs/06_REVIEWS/Dashboard/DA-IMPL-006_CHECKPOINT_003.md`
- PO acceptance checklist: `docs/06_REVIEWS/Dashboard/DA-IMPL-006_PO_ACCEPTANCE_CHECKLIST.md`
- Manifest: `docs/10_TICKETS/DA-IMPL-006_MANIFEST.md`

## Current Blockers

- None for activation. Checkpoint 001 must document any missing PO business, SSOT, KPI, API, or scope authority before implementation.

## Next Ticket

`DA-IMPL-007` Smart Dashboard Final Assembly.
