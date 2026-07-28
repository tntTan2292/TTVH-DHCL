# F1.3 Internal Route Catalog

- Owner: Product Owner
- Authority: confirmed route-classification catalog for later F1.3 daily analysis
- Status: `ACTIVE - IMPLEMENTED PARTIAL CATALOG`
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
| `533140` | `BCVH Thuận Hóa` | `53314018` | `533140 - Phát tại quầy` | `Customer pickup / internal post-office route` | `2026-01-03` | `2026-07-28` | Product Owner confirmed customers receive shipments at the delivery post office; not counted as a postman delivery route. |
| `531120` | `Khách hàng lớn` | `5311203` | `531120 - Phát tại Bưu cục` | `Customer pickup / internal post-office route` | `2026-04-04` | `2026-07-28` | Product Owner confirmed customers receive shipments at the delivery post office; not counted as a postman delivery route. |
| `535470` | `BCVH Hương Trà` | `53547010` | `535470 - Phát tại Bưu cục` | `Customer pickup / internal post-office route` | `2026-01-03` | `2026-07-28` | Product Owner confirmed customers receive shipments at the delivery post office; not counted as a postman delivery route. |
| `535790` | `BCVH A Lưới` | `53579027` | `535790 - Phát tại bưu cục` | `Customer pickup / internal post-office route` | `2026-01-05` | `2026-07-28` | Product Owner confirmed customers receive shipments at the delivery post office; not counted as a postman delivery route. |
| `536250` | `BCVH Hương Thủy` | `53625013` | `536250 - Phát tại Bưu cục` | `Customer pickup / internal post-office route` | `2026-01-03` | `2026-07-28` | Product Owner confirmed customers receive shipments at the delivery post office; not counted as a postman delivery route. |
| `537015` | `BCVH Thuận An` | `5370155` | `Phát tại bưu cục` | `Customer pickup / internal post-office route` | `2026-01-03` | `2026-07-28` | Product Owner confirmed customers receive shipments at the delivery post office; not counted as a postman delivery route. |
| `537220` | `BCVH Phú Lộc` | `5372204` | `537220 - Phát tại Bưu cục` | `Customer pickup / internal post-office route` | `2026-02-12` | `2026-07-28` | Product Owner confirmed customers receive shipments at the delivery post office; not counted as a postman delivery route. |

## Pending Verification

The remaining unconfirmed near-match routes listed in `docs/06_REVIEWS/Route/F13_INTERNAL_COUNTER_ROUTE_AUDIT.md` remain unclassified pending Product Owner verification.

## Handoff

Implemented Route Ranking may consume this catalog for the bounded `Tuyến bưu tá | Tất cả` filter. Other modules need separate Product Owner authorization before consuming it.
