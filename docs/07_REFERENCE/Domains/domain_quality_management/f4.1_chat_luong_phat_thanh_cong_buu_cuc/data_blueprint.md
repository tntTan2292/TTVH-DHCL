---
title: Data Blueprint
purpose: Hợp đồng dữ liệu đầy đủ cho hai luồng nguồn F4.1 (HUE hàng-bưu-gửi, TCT tổng hợp)
owner: Data Architect
ssot: True
dependencies: core_knowledge.md
version: 1.0.0
---

# Data Blueprint

Source evidence: read-only inventory in `docs/06_REVIEWS/Shared/F41-MODULE-PLAN_CHECKPOINT_001.md` Sections 7 (HUE) and 18 (TCT). No file was created, moved, renamed, or modified to produce this blueprint; both source checksums were re-verified unchanged after each audit.

## 0. System Fields (both target tables, shared pattern with `fact_f13`)

| Field | Type | Rule |
| --- | --- | --- |
| `id` | INTEGER PK AUTOINCREMENT | — |
| `ngay_do_kiem` | DATE NOT NULL | From file name only — §3. Never from cell content. |
| `import_log_id` | INTEGER | FK to the module's import log. |
| `created_at` | DATETIME DEFAULT CURRENT_TIMESTAMP | — |

## 1. HUE Lane — Row-Level (Authoritative For The Module KPI)

File: `F4.1-YYYY.MM.DD.xlsx`. Sample audited: `Data DKCL/F4.1/Incoming/HUE/F4.1-2026.08.01.xlsx`, SHA-256 `dcaae8e10370d9ce3661141e3167a0838329591473fdbc961182757d933636a8`, 862.532 bytes, sheet `Worksheet`, header row 1, **42 columns**, **4.695 data rows**.

Grain: **one row per shipment** (`Số hiệu bưu gửi`). `4.695` distinct values, zero duplicates, zero empty — `UNIQUE(ngay_do_kiem, ma_bg)` holds, matching `fact_f13`'s own key.

### 1.1 Column mapping (all 42 persisted; target field names follow the `fact_f13` snake_case convention)

| # | Source header (VN) | Target field | Notes |
| --- | --- | --- | --- |
| 1 | STT | `stt` | — |
| 2 | Mã tỉnh phát | `ma_tinh_phat` | Constant `53` in the audited sample. |
| 3 | Tên tỉnh phát | `ten_tinh_phat` | — |
| 4 | Mã huyện phát | `ma_huyen_phat` | 6 distinct values in sample. |
| 5 | Tên huyện phát | `ten_huyen_phat` | — |
| 6 | Địa bàn phát (Trung tâm tỉnh/Huyện thông thường/…) | `dia_ban_phat` | Always NULL in the audited sample. |
| 7 | Mã BC phát | `ma_bc_phat` | 7 distinct values — the 6 canonical BCVH + `531120`. |
| 8 | Tên BC phát | `ten_bc_phat` | — |
| 9 | Loại BCP | `loai_bcp` | — |
| 10 | Dịch vụ | `dich_vu` | — |
| 11 | Loại DV | `loai_dv` | Always NULL in the audited sample. |
| 12 | Nhóm SPDV | `nhom_spdv` | — |
| 13 | Mã SPDV | `ma_spdv` | — |
| 14 | Số hiệu bưu gửi | `ma_bg` | **Required column** — parse guard (§4). Row key. |
| 15 | Số hiệu lô | `so_hieu_lo` | Always NULL in the audited sample. |
| 16 | Số tiền COD | `so_tien_cod` | Always NULL in the audited sample. |
| 17 | Khối lượng thực tế | `khoi_luong_thuc_te` | Numeric. |
| 18 | Khối lượng quy đổi | `khoi_luong_quy_doi` | Text bucket (`<=2kg`, …). |
| 19 | Mã KHL | `ma_khl` | Constant `0` in the audited sample. |
| 20 | Tên KHL | `ten_khl` | — |
| 21 | Số hiệu BD10 XNĐ BCP | `so_hieu_bd10_xnd_bcp` | — |
| 22 | Thời gian BCP XNĐ BĐ10 | `thoi_gian_bcp_xnd_bd10` | TEXT `dd/MM/yyyy HH:mm:ss` (§2.1). |
| 23 | Thời gian BD10 quét xuống tại BCP | `thoi_gian_bd10_quet_xuong_bcp` | TEXT `dd/MM/yyyy HH:mm:ss`. |
| 24 | Số hiệu BD8 XNĐ BCP | `so_hieu_bd8_xnd_bcp` | — |
| 25 | Thời gian BCP XNĐ BĐ8 | `thoi_gian_bcp_xnd_bd8` | TEXT `dd/MM/yyyy HH:mm:ss`. |
| 26 | Thời gian XND BD1 | `thoi_gian_xnd_bd1` | TEXT `dd/MM/yyyy HH:mm:ss`; F4.1-only field. |
| 27 | Thời gian PTC | `thoi_gian_ptc` | TEXT `dd/MM/yyyy HH:mm:ss`. |
| 28 | Thời gian nộp tiền | `thoi_gian_nop_tien` | TEXT `dd/MM/yyyy HH:mm:ss`. |
| 29 | Thời gian TMS XNĐ BCP | `thoi_gian_tms_xnd_bcp` | TEXT `dd/MM/yyyy HH:mm:ss`; F4.1-only field. |
| 30 | Thời gian ko TMS thực hiện PTC | `thoi_gian_khong_tms_thuc_hien_ptc` | Raw TEXT `H:mm`, **not zero-padded** (§2.2). |
| 31 | Thời gian có TMS thực hiện PTC | `thoi_gian_co_tms_thuc_hien_ptc` | Raw TEXT `H:mm`, not zero-padded. |
| 32 | Thời gian ko TMS thực hiện PLD | `thoi_gian_khong_tms_thuc_hien_pld` | Raw TEXT `H:mm`, not zero-padded. |
| 33 | Thời gian có TMS thực hiện PLD | `thoi_gian_co_tms_thuc_hien_pld` | Raw TEXT `H:mm`, not zero-padded. |
| 34 | Thời gian chuyển hoàn | `thoi_gian_chuyen_hoan` | TEXT `dd/MM/yyyy HH:mm:ss`; presence signals a returned shipment. |
| 35 | Đánh giá (so sánh thời gian thực hiện với 12,5 giờ) | `danh_gia_12_5h` | `Đạt` / `Không đạt` / NULL. |
| 36 | Đánh giá (so sánh thời gian thực hiện với 72 giờ) | `danh_gia_72h` | `Đạt` / `Không đạt` / NULL. |
| 37 | Thời gian Phát thành công lần đầu | `thoi_gian_phat_thanh_cong_lan_dau` | TEXT `dd/MM/yyyy HH:mm:ss`. |
| 38 | Đánh giá (thời gian Không đo TMS PTC 8 giờ) | `danh_gia_khong_tms_ptc_8h` | `Đạt` / `Không đạt` / NULL. |
| 39 | **Đánh giá (thời gian Có TMS PTC 8 giờ)** | **`danh_gia_co_tms_ptc_8h`** | **PO-1 metric — the module KPI evaluation column.** |
| 40 | Đánh giá (thời gian Không đo TMS PTC lần đầu 8 giờ) | `danh_gia_khong_tms_ptc_lan_dau_8h` | `Đạt` / `Không đạt` / NULL. |
| 41 | Đánh giá (thời gian Có TMS PTC lần đầu 8 giờ) | `danh_gia_co_tms_ptc_lan_dau_8h` | `Đạt` / `Không đạt` / NULL. |

Phase 1 implementation validation against the real workbook corrected this note: the HUE parser persists all 42 source columns. The real header includes `Nhóm khách hàng` between `Tên KHL` and `Số hiệu BD10 XNĐ BCP`, persisted as `nhom_khach_hang`. No KPI figure, denominator rule, or reconciliation baseline changes.

### 1.2 Structural differences vs the frozen F1.3 41-column mapping

- **Same concept, different spelling** — `Loại BCP` (F4.1) vs `Loại BC Phát` (F1.3); `Mã huyện phát`/`Tên huyện phát` (F4.1) vs `Mã Huyện`/`Tên Huyện` (F1.3). A shared header-to-field mapping cannot be reused between the two indicators.
- **F4.1-only columns**: `Mã KHL`, `Thời gian XND BD1`, `Thời gian TMS XNĐ BCP`, the 4 duration columns (30-33), `Thời gian chuyển hoàn`, `Thời gian Phát thành công lần đầu`, and 6 `Đánh giá (…)` columns (35-36, 38-41).
- **F1.3-only columns, absent from F4.1**: `Mã tuyến phát`, `Tên tuyến phát`, `Loại tuyến phát`, `Thời gian chi tiêu`, `Đánh giá 2026 (Đạt/Không đạt)`, `Đánh giá (Đạt/Không đạt)`, all four `Phường Xã` columns.
- **Consequence**: `backend/src/services/excelParser.js` (F1.3's frozen parser) is not reusable for F4.1. A sibling parser is required; the F1.3 mapping is never edited.

### 1.3 Value types and known irregularities

- Every time column arrives as a **TEXT string**, never an Excel date serial. `Thời gian XND BD1` is the most complete (4.695/4.695 non-null); `Thời gian PTC` 4.453; `Thời gian nộp tiền` 990; `Thời gian TMS XNĐ BCP` 4.686; `Thời gian chuyển hoàn` 241.
- The 4 duration columns (30-33) are **not fixed-width** — minutes are frequently unpadded (`46:7`, `6:8`, `13:3`, `1:4`) and hours can exceed 24 (`107:38`). They are stored as raw TEXT and are never parsed into a time-of-day or coerced to a duration metric in this scope.
- `Mã BC phát` has exactly 7 distinct values: the 6 canonical BCVH codes plus `531120` (see `business_rules.md` §2).

## 2. TCT Lane — Aggregate (National Report, Not Shipment Detail)

File: `F4.1-YYYY.MM.DD.xlsx` under the `TCT` sub-tree. Sample audited: `Data DKCL/F4.1/Incoming/TCT/F4.1-2026.08.01.xlsx`, SHA-256 `6256ef56bba40cee7567dfe6b55d6822adb9923c3644c489382cbfd8d9df18e8`, 15.963 bytes, sheet `Worksheet`, range `A1:AL50`, **38 populated columns**, **32 merged cells**.

Grain: **one row per reporting unit** (province or organisational unit), **not** per shipment. `Mã huyện`, `Mã BC`, `Ma KHL` are NULL in every one of the 46 unit rows; there is no `Số hiệu bưu gửi` column of any kind.

### 2.1 Row layout (positional, not header-scanning)

| Row | Content |
| --- | --- |
| 1 | Header level 1 (group headers, merged over sub-header ranges) |
| 2 | Header level 2 (sub-headers under the merged `Đúng thời gian quy định` / `Quá thời gian quy định` groups) |
| 3 | Column-number legend (`1`, `2`, …, formula annotations e.g. `11=10/9`) — **not data**, must never be ingested as a row |
| 4 | **Grand-total row** — `TT = 1`, `Mã tỉnh`/`Tên tỉnh` both NULL. Verified as a true sum across all 17 numeric columns against the 46 unit rows. **Must be skipped on ingest.** |
| 5-50 | `46` reporting-unit rows, `TT = 2..47` |

`46` distinct `Mã tỉnh`/unit codes, zero duplicates. Not all units are provinces — the file also carries `01 Tổng công ty EMS`, `08 Bưu điện Trung Ương`, and several Hà Nội `Bưu điện Trung tâm` units in the same column, so the key concept is "reporting unit", not strictly "province".

### 2.2 Column mapping (28 measure columns, indices per the report's own header)

| Idx | Group | Column | Legend | Target field |
| --- | --- | --- | --- | --- |
| 0-9 | — | `TT`, `Mã tỉnh`, `Tên tỉnh`, `Mã huyện`, `Tên huyện`, `Mã BC`, `Tên BC`, `Loại BC`, `Ma KHL`, `Ten KHL` | 1-10 | `stt`, `ma_don_vi`, `ten_don_vi`, `ma_huyen`, `ten_huyen`, `ma_bc`, `ten_bc`, `loai_bc`, `ma_khl`, `ten_khl` |
| 10 | — | Sản lượng PTC/ Nộp tiền/ CH | 9 | `sl_ptc_nop_tien_ch` — **the report's own denominator** |
| 11 | — | Sản lượng PTC/ Nộp tiền | 10 | `sl_ptc_nop_tien` |
| 12 | — | Tỷ lệ PTC/ Nộp tiền | `11=10/9` | `tl_ptc_nop_tien` (raw TEXT) |
| 13-14 | Đúng thời gian quy định | Sản lượng / Tỷ lệ PTC trong QĐ 12,5 giờ | 12, 13 | `sl_dung_12_5h`, `tl_dung_12_5h` |
| 15-16 | Đúng thời gian quy định | Sản lượng / Tỷ lệ PTC/Nộp tiền/CH trong QĐ 72 giờ | 14, `15=14/9` | `sl_dung_72h`, `tl_dung_72h` |
| 17-18 | Quá thời gian quy định | Sản lượng / Tỷ lệ phát thành công/Nộp tiền > 12,5h và chuyển hoàn | 16, `17=16/9` | `sl_qua_12_5h`, `tl_qua_12_5h` |
| 19-20 | Quá thời gian quy định | Sản lượng / Tỷ lệ phát thành công/Nộp tiền/CH > 72h | 18, `19=18/9` | `sl_qua_72h`, `tl_qua_72h` |
| 21 | — | Sản lượng chưa đủ thông tin đo kiểm | 20 | `sl_chua_du_thong_tin` |
| 22 | — | SL loại trừ không đo kiểm | 21 | `sl_loai_tru` |
| 23-24 | — | SL Chuyển hoàn / Tỷ lệ chuyển hoàn | 22, `22/9=23` | `sl_chuyen_hoan`, `tl_chuyen_hoan` |
| 25-26 | — | Sản lượng / Tỷ lệ PTC 8h tại bưu cục (XNĐ BD1) | 24, `24/9=25` | `sl_ptc_8h_xnd_bd1`, `tl_ptc_8h_xnd_bd1` |
| **27-28** | — | **Sản lượng / Tỷ lệ PTC 8h tại bưu cục (có quét TMS)** | 26, `27=26/9` | **`sl_ptc_8h_co_tms`, `tl_ptc_8h_co_tms`** — aggregate counterpart of the PO-1 metric |
| 29-33 | — | Duration buckets `≤12h`, `>12≤14h`, `>14≤16h`, `>16≤36h`, `>36h` | 28-31 | `sl_bucket_12h`…`sl_bucket_36h_plus` |
| 34-35 | — | Sản lượng / Tỷ lệ PTC lần đầu 8h (XNĐ BD1) | 32, `33=32/9` | `sl_ptc_8h_lan_dau_xnd_bd1`, `tl_ptc_8h_lan_dau_xnd_bd1` |
| 36-37 | — | Sản lượng / Tỷ lệ PTC lần đầu 8h (có quét TMS) | 34, `35=34/9` | `sl_ptc_8h_lan_dau_co_tms`, `tl_ptc_8h_lan_dau_co_tms` |

Every published rate divides by idx 10 (`Sản lượng PTC/ Nộp tiền/ CH`), per the report's own legend `11=10/9`, `15=14/9`, `24/9=25`, `27=26/9`, etc.

### 2.3 Value types

- All `Sản lượng` / count columns are numeric.
- All `Tỷ lệ` columns are **TEXT percent strings** (`"96.34%"`, `"0%"`) — never parsed into floats, stored raw.
- `Mã tỉnh` is inconsistently typed — `"01"`, `"08"` arrive as zero-padded strings, `10`, `53`, `90` as numbers. Normalized to a zero-padded string string on ingest.

### 2.4 Dates and evaluation fields

- **No date exists anywhere in the workbook** — zero `Date`-typed cells, zero date-like strings, across all 50×38 cells. The file name is the *only* possible source of `ngay_do_kiem`; a missing/unparseable file name is a hard error, with no fallback (§3).
- **No `Đạt`/`Không đạt` text field exists at all.** Every evaluation is a pre-aggregated count plus a published rate. The F1.3-style per-shipment reason classification is not computable from this lane, and it is never attempted (`business_rules.md` §5).

## 3. Filename-Derived Analysis Date (Both Lanes)

`ngay_do_kiem` is sourced **only** from the file name `F4.1-YYYY.MM.DD.xlsx`, exactly as F1.3's `extractDateFromFilename()` sources `ngay_do_kiem` for F1.3 — never from cell content. This is doubly load-bearing for the TCT lane, which has no date field of any kind (§2.4). A missing or unparseable file name is a hard parse error, not a fallback to "today" or to any cell value.

## 4. Required-Column Parse Guard

Mirroring F1.3's guard on `Số hiệu bưu gửi`: the HUE parser must hard-fail if `Số hiệu bưu gửi` (column 14) is not found in the header row. The TCT parser must hard-fail if the positional layout in §2.1 does not match (wrong row count, missing grand-total row, or a header that does not contain the expected group labels).

## 5. Target Tables (Proposed, Not Yet Created)

- `fact_f41` — additive, HUE row-level, §0 system fields + §1.1 columns, `UNIQUE(ngay_do_kiem, ma_bg)`. Never receives a TCT aggregate row.
- `fact_f41_national` — additive, TCT aggregate, §0 system fields + §2.2 columns, `UNIQUE(ngay_do_kiem, ma_don_vi)`. Never receives a HUE row.

Neither table exists yet. Creating them is Phase 1 (`fact_f41`) and Phase 2 (`fact_f41_national`) of the F4.1 module plan — not authorized by this Phase 0 package.
