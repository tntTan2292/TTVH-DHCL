# F12-MODULE-PLAN — Checkpoint 001

## Table of Contents

- [1. Ticket State](#1-ticket-state)
- [2. Product Owner Directions](#2-product-owner-directions)
- [3. Source File Inventory (read-only)](#3-source-file-inventory-read-only)
- [4. Audit A — Huế detail file](#4-audit-a--huế-detail-file)
- [5. Audit B — National (TCT) file](#5-audit-b--national-tct-file)
- [6. Reconciliation Detail ↔ National](#6-reconciliation-detail--national)
- [7. Baseline Figures (known answer for tests)](#7-baseline-figures-known-answer-for-tests)
- [8. Differences From F1.1](#8-differences-from-f11)
- [9. Proposed Data Contract](#9-proposed-data-contract)
- [10. Phase Plan (mirrors F1.1)](#10-phase-plan-mirrors-f11)
- [11. Report Blocks: Day, Week, Month, 12-Month Cumulative](#11-report-blocks-day-week-month-12-month-cumulative)
- [12. Risks](#12-risks)
- [13. Open Questions For The Product Owner](#13-open-questions-for-the-product-owner)

## 1. Ticket State

- Ticket: `F12-MODULE-PLAN` — F1.2 (Chất lượng thu gom bưu gửi liên tỉnh) source audit and overall plan.
- State: `AUDIT COMPLETE / ALL PO DECISIONS RECORDED (PD-F12-5..12)` — 2026-10-11. Implementation of Phases 0, 1, 2 and 4: `docs/10_TICKETS/F12-PHASE-0-4_MANIFEST.md`.
- Nature: planning and documentation only. No product code, schema, database, Import, portal call or file under `Data DKCL/` was touched. The two workbooks were copied to the session scratchpad and opened read-only; analysis scripts stayed in the scratchpad.
- Executor: Claude Code. As for F1.1 (DEC-021), the data contract (Section 9) should be challenged by a different model before Phase 1 is marked PASS.

## 2. Product Owner Directions

| ID | Direction (PO chat, 2026-10-11) |
| --- | --- |
| PD-F12-1 | Build F1.2 the way F1.1 was built (Import Huế + TCT, then Dashboard / BCVH Ranking screens). |
| PD-F12-2 | F1.2 has **only the accepting side** (Bưu cục chấp nhận). There is no delivery stage, so no delivering BCVH and no accepting × delivering pair table. |
| PD-F12-3 | Report views: **Ngày, Tuần, Tháng and Lũy kế 12** (12-month cumulative). |
| PD-F12-4 | Import reuses the F1.1 approach (shared Import pipeline, header-keyed reader, Huế detail lane + TCT national lane, later automatic download). |
| PD-F12-5 | (closes Q-F12-1) Portal definition: rate = Đạt / parcels with BĐ10 (1 620 / 1 758 = 92,15 %); the "chưa đủ thông tin" count is outside the denominator and shown beside the rate from the national row. |
| PD-F12-6 | (closes Q-F12-2) Business date = BĐ10 date, N-1 of the export; manual files renamed `F1.2-YYYY.MM.DD.xlsx`; automatic lane uses the request date. |
| PD-F12-7 | (closes Q-F12-3) National rank by accepting province over the 34 frozen codes; EMS, Hà Nội/HCM centres and Bình Dương ignored. |
| PD-F12-8 | (closes Q-F12-4) Huế ranking in two levels: 37 units (`Tên Huyện`) with drill-down to the 73 accepting offices; `531120 Khách hàng lớn` counted in the total, shown apart, not ranked (as F1.1 PD-11). |
| PD-F12-9 | (Q-F12-5, colour part) Light teal/cyan colour family. |
| PD-F12-12 | (closes Q-F12-5) **F1.2 target rate 95 %** (PO chat, 2026-10-11); PO authorized Phases 0, 1, 2 and 4 the same message. |
| PD-F12-10 | (closes Q-F12-6) Lũy kế 12 = rolling 12 months ending at the selected month. |
| PD-F12-11 | (closes Q-F12-7) Refresh window: last 3 days re-imported on each Auto Backfill, as F1.1. |

## 3. Source File Inventory (read-only)

| File (Downloads) | SHA-256 | Shape |
| --- | --- | --- |
| `11-10-2026_21-29-33_F1.2_CL_thu_gom_buu_giay_lien_tinh_chi_tiet(1).xlsx` (detail, Huế) | `26914e1f…ae28d3` | 1 sheet `Worksheet`, 1 header row + 1 758 rows × 35 columns, no merged cells, no total row |
| `11-10-2026_21-29-58_F1.2_CL_thu_gom_buu_giay_lien_tinh(1).xlsx` (national) | `d12a62e6…ad1ef7` | 1 sheet `Worksheet`, 2 merged header rows + 1 column-number row + 1 grand-total row + 53 unit rows × 20 columns |

The file names carry the **export time** (11/10/2026 21:29), not the data date. The data date is 10/10/2026 (Section 4.3) — the N-1 pattern of F1.3/F1.1.

## 4. Audit A — Huế detail file

### 4.1 Columns (35, header names in row 1)

`STT`, `Số hiệu bưu gửi`, `Số hiệu lô`, `Mã KHL`, `Tên KHL`, `Nhóm khách hàng`, `Mã tỉnh chấp nhận`, `Tên tỉnh chấp nhận`, `Mã BC nhận tin/chấp nhận`, `Tên BC nhận tin/chấp nhận`, `Loại BC (thu gom/chấp nhận)`, `Dịch vụ`, `Loại DV`, `Loại bg`, `Mã SPDV`, `Nhóm SPDV`, `Khối lượng thực tế`, `Khối lượng quy đổi`, `Mã BCKT`, `Tên BCKT`, `Loại BCKT`, `Mã tỉnh phát`, `Tên tỉnh phát`, `Thời gian nhận tin thu gom`, `Thời gian chấp nhận`, `Số hiệu BĐ8 đóng đi khỏi KT tỉnh chấp nhận`, `Thời gian BĐ8 đóng đi tại KT tỉnh (thu gom/chấp nhận)`, `Số hiệu BĐ10 quét lên xe tại KT tỉnh chấp nhận / XNĐ đối với tỉnh có HUB`, `Thời gian BĐ10 quét lên xe tại KT tỉnh chấp nhận TMS/ quét xuống đối với tỉnh có HUB`, `Thời gian BĐ10 đóng đi tại KT tỉnh chấp nhận (BCCP)/ XNĐ đối với tỉnh có HUB`, `Thời gian thực hiện thực tế (giờ)`, `Đánh giá (Đạt/Không đạt)`, `Mã Huyện`, `Tên Huyện`, `Nội dung lý do`.

### 4.2 Data quality

| # | Finding |
| --- | --- |
| A-1 | One row per `Số hiệu bưu gửi`: 1 758 rows, 1 758 distinct, 0 duplicates. All rows `Mã tỉnh chấp nhận = 53`. |
| A-2 | Always empty in this file: `Số hiệu lô`, `Nhóm khách hàng`, `Loại BC`, `Loại bg`, `Mã SPDV`, `Thời gian BĐ8 đóng đi`, `Nội dung lý do`. Optional in the reader; no violation-reason field (as F1.1). |
| A-3 | `Đánh giá` is never blank: 1 620 `Đạt`, 138 `Không đạt`. |
| A-4 | Elapsed time is text `H:M` (e.g. `1:11`, `30:49`), **can be negative** (`-3:-51`, both parts signed) — same trap as the F1.1 Huế reader fix of 2026-10-10. |
| A-5 | Rating rule reproduces 1 758 / 1 758: `Đạt ⇔ elapsed ≤ 10:00`. |
| A-6 | The elapsed figure is portal-computed: start = `Thời gian chấp nhận` (also when a `Thời gian nhận tin thu gom` exists), end = BĐ10 TMS scan (BCCP close when TMS is missing), with a night window of about 19:00–05:00 not counted. The window rule explains ~97 % of rows; multi-day rows do not follow a simple rule. **The system stores the portal figure and rating and never recomputes them** (same decision as F1.1). |
| A-7 | Times are text `dd/MM/yyyy HH:mm:ss`. `Số hiệu BĐ10` starts with a back-tick (`` `530100550910610101 ``) in 1 758 / 1 758 rows — strip it. |
| A-8 | `Mã tỉnh phát` mixes types: int (`71`, `11`…) and zero-padded text (`'01'` EMS, `'08'`). Normalise to text. |
| A-9 | 51 rows (`MC…` items) carry `KT1` in `Dịch vụ` and `Nhóm SPDV` — portal data as given, kept verbatim. |
| A-10 | 487 rows have no `Mã KHL` (`Tên KHL = Khong Xac Dinh`). |
| A-11 | `Mã BCKT`: KTC1 Huế 1 (1 593), VCKV Đà Nẵng LT (139), KT A Lưới (18), EMS HCM LT (6), EMS HN LT (2). 25 rows have no TMS time (all KTC1 Huế 1) and are still rated (21 Đạt / 4 Không đạt). |

### 4.3 Business date

- BĐ10 TMS scan date: 1 733 rows `10/10/2026`, 25 blank (their BCCP close is `10/10/2026`).
- Accept dates spread over 07/10 (1), 08/10 (17), 09/10 (1 303), 10/10 (437).
- So the portal's date filter is the **BĐ10 date** (end of the stage), and this file is the 10/10 day. The national file carries no date at all; it is the same export session (21:29).

### 4.4 Accepting-side units

- `Mã/Tên BC nhận tin/chấp nhận`: **73 accepting offices**.
- `Mã/Tên Huyện`: **37 units** (Bưu điện phường/xã + `BCVH Thuận Hóa`). Each office belongs to exactly one unit (73 office–unit pairs, no office in two units), so the file itself provides the office → unit hierarchy.
- `531120 Khách hàng lớn` → unit `5375 BCVH Thuận Hóa`: 550 parcels, 31 % of the day, 99,82 %. It strongly lifts the provincial rate (F1.1 PD-11 counted but hid 531110/531120 — see Q-F12-4).

## 5. Audit B — National (TCT) file

| # | Finding |
| --- | --- |
| B-1 | Two merged header rows (`Thời gian thực hiện` spans 6 bucket columns), then a column-number row (`1, 2, 3, 4, 5, None, None, 6 … 19`), then the grand-total row (`TT = 1`, no code), then 53 unit rows (corrected 2026-10-11: TT runs 1..54 and TT 1 is the total). The reader must key on the two header rows and skip the number row. |
| B-2 | Columns: `Mã/Tên tỉnh chấp nhận`, `Mã/Tên BC nhận tin/chấp nhận` (empty at this grouping), `Mã/Tên KHL` (empty), `SL bưu gửi có BĐ10 đóng đi tại khai thác tỉnh chấp nhận` (col 6), `SL … quét TMS lên …` (col 7), `SL đúng thời gian quy định <= 10 giờ` (col 8), `Tỷ lệ` (`9=8/6`, **text** `'92.16%'`), `SL quá quy định (> 10 giờ)`, `Sản lượng chưa đủ thông tin`, buckets `<=10 / <=12 / >12–24 / >24–36 / >36–48 / >48 giờ`, `SL Loại trừ`. |
| B-3 | Grand total = sum of the 53 rows on every numeric column (260 522; 264 219; 240 092; 24 127; 14 171; 675) — rows are additive, no double counting. |
| B-4 | Units are accepting provinces **plus** EMS (`'01'`, text), 8 Hà Nội centres (11, 12, 14, 15, 21, 34, 37, 49), 9 HCM centres (71–79) and Bình Dương (82). All 34 frozen ranked codes (`NATIONAL_RANKED_PROVINCE_CODES`) are present. |
| B-5 | Centres show rates above 100 % (Chợ Lớn 153,64 %, Long Biên 134,79 %) because the numerator follows col 7 (TMS) while the published rate divides by col 6. For all 34 ranked provinces col 6 = col 7, so their published rate is sound. |
| B-6 | `<=12 giờ` is cumulative (includes `<=10`); the other buckets are disjoint. |
| B-7 | Indicative rank by accepting province, 34 codes, rate desc then volume desc: **Huế 8th / 34 at 92,15 %** (1st HCM 99,59 %, Đà Nẵng 9th 91,57 %, Quảng Trị 12th 90,84 %). |

## 6. Reconciliation Detail ↔ National

The national Huế row (code 53) is reproduced from the detail file on every column except `chưa đủ thông tin`:

| Column | National row 53 | Recomputed from detail |
| --- | --- | --- |
| SL BĐ10 đóng đi / quét TMS | 1 758 / 1 758 | 1 758 rows |
| SL đúng ≤ 10 h | 1 620 | 1 620 `Đạt` |
| SL quá quy định | 138 | 138 `Không đạt` |
| Tỷ lệ | 92,15 % | 1 620 / 1 758 = 92,15 % |
| ≤ 12 h (cumulative) | 1 681 | 1 620 + 61 |
| > 12–24 / > 24–36 / > 36–48 / > 48 h | 63 / 13 / 0 / 1 | 63 / 13 / 0 / 1 |
| Sản lượng chưa đủ thông tin | 133 | not in the detail file |
| SL Loại trừ | 0 | — |

So the two files are the same day and the same definition (as Q-15 proved for F1.1). The 133 "chưa đủ thông tin" parcels are outside the denominator and absent from the detail export (Q-F12-1).

## 7. Baseline Figures (known answer for tests)

- Huế 10/10/2026: **1 758 parcels, 1 620 Đạt, 138 Không đạt, 92,15 %**.
- Top accepting units: BCVH Thuận Hóa 550 / 549 (99,82 %); BĐ phường Thuận Hóa 230 / 226 (98,26 %); BĐ xã Phú Vinh 201 / 195 (97,01 %); BĐ phường Phú Xuân 125 / 117 (93,60 %); BĐ phường Phong Quảng 61 / 56 (91,80 %); BĐ phường Phú Bài 47 / 40 (85,11 %).
- National 10/10: Huế 8 / 34.

## 8. Differences From F1.1

| Topic | F1.1 | F1.2 |
| --- | --- | --- |
| Units | Accepting office **and** delivering BCVH; 6-BCVH ranking; pair table | **Accepting side only**: office (73) and its unit `Tên Huyện` (37); no pair table, no delivering BCVH |
| Rating | `Đánh giá 2026`, ward target 12/15/24/27 h, blanks possible (PD-9) | One threshold, 10 h; no blanks in the sample |
| Clock | Nhận tin/Chấp nhận → PTC/Nộp tiền | Chấp nhận → BĐ10 TMS scan (BCCP close if missing), night window excluded |
| Business date | File name `F1.1-YYYY.MM.DD` (PD-10) | Export name has the export time only — date must come from the request (auto) or a renamed file (Q-F12-2) |
| National file | Accepting × delivering province, rank by delivering province (PD-17) | Accepting province only; rank by accepting province (Q-F12-3) |
| National columns | Counts | Rate is text `'92.16%'`; two-row merged header + number row |
| Target / colour | 95 %, green | Not yet set (Q-F12-5) |

What carries over unchanged: shared Import pipeline and registry, header-keyed reader pattern, additive daily rows with week/month = sum of days (PD-18), Thursday–Wednesday weeks, N-1 notice, national rank service shape (`F11NationalRankService`), indicator config (`indicatorConfig.js`) and the shared overview/weekly/monthly services, Report Block UI Standard.

## 9. Proposed Data Contract

| ID | Contract |
| --- | --- |
| DC-1 | Table `fact_f12`: one row per (`ngay_do_kiem`, `so_hieu_buu_gui`); all 35 source columns kept (snake_case), plus `import_log_id`. Re-import of a day replaces that day (as F1.1). |
| DC-2 | Required headers (reader fails clearly if missing): parcel id, accepting province/office codes and names, `Mã/Tên Huyện`, accept time, BĐ10 TMS/BCCP times, elapsed, rating. Others optional (schema drift seen in F1.1: 52 → 55). |
| DC-3 | `elapsed_minutes` parsed from `H:M` with signed parts; raw text kept. `bd10_so_hieu` back-tick stripped. `ma_tinh_phat` stored as text. |
| DC-4 | Metric: `tỷ lệ = Đạt / số dòng` of the day; week / month / 12-month = sum of daily numerators and denominators, never an average of rates. |
| DC-5 | `ngay_do_kiem` = request date (auto lane) or file-name date (manual lane, `F1.2-YYYY.MM.DD.xlsx`); the reader warns when BĐ10 dates in the file do not match (Q-F12-2). |
| DC-6 | Table `fact_f12_national`: one row per (`ngay_do_kiem`, `ma_tinh_chap_nhan`) incl. the non-ranked centres; grand-total row checked (= sum of rows) and not stored; rate stored numerically and also recomputed. |
| DC-7 | National rank: 34 frozen codes by accepting province, rate desc then volume desc, no shared ranks; centres/EMS/Bình Dương ignored (as Q-16) unless the PO decides otherwise. |
| DC-8 | Reconciliation on import of a day with both lanes: Huế detail rows / Đạt / Không đạt / buckets = national row 53, exact. |

## 10. Phase Plan (mirrors F1.1)

| Ticket | Content | Executor | Needs |
| --- | --- | --- | --- |
| `F12-PHASE-0` | Reference package `docs/07_REFERENCE/Domains/domain_quality_management/f1.2_…/` from `_template_indicator` | Claude Code | Q-F12-1..3 answers |
| `F12-PHASE-1` | `fact_f12`, header-keyed reader, tests on the real 10/10 file (Section 7 known answer) | Claude Code | — |
| `F12-PHASE-2` | Huế manual Import through the shared pipeline (registry `F1.2 / HUE`, upload option) | Claude Code | backend restart |
| `F12-PHASE-4` | TCT national lane: reader (merged header, number row, text %), `fact_f12_national`, `F12NationalRankService` | Claude Code | — |
| `F12-PHASE-3` | Portal discovery + automatic download (HUE detail, TCT summary), DRY supervised run, enablement, backfill | Claude Code | PO evidence pack (report URL, filter profile, export store names) as for F1.1 |
| `F12-DASHBOARD-RANKING-01` | `/api/f12` read APIs reusing the F4.1/F1.1 services through the indicator config; office and unit tables; national rank | Claude Code (+ Opus review) | Q-F12-4..6 |
| `F12-DASHBOARD-UI-01` | Screens per Report Block UI Standard | Antigravity (+ Opus review, PO UI check) | — |

Phases 1, 2 and 4 need no further PO input once Q-F12-1..3 are answered; they can run in sequence immediately.

## 11. Report Blocks: Day, Week, Month, 12-Month Cumulative

All four come from `fact_f12` daily rows (and `fact_f12_national` for the rank strip):

- **Ngày**: unit/office table for the chosen date + national rank of the day; 30-day trend.
- **Tuần**: Thursday–Wednesday weeks, any-two-weeks comparison, weekly combo chart (volume columns + rate line).
- **Tháng**: same-period / full previous month comparison, monthly chart.
- **Lũy kế 12**: rolling 12 months ending at the selected month, sums of days (DC-4), with the national rank per month.
- Every block follows `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md` (camera, click-to-order titles, target line, colour family, date filter, undefined-identifier check).
- Earlier months need the backfill (Phase 3); with the 10/10 file only, week/month/12-month show one day.

## 12. Risks

| ID | Risk | Mitigation |
| --- | --- | --- |
| R-1 | Export file name has no data date → a manual file imported on the wrong day. | DC-5 date check against BĐ10 dates; auto lane uses the request date. |
| R-2 | Portal revises a day after N-1 (seen in F1.1). | Same 3-day refresh window as F1.1 (`refreshWindowDays`), if the PO agrees. |
| R-3 | `Khách hàng lớn` (31 % of volume, ~100 %) masks office performance. | Q-F12-4. |
| R-4 | Negative / multi-day elapsed values look wrong to users. | Show the portal rating and figure as given; never recompute (A-6). |
| R-5 | Centres > 100 % in the national file. | Ranked set is the 34 provinces where col 6 = col 7 (B-5). |
| R-6 | Only one day of evidence. | Phase 1 test set should add a second and third day when available. |

## 13. Open Questions For The Product Owner

| ID | Question | Recommendation |
| --- | --- | --- |
| Q-F12-1 | The 133 "chưa đủ thông tin" parcels are not in the detail file and not in the national denominator. Keep the portal definition (1 620 / 1 758 = 92,15 %)? | Yes — follow the portal; show the 133 next to the rate from the national row. |
| Q-F12-2 | The data day is the BĐ10 date (10/10), N-1 of the export. For manual files, rename to `F1.2-YYYY.MM.DD.xlsx` as F1.1? | Yes; the automatic lane needs no renaming. |
| Q-F12-3 | National rank by accepting province over the 34 provinces, ignoring EMS, Hà Nội/HCM centres and Bình Dương (as F1.3/F4.1/F1.1)? | Yes (Huế 8 / 34 on 10/10). |
| Q-F12-4 | Ranking unit inside Huế: the 37 units (`Tên Huyện`, e.g. Bưu điện phường Thuận Hóa, BCVH Thuận Hóa) with drill-down to the 73 accepting offices? And `531120 Khách hàng lớn`: counted in the total but hidden from the ranking, as F1.1 PD-11? | Two levels (unit → office); count Khách hàng lớn, show it apart. |
| Q-F12-5 | Target line and colour family for F1.2 (F1.1 95 % green, F1.3/F4.1 90 % blue/orange). | PO to set the target; suggest a light **teal/cyan** family (distinct from the three, not purple/dark). |
| Q-F12-6 | "Lũy kế 12" = rolling 12 months ending at the selected month (as the existing 12-month view)? | Yes. |
| Q-F12-7 | Refresh window: re-import the last 3 days on each Auto Backfill as F1.1? | Yes, same as F1.1. |
