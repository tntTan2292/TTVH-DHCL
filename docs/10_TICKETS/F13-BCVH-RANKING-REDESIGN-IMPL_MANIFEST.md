# F13-BCVH-RANKING-REDESIGN-IMPL Manifest

- Ticket ID: `F13-BCVH-RANKING-REDESIGN-IMPL`
- Ticket Name: `BCVH Ranking Redesign Implementation`
- Phase: `F1.3 Operational Module`
- Current state: `IMPLEMENTATION COMPLETE / READY FOR PO CHECK`
- Technical Status: `WAVE 1 + WAVE 2 COMPLETE`
- Runtime Status: `FOCUSED BACKEND + FRONTEND VALIDATION PASS`
- PO UI Check Required: `Yes - visible BCVH Ranking redesign`
- PO Product Status: `PO APPROVED SCOPE - IMPLEMENTATION COMPLETE / PO CHECK PENDING`
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
- `docs/06_REVIEWS/BCVH/F13_BCVH_RANKING_REDESIGN_IMPL_WAVE1_CHECKPOINT_001.md`
- `docs/06_REVIEWS/BCVH/F13_BCVH_RANKING_REDESIGN_IMPL_WAVE2_CHECKPOINT_001.md`
- `docs/06_REVIEWS/Dashboard/DA-IMPL-004_UNIFIED_BCVH_ANALYSIS_TABLE.md`
- `docs/06_REVIEWS/Route/F13_INTERNAL_COUNTER_ROUTE_AUDIT.md`
- `docs/07_REFERENCE/Shared_Business/F13_INTERNAL_ROUTE_CATALOG.md`
- `docs/04_TECHNICAL_PLANNING/F13_OPERATIONAL_CAPABILITY_AUDIT.md`
- `docs/10_TICKETS/F13-INTERNAL-ROUTE-AUDIT_MANIFEST.md`

## Product Owner Scope Locked

Implement only the approved BCVH Ranking redesign documented in `F13_BCVH_RANKING_REDESIGN_PLAN_CHECKPOINT_001.md`.

This manifest now records that both implementation waves are complete and that the next state is Product Owner UI verification only unless a defect is found.

The currently approved remediation authority on this ticket is limited to bounded PO-check defects only. The latest approved remediation replaced the old low-value summary shell with runtime-backed operational KPI widgets and improved the factual no-data state without reopening backend formulas, thresholds, exclusions, or grouped-table scope.

The implementation must preserve:

- Dashboard SSOT
- semantic colors
- existing business thresholds
- confirmed non-postman route exclusions
- current Route Ranking route-context contract
- current D-1 and D-7 comparison semantics only where already supported

The approved D-1 and D-7 design uses separate grouped comparison blocks, not one combined comparison field.

For each of `D-1` and `D-7`, the implementation scope must map independently:

- raw `San luong`
- raw `Ty le F1.3`
- `Delta san luong`
- `Delta F1.3`
- comparison-period `Hang`
- `Dich chuyen hang`

Visibility lock:

- raw `San luong` and raw `Ty le F1.3` may be hidden
- `Delta san luong`, `Delta F1.3`, and `Dich chuyen hang` remain visible

## In Scope

- Preserve the completed Wave 1 backend/runtime contract documented in `F13_BCVH_RANKING_REDESIGN_IMPL_WAVE1_CHECKPOINT_001.md`.
- Preserve the completed Wave 2 frontend presentation documented in `F13_BCVH_RANKING_REDESIGN_IMPL_WAVE2_CHECKPOINT_001.md`.
- Reuse the existing runtime fields without changing formulas or thresholds.
- Preserve existing route drill-down parameters and current Route Ranking exclusions/behavior.
- Finish with Product Owner UI verification and any bounded remediation only if a concrete defect is found.

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
- Reuse existing accepted D-1 and D-7 comparison delta fields: `kpi_2026_dod`, `kpi_2026_swc`.
- Consume the Wave 1 runtime contract additions from `F13_BCVH_RANKING_REDESIGN_IMPL_WAVE1_CHECKPOINT_001.md`.
- Preserve current route drill-down params: `from_date`, `to_date`, `interval`, `bcvh_id`, `bcvh_name`.
- Preserve the `7` confirmed non-postman/customer-pickup routes as excluded from participating postman-route counts.
- Do not reopen backend/runtime formulas in Wave 2 unless a documented defect is proven.

### Delivery Lock

Wave 1 completed the backend/runtime scope for:

- raw `San luong D-1`
- raw `San luong D-7`
- raw `Ty le F1.3 D-1`
- raw `Ty le F1.3 D-7`
- `Delta san luong D-1`
- `Delta san luong D-7`
- `Hang D-1`
- `Hang D-7`
- `Dich chuyen hang D-1`
- `Dich chuyen hang D-7`
- `BG cham nop tien`
- `So tuyen buu ta tham gia`
- `Tuyen xanh`
- `Tuyen vang`
- `Tuyen do`

Authority now explicitly confirms BCVH rank-movement semantics:

- current rank lower than comparison rank = improvement
- current rank higher than comparison rank = decline
- equal = unchanged

Wave 2 completed the frontend scope for:

- grouped BCVH ranking table
- current-day fields
- separate `D-1` and `D-7` grouped columns
- allowed hide/show behavior for raw comparison columns only
- independent KPI, late-cash, and rank-movement signals
- green / pink / yellow / red route columns
- 4-segment doughnut
- inline `Phan tich BCVH`
- preserved Route Ranking drill-down context
- factual unavailable states without fallback calculations

Latest bounded PO remediation also completed:

- runtime-backed operational KPI widgets for evaluation-day volume, F1.3 quality, delayed cash handover, and 4-band route-quality distribution
- compact doughnut bound to the same green / pink / yellow / red runtime distribution counts
- removal of visible technical/explanatory placeholder cards
- factual no-data state with selected date, supported nearest available date, and `Xem ngay gan nhat` when metadata support exists

## Documents To Update

- `docs/10_TICKETS/F13-BCVH-RANKING-REDESIGN-IMPL_MANIFEST.md`
- implementation review/checkpoint document(s) created under `docs/06_REVIEWS/BCVH/`
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md` if onboarding/current-required-reading changes
- `README_AI.md` if the active handoff/current manifest changes
- `PROJECT_PROGRESS.md` only if required by the governed ticket handoff workflow for milestone/status synchronization

## Validation

- Backend/service targeted tests for newly added BCVH ranking fields and non-postman route exclusions are complete for Wave 1.
- Frontend mapper/component tests for grouped columns, unavailable states, independent signals, doughnut data binding, and inline `Phan tich BCVH` are complete for Wave 2.
- Frontend validation for runtime-backed summary widgets and nearest-available-date no-data UX is complete for the latest PO remediation.
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

- Next ticket ID: `Pending only if PO finds a concrete BCVH Ranking defect`
- Blockers or handoff notes:
  - Do not reopen formulas, thresholds, or exclusions without explicit new authority.
  - If PO only requests visual polish after PASS/WARNING, recommend a narrow Antigravity follow-up instead of reopening this ticket broadly.

## Handoff

This manifest is now a PO-check handoff. A fresh executor must read the onboarding chain, preserve the completed runtime and frontend contracts, perform only bounded remediation if a concrete defect is found, update documentation, push, verify remote state, and finish with fresh-onboarding handoff.
