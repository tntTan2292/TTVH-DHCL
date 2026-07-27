# DA-IMPL-008 Manifest

- Ticket ID: `DA-IMPL-008`
- Ticket Name: `Dashboard Overview Improvement`
- Phase: `Smart Leadership Dashboard Implementation`
- Current state: `ACTIVE / AUTHORIZED`
- Technical Status: `NOT STARTED`
- Runtime Status: `N/A - ACTIVATION ONLY`
- PO UI Check Required: `Yes`
- PO Product Status: `AUTHORIZED`
- Activation authority: Product Owner priority decision on `2026-07-27` to stop further `AUTO-IMPORT-009` remediation for now and move priority to the previously approved Dashboard overview improvement work.
- Activation date: `2026-07-27`
- Primary executor: `Antigravity for Dashboard UI/UX execution; Codex only for bounded logic, contract, regression, or documentation support if assigned`

## Fresh-Chat Onboarding Authority

Required onboarding chain:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
3. `docs/10_TICKETS/DA-IMPL-008_MANIFEST.md`
4. Required Reading from this manifest

Current checkpoint: `docs/06_REVIEWS/Dashboard/DA-IMPL-008_CHECKPOINT_001.md`

Required Reading:

- `docs/04_TECHNICAL_PLANNING/Dashboard/SMART_DASHBOARD_IMPLEMENTATION_PLAN.md`
- `docs/04_TECHNICAL_PLANNING/Dashboard/DA_IMPLEMENTATION_TICKET_REGISTER.md`
- `docs/06_REVIEWS/Dashboard/DA-IMPL-008_CHECKPOINT_001.md`

## Authority

The authoritative Dashboard roadmap records `DA-IMPL-001` through `DA-IMPL-007` as completed with Product Owner `PO PASS` and no active DA implementation ticket before this priority transition.

Product Owner now activates the next valid Dashboard ticket for the previously approved Dashboard overview improvement work.

Do not reopen completed Dashboard tickets.

Do not infer missing Dashboard scope from chat history.

## Objective

Implement the approved Dashboard overview improvement work.

Detailed execution scope must be derived only from this manifest and the authoritative Dashboard roadmap/manifests. If the specific Dashboard overview requirement is insufficient for implementation, stop and request Product Owner clarification instead of guessing.

## Preservation Requirements

- Preserve all completed `DA-IMPL-001` through `DA-IMPL-007` PO PASS states.
- Preserve `AUTO-IMPORT-009` as `DEFERRED / NOT RESOLVED`; do not record Defect 2 as `PO PASS`.
- Preserve `AUTO-IMPORT-008` and earlier ticket closures.
- Preserve HUE `2026-07-18` and HUE `2026-07-19` locked `PO PASS`.
- Preserve HUE `2026-07-23` as `MISSING / NOT AUTHORIZED`.
- Preserve KPI formulas, SSOT, database schema, API contracts, canonical BCVH mappings, missing-data semantics, accepted import reconciliation, login/session behavior, URL filter context, and accepted Dashboard runtime data unless a later governed implementation prompt explicitly authorizes a bounded change.

## Out Of Scope

- Implementing Dashboard code during this documentation-only priority transition.
- Reopening completed Dashboard tickets.
- Continuing `AUTO-IMPORT-009` remediation.
- Recording `AUTO-IMPORT-009` Defect 2 as `PO PASS`.
- Inferring Dashboard overview requirements from chat history.
- TICKET-0102 route protection or access guard implementation unless Product Owner separately activates it.
- Future `BCVH Ranking` message management unless Product Owner separately activates it.

## Validation Requirements

For this documentation-only activation commit:

- Documentation consistency check.
- `git diff --check`.
- Fresh onboarding simulation from `README_AI.md` to this manifest and checkpoint.
- Commit, push to `origin/codex/da-impl-006`, and verify remote commit.

For later DA-IMPL-008 implementation:

- Use the executor selected by Product Owner coordination.
- Use delta-only scope.
- Use targeted validation appropriate to the implemented Dashboard overview change.
- Provide Product Owner visible checklist.
- Do not mark PO PASS without explicit Product Owner decision.

## Completion And Handoff

`DA-IMPL-008` remains active until Product Owner acceptance or a later Governance transition.
