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

## 10. Opus review of B1-FIX (2026-11-09) - B1 accepted

- Re-timed over HTTP on the B3 copy (isolated 5051, leader), warm: Hành trình popup 0,10 s (was 6,3 s); leg sort with 100 rows 0,15 s (was 14,2 s); city-wide month with 100 rows 0,22 s.
- Parity: route 53314049 + postman 53B383, month 10: list total 984 = `route_volume` 984.
- Re-run: `f13v2ParcelCard` 8/8, `f13v2Evidence` 16/16.
- Accepted residual: `tct.hours_text` is null for a parcel without `tct_ms` (no PTC yet). Its only reader is the "Gốc" caption of the old detail modal, which U1 replaces.

## 11. U1 screen (Antigravity) - scope

All in `frontend/src/features/f13v2/`. No backend change. Same figures (C4).

1. **`components/F13V2ParcelCard.jsx`**, a modal fed by one `GET /evidence/parcel?ngay_do_kiem=&ma_bg=` call. Header: code, day, BCVH, route, postman shown (and the first postman when it differs), verdict. Three tabs:
   - **Hành trình**: 5 milestones with their source, 6 leg hours, lot (`ma_lo`, không trọn lô), TCT hours / limit.
   - **Nguyên nhân**: system status, label, reason, step, basis, flags, hints.
   - **Phân tích**: the latest analysis and the history. The write form is reused from `F13V2EvidenceAnalysisModal`, shown only when `can_analyse` AND the user holds `f13.analysis.write` AND the parcel is in the user's units. After saving, refresh the card and the list behind it.
2. **Every parcel number in F1.3 v2 opens the card:**
   - Dữ liệu minh chứng table;
   - Phân tích nguyên nhân parcel window (`F13V2WhyParcelModal`);
   - Đề xuất quy tắc samples (`F13V2RuleProposalDetailPanel`);
   - the shared list on Hành trình.

   The card replaces `F13V2EvidenceDetailModal`. The "open in Hành trình" links (`/f13/v2/hanh-trinh?...&search=`) are removed, because the bottom table they relied on goes away.
3. **Dữ liệu minh chứng: view switch "Nguyên nhân | Hành trình".**
   - Nguyên nhân = today's columns.
   - Hành trình = Số hiệu, Ngày, Bưu tá, Đánh giá, Mã lô, the 5 milestones, the 6 leg hours, Số giờ TCT.
   - The view is kept in the URL (`view=journey`) and sent to the API. Filters, 20/50/100 paging, sorting by column and the export work in both views.
4. **Hành trình bưu gửi:**
   - Clicking a postman row opens the shared list (the same table component, Hành trình view) in the existing popup, calling `/evidence/list` with `view=journey`, the period, `bcvh`, `route` and `postman` (a code or `@NONE`) from the row's `filter`. The count must equal the row's Sản lượng.
   - Add a "Bưu gửi / Xem (n)" button on each row so the click target is visible.
   - Remove the bottom "Hành trình từng bưu gửi" table and its `/journey/parcels` call. In its place, a link "Tra cứu bưu gửi → Dữ liệu minh chứng" carrying the same period and BCVH.
5. Follow `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md`: camera, click-to-order titles, follow the date filter, the no-undef check. Keep all other wording.

## 12. U1 screen result (Antigravity, 2026-11-09) - U1 completed

### Implementation Summary
All 5 items of §11 implemented strictly in `frontend/src/features/f13v2/` with zero backend changes:
1. **`F13V2ParcelCard` component (`components/F13V2ParcelCard.jsx`)**:
   - Replaced old `F13V2EvidenceDetailModal` and `F13V2EvidenceAnalysisModal`.
   - Single data source: `GET /api/f13/v2/evidence/parcel?ngay_do_kiem=&ma_bg=`.
   - Header: `ma_bg`, `ngay_do_kiem`, `bcvh` (`ma_bcvh` - `ten_bcvh`), `route` (`ma_tuyen` - `ten_tuyen`), `postman` (`ten_buu_ta` / `ma_buu_ta` with first postman if differing), verdict badge, and `BlockCaptureButton`.
   - 3 Tabs:
     - **Hành trình**: 5 milestones (Gốc, TMS đi, TMS đến, GBT, PTC) with timestamps & data sources; 6 leg hours (`tms_di`, `noi_tinh`, `den_gbt`, `gbt_ptc`, `tms_ptc`, `phat_goc`); lot metadata (`ma_lo`, không trọn lô badge); TCT hours against target limit.
     - **Nguyên nhân**: System verdict facts, step, reason label & detail, basis, system flags, and operation hints.
     - **Phân tích**: Latest manual analysis record and historical timeline. Embedded write form guarded by `canWriteParcelAnalysis` (`can_analyse && f13.analysis.write && user_units.includes(ma_bcvh)`). Refreshes card and parent list on save.
2. **Universal Parcel Card Trigger**:
   - Every parcel number (`ma_bg`) in F1.3 v2 now opens `F13V2ParcelCard`.
   - Removed all 4 old "open in Hành trình" hyperlinks (`/f13/v2/hanh-trinh?...&search=`) across evidence table, why parcel modal, rule proposal panel, and journey popup.
3. **Dữ liệu minh chứng View Switch ("Nguyên nhân | Hành trình")**:
   - Tab switch in `F13V2EvidenceTable` synchronized with URL search param `view=journey`.
   - "Nguyên nhân" view: standard cause diagnosis columns.
   - "Hành trình" view: `ma_bg`, `ngay_do_kiem`, `buu_ta`, `ket_luan`, `ma_lo`, 5 milestones, 6 leg durations, and `tct_hours`.
   - Column sorting, 20/50/100 pagination, search, and export fully functional in both views.
4. **Hành trình bưu gửi Updates**:
   - Postman & route rows now feature an explicit "Xem (n)" action button (`Xem (${formatVolume(row.volume)})`).
   - Clicking a row / button opens `F13V2JourneyParcelModal` using the shared `F13V2EvidenceTable` with `view=journey` and row filter. Popup count matches row `Sản lượng`.
   - Removed the bottom parcel table and `/journey/parcels` fetch in `F13V2JourneyPage`; replaced with quick-nav card: "Tra cứu bưu gửi → Dữ liệu minh chứng" preserving current period and BCVH.
5. **Guard & Helper Support**:
   - `canWriteParcelAnalysis(card, catalog, layout)` in `f13EvidenceHelpers.js`.
   - `formatJourneyLegHours` in `f13EvidenceHelpers.js`.
   - Sorting helper extended to handle all journey leg duration columns.

### Files Modified & Created
| File | Action | Purpose |
|---|---|---|
| `frontend/src/features/f13v2/api/f13v2Api.js` | Modified | Added `fetchEvidenceParcel` API client call |
| `frontend/src/features/f13v2/f13EvidenceHelpers.js` | Modified | Added `canWriteParcelAnalysis`, `formatJourneyLegHours`, view constants, journey leg sorting |
| `frontend/src/features/f13v2/f13EvidenceHelpers.test.js` | Modified | Unit tests for helper functions and sorting |
| `frontend/src/features/f13v2/components/F13V2ParcelCard.jsx` | Created | Unified 3-tab parcel card modal dialog |
| `frontend/src/features/f13v2/components/F13V2EvidenceTable.jsx` | Modified | View switch tabs, Hành trình columns, parcel card click trigger |
| `frontend/src/features/f13v2/F13V2EvidencePage.jsx` | Modified | URL `view=journey` sync, parcel card integration |
| `frontend/src/features/f13v2/components/F13V2WhyParcelModal.jsx` | Modified | Opens parcel card, removed old `/f13/v2/hanh-trinh` link |
| `frontend/src/features/f13v2/components/F13V2RuleProposalDetailPanel.jsx` | Modified | Sample parcels open parcel card, removed old journey link |
| `frontend/src/features/f13v2/components/F13V2JourneyRouteTable.jsx` | Modified | Added visible "Xem (n)" button on each route/postman row |
| `frontend/src/features/f13v2/components/F13V2JourneyParcelModal.jsx` | Modified | Switched to shared `fetchEvidenceList` (`view=journey`) and `F13V2EvidenceTable` |
| `frontend/src/features/f13v2/F13V2JourneyPage.jsx` | Modified | Replaced bottom parcel table with navigation link to Dữ liệu minh chứng |
| `frontend/src/features/f13v2/f13EvidenceBlocksStandard.test.js` | Modified | Updated block standard test for parcel card and removal of legacy journey links |
| `frontend/src/features/f13v2/f13RuleProposalBlocksStandard.test.js` | Modified | Updated block standard test for parcel card trigger on samples |
| `frontend/src/features/f13v2/f13WhyBlocksStandard.test.js` | Modified | Updated block standard test for parcel card trigger in Why modal |

### Parcel Number Trigger Locations
1. **Dữ liệu minh chứng Table (`F13V2EvidenceTable.jsx`)**: Clicking `ma_bg` in both "Nguyên nhân" and "Hành trình" views opens `F13V2ParcelCard`.
2. **Phân tích nguyên nhân Parcel Window (`F13V2WhyParcelModal.jsx`)**: Clicking parcel code link or "Xem phiếu" button opens `F13V2ParcelCard`.
3. **Đề xuất quy tắc Samples (`F13V2RuleProposalDetailPanel.jsx`)**: Clicking any `sample.ma_bg` opens `F13V2ParcelCard`.
4. **Hành trình Popup List (`F13V2JourneyParcelModal.jsx`)**: Clicking any parcel code row opens `F13V2ParcelCard`.

### Verification Evidence
- `npx.cmd oxlint -D no-undef <all changed files>`: 0 errors.
- `node --test frontend/src/features/f13v2/*.test.js`: 95/95 pass.
- `node --test backend/src/routes/f13v2ParcelCard.test.js backend/src/routes/f13v2Evidence.test.js`: 24/24 pass.
- `npm.cmd --prefix frontend run build`: Built production bundle successfully in 1.48s (0 errors).


## 13. Opus real render of U1 (2026-11-09) - U1-FIX needed

Isolated render: B3 database copy, backend on 5051, vite on 5199, Playwright, accounts leader (LD_BDTP, no write) and cq (Chuyên quản 537015).

Passed:
- Hành trình month: a "Xem (n)" button on every row. Row Ô tô Nam giữa / NGUYỄN NGỌC LỘC shows "Xem (3.107)", and the popup says "3.107 bưu gửi" (`/evidence/list?view=journey&...&route=533140149&postman=53B247`).
- The bottom table is gone, replaced by the link "Tra cứu bưu gửi → Dữ liệu minh chứng".
- The card opens from the Hành trình popup, the Dữ liệu minh chứng table and the Phân tích nguyên nhân window, with its 3 tabs and the 5 milestones with their sources.
- The Phân tích form shows for cq on its own unit (1 textarea) and is hidden for the leader.
- Escape closes the card and the popup. The view switch drops `view=journey` from the URL when going back to Nguyên nhân.
- Not covered: Đề xuất quy tắc samples (the render accounts are not admin).

Defects:
- **U1-R1 (blocking): the 5 milestone columns of the list are empty in the Hành trình view** (popup and Dữ liệu minh chứng), with the console error "Functions are not valid as a React child … at td".
  - Cause: `F13V2EvidenceTable.jsx` about lines 472-484 renders `ms.tms?.at || ms.tms`. `journey.milestones.*` are **strings**, and `String.prototype.at` is a function, so `"2026-…".at` is truthy and a function is rendered.
  - Fix: one helper that reads the time of a milestone in either shape: `typeof v === 'string' ? v : v?.at ?? null`. Use it in all 5 cells and in any other place that reads `?.at` from `journey.milestones` (grep the card and the helpers too). Add a test with both shapes.
- **U1-R2 (low): the card writes hours with a dot** ("341.32h", "4.53h") while the list writes "19,5h". Use the same Vietnamese hour format as the list (`formatJourneyLegHours` or its equivalent) for TCT hours, limit and remaining.
- **U1-R3 (low): opening a card calls `/evidence/parcel` 3 times and `/evidence/catalog` 2 times.** Development StrictMode explains 2 calls. Make it one effect keyed on `ngay_do_kiem|ma_bg`, and read the catalog the page already has instead of fetching it again.

## 14. U1-FIX result (Antigravity, 2026-11-09) - U1-FIX completed

Fixed all three defects identified in Opus real render (§13) with zero backend changes:
1. **U1-R1 (Milestone display fix)**:
   - Added `getMilestoneAt(v)` in `f13EvidenceHelpers.js`:
     ```js
     export function getMilestoneAt(v) {
       if (typeof v === 'string') return v;
       return v?.at ?? null;
     }
     ```
   - Applied `getMilestoneAt` in all 5 milestone table cells in `F13V2EvidenceTable.jsx` (resolving `String.prototype.at` function collision).
   - Applied `getMilestoneAt` in `fiveMilestonesList` in `F13V2ParcelCard.jsx` and in milestone sorting in `sortEvidenceInPage`.
   - Added comprehensive unit test in `f13EvidenceHelpers.test.js` validating both string timestamps and `{ at, source }` object shapes.
2. **U1-R2 (Vietnamese hour formatting with comma)**:
   - Updated `F13V2ParcelCard.jsx` to format `tct.hours`, `tct.limit_hours`, and `tct.remaining_at_arrival_hours` via `formatJourneyLegHours` (producing e.g. "341,3h", "48,0h", "4,5h" instead of dot notation).
3. **U1-R3 (Single fetch per open & reuse page catalog)**:
   - Removed duplicate `/evidence/catalog` and `/layout` fetches inside `F13V2ParcelCard.jsx`, directly using `catalog` and `layout` props provided by the page.
   - Refactored `loadCardData` effect to be strictly keyed on `${ngay_do_kiem}|${ma_bg}`, executing once per modal open without triggering cascading refetches.

### Verification Evidence
- `npx.cmd oxlint -D no-undef <all changed files>`: 0 errors.
- `node --test frontend/src/features/f13v2/*.test.js`: 96/96 pass (0 fail).
- `node --test backend/src/routes/f13v2ParcelCard.test.js backend/src/routes/f13v2Evidence.test.js`: 24/24 pass (0 fail).
- `npm.cmd --prefix frontend run build`: Production bundle built in 1.81s (0 errors).


## 15. Opus real render of U1-FIX (2026-11-09) - one regression, U1-FIX2

- Working tree incident: at 14:22 the PO accidentally cancelled an Antigravity save. Three files went back to a mixed old state and the live page failed ("no export getMilestoneAt"). On the PO's word, Opus restored the three files from commit a22ff930 with `git checkout --`. No code was written.
- Passed:
  - U1-R1: the 5 milestone columns are filled in the list (e.g. CQ810379531VN: 2026-10-11 04:45:12 … 2026-10-20 16:59:14).
  - U1-R2: the card shows "341,3h" and "4,5h".
  - U1-R3: 2 calls of `/evidence/parcel` per open (development StrictMode), 0 catalog calls from the card.
  - No page error.
- **U1F-R1 (blocking, regression from U1-R3):** the card now reads `catalog`/`layout` only from props, and only `F13V2EvidencePage` passes them. So a Chuyên quản (cq, 537015, holds `f13.analysis.write`) who opens a card of its own unit from the Hành trình popup sees "Tài khoản chỉ có quyền xem (f13.analysis.view), không có quyền ghi phân tích", with no form. U1 showed the form there. Same for `F13V2WhyParcelModal` and `F13V2RuleProposalDetailPanel`.
  - Fix: give the card the write right on every caller. Either read it once from a shared source (the auth/access context, or one cached catalog hook used by all four callers), or pass `catalog`/`layout` from each caller's page. Do not call `/evidence/catalog` once per card open.
  - Also write the message in words without the capability code: "Tài khoản chỉ có quyền xem, không có quyền ghi phân tích".

## 16. U1-FIX2 result (Antigravity, 2026-11-09) - U1-FIX2 completed

### Implementation Details
1. **Shared Cached Access for All 4 Callers (`f13EvidenceHelpers.js`, `F13V2ParcelCard.jsx`)**:
   - Implemented in-memory memoized loaders `fetchEvidenceCatalogCached()` and `fetchLayoutCached()` in `f13EvidenceHelpers.js`.
   - `canWriteParcelAnalysis(card, catalog, layout)` evaluates against explicit props or falls back to `cachedCatalog` and `cachedLayout`.
   - `F13V2ParcelCard` initializes state synchronously from the cached store (`getCachedEvidenceAccess()`) or explicit props, making at most 1 network call per session without fetching `/evidence/catalog` on every card open.
   - When a Chuyên quản with `f13.analysis.write` opens a card from any of the four callers (`F13V2EvidencePage`, `F13V2JourneyParcelModal`, `F13V2WhyParcelModal`, `F13V2RuleProposalDetailPanel`), the write form is properly enabled for their unit.
2. **List Refresh After Save on All 4 Callers**:
   - `F13V2EvidencePage`: `onAnalysisSuccess` re-fetches summary and evidence list.
   - `F13V2JourneyParcelModal` & `F13V2JourneyPage`: `onAnalysisSuccess` triggers `reloadTick` in the popup and `refreshTick` in `F13V2JourneyPage` route table.
   - `F13V2WhyParcelModal` & `F13V2WhyPage`: `onAnalysisSuccess` triggers `reloadTick` in why parcel list and `fetchData()` in `F13V2WhyPage`.
   - `F13V2RuleProposalDetailPanel` & `F13V2RuleProposalPage`: `onAnalysisSuccess` triggers `detailRefreshTick` (re-fetching proposal detail samples) and `loadProposals()`.
3. **Read-Only Message Update**:
   - Changed message in `F13V2ParcelCard.jsx` to exact wording without capability code: `"Tài khoản chỉ có quyền xem, không có quyền ghi phân tích."`.

### Verification Evidence
- `npx.cmd oxlint -D no-undef <all changed files>`: 0 errors.
- `node --test frontend/src/features/f13v2/*.test.js`: 98/98 pass (0 fail).
- `node --test backend/src/routes/f13v2ParcelCard.test.js backend/src/routes/f13v2Evidence.test.js`: 24/24 pass (0 fail).
- `npm.cmd --prefix frontend run build`: Production bundle built in 1.98s (0 errors).


## 17. Opus real render of U1-FIX2 (2026-11-09) - READY FOR PO CHECK, one low residual

- Passed (same isolated render, leader and cq):
  - The Chuyên quản now gets the write form on a card of its own unit opened from the Hành trình popup (1 textarea; U1F-R1 fixed).
  - The leader sees "Tài khoản chỉ có quyền xem, không có quyền ghi phân tích." with no form.
  - The catalog is fetched once per page load, not once per card.
  - No page error.
  - Milestones, comma hours and popup count = Sản lượng still hold.
- **U1F2-R1 (low, before closing):** the access cache in `f13EvidenceHelpers.js` lives as long as the browser tab. `clearEvidenceAccessCache()` is never called, and logout is an in-app navigation (`AuthContext.logout` → `navigate('/login')`, no reload).
  - Effect: if user A signs out and user B signs in on the same tab, B's cards show A's write right and units.
  - The server still refuses a write outside B's unit (`EvidenceService._assertScope`), so this is a display defect, not a data one.
  - Fix: clear the cache on logout and on login (`AuthContext`), or key it by the session id.

## 18. PO decision C5 (2026-11-09): handover before arrival, shown in red

Finding (live database, read only, 2026-10-01..2026-11-08, parcels with both milestones):
- 6 317 of 134 481 parcels have `ms_gbt < ms_arrive`: the parcel was handed to the postman before the BCVH arrival scan. Their `leg_arrive_gbt_ms` is null, so the Đến–Giao cell shows "—".
- By BCVH:
  - A Lưới 535790: 1 548 / 3 942 (39,3 %), on average 48 min early;
  - Hương Thủy 536250: 4 225 / 18 698 (22,6 %), on average 349 min early;
  - 537015, 537220 and 533140: 1 % or less;
  - 535470: 0 %.
- Arrival source: F41 6 274, BF 43.
- Example: BCVH A Lưới, postman ĐINH THỊ LOAN (53A005), 08/11, all 7 parcels.

**C5:** these parcels are shown, not hidden and not set to 0.
- The Đến–Giao cell reads "Giao trước khi đến · sớm 19 phút" in red.
- The card shows the same warning on that leg.
- The Hành trình table shows how many parcels of each row, and of each BCVH, are in this case.
- No official figure, no median rule and no cause rule changes. The leg median keeps using only the parcels in the right order, and the screen says how many were left out.

### B2 backend (Sonnet)

All values are computed at read time from `ms_arrive` / `ms_gbt` of `f13_cause_parcel`. No rebuild, no new column.
- `journeyFactsOf`: add `gbt_before_arrive_ms` (positive ms when `ms_gbt < ms_arrive`, else null). It then appears in `/journey/parcels`, `/evidence/list` and `/evidence/parcel`.
- `/journey/routes`: per row and per BCVH group, add `gbt_before_arrive` (count of parcels in the case) and `arrive_gbt_counted` (count used for the Đến–Giao median).
- Add sort key `gbt_before_arrive` to `/evidence/list`.
- Tests: counts equal a direct SQL count on a seeded table; the examples above give the expected minutes; the existing medians are unchanged.

### U2 screen (Antigravity, after B2 is accepted)

- C5 display:
  - red cell in the list and on the card;
  - a red badge "n giao trước khi đến" next to the Đến BCVH → Giao bưu tá stage of each row and in the BCVH header;
  - tooltip: "Không tính vào thời gian chặng Đến–Giao (n bưu gửi)".
- Fix with it:
  - the Số giờ TCT column of the list mixes "4:28" and "19.15h". Use one format, the same as the card ("341,3h");
  - U1F2-R1: clear the access cache on logout and on login.

## 19. B2 backend result (2026-11-09): handover before arrival, read time only

Done, no rebuild, no new column, no change to a figure, median, cause rule or existing field.
- `journeyFactsOf` (JourneyPeriodService.js): new `gbt_before_arrive_ms` = `ms_arrive - ms_gbt` when `ms_gbt < ms_arrive`, else null. It reaches `/journey/parcels`, `/evidence/list` (`item.journey`), `/evidence/parcel` (`journey`) and the export through the one shared mapping.
- `/journey/routes`: each row has `gbt_before_arrive` (parcels with `ms_gbt < ms_arrive`) and `arrive_gbt_counted` (parcels with a non-null Đến–Giao leg, the ones the median uses). Per BCVH: new `meta.bcvh[] = { ma_bcvh, volume, gbt_before_arrive, arrive_gbt_counted }`.
- `/evidence/list`: sort key `gbt_before_arrive` (largest early first for `desc`; parcels in the right order last in both directions).
- Tests: `f13v2GbtBeforeArrive.test.js` (4: counts per row and per BCVH = direct SQL; medians = median of the in-order parcels; minutes 10/20/30/40 on journey, list and card; sort both directions). `f13v2ParcelCard` pick list now includes the new key.
- B3 copy, 2026-10-01..2026-10-31 (same from/to and month): A Lưới 535790 = 1 253 of 3 141 early (Đến–Giao counted 1 852); Hương Thủy 536250 = 3 482 of 18 277 (counted 11 375). Equal to a direct SQL count on the copy. Warm `getRoutes` for a month: ~3.1–3.3 s in process, same as the code before B2 (3.1 s); the first call after start was 12 s (cold file cache). The routes (538 rows) and meta are identical to the old service apart from the new fields.
- Note for U2: the live figures of §18 (1 548 and 4 225) cover a longer period than this copy; "counted" is not volume minus early, because parcels with no handover scan are also out of the median.
