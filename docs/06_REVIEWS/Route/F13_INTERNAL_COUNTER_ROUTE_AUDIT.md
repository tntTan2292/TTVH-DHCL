# F13 Internal Counter Route Candidate Audit

- Audit date: `2026-07-28`
- Scope: bounded read-only audit of current F1.3 route names for candidate internal-counter routes.
- Database: `backend/src/db/database.sqlite`
- Source table: `fact_f13`
- Business-date cutoff: `2026-07-28`
- Implementation performed: `None`
- Status: `READY FOR PO VERIFICATION`

## Product Owner Decision Recorded

Product Owner deferred `F13-DATA-QUALITY-001` implementation. Its manifest is preserved and must not be deleted or treated as rejected.

Product Owner authorized only this bounded audit before selecting the next F1.3 implementation ticket.

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
- No product code, UI, schema, formula, business rule, operational data, or route catalog was modified.

## Candidate PO Review List

| BCVH code | BCVH name | Route code | Current route name | Matched phrase | First business date | Latest business date | Dates present | Latest-day volume | Total available volume | Proposed classification |
| --- | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |
| `533140` | `BCVH Thuận Hóa` | `53314018` | `533140 - Phát tại quầy` | `Phát tại quầy` | `2026-01-03` | `2026-07-27` | 199 | 83 | 12,797 | `Internal route / waiting for PO confirmation` |

## Near-Match List - Not Classified Automatically

| BCVH code | BCVH name | Route code | Current route name | Matched near text | First business date | Latest business date | Dates present | Latest-day volume | Total available volume | Proposed classification |
| --- | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |
| `531120` | `Khách hàng lớn` | `5311203` | `531120 - Phát tại Bưu cục` | `phát tại bưu cục` | `2026-04-04` | `2026-06-29` | 3 | 1 | 3 | `Near match only / not classified` |
| `533140` | `BCVH Thuận Hóa` | `66134026` | `Lưu tại Bưu cục_01` | `lưu tại bưu cục` | `2026-07-02` | `2026-07-02` | 1 | 1 | 1 | `Near match only / not classified` |
| `533140` | `BCVH Thuận Hóa` | `7170550` | `BTHB_LUU_TAI_BCP` | `luu_tai_bcp` | `2026-05-31` | `2026-05-31` | 1 | 1 | 1 | `Near match only / not classified` |
| `533140` | `BCVH Thuận Hóa` | `7560700` | `Q07B_LUU_TAI_BCP` | `luu_tai_bcp` | `2026-05-06` | `2026-05-06` | 1 | 1 | 1 | `Near match only / not classified` |
| `535470` | `BCVH Hương Trà` | `53547010` | `535470 - Phát tại Bưu cục` | `phát tại bưu cục` | `2026-01-03` | `2026-07-27` | 175 | 51 | 3,881 | `Near match only / not classified` |
| `535790` | `BCVH A Lưới` | `53579027` | `535790 - Phát tại bưu cục` | `phát tại bưu cục` | `2026-01-05` | `2026-07-27` | 172 | 4 | 682 | `Near match only / not classified` |
| `536250` | `BCVH Hương Thủy` | `53625013` | `536250 - Phát tại Bưu cục` | `phát tại bưu cục` | `2026-01-03` | `2026-07-27` | 171 | 52 | 4,640 | `Near match only / not classified` |
| `537015` | `BCVH Thuận An` | `5370155` | `Phát tại bưu cục` | `phát tại bưu cục` | `2026-01-03` | `2026-07-27` | 191 | 26 | 1,723 | `Near match only / not classified` |
| `537015` | `BCVH Thuận An` | `56115012` | `Bưu cục phát` | `bưu cục phát` | `2026-03-23` | `2026-03-23` | 1 | 1 | 1 | `Near match only / not classified` |
| `537220` | `BCVH Phú Lộc` | `5372204` | `537220 - Phát tại Bưu cục` | `phát tại bưu cục` | `2026-02-12` | `2026-07-27` | 52 | 23 | 462 | `Near match only / not classified` |
| `537220` | `BCVH Phú Lộc` | `7560100` | `Q07A_LUU_TAI_BCP` | `luu_tai_bcp` | `2026-06-17` | `2026-06-17` | 1 | 1 | 1 | `Near match only / not classified` |

## PO Verification Checklist

- Confirm whether route `53314018 - 533140 - Phát tại quầy` is an internal-counter route.
- Decide whether any near-match row should also be considered an internal-counter route in a future ticket.
- Confirm whether future implementation should persist an official route classification catalog.
- Confirm that all non-confirmed routes must remain unclassified, not permanently treated as postman routes by inference.

## Handoff

Status: `READY FOR PO VERIFICATION`.

No implementation is authorized until Product Owner verifies the route classifications and approves a follow-up ticket.
