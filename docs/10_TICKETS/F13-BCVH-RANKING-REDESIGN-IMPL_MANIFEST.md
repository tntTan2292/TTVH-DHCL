# F13-BCVH-RANKING-REDESIGN-IMPL Manifest

- Ticket ID: `F13-BCVH-RANKING-REDESIGN-IMPL`
- Ticket Name: `BCVH Ranking Redesign Implementation`
- Phase: `F1.3 Operational Module`
- Current state: `READY FOR IMPLEMENTATION`
- Technical Status: `IMPLEMENTATION AUTHORIZED - NOT STARTED`
- Runtime Status: `NOT RUN`
- PO UI Check Required: `Yes - visible BCVH Ranking redesign`
- PO Product Status: `PO APPROVED SCOPE - IMPLEMENTATION PENDING`
- Activation authority: `PO APPROVE the BCVH Ranking redesign agreed in planning session`
- Handoff date: `2026-07-28`
- Primary executor: `Codex`
- Secondary executor: `Antigravity only if a later explicit UI-polish follow-up is requested after runtime-backed implementation is stable`

## Fresh-Chat Onboarding Authority

Required onboarding chain:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. `docs/10_TICKETS/F13-BCVH-RANKING-REDESIGN-IMPL_MANIFEST.md`
5. Required Reading from this manifest

Required Reading:

- `docs/06_REVIEWS/BCVH/F13_BCVH_RANKING_REDESIGN_PLAN_CHECKPOINT_001.md`
- `docs/06_REVIEWS/Dashboard/DA-IMPL-004_UNIFIED_BCVH_ANALYSIS_TABLE.md`
- `docs/06_REVIEWS/Route/F13_INTERNAL_COUNTER_ROUTE_AUDIT.md`
- `docs/07_REFERENCE/Shared_Business/F13_INTERNAL_ROUTE_CATALOG.md`
- `docs/04_TECHNICAL_PLANNING/F13_OPERATIONAL_CAPABILITY_AUDIT.md`
- `docs/10_TICKETS/F13-INTERNAL-ROUTE-AUDIT_MANIFEST.md`

## Product Owner Scope Locked

Implement only the approved BCVH Ranking redesign documented in `F13_BCVH_RANKING_REDESIGN_PLAN_CHECKPOINT_001.md`.

The implementation must preserve:

- Dashboard SSOT
- semantic colors
- existing business thresholds
- confirmed non-postman route exclusions
- current Route Ranking route-context contract
- current D-1 and D-7 comparison semantics only where already supported

## In Scope

- Implement the approved grouped BCVH Ranking table structure.
- Render supported current-day ranking fields from the current API/runtime contract.
- Implement independent signal presentation for KPI, late-cash-handover, and route-distribution signals without inventing thresholds.
- Implement inline `Phan tich BCVH` from existing supported metrics/status semantics only.
- Implement route-distribution columns and doughnut visualization only after the supporting runtime fields are added under this ticket.
- Add the required backend/runtime fields for approved columns that are currently missing.
- Preserve existing route drill-down parameters and current Route Ranking exclusions/behavior.
- Add focused backend/frontend tests for supported fields, unavailable states, route exclusions, and the new presentation contract.
- Update the applicable ticket/governance docs, commit, push, verify the remote state, and run fresh onboarding validation.

## Out Of Scope

- Product-code changes outside the BCVH Ranking redesign boundary.
- New KPI formulas, new business thresholds, or new color semantics.
- Schema changes, historical fact-data changes, or Import changes.
- Reopening Dashboard, Route Ranking, Shipment, Data Quality, or Import tickets.
- Broad repository audit.
- Antigravity-led final visual polish unless separately authorized after runtime-backed implementation is stable.
- PO self-check automation or self-awarded PO PASS.

## Technical Contract Direction

- Use the current BCVH ranking endpoint as the base contract: `GET /api/f13/ranking/bcvh`.
- Reuse existing accepted D-1 and D-7 comparison fields only where already provided: `kpi_2026_dod`, `kpi_2026_swc`.
- Preserve current route drill-down params: `from_date`, `to_date`, `interval`, `bcvh_id`, `bcvh_name`.
- Preserve the `7` confirmed non-postman/customer-pickup routes as excluded from participating postman-route counts.
- If a required approved field has no existing API/runtime field, add the smallest bounded backend/runtime contract necessary under this ticket and document it in the ticket review evidence.

## Documents To Update

- `docs/10_TICKETS/F13-BCVH-RANKING-REDESIGN-IMPL_MANIFEST.md`
- implementation review/checkpoint document(s) created under `docs/06_REVIEWS/BCVH/`
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md` if onboarding/current-required-reading changes
- `README_AI.md` if the active handoff/current manifest changes
- `PROJECT_PROGRESS.md` only if required by the governed ticket handoff workflow for milestone/status synchronization

## Validation

- Backend/service/repository targeted tests for newly added BCVH ranking fields and non-postman route exclusions.
- Frontend mapper/component tests for grouped columns, unavailable states, independent signals, doughnut data binding, and inline `Phan tich BCVH`.
- Focused build/lint/test only in the touched backend/frontend scope.
- `git diff --check`
- Remote verification of the pushed commit and active onboarding Blob URLs.
- Fresh onboarding simulation starting from `README_AI.md`.

## PO Acceptance

Ready-for-PO handoff must include a concise manual checklist covering:

- BCVH Ranking screen URL
- expected grouped columns
- D-1 and D-7 visibility only where supported
- independent signal colors
- inline `Phan tich BCVH`
- route-distribution columns and doughnut behavior
- preserved route drill-down context
- PASS / WARNING / FAIL criteria

Do not self-award PO PASS.

## Next Ticket

- Next ticket ID: `Pending after implementation and PO review`
- Blockers or handoff notes:
  - If late-cash-handover or route-distribution fields cannot be added without changing business rules, formulas, or thresholds, stop and report the exact blocker.
  - If final visual density or chart polish remains after runtime-backed implementation is technically complete, recommend a narrow Antigravity follow-up instead of expanding this ticket silently.

## Handoff

This manifest is implementation-ready. A fresh executor must read the onboarding chain, implement only the approved redesign scope, perform targeted validation, update documentation, push, verify remote state, and finish with fresh-onboarding handoff.
