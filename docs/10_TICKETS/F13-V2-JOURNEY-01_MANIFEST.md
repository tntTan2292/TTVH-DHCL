# F13-V2-JOURNEY-01 Manifest

## 1. Ticket Information

- Ticket ID: `F13-V2-JOURNEY-01`
- Ticket Name: `F1.3 Chuyên đề: parcel journey by leg (Hành trình bưu gửi)`
- Owner: `Claude Code` (backend and UI, on PO request in chat 2026-11-03)
- Governance Version: `V2 Active`
- Branch: `codex/da-impl-006`
- Does not change Current Ticket. Part of the F1.3 trial module (`F13-V2-STRUCTURE-01`).

## 2. Business rules (PO 2026-11-03)

- F1.3 is measured from the level-1 mail driver's TMS scan down to the Khai thác Cấp 1 (KTC1) floor until the parcel is delivered. Acceptance time and anything earlier is out of scope.
- Show the legs only. **No fault is judged:** that also depends on the level-2 mail route of each BCVH, on which the PO will train later.
- A milestone the data does not have stays empty.
- The postman of a route on a day comes from F4.2.

| # | Milestone | Column | Note |
| --- | --- | --- | --- |
| 1 | TMS scan down to the floor | `fact_f13.thoi_gian_bd10_quet_tms` | |
| 2 | KTC1 closes towards BCVH | `fact_f11.thoi_gian_bd10_dong_di_kttinh` | Found through the BD10 number `fact_f41.so_hieu_bd10_xnd_bcp` |
| 3 | Arrival confirmed at BCVH | `fact_f41.thoi_gian_xnd_bd1` | PO checked EA464803978VN against the source: candidate B, 13:35:51 |
| 4 | Handed to the postman | `fact_f42.thoi_gian_gbt` | Several rows: the one with this delivery time, else the last before it |
| 5 | Delivered | `fact_f13.thoi_gian_ptc` | |

Hours are clock hours between milestones, so they can differ from TCT's figure (`thoi_gian_thuc_hien_thuc_te_gio`, shown beside them). A leg whose milestones are out of order is left empty.

## 3. Delivered

- API: `GET /api/f13/v2/journey/routes?date=&ma_bcvh=` and `GET /api/f13/v2/journey/parcels?date=&ma_bcvh=&route=&search=&sort=&order=&page=`. Module scope as the rest of `/api/f13/v2`: a BCVH-mode account gets its own unit only, another unit is 403.
- Page `/f13/v2/hanh-trinh`, menu "Hành trình bưu gửi" under F1.3 (mới), admin only during the trial: milestone coverage cards, route table (postmen of the day, volume, rate, median hours of each leg), parcel table (five milestones, hours, TCT hours).
- Files: `backend/src/services/f13v2/JourneyService.js`, `backend/src/repositories/F13JourneyRepository.js`, `frontend/src/features/f13v2/F13V2JourneyPage.jsx`, `components/F13V2JourneyRouteTable.jsx`, `components/F13V2JourneyParcelTable.jsx`, `journeyHelpers.js`.

## 4. Known data limits

- **Milestone 2:** F1.1 BD10 numbers imported before about 25/10/2026 are rounded (every value ends in 0; an 18-digit number stored as a number), so they do not match F4.1. From 25/10 about 60 % of parcels find it; earlier days almost none. Re-importing the old F1.1 days may restore them only if the source now exports the number as text; not attempted.
- **Milestone 4:** F4.2 data starts in April 2026.
- **Latest days:** F4.1 / F4.2 of the latest days may not be complete yet, so milestones 3 and 4 show fewer parcels until they are imported.
- The route and evidence pages of Chuyên đề still show the late-cash figures (design `F13-V2-STRUCTURE-01` Section 12, point 6).

## 5. Status

`IMPLEMENTED / READY FOR PO UI CHECK`. PO UI Check Required: `Yes`. Not opened in a browser by the implementer.

PO check: open Hành trình bưu gửi on 28/10/2026, find EA464803978VN and compare its five milestones with the source; click a route to filter the parcels; check several postmen on one route; camera on both tables; click-to-order on both tables.

## 6. Next

Judging faults after the PO's level-2 mail route (ĐTC2) training per BCVH. Rebuilding or retiring the old route and evidence pages after the PO accepts this page.
