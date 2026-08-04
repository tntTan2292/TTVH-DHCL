# F13 DATABASE & PRODUCT OPPORTUNITY AUDIT — CHECKPOINT 001

Ticket: `F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT-PLAN`
Type: Read-only audit (no schema, data, or product-code change)
Audit date: `2026-08-04`
Database audited: `backend/src/db/database.sqlite` (SQLite, 555,933,696 bytes), opened `OPEN_READONLY`
Data scope for all analytics below: `ngay_do_kiem BETWEEN '2026-01-01' AND '2026-08-03' AND ten_bcvh <> 'BCVH TEST'`

All SQL evidence in this document is aggregate or anonymized. No shipment identifier (`ma_bg`, `so_hieu_bd8`, `so_hieu_bd10`), no customer name (`ten_khl`), and no personal data is reproduced. Customer concentration is reported as counts and shares only.

## Table of Contents

- [1. Executive Summary](#1-executive-summary)
- [2. Database Inventory](#2-database-inventory)
- [3. Date Coverage And Usable History](#3-date-coverage-and-usable-history)
- [4. Dimensions And Relationships](#4-dimensions-and-relationships)
- [5. Data Quality Findings](#5-data-quality-findings)
- [6. Sensitive Fields](#6-sensitive-fields)
- [7. API Capability Inventory](#7-api-capability-inventory)
- [8. F1.3 Surface Coverage Map](#8-f13-surface-coverage-map)
- [9. Surface-By-Surface Assessment And Recommendation](#9-surface-by-surface-assessment-and-recommendation)
- [10. Analytic Findings That Create Product Opportunity](#10-analytic-findings-that-create-product-opportunity)
- [11. Product Opportunity Matrix](#11-product-opportunity-matrix)
- [12. Quick Wins vs Functions Requiring New Data](#12-quick-wins-vs-functions-requiring-new-data)
- [13. Recommended Implementation Sequence](#13-recommended-implementation-sequence)
- [14. Missing Data Register](#14-missing-data-register)
- [15. Audit Limitations](#15-audit-limitations)
- [16. Product Owner Review Outcome](#16-product-owner-review-outcome--2026-08-04-closure)

## 1. Executive Summary

The database is far richer than what the product currently exposes. The system stores 45 columns per shipment across 663,130 rows and 215 days, but the live F1.3 surfaces consume only a small fraction of that: essentially date, BCVH, route, and a binary pass/fail result.

Five conclusions drive every recommendation in this document:

1. **The single most valuable unused field is time.** `thoi_gian_bckt_tinh_xnd_bd8` → `thoi_gian_ptc` handover latency averages `10.97h` on passing shipments and `47.68h` on failing shipments — a 4.3x separation on 595,046 parseable rows. This is the strongest explanatory variable in the database and nothing in the product surfaces it.
2. **Failure is highly concentrated and therefore actionable.** 10 customer accounts carry `78,091` of `208,121` total failures (37.5%). 46 routes fail on 20+ of the last 60 days. Concentration this high means a small, targeted intervention list beats any broad dashboard.
3. **Three of seven F1.3 surfaces are non-functional placeholders** (Pareto/RCA, Evidence, Message Center). Backend endpoints for all three are implemented by static inspection; runtime behavior has not been verified. This is the cheapest value in the repository.
4. **The geography dimension is completely unused.** `ma_huyen`/`ma_phuong_xa_phat` are populated at 99.6%+ and reveal a 6x spread between best and worst communes. No screen exposes anything below route level.
5. **Data quality is good but not clean.** Four corrupt rows dated `2098-02`, a triplicated KPI threshold table, and a duration column stored as TEXT are real defects that will distort any new analytic built on top of them. *(Revised 2026-08-04: this point originally also claimed 12,688 excess duplicate rows. That claim was false and is retracted — see 5.7.)*

The system does not need the Product Owner to invent business problems. The data already names them.

## 2. Database Inventory

The entire product runs on 5 tables. There are no views, no user table in this database, and no dimension tables.

| Object | Type | Rows | Role |
| --- | --- | --- | --- |
| `fact_f13` | table | 663,130 | Shipment-level F1.3 fact table (province 53). Sole source for all F1.3 analytics. |
| `fact_f13_national` | table | 6,766 | Pre-aggregated daily province-level national comparison (34 provinces). |
| `import_log` | table | 434 | Import audit trail. |
| `sys_kpi_thresholds` | table | 12 | KPI colour banding. |
| `system_config` | table | 3 | Default province and feature flag. |

Indexes present: `idx_f13_date_bcvh_covering`, `idx_f13_date_tuyen_covering`, `idx_ngay_do_kiem`, `idx_bcvh_ngay` on `fact_f13`; `idx_f13_nat_ngay`, `idx_f13_nat_tinh_ngay` on `fact_f13_national`.

Index coverage note: every existing index leads with date, and both covering indexes serve the BCVH and route grouping paths. Analytics that group by district, commune, customer, service, or hour-of-day have **no supporting index**. Observed timings on the audit queries were still acceptable (329–935ms for full-history aggregate scans), so this is a scale risk to note rather than a blocker at current volume.

### 2.1 `fact_f13` Field Inventory (45 columns)

Null percentages measured over all 663,130 rows.

| # | Field | Type | Null % | Distinct | Audit note |
| --- | --- | --- | --- | --- | --- |
| 0 | `id` | INTEGER PK | 0.0 | 663,130 | Surrogate key. |
| 1 | `ngay_do_kiem` | DATE NN | 0.0 | 215 | Evaluation date. Grain anchor. |
| 2 | `import_log_id` | INTEGER | 0.0 | 215 | FK → `import_log.id`. |
| 3 | `created_at` | DATETIME | 0.0 | 225 | Ingest timestamp. |
| 4 | `stt` | INTEGER | 0.0 | 5,279 | Source row number. No analytic value. |
| 5 | `ma_bg` | TEXT NN | 0.0 | 650,442 | **Shipment ID — sensitive.** |
| 6 | `ma_tinh_phat` | TEXT | 0.0 | 1 | Constant `53`. No analytic value locally. |
| 7 | `ten_tinh_phat` | TEXT | 0.0 | 1 | Constant. |
| 8 | `dia_ban_phat` | TEXT | **100.0** | 0 | **Entirely empty — dead column.** |
| 9 | `ma_bckt_tinh_phat` | TEXT | 0.0 | 27 | Acceptance office code. **Unused by product.** |
| 10 | `ten_bckt_tinh_phat` | TEXT | 0.0 | 27 | Acceptance office name. **Unused.** |
| 11 | `ma_bcvh` | TEXT NN | 0.0 | 9 | BCVH code. Used. |
| 12 | `ten_bcvh` | TEXT NN | 0.0 | 10 | BCVH name. **10 names vs 9 codes — collision, see 5.3.** |
| 13 | `loai_bc_phat` | TEXT | 0.0 | 2 | Office type. Unused. |
| 14 | `loai_bg` | TEXT | **100.0** | 0 | **Entirely empty — dead column.** |
| 15 | `dich_vu` | TEXT | 0.0 | 4 | Service (EMS / Parcel / Registered / KT1). **Unused.** |
| 16 | `loai_dv` | TEXT | 0.0 | 2 | COD / KCOD. **Unused.** |
| 17 | `nhom_spdv` | TEXT | 3.3 | 5 | Product group (TMĐT / Truyền thống / HCC / KT1). **Unused.** |
| 18 | `ma_spdv` | TEXT | 0.0 | 36 | Product code. Unused. |
| 19 | `so_hieu_lo` | TEXT | **100.0** | 0 | **Entirely empty — dead column.** |
| 20 | `so_tien_cod` | REAL | **100.0** | 0 | **Entirely empty — COD amount never populated. See 14.** |
| 21 | `khoi_luong_thuc_te` | REAL | 0.0 | 9,004 | Actual weight. **Stored in grams, see 5.6.** Unused. |
| 22 | `khoi_luong_quy_doi` | REAL | 0.0 | 8 | Converted weight. Stored as text. Low value. |
| 23 | `ten_khl` | TEXT | 16.3 | 28,123 | **Customer name — sensitive.** |
| 24 | `nhom_khach_hang` | TEXT | 0.0 | 27,305 | Customer group. Cardinality suggests it is near-identity, not a true group. |
| 25 | `ma_tuyen` | TEXT | 0.0 | 154 | Route code. Used. |
| 26 | `ten_tuyen` | TEXT | 0.0 | 149 | Route name. Used. |
| 27 | `loai_tuyen_phat` | TEXT | 0.0 | 13 | **Route type — high analytic value, unused. See 10.4.** |
| 28 | `so_hieu_bd8` | TEXT | 0.0 | 245,183 | **Document ID — sensitive.** |
| 29 | `thoi_gian_bckt_tinh_xnd_bd8` | DATETIME | 6.6 | 244,529 | **Origin handover time — highest-value unused field.** |
| 30 | `so_hieu_bd10` | TEXT | 0.0 | 7,163 | **Document ID — sensitive.** |
| 31 | `thoi_gian_bd10_xnd_kttp` | DATETIME | 30.6 | 6,204 | Confirmation time. Coverage too thin to rely on. |
| 32 | `thoi_gian_bd10_quet_tms` | DATETIME | 0.0 | 3,568 | TMS scan time. Fully populated. |
| 33 | `thoi_gian_ptc` | DATETIME | 3.9 | 457,592 | Delivery time. **Used only as existence check.** |
| 34 | `thoi_gian_nop_tien` | DATETIME | 67.9 | 29,368 | Cash settlement time. Used for delayed-cash. |
| 35 | `thoi_gian_thuc_hien_thuc_te_gio` | REAL | 3.9 | 14,099 | Actual duration hours. **Stored as TEXT, see 5.5.** |
| 36 | `ket_qua_f13` | TEXT | 3.9 | 2 | Pass/fail result. Primary KPI. |
| 37 | `danh_gia_2026` | TEXT | 3.9 | 2 | 2026 evaluation. **Disagrees with `ket_qua_f13` on 31,103 rows, see 5.4.** |
| 38 | `thoi_gian_chi_tieu` | TEXT | 0.1 | 5 | SLA target hours (12/13/14/15/17). **Unused.** |
| 39 | `ma_huyen` | TEXT | 0.0 | 8 | District code. **Unused.** |
| 40 | `ten_huyen` | TEXT | 0.0 | 8 | District name. **Unused.** |
| 41 | `ma_phuong_xa_chap_nhan` | TEXT | 0.0 | 2,749 | Acceptance commune. Unused. |
| 42 | `ten_phuong_xa_chap_nhan` | TEXT | 0.0 | 2,479 | Acceptance commune name. Unused. |
| 43 | `ma_phuong_xa_phat` | TEXT | 0.0 | 399 | **Delivery commune — unused, high value. See 10.5.** |
| 44 | `ten_phuong_xa_phat` | TEXT | 0.4 | 380 | Delivery commune name. Unused. |

Four columns (`dia_ban_phat`, `loai_bg`, `so_hieu_lo`, `so_tien_cod`) are 100% NULL across the entire table. They occupy schema space and mislead any reader assuming COD amounts are available.

### 2.2 `fact_f13_national` Field Inventory (19 columns)

Pre-aggregated, one row per province per day. Fields: `ngay_do_kiem`, `ma_tinh_phat`, `ten_tinh_phat`, `sl_bg_ptc`, `sl_ptc_nop_tien`, `sl_bg_bd10`, `sl_ptc_dung_qd_14h`, `tl_ptc_dung_qd_14h`, `sl_qua_qd_14h`, `sl_ptc_dung_qd_ct`, `tl_ptc_dung_qd_ct`, `sl_qua_qd_ct`, `tl_qua_qd_ct`, `sl_chua_du_tt`, `sl_loai_tru`, `sl_phat_ktc`, `sl_ptc_kxd`, `created_at`.

This table is complete, clean, and materially under-used — it is the only benchmark data in the system and supports competitive positioning that no current screen shows.

## 3. Date Coverage And Usable History

```sql
SELECT MIN(ngay_do_kiem), MAX(ngay_do_kiem), COUNT(DISTINCT ngay_do_kiem), COUNT(*) FROM fact_f13;
-- min=2026-01-01  max=2098-02-18  days=215  rows=663130
```

| Month | Days present | Rows | Note |
| --- | --- | --- | --- |
| 2026-01 | 31 | 102,613 | Complete |
| 2026-02 | 26 | 64,496 | Complete (Feb has 28 days; 2 days absent) |
| 2026-03 | 31 | 102,965 | Complete |
| 2026-04 | 30 | 94,857 | Complete |
| 2026-05 | 31 | 89,001 | Complete |
| 2026-06 | 30 | 93,141 | Complete |
| 2026-07 | 31 | 106,813 | Complete |
| 2026-08 | 3 | 9,240 | Partial (to 2026-08-03) |
| 2098-02 | 2 | 4 | **Corrupt — see 5.1** |

**Usable history: 2026-01-01 to 2026-08-03, 213 real days, effectively unbroken.** This is enough for month-over-month comparison, day-of-week seasonality, 30/60/90-day rolling baselines, and trend detection. It is **not** enough for year-over-year comparison or for any function that depends on 2025 data.

National table: `2026-01-01` to `2026-08-03`, 199 days, 34 provinces, 6,766 rows. January (21 days) and February (22 days) are thinner than local data, so national comparison should be presented monthly rather than daily for those two months.

Cross-check: every date present in the national table is also present in the local table (`days_in_national_missing_local = 0`). The two tables are aligned and joinable on `ngay_do_kiem`.

## 4. Dimensions And Relationships

### 4.1 Relationship Map

There are no declared foreign keys. Relationships are by convention:

- `fact_f13.import_log_id` → `import_log.id` (many-to-one, 215 distinct values against 434 log rows — see 5.2)
- `fact_f13.ngay_do_kiem` ↔ `fact_f13_national.ngay_do_kiem` (joinable; province 53 is the local province)
- `fact_f13.ma_bcvh` → `fact_f13.ma_huyen` is effectively 1:1 (each BCVH maps to one district)
- `fact_f13.ma_tuyen` → `fact_f13.ma_bcvh` is many-to-one (154 routes across 9 BCVH)
- `sys_kpi_thresholds` and `system_config` are standalone lookup tables with no key relationship to the fact table

### 4.2 BCVH Dimension

```sql
SELECT ma_bcvh, ten_bcvh, COUNT(*) rows, COUNT(DISTINCT ngay_do_kiem) days, COUNT(DISTINCT ma_tuyen) routes
FROM fact_f13 GROUP BY 1,2 ORDER BY rows DESC;
```

| `ma_bcvh` | `ten_bcvh` | Rows | Days | Routes |
| --- | --- | --- | --- | --- |
| 533140 | BCVH Thuận Hóa | 331,537 | 211 | 48 |
| 536250 | BCVH Hương Thủy | 110,860 | 209 | 30 |
| 535470 | BCVH Hương Trà | 94,275 | 207 | 25 |
| 537220 | BCVH Phú Lộc | 62,859 | 210 | 24 |
| 537015 | BCVH Thuận An | 43,374 | 209 | 11 |
| 535790 | BCVH A Lưới | 19,457 | 210 | 14 |
| 531600 | Trần Hưng Đạo | 738 | 113 | 2 |
| 531110 | Trung tâm Hành chính công | 16 | 12 | 1 |
| 531120 | Khách hàng lớn | 10 | 9 | 3 |
| 533140 | **BCVH TEST** | 4 | 2 | 0 |

Six BCVH carry 99.8% of volume. The bottom four are structurally negligible and will produce unstable percentages in any ranking — a minimum-volume guard is required for any new ranking function.

### 4.3 District Dimension

8 districts, aligned 1:1 with the top 8 BCVH, spanning 399 delivery communes. `ten_huyen` duplicates the BCVH name rather than carrying a true district name, so the district dimension adds no grouping power beyond BCVH — but the **commune** dimension beneath it does (see 10.5).

### 4.4 Service Dimension

`dich_vu` (4) × `loai_dv` (2) × `nhom_spdv` (5) yields 23 populated combinations. The three largest: EMS/KCOD/Truyền thống (157,342), Parcel/COD/TMĐT (136,832), EMS/COD/TMĐT (115,460). This is a fully populated, entirely unused analytic dimension.

## 5. Data Quality Findings

### 5.1 Corrupt future dates (`DQ-01`, severity: low volume / high credibility risk)

```sql
SELECT ngay_do_kiem, COUNT(*) FROM fact_f13 WHERE ngay_do_kiem > '2026-08-04' OR ngay_do_kiem < '2026-01-01' GROUP BY 1;
-- 2098-02-16 → 2 rows ; 2098-02-18 → 2 rows
```

Four rows dated 72 years in the future. These are the same 4 rows that appear as NULL across most dimension columns (`ma_tinh_phat`, `ma_tuyen`, `ma_huyen` all show exactly 4 nulls) and correspond to the `BCVH TEST` records. They are test artifacts that reached the operational database. Impact: they inflate `MAX(ngay_do_kiem)`, so any "latest date" logic that trusts `MAX()` will resolve to `2098-02-18` and return an empty screen.

### 5.2 Re-imported dates (`DQ-02`, severity: medium)

```sql
SELECT COUNT(*) FROM (SELECT ngay_do_kiem, COUNT(*) n FROM import_log GROUP BY 1 HAVING n > 1);
-- 198 dates imported more than once
```

434 import runs cover only 215 distinct dates; 198 dates were imported more than once. All 434 runs report `status = SUCCESS`, total 696,071 records against 663,130 stored rows — a 32,941 record difference. Re-import handling appears to partially replace rather than cleanly supersede.

### 5.3 BCVH code/name collision (`DQ-03`, severity: medium)

`ma_bcvh = 533140` maps to two names: `BCVH Thuận Hóa` (331,537 rows) and `BCVH TEST` (4 rows). Any `GROUP BY ma_bcvh` and any `GROUP BY ten_bcvh` produce different row counts. The 10-names-vs-9-codes discrepancy in the field inventory is entirely this collision.

### 5.4 Result field disagreement (`DQ-04`, severity: high — business meaning)

```sql
SELECT COUNT(*) FROM fact_f13
WHERE ket_qua_f13 IS NOT NULL AND danh_gia_2026 IS NOT NULL AND ket_qua_f13 <> danh_gia_2026;
-- 31,103 rows
```

Two result columns disagree on 31,103 rows (4.9% of evaluated rows). Overall: `ket_qua_f13` = 61.05% Đạt; `danh_gia_2026` = 56.35% Đạt — a 4.7 percentage point gap.

**RESOLVED BY PRODUCT OWNER, 2026-08-04 (final):** `danh_gia_2026` is the authoritative F1.3 result field. `ket_qua_f13` is a technical/reference field only until separately documented. Production KPI logic must not be switched to `ket_qua_f13`. `MD-01` is closed and must not be reopened as an unresolved decision.

Consequence for this document: the analytics in Section 10 were computed on `ket_qua_f13`, which was the only basis available at audit time. Their **direction and structure remain valid** — the two fields agree on 95.1% of rows — but any figure carried into a production surface must be recomputed on `danh_gia_2026`. The authoritative province-level baseline is `58.6233%` Đạt across 637,445 evaluated 2026 rows (`danh_gia_2026`), versus the `ket_qua_f13` figure of 61.05% quoted elsewhere in Section 5. Recomputation is an implementation obligation of any follow-up ticket, not a correction to this audit's findings.

### 5.5 Duration stored as TEXT (`DQ-05`, severity: high — silent wrong answers)

```sql
SELECT typeof(thoi_gian_thuc_hien_thuc_te_gio), COUNT(*) FROM fact_f13 GROUP BY 1;
-- text → 637,530 ; null → 25,596
```

The column is declared `REAL` but stored as TEXT (SQLite applies dynamic typing). Consequence: `MIN()` and `MAX()` sort lexicographically and return `-10` and `9` — silently wrong. With `CAST(... AS REAL)` the true values are `min=-89, avg=20.54, max=2637, negative=1566, >720h=119`. Any existing or future aggregate over this column without an explicit CAST returns a wrong answer with no error.

1,566 rows carry a negative duration, which is physically impossible and indicates source-side timestamp inversion.

### 5.6 Weight unit ambiguity (`DQ-06`, severity: medium)

`khoi_luong_thuc_te` averages `3,325.87` with a maximum of `282,000`. Interpreted as kilograms these are absurd; interpreted as grams they are correct for postal items (avg 3.3kg, max 282kg). The column name says "khối lượng" without a unit. Confirmed grams by distribution: 365,539 rows ≤1000 and 297,477 rows >1000.

### 5.7 Duplicate shipment IDs (`DQ-07`) — **RETRACTED 2026-08-04**

**This finding is withdrawn. The original query used an invalid key definition and the claim of 12,688 excess duplicate rows is false.**

The original audit query grouped by `ma_bg` alone:

```sql
SELECT COUNT(*) dup_groups, SUM(n)-COUNT(*) excess FROM (SELECT ma_bg, COUNT(*) n FROM fact_f13 GROUP BY 1 HAVING n>1);
-- dup_groups=9348  excess_rows=12688
```

`ma_bg` alone is not the business key. The actual key is declared in the table DDL:

```
UNIQUE(ngay_do_kiem, ma_bg)
```

confirmed present and enforced as `sqlite_autoindex_fact_f13_1` (`unique=1, origin=u`) via `pragma_index_list('fact_f13')`. It matches the import logic, which comments `INSERT OR IGNORE skips rows violating UNIQUE(ngay_do_kiem, ma_bg)` (`backend/src/services/importProcessor.js`).

Revalidation against the real key:

```sql
-- K2: actual import key
SELECT COUNT(*) dup_groups FROM (SELECT ngay_do_kiem, ma_bg, COUNT(*) n FROM fact_f13 GROUP BY 1,2 HAVING n>1);
-- dup_groups = 0

-- K5: exact full-row duplicates (same date, bg, bcvh, route, ptc, both result fields, both doc numbers)
-- groups = 0

-- K6: same-date same-shipment groups with differing content
-- same_date_dup_groups = 0
```

**Zero duplicates on the business key. Zero exact full-row duplicates.** The database physically cannot hold them — the UNIQUE constraint prevents it.

What the 9,348 repeated `ma_bg` values actually are: shipments evaluated on more than one date.

```sql
-- K4: dates per shipment
-- 1 date  → 641,094 shipments
-- 2 dates →   6,008 shipments
-- 3 dates →   3,340 shipments
```

These are exactly the *legitimate multiple operational/status records belonging to the same shipment* that the Product Owner distinguished. A shipment still in progress on consecutive evaluation days appears once per day by design. Counting them as duplicates was the error.

Comparison with the import rule: the pipeline deletes a whole date and re-inserts it (`DELETE FROM fact_f13 WHERE ngay_do_kiem = ?` then batch `INSERT OR IGNORE`), so the replacement unit is the evaluation date and the row-level guard is `(ngay_do_kiem, ma_bg)`. Both are consistent with the Product Owner's overwrite/upsert rule, and the observed data conforms to it with zero violations.

**Conclusion: no defect exists. No deduplication work is warranted. `DQ-07` is retracted and excluded from the defect count.**

### 5.8 Triplicated KPI thresholds (`DQ-08`, severity: low)

`sys_kpi_thresholds` holds 12 rows that are exactly 3 identical copies of a 4-band scale (ids 1–4, 5–8, 9–12; Xanh ≥70, Hồng 60–69.99, Vàng 50–59.99, Đỏ <50). Any lookup not constrained to a single copy returns 3 matching rows. If the intent was per-KPI thresholds, the discriminating column is missing.

### 5.9 Data quality summary

| ID | Finding | Rows affected | Severity |
| --- | --- | --- | --- |
| DQ-01 | Corrupt `2098-02` dates / test rows in operational DB | 4 | Low volume, high risk |
| DQ-02 | 198 dates re-imported; 32,941 record reconciliation gap | 198 dates | Medium |
| DQ-03 | `ma_bcvh` 533140 maps to two names | 4 | Medium |
| DQ-04 | `ket_qua_f13` vs `danh_gia_2026` disagree | 31,103 | **Resolved by PO** — `danh_gia_2026` is authoritative |
| DQ-05 | Duration stored as TEXT; MIN/MAX silently wrong; 1,566 negative | 637,530 | High |
| DQ-06 | Weight unit undocumented (grams) | 663,126 | Medium |
| DQ-07 | ~~Duplicate `ma_bg`~~ | **0** | **RETRACTED** — invalid key; zero duplicates on `UNIQUE(ngay_do_kiem, ma_bg)` |
| DQ-08 | KPI thresholds triplicated | 12 | Low |

State **at initial audit execution, before the 2098 cleanup**: six open (`DQ-01`, `DQ-02`, `DQ-03`, `DQ-05`, `DQ-06`, `DQ-08`), with `DQ-04` resolved by Product Owner decision and `DQ-07` retracted as a false finding.

**Current state after `F13-DATA-2098-CLEANUP-IMPL` (authoritative): the confirmed open defect count is FOUR — `DQ-02`, `DQ-05`, `DQ-06`, `DQ-08`.** `DQ-01` is CLOSED by the 2098 cleanup and `DQ-03` is CLOSED because `BCVH TEST` was removed.

## 6. Sensitive Fields

These fields must never be exposed in aggregate reporting, exports, screenshots, or evidence surfaces without an explicit Product Owner access decision:

| Field | Nature | Distinct | Handling recommendation |
| --- | --- | --- | --- |
| `ma_bg` | Shipment identifier | 650,442 | Detail/evidence surfaces only, admin-gated. Never in aggregates. |
| `so_hieu_bd8` | Origin document number | 245,183 | Same as above. |
| `so_hieu_bd10` | Delivery document number | 7,163 | Same as above. |
| `ten_khl` | Customer name (business, may include individuals) | 28,123 | **Personal/commercial data.** Aggregate only; rank by anonymized ID in any new function. |
| `nhom_khach_hang` | Customer group, near-identity cardinality | 27,305 | Treat as identifying, not as a safe grouping key. |
| `ten_phuong_xa_phat` | Delivery commune | 380 | Safe at aggregate level (min 300 rows per group applied in this audit). |
| `so_tien_cod` | COD amount | 0 (empty) | Would be financial data if ever populated. |

The existing `/f13/evidence-list` endpoint is already `adminOnly`, which is the correct posture. Every new function proposed in Section 11 is specified to operate on aggregates so that the sensitive set is not widened.

## 7. API Capability Inventory

Server mounts (`backend/server.js`): `/api/auth`, `/api/f13`, `/api/import`.

### 7.1 `/api/f13` (13 endpoints)

| Endpoint | Access | Backed by | Consumed by a live screen? |
| --- | --- | --- | --- |
| `POST /import/preview` | admin | `importController.preview` | Data Import Center |
| `POST /import/confirm` | admin | `importController.confirm` | Data Import Center |
| `GET /dashboard/kpi` | viewer | `DashboardController.getKpi` | **No** |
| `GET /dashboard/daily-trend` | viewer | `DashboardController.getDailyTrend` | Dashboard |
| `GET /dashboard/quality-timeline` | viewer | `DashboardController.getQualityTimeline` | Dashboard |
| `GET /dashboard/top` | viewer | `kpiController.getDashboardTop` | Dashboard |
| `GET /dashboard/meta` | viewer | `kpiController.getDashboardMeta` | Dashboard, Route Ranking |
| `GET /ranking/bcvh` | viewer | `DashboardController.getBcvh` | BCVH Ranking |
| `GET /ranking/route` | viewer | `DashboardController.getRoute` | Route Ranking |
| `GET /recommendations` | viewer | `kpiController.getRecommendations` | Dashboard |
| `GET /rca/pareto` | **admin** | `DashboardController.getPareto` | **No — screen is a placeholder** |
| `GET /evidence-list` | **admin** | `DashboardController.getEvidence` | Shipment Ranking only |
| `GET /dashboard/message` | **admin** | `kpiController.getDashboardMessage` | **No — screen is a placeholder** |
| `GET /messages` | **admin** | `RecommendationController.getMsgs` | **No — screen is a placeholder** |

### 7.2 `/api/import` (20 endpoints)

Upload/status (3) plus a substantial DKCL portal automation subsystem (17 endpoints covering session preflight, interactive auth, coverage summary, missing-date scanning, and backfill queue management for both the Huế and TCT sources). This subsystem is mature and admin-gated. It is operationally significant but outside the F1.3 reporting surface.

### 7.3 API-layer defect found during audit (`API-01`)

`frontend/src/api/F13DashboardClient.js` builds paths inconsistently. `getDashboardMeta`, `getBcvhRanking`, `getRouteRanking`, and `getEvidenceList` all correctly prefix `/f13`. Two methods do not:

- `getKpi()` → `httpClient.get('/dashboard/kpi', ...)` — missing `/f13`
- `getPareto()` → `httpClient.get('/rca/pareto', ...)` — missing `/f13`

Base URL resolves to `.../api/`, so both would request `/api/dashboard/kpi` and `/api/rca/pareto`, neither of which is mounted. Both would 404. This has not surfaced because neither method is called by any live page — `getKpi` is unused and `getPareto` serves the Pareto screen, which is a placeholder. **This defect will surface the moment the Pareto screen is built** and should be fixed as part of that work.

## 8. F1.3 Surface Coverage Map

Routes registered in `frontend/src/App.jsx` under `/f13`:

| Screen | Route | Implementation | Data/API coverage |
| --- | --- | --- | --- |
| Operation Dashboard | `/f13/dashboard` | `features/dashboard/DashboardPage.jsx` | Real. Trend, timeline, top, meta, recommendations. |
| BCVH Ranking | `/f13/ranking/bcvh` | `features/ranking/BcvhRankingPage.jsx` | Real. `/ranking/bcvh`. |
| Route Ranking | `/f13/ranking/route` | `features/route/RoutePerformancePage.jsx` | Real. `/ranking/route` + `/dashboard/meta`. |
| Shipment Ranking | `/f13/ranking/shipment` | `features/shipment/` (9 components) | **Partial.** Only `getShipmentEvidenceList`, which is an alias of `getEvidenceList`. |
| Pareto / RCA | `/f13/pareto` | `<PlaceholderPage title="Pareto / RCA" />` | **None rendered.** Backend `/rca/pareto` exists and works. |
| Evidence | `/f13/evidence` | `<PlaceholderPage title="Evidence List" />` | **None rendered.** Backend `/evidence-list` exists and works. |
| Message Center | `/f13/message` | `<PlaceholderPage title="Message Center" />` | **None rendered.** Backend `/messages` + `/dashboard/message` exist. |

### 8.1 Orphaned legacy pages

`frontend/src/pages/` contains five F13 page files that are referenced by nothing in the codebase (verified by full-tree grep — the only matches are the files themselves):

| File | Lines | Status |
| --- | --- | --- |
| `pages/F13Dashboard.jsx` | 170 | Orphaned — superseded by `features/dashboard/` |
| `pages/F13BcvhRanking.jsx` | 87 | Orphaned — superseded by `features/ranking/` |
| `pages/F13RouteRanking.jsx` | 16 | Orphaned — superseded by `features/route/` |
| `pages/F13Pareto.jsx` | 11 | Orphaned stub |
| `pages/F13RCA.jsx` | 11 | Orphaned stub |

These are dead code carrying an obsolete second implementation of three live screens. They are a maintenance hazard: a future session searching for "BCVH ranking" will find two implementations and may edit the wrong one.

## 9. Surface-By-Surface Assessment And Recommendation

Recommendation vocabulary as specified: **BUILD** (implement the unfinished surface), **MERGE** (fold into an existing surface rather than keeping it separate), **HIDE** (keep the code, remove from navigation until data supports it), **REMOVE** (delete).

### 9.1 Operation Dashboard — `KEEP / EXTEND`

Functioning, with the richest API backing of any surface (5 endpoints). Assessment: it answers "what is the number" well and "what should I do about it" weakly. It has no access to latency, geography, service mix, or customer concentration. Recommendation: keep as-is structurally and extend with `OPP-01` (Latency Decomposition) and `OPP-06` (National Position) rather than rebuilding.

### 9.2 BCVH Ranking — `KEEP`

Functioning and stable, recently accepted under `F13-SHARED-NAV-FILTERS-IMPL`. Only gap: it ranks on pass rate without a minimum-volume guard, and Section 4.2 shows four BCVH with 10–738 total rows that will produce unstable percentages. Recommendation: keep; add a volume guard when convenient. No new ticket needed on its own.

### 9.3 Route Ranking — `KEEP`

Functioning, with dynamic BCVH metadata as of the last ticket. It is the natural host for `OPP-02` (Chronic Route Watchlist) because the persistence dimension is a property of routes.

### 9.4 Shipment Ranking — `MERGE`

Nine components exist (`ShipmentDrilldown`, `ShipmentRootCause`, `ShipmentTimeline`, `ShipmentImpactOverview`, `ShipmentExecutiveBrief`, `ShipmentRecommendation`, `ShipmentEvidenceSummary`, `ShipmentShellShared`, `ShipmentPerformancePage`) but the page consumes exactly one API method, which is an alias of the evidence endpoint. Evidence: `getShipmentEvidenceList(date, bcvh, route, page, pageSize)` calls `this.getEvidenceList(...)` with identical arguments.

Shipment Ranking and Evidence are therefore the same data, the same required parameters, and the same access level, presented as two separate navigation entries — one built, one a placeholder. Building Evidence separately would produce a second screen showing the same rows.

**Recommendation: MERGE.** Treat Shipment Ranking as the evidence surface and retire the separate Evidence navigation entry. This is a product-structure change and requires Product Owner confirmation before implementation; the technical evidence for the overlap is unambiguous.

### 9.5 Pareto / RCA — `BUILD`

Backend `/rca/pareto` is implemented by static inspection — admin-gated, calling `f13DashboardService.getParetoAnalysis(date, bcvh)` and requiring only `date`. **Runtime behavior has not been verified.** The frontend is `<PlaceholderPage title="Pareto / RCA" />` and the client method has the `/f13` prefix defect (`API-01`).

This is the highest-value-per-effort item in the repository: the backend appears implemented, so the remaining work is frontend plus runtime verification. Section 10 shows the data supports genuine Pareto structure — failure concentrates by customer (top-10 = 37.5%), by route type (12.66% to 63.05% spread), and by commune (12.7% to 77.2% spread).

**Recommendation: BUILD.** Fix `API-01` in the same ticket.

### 9.6 Evidence — `MERGE` (into Shipment Ranking, per 9.4)

The endpoint is implemented by static inspection and is already referenced by Shipment Ranking; runtime behavior has not been verified. Building a standalone Evidence screen duplicates an existing surface. **Recommendation: MERGE into Shipment Ranking; remove the separate `/f13/evidence` navigation entry.** Keep the route registered as a redirect so existing bookmarks and any preserved URL parameters continue to resolve.

### 9.7 Message Center — `HIDE`

Two backend endpoints are implemented by static inspection (`/messages`, `/dashboard/message`), served by `messageGenerationService` and `RecommendationService`; runtime behavior has not been verified. However `RecommendationController.getMsgs` requires both `from_date` and `to_date`, then passes **only `to_date`** to `recommendationService.getMessages(to_date)` — the range is accepted and discarded. The contract and the behaviour disagree.

More fundamentally, a "Message Center" implies generated operational messages with a defined audience, trigger, and lifecycle (read/unread, acknowledged, assigned). None of that state exists in the database — there is no message table, no recipient field, and no acknowledgement field. Building a Message Center on top of a stateless generator produces a screen that regenerates the same text on every load and cannot track whether anyone acted on it.

**Recommendation: HIDE** — remove from navigation until either (a) the Product Owner defines message lifecycle and audience as a business rule, or (b) it is re-scoped as a read-only "Today's Recommendations" panel merged into the Operation Dashboard, which the current stateless backend genuinely supports. Do not REMOVE: the backend logic is reusable under option (b).

### 9.8 Orphaned legacy pages — `REMOVE`

The five files in Section 8.1 are referenced by nothing. **Recommendation: REMOVE.** This is dead-code deletion with zero product behaviour change, verifiable by the same grep. It should be its own small ticket, not bundled with feature work.

### 9.9 Recommendation summary

| Surface | Recommendation | Basis |
| --- | --- | --- |
| Operation Dashboard | KEEP / EXTEND | Functioning; lacks latency and benchmark depth |
| BCVH Ranking | KEEP | Functioning; minor volume-guard gap |
| Route Ranking | KEEP | Functioning; natural host for chronic-route watchlist |
| Shipment Ranking | MERGE | Is already the evidence surface (alias proven) |
| Pareto / RCA | **BUILD** | Backend complete, frontend placeholder, data supports it |
| Evidence | **MERGE** | Duplicate of Shipment Ranking |
| Message Center | **HIDE** | No message lifecycle state exists in DB |
| Legacy `pages/F13*.jsx` | **REMOVE** | Unreferenced dead code |

## 10. Analytic Findings That Create Product Opportunity

Every finding below was measured on the audited database. These are the observations that justify the functions proposed in Section 11.

### 10.1 Handover latency separates pass from fail more sharply than any other field

Timestamps are stored as TEXT in `dd/MM/yyyy HH:mm:ss`, so SQLite date functions do not work natively and require string reassembly. With that applied:

```sql
WITH x AS (
  SELECT (julianday(substr(thoi_gian_ptc,7,4)||'-'||substr(thoi_gian_ptc,4,2)||'-'||substr(thoi_gian_ptc,1,2)||' '||substr(thoi_gian_ptc,12,8))
        - julianday(substr(thoi_gian_bckt_tinh_xnd_bd8,7,4)||'-'||substr(thoi_gian_bckt_tinh_xnd_bd8,4,2)||'-'||substr(thoi_gian_bckt_tinh_xnd_bd8,1,2)||' '||substr(thoi_gian_bckt_tinh_xnd_bd8,12,8))) * 24 h,
    ket_qua_f13 k
  FROM fact_f13 WHERE <clean> AND thoi_gian_bckt_tinh_xnd_bd8 IS NOT NULL AND thoi_gian_ptc IS NOT NULL AND ket_qua_f13 IS NOT NULL)
SELECT COUNT(*) n, SUM(CASE WHEN h IS NULL THEN 1 ELSE 0 END) unparsed,
  ROUND(AVG(h),2) avg_h, ROUND(AVG(CASE WHEN k='Đạt' THEN h END),2) avg_pass,
  ROUND(AVG(CASE WHEN k='Không đạt' THEN h END),2) avg_fail FROM x;
-- n=595046  unparsed=0  avg_h=24.13  avg_pass=10.97  avg_fail=47.68
```

Zero parse failures across 595,046 rows. Passing shipments spend `10.97h` between origin handover and delivery; failing shipments spend `47.68h`. **The product currently exposes none of this.**

Stage completeness confirms the decomposition is buildable:

```sql
-- total=663126  has_bd8=619067  has_tms=663126  has_kttp=460271  has_ptc=637516  full_chain=595046
```

89.7% of rows have a complete BD8 → TMS → PTC chain. `thoi_gian_bd10_xnd_kttp` at 69.4% is the weak link and should be treated as optional in any stage view.

### 10.2 The SLA target itself predicts failure

```sql
SELECT thoi_gian_chi_tieu sla_h, COUNT(*) n,
  ROUND(SUM(CASE WHEN ket_qua_f13='Không đạt' THEN 1 ELSE 0 END)*100.0/COUNT(*),2) fail_pct,
  ROUND(AVG(thoi_gian_thuc_hien_thuc_te_gio),2) avg_actual_h
FROM fact_f13 WHERE <clean> AND ket_qua_f13 IS NOT NULL GROUP BY 1 ORDER BY n DESC;
```

| SLA target (h) | Rows | Fail % | Avg actual (h) |
| --- | --- | --- | --- |
| 12 | 477,124 | 30.89 | 17.12 |
| 14 | 99,004 | **55.13** | 31.61 |
| 17 | 56,621 | **50.33** | 29.03 |
| 15 | 4,696 | 46.55 | 29.49 |
| (null) | 85 | 64.71 | 170.93 |

The counter-intuitive result: the **most generous** SLA bands fail most. Shipments given 14 or 17 hours fail at roughly 50–55%, while the tightest 12-hour band fails at 30.89%. Every band's average actual time exceeds its target. This is a structural signal — the 14h and 17h bands correspond to harder geography or thinner service, and the SLA assignment is not compensating for it.

### 10.3 Delivery duration is a near-perfect threshold, confirming SLA arithmetic

```sql
-- <=12h  : n=379,077  fail 0.03%
-- 12-24h : n=138,800  fail 81.36%
-- 24-48h : n=64,810   fail 100%
-- 2-5d   : n=42,247   fail 100%
-- >5d    : n=12,596   fail 100%
```

Beyond 24 hours, failure is certain. This validates that `ket_qua_f13` is a deterministic function of elapsed time against target, which in turn means **latency is not merely correlated with failure — it is the mechanism.** Any function that reduces latency reduces failure directly. Note this query requires `CAST(... AS REAL)` per DQ-05.

### 10.4 Route type spreads failure 5x

```sql
-- Tuyến phát lưu tại bưu cục                    n=2,490    fail 63.05%
-- Tuyến phát xã (01 lần/ngày)                   n=258,749  fail 47.76%
-- Tuyến phát xã (02 lần/ngày)                   n=39,838   fail 45.57%
-- Tuyến phát thời vụ                            n=21,504   fail 42.38%
-- Tuyến phát Khu công nghiệp                    n=4,243    fail 33.25%
-- Tuyến phát TT quận/huyện (01 lần/ngày)        n=3,924    fail 33.03%
-- Tuyến phát TT tỉnh/thành phố (02 lần/ngày)    n=278,356  fail 26.24%
-- Tuyến phát TT quận/huyện (02 lần/ngày)        n=8,742    fail 23.36%
-- Tuyến phát xã TT tỉnh/thành phố (02 lần/ngày) n=19,597   fail 12.66%
```

A clean, interpretable gradient from 12.66% to 63.05%. The dominant pattern: **once-daily commune routes (47.76% fail, 258,749 shipments) versus twice-daily central routes (26.24% fail, 278,356 shipments).** These two categories are comparable in volume and differ by 21.5 percentage points. This is the single largest structural lever visible in the data, and `loai_tuyen_phat` is 100% populated and entirely unused by the product.

### 10.5 Geography below route level is unused and highly differentiated

```sql
SELECT ten_phuong_xa_phat, COUNT(*) n,
  ROUND(SUM(CASE WHEN ket_qua_f13='Không đạt' THEN 1 ELSE 0 END)*100.0/COUNT(*),2) fail_pct
FROM fact_f13 WHERE <clean> AND ket_qua_f13 IS NOT NULL GROUP BY 1 HAVING n>=300 ORDER BY fail_pct DESC LIMIT 10;
```

| Commune | Rows | Fail % |
| --- | --- | --- |
| Xã Hưng Lộc | 8,491 | 77.19 |
| Xã Long Quảng | 983 | 76.20 |
| Xã Lộc An | 7,715 | 69.25 |
| Xã Khe Tre | 4,835 | 67.09 |
| Xã Nam Đông | 3,900 | 66.92 |
| Xã Phú Lộc | 16,657 | 66.36 |
| Xã Vinh Lộc | 6,953 | 60.12 |
| Phường Thanh Thủy | 18,789 | 56.70 |
| Phường Phong Thái | 9,339 | 56.44 |
| Xã Chân Mây – Lăng Cô | 19,009 | 56.30 |

399 communes exist; 41 carry ≥100 rows. Several of these are high-volume *and* high-failure (Chân Mây – Lăng Cô: 19,009 shipments at 56.30%), which makes them concrete intervention targets rather than statistical noise.

### 10.6 Failure is extremely concentrated by customer

```sql
WITH f AS (SELECT ten_khl, COUNT(*) fails FROM fact_f13 WHERE <clean> AND ket_qua_f13='Không đạt' AND ten_khl IS NOT NULL GROUP BY 1)
SELECT (SELECT COUNT(*) FROM f), (SELECT SUM(fails) FROM f),
  (SELECT SUM(fails) FROM (SELECT fails FROM f ORDER BY fails DESC LIMIT 10)),
  (SELECT SUM(fails) FROM (SELECT fails FROM f ORDER BY fails DESC LIMIT 50));
-- distinct_customers_with_fail=17,012  total_fails=208,121  top10=78,091  top50=94,858
```

**10 accounts out of 17,012 carry 37.5% of all failures.** The top 50 carry 45.6%. Customer names are withheld from this document as sensitive data (Section 6); only the concentration shape is reported. This is a textbook Pareto distribution and the strongest argument for building the Pareto/RCA screen.

### 10.7 Time-of-day and day-of-week are exploitable

Hour-of-day, last 30 days, delivery attempts by `thoi_gian_ptc` hour:

| Hour | Attempts | Fail % |
| --- | --- | --- |
| 06 | 262 | 82.44 |
| 07 | 520 | 81.73 |
| 08 | 2,134 | 51.27 |
| 09 | 7,759 | 31.81 |
| 10 | 13,253 | **28.97** |
| 11 | 11,148 | 32.22 |
| 12 | 8,926 | 37.61 |
| 13 | 5,394 | 41.99 |
| 14 | 6,087 | 40.43 |
| 15 | 11,787 | 30.46 |
| 16 | 11,324 | 30.12 |
| 17 | 8,440 | 34.74 |
| 18 | 4,804 | 48.40 |
| 19 | 2,881 | 50.85 |
| 20 | 1,367 | 60.94 |
| 21 | 761 | 82.65 |

Two clean quality windows (09:00–11:00 and 15:00–17:00, ~29–32% fail) with a midday degradation (13:00–14:00, ~41–42%) and a sharp evening collapse (after 18:00, rising to 82.65% by 21:00). 9,813 attempts occur after 18:00 in a 30-day window, failing at roughly 50–83%.

Day-of-week over full history:

| Day | Rows | Fail % |
| --- | --- | --- |
| Sunday | 64,164 | 37.90 |
| **Monday** | 113,965 | **49.18** |
| Tuesday | 79,178 | 39.01 |
| Wednesday | 90,597 | 28.81 |
| Thursday | 101,326 | 30.25 |
| Friday | 97,635 | 32.55 |
| Saturday | 90,665 | 36.31 |

Monday is both the highest-volume day (113,965) and the worst-performing (49.18%) — a 20.4 point gap against Wednesday. This is a weekend-backlog signature and is stable across 213 days.

### 10.8 Weight predicts failure monotonically

Using grams (per DQ-06):

| Band | Rows | Fail % |
| --- | --- | --- |
| ≤500g | 269,543 | 28.21 |
| 0.5–2kg | 143,064 | 40.76 |
| 2–5kg | 93,854 | 42.59 |
| 5–20kg | 114,604 | 43.46 |
| >20kg | 16,461 | 51.98 |

A clean monotonic gradient from 28.21% to 51.98%. Useful as a Pareto/RCA dimension and as a route-loading input.

### 10.9 Chronic failure persists in a small, nameable route set

```sql
WITH d AS (SELECT ma_tuyen, ngay_do_kiem, COUNT(*) n,
    SUM(CASE WHEN ket_qua_f13='Không đạt' THEN 1 ELSE 0 END)*1.0/COUNT(*) fr
  FROM fact_f13 WHERE <clean> AND ngay_do_kiem>='2026-06-05' AND ket_qua_f13 IS NOT NULL GROUP BY 1,2 HAVING n>=10)
SELECT COUNT(*) FROM (SELECT ma_tuyen, SUM(CASE WHEN fr>0.4 THEN 1 ELSE 0 END) bad_days FROM d GROUP BY 1 HAVING bad_days>=20);
-- chronic_routes = 46
```

46 routes (of 154) failed above 40% on at least 20 of the last 60 days. This is a persistent, not episodic, population — exactly the list an operations manager can act on.

### 10.10 National benchmark position is available and unflattering

```sql
WITH m AS (SELECT substr(ngay_do_kiem,1,7) mon, ma_tinh_phat,
    SUM(sl_ptc_dung_qd_ct)*100.0/NULLIF(SUM(sl_bg_ptc),0) rate FROM fact_f13_national GROUP BY 1,2)
SELECT mon, (SELECT COUNT(*)+1 FROM m b WHERE b.mon=a.mon AND b.rate>a.rate) rank_53,
  ROUND(a.rate,2) rate_53, (SELECT COUNT(*) FROM m c WHERE c.mon=a.mon) provinces
FROM m a WHERE a.ma_tinh_phat='53' ORDER BY mon;
```

| Month | Rank (of 34) | Rate % |
| --- | --- | --- |
| 2026-01 | 17 | 61.02 |
| 2026-02 | 14 | 53.67 |
| 2026-03 | 17 | 52.88 |
| 2026-04 | **10** | 57.86 |
| 2026-05 | **10** | 55.99 |
| 2026-06 | 18 | 53.64 |
| 2026-07 | 15 | 57.58 |
| 2026-08 | 17 | 50.01 |

The province ranks 10th–18th of 34 and has given back the April–May gain. This is a leadership-grade metric that already exists in the database and appears on no screen.

### 10.11 COD settlement lag is measurable

```sql
-- COD rows with both timestamps: n=172,508  unparsed=0
-- avg_lag=8.38h  min=-976.03h  max=1630.67h  >24h=11,770  negative=3
```

11,770 COD shipments settle more than 24 hours after delivery. Three rows have negative lag (data error). Note this required the same `dd/MM/yyyy` string reassembly; the naive `julianday()` used in the first audit pass returned `NULL` for every row and `0` for the >24h count — a concrete illustration of the DQ-05 class of silent failure. **The COD *amount* (`so_tien_cod`) is 100% NULL, so financial exposure cannot be quantified — only counts.**

## 11. Product Opportunity Matrix

No-code framing. "Feasibility" reflects data readiness and backend existence, not effort estimation. Every function below is buildable from existing columns unless the Missing Data column says otherwise.

| ID | Function | Operational value | Decision it supports | Required data | Feasibility | UI destination | Missing data |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **OPP-01** | **Latency Decomposition** — show where the hours go between origin handover and delivery, split by stage, with pass/fail overlay | **Very high.** 10.97h vs 47.68h separation (10.1); latency is the mechanism of failure (10.3) | Where to intervene in the chain: origin dispatch, transport, or last-mile | `thoi_gian_bckt_tinh_xnd_bd8`, `thoi_gian_bd10_quet_tms`, `thoi_gian_ptc`, `ket_qua_f13` | **High** — 595,046 complete chains, 0 parse failures | Operation Dashboard (new panel) | None |
| **OPP-02** | **Chronic Route Watchlist** — routes failing >40% on ≥20 of last 60 days, with persistence count | **Very high.** 46 named routes (10.9) | Which routes get management attention this month | `ma_tuyen`, `ngay_do_kiem`, `ket_qua_f13` | **High** — indexed path, 329ms | Route Ranking (new tab) | None |
| **OPP-03** | **Pareto / RCA screen** (completes the placeholder) — failure concentration by customer, route type, commune, weight, service | **Very high.** Top-10 customers = 37.5% of failures (10.6) | Where the 80/20 actually is | `ten_khl`, `loai_tuyen_phat`, `ma_phuong_xa_phat`, `khoi_luong_thuc_te`, `dich_vu` | **High** — backend `/rca/pareto` implemented by static inspection; runtime unverified | `/f13/pareto` (replaces placeholder) | None. Must fix `API-01`. |
| **OPP-04** | **Route Type Performance** — compare the 9 route-type categories | **High.** 12.66%–63.05% spread; 21.5pt gap between two comparable-volume categories (10.4) | Route model / delivery frequency policy | `loai_tuyen_phat`, `ket_qua_f13` | **High** — 100% populated | BCVH Ranking (new view) or Pareto | None |
| **OPP-05** | **Commune Heatmap** — failure rate by delivery commune with volume weighting | **High.** 12.7%–77.2% spread, several high-volume + high-fail (10.5) | Which localities need route redesign or added capacity | `ma_phuong_xa_phat`, `ten_phuong_xa_phat`, `ket_qua_f13` | **High** — 99.6% populated. Needs min-volume guard | Route Ranking or new geography view | Commune→route mapping table would improve it |
| **OPP-06** | **National Position Card** — provincial rank of 34 with monthly trend | **High.** Rank 10–18, trend reversal visible (10.10) | Whether provincial performance is competitive | `fact_f13_national` (all) | **High** — clean, pre-aggregated, 5ms query | Operation Dashboard (header card) | None |
| **OPP-07** | **Day-of-Week / Hour-of-Day Pattern** — when quality degrades | **High.** Monday 49.18% vs Wednesday 28.81%; post-18:00 collapse to 82.65% (10.7) | Staffing, shift planning, Monday backlog policy | `ngay_do_kiem`, `thoi_gian_ptc`, `ket_qua_f13` | **High** — no new data | Operation Dashboard (pattern panel) | None |
| **OPP-08** | **SLA Band Analysis** — performance against assigned target band | **Medium-high.** Generous bands fail most (10.2) — a structural anomaly worth surfacing | Whether SLA assignment matches operational reality | `thoi_gian_chi_tieu`, `thoi_gian_thuc_hien_thuc_te_gio`, `ket_qua_f13` | **High** — requires `CAST` per DQ-05 | Pareto / RCA | SLA assignment rule (business) |
| **OPP-09** | **Customer Concentration (anonymized)** — top-N accounts by failure contribution | **High.** Top 10 = 37.5% (10.6) | Which accounts need a service conversation | `ten_khl`, `ket_qua_f13` | **High** data-wise; **access-gated** | Pareto / RCA, admin-only | PO decision on customer-name exposure |
| **OPP-10** | **Weight Band Analysis** | **Medium.** Monotonic 28.21%→51.98% (10.8) | Vehicle/loading policy, heavy-item handling | `khoi_luong_thuc_te`, `ket_qua_f13` | **High** — needs documented grams unit | Pareto / RCA (dimension) | Unit confirmation (DQ-06) |
| **OPP-11** | **COD Settlement Lag** | **Medium.** 11,770 settlements >24h (10.11) | Cash-control tightening | `thoi_gian_nop_tien`, `thoi_gian_ptc`, `loai_dv` | **Medium** — needs `dd/MM/yyyy` parsing; amount unavailable | Shipment Ranking | `so_tien_cod` is 100% NULL — no financial sizing |
| **OPP-12** | **Service Mix Performance** | **Medium.** 23 populated combinations, unused | Product/service prioritization | `dich_vu`, `loai_dv`, `nhom_spdv` | **High** — fully populated | Pareto / RCA (dimension) | None |
| **OPP-13** | **Data Quality Monitor** — surface DQ-01…DQ-08 as an operational panel | **Medium-high.** Protects every other number in the system | Whether today's figures can be trusted | `import_log`, `fact_f13` integrity checks | **High** — all checks written in Section 5 | System Information | None |
| **OPP-14** | **Import Reconciliation** — 434 runs vs 215 dates vs 32,941 record gap | **Medium.** DQ-02 | Whether re-imports are corrupting history | `import_log`, `fact_f13.import_log_id` | **High** | Data Import Center | Re-import supersede rule (business) |
| **OPP-15** | **Acceptance Office Analysis** — 27 `ma_bckt_tinh_phat` offices, entirely unused | **Medium.** Extends accountability upstream of the BCVH | Whether failure originates at acceptance | `ma_bckt_tinh_phat`, `ket_qua_f13` | **High** — 100% populated | BCVH Ranking (new dimension) | Office→BCVH ownership mapping |
| **OPP-16** | **Postman/Courier Accountability** | Would be very high | Individual performance management | — | **Not feasible** | — | **No courier field exists anywhere in the DB.** Previously deferred; still blocked. |
| **OPP-17** | **Failure Reason / Root Cause Codes** | Would be very high | True RCA rather than dimensional inference | — | **Not feasible** | — | **No reason field exists.** Everything in OPP-03 is dimensional concentration, not causal reason. |
| **OPP-18** | **Message Center with lifecycle** | Medium | Whether recommendations were acted on | Message table, recipient, ack state | **Not feasible** | — | **No message/recipient/ack tables exist.** See 9.7. |

### 11.1 Ranking by operational value

1. **OPP-01** Latency Decomposition — largest explanatory power, entirely unexposed
2. **OPP-03** Pareto / RCA — backend already built, concentration proven
3. **OPP-02** Chronic Route Watchlist — 46 actionable routes, immediately usable
4. **OPP-04** Route Type Performance — largest structural lever (21.5pt gap)
5. **OPP-06** National Position — leadership metric, near-zero cost
6. **OPP-07** Day/Hour Pattern — direct staffing decision
7. **OPP-05** Commune Heatmap — 6x spread, new geographic granularity
8. **OPP-13** Data Quality Monitor — protects trust in all of the above
9. **OPP-09** Customer Concentration — high value, access decision required
10. **OPP-08** SLA Band Analysis — surfaces a structural anomaly
11. **OPP-12** Service Mix — easy dimensional add
12. **OPP-15** Acceptance Office — extends accountability upstream
13. **OPP-10** Weight Band — supporting dimension
14. **OPP-11** COD Lag — limited without amounts
15. **OPP-14** Import Reconciliation — internal hygiene

## 12. Quick Wins vs Functions Requiring New Data

### 12.1 Quick wins — no new data, no new collection, no business rule needed

| ID | Function | Why it is a quick win |
| --- | --- | --- |
| OPP-06 | National Position Card | Pre-aggregated table, 5ms query, single card |
| OPP-02 | Chronic Route Watchlist | One query on an indexed path, 329ms |
| OPP-04 | Route Type Performance | Single `GROUP BY` on a 100%-populated column |
| OPP-07 | Day-of-Week / Hour Pattern | Two `GROUP BY` queries, no new fields |
| OPP-12 | Service Mix Performance | Single `GROUP BY`, fully populated |
| OPP-03 | Pareto / RCA screen | **Backend endpoint implemented by static inspection** (runtime unverified) — frontend work, runtime verification, plus the `API-01` fix |
| OPP-13 | Data Quality Monitor | All eight checks already written in Section 5 |

### 12.2 Needs care but no new data — existing data with a technical caveat

| ID | Function | Caveat to handle |
| --- | --- | --- |
| OPP-01 | Latency Decomposition | Timestamps are TEXT `dd/MM/yyyy HH:mm:ss`; requires string reassembly (proven, 0 failures) |
| OPP-05 | Commune Heatmap | Needs a minimum-volume guard; only 41 of 399 communes have ≥100 rows |
| OPP-08 | SLA Band Analysis | Requires `CAST(... AS REAL)` per DQ-05 or returns wrong answers silently |
| OPP-10 | Weight Band | Unit must be documented as grams before display |
| OPP-11 | COD Lag | Same date-parsing caveat; amount unavailable |
| OPP-15 | Acceptance Office | Needs office→BCVH ownership mapping to assign accountability |

### 12.3 Requires new data or a Product Owner business decision

| ID | Function | What is missing |
| --- | --- | --- |
| OPP-09 | Customer Concentration | PO decision on exposing customer names (sensitive) |
| OPP-14 | Import Reconciliation | ~~Business rule~~ — **rule now decided by PO (overwrite/upsert on business key)**. Remaining work is technical validation of the 32,941-record reconciliation gap only. |
| OPP-16 | Courier Accountability | **No courier field in the database.** Requires new data collection. |
| OPP-17 | Root Cause Codes | **No failure-reason field.** Requires new data collection. |
| OPP-18 | Message Center lifecycle | Requires new message/recipient/acknowledgement tables |

## 13. Recommended Implementation Sequence

Each wave is scoped so that it can be a separate ticket under One Bug → One Ticket → One Commit. This is a recommendation for the CTO/Product Owner to authorize or reorder — no work is started by this audit.

**Wave 0 — Foundation hygiene (before building analytics on top of the data)**
- Fix `API-01` (`/f13` prefix on `getKpi` and `getPareto`)
- Remove the five orphaned `pages/F13*.jsx` files (Section 8.1)
- Quarantine the 4 corrupt `2098-02` / `BCVH TEST` rows (DQ-01, DQ-03) — read-only audit did not touch them
- Document the grams unit (DQ-06) and the TEXT-duration CAST requirement (DQ-05)
- Deduplicate `sys_kpi_thresholds` (DQ-08)

Rationale: DQ-05 and DQ-01 will silently corrupt every function in Waves 1–3 if left in place.

**Wave 1 — Complete what already exists (highest value per unit of work)**
- **OPP-03** Build the Pareto / RCA screen against the existing backend (verify backend runtime first)
- **OPP-06** National Position card on the Operation Dashboard
- **OPP-02** Chronic Route Watchlist on Route Ranking
- Decide **MERGE** for Evidence → Shipment Ranking (PO confirmation required, per 9.4/9.6)
- Decide **HIDE** for Message Center (PO confirmation required, per 9.7)

**Wave 2 — Unlock the unused high-value dimensions**
- **OPP-01** Latency Decomposition panel
- **OPP-04** Route Type Performance
- **OPP-07** Day-of-Week / Hour-of-Day pattern
- **OPP-12** Service Mix as a Pareto dimension

**Wave 3 — Depth and geography**
- **OPP-05** Commune Heatmap (with volume guard)
- **OPP-08** SLA Band Analysis
- **OPP-10** Weight Band dimension
- **OPP-15** Acceptance Office analysis (pending ownership mapping)

**Wave 4 — Governance and trust**
- **OPP-13** Data Quality Monitor
- **OPP-14** Import Reconciliation (pending re-import business rule)
- **OPP-11** COD Settlement Lag (counts only)

**Deferred pending new data collection — not schedulable**
- OPP-16 (courier), OPP-17 (root cause codes), OPP-18 (message lifecycle), OPP-09 (pending access decision)

## 14. Missing Data Register

Items the Product Owner must decide or the organisation must begin collecting. This audit does not resolve any of them, and does not infer a business rule to fill the gap.

| ID | Gap | Type | Blocks |
| --- | --- | --- | --- |
| MD-01 | ~~Which of `ket_qua_f13` / `danh_gia_2026` is authoritative~~ | **CLOSED 2026-08-04** | **`danh_gia_2026` is authoritative. Final. Not to be reopened.** |
| MD-02 | Courier/postman identity — no field exists anywhere in the database | **New data collection** | OPP-16 |
| MD-03 | Failure reason / root cause code — no field exists | **New data collection** | OPP-17, true RCA |
| MD-04 | `so_tien_cod` is 100% NULL — COD amounts never populated | **New data collection** | Financial sizing in OPP-11 |
| MD-05 | ~~Whether duplicate `ma_bg` are re-delivery attempts or import duplicates~~ | **CLOSED 2026-08-04** | Resolved technically: zero duplicates exist on the business key. Repeated `ma_bg` are the same shipment evaluated on 2–3 dates. `DQ-07` retracted. |
| MD-06 | ~~Re-import supersede rule~~ | **CLOSED 2026-08-04** | **PO rule: same authoritative business key must be overwritten/upserted, never appended. Decided — not to be reopened.** Observed data conforms with zero violations. The 434-runs-vs-215-dates and 32,941-record reconciliation gap in `DQ-02` remains a **technical validation item**, not a PO decision. |
| MD-07 | Whether customer names may be displayed in ranking surfaces | **Access/privacy decision** | OPP-09 |
| MD-08 | Weight unit confirmation (evidence says grams) | **Confirmation** | OPP-10 |
| MD-09 | Message audience, trigger, and acknowledgement lifecycle | **Business definition** | OPP-18, Message Center |
| MD-10 | Acceptance office → BCVH accountability mapping | **Mapping data** | OPP-15 |
| MD-11 | SLA assignment rule — why 14h/17h bands fail more than the 12h band | **Business rule** | Interpretation of OPP-08 |
| MD-12 | Commune → route mapping table | **Mapping data** | Improves OPP-05 |

## 15. Audit Limitations

- **Read-only.** The database was opened with `OPEN_READONLY`. No schema, data, index, or product code was modified. No defect identified in Section 5 was repaired.
- **Static analysis only — no runtime verification.** API and screen coverage was determined by reading route registrations, controllers, and client code. **No endpoint was invoked and no browser session was run.** Every statement that a backend endpoint is implemented rests on static inspection alone; runtime behavior has not been verified. Runtime evidence is Antigravity's ownership per DEC-020.
- **No business rules inferred.** **As at initial audit execution**, where a conclusion would require a business rule (`MD-01`, `MD-05`, `MD-06`, `MD-11` in particular), the gap was registered rather than resolved: the audit did **not** assert which result column was correct, did **not** assert that duplicate `ma_bg` rows were errors, and did **not** propose SLA target changes.

  **Current status (superseding the condition above): `MD-01` is CLOSED — `danh_gia_2026` is authoritative. `MD-05` is CLOSED — zero duplicates exist on the real business key; `DQ-07` retracted. `MD-06` is CLOSED — the overwrite/upsert rule is decided.** `MD-11` remains open. See Section 14 and Section 16.
- **Correlation, not causation.** Sections 10.2, 10.4, 10.5, 10.7, and 10.8 report measured associations between dimensions and failure rate. They do not establish cause. `ket_qua_f13` being a deterministic function of elapsed time (10.3) is the one exception and is an arithmetic relationship, not an inferred one.
- **`BCVH TEST` and `2098-02` rows excluded** from all analytics in Sections 10–11 via the stated clean filter, but retained in the inventory counts in Sections 2–5 so the defects remain visible.
- **Minimum-volume guards applied** to commune analysis (n≥300) and route-type analysis (n>500) to avoid reporting unstable percentages. Section 4.2 identifies four BCVH too small for stable ranking.
- **No effort or cost estimation.** "Feasibility" in Section 11 reflects data readiness and backend existence only. Sizing is a scoping decision for the CTO.

---

## 16. Product Owner Review Outcome — `2026-08-04` (CLOSURE)

The Product Owner reviewed this audit and issued three authoritative decisions. This section records them; the ticket is closed on this basis.

### 16.1 Authoritative F1.3 result field — FINAL

`danh_gia_2026` is the authoritative F1.3 result field. `ket_qua_f13` is a technical/reference field only until separately documented. Production KPI logic must not be switched to `ket_qua_f13`. `MD-01` is closed and must not be reopened as an unresolved Product Owner decision. Recorded in `DQ-04` (5.4) and `MD-01` (Section 14).

Authoritative province baseline on the decided field: **58.6233% Đạt across 637,445 evaluated 2026 rows.**

### 16.2 Import duplicate rule — DECIDED, NOT REOPENED

Records sharing the authoritative business key must be overwritten/upserted, never appended as duplicates. This is a settled business decision and is not reopened by this audit.

### 16.3 Duplicate count revalidation — `DQ-07` RETRACTED

The Product Owner required the 12,688-row duplicate claim to be revalidated. Result, per the required points:

- **Exact key used by the audit query:** `GROUP BY ma_bg` alone.
- **Actual import/upsert key:** `UNIQUE(ngay_do_kiem, ma_bg)`, declared in the `fact_f13` DDL and enforced as `sqlite_autoindex_fact_f13_1`; matched by `INSERT OR IGNORE` in `importProcessor.js` with date-level replacement (`DELETE FROM fact_f13 WHERE ngay_do_kiem = ?`).
- **Exact duplicates vs legitimate multiple records:** zero exact full-row duplicates; zero duplicates on the business key; the 9,348 repeated `ma_bg` are single shipments evaluated across 2 dates (6,008) or 3 dates (3,340) — legitimate multiple operational records.
- **Verdict:** the audit query used an invalid key definition. **The duplicate finding is retracted.** No genuine duplicates exist despite the overwrite rule, so no technical cause report or row modification is required.

Per the Product Owner's framing, the duplicate count is recorded as a **technical validation item, not a Product Owner decision**. Note on numbering: the Product Owner's instruction referenced "DQ-06"; the duplicate finding is `DQ-07` in this document, and `DQ-06` is the separate weight-unit item, which is unaffected and remains open.

### 16.4 Year-2098 data removal — AUTHORIZED

Permanent removal of all year-2098 test/future data from the operational system is authorized. Executed under the bounded implementation ticket `F13-DATA-2098-CLEANUP-IMPL`.

### 16.5 Net effect on this audit

At the point these decisions were recorded, open defects dropped from eight to six (`DQ-01`, `DQ-02`, `DQ-03`, `DQ-05`, `DQ-06`, `DQ-08`); `DQ-04` resolved by decision and `DQ-07` retracted as false. **Following `F13-DATA-2098-CLEANUP-IMPL`, which closed `DQ-01` and `DQ-03`, the current confirmed open defect count is FOUR: `DQ-02`, `DQ-05`, `DQ-06`, `DQ-08`.** Missing Data Register items `MD-01`, `MD-05`, and `MD-06` are closed.

The surface recommendations (Section 9.9) and the opportunity matrix (Section 11) were **not** amended by this review; the MERGE and HIDE confirmations remain outstanding and continue to gate the proposed Wave 1.

---

Audit status: `CLOSED — PO DECISIONS RECORDED 2026-08-04`
Still outstanding for Wave 1: MERGE confirmation (Evidence → Shipment Ranking) and HIDE confirmation (Message Center).
Follow-on ticket: `F13-DATA-2098-CLEANUP-IMPL`.
