# F13-PARCEL-CARD-01 Manifest

## 1. Ticket Information

- Ticket ID: `F13-PARCEL-CARD-01` (part of G6 clean-up, `docs/03_PLANNING/F13-GOLIVE-PLAN-01.md`)
- Name: `F1.3 one parcel card and one parcel list (Nguyên nhân | Hành trình views)`
- Owner: Claude Code / Opus 5.5 (scope, review, real render). **B1 backend: Claude Code / Sonnet 5.5. U1 screen: Antigravity** (after B1 is accepted). Does not change the Current Ticket.
- Branch: `codex/da-impl-006`.
- Status: `OPEN - B1 ready for Sonnet`. `PO UI Check Required = Yes`.

## 2. Why

The same parcel was shown in two places with half the facts each:

- Dữ liệu minh chứng: the verdict, TCT hours, the system cause and the Chuyên quản conclusion, plus a detail window with the 5 milestones.
- Hành trình bưu gửi: the row popup and the bottom search table, with the lot, the 5 milestones and the leg hours.

Clicking a parcel number did not lead to one common place. The PO judged this hard to use (2026-11-09).

## 3. PO decisions (2026-11-09)

| ID | Decision |
|---|---|
| C1 | One **parcel card** ("Phiếu bưu gửi"). Clicking a parcel number anywhere in F1.3 v2 opens it: Dữ liệu minh chứng, the Hành trình popup, the Phân tích nguyên nhân parcel window, the Đề xuất quy tắc samples. It has three tabs: **Hành trình** (5 milestones, leg hours, lot), **Nguyên nhân** (system conclusion and its basis), **Phân tích** (Chuyên quản conclusion with history; writing it keeps today's rules and rights). |
| C2 | **One parcel list**, on Dữ liệu minh chứng, with a view switch **Nguyên nhân / Hành trình** that changes the column set. Filters, paging (20/50/100) and the export work in both views. |
| C3 | Hành trình bưu gửi keeps its route / postman table. Clicking a row opens the shared list, already filtered to that route + postman and period, in the Hành trình view. The **bottom search table of Hành trình is removed**: search lives on Dữ liệu minh chứng. |
| C4 | No figure changes. Same parcels, same counts. A row's list still equals its Sản lượng, as in J8. |

Access: every role holding `f13.analysis.view` (all roles today) sees the list and the card. Writing a conclusion still needs `f13.analysis.write` and stays limited to the user's own unit.

## 4. B1 backend (Sonnet) - technical scope

- `GET /api/f13/v2/evidence/list` and `/export`:
  - Add per row the journey facts that `/journey/parcels` returns today: milestones, leg hours, lot fields, TCT hours. Read them from `f13_cause_parcel` (`ms_*`, `leg_*_ms`). Use **one shared mapping** with `JourneyPeriodService`, not a copy.
  - Accept the filters `route` and `postman` (a code or `@NONE`) with the same meaning as `/journey/parcels`.
  - Accept the period forms `week` / `month` / `date` beside `from`/`to`, through `periodResolve`, with the same 93-day limit.
  - Add sort keys for the milestone and leg fields.
- New `GET /api/f13/v2/evidence/parcel?ngay_do_kiem=&ma_bg=` (capability `f13.analysis.view`, unit scope as `/evidence/list`). It returns the card in one call:
  - the journey facts;
  - the system conclusion with its basis;
  - the latest analysis and the history (reuse `history`).
- Parity tests:
  - for a route + postman over a week and a month, the list count equals the `route_volume` of `/journey/routes`, and each parcel's journey fields equal `/journey/parcels`;
  - unit scope: a Chuyên quản cannot read another unit's card (403/404).
- Do not change `/journey/*` responses yet. U1 will stop calling `/journey/parcels`, and its removal is decided after U1.

## 5. U1 screen (Antigravity, after B1 is accepted)

Written in detail after B1. Outline:

- One `F13V2ParcelCard` modal that replaces `F13V2EvidenceDetailModal` and the open-in-Hành-trình link.
- A view switch on Dữ liệu minh chứng.
- The Hành trình row popup reuses the evidence list component.
- The bottom table of Hành trình is removed.
- Parcel numbers become clickable on every F1.3 v2 table.
- Follow `report_block_ui_standard.md`.

## 6. Change log

- 2026-11-09: created by Claude Code / Opus 5.5 after the PO chose "phiếu chung + gộp danh sách".

## 7. B1 backend result (Claude Code / Sonnet 5.5, 2026-11-09)

Status: B1 done, waiting for the Opus review. No live build, no restart, no login to the live backend, no figure and no cause rule changed. `/journey/*` responses are unchanged.

- **One shared mapping.** `journeyFactsOf(row)` and `routeLabelOf(row, names)` in `JourneyPeriodService.js` build the lot, TCT, leg-hour and milestone facts. `/journey/parcels`, `/evidence/list` and `/evidence/parcel` all call them, so there is no copy. They read `f13_cause_parcel` (`ms_*`, `leg_*_ms`); no rebuild is needed.
- **`/evidence/list` and `/export`.**
  - Each item has a new `journey` object (`ma_lo`, `khong_tron_lo`, `limit_ms`, `tct_ms`, `l_ms`, `r_ms`, `legs`, `milestones`). The old `milestones` and `legs` fields are untouched.
  - `date` is a new period form beside `from+to`, `week` and `month`.
  - Sort keys: `tms`, `depart`, `arrive`, `gbt`, `gbt_first`, `ptc`, the six `leg` names (`tms_depart` ... `tms_ptc`), and `ma_lo`, `danh_gia`, `ma_tuyen`. Missing values come last in both directions; `meta.order = SORT`.
  - `route` was already accepted (the `/why` meaning). `postman`: see the decision below.
- **Decision made by the executor (technical, please confirm).** `view=journey` switches the list to the Hành trình rules: `postman` is the postman SHOWN of the journey (a code or `@NONE`, as in `/journey/parcels`), and the 93-day limit applies. Without `view=journey` nothing changes: `postman` stays the `/why` first postman (the existing Dữ liệu minh chứng filter and its tests), and the limit stays at the evidence page's 366 days. U1 must send `view=journey` when it opens a row of Hành trình. The alternative (always the shown postman) would silently change the counts of the existing postman drill-down.
- **`GET /api/f13/v2/evidence/parcel?ngay_do_kiem=&ma_bg=`.** Capability `f13.analysis.view`, unit scope as `/evidence/list`: another unit 403 `OUT_OF_SCOPE`, unknown parcel 404 `PARCEL_NOT_FOUND`, missing parameters 400 `MISSING_PARAM`. Response `data`: `ngay_do_kiem`, `ma_bg`, `ma_bcvh`, `ten_bcvh`, `ma_tuyen`, `ten_tuyen`, `route_scope`, `danh_gia`, `postman {first{ma,ten}, shown{ma,ten}}`, `journey {…as in the list}`, `tct {hours, limit_hours, recomputed_hours, remaining_at_arrival_hours}`, `system {status, code, detail, line, label, reason, step, basis, flags[], hints[], a_source, remaining_at_arrival_hours}`, `analysis` (latest or null), `can_analyse`, `history {entries[]}` (same entries as `/evidence/history`).
- **Tests** (`node --test --experimental-sqlite`, one file at a time): new `src/routes/f13v2ParcelCard.test.js` 8/8 (week and month parity of count and journey fields for every route + postman row, route alone = `route_volume`, `date` and the 93-day limit, sort keys, export, card shape, 404/400, Chuyên quản 403 on another unit). Existing: `f13v2Evidence` 16, `f13v2Routes.scope` 13, `f13v2WhyRoutes.scope` 5, `JourneyPeriodService` 16, `CauseAggQueryService` 22, `CauseAggBuilder` 21, `f13v2RuleProposal` 8, all pass.
- The list still reads one `JourneyService` day per page for the old `milestones` field; U1 can ignore it. Removing that read and the old fields is a later decision, together with the removal of `/journey/parcels`.

## 8. Opus review of B1 (2026-11-09) - B1-FIX needed

- Accepted: the shared mapping, the `/evidence/parcel` card, the unit scope, and `view=journey` (keeps the existing first-postman drill-down unchanged, C4). Re-run: `f13v2ParcelCard` 8/8, `JourneyPeriodService` 16/16.
- **B1-R1 (blocking U1), speed.** Timed warm on the B3 database copy (isolated server on 5051, leader account):

  | Request | Time |
  |---|---|
  | `evidence/list?view=journey&month=2026-10&bcvh=533140&route=53314049&postman=53B383&page_size=20`, the Hành trình row popup | **6,3 s** |
  | `evidence/list?view=journey&month=2026-10&bcvh=533140&page_size=20` | 5,0 s |
  | `evidence/list?view=journey&month=2026-10&bcvh=533140&sort=gbt_ptc&order=desc&page_size=100` | **14,2 s** |
  | `journey/parcels?month=2026-10&sort=tms_ptc&order=desc&page_size=100`, today's popup | 0,11 s |
  | `evidence/list?view=journey&date=2026-10-15&bcvh=533140&page_size=20` | 1,45 s |

  Cause: every distinct day on a page loads a whole `JourneyService` day for the old `milestones` field. A month page spans up to 20-100 days.

  Fix: the list must not call `JourneyService` at all. Build the old `milestones` / `milestones_state` / `tct.hours_text` from the cause-table columns through the shared mapping, or drop them if no screen reads them (check `F13V2Evidence*`). The `/journey/parcels` speed (~0,1 s) is the target for the popup.
- **For U1:** `can_analyse` only means "the parcel failed". The screen must also check `f13.analysis.write` and the unit before it shows the Phân tích form.

## 9. B1-FIX result (Claude Code / Sonnet 5.5, 2026-11-09)

Status: B1-R1 fixed, waiting for the Opus review. No live build, no restart, no login to the live backend; all measuring on the B3 database copy.

- `/evidence/list` and `/export` no longer call `JourneyService` (the day cache, `_dayParcels`, and the 12-day page limit are gone). Every old field is filled from the `f13_cause_parcel` row through the shared `journeyFactsOf`: `milestones` (with sources F1.3 / F1.1 / F4.1 or BatchFile / F4.2), `milestones_state`, `legs`, `tct.hours_text`, and `ten_tuyen` (one `agg_f13_day` query per page, else the Hành trình label). No frontend file needed to change: `F13V2EvidenceDetailModal` and `F13V2EvidenceTable` read exactly these fields, so all were kept. `EvidenceService` still accepts a `journeyService` option but ignores it.
- **Same items, same counts, same order** - old service (HEAD) against the new one, same four requests, row by row on the copy: total equal, `ma_bg` order equal, in all four. Field differences, all explained:
  1. `tct.hours_text` is rebuilt as `H:M` from `tct_ms` (the source text keeps the minutes unpadded, e.g. `85:3`), and matches the old text wherever the table has `tct_ms`. **Not rebuildable:** a parcel with no `tct_ms` in the table (no PTC yet) had a text in `fact_f13` (e.g. `9:21`); it is now `null` (1 of 20 in the popup, 6 of 20 on the day request). The only reader is the small caption "Gốc: ..." of the detail modal.
  2. Rows that the old code returned empty because the page spanned more than 12 days (`SKIPPED_TOO_MANY_DAYS`: `milestones`, `legs`, `ten_tuyen` null; 5 of 100 on the leg sort) are now filled, `milestones_state = OK`. This is the intended improvement.
  3. `milestones_state` is `OK` when the row has any milestone, else `NOT_IN_SOURCE`; `UNAVAILABLE` no longer exists.
- **Time, in-process on the copy (service call, leader scope = city, 2nd call warm).** Old = first call, which loads the days (the HTTP numbers of §8 are the same cause):

  | Request | Old, first call | New, first / warm |
  |---|---|---|
  | popup: `view=journey&month=2026-10&bcvh=533140&route=53314049&postman=53B383&page_size=20` | 7,4 s | 0,43 s / 0,29 s |
  | `view=journey&month=2026-10&bcvh=533140&page_size=20` | 4,2 s | 0,30 s / 0,29 s |
  | `...&sort=gbt_ptc&order=desc&page_size=100` | 16,1 s (17,7 s on the 2nd call: 100 rows span more days than the cache holds) | 0,26 s / 0,30 s |
  | `view=journey&date=2026-10-15&bcvh=533140&page_size=20` | 1,4 s | 0,009 s / 0,008 s |

  (The fifth request of §8, `/journey/parcels`, is unchanged, ~0,1 s.) The rest of the 0,3 s on a month is the total count and `_meta` on 57 700 rows.
- Test fixture of `f13v2Evidence.test.js`: it now fills `ms_tms` / `ms_ptc` of the cause table (the list reads them from there), instead of relying on `fact_f13` through `JourneyService`.
- Suites: `f13v2ParcelCard` 8, `f13v2Evidence` 16, `JourneyPeriodService` 16, `f13v2Routes.scope` 13, `f13v2WhyRoutes.scope` 5, `f13v2RuleProposal` 8, all pass.
