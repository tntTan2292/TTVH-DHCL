# F13 Internal Counter Route Candidate Audit

- Audit date: `2026-07-28`
- Scope: bounded read-only audit of current F1.3 route names for candidate internal-counter routes.
- Database: `backend/src/db/database.sqlite`
- Source table: `fact_f13`
- Business-date cutoff: `2026-07-28`
- Implementation performed: `Route classification catalog and Route Ranking filter`
- Status: `READY FOR PO RUNTIME/UI REVIEW`

## Product Owner Decision Recorded

Product Owner deferred `F13-DATA-QUALITY-001` implementation. Its manifest is preserved and must not be deleted or treated as rejected.

Product Owner authorized only this bounded audit before selecting the next F1.3 implementation ticket.

Product Owner later confirmed route `53314018 - 533140 - Phát tại quầy` as an internal-counter route of `533140 - BCVH Thuận Hóa`.

Product Owner also decided:

- route `53314018` must not be counted as a postman delivery route;
- the `11` near-match routes remain unclassified pending PO verification;
- no route should be classified solely by live text matching once confirmed;
- remaining routes must not be classified permanently as postman routes by inference.

Product Owner later authorized implementation of the confirmed F1.3 route classification and Route Ranking filter.

Additional confirmed non-postman routes:

- `5311203 - 531120 - Phát tại Bưu cục`
- `53547010 - 535470 - Phát tại Bưu cục`
- `53579027 - 535790 - Phát tại bưu cục`
- `53625013 - 536250 - Phát tại Bưu cục`
- `5370155 - Phát tại bưu cục`
- `5372204 - 537220 - Phát tại Bưu cục`

## Matching Rule

Candidate rule:

- route name contains `Tuyến phát bưu cục`; or
- route name contains `Phát tại quầy`.

Normalization used for matching:

- ignore letter case;
- trim leading/trailing spaces;
- collapse repeated spaces;
- keep phrase spelling exact.

No fuzzy synonyms or inferred route types were used.

Near-match list rule:

- names that did not match the approved candidate phrases but contained close internal-counter-looking text such as `phát tại bưu cục`, `bưu cục phát`, `lưu tại bưu cục`, or `LUU_TAI_BCP`.
- these rows are not classified automatically.

## Audit Evidence

- Total profiled route-name groups: `158`.
- Exact candidate route groups: `1`.
- Near-match route groups: `11`.
- Future-dated rows were excluded from first/latest date, date count, latest-day volume, and total available volume.
- Authoritative catalog entries created: `7` confirmed customer-pickup/internal post-office routes in `docs/07_REFERENCE/Shared_Business/F13_INTERNAL_ROUTE_CATALOG.md`.
- Route Ranking filter implemented with exact labels `Tuyến bưu tá | Tất cả`.
- No schema, formula, operational fact data, historical result, full BCVH Ranking redesign, or Route Ranking redesign was performed.

## Confirmed Internal-Counter Route Catalog Entry

| BCVH code | BCVH name | Route code | Route name at decision | Classification | Effective date | PO decision date | Decision basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `533140` | `BCVH Thuận Hóa` | `53314018` | `533140 - Phát tại quầy` | `Customer pickup / internal post-office route` | `2026-01-03` | `2026-07-28` | Product Owner confirmed customers receive shipments at the delivery post office; not counted as a postman delivery route. |
| `531120` | `Khách hàng lớn` | `5311203` | `531120 - Phát tại Bưu cục` | `Customer pickup / internal post-office route` | `2026-04-04` | `2026-07-28` | Product Owner confirmed customers receive shipments at the delivery post office; not counted as a postman delivery route. |
| `535470` | `BCVH Hương Trà` | `53547010` | `535470 - Phát tại Bưu cục` | `Customer pickup / internal post-office route` | `2026-01-03` | `2026-07-28` | Product Owner confirmed customers receive shipments at the delivery post office; not counted as a postman delivery route. |
| `535790` | `BCVH A Lưới` | `53579027` | `535790 - Phát tại bưu cục` | `Customer pickup / internal post-office route` | `2026-01-05` | `2026-07-28` | Product Owner confirmed customers receive shipments at the delivery post office; not counted as a postman delivery route. |
| `536250` | `BCVH Hương Thủy` | `53625013` | `536250 - Phát tại Bưu cục` | `Customer pickup / internal post-office route` | `2026-01-03` | `2026-07-28` | Product Owner confirmed customers receive shipments at the delivery post office; not counted as a postman delivery route. |
| `537015` | `BCVH Thuận An` | `5370155` | `Phát tại bưu cục` | `Customer pickup / internal post-office route` | `2026-01-03` | `2026-07-28` | Product Owner confirmed customers receive shipments at the delivery post office; not counted as a postman delivery route. |
| `537220` | `BCVH Phú Lộc` | `5372204` | `537220 - Phát tại Bưu cục` | `Customer pickup / internal post-office route` | `2026-02-12` | `2026-07-28` | Product Owner confirmed customers receive shipments at the delivery post office; not counted as a postman delivery route. |

## Candidate PO Review List

| BCVH code | BCVH name | Route code | Current route name | Matched phrase | First business date | Latest business date | Dates present | Latest-day volume | Total available volume | Confirmed classification |
| --- | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |
| `533140` | `BCVH Thuận Hóa` | `53314018` | `533140 - Phát tại quầy` | `Phát tại quầy` | `2026-01-03` | `2026-07-27` | 199 | 83 | 12,797 | `Internal counter route - PO confirmed` |

## Near-Match List - Not Classified Automatically

| BCVH code | BCVH name | Route code | Current route name | Reason considered near match | First business date | Latest business date | Dates present | Latest-day volume | Total available volume | Proposed review note |
| --- | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |
| `533140` | `BCVH Thuận Hóa` | `66134026` | `Lưu tại Bưu cục_01` | Contains `lưu tại bưu cục`, indicating counter retention language but not an approved phrase. | `2026-07-02` | `2026-07-02` | 1 | 1 | 1 | Review with PO; no final classification assigned. |
| `533140` | `BCVH Thuận Hóa` | `7170550` | `BTHB_LUU_TAI_BCP` | Contains `LUU_TAI_BCP`, an abbreviation-like near match for lưu tại bưu cục, not an approved phrase. | `2026-05-31` | `2026-05-31` | 1 | 1 | 1 | Review with PO; no final classification assigned. |
| `533140` | `BCVH Thuận Hóa` | `7560700` | `Q07B_LUU_TAI_BCP` | Contains `LUU_TAI_BCP`, an abbreviation-like near match for lưu tại bưu cục, not an approved phrase. | `2026-05-06` | `2026-05-06` | 1 | 1 | 1 | Review with PO; no final classification assigned. |
| `537015` | `BCVH Thuận An` | `56115012` | `Bưu cục phát` | Contains `bưu cục phát`, a reordered counter-route-looking phrase, not an approved phrase. | `2026-03-23` | `2026-03-23` | 1 | 1 | 1 | Review with PO; no final classification assigned. |
| `537220` | `BCVH Phú Lộc` | `7560100` | `Q07A_LUU_TAI_BCP` | Contains `LUU_TAI_BCP`, an abbreviation-like near match for lưu tại bưu cục, not an approved phrase. | `2026-06-17` | `2026-06-17` | 1 | 1 | 1 | Review with PO; no final classification assigned. |

## PO Verification Checklist

- Runtime-check default Route Ranking filter is `Tuyến bưu tá`.
- Runtime-check `Tuyến bưu tá` excludes confirmed customer-pickup/internal post-office routes from participating postman route counts.
- Runtime-check `Tất cả` includes all Hue route codes starting with `53`, including confirmed customer-pickup/internal post-office routes.
- Runtime-check remaining unconfirmed near-match rows are not given final classification.

## Targeted Validation Evidence

- Backend classification tests: `node backend/test_f13_route_classification.js` - `PASS`.
- Frontend filter/request tests: `node --test frontend/src/features/route/routeRankingFilters.test.js` - `PASS`.
- Frontend build: `npm.cmd run build` in `frontend` - `PASS` with existing Vite chunk-size warning.
- Frontend lint: `npm.cmd run lint` in `frontend` - `PASS` with pre-existing warnings outside this change.
- Diff hygiene: `git diff --check` - `PASS`.
- Direct service check for `2026-07-27`, `533140`: default `Tuyến bưu tá` returned `33` postman routes and excluded `53314018`; `Tất cả` returned `34` Hue routes and included `53314018`; non-Hue routes present in `Tất cả`: `false`.

## Handoff

Status: `READY FOR PO RUNTIME/UI REVIEW`.

Route Ranking filter is implemented. Do not self-award PO PASS.
