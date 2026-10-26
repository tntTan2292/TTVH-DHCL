# F42-MODULE-PLAN Checkpoint 001

Indicator: **F4.2 - Chất lượng phát giao bưu tá** (delivery quality by postman). Planning only; nothing implemented.
Evidence: two real DKCL exports of 2026-10-26 (data day 2026-10-10) and the DKCL summary screen the PO supplied. Audit scripts were read-only (scratchpad).

## 1. PO decisions (2026-10-26)

| Id | Decision |
| --- | --- |
| PD-F42-1 | Indicator name: `F4.2 - Chất lượng phát giao bưu tá`. |
| PD-F42-2 | Rate = column 18 of the DKCL screen = PTC đúng quy định (11,5 giờ) / GBT có thông tin phát. Numerator = rows rated `Đạt`; denominator = every GBT row of the day (also unrated rows: not yet delivered, returned). Day 10/10: 4 475 / 6 466 = 69,21 %. |
| PD-F42-3 | Ranking unit: the 6 BCVH, as the other F indicators. Plus a per-BCVH table down to each postman (those who delivered that day) with their rate. |
| PD-F42-4 | Only postmen are evaluated. Routes that are not postman delivery (`Tuyến phát lưu tại bưu cục` = office/counter delivery) are not a F4.2 topic; no special-route block is built. |
| PD-F42-5 | Target 90 %. |
| PD-F42-6 | National rank over the same 34 province/city codes as F1.3/F4.1; the other rows are dropped (light DB). |
| PD-F42-7 | Colour and screen design are delegated to Antigravity; the PO is not asked. |

## 2. Huế detail file (CSV, 32 columns)

- 6 466 data rows, province 53, 6 BCVH (Thuận Hóa 3 518, Hương Trà 907, Hương Thủy 820, Phú Lộc 594, Thuận An 425, A Lưới 202), 128 postmen. Every row has a GBT time on 2026-10-10: **the data day is the GBT date**; the file name only carries the export time.
- `Đánh giá`: Đạt 4 475, Không đạt 757, blank 1 234 (1 141 not delivered yet, 93 returned; blank never has a PTC time).
- Reconciliation with the DKCL screen: GBT 6 466 (col 14), phát thành công 5 232 = Đạt + Không đạt (col 15, 80,92 %), PTC đúng QĐ 4 475 (col 17), rate 69,21 % (col 18). Exact.
- Per BCVH (Đạt / rows): Thuận Hóa 2 367/3 518 = 67,28 %; Hương Trà 645/907 = 71,11 %; Hương Thủy 519/820 = 63,29 %; Phú Lộc 391/594 = 65,82 %; Thuận An 362/425 = 85,18 %; A Lưới 191/202 = 94,55 %.
- Parsing hazards: header names have leading spaces (` Mã tuyến phát`); unquoted commas in `Tên KHL` make 114 rows 33-34 fields wide, so the row must be re-joined by anchoring on the GBT timestamp column (index 26); columns Địa bàn, Mã HRM, Số hiệu lô are empty; 6 431 distinct parcel numbers in 6 466 rows (35 parcels delivered by two postmen), so the key is (parcel, postman, GBT time), never the parcel alone.
- `Thời gian thực hiện` (h:mm, portal-computed, 252 negative values) fits `Đạt ⇔ <= 11:30` on 5 227 of 5 232 rated rows; 5 rated rows (13:58-14:03) are Đạt, so the portal has an exception we do not know. The rating is stored as given and never recomputed.
- The file revises with time (the export of 26/10 already holds PTC up to 24/10): a later export of the same day turns blanks into Đạt/Không đạt, so a re-export must replace the day.

## 3. National file (XLSX, one row per postman)

- 13 665 postman rows + a grand-total row first (516 597 / 393 197 = 76,11 %); two-row merged header and a number row (columns 1-29); rates stored as text.
- Columns used: 2 Mã tỉnh, 3 Tên tỉnh, 7/8 BC, 9/10 postman, 14 GBT có thông tin phát (denominator, already after exclusions), 15 phát thành công, 17 PTC đúng QĐ (numerator), 19-22 overdue / PKTC / returned / waiting return, 24-26 excluded (VTN, forwarded, delivered back), 28 GBT before exclusion, 29 GBT without delivery info.
- 49 province groups (provinces, trung tâm, EMS head office, "Không xác định"); all 34 frozen codes are present, 13 573 rows. 34-province total 390 363 / 511 645 = 76,30 %.
- Huế (53), 131 postman rows = the detail file on GBT and PTC đúng QĐ for each of the 128 postmen with volume, 0 differences; the 3 extra rows have volume 0 (`53N003`, `53H022`, `53F069`). Postman rows per BCVH: Thuận Hóa 39, Hương Trà 28, Hương Thủy 25, Phú Lộc 18, A Lưới 13, Thuận An 8.
- National rank by province rate (sum of postman rows): Huế 26 / 34 at 69,21 %; first Cao Bằng 84,23 %, last Tuyên Quang 53,78 %.
- The file has no route type; anything per route comes from the detail file only.

## 4. Open points

- Q-F42-1: DKCL portal report identity (name, request, export) for F4.2 - needed only for the automatic download (Phase 3); manual import does not need it.
- Q-F42-2: the 5 Đạt rows above 11:30 (cosmetic; the rating is taken from the portal).
- Q-F42-3: whether the postman table lists postmen with volume 0 (recommended: no, "participated that day" per PD-F42-3).

## 5. Phase plan (F1.2 model)

1. F42-PHASE-0: reference package and data contract (docs only).
2. F42-PHASE-1/2/4: `fact_f42` (detail, key parcel + postman + GBT time) and `fact_f42_national` (34 province rows aggregated from postmen), additive migration, frozen header-keyed parsers (HUE CSV, TCT XLSX), registry F4.2 PLANNED / MANUAL_ONLY, folder `Data DKCL/F4.2`, manual Import, live load of 2026-10-10 reconciled to 4 475 / 6 466.
3. F42-PHASE-3: portal adapter, DRY probe supervised by the PO, then ACTIVE / AUTOMATED and backfill from 2026-01-01.
4. F42-DASHBOARD-RANKING-01: backend `/api/f42` (summary, trend, BCVH ranking, week/month comparison, national rank, postman table per BCVH), RBAC indicator scope, PERF-LOAD-01 switch for F4.2.
5. F42-DASHBOARD-UI-01 (Antigravity): `F42_INDICATOR`, menu, Dashboard, Ranking, postman table, report_block_ui_standard.md functions, target 90 %, own light colour family.
6. Opus independent review, PO UI check, governance closure.
