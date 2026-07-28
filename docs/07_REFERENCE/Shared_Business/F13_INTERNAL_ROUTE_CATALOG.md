# F1.3 Internal Route Catalog

- Owner: Product Owner
- Authority: confirmed route-classification catalog for later F1.3 daily analysis
- Status: `ACTIVE - PARTIAL CATALOG`
- Last updated: `2026-07-28`

## Purpose

This catalog records Product Owner-confirmed F1.3 routes that must be treated as internal-counter routes in later analysis.

Confirmed routes must be classified by this catalog entry, not by live route-name text matching alone.

## Classification Rules

- `Internal counter route`: route is confirmed by Product Owner as an internal-counter route.
- Confirmed internal-counter routes must not be counted as postman delivery routes.
- Routes absent from this catalog are not automatically classified as postman routes.
- Near-match routes remain unclassified until Product Owner explicitly confirms them.
- This catalog does not modify operational fact data, historical results, database schema, formulas, UI, BCVH Ranking, or Route Ranking.

## Confirmed Internal-Counter Routes

| BCVH code | BCVH name | Route code | Route name at decision | Classification | Effective date | PO decision date | Decision basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `533140` | `BCVH Thuận Hóa` | `53314018` | `533140 - Phát tại quầy` | `Internal counter route` | `2026-01-03` | `2026-07-28` | Product Owner confirmed route `53314018 - 533140 - Phát tại quầy` as an internal-counter route of `533140 - BCVH Thuận Hóa`; it must not be counted as a postman delivery route. |

## Pending Verification

The `11` near-match routes listed in `docs/06_REVIEWS/Route/F13_INTERNAL_COUNTER_ROUTE_AUDIT.md` remain unclassified pending Product Owner verification.

## Handoff

Future implementation may consume this catalog only after Product Owner approves a dedicated implementation ticket.
