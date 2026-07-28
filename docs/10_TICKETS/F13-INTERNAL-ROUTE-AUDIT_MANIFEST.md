# F13-INTERNAL-ROUTE-AUDIT Manifest

- Ticket ID: `F13-INTERNAL-ROUTE-AUDIT`
- Ticket Name: `Internal Route Classification and Route Ranking Filter`
- Phase: `F1.3 Operational Module`
- Current state: `READY FOR PO RUNTIME/UI REVIEW`
- Technical Status: `IMPLEMENTED - TARGETED VALIDATION PASS`
- Runtime Status: `DATABASE AUDIT PASS`
- PO UI Check Required: `Yes`
- PO Product Status: `WAITING FOR PO RUNTIME/UI REVIEW`
- Activation authority: `PO AUTHORIZATION: IMPLEMENT`
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
- `docs/07_REFERENCE/Shared_Business/F13_INTERNAL_ROUTE_CATALOG.md`
- `docs/04_TECHNICAL_PLANNING/F13_OPERATIONAL_CAPABILITY_AUDIT.md`
- `docs/10_TICKETS/F13-DATA-QUALITY-001_MANIFEST.md`
- `docs/10_TICKETS/F13-SHIPMENT-001_MANIFEST.md`

## Product Owner Decisions Recorded

- `F13-DATA-QUALITY-001` implementation is deferred by Product Owner. Its manifest remains preserved and must not be deleted or treated as rejected.
- `F13-SHIPMENT-001` implementation remains deferred and preserved.
- Product Owner authorized implementation of the confirmed F1.3 route classification and Route Ranking filter.
- Route Ranking visible filter labels must be exactly `Tuyến bưu tá | Tất cả`.
- Default filter is `Tuyến bưu tá`.
- Hue Route Ranking includes only route codes starting with `53`.
- Confirmed customer-pickup/internal post-office routes must not be counted as postman delivery routes.

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
- Official classifications saved: `7` confirmed customer-pickup/internal post-office routes in `docs/07_REFERENCE/Shared_Business/F13_INTERNAL_ROUTE_CATALOG.md`.
- Route Ranking implementation: default `Tuyến bưu tá` excludes confirmed non-postman routes; `Tất cả` includes all Hue routes.
- Route Ranking remediation: active page now includes a minimal runtime-backed `Bảng Tuyến Ranking` connected to the selected filter.
- Route Ranking label remediation: Vietnamese table/filter labels are cleaned, and confirmed non-postman/customer-pickup rows show classification label `Nhận tại bưu cục` instead of filter label `Tất cả`.
- Remaining unconfirmed near-match classifications saved: `None`.

## Out Of Scope

- Full BCVH Ranking redesign.
- F1.3 calculation formula changes.
- Historical fact data or operational data changes.
- Permanent classification of all other routes as postman routes.
- BCVH Ranking, Route Ranking, Shipment, Data Quality, or other F1.3 implementation.
- Person ownership, RCA cause, lifecycle, message, export, or evidence implementation.

## Decision Required

Product Owner must perform runtime/UI review for the Route Ranking filter.

## Handoff

Status: `READY FOR PO RUNTIME/UI REVIEW`.

Route Ranking is implemented with catalog-backed classification, the `Tuyến bưu tá | Tất cả` filter, and a minimal route table connected to displayed runtime data. Do not self-award PO PASS.
