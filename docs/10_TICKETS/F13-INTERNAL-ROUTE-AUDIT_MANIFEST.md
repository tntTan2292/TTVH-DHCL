# F13-INTERNAL-ROUTE-AUDIT Manifest

- Ticket ID: `F13-INTERNAL-ROUTE-AUDIT`
- Ticket Name: `Internal Counter Route Candidate Audit`
- Phase: `F1.3 Operational Module Planning`
- Current state: `READY FOR PO VERIFICATION`
- Technical Status: `DISCOVERY COMPLETE - NO IMPLEMENTATION`
- Runtime Status: `DATABASE AUDIT PASS`
- PO UI Check Required: `No - PO data verification required`
- PO Product Status: `WAITING FOR PO VERIFICATION`
- Activation authority: `Discovery only`
- Audit date: `2026-07-28`
- Recommended executor after PO decision: `Codex only if Product Owner authorizes a follow-up implementation ticket`

## Fresh-Chat Onboarding Authority

Required onboarding chain:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. `docs/10_TICKETS/F13-INTERNAL-ROUTE-AUDIT_MANIFEST.md`
5. Required Reading from this manifest

Required Reading:

- `docs/06_REVIEWS/Route/F13_INTERNAL_COUNTER_ROUTE_AUDIT.md`
- `docs/04_TECHNICAL_PLANNING/F13_OPERATIONAL_CAPABILITY_AUDIT.md`
- `docs/10_TICKETS/F13-DATA-QUALITY-001_MANIFEST.md`
- `docs/10_TICKETS/F13-SHIPMENT-001_MANIFEST.md`

## Product Owner Decisions Recorded

- `F13-DATA-QUALITY-001` implementation is deferred by Product Owner. Its manifest remains preserved and must not be deleted or treated as rejected.
- `F13-SHIPMENT-001` implementation remains deferred and preserved.
- The current authorized work is only a bounded route-name audit for Product Owner verification.

## Audit Rule

Candidate internal-counter route names are identified only when the current route name contains one of these exact approved phrases after trimming, collapsing repeated spaces, and ignoring letter case:

- `Tuyến phát bưu cục`
- `Phát tại quầy`

No fuzzy synonyms or inferred route types are authorized.

## Result Summary

- Database audited: `backend/src/db/database.sqlite`.
- Source table: `fact_f13`.
- Business-date cutoff: `2026-07-28`; future-dated rows were excluded.
- Route name groups profiled: `158`.
- Exact candidates found: `1`.
- Near matches found: `11`.
- Official classification saved: `None`.

## Out Of Scope

- Product code, UI, API, schema, formulas, business rules, or operational-data changes.
- Official route catalog creation.
- Permanent classification of all other routes as postman routes.
- BCVH Ranking, Route Ranking, Shipment, Data Quality, or other F1.3 implementation.
- Person ownership, RCA cause, lifecycle, message, export, or evidence implementation.

## Decision Required

Product Owner must verify whether the candidate route and any near-match routes should be treated as internal-counter routes in a future authorized ticket.

## Handoff

Status: `READY FOR PO VERIFICATION`.

No implementation is authorized until Product Owner confirms route classification and approves a follow-up ticket.
