# F13-SHIPMENT-001 Manifest

- Ticket ID: `F13-SHIPMENT-001`
- Ticket Name: `Shipment Failure Drill-down and Evidence Handoff`
- Phase: `F1.3 Operational Module`
- Current state: `PROPOSED / READY FOR PO DECISION`
- Technical Status: `DISCOVERY ONLY - NO IMPLEMENTATION`
- Runtime Status: `NOT RUN - DISCOVERY ONLY`
- PO UI Check Required: `Yes after implementation approval`
- PO Product Status: `WAITING FOR PO APPROVAL`
- Activation authority: `None yet`
- Recommendation date: `2026-07-28`
- Recommended executor if approved: `Codex first for data/API/contract, then Antigravity only for visual polish if Product Owner separately authorizes it`

## Fresh-Chat Onboarding Authority

Required onboarding chain:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. `docs/10_TICKETS/F13-SHIPMENT-001_MANIFEST.md`
5. Required Reading from this manifest

Required Reading:

- `docs/03_UX/shipment/SHIPMENT_PERFORMANCE_CENTER_UX_ARCHITECTURE.md`
- `docs/06_REVIEWS/Route/ROUTE_PERFORMANCE_CENTER_REVIEW.md`
- `docs/06_REVIEWS/BCVH/BCVH_PERFORMANCE_CENTER_REVIEW.md`
- `docs/07_REFERENCE/Legacy/F1.3/F1.3 DATA DICTIONARY v1.0.md`
- `docs/07_REFERENCE/Legacy/F1.3/F1.3 MODULE SPECIFICATION v1.0.md`

## Decision Required

Product Owner must approve or reject this exact next ticket before implementation starts.

Recommended next ticket:

`F13-SHIPMENT-001 - Shipment Failure Drill-down and Evidence Handoff`

## Objective

Build the next F1.3 operational module that lets a manager drill down from an F1.3 failure context to the failed shipment, responsible operational unit/route, and available supporting evidence.

Primary management question:

`Which failed shipment should be investigated first, which unit/route is responsible for the operational context, and what evidence supports escalation?`

## Discovery Findings

- Route Performance Center is structurally ready for Shipment development and already prepares the Route -> Shipment context handoff.
- Shipment Performance Center UX architecture already defines Route -> Shipment -> Evidence as the approved progressive drill-down journey.
- Existing runtime Shipment page exists but remains shell-like and currently reuses `GET /f13/evidence-list` as a shipment exception feed.
- Existing authoritative F1.3 MVP fields support shipment ID, BCVH code/name, route code/name, result, PTC time, and cash handover time.
- Existing evidence-list backend contract returns failed shipment rows for one date, one BCVH, and one route.
- No authoritative MVP field for named person/employee responsibility was confirmed in the required discovery. Person-level responsibility must be treated as unavailable unless a later approved data source/field is identified.

## Proposed Scope If Approved

- Preserve Route -> Shipment context: date, BCVH, route, selected shipment, search, sort, and order.
- Present a prioritized failed-shipment list using backend-provided failed shipment rows.
- Show responsible operational unit context from authoritative fields: BCVH and route.
- Show available evidence for each shipment: shipment ID, F1.3 result, PTC time, cash handover time, delay signal when derivable from existing timestamps, and source row context.
- Provide clear Vietnamese unavailable wording when person-level responsibility is not present in the data.
- Keep drill-down ready for a later Evidence Center without implementing Evidence Center.

## Out Of Scope

- Do not invent person/employee ownership.
- Do not add new business formulas, thresholds, or root-cause rules.
- Do not change F1.3 KPI formulas, canonical BCVH mappings, nationwide ranking contracts, database schema, Import lifecycle, or completed Dashboard tickets.
- Do not implement Evidence Center.
- Do not perform Dashboard visual audit or polish; Product Owner deferred that work to Antigravity.
- Do not start F1.1, F1.2, F4.1, route optimization, or message management.

## Expected Contracts To Verify If Approved

- Existing route handoff into Shipment preserves context.
- Existing evidence-list contract is sufficient for shipment failure rows, or implementation stops with a bounded contract proposal.
- Person-level responsibility remains suppressed/unavailable unless an authoritative field exists.
- Missing shipment evidence uses explicit unavailable wording rather than fabricated rows.

## Suggested Validation If Approved

- LEVEL 2 targeted validation because the work affects Route -> Shipment context propagation and shipment evidence contract behavior.
- Backend/API checks for evidence-list filtering by date, BCVH, route, and failed result.
- Frontend tests for context preservation, selected-shipment behavior, missing-data wording, and no person ownership fabrication.
- `git diff --check`.
- Runtime/API check for one known failed route context.
- PO-visible checklist for drill-down flow and evidence wording.

## PO Decision Options

1. Approve `F13-SHIPMENT-001` exactly as recommended.
2. Reject or defer this ticket.
3. Provide an authoritative person/responsibility data source before implementation.

## Handoff

Status: `READY FOR PO DECISION`.

No code implementation is authorized until Product Owner approves this proposed ticket.
