# F11-MODULE-PLAN — Checkpoint 001

## Table of Contents

- [1. Ticket State](#1-ticket-state)
- [2. Baseline And Workspace](#2-baseline-and-workspace)
- [3. Product Owner Directions](#3-product-owner-directions)
- [4. Scope Lock](#4-scope-lock)
- [5. Source File Inventory (read-only)](#5-source-file-inventory-read-only)
- [6. Audit A — Huế detail file `F1.1-2026.10.07.xlsx`](#6-audit-a--huế-detail-file-f11-20261007xlsx)
- [7. Audit B — Other detail exports (schema drift, partial exports)](#7-audit-b--other-detail-exports-schema-drift-partial-exports)
- [8. Audit C — Summary report (tổng hợp)](#8-audit-c--summary-report-tổng-hợp)
- [9. Audit D — The Product Owner's manual Excel process](#9-audit-d--the-product-owners-manual-excel-process)
- [10. Metric Hypotheses (evidence-backed, NOT yet rules)](#10-metric-hypotheses-evidence-backed-not-yet-rules)
- [11. Delta Survey — What F4.1 / F1.3 Already Give Us](#11-delta-survey--what-f41--f13-already-give-us)
- [12. Proposed Data Contract](#12-proposed-data-contract)
- [13. Phase Plan](#13-phase-plan)
- [14. Import Plan — Huế lane](#14-import-plan--huế-lane)
- [15. Import Plan — TCT lane](#15-import-plan--tct-lane)
- [16. Dashboard And BCVH Ranking Plan](#16-dashboard-and-bcvh-ranking-plan)
- [17. Evidence Plan And Training Protocol](#17-evidence-plan-and-training-protocol)
- [18. Reconciliation Plan](#18-reconciliation-plan)
- [19. Test Plan](#19-test-plan)
- [20. Risk Register](#20-risk-register)
- [21. PO Gates](#21-po-gates)
- [22. Open Questions For The Product Owner](#22-open-questions-for-the-product-owner)
- [23. What The Product Owner Needs To Provide](#23-what-the-product-owner-needs-to-provide)
- [24. Audit Round 2 — Toàn trình definition, `Đánh giá CLP F1.1.xlsx`, pair table](#24-audit-round-2--toàn-trình-definition-đánh-giá-clp-f11xlsx-pair-table)
- [25. Audit Round 4 — TCT national file and the consolidated plan table](#25-audit-round-4--tct-national-file-and-the-consolidated-plan-table)

## 1. Ticket State

- Ticket: `F11-MODULE-PLAN` — F1.1 (Chất lượng toàn trình bưu gửi nội tỉnh) discovery, source audit and overall plan.
- State: `PLAN COMPLETE / AWAITING PO DECISIONS (Gate 0)` — 2026-10-09.
- Nature: **planning and documentation only**. No product code, schema, database, watcher, portal sync, Import, or file under `Data DKCL/` / `Data QLML/` / `Downloads` was created, moved, renamed, or modified. All spreadsheets were opened read-only.
- Executor: Claude Code (Sonnet 5.5). Model discipline (DEC-021): the data contract (Section 12) and the dashboard ticket must be challenged/reviewed by a different model (Opus) before PASS, exactly as `F41-DASHBOARD-RANKING-01` T8.

## 2. Baseline And Workspace

- Branch `codex/da-impl-006`, `HEAD 7dc423e` at activation.
- Working tree already contained unrelated pre-existing changes (networkMap frontend files, `backend/test_dkclSessionPreflightService.js`, untracked scratch files). They are not touched by this ticket. Another AI session shares this worktree, so this ticket commits by explicit pathspec only.
- `Data DKCL/` is git-ignored (`.gitignore:2`); the two files the Product Owner placed at its root are therefore not versioned. Their SHA-256 are recorded in Section 5 so the audit stays reproducible.

## 3. Product Owner Directions

Given in chat on 2026-10-09 (verbatim intent, not extended):

| ID | Direction |
| --- | --- |
| PD-1 | F1.1 is a new indicator, as large as F1.3. Plan every step clearly and record it in the documents. |
| PD-2 | First, audit the detail source data of Huế that is to be imported. |
| PD-3 | Then plan the Import function for F1.1 for both sources, Huế and TCT. |
| PD-4 | Then plan the Dashboards and BCVH reports, like F1.3 (and F4.1). |
| PD-5 | Evidence for F1.1 is built in the same programme, because violations must be analysed. After Dashboard and BCVH are standing, the Product Owner will train Claude on the violations at the later stages. |

Round 2 (2026-10-09, later the same day), after the PO placed the two audited files under `Data DKCL\` and replied:

| ID | Direction |
| --- | --- |
| PD-6 | **`Đánh giá 2026` is the F1.1 metric** (confirms H-1; closes Q-1). |
| PD-7 | F1.1 is a **toàn trình nội tỉnh** indicator: elapsed time is measured from **Nhận tin/Thu gom, or Chấp nhận**, to **Phát thành công, or Nộp tiền** (for parcels that have a payment time). It therefore differs from F1.3 and F4.1, which measure only the delivery leg. |
| PD-8 | F1.1 reporting has **two views**: (1) an operation table by *delivery stage*, same layout as F1.3/F4.1, with the **6 BCVH** and the F1.1 rate = `Đánh giá 2026`; (2) a **pair table** "Chấp nhận tại Bưu cục nào → phát tại BCVH nào", as the PO runs today in sheet `Bảng-LK` of `Đánh giá CLP F1.1.xlsx`. |

Round 3 (2026-10-09, after the audit of Section 24) — PO answers:

| ID | Direction |
| --- | --- |
| PD-9 | **Blank `Đánh giá 2026` follows F4.1** (closes Q-2): such rows stay in the denominator and count as **0 Đạt**. They are also **flagged separately** so the PO can later analyse the detailed reason (derived flag, Section 12 DC-13). Rate = `COUNT(Đánh giá 2026 = 'Đạt') / COUNT(*)`. |
| PD-10 | **Business date rule = F1.3** (closes Q-3): `ngay_do_kiem` from the file name; the daily notice follows the N-1 rule. |
| PD-11 | **Ranking units** (closes Q-4a): the 6 canonical BCVH by delivery unit; 531110 and 531120 are counted in the module total and hidden from the ranking (as F4.1). |
| PD-12 | **Reconciliation source** (closes Q-13): `Đánh giá CLP F1.1.xlsx` is only the PO's working file built from the *summary* download. The system's source is the **detail** file (like `F1.1-2026.10.07.xlsx`); no summary pairing is required. |
| PD-13 | **Pair table scope** (answers Q-14): day, **week and month**; all accepting offices shown; the interface is delegated to Antigravity, who must make it smart/usable. |
| PD-15 | **No ranking by accepting office** (closes Q-4b); the PO supplied the TCT F1.1 file (`Downloads/09-10-2026_21-33-14_F1.1_..._noi_tinh(1).xlsx`, described by the PO as the TCT file for 07/10) and asked for its audit and the plan table; further business design will be given by the PO after the build. |
| PD-17 | **National rank is by delivering province (`Mã tỉnh phát`)**: a province that appears on several rows has its numerators and denominators added together before the rate is computed and ranked (corrects the earlier same-province-only reading). |
| PD-16 | **Show "Vị thứ toàn quốc x/34" as in F1.3** (closes Q-7); **tickets F11-PHASE-0 and F11-PHASE-1 authorized**; the download method for F1.1 files (Huế and TCT) is the same system and method as F1.3, with the PO guiding the correct filters as was done for F4.1; the PO states the TCT file is the single day 07/10 (see re-opened Q-15). |
| PD-14 | **Colour rules and weekday/week rule = F1.3** (closes Q-5b and Q-6): F1.3 colour bands (70/60/50) and chart target as F1.3; weeks Thursday–Wednesday with the ISO number of the Thursday. Note for the PO's awareness: at the current F1.1 level (≈ 72–95 % per BCVH) all six BCVH fall in the green band under the F1.3 bands; the config keeps the bands in one place so they can be tightened later without rework. |

Nothing else is treated as decided. Every other point is either derived from verified evidence (and labelled so) or listed as an open question in Section 22.

## 4. Scope Lock

In scope for this ticket: read-only survey of the source files and of the existing Import/F1.3/F4.1 architecture, this checkpoint, the manifest, governance sync.

Out of scope, explicitly: any product code, `backend/src/db/schema.sql`, the live database, the Import pipeline/watcher/portal layer, any F1.3/F4.1 behaviour, any file operation under `Data DKCL/`, any business rule not listed in Section 3.

## 5. Source File Inventory (read-only)

| # | File | Kind | Size / rows | Role in this audit |
| --- | --- | --- | --- | --- |
| S-1 | `Data DKCL/F1.1-2026.10.07.xlsx` (SHA-256 `11aa0168…573d8c`) | **Detail, Huế, all 8 delivery units, business date 07/10/2026**; named like the target `F1.1-YYYY.MM.DD.xlsx` | 580 876 B, 1 sheet, 2 621 data rows × 55 columns | **Primary audit subject** (Section 6) |
| S-2 | `Data DKCL/Đánh giá CLP F1.1.xlsx` (SHA-256 `fbbd016b…66fceb`) | PO manual Excel workbook (9 sheets) | 312 927 B | Section 9 |
| S-3 | `Downloads/28-09-2026_09-51-52_F1.1_..._noi_tinh_chi_tiet(1).xlsx` | Detail export, 52 columns, PTC date 27/09 only | 188 rows | Section 7 |
| S-4 | `Downloads/03-08-2026_10-07-22_F1.1_..._noi_tinh_chi_tiet(1).xlsx` | Detail export, 52 columns, BCVH Phú Lộc only, 27/07–02/08 | 878 rows | Section 7 |
| S-5 | `Downloads/09-09-2026_10-28-32_F1.1_..._noi_tinh(1).xlsx` | **Summary** export (BC chấp nhận × BC phát), Huế | 445 unit-pair rows + grand total | Section 8 |
| S-6 | `Downloads/2026-Kịch bản điều hành tại TTVH - KPI F1.1.xlsx` and `Bảo_F1.1 (23.09.2026).xlsx`, `Chi tiết BG nội tỉnh tồn tại các BCVH.xlsx` | PO manual workbooks / analyses | — | Section 9 |
| S-7 | `Data DKCL/F1.1/{Incoming,Processed,Error}/{HUE,TCT}` | Existing empty directory tree (`.gitkeep`); `Incoming/TCT/test.xlsx` is a 16-byte stray, not a workbook | — | Section 14 |

The real portal download names (S-3, S-4, S-5) are the only evidence of the DKCL report slug; they are used in Section 14.

## 6. Audit A — Huế detail file `F1.1-2026.10.07.xlsx`

### 6.1 Structure

| ID | Finding |
| --- | --- |
| A-1 | One sheet `Worksheet`, header on row 1, **no merged cells, no title rows, no total row** — one flat table. A header-name based parser is possible (unlike the summary report). `STT` runs 1..2 621. |
| A-2 | **Grain = one row per `Số hiệu bưu gửi`.** 2 621 rows, 2 621 distinct codes, 0 duplicates (also 0 duplicates in S-3 and S-4). |
| A-3 | **55 columns.** The first 52 equal the older exports (S-3/S-4); the last 3 are new: `Số BD10 Đóng đi tại KTTỉnh`, `Thời gian BD10 Đóng đi tại KTTỉnh`, `Thời gian BD10 Quét Lên TMS tại KTTỉnh` (27,1 % filled). **Portal schema drift is real** → the parser must key on header names, treat the 52 as required and the 3 as optional (Section 7, DC-4). |
| A-4 | Population: `Mã tỉnh chấp nhận = Mã tỉnh phát = 53` in every row (intra-province, Huế). Delivery unit (`Mã BC phát`): 533140 ×1 801, 535470 ×273, 536250 ×248, 537220 ×132, 535790 ×84, 537015 ×73, **531110 ×9, 531120 ×1** — i.e. the 6 canonical BCVH plus two non-canonical codes. `Loại BC phát`: PH1 1 801, PH2 810, GD3 10. |
| A-5 | 67 distinct accepting offices (`Mã BC chấp nhận`). **1 698 rows (64,8 %) are accepted at 531120 "Khách hàng lớn"**, 157 at 531950 "Huế Thành". F1.1 is a *cross-office* flow: accepting office ≠ delivering BCVH. |
| A-6 | Service mix: `Loại bưu gửi` 16 values (Thư 1 280, EMS 672, KT1 185, EMS hành chính công 147 …); `Nhóm SPDV`: Truyền thống 1 997, KT1 305, HCC 216, TMĐT 102, `Khong Xac Dinh` 1; `Loại DV`: KCOD 2 528 / COD 93. |
| A-7 | **Always-empty columns (2 621/2 621 null):** `Số hiệu lô`, `Địa bàn chấp nhận`, `Địa bàn phát`, `Nhóm khách hàng`, `Nội dung lý do`, `Thời gian BD10 XNĐ tại BCKT phát`. They must be stored (DC-3) but carry no information today. **`Nội dung lý do` is empty ⇒ the source gives no violation reason**; Evidence reasons must be derived (Section 17). |

### 6.2 Value types and formats

| ID | Finding |
| --- | --- |
| A-8 | Business timestamps are text `dd/MM/yyyy HH:mm:ss` (as in F1.3). The 2 new columns use a **different format**: ISO `yyyy-MM-dd HH:mm:ss.SSS` (e.g. `2026-10-03 06:50:50.513`). Both formats need explicit handling. |
| A-9 | `Thời gian thực tế` is text `H:MM` with an unbounded hour part (`110:24`, `1169:33`; 5 rows > 240 h). `Thời gian chỉ tiêu 2026` is a number of hours (12 / 15 / 24 / 27; 1 null). Code columns (`Mã tỉnh…`, `Mã BC…`, `Mã tuyến phát`, `Mã Phường Xã…`) arrive as numbers → store as TEXT, never as numbers. |
| A-10 | `Thời gian chỉ tiêu 2026` follows the **delivery ward** (`Mã Phường Xã Phát`) — the "KPI 2026 theo chỉ tiêu phường xã". By target: 12 h → 418 rows, 15 h → 10, 24 h → 2 065, 27 h → 127. |

### 6.3 Evaluation columns (the metric candidates)

| ID | Finding |
| --- | --- |
| A-11 | Two evaluation columns: `Đánh giá 2025` (Đạt 2 400 / Không đạt 171 / blank 50) and `Đánh giá 2026` (Đạt 2 348 / Không đạt 240 / blank 33). |
| A-12 | **Both are exactly reproducible from the elapsed time:** `Đánh giá 2025` = (`Thời gian thực tế` ≤ 24 h); `Đánh giá 2026` = (`Thời gian thực tế` ≤ `Thời gian chỉ tiêu 2026`). 0 mismatches over every row that has both an elapsed time and the evaluation (2 571 rows for 2025, 2 570 for 2026). The source columns can therefore be trusted as authoritative; recomputation is not needed for the KPI. |
| A-13 | `Thời gian thực tế` = end − start, where **end = `Thời gian PTC`, else `Thời gian nộp tiền COD`** and **start = `Thời gian nhận tin thu gom` if present, else `Thời gian chấp nhận`**, minus a deduction that is 0 h on 1 056 rows and 10 h on 1 488 rows; 27 rows (1,0 %) are not explained by either. **The deduction rule is not inferred** (Q-11, non-blocking: it matters only if Evidence ever recomputes durations). |

### 6.4 Rows without an evaluation (33)

| ID | Finding |
| --- | --- |
| A-14 | 33 rows have a blank `Đánh giá 2026`: **13 rows whose `Thời gian PTC` falls on 08/10/2026** (the day after the file's business date; 14 rows in total have PTC on 08/10, the 14th is already `Không đạt`), **1 row with PTC on 07/10 but no ward target** (`Thời gian chỉ tiêu 2026` null), and **19 rows with no PTC at all**. 13 + 1 + 19 = 33 — all "not yet evaluable" in the source's own terms. |
| A-15 | **4 rows have no PTC at all yet carry `Không đạt`** (overdue and still undelivered; the other 19 no-PTC rows are blank). They are inside the `Đánh giá 2026` denominator. The 28/09 export (S-3) shows the same behaviour (2 rows without PTC, all 188 rows evaluated). |
| A-16 | **The file's business date cannot come from cell content.** PTC dates inside the 07/10 file: 07/10 ×2 584, 08/10 ×14, empty ×23; accepted dates span 28/08–07/10 (14 distinct days). Same rule as F1.3/F4.1: `ngay_do_kiem` comes from the file name (DC-5). |
| A-17 | Failures are concentrated by acceptance day: of the 240 `Không đạt` rows, 194 were accepted on 05/10 (90) and 06/10 (104). |

### 6.5 Stage timestamps (basis for Evidence)

| Stage field | Filled | % |
| --- | --- | --- |
| `Thời gian nhận tin thu gom` | 2 101 | 80,2 |
| `Thời gian chấp nhận` | 2 621 | 100 |
| `Thời gian BD8 Đóng Đi tại BC Chấp nhận` | 2 580 | 98,4 |
| `Thời gian BD8 XNĐ tại BCKTT` | 761 | 29,0 |
| `Thời gian BD10 XNĐ tại BCKT phát` | **0** | **0** (column always empty) |
| `Thời gian phát đến BCP` | 2 412 | 92,0 |
| `Thời gian PTC` | 2 598 | 99,1 |
| `Thời gian BD10 Đóng đi tại KTTỉnh` / `Quét Lên TMS tại KTTỉnh` (new) | 711 | 27,1 |

Reading: the chain *nhận tin → chấp nhận → đóng chuyển (BD8) → [khai thác tỉnh] → đến BCP → PTC* exists in the data, but the middle hops are present for only 27–29 % of rows (items that never pass the provincial hub skip them). Evidence must treat a missing stage as "không qua khâu này", not as a defect.

### 6.6 Baseline numbers from S-1 (what the system must reproduce once imported)

Rate = `Đánh giá 2026 = 'Đạt'` / rows with a non-blank `Đánh giá 2026` (hypothesis H-1/H-2, Section 10). `Đánh giá 2025` shown for comparison.

| `Mã BC phát` | Unit | Rows | 2026: denominator | Đạt | Rate 2026 | 2025: denominator | Đạt | Rate 2025 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 533140 | BCVH Thuận Hóa | 1 801 | 1 786 | 1 713 | 95,91 % | 1 773 | 1 728 | 97,46 % |
| 535470 | BCVH Hương Trà | 273 | 258 | 205 | 79,46 % | 256 | 212 | 82,81 % |
| 536250 | BCVH Hương Thủy | 248 | 247 | 183 | 74,09 % | 247 | 202 | 81,78 % |
| 535790 | BCVH A Lưới | 84 | 84 | 74 | 88,10 % | 83 | 78 | 93,98 % |
| 537220 | BCVH Phú Lộc | 132 | 131 | 96 | 73,28 % | 130 | 103 | 79,23 % |
| 537015 | BCVH Thuận An | 73 | 72 | 67 | 93,06 % | 72 | 67 | 93,06 % |
| **6 canonical** | | **2 611** | **2 578** | **2 338** | **90,69 %** | 2 561 | 2 390 | 93,32 % |
| 531110 | TT Hành chính công | 9 | 9 | 9 | 100 % | 9 | 9 | 100 % |
| 531120 | Khách hàng lớn | 1 | 1 | 1 | 100 % | 1 | 1 | 100 % |
| **Module total** | | **2 621** | **2 588** | **2 348** | **90,73 %** | 2 571 | 2 400 | 93,35 % |

Two totals (module 90,73 % vs six-unit 90,69 %) differ for the same structural reason as F4.1's 60,98 % / 60,97 %: 531110/531120 are in the file but are not among the six ranked units. How to treat them is Q-4.

**Superseded by PD-9 (Round 3).** The table above is the "evaluated rows only" view the portal summary publishes. The adopted rule counts every row (blank = 0 Đạt) and gives:

| `Mã BC phát` | Unit | Rows | Đạt | Không đạt | Blank | Rate (PD-9) | Blank split: PTC next day / no ward target / no PTC |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 533140 | BCVH Thuận Hóa | 1 801 | 1 713 | 73 | 15 | **95,11 %** | 9 / 1 / 5 |
| 535470 | BCVH Hương Trà | 273 | 205 | 53 | 15 | **75,09 %** | 4 / 0 / 11 |
| 536250 | BCVH Hương Thủy | 248 | 183 | 64 | 1 | **73,79 %** | 0 / 0 / 1 |
| 535790 | BCVH A Lưới | 84 | 74 | 10 | 0 | **88,10 %** | — |
| 537220 | BCVH Phú Lộc | 132 | 96 | 35 | 1 | **72,73 %** | 0 / 0 / 1 |
| 537015 | BCVH Thuận An | 73 | 67 | 5 | 1 | **91,78 %** | 0 / 0 / 1 |
| **6 canonical (ranking)** | | **2 611** | **2 338** | 240 | 33 | **89,54 %** | 13 / 1 / 19 |
| 531110 | TT Hành chính công | 9 | 9 | 0 | 0 | 100 % | — |
| 531120 | Khách hàng lớn | 1 | 1 | 0 | 0 | 100 % | — |
| **Module total** | | **2 621** | **2 348** | 240 | 33 | **89,58 %** | 13 / 1 / 19 |

The system figure (89,58 %) therefore differs from the portal-style figure (90,73 %) by exactly the 33 blank rows; this is a defined, labelled difference, not an error (R-3).

## 7. Audit B — Other detail exports (schema drift, partial exports)

| ID | Finding |
| --- | --- |
| B-1 | S-3 (28/09) and S-4 (03/08) have **52 columns** — the first 52 of S-1's 55. A parser that hard-fails on a column-count mismatch would reject every historical export; one that requires only the 52 and tolerates the 3 extras accepts both. |
| B-2 | **The PO's downloads are ad-hoc filtered extracts**: S-3 holds only the PTC date 27/09 (188 rows — a Sunday, low volume); S-4 holds only BCVH Phú Lộc for 27/07–02/08 (878 rows, 767 of them "Thư"). Neither is a complete daily Huế file. Only S-1 is a complete day. |
| B-3 | Consequence: **no historical F1.1 detail exists for backfill yet.** Backfill needs the portal (Phase 3) or PO-supplied daily files. |
| B-4 | The portal's date filter is not "PTC date = D" exactly (A-16): the 07/10 file carries 14 rows with PTC 08/10 and 23 without PTC. The exact portal filter semantics must be **observed in Phase 3's read-only probe, not assumed**. |

## 8. Audit C — Summary report (tổng hợp)

S-5 (`..._noi_tinh(1).xlsx`) is a different report: **unit-pair aggregate**, not rows of parcels.

| ID | Finding |
| --- | --- |
| C-1 | 3 header rows (46 merged ranges), a column-number legend row (`14=13/11`, `19=18/17`, `21=20/17`), the **grand-total row first**, then 445 unit-pair rows (accepting office × delivery unit), 27 numeric columns. All rows have province 53 — it is the Huế view only. |
| C-2 | Grand-total row = sum of the unit-pair rows for every numeric column tested: 44 838 (có thông tin phát) / 43 140 (PTC/nộp tiền/chuyển hoàn) / 34 944 (≤ 24 h) / 30 018 (đúng chỉ tiêu) / 748 (loại trừ) … **The raw portal summary is internally consistent**, so (like F4.1's TCT file) the total row must be skipped on ingest or every figure doubles. |
| C-3 | It carries both measures: `≤ 24 h` (`Tỷ lệ … đúng QĐ` = col 13/11 = 34 944/43 140 = 81 %) and `KPI 2026 theo chỉ tiêu phường xã` (col 18/17 = 30 018/43 124 = 69,61 %), plus five elapsed-time bands (≤ 24 h, 24–36, 36–48, 48–60, > 60 h), `Sản lượng chưa đủ thông tin đo kiểm` and `Sản lượng loại trừ`. |
| C-4 | The summary has no date inside. Nothing in the repository shows which date or period S-5 covers; it cannot be paired with any detail file. |
| C-5 | Therefore **no verified (detail + raw summary) pair for one date exists yet.** The reconciliation baseline cannot be locked from the files supplied; Section 23 lists what is needed. |

## 9. Audit D — The Product Owner's manual Excel process

The PO currently builds F1.1 reporting by hand in a workbook (S-2 / S-6) from the *summary* export:

| Sheet | Grain | System equivalent |
| --- | --- | --- |
| `F1.1TH` | BCVH × (month / week / day) with `Sản lượng`, `Tỷ lệ`, `Tăng/Giảm`, `Nguyên nhân`, `Công tác điều hành` per day | Operation Dashboard BCVH table + weekly/monthly comparison (Section 16) |
| `F1.1 Ngay`, `F1.1 Thang`, `Bảng-LK` | pasted summary: accepting office × delivery BCVH, day and month | the accept × delivery matrix (Section 16, F11-X1) |
| `TH-Tuan`, `DashBoard-Điều hành`, `DashBoard-Data` | day-of-week × week, week average vs target | weekly trend / day chart |
| `TH-LK`, `TH-Day` | accepting office rows × BCVH columns, `SL đo kiểm` + `Tỷ lệ` | matrix |
| free-text columns | e.g. "86 BG chấp nhận tại Phong An chậm đóng chuyển 1 ngày", customer name + count, "đã chấn chỉnh … có chế tài" | **Evidence + "Nguyên nhân / Công tác điều hành" capture** (Section 17) |

Findings:

| ID | Finding |
| --- | --- |
| D-1 | The headline measure **changed**: the earlier "Kịch bản điều hành" workbook (Aug 2026, `F1.1LK`/`TH-LK`) divides `≤ 24 h` by the PTC/NT/CH volume (82,71 % total); the newer `Bảng-LK` in `Bảo_F1.1` and `Đánh giá CLP F1.1` totals `0,7898` / `0,8863`, which equal the **ward-target KPI** (26 622/33 708; 10 154/11 457). This supports H-1 but does not replace the PO's confirmation (Q-1). |
| D-2 | **`F1.1 Ngay` in `Bảo_F1.1 (23.09.2026).xlsx` is internally inconsistent**: its total row (188 / 96 / 94) equals the 28/09 detail export exactly, but its 170 body rows sum to 670 PTC/NT/CH and 82 of 127 (office × unit) cells differ from the detail. The sheet was evidently refreshed in part. **It is rejected as a reconciliation source.** Only raw portal exports are trusted. |
| D-3 | `Đánh giá CLP F1.1.xlsx` labels its history "Tháng 09.2025 / Tuần 40: 25.09–01.10" while holding 2026 daily summary sheets — a 2025-origin template. Its day/month sheets cannot be tied to 07/10 (day denominator 1 950 vs 2 588 evaluated in S-1). Treated as the PO's working file, not as evidence. |
| D-4 | The old-office → new-office mapping sheet `DB` (e.g. 533130 Huế Bắc → 533140; 535390 Bình Điền → 536250) shows historical files carry **retired office codes**; any history import needs this mapping (Q-9). |
| D-5 | The 6 BCVH columns of the PO's matrix (533140, 535470, 536250, 535790, 537220, 537015) are exactly the 6 codes frozen in `backend/src/config/canonicalBcvhUnits.js`. |

## 10. Metric Hypotheses (evidence-backed, NOT yet rules)

Per the project rule *do not infer business rules*, nothing below is adopted until the Product Owner confirms it (Section 22).

| ID | Hypothesis | Evidence | Needs |
| --- | --- | --- | --- |
| H-1 | **CONFIRMED by PD-6 (2026-10-09).** The F1.1 headline metric is `Đánh giá 2026` (KPI theo chỉ tiêu phường xã), not `Đánh giá 2025` (≤ 24 h). | Column named 2026; ward-target hours per row (A-10); newer PO workbooks total on the ward-target rate (D-1); summary report publishes it as a labelled block (C-3). | closed |
| H-2 | ~~Blank rows excluded from the denominator.~~ **REPLACED by PD-9 (2026-10-09):** rate = `COUNT(Đánh giá 2026 = 'Đạt') / COUNT(*)`; blank rows count as 0 Đạt and are flagged separately. (The excluded-denominator view is what the portal summary publishes; kept in Section 6.6 for comparison only.) | PO decision, same as F4.1. | closed |
| H-3 | **CONFIRMED by PD-10.** `ngay_do_kiem` = date in the file name `F1.1-YYYY.MM.DD.xlsx`; daily notice N-1 as F1.3. | A-16. | closed |
| H-4 | **CONFIRMED by PD-11.** Ranking unit = delivery unit (`Mã BC phát`), the 6 canonical BCVH; 531110/531120 counted in the module total but hidden from ranking. | A-4, D-5; F4.1 PO-6 precedent. | closed (Q-4b, accept-side ranking, still open) |
| H-5 | Weeks run Thursday–Wednesday, ISO 8601 number of the week's Thursday, as F1.3/F4.1. | F13-BCVH-WEEKLY-COMPARISON-01 convention; PO's sheets use "Tuần 38/39/40" with dated columns. | Q-6 |

## 11. Delta Survey — What F4.1 / F1.3 Already Give Us

F4.1 proved the multi-indicator pattern; F1.1 is the third instance, so most layers are *configuration + a new twin*, not new architecture.

| Layer | Existing mechanism (file) | F1.1 needs |
| --- | --- | --- |
| Report identity | `dkclImportOperationsContract.js` already reserves `DKCL_REPORT_EXTENSIONS.F11 = 'F1.1'`; AUTO-IMPORT-007 reserved the identifier | nothing new |
| Folder tree | `Data DKCL/F1.1/{Incoming,Processed,Error}/{HUE,TCT}` exists | `Processing`, `Quarantine` created by the pipeline as for F1.3 |
| Indicator registry | `importIndicatorRegistry.js`: `INDICATORS['F1.3'|'F4.1']`, lane config, `validateIndicatorRegistration`, **`assertUniqueTargetTables`** (each lane owns a dedicated table), per-indicator test sandbox (`QIS_TEST_DATA_ROOT_F41` style) | `INDICATORS['F1.1']` with `fact_f11` / `fact_f11_national`, filename rule `F1.1-YYYY.MM.DD.xlsx`, `testDataRoot` env, parser per lane. A lane without a verified portal adapter must be `MANUAL_ONLY` with `manualOnlyReason` (enforced by the validator) |
| Parser | `f41HueExcelParser.js` (144 lines, header-keyed), `f41TctExcelParser.js` (283 lines, positional + total-row skip) | `f11HueExcelParser.js` (52 required + 3 optional headers, drift tolerant), `f11TctExcelParser.js` (after sample) |
| Schema | `fact_f41` (`UNIQUE(ngay_do_kiem, ma_bg)`), `fact_f41_national`, migrations `migrate_f41_phase1/2_schema.js`, startup registration in `server.js` | `fact_f11`, `fact_f11_national`, additive idempotent migrations + indices matching Section 12 |
| Repository / services | `FactF41Repository.js` (542 lines) mirroring `FactBuuGuiRepository` row shapes; `F41NationalRankService`; `BcvhOverviewService` / `BcvhWeeklyComparisonService` **take the repository by constructor injection** (F41-DASHBOARD-RANKING-01 Principle 2) | `FactF11Repository.js` with the same nine method signatures; no F1.3/F4.1 file edited |
| API | `/api/f41/*` nine read-only endpoints, `requireAuth` + `requireRole(['admin','viewer'])` | `/api/f11/*` twins |
| Frontend | `features/indicator/indicatorConfig.js` (`F13_INDICATOR`, `F41_INDICATOR`: apiBase, labels, bands, feature flags), `IndicatorContext`, `useIndicatorApi`; pages `features/f41/*` | `F11_INDICATOR` + `features/f11/*` pages; `pages/F11Quality.jsx` "Coming Soon" replaced by a redirect; `/f11` currently admin-only (`App.jsx`:101, `appNavigation.jsx`:30) and hidden from viewers by QIS-LAN-DEPLOY-001 |
| Portal / backfill | `dkclHueF13PortalClient.js`, `f41HueAdapter.js`, `f41HueSingleDateService.js`, `autoBackfillF41Contract.js` (report identity, stored-procedure identity, export action, **generated-file slug**), executors, completion policy | `autoBackfillF11Contract.js` + executors + single-date service; identities **discovered, not guessed** (AB-AUTH-17 lesson) |
| Import UI | Data Import Center indicator selector | add F1.1 entry |
| Docs | `_template_indicator`, `docs/07_REFERENCE/Domains/domain_quality_management/f4.1_.../` (8 files) | `…/f1.1_chat_luong_toan_trinh_noi_tinh/` (Phase 0) |

Two things F4.1 did **not** have and F1.1 does: (1) a **route dimension** in the detail (`Mã/Tên/Loại tuyến phát`) and a delivery-ward dimension — so a Tuyến view is technically possible (Q-5); (2) a **two-sided unit model** (accepting office *and* delivering BCVH) — the PO's whole matrix is built on it.

## 12. Proposed Data Contract

Requires PO approval before any implementation. Items marked ▲ depend on a PO answer.

| ID | Contract item |
| --- | --- |
| DC-1 | New additive tables `fact_f11` (Huế row level) and `fact_f11_national` (TCT aggregate, Phase 4). `fact_f13`, `fact_f41` and their indices are not modified. |
| DC-2 | System fields as in `fact_f41`: `id`, `ngay_do_kiem` (TEXT/DATE NOT NULL), `import_log_id`, `created_at`; `UNIQUE(ngay_do_kiem, ma_bg)`. Validated by A-2 (0 duplicates). A parcel may legitimately re-appear on a later business date (e.g. the 23 no-PTC rows of the 07/10 file), which the key allows. |
| DC-3 | All 55 source columns are persisted (the 6 always-empty ones included) in snake_case, codes as TEXT, so no later indicator decision needs a re-import. |
| DC-4 | Parser keys on **header names**: the 52 baseline headers are required (hard error if any is missing); the 3 newer headers are optional and stored `NULL` when absent. Row identity column `Số hiệu bưu gửi` is the required-column guard. |
| DC-5 | `ngay_do_kiem` comes **only** from the file name `F1.1-YYYY.MM.DD.xlsx`, never from cell content (A-16). |
| DC-6 | Timestamps stay TEXT as received (`dd/MM/yyyy HH:mm:ss`); the two new KTTỉnh columns stay TEXT in their ISO form; a shared reader normalises both when a query needs to compare. `Thời gian thực tế` stays raw TEXT `H:MM`; `Thời gian chỉ tiêu 2026` is stored as INTEGER hours. |
| DC-7 | Metric (PD-6, PD-9): `danh_gia_2026` is the headline; **rate = `COUNT(= 'Đạt') / COUNT(*)` over all stored rows**, blank = 0 Đạt (as F4.1 DC-6). `danh_gia_2025` is stored and available as a secondary series. Volume everywhere = `COUNT(*)`, passed = `= 'Đạt'`. |
| DC-8 | Module total counts every stored row; the Ranking lists only the 6 canonical units (PD-11; reuse `canonicalBcvhUnits.js`, no code literal), with the two totals (89,58 % / 89,54 % on the baseline) **labelled distinctly** on any screen where both can appear (lesson R-3 of F4.1). |
| DC-13 | **Blank-evaluation flag (PD-9).** A blank `danh_gia_2026` is shown as "Chưa có đánh giá" and split by a *derived* reason, computed at read time from stored columns, never written back: `PTC sau ngày đo kiểm` (PTC date later than `ngay_do_kiem`), `Thiếu chỉ tiêu phường` (`thoi_gian_chi_tieu_2026` null), `Chưa PTC` (no PTC time). Baseline: 13 / 1 / 19. The split is an Evidence facet, so the PO can analyse the detailed reason later; the rate itself never depends on it. |
| DC-9 | Indices designed from the access paths (not copied): `(ngay_do_kiem)`, `(ngay_do_kiem, ma_bc_phat, danh_gia_2026)`, `(ma_bc_phat, ngay_do_kiem)`, plus `(ngay_do_kiem, ma_bc_chap_nhan, ma_bc_phat)` if the matrix block is approved. EXPLAIN QUERY PLAN is recorded in Phase 1 against the live table size; no index is added without measurement. |
| DC-10 | Violation `lý do`/stage classification is **not part of the data contract**: the source has no reason field (A-7). It lives in a derived, versioned classification service defined in the Evidence phase after PO training (Section 17). |
| DC-11 | National lane `fact_f11_national`: **designed in Section 25** from the real TCT file (grain tỉnh chấp nhận × tỉnh phát, total row skipped, required-set completeness rule over the 34 frozen province codes). |
| DC-12 | Retired office codes (D-4): a mapping table (old → new) is applied at read time, never by rewriting stored source values. ▲ Q-9. |

## 13. Phase Plan

Each phase is its own ticket needing explicit PO authorization; none is self-activating. Owners follow DEC-020/021. "Size": S/M/L relative to F4.1's equivalent.

| Phase / ticket | Content | Owner | Size | Gate |
| --- | --- | --- | --- | --- |
| **F11-PHASE-0** SSOT package (docs) | `docs/07_REFERENCE/Domains/domain_quality_management/f1.1_chat_luong_toan_trinh_noi_tinh/` from `_template_indicator`: `metadata.yml`, `data_blueprint.md` (55-column map, Section 6), `measurement.md` (PD-6/PD-9 formula, baseline), `business_rules.md`, `testing_scenarios.md`, `changelog.md`. Zero code. Q-1..Q-4a are **answered** (PD-6, PD-9..PD-11), so it can open on PO authorization; no unconfirmed rule becomes SSOT. | Claude Code (Sonnet) | S | G0 (this plan approved) |
| **F11-PHASE-1** Data foundation | Migration `fact_f11` (+indices measured), `f11HueExcelParser.js`, filename extractor, real-file test on S-1 asserting 2 621 rows / 2 348 Đạt / 240 Không đạt / 33 blank (13+1+19) / 89,58 % and the PD-9 table of Section 6.6, plus the pair grid (accepting office × delivering BCVH) summing to the module totals, `fact_f13`/`fact_f41` counts unchanged. No watcher/UI. | Claude Code (Sonnet) + Opus review of DC-1..DC-9 | M | G1 |
| **F11-PHASE-2** Import Huế (manual lane) | Register `INDICATORS['F1.1']` (HUE lane `MANUAL_ONLY` with reason until Phase 3), pipeline/watcher over the registry, Data Import Center selector, per-indicator test sandbox, first **deliberate observed** import of S-1 from `Incoming/HUE`, row counts against Section 6.6. F1.3/F4.1 byte-identical (their suites unchanged). | Claude Code (Sonnet); Antigravity for the selector UI | M | G2 |
| **F11-PHASE-3** Portal discovery + HUE auto-backfill | Read-only probe in the AB-AUTH-17 style (needs the PO's logged-in HUE session, profile free): observe stored-procedure identity, detail endpoint, export action, **real generated-file slug** (candidates from the real downloads: `F1.1_bao_cao_chat_luong_toan_trinh_buu_giay_noi_tinh_chi_tiet` detail, `…_noi_tinh` summary), the date-filter semantics (B-4), header drift. Then `autoBackfillF11Contract.js`, single-date service, executors, completion policy, flip lane to `AUTOMATED` only when verified. Windows runtime evidence by Antigravity. | Claude Code + Antigravity (runtime) | L | G3 |
| **F11-PHASE-4** Import TCT | Designed in Section 25 (sample audited). Only open item: the date window of the TCT download (Q-15). | Claude Code | M | G4 |
| **F11-DASHBOARD-RANKING-01** Dashboard + BCVH Ranking | Section 16. Backend `/api/f11` twins (constructor-injected services), `F11_INDICATOR` config, pages, sidebar group, `/f11` redirect, role widening. Independent Opus review (the F4.1 T8 pattern) before UI check. | Claude Code (backend/config), Antigravity (pages/visual), Opus (review), PO (UI check) | L | G5 (Dashboard), G6 (Ranking) |
| **F11-EVIDENCE-01** Evidence | Section 17. Starts only after G6 and the PO training session(s). | Claude Code + Antigravity + PO training | L | G7 |
| **F11-ACCEPTANCE** | Full reconciliation, regression sweep (F1.3, F4.1, Network Management), PO acceptance, daily-notice template (like `TIN_MAU_F13_HANG_NGAY.md`) if requested. | Claude Code | S | G8 |

Parallelism: Phase 1 needs only the Q-1/Q-2/Q-3 answers; Phase 3 (portal discovery) can run in parallel with Phase 1–2 because it only reads from the portal; Dashboard design can start after Phase 1 on the manually imported S-1, which is what allows the PO to "see" F1.1 early.

## 14. Import Plan — Huế lane

1. **Drop zone and name.** `Data DKCL/F1.1/Incoming/HUE/F1.1-YYYY.MM.DD.xlsx` (S-1 already follows this name; today it sits in the `Data DKCL` root, outside any watched path, so it is inert). It is moved into `Incoming/HUE` only by a deliberate, announced run (lesson R-1 of F4.1: `importWatcher` uses `ignoreInitial:false`, so anything dropped into a registered Incoming folder is imported at once).
2. **Register after the foundation exists.** The F1.1 root is registered in the registry only after Phase 1's table and parser exist; otherwise the watcher would hit a missing table.
3. **Validate** (existing pipeline order): file name → format → required headers (52) → duplicates inside the file → row-level checks (non-empty `Số hiệu bưu gửi`, province 53) → import into `fact_f11` inside one transaction; completion policy `FACT_F11_IMPORT_ARTIFACT_V1`-style (distinct `ma_bg`, no expected row count for HUE).
4. **Idempotence.** Re-importing the same date replaces that date only (the forced-reimport rule of IMPORT-BULK-REIMPORT-ALL-01; `assertUniqueTargetTables` guarantees lane isolation). Re-import of S-1 must change nothing.
5. **Failure paths.** Missing required header → `Error/HUE` with the exact missing header list; unknown extra header → accepted and logged (drift visibility), never silently dropped.
6. **History.** No historical complete daily files exist (B-2/B-3). Backfill from `TRACKING_START_DATE` (2026-01-01) is a Phase 3 deliverable via the portal, or the PO supplies daily files (Q-10).
7. **Operator view.** The Import Center shows F1.1/HUE counts, last date, coverage and the auto-backfill queue exactly as it does for F4.1.

## 15. Import Plan — TCT lane

**Update (Round 4): a real TCT F1.1 file now exists and has been audited — see Section 25, which supersedes the analogy below.** The text of this section is kept as the original plan; the concrete TCT design is Section 25.4.

Facts at the time of writing: no F1.1 TCT sample existed in the repository (`Incoming/TCT/test.xlsx` is 16 bytes of text). The F1.1 summary report we had (S-5) is a Huế view (province 53 only, C-1). By analogy to F4.1, a TCT report would be an **aggregate by reporting unit (province)** — which Section 25 confirms.

Plan, gated on the PO supplying one real TCT F1.1 file (and its official DKCL report name):
1. **Read-only audit** of the TCT file in the same format as Section 6/8 (sheets, merged headers, grain, total row, dates, integrity, cross-lane reconciliation against the Huế row).
2. Design `fact_f11_national` + `f11TctExcelParser.js` from that audit (positional parser, grand-total row skipped, date from file name only).
3. Register the TCT lane (`MANUAL_ONLY` until a verified portal adapter), expected row count only if the audit proves a fixed 34.
4. **National rank** ("Vị thứ toàn quốc x/34") on F1.1 views — same mechanism as `F41NationalRankService`, using the *published* national rate; the national figure and the BCVH-table figure may legitimately differ (F4.1 R-8) and must be labelled, never substituted.
5. Until the TCT lane exists, every F1.1 screen shows the national rank as unavailable ("—"), not an error.

## 16. Dashboard And BCVH Ranking Plan

Principles inherited from `F41-DASHBOARD-RANKING-01`: additive only; no F1.3/F4.1 file edited; contract parity with the `/api/f13` twins; frontend by configuration with F1.3 default unchanged; read-only SQL, parameter-bound; weeks Thursday–Wednesday through the shared week service; TỔNG CỘNG = summed volume then rate.

### 16.1 Block map (F1.3 → F1.1)

| Block | F1.1 | Note |
| --- | --- | --- |
| Operation Dashboard `/f11/dashboard`: KPI cards, national rank, comparisons | Reuse | rank "—" until TCT lane; two labelled totals (DC-8) |
| BCVH operation table (ĐIỀU HÀNH NGÀY + LŨY KẾ THÁNG, rank, cùng kỳ tuần trước, cùng kỳ/cả tháng trước) | Reuse | volume = rows with non-blank `Đánh giá 2026`; passed = `Đạt` |
| Daily trendline 7/30 days, zoom | Reuse | target line value → Q-5b |
| BCVH Ranking `/f11/ranking/bcvh`: weekly comparison, monthly comparison, weekly combo chart, monthly combo chart, collapsed heatmap, single-day ranking table | Reuse | Thursday–Wednesday weeks |
| Colour bands | `F11_INDICATOR.heatmapFloors` | value → Q-5b (F1.3 = 70/60/50, F4.1 = 80/70/60) |
| Route capacity / Tuyến Ranking | **Decision** | the detail has `Mã/Tên/Loại tuyến phát` (unlike F4.1) → Q-5a |
| Operating pattern, Action Center, Rule Recommendation, Message | Out of scope for the first ticket | as F4.1 |
| **F11-X1 Accept × Delivery matrix** (PO's `TH-LK`/`TH-Day`: rows = accepting office, columns = 6 BCVH, cells = `SL đo kiểm` + `Tỷ lệ`, day and month) | **New, F1.1-only — PO-requested (PD-8)** | the PO's `Bảng-LK`; computed from `fact_f11` detail rows (Section 24, E-8) for **day, week and month** (PD-13), all accepting offices derived from data; needs the pair index of DC-9; interface by Antigravity, who must make it smart and usable |
| **F11-X2 Accept-side view** (which accepting office/BCVH pulls quality down) | **New, proposal** | requires the office → managing-BCVH mapping (Q-4b) |
| **F11-X3 Elapsed-time bands** (≤ 24, 24–36, 36–48, 48–60, > 60 h) | **New, proposal** | derivable from `Thời gian thực tế`; exists in the summary report |
| **F11-X4 Nhóm SPDV split** (Truyền thống / TMĐT / HCC / KT1) | **New, proposal** | optional |

X1 is recommended in the first ticket; X2–X4 only if the PO selects them (scope-creep guard).

### 16.2 Backend

`FactF11Repository` implements the same nine methods as `FactF41Repository` (§4.2 of the F4.1 Design of Record) plus the matrix query; `F11RankingFacade` builds the two reused services by injection; `F11RankingController` + `f11Routes.js` under `/api/f11` with `requireRole(['admin','viewer'])` (Q-8); error contract identical (`MISSING_PARAM`, `INVALID_DATE`, `INVALID_RANGE`, …), `no-store` on every response.

### 16.3 Frontend

`F11_INDICATOR` in `indicatorConfig.js` (apiBase `/f11`, labels, `targetRate`, bands, feature flags). Pages `features/f11/F11DashboardPage.jsx`, `F11BcvhRankingPage.jsx`. Sidebar: the flat `F1.1 Quality Management` item becomes a group (Operation Dashboard, BCVH Ranking; Evidence added by F11-EVIDENCE-01). `/f11` → redirect to `/f11/dashboard`; `pages/F11Quality.jsx` retired. Rule: behaviour of F1.3 and F4.1 with their configs must be identical — the existing frontend/back-end suites are the proof, and the `f41ContractParity.test.js` pattern is repeated for F1.1.

## 17. Evidence Plan And Training Protocol

PD-5: Evidence is built, and the PO will train Claude on violations at the later stages after Dashboard/BCVH are standing.

### 17.1 What Evidence is for F1.1

A violation = a row with `Đánh giá 2026 = 'Không đạt'` (240 in S-1). F1.3's Evidence (`/f13/evidence`, amended spec) offers: context filter bar, violation group tabs, a paginated violation table, and a per-parcel detail panel with timeline. F1.1 reuses that shape but is **multi-stage**: the PO's manual notes show the questions that matter — "chậm thu gom", "chậm chấp nhận", "chậm đóng chuyển", "chậm tại khai thác", "chậm phát", and *which customer / which accepting office* caused the volume ("86 BG chấp nhận tại Phong An chậm đóng chuyển 1 ngày"; customer + count).

### 17.2 Build order (so that training has something to train on)

1. **Evidence v0 (no classification)** — violation list per date/BCVH/accepting office, parcel detail with the stage timeline built from Section 6.5 (nhận tin → chấp nhận → đóng chuyển → đến BCP → PTC), elapsed time vs ward target, hop durations. Pure facts from `fact_f11`; no judgement.
2. **PO training session(s)** — the PO states, per stage, what makes a delay a violation attributable to that stage and who owns it. Claude records each statement as a *candidate rule* (rule id, stage, field pair, threshold, owner unit, example `ma_bg`, PO wording) in a versioned rules document under the F1.1 reference package, **never directly in code**.
3. **Classification service** — implements only PO-confirmed rules, versioned (the F1.3 3-way `violation_reason` pattern is the precedent), each classification carrying `rule_id` + evidence fields so any figure is auditable. Unclassified parcels stay "Chưa phân loại" — never forced into a bucket.
4. **Validation loop** — the PO samples classified parcels; mismatches become rule corrections, tracked in the rules document changelog until the PO accepts.
5. **Capture of operational notes** — the PO's free-text "Nguyên nhân" and "Công tác điều hành" columns per BCVH/day are a real workflow. A small, optional note field on the Dashboard/Evidence (stored, attributed, dated) is proposed to replace the Excel columns; **it is a product decision, Q-12**.

### 17.3 Training data we already have (candidates, not rules)

The PO's analysis workbook `Chi tiết BG nội tỉnh tồn tại các BCVH.xlsx`, the "Nguyên nhân" texts in `TH-Tuan`, and the exports under `exports/` for F1.3 weeks 38–40 are sources of worked examples for the training sessions.

## 18. Reconciliation Plan

1. **After Phase 1**: reproduce S-1's Section 6.6 table (every row, both totals, the 33 = 13 + 1 + 19 blank split and the 4 no-PTC `Không đạt` rows) from `fact_f11`, with `fact_f13`/`fact_f41` counts unchanged.
2. **Baseline gate (PD-12, replaces the former "pair gate")**: the system's source is the detail file, and no same-date summary will be supplied. The baseline is locked by **independent recomputation from the detail file** (a separate read-only script over the workbook, not the system's own code): Section 6.6 PD-9 table, the 13 / 1 / 19 blank split, and the accepting-office × delivering-BCVH grid of the file whose rows and columns must sum to the module figures. The PO's pasted summary sheets are not used (they differ in denominator by design, E-6/E-7). If a raw portal summary of a date is ever available it may be added as an extra cross-check on the *evaluated-rows* view only.
3. **After the Dashboard ticket**: `/api/f11` responses equal the Phase 1 baseline per unit; six-unit sum vs module total as in DC-8; weekly/monthly sums additive.
4. **After Evidence**: violation row count per unit equals the `Không đạt` column; classified + unclassified = violations.
5. Every phase boundary: `Data DKCL`/`Data QLML` file checksums unchanged unless the phase deliberately imports.
6. **Cross-lane check (Section 25.3):** for every date loaded in both lanes, the Huế row (53 → 53) of `fact_f11_national` must equal the Huế detail aggregated on the evaluated-rows view (có thông tin phát, PTC/NT/CH, ≤ 24 h, theo chỉ tiêu denominator / đúng / quá, elapsed bands). The national figure and the Huế dashboard figure (PD-9) are labelled apart and never substituted.

## 19. Test Plan

- Parser unit tests: 52-required/3-optional headers (both a 52-column and a 55-column fixture), missing required header → hard error naming the header, filename extractor accepts `F1.1-YYYY.MM.DD.xlsx` and rejects `F1.3-…`/`F4.1-…`/malformed, TEXT timestamp passthrough incl. the ISO KTTỉnh format, `H:MM` passthrough (`1169:33`), numeric codes → TEXT.
- Real-file test on S-1 (copy into a test sandbox, never the live tree): 2 621 rows, 2 348 Đạt, 240 Không đạt, 33 blank with the 13 / 1 / 19 derived split (DC-13), per-unit table of Section 6.6 (PD-9).
- Repository/service tests: PD-9 denominator asserted explicitly (89,58 % = 2 348/2 621, **not** 90,73 % = 2 348/2 588), six-unit 89,54 %, canonical-six exclusion, pair grid totals = module totals for day, week and month, week math shared with F1.3.
- Import regression: F1.3 and F4.1 import suites pass unchanged; an `F1.1-*.xlsx` never lands in `fact_f13`/`fact_f41` and vice versa; registry validator tests for the new entry (`MANUAL_ONLY` requires `manualOnlyReason`).
- Sweeps per phase: backend `node --experimental-sqlite --test` and root `test_*.js` run per file (memory: the sweep skips them), frontend suite, `oxlint`, `vite build`; pre-existing failures named and compared, not counted.

## 20. Risk Register

| ID | Risk | Mitigation |
| --- | --- | --- |
| R-1 | Watcher imports anything dropped into a registered `Incoming` immediately. | Register F1.1 only after table/parser exist; first import is deliberate and observed (Section 14). |
| R-2 | Portal schema drift already happened (52 → 55 columns) and will recur. | Header-keyed parser, optional extras, drift logged, required-set test (DC-4). |
| R-3 | The system rate (PD-9, blanks = 0 Đạt: 89,58 %) legitimately differs from any portal-style figure that excludes unevaluable rows (90,73 %) and from the PO's pasted summary sheets. | PD-9 recorded; a test asserts 89,58 %; screens label the blank count ("Chưa có đánh giá") next to the rate; the PO's Excel is not a reconciliation source (PD-12). |
| R-4 | Two metrics (`Đánh giá 2025` vs `2026`) live in one file and in the PO's own sheets. | Q-1 before Phase 0; both stored; the non-headline one is clearly labelled secondary. |
| R-5 | Module total vs six-unit total differ (89,58 % / 89,54 %). | DC-8 labelled distinctly; reconciliation asserts both. |
| R-6 | Portal date filter ≠ PTC date (A-16/B-4); wrong assumption would mis-date or double-count rows. | Phase 3 probe observes it; `ngay_do_kiem` from the file name only; re-appearing parcels allowed by `UNIQUE(ngay_do_kiem, ma_bg)`. |
| R-7 | No complete historical daily files exist (B-2) → history, week/month comparison and rank cannot be validated. | Multi-day support built regardless; comparison acceptance waits for ≥ 2 real days; backfill via Phase 3 or PO files. |
| R-8 | The PO's pasted workbooks contain stale body rows (D-2); using them as truth would "reconcile" wrongly. | Only raw portal exports are accepted as baseline sources. |
| R-9 | ~~TCT lane has no sample.~~ Sample audited (Section 25). ~~The TCT file spans two days.~~ **Resolved (Section 25.7):** that was a mistaken two-day file; the single-day file ties to the Huế detail exactly. Remaining risk: a wrong date range at download time silently doubles national figures. | Cross-lane check (Section 18 step 6) on every date loaded in both lanes; the importer compares the TCT Huế row with `fact_f11` when both exist and flags a mismatch; one file per single day. |
| R-10 | Retired office codes in historical files (D-4). | Mapping applied at read time (DC-12). |
| R-11 | Scope creep from the PO's rich manual sheets (X2–X4, notes capture). | Only X1 recommended in the first ticket; the rest require explicit selection. |
| R-12 | Generalising Import touches code F1.3/F4.1 depend on, both PO-passed. | They must remain byte-identical in behaviour — proven by their existing suites passing unchanged. |
| R-13 | Shared worktree with another AI session (index resets). | Commit by pathspec only; verify the commit contains only intended files. |

## 21. PO Gates

| Gate | Point | PO confirms |
| --- | --- | --- |
| G0 | End of this ticket | This plan, the Section 12 contract, the Section 13 phasing, answers to Section 22 (Q-1..Q-4a, Q-13, Q-14 answered in rounds 2-3; Q-4b..Q-12 open, none blocking Phase 0/1) |
| G1 | End of Phase 1 | Section 6.6 baseline reproduced from `fact_f11`; other facts unchanged |
| G2 | End of Phase 2 | S-1 imported through the Import Center; F1.3/F4.1 no regression |
| G3 | End of Phase 3 | HUE auto-backfill verified against the real portal (Windows evidence) |
| G4 | End of Phase 4 | TCT lane + national rank (only after the sample exists) |
| G5 / G6 | Dashboard / BCVH Ranking | Runtime UI check (`/f11/dashboard`, `/f11/ranking/bcvh`), including the two labelled totals |
| G7 | Evidence | Evidence UI + classification accepted after training samples |
| G8 | Acceptance | Reconciliation and regression sweep |

`PO UI Check Required` is `No` for this planning ticket and `Yes` for G2, G5, G6, G7.

## 22. Open Questions For The Product Owner

Business/product decisions only. Each has a recommendation based on evidence; the Product Owner decides. "Blocks" says what cannot start before the answer.

| ID | Question | Recommendation | Blocks |
| --- | --- | --- | --- |
| Q-1 | **CLOSED by PD-6 (2026-10-09): `Đánh giá 2026`.** Still open as a sub-question: should `Đánh giá 2025` (≤ 24 h) be stored/shown as a secondary series? | Store it (DC-3 already does); show only if the PO asks. | none |
| Q-2 | **CLOSED by PD-9:** blank `Đánh giá 2026` stays in the denominator as 0 Đạt (as F4.1) and is flagged separately for later reason analysis (DC-13). | — | none |
| Q-3 | **CLOSED by PD-10:** same as F1.3 (date from the file name, daily notice N-1). | — | none |
| Q-4 | **(a) CLOSED by PD-11** (6 canonical BCVH by delivery unit; 531110 and 531120 counted in the total, hidden from ranking). **(b) CLOSED by PD-15:** no ranking by accepting office; the pair table (PD-8/PD-13) is the only accept-side view, so no office → BCVH mapping is needed. | — | none |
| Q-5 | (a) Tuyến Ranking for F1.1 (the detail has route + ward)? **(b) CLOSED by PD-14: F1.3 colour bands (70/60/50) and target.** | (a) Not in the first ticket; decide after Dashboard. | Dashboard (a only) |
| Q-6 | **CLOSED by PD-14:** weeks Thursday–Wednesday, ISO number of the Thursday, as F1.3. | — | none |
| Q-7 | **File supplied (PD-15, audited in Section 25).** Still to confirm: "Vị thứ toàn quốc x/34" on F1.1 — yes? (the file supports it: Huế is 7th of 34 on the two-day window). | Yes, same rule as F1.3/F4.1. | Phase 4 |
| Q-8 | Roles: `admin` + `viewer` read, Import admin-only (as F4.1)? (F1.1 is currently hidden from viewers.) | Yes, from the Dashboard ticket on. | Dashboard |
| Q-9 | Retired office codes in historical files (e.g. 533130 Huế Bắc → 533140): confirm the `DB` sheet mapping is the official one, and whether history before the reorganisation is needed at all. | Provide the official mapping; history only from the date the PO needs. | Backfill |
| Q-10 | Backfill depth: from `2026-01-01` (registry tracking start) or only from a later date? Will you supply daily detail files meanwhile? | From 2026-01-01 via the portal in Phase 3; interim only the days you supply. | Phase 3 |
| Q-11 | (Non-blocking) The elapsed-time rule: why 10 h is deducted on part of the rows (A-13). Needed only if Evidence recomputes durations. | Ask the DKCL owner; not needed for the KPI. | none |
| Q-12 | Should the Dashboard/Evidence capture "Nguyên nhân / Công tác điều hành" notes per BCVH/day (replacing the Excel columns)? | Yes, as a small phase-later feature; decide after Evidence v0. | Evidence |

## 23. What The Product Owner Needs To Provide

1. ~~Answers to Q-1, Q-2, Q-3, Q-4a~~ — **all answered** (PD-6, PD-9, PD-10, PD-11). Only authorization to activate F11-PHASE-0 and F11-PHASE-1 remains.
2. ~~Reconciliation pair~~ — **not required** (PD-12): the baseline is locked by independent recomputation from the detail file (Section 18). Optional but useful for history/week/month checks and for the Phase 1 test set: a second and third complete daily detail file (any two other dates), downloaded the same way as `F1.1-2026.10.07.xlsx`.
3. ~~One real TCT F1.1 file~~ — supplied and audited (Section 25). Needed now: the answer to **Q-15** (which dates were selected when the TCT file was downloaded), or a fresh single-day TCT download for 07/10.
4. Confirmation that the Huế session may be used for the Phase 3 read-only portal probe (browser profile must be free; the backend/DKCL window is stopped for that run).
5. Approval to activate F11-PHASE-0 / F11-PHASE-1 as the next tickets.

## 24. Audit Round 2 — Toàn trình definition, `Đánh giá CLP F1.1.xlsx`, pair table

Round date 2026-10-09 (evening). Both files are unchanged since Section 5 (SHA-256 identical; `Đánh giá CLP F1.1.xlsx` was open in Excel during the audit and was not saved). Read-only.

### 24.1 The toàn trình rule (PD-7) against the data

| ID | Finding |
| --- | --- |
| E-1 | **Start of the clock = `Thời gian nhận tin thu gom` when present, otherwise `Thời gian chấp nhận`.** `Nhận tin` is filled on 2 101 rows (80,2 %) and is earlier than `Chấp nhận` in every compared row. Using `Chấp nhận` alone reproduces `Thời gian thực tế` on far fewer rows (268 vs 1 056 exact), so the PO's wording "Nhận tin/Thu gom hoặc Chấp nhận" is the rule the portal applies. |
| E-2 | **End of the clock = `Thời gian PTC`, or `Thời gian nộp tiền COD` for COD parcels.** In the 07/10 file the 84 COD rows have `nộp tiền` within one second of `PTC`, so the data cannot tell which of the two the portal picks; both reproduce the elapsed time identically. The PO's rule is adopted as stated. |
| E-3 | **Night deduction (observed, not adopted as a rule).** `Thời gian thực tế` = end − start minus: **0 h on all 1 056 rows that start and end on the same calendar day; 10 h on 1 488 rows that cross midnight** — a single 10 h whether the span is 1 day (1 329 rows), 2 days (132) or 3+ days (27). 27 rows (1,0 %) deviate with partial patterns (9 h ×7 when the start is at or after 17:00, 22–23 h ×8 when the start is before 07:00, 12 h ×2, 19 h, 52 h ×3). It looks like a night window clipped to the interval, but that is a guess; the deduction rule belongs to DKCL (Q-11). Consequence for design: **the system stores and displays the source `Thời gian thực tế` and the source evaluation, and never recomputes them.** Stage hop durations (Evidence) are shown as raw timestamp differences, labelled as such. |
| E-4 | Because the clock covers accepting office, transport/exploitation and delivery, a `Không đạt` can arise at any stage; the delivery BCVH is not necessarily the cause. This is why F1.1 needs the pair view (PD-8) and a stage-aware Evidence. |

### 24.2 `Đánh giá CLP F1.1.xlsx` — how the PO operates today

| ID | Finding |
| --- | --- |
| E-5 | 9 sheets, **6 are hidden** (`DB`, `F1.1TH`, `TH-Tuan`, `DashBoard-Điều hành`, `DashBoard-Data`, `TH-Day` — the 2025-origin template, D-3). The live surface is only three visible sheets: **`F1.1 Ngay`** (pasted portal summary, one day), **`F1.1 Thang`** (pasted portal summary, month to date) and **`Bảng-LK`** (the pair table). |
| E-6 | `F1.1 Ngay` and `F1.1 Thang` contain **no formulas** — they are raw pasted summary exports (147 and 318 accepting-office × delivery-unit rows), and unlike the stale sheet of D-2 they are **internally consistent** (total row = sum of rows on every count column). Day: 1 950 evaluated, 1 665 đúng chỉ tiêu = **85,38 %**; month to date: 11 457 evaluated, 10 154 = **88,63 %**. |
| E-7 | **Neither sheet is the 07/10 day.** Day denominator is 1 950 against 2 588 evaluated in `F1.1-2026.10.07.xlsx`; only 11 of 147 pair cells coincide. `F1.1 Thang` is nonetheless consistent with both: in **every** pair cell Thang ≥ Ngay + 07/10 detail (0 violations), i.e. they are two different days inside the same month window (residual 11 457 − 1 950 − 2 588 = 6 919 for the other days). Most likely `Ngay` is 08/10 (the N-1 of 09/10), but the files do not prove it → Q-13. **The (detail + raw summary) pair of one date therefore still does not exist.** |
| E-8 | **`Bảng-LK` is a SUMIFS pivot over the pasted sheets.** Rows = accepting office (`Mã BC chấp nhận`, column D of the paste), columns = the 6 BCVH (`Mã BC phát`, column H), per BCVH four numbers: `SL ngày`, `Tỷ lệ ngày`, `SL tháng`, `Tỷ lệ tháng`, then a `Tổng cộng` block. **Pair rate = Σ(đúng chỉ tiêu) / Σ(SL PTC/NT/CH theo chỉ tiêu)** — exactly the `Đánh giá 2026` definition (column T / column S of the paste), so the pair table is the headline metric cut by (accepting office, delivering BCVH), and each row/column total equals the BCVH table figure by construction. |
| E-9 | The office list is **hand-maintained**: a main block of 96 offices (rows 5–100) with SUMIFS, then a second block from row 103 of VLOOKUP copies (a priority watch list). **Six offices that appear in the month paste are missing from the list** — 534811 Quảng Thành, 535340 Hương Phong, 535511 Hương Chữ, 536161 Thủy Châu, 536190 Thủy Vân, 536720 Phú An (51 evaluated parcels, 0,45 % of the month). A manual list silently leaks volume; the system must derive the pair set from the data. |
| E-10 | Accepting-office codes include the delivering BCVH codes themselves (533140, 535470, 536250, 537015): the diagonal "accepted and delivered in the same BCVH" is part of the table. |
| E-11 | What the pair table already shows (month to date, from the paste): the largest pair is **531120 Khách hàng lớn → Thuận Hóa, 4 238 parcels at 97,9 %**; the weakest sizeable pairs are Phú Vang (536700) → Hương Thủy 156 @ 59,6 %, Thủy Phương (536210) → Hương Thủy 95 @ 60,0 %, Phú Lộc (537100) → Phú Lộc 272 @ 68,8 %, Hương Thủy (536100) → Hương Thủy 255 @ 73,7 %. Quality problems are therefore concentrated in specific pairs, which is exactly what the BCVH-only table hides. |

### 24.3 The PO's own violation vocabulary (hidden `F1.1TH` notes)

124 free-text cells (34 "Nguyên nhân", 33 "Công tác điều hành") record, per BCVH and day, a breakdown such as *"39 BG quá quy định, trong đó: Chậm cập nhật TTP 10; Chậm giao bưu tá 01; Chậm nộp tiền 12; Chậm thu gom/Chấp nhận 2; BC KTT chậm đóng chuyển 6; Khách quan 8"*, followed by a *"Yêu cầu"* addressed to a named unit head, with the detailed parcel list sent by Viber. Phrases found (occurrences across the notes): `Khách quan` 28; `Chậm cập nhật TTP` 35; `chậm đóng chuyển` 24 (BC chấp nhận / BC KTT variants); `Chậm giao bưu tá (BT)` 37; `Chậm nộp tiền` 18; `Chậm nhập TTP` 7; `Chậm thu gom / Chấp nhận` 10; `đóng lạc hướng` (BC chấp nhận, BC KTT); `Chậm phát (lại)`.

These are **candidate** stage labels for the training session (Section 17), not rules: they map to units in a plausible way (thu gom/chấp nhận/đóng chuyển/lạc hướng → accepting office or BCKTT; giao bưu tá, cập nhật TTP, nộp tiền → delivering BCVH; khách quan → excluded from blame), but the stage boundaries and the owner of each stage are the PO's to define. They also fix an Evidence requirement: **per-unit violation lists that can be exported/pasted into Viber**, plus the daily "Nguyên nhân / Công tác điều hành" note (Q-12).

### 24.4 Effect on the plan

1. **F1.1 has two deliverable views from the same table `fact_f11`** — the BCVH operation table (delivery BCVH, 6 units) and the pair table (accepting office × delivering BCVH, day and month to date, all accepting offices derived from data). No second import is needed: both come from the detail rows, so the portal *summary* report is not imported; it is kept only as the reconciliation baseline (pair gate, Section 18). The F1.1-X1 block is therefore a first-ticket requirement (PD-8), not an option.
2. The pair table gets its own index in DC-9 `(ngay_do_kiem, ma_bc_chap_nhan, ma_bc_phat, danh_gia_2026)`; EXPLAIN is recorded in Phase 1.
3. DC-6 gains: `Thời gian thực tế`, `Thời gian chỉ tiêu 2026`, and the two evaluations are source values, never recomputed (E-3).
4. The "accepting office → managing BCVH" mapping (Q-4b) is needed only for an accept-side *ranking*; the pair table itself needs no mapping.
5. Phase 0 can open as soon as Q-2, Q-3 and Q-4a are answered.

### 24.5 Questions added

| ID | Question | Recommendation | Blocks |
| --- | --- | --- | --- |
| Q-13 | **CLOSED by PD-12:** `F1.1 Ngay/Thang` are only the PO's working inputs from the summary download; they are not reconciled against. | — | none |
| Q-14 | **ANSWERED by PD-13:** pair table for day, week and month; all accepting offices; interface delegated to Antigravity ("smart"). Remaining detail for Antigravity's brief only: colouring thresholds (Q-5b) and optional minimum-volume handling. | — | none |

## 25. Audit Round 4 — TCT national file and the consolidated plan table

Round date 2026-10-09 (night). Read-only. Subject: `Downloads/09-10-2026_21-33-14_F1.1_bao_cao_chat_luong_toan_trinh_buu_giay_noi_tinh(1).xlsx` (SHA-256 `88b47ac1…e1499d0`, 17 732 B, 1 sheet), described by the PO as the TCT F1.1 file for 07/10. It was not copied into `Data DKCL/` and nothing was imported.

### 25.1 Structure

| ID | Finding |
| --- | --- |
| G-1 | The same report as the Huế summary (`…_noi_tinh`, no `_chi_tiet`), seen at national scope: 93 rows × 29 columns, 3 header rows with 50 merged ranges, a column-number legend row, the **grand-total row first**, then **89 body rows**. Identity columns: tỉnh chấp nhận (code + name), BC chấp nhận, tỉnh phát (code + name), BC phát, `Mã KHL`, `Tên KHL`; then the same 18 measures as the Huế summary (có thông tin phát, PTC/NT/CH, ≤ 24 h, KPI 2026 theo chỉ tiêu, five elapsed-time bands, chưa đủ thông tin, loại trừ). |
| G-2 | **Grain = (tỉnh chấp nhận × tỉnh phát).** The BC chấp nhận, BC phát and KHL columns are empty in every row — aggregation stops at province. No parcel-level data exists at TCT scope, so **Evidence stays Huế-only** (as F4.1). |
| G-3 | Grand-total row = sum of the 89 body rows on all 16 count columns tested (0 mismatches). It must be skipped on ingest or every national figure doubles (same rule as F4.1's TCT file). Codes are text (`"01"`, `"53"`) — never numbers. |
| G-4 | **Population.** 47 rows have accepting province = delivering province ("nội tỉnh" rows); 42 are cross-province rows (accepted at a corporate unit such as 01 Tổng công ty EMS, 02, 03, 08, or at a Hà Nội / Hồ Chí Minh centre and delivered elsewhere). All **34 nationally ranked province codes** (the frozen list `NATIONAL_RANKED_PROVINCE_CODES` already used by F1.3/F4.1) are present as same-province rows; none is missing. The other 13 same-province rows are Hà Nội centres (6, volume 0) and Hồ Chí Minh centres / Bình Dương (7, small) — outside the ranked list. |

### 25.2 The Huế row ties exactly to the Huế data

| ID | Finding |
| --- | --- |
| G-5 | The Huế row (53 → 53) is **not a single day.** It equals `F1.1-2026.10.07.xlsx` **plus** the day held in the PO's `F1.1 Ngay` sheet, column by column: có thông tin phát 4 603 = 2 621 + 1 982; PTC/NT/CH 4 539 = 2 589 + 1 950; có thời gian thực tế 4 504 = 2 571 + 1 933; ≤ 24 h 4 101 = 2 400 + 1 701; > 24 h 403 = 171 + 232; theo chỉ tiêu: mẫu số 4 538 = 2 588 + 1 950, đúng chỉ tiêu 4 013 = 2 348 + 1 665, quá chỉ tiêu 525 = 240 + 285; elapsed bands 4 101 / 141 / 150 / 42 / 69 = (2 400 / 72 / 72 / 5 / 22) + (1 701 / 69 / 78 / 37 / 47). **All 13 columns that the 07/10 detail can reproduce were recomputed independently from the detail file** (rows, bands, evaluations) and match the TCT figure minus the other day exactly. |
| G-6 | Consequence 1: the TCT download covers **07/10 and one other day** — the day of the PO's `F1.1 Ngay` sheet (most likely 08/10, not provable from the files). The portal's date filter at TCT scope therefore spans two days (or the range chosen was two days). Importing this file under a single `ngay_do_kiem` would give a national figure for two days → **Q-15**. |
| G-7 | Consequence 2 (good news): TCT and Huế are the **same data under the same definition** — the F4.1 problem (`4.684` TCT vs `4.695` Huế, F4.1 Q-6) does not occur here. The only difference between the two lanes is the blank-evaluation rule: the TCT rate excludes unevaluable rows (portal definition), the Huế dashboard counts them as 0 Đạt (PD-9). The national rank therefore uses the **published national rate** and is labelled as such, exactly the F4.1 R-8 rule; it never replaces the Huế figure. |
| G-8 | *(Superseded: two-day file, and a same-province-only ranking later corrected by PD-17 — see G-13.)* Huế on this two-day window: 4 013 / 4 538 = **88,43 %** (≤ 24 h view: 90,35 %). Rank among the 34 by the KPI 2026 rate: **7th of 34**; top five Lạng Sơn 92,62 %, Cao Bằng 92,30 %, Quảng Trị 91,92 %, TP Hồ Chí Minh 90,08 %, Hà Nội 89,05 %; bottom three Tuyên Quang 72,99 %, Lâm Đồng 70,06 %, Lai Châu 66,92 %. The same 7th place results from the ≤ 24 h rate. Indicative only until Q-15. |
| G-9 | No date appears anywhere in the file; `ngay_do_kiem` must come from the file name (rule DC-5). The file in Downloads has the portal's download name (`09-10-2026_21-33-14_…`), not the target name `F1.1-YYYY.MM.DD.xlsx`. |

### 25.3 What this means for the earlier decisions

1. Q-4b closed (PD-15): no accept-side ranking, pair table only.
2. The Huế row of the TCT report cross-checks the Huế lane for free: for any date for which both lanes are loaded, TCT's Huế row must equal the Huế detail aggregated on the **evaluated-rows view** (G-5). This becomes the standing cross-lane reconciliation (Section 18, step 6).
3. The "Ngay" sheet is now identified as a real portal day (the second day inside this TCT window), which retroactively explains why it is consistent with the month sheet (E-6/E-7); it is still not used as a source (PD-12).

### 25.4 TCT lane design (replaces the placeholder of Section 15)

| Item | Design |
| --- | --- |
| Table | `fact_f11_national`, additive: `id`, `ngay_do_kiem`, `import_log_id`, `created_at`, `ma_tinh_chap_nhan`, `ten_tinh_chap_nhan`, `ma_tinh_phat`, `ten_tinh_phat`, the 18 count measures as INTEGER (the text percentage columns are stored raw but never used). `UNIQUE(ngay_do_kiem, ma_tinh_chap_nhan, ma_tinh_phat)`. Indices on `(ngay_do_kiem)` and `(ma_tinh_phat, ngay_do_kiem)`. |
| Parser | `f11TctExcelParser.js`: positional (3 header rows + legend row), grand-total row skipped, codes as text, date from the file name only, every data row stored (including cross-province rows) so no later question needs a re-import. |
| Completeness rule | As F4.1 AB-AUTH-16: **all 34 frozen province codes must be present as a delivering province (`Mã tỉnh phát`)** in at least one row; row count is not checked (84 here; varies by day). A day missing a required code is rejected with the code list. |
| Registry lane | `INDICATORS['F1.1'].lanes.TCT`: `targetTable fact_f11_national`, `distinctColumn ma_tinh_phat`, no fixed `expectedRowCount`, `MANUAL_ONLY` with reason until Phase 3 verifies a portal adapter. Report slug for the portal match: `F1.1_bao_cao_chat_luong_toan_trinh_buu_giay_noi_tinh` (observed from this download name; stored-procedure identity still to be observed). |
| National rank | `F11NationalRankService` (twin of `F41NationalRankService`): for a date range, **group every row by the delivering province (`Mã tỉnh phát`) whatever the accepting province, add up numerators and denominators of all its rows, and only then compute** `rate = SUM(đúng chỉ tiêu) / SUM(SL theo chỉ tiêu)` for each of the 34 frozen codes (PD-17; rows of delivery codes outside the 34 are not ranked, as F1.3/F4.1); order descending, ties by volume, not merged; result shape identical to F1.3/F4.1 so the shared overview/weekly services consume it unchanged. Label: "Tỷ lệ KPI 2026 theo báo cáo toàn quốc". Rank is for Huế as a whole, never for a single BCVH. |
| Not in TCT lane | Evidence, BCVH-level data, route, pair table (all Huế-only, from the detail file). |

### 25.5 Consolidated plan table (what is done next, by whom)

| # | Ticket | What it delivers (plain words) | Who | Needs from the PO | Gate |
| --- | --- | --- | --- | --- | --- |
| 1 | **F11-PHASE-0** | Rulebook for F1.1: definition, formulas, sample numbers, test scenarios — frozen so nobody guesses later | Claude Code | authorization | G0 |
| 2 | **F11-PHASE-1** | A place in the database for the Huế detail rows + the file reader; file 07/10 loaded and numbers checked (89,58 %; 89,54 % for six BCVH; 13 / 1 / 19 blanks; pair grid sums to the total) | Claude Code; Opus reviews the data design | authorization | G1 |
| 3 | **F11-PHASE-2** | Huế file goes in through the Import Center, with a deliberate first load | Claude Code (+ Antigravity for the selector button) | go-ahead for the first real load | G2 |
| 4 | **F11-PHASE-3** | Read-only probe of the DKCL portal, then automatic download + backfill for Huế (and TCT) | Claude Code + Antigravity (Windows evidence) | session free (backend stopped) | G3 |
| 5 | **F11-PHASE-4** | National file import + "Vị thứ toàn quốc x/34" (design in 25.4) | Claude Code | **Q-15 answer** | G4 |
| 6 | **F11-DASHBOARD-RANKING-01** | Operation Dashboard + BCVH Ranking (day / week / month, F1.3 colours and weeks) + the accept → deliver pair table (day / week / month) | Claude Code (data), Antigravity (screens), Opus (independent review) | UI check | G5, G6 |
| 7 | **F11-EVIDENCE-01** | Violation list per unit, stage timeline, blank-reason split; classification after the PO's training | Claude Code + Antigravity + PO training | training sessions | G7 |
| 8 | **F11-ACCEPTANCE** | Full recheck, regression of F1.3 / F4.1, acceptance, daily-notice template | Claude Code | acceptance | G8 |

Order: 1 → 2 → (3 and 4 in parallel) → 5 → 6 → 7 → 8. Tickets 1-2 need no other answer.

### 25.7 Round 5 — the single-day TCT file (Q-15 closed)

The PO confirmed the first file (SHA-256 `88b47ac1…`) was sent by mistake and supplied `Downloads/09-10-2026_21-52-27_F1.1_…_noi_tinh(1).xlsx` (SHA-256 `2bab3064616b276fa3fad0ec909b801c6e13ebeb2dcb16e40e88e6992d03cb9a`, 17 117 B) as the TCT file for 07/10.

| ID | Finding |
| --- | --- |
| G-10 | Same layout as G-1..G-3: 88 rows × 29 columns, 50 merged ranges, grand-total row first (total = sum of the 84 body rows, 0 mismatches). 44 same-province rows; **all 34 frozen ranked codes present**, none missing. |
| G-11 | **The Huế row (53 → 53) equals `F1.1-2026.10.07.xlsx` exactly** on every count column the detail can reproduce: có thông tin phát 2 621; PTC/NT/CH 2 589; có thời gian thực tế 2 571; ≤ 24 h 2 400; quá QĐ 171; chưa đủ thông tin 10; theo chỉ tiêu 2 588 / đúng 2 348 / quá 240; elapsed bands 2 400 / 72 / 72 / 5 / 22. Only `Sản lượng loại trừ` (20) is not derivable from the detail (excluded parcels are not in the file). |
| G-12 | Therefore **(A) is the explanation**: the first file covered two days; the Huế detail download for 07/10 is complete (hypothesis (B) is rejected), and TCT and Huế are the same data under the same definition for a single day. |
| G-13 | **Correct national ranking (PD-17): group all rows by delivering province, add numerators and denominators, then rate, then rank.** 45 delivering codes appear; the 34 ranked codes are all present and cover 181 003 of the 181 427 evaluated parcels. Provinces with several rows change materially: Hà Nội (13 rows) 30 036 / 25 787 = 85,85 % → **12th** (the earlier same-province-only figure, 89,05 %, was wrong), TP Hồ Chí Minh (15 rows) 41 894 / 34 670 = 82,76 % → 18th, Đà Nẵng (3 rows) 82,54 % → 19th, Cần Thơ 81,32 % → 22nd, Đồng Nai 79,76 % → 24th. **Huế has a single row, so it is unchanged: 4th of 34, `2.348 / 2.588 = 90,73 %`** (≤ 24 h view 5th). Top six: Cao Bằng 94,40 %, Quảng Trị 92,78 %, Lạng Sơn 92,44 %, **Huế 90,73 %**, Điện Biên 90,07 %, Quảng Ninh 89,28 %. Lowest: Lai Châu 52,56 % (352 evaluated), Lâm Đồng 69,16 %, Tuyên Quang 71,92 %. Eleven delivery codes sit outside the 34 (six Hà Nội centres at 0; Trung tâm Sài Gòn 40/32, Phú Thọ 34/0, Nam Sài Gòn 27/0, Thủ Đức 1/0, Bình Dương 322/0) and are not ranked, as F1.3/F4.1 — flagged as Q-16. |
| G-14 | The published Huế rate (90,73 %) is the evaluated-rows figure; the Huế dashboard figure under PD-9 is 89,58 %. Both are correct and labelled apart (R-3, R-8 rule). |
| G-15 | **Reconciliation baseline now locked from two independent sources:** the Huế detail (recomputed by script) and the TCT Huế row agree exactly. Phase 4 can be specified without open points; the standing cross-lane check (Section 18 step 6) has its first passing instance. |

### 25.6 Question added

| ID | Question | Recommendation | Blocks |
| --- | --- | --- | --- |
| Q-16 | The eleven delivery codes outside the 34 (Hà Nội/Hồ Chí Minh district centres and Bình Dương, 424 evaluated parcels) are not ranked and not merged into Hà Nội/Hồ Chí Minh — same as F1.3 and F4.1. Confirm. | Confirm (follow the frozen list). | F11-PHASE-4 |
| Q-15 | **CLOSED 2026-10-09 (Section 25.7): explanation (A) confirmed — the first TCT file was a two-day file sent by mistake; the single-day TCT file for 07/10 equals the Huế detail exactly.** *(History:)* Re-opened after the PO stated that the TCT file is the single day 07/10 and that the download method is the same as F1.3.** The data says the Huế row of the TCT file (4.603 / 4.538 / 4.013) equals the 07/10 Huế detail (2.621 / 2.588 / 2.348) **plus** 1.982 / 1.950 / 1.665 more parcels, on 13 independently recomputed columns. Two explanations fit and the files cannot tell them apart: **(A)** the TCT download covers two days; **(B)** the Huế detail download covers only part (57 %) of 07/10, the rest being the block that equals the PO's `F1.1 Ngay` sheet. | One check settles it: download the TCT report again for 07/10 only (From = To = 07/10) and read the Huế row. If it shows 2.621 / 2.588 → (A). If it again shows 4.603 / 4.538 → (B), and the Huế detail export must be re-checked. Alternative check: the Huế-level summary for 07/10 — 2.588 → (A), 4.538 → (B). | F11-PHASE-2 (first real load), F11-PHASE-4 |
