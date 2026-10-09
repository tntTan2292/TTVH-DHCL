---
title: Data Blueprint
purpose: Hợp đồng dữ liệu cho hai luồng nguồn F1.1 (HUE hàng-bưu-gửi, TCT tổng hợp theo cặp tỉnh)
owner: Data Architect
ssot: True
dependencies: core_knowledge.md
version: 1.0.0
---

# Data Blueprint

Source evidence: read-only audits in `docs/06_REVIEWS/Shared/F11-MODULE-PLAN_CHECKPOINT_001.md` Sections 5-9, 24, 25. Reference file: `Data DKCL/F1.1-2026.10.07.xlsx` (SHA-256 `11aa01689b6743e23f4f7b9c662ad0a11fdfeae7edfd3b0e16257561ef573d8c`).

## 0. System Fields (`fact_f11`, shared pattern with `fact_f13`/`fact_f41`)

| Field | Rule |
| --- | --- |
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` |
| `ngay_do_kiem` | `DATE NOT NULL`, **only** from the file name `F1.1-YYYY.MM.DD.xlsx`, never from cell content |
| `import_log_id` | FK to `import_log(id)` |
| `created_at` | `DATETIME DEFAULT CURRENT_TIMESTAMP` |
| Constraint | `UNIQUE(ngay_do_kiem, ma_bg)` |

## 1. HUE detail — layout

One sheet `Worksheet`, header on row 1, no merged cells, no title or total row. One row per `Số hiệu bưu gửi` (2 621 rows, 0 duplicates in the reference file). Parsed **by header name**: the 52 base headers are required (hard error naming the missing header); the 3 newer headers are optional (stored `NULL` when absent). `Số hiệu bưu gửi` is the row-identity guard. Portal schema drift is real (older exports have 52 columns, the 2026-10-07 export has 55).

### 1.1 Column map (source header → `fact_f11` column)

| # | Source header | Column | Type | Note |
| ---: | --- | --- | --- | --- |
| 1 | STT | `stt` | INTEGER | |
| 2 | Số hiệu bưu gửi | `ma_bg` | TEXT NOT NULL | identity |
| 3 | Số hiệu lô | `so_hieu_lo` | TEXT | always empty so far |
| 4 | Mã tỉnh chấp nhận | `ma_tinh_chap_nhan` | TEXT | `53` in every row |
| 5 | Tên tỉnh chấp nhận | `ten_tinh_chap_nhan` | TEXT | |
| 6 | Địa bàn chấp nhận | `dia_ban_chap_nhan` | TEXT | always empty so far |
| 7 | Mã BC chấp nhận | `ma_bc_chap_nhan` | TEXT | accepting office (pair table row) |
| 8 | Tên BC chấp nhận | `ten_bc_chap_nhan` | TEXT | |
| 9 | Loại BC chấp nhận | `loai_bc_chap_nhan` | TEXT | |
| 10 | Mã BCKT chấp nhận | `ma_bckt_chap_nhan` | TEXT | `-1` = unknown |
| 11 | Tên BCKT chấp nhận | `ten_bckt_chap_nhan` | TEXT | |
| 12 | Mã tỉnh phát | `ma_tinh_phat` | TEXT | |
| 13 | Tên tỉnh phát | `ten_tinh_phat` | TEXT | |
| 14 | Địa bàn phát | `dia_ban_phat` | TEXT | always empty so far |
| 15 | Mã BC phát | `ma_bc_phat` | TEXT | delivering unit (ranking key) |
| 16 | Tên BC phát | `ten_bc_phat` | TEXT | |
| 17 | Loại BC phát | `loai_bc_phat` | TEXT | PH1 / PH2 / GD3 |
| 18 | Mã BCKT phát | `ma_bckt_phat` | TEXT | |
| 19 | Tên BCKT phát | `ten_bckt_phat` | TEXT | |
| 20 | Mã tuyến phát | `ma_tuyen_phat` | TEXT | |
| 21 | Tên tuyến phát | `ten_tuyen_phat` | TEXT | |
| 22 | Loại tuyến phát | `loai_tuyen_phat` | TEXT | |
| 23 | Loại bưu gửi | `loai_buu_gui` | TEXT | |
| 24 | Dịch vụ | `dich_vu` | TEXT | |
| 25 | Loại DV | `loai_dv` | TEXT | COD / KCOD |
| 26 | Nhóm SPDV | `nhom_spdv` | TEXT | |
| 27 | Mã SPDV | `ma_spdv` | TEXT | |
| 28 | Khối lượng thực tế | `khoi_luong_thuc_te` | REAL | |
| 29 | Khối lượng quy đổi | `khoi_luong_quy_doi` | TEXT | e.g. `<=2kg` |
| 30 | Mã KHL | `ma_khl` | TEXT | |
| 31 | Tên KHL | `ten_khl` | TEXT | |
| 32 | Nhóm khách hàng | `nhom_khach_hang` | TEXT | always empty so far |
| 33 | Số hiệu BD8 Đóng Đi tại BC Chấp nhận | `so_hieu_bd8_dong_di_bc_chap_nhan` | TEXT | |
| 34 | Thời gian BD8 Đóng Đi tại BC Chấp nhận | `thoi_gian_bd8_dong_di_bc_chap_nhan` | TEXT | |
| 35 | Số hiệu BD8 XNĐ tại BCKTT | `so_hieu_bd8_xnd_bcktt` | TEXT | 29 % filled |
| 36 | Thời gian BD8 XNĐ tại BCKTT | `thoi_gian_bd8_xnd_bcktt` | TEXT | |
| 37 | Số hiệu BD10 XNĐ tại BCKT phát | `so_hieu_bd10_xnd_bckt_phat` | TEXT | |
| 38 | Thời gian BD10 XNĐ tại BCKT phát | `thoi_gian_bd10_xnd_bckt_phat` | TEXT | always empty so far |
| 39 | Thời gian phát đến BCP | `thoi_gian_phat_den_bcp` | TEXT | |
| 40 | Thời gian nhận tin thu gom | `thoi_gian_nhan_tin_thu_gom` | TEXT | clock start when present |
| 41 | Thời gian chấp nhận | `thoi_gian_chap_nhan` | TEXT | clock start otherwise |
| 42 | Thời gian PTC | `thoi_gian_ptc` | TEXT | clock end |
| 43 | Thời gian nộp tiền COD | `thoi_gian_nop_tien_cod` | TEXT | clock end for COD |
| 44 | Thời gian thực tế | `thoi_gian_thuc_te` | TEXT | raw `H:MM`, hours unbounded; never recomputed |
| 45 | Đánh giá 2025 | `danh_gia_2025` | TEXT | ≤ 24 h; stored, not the metric |
| 46 | Thời gian chỉ tiêu 2026 | `thoi_gian_chi_tieu_2026` | INTEGER | hours: 12 / 15 / 24 / 27 |
| 47 | **Đánh giá 2026** | **`danh_gia_2026`** | TEXT | **the metric** (`Đạt` / `Không đạt` / blank) |
| 48 | Nội dung lý do | `noi_dung_ly_do` | TEXT | always empty so far |
| 49 | Mã Phường Xã Chấp Nhận | `ma_phuong_xa_chap_nhan` | TEXT | |
| 50 | Tên Phường Xã Chấp Nhận | `ten_phuong_xa_chap_nhan` | TEXT | |
| 51 | Mã Phường Xã Phát | `ma_phuong_xa_phat` | TEXT | |
| 52 | Tên Phường Xã Phát | `ten_phuong_xa_phat` | TEXT | |
| 53 *(optional)* | Số BD10 Đóng đi tại KTTỉnh | `so_bd10_dong_di_kttinh` | TEXT | |
| 54 *(optional)* | Thời gian BD10 Đóng đi tại KTTỉnh | `thoi_gian_bd10_dong_di_kttinh` | TEXT | ISO `yyyy-MM-dd HH:mm:ss.SSS` |
| 55 *(optional)* | Thời gian BD10 Quét Lên TMS tại KTTỉnh | `thoi_gian_bd10_quet_len_tms_kttinh` | TEXT | ISO, as above |

### 1.2 Value formats

- Business timestamps: text `dd/MM/yyyy HH:mm:ss` (as `fact_f13`), stored as received. Columns 54 and 55 use the ISO form; a shared reader normalises both when a query compares them.
- All code/identifier columns arrive as numbers in the workbook and are stored as TEXT (`53`, `533140`, `-1`); a code is never numeric.
- Empty cells become `NULL`.

### 1.3 Indices (measured in Phase 1)

`(ngay_do_kiem)`, `(ngay_do_kiem, ma_bc_phat, danh_gia_2026)`, `(ma_bc_phat, ngay_do_kiem)`, `(ngay_do_kiem, ma_bc_chap_nhan, ma_bc_phat, danh_gia_2026)` for the pair table.

## 2. TCT national — layout and table (Phase 4)

Audited in Checkpoint Section 25 (file `…_noi_tinh(1).xlsx`, SHA-256 `88b47ac16baeaad2ba9c8bc08f2d9396a16c4747b8cd7baddf2d8e600e1499d0`). 93 rows × 29 columns: 3 header rows (50 merged ranges), a column-number legend row, the **grand-total row first** (skipped on ingest), then 89 body rows. Grain = (`Mã tỉnh chấp nhận` × `Mã tỉnh phát`); the BC and KHL columns are empty. Codes are text (`"01"`, `"53"`).

Target `fact_f11_national`: system fields as §0 plus `ma_tinh_chap_nhan`, `ten_tinh_chap_nhan`, `ma_tinh_phat`, `ten_tinh_phat` and the 18 count measures as INTEGER; `UNIQUE(ngay_do_kiem, ma_tinh_chap_nhan, ma_tinh_phat)`. Completeness rule (as F4.1): the **34 frozen ranked province codes** (`NATIONAL_RANKED_PROVINCE_CODES`) must all be present as same-province rows; row count is not checked. Percentage text columns are stored raw and never used. The date window of the reference file is unconfirmed (Q-15) — it is not imported until confirmed.

## 3. Analysis date

`ngay_do_kiem` from the file name only (both lanes). A parcel may re-appear on a later date, which the key allows.
