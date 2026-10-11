---
title: Data Blueprint
purpose: Bảng dữ liệu, cột nguồn và luồng import F1.2
owner: Architect
ssot: True
dependencies: measurement.md
version: 1.0.0
---

# Data Blueprint — F1.2

## 1. Tables (migration `backend/migrate_f12_schema.js`, mirrored in `schema.sql`)

| Table | Grain | Key | Source |
| --- | --- | --- | --- |
| `fact_f12` | one parcel per day | `UNIQUE(ngay_do_kiem, ma_bg)` | HUE detail file (35 columns) |
| `fact_f12_national` | one accepting province per day | `UNIQUE(ngay_do_kiem, ma_tinh_chap_nhan)` | TCT summary file (20 columns) |

## 2. Detail reader `backend/src/services/f12HueExcelParser.js`

- Header-keyed (NFC, collapsed spaces). 12 required headers: parcel id, accepting province/office code and name, `Thời gian chấp nhận`, BĐ10 TMS and BCCP times, elapsed, rating, `Mã/Tên Huyện`. The other 23 are optional (NULL when absent); unknown headers are reported.
- Codes stored as text (`ma_tinh_phat` mixes `71` and `'01'`); the back-tick before the BĐ10 number is removed.
- Elapsed `H:M`, both parts may be negative; rating `Đạt | Không đạt | empty`; timestamps `dd/MM/yyyy HH:mm:ss`.
- Refuses a duplicated header, a duplicated parcel, an unknown value, and a file whose BĐ10 day is not the file-name day (BR-4). Reports `ratingRuleMismatches` (rating vs 10 h) without changing data.

## 3. National reader `backend/src/services/f12TctExcelParser.js`

Two merged header rows + legend row + grand total first. Grand total must equal the body on every count; each accepting province once; the 34 ranked provinces must be present; an export grouped by office or customer is refused. Rate kept as text (`'92.15%'`).

## 4. Import

Shared pipeline (`importPipeline.executeImport`), registry `F1.2` (`PLANNED`, lanes `HUE` → `fact_f12`, `TCT` → `fact_f12_national`, both `MANUAL_ONLY` until F12-PHASE-3). Folders `Data DKCL/F1.2/{Incoming,Processed,Error}/{HUE,TCT}`. Manual upload: Trung tâm dữ liệu → chọn F1.2, nguồn HUE hoặc TCT, file tên `F1.2-YYYY.MM.DD.xlsx`.

## 5. National rank `backend/src/services/F12NationalRankService.js`

Same methods as F1.1 (`getNationalRankSummary`, `getNationalRanking`, `getNationalRanksForDates`) over `fact_f12_national` by `ma_tinh_chap_nhan`.
