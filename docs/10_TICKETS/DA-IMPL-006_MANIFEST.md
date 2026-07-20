# DA-IMPL-006 Manifest

- Ticket ID: `DA-IMPL-006`
- Ticket Name: `Unified Action Center`
- Phase: `Smart Leadership Dashboard Implementation`
- Current state: `COMPLETED / PO PASS`
- Technical Status: `PASS`
- Runtime Status: `PASS`
- PO UI Check Required: `Yes`
- PO Product Status: `PO PASS`
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
- Render each operational issue once, with priority, issue, unit, evidence or confirmed cause where available, recommended action, source or confidence, status where already available, and a follow-up or detail entry point.
- Preserve active Dashboard date and BCVH filter context.
- Preserve unknown or unavailable values instead of inventing owner, cause, deadline, status, confidence, or role and permission rules.
- Prepare final Dashboard assembly handoff to `DA-IMPL-007`.
- Product Owner final remediation removes the Dashboard `BCVH nổi bật và cần cải thiện` / Top 2 area and removes `Tin điều hành` / `Tin báo cáo` message drafts from Dashboard.
- Future message building, viewing, and management belongs in a future governed `BCVH Ranking` module ticket, not in DA-IMPL-006.

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
- No PO PASS by Codex without explicit Product Owner decision.

## Checkpoints

### Checkpoint 001 - Discovery and Contract Definition

- Inspect current recommendation, Daily Brief, message generation, row-level guidance, and follow-up surfaces.
- Inspect current frontend data models, selectors, components, API contracts, backend services, and authoritative fields supporting those surfaces.
- Document duplicate, conflicting, mock-backed, or disconnected implementations.
- Define the Unified Action Center contract, source mapping, filter propagation, loading, empty, partial, and error states, and the narrowest Checkpoint 002 vertical slice.
- Evidence: `docs/06_REVIEWS/Dashboard/DA-IMPL-006_CHECKPOINT_001.md`.
- Status: `COMPLETED - DISCOVERY / CONTRACT DEFINED`.

### Checkpoint 002 - Smallest Vertical Slice

- Implement the smallest compatible Unified Action Center vertical slice in the existing Dashboard path.
- Reuse existing components, selectors, endpoints, and calculations where authoritative.
- Preserve Dashboard behavior outside the targeted action-center area.
- Add focused mapper and component tests and preserve existing regressions.
- Evidence: `docs/06_REVIEWS/Dashboard/DA-IMPL-006_CHECKPOINT_002.md`.
- Status: `COMPLETED - TECHNICAL PASS`.

### Checkpoint 003 - Technical Hardening and PO Preparation / Final PO Remediation

- Verify runtime robustness, filter synchronization, null and partial-data handling, loading, empty, and error states, and detail or follow-up entry context.
- Fix only genuine technical defects within approved scope.
- Apply Product Owner final remediation by removing the Top 2 Dashboard area and Dashboard message draft display and request.
- Evidence: `docs/06_REVIEWS/Dashboard/DA-IMPL-006_CHECKPOINT_003.md`; `docs/06_REVIEWS/Dashboard/DA-IMPL-006_PO_ACCEPTANCE_CHECKLIST.md`.
- Status: `COMPLETED - PO ACCEPTED`.

## PO Acceptance Boundary

Product Owner explicitly accepted `DA-IMPL-006 = PO PASS` after final remediation. Codex must not reopen this ticket unless a new Product Owner defect is issued.

## Evidence Locations

- Checkpoint 001 review: `docs/06_REVIEWS/Dashboard/DA-IMPL-006_CHECKPOINT_001.md`
- Checkpoint 002 review: `docs/06_REVIEWS/Dashboard/DA-IMPL-006_CHECKPOINT_002.md`
- Checkpoint 003 review: `docs/06_REVIEWS/Dashboard/DA-IMPL-006_CHECKPOINT_003.md`
- PO acceptance checklist: `docs/06_REVIEWS/Dashboard/DA-IMPL-006_PO_ACCEPTANCE_CHECKLIST.md`
- Manifest: `docs/10_TICKETS/DA-IMPL-006_MANIFEST.md`

## Current Blockers

- None. Ticket is closed with Product Owner `PO PASS`.

## Next Ticket

`DA-IMPL-007` Smart Dashboard Final Assembly.
