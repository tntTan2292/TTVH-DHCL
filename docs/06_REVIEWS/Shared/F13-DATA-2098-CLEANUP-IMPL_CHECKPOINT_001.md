# F13-DATA-2098-CLEANUP-IMPL — CHECKPOINT 001

Ticket: `F13-DATA-2098-CLEANUP-IMPL`
Type: Bounded operational data cleanup (destructive, Product Owner authorized `2026-08-04`)
Execution date: `2026-08-04`
Status: `COMPLETED / TECHNICAL PASS / CLOSED`

## Table of Contents

- [1. Result](#1-result)
- [2. Required Evidence](#2-required-evidence)
- [3. Identification Of Year-2098 Data](#3-identification-of-year-2098-data)
- [4. Backup](#4-backup)
- [5. Deletion](#5-deletion)
- [6. Post-Delete Verification](#6-post-delete-verification)
- [7. Authoritative Field Validation](#7-authoritative-field-validation)
- [8. Duplicate Revalidation](#8-duplicate-revalidation)
- [9. Scope Compliance](#9-scope-compliance)
- [10. Residual Findings](#10-residual-findings)
- [11. Closure](#11-closure)

## 1. Result

All year-2098 test/future data has been permanently removed from the operational database inside a single committed transaction. 4 `fact_f13` rows and 4 `import_log` rows were deleted. Zero 2098 rows remain anywhere in the operational system.

2026 production data is bit-for-bit unaffected: 663,126 rows, 213 days, and the authoritative KPI unchanged at `58.6233%` to four decimal places. A verified, recoverable backup was taken before any write.

## 2. Required Evidence

| Required item | Value |
| --- | --- |
| DB path | `backend/src/db/database.sqlite` |
| Backup path | `backend/src/db/backups/database.pre-2098-cleanup.2026-08-04.sqlite` |
| Backup size | 543,047,680 bytes |
| Affected tables | `fact_f13`, `import_log` |
| Pre-delete `fact_f13` total | 663,130 |
| Post-delete `fact_f13` total | 663,126 |
| Pre-delete `import_log` total | 434 |
| Post-delete `import_log` total | 430 |
| Rows deleted | 4 (`fact_f13`) + 4 (`import_log`) = 8 |
| Exact SQL predicate | `ngay_do_kiem LIKE '2098%'` (applied to both tables) |
| Transaction result | `COMMITTED` |
| Date min/max after cleanup | `2026-01-01` → `2026-08-03` |
| Authoritative field validation | `danh_gia_2026` confirmed production field; KPI unchanged at `58.6233%` |
| Duplicate query conclusion | Original key invalid; zero duplicates on the real key; finding retracted |

## 3. Identification Of Year-2098 Data

The Product Owner required identification using **all relevant business/date fields**, not just the evaluation date. `fact_f13` carries six date-bearing fields in two different formats: `ngay_do_kiem` is ISO `yyyy-MM-dd`, while the five event timestamps are TEXT `dd/MM/yyyy HH:mm:ss` (year at characters 7–10).

All six were scanned:

```sql
-- Evaluation date
SELECT substr(ngay_do_kiem,1,4) yr, COUNT(*) n FROM fact_f13 GROUP BY 1 ORDER BY 1;
-- 2026 → 663,126 ; 2098 → 4

-- All five event timestamps (dd/MM/yyyy → year at chars 7-10)
SELECT
  SUM(CASE WHEN substr(thoi_gian_ptc,7,4)='2098' THEN 1 ELSE 0 END) ptc,
  SUM(CASE WHEN substr(thoi_gian_bckt_tinh_xnd_bd8,7,4)='2098' THEN 1 ELSE 0 END) bd8,
  SUM(CASE WHEN substr(thoi_gian_bd10_quet_tms,7,4)='2098' THEN 1 ELSE 0 END) tms,
  SUM(CASE WHEN substr(thoi_gian_bd10_xnd_kttp,7,4)='2098' THEN 1 ELSE 0 END) kttp,
  SUM(CASE WHEN substr(thoi_gian_nop_tien,7,4)='2098' THEN 1 ELSE 0 END) nop_tien
FROM fact_f13;
-- ptc=0  bd8=0  tms=0  kttp=0  nop_tien=0
```

Completeness check — rows carrying a 2098 event timestamp that the date-only predicate would miss:

```sql
SELECT COUNT(*) FROM fact_f13 WHERE ngay_do_kiem NOT LIKE '2098%' AND (
  substr(thoi_gian_ptc,7,4)='2098' OR substr(thoi_gian_bckt_tinh_xnd_bd8,7,4)='2098'
  OR substr(thoi_gian_bd10_quet_tms,7,4)='2098' OR substr(thoi_gian_bd10_xnd_kttp,7,4)='2098'
  OR substr(thoi_gian_nop_tien,7,4)='2098');
-- 0
```

**Result: zero.** No 2098 value exists in any event timestamp. The predicate `ngay_do_kiem LIKE '2098%'` is therefore both **complete** (misses nothing) and **precise** (catches nothing extra). This is what justified using a date-only predicate.

### 3.1 Profile of the affected rows

```sql
SELECT ngay_do_kiem, ma_bcvh, ten_bcvh, COALESCE(ma_tuyen,'(null)') tuyen,
       COALESCE(danh_gia_2026,'(null)') eval, import_log_id, COUNT(*) n
FROM fact_f13 WHERE ngay_do_kiem LIKE '2098%' GROUP BY 1,2,3,4,5,6;
```

| `ngay_do_kiem` | `ma_bcvh` | `ten_bcvh` | Route | `danh_gia_2026` | `import_log_id` | n |
| --- | --- | --- | --- | --- | --- | --- |
| 2098-02-16 | 533140 | BCVH TEST | (null) | Không đạt | 1002 | 1 |
| 2098-02-16 | 533140 | BCVH TEST | (null) | Đạt | 1002 | 1 |
| 2098-02-18 | 533140 | BCVH TEST | (null) | Không đạt | 1004 | 1 |
| 2098-02-18 | 533140 | BCVH TEST | (null) | Đạt | 1004 | 1 |

All four rows are `BCVH TEST` with no route assignment — unambiguous test artifacts.

### 3.2 `import_log` rows

```sql
SELECT id, file_name, ngay_do_kiem, status, total_records FROM import_log WHERE ngay_do_kiem LIKE '2098%';
```

| id | file_name | `ngay_do_kiem` | status | total_records |
| --- | --- | --- | --- | --- |
| 1002 | `F1.3-2098.02.16.xlsx` | 2098-02-16 | SUCCESS | 2 |
| 1003 | `F1.3-2098.02.18.xlsx` | 2098-02-18 | SUCCESS | 1 |
| 1004 | `F1.3-2098.02.18.xlsx` | 2098-02-18 | SUCCESS | 2 |
| 1007 | `F1.3-2098.02.15.xlsx` | 2098-02-15 | SUCCESS | 34 |

These are year-2098 records in the operational system and fall within the authorized scope. Note two are orphan log entries with no surviving fact rows (1003, and 1007 which claims 34 records for a date holding zero rows) — consistent with the date-level delete-and-reinsert import behaviour.

### 3.3 Blast-radius check before deleting

```sql
SELECT import_log_id, COUNT(*) n, MIN(ngay_do_kiem) mn, MAX(ngay_do_kiem) mx FROM fact_f13
WHERE import_log_id IN (SELECT id FROM import_log WHERE ngay_do_kiem LIKE '2098%') GROUP BY 1;
-- 1002 → n=2, 2098-02-16..2098-02-16
-- 1004 → n=2, 2098-02-18..2098-02-18
```

Neither 2098 import log owns any non-2098 row, so removing the log rows could not orphan production data.

### 3.4 `BCVH TEST` overlap

```sql
SELECT ten_bcvh, SUM(CASE WHEN ngay_do_kiem LIKE '2098%' THEN 1 ELSE 0 END) is_2098,
       SUM(CASE WHEN ngay_do_kiem NOT LIKE '2098%' THEN 1 ELSE 0 END) not_2098
FROM fact_f13 WHERE ten_bcvh='BCVH TEST' OR ngay_do_kiem LIKE '2098%' GROUP BY 1;
-- BCVH TEST : is_2098=4  not_2098=0
```

Every `BCVH TEST` row is a 2098 row. The scope restriction — *do not delete `BCVH TEST` unless it also matches the confirmed year-2098 predicate* — is satisfied: all four matched the predicate, and no `BCVH TEST` row outside 2098 existed to be spared.

### 3.5 `fact_f13_national`

```sql
SELECT substr(ngay_do_kiem,1,4) yr, COUNT(*) n FROM fact_f13_national GROUP BY 1;
-- 2026 → 6,766
```

No 2098 data. This table was not touched.

## 4. Backup

The backend was running (live `node` processes), so a file copy could have captured a torn page. A transactionally consistent snapshot was taken with SQLite's `VACUUM INTO` instead:

```sql
VACUUM INTO 'D:/.../backend/src/db/backups/database.pre-2098-cleanup.2026-08-04.sqlite';
```

- Path: `backend/src/db/backups/database.pre-2098-cleanup.2026-08-04.sqlite`
- Size: 543,047,680 bytes
- `PRAGMA integrity_check` → `ok`
- Content verification: `fact_f13=663,130`, `fact_f13 WHERE 2098=4`, `import_log=434`, `fact_f13_national=6,766` — all matching the live pre-delete state

The script aborted before any delete if the backup row counts did not match the live counts. They matched, so execution proceeded.

Recoverability: the backup contains the complete pre-cleanup database including the deleted rows. Restoring is a file replace. The backups directory is covered by the existing `.gitignore` rules (`*.sqlite`), so the backup is not committed to the repository.

## 5. Deletion

Executed inside a single `BEGIN IMMEDIATE` transaction with in-transaction assertions before commit:

```sql
BEGIN IMMEDIATE;
DELETE FROM fact_f13   WHERE ngay_do_kiem LIKE '2098%';   -- 4 rows
DELETE FROM import_log WHERE ngay_do_kiem LIKE '2098%';   -- 4 rows
-- guard 1: zero 2098 rows remain in both tables      → passed
-- guard 2: 2026 row count unchanged (663,126)        → passed
COMMIT;
```

Both guards were evaluated **before** the commit, with an automatic `ROLLBACK` path if either failed. Neither triggered.

- `fact_f13` rows deleted: **4**
- `import_log` rows deleted: **4**
- Transaction result: **COMMITTED**

## 6. Post-Delete Verification

| Check | Result |
| --- | --- |
| 2098 rows remaining in `fact_f13` | **0** |
| 2098 rows remaining in `import_log` | **0** |
| Any non-2026 row in `fact_f13` | **0** |
| Any non-2026 row in `import_log` | **0** |
| Any non-2026 row in `fact_f13_national` | **0** |
| `BCVH TEST` rows remaining | **0** |
| `fact_f13` total | 663,130 → **663,126** (−4) |
| `import_log` total | 434 → **430** (−4) |
| `fact_f13_national` total | 6,766 → **6,766** (unchanged) |
| Date range | `2026-01-01`–`2098-02-18` → **`2026-01-01`–`2026-08-03`** |
| 2026 row count | 663,126 → **663,126** (unchanged) |
| 2026 distinct days | 213 → **213** (unchanged) |
| `PRAGMA integrity_check` | **ok** |
| Orphaned `fact_f13` rows (no matching `import_log`) | **0** |
| Duplicates on business key `(ngay_do_kiem, ma_bg)` | **0** |

Month-by-month integrity, identical to the pre-cleanup audit baseline:

| Month | Days | Rows |
| --- | --- | --- |
| 2026-01 | 31 | 102,613 |
| 2026-02 | 26 | 64,496 |
| 2026-03 | 31 | 102,965 |
| 2026-04 | 30 | 94,857 |
| 2026-05 | 31 | 89,001 |
| 2026-06 | 30 | 93,141 |
| 2026-07 | 31 | 106,813 |
| 2026-08 | 3 | 9,240 |

Every month matches the audit's pre-cleanup figures exactly. No production data was touched.

### 6.1 Side effect: `DQ-03` resolved

The BCVH code/name collision reported as `DQ-03` was caused entirely by `ma_bcvh = 533140` mapping to both `BCVH Thuận Hóa` and `BCVH TEST`:

```sql
SELECT COUNT(DISTINCT ma_bcvh) codes, COUNT(DISTINCT ten_bcvh) names FROM fact_f13;
-- before: codes=9  names=10
-- after : codes=9  names=9
```

`DQ-03` is now closed as a consequence of this cleanup. No separate work is required.

## 7. Authoritative Field Validation

Per the Product Owner decision of `2026-08-04`, `danh_gia_2026` is the authoritative F1.3 result field and production KPI logic must not be switched to `ket_qua_f13`.

Representative KPI, before and after cleanup:

```sql
SELECT COUNT(*) evaluated, SUM(CASE WHEN danh_gia_2026='Đạt' THEN 1 ELSE 0 END) dat,
  ROUND(SUM(CASE WHEN danh_gia_2026='Đạt' THEN 1 ELSE 0 END)*100.0/COUNT(*),4) pass_pct
FROM fact_f13 WHERE ngay_do_kiem LIKE '2026%' AND danh_gia_2026 IS NOT NULL;
-- pre : evaluated=637,445  dat=373,691  pass_pct=58.6233
-- post: evaluated=637,445  dat=373,691  pass_pct=58.6233
```

**Unchanged to four decimal places.** The deleted rows carried `danh_gia_2026` values but fell outside the 2026 production window, so the authoritative KPI is provably unaffected.

Representative BCVH ranking on the authoritative field (last 30 days, post-cleanup):

| BCVH | Rows | Pass % (`danh_gia_2026`) |
| --- | --- | --- |
| BCVH Thuận An | 6,545 | 73.03 |
| BCVH A Lưới | 2,760 | 70.58 |
| BCVH Thuận Hóa | 49,783 | 65.24 |
| BCVH Hương Trà | 13,686 | 53.80 |
| BCVH Hương Thủy | 14,894 | 48.37 |
| BCVH Phú Lộc | 9,560 | 39.75 |
| Trần Hưng Đạo | 36 | 16.67 |

Ranking is coherent and intact. `Khách hàng lớn` returns 100% on a single row and is excluded above as statistically meaningless — the minimum-volume guard noted in the audit remains an open recommendation.

Code-level confirmation that `danh_gia_2026` is the production field:

```
danh_gia_2026 references in backend/src (excluding tests): 40
ket_qua_f13   references in backend/src (excluding tests):  7
```

The dashboard, ranking, and rule-engine KPI paths are dominated by `danh_gia_2026`. **No code was changed by this ticket**, so the authoritative field was not altered. One live exception is reported in Section 10.

## 8. Duplicate Revalidation

Required by the Product Owner as a technical validation item. Full detail is recorded in the audit checkpoint Section 5.7; the conclusion is repeated here.

- **Key used by the original audit query:** `GROUP BY ma_bg` alone → 9,348 groups, 12,688 "excess" rows.
- **Actual import/upsert key:** `UNIQUE(ngay_do_kiem, ma_bg)`, declared in the `fact_f13` DDL and physically enforced as `sqlite_autoindex_fact_f13_1` (`unique=1, origin=u`). The import pipeline replaces a whole evaluation date (`DELETE FROM fact_f13 WHERE ngay_do_kiem = ?`) then batch-inserts with `INSERT OR IGNORE` against that constraint.
- **Exact duplicates vs legitimate multiple records:** zero duplicates on the business key; zero exact full-row duplicates; zero same-date groups with differing content. The 9,348 repeated `ma_bg` values are single shipments evaluated on 2 dates (6,008) or 3 dates (3,340) — legitimate multiple operational records for one shipment.
- **Verdict:** the audit query used an invalid key definition. **The duplicate finding (`DQ-07`) is retracted.** No genuine duplicates exist despite the overwrite rule, so no technical cause report and no row modification are required.
- Post-cleanup re-check confirms the constraint still holds: duplicates on `(ngay_do_kiem, ma_bg)` = **0**.

Numbering note: the Product Owner's instruction referenced "DQ-06". The duplicate finding is `DQ-07`; `DQ-06` is the separate weight-unit item, which is unaffected and remains open.

## 9. Scope Compliance

| Scope restriction | Compliance |
| --- | --- |
| Identify 2098 rows using all relevant business/date fields | Done — all six date-bearing fields scanned (Section 3) |
| Report predicate and row count before deletion | Done — Sections 3 and 5, captured pre-delete |
| Create recoverable backup | Done — verified `VACUUM INTO` snapshot, integrity `ok` (Section 4) |
| Delete only confirmed 2098 rows, in a transaction | Done — single `BEGIN IMMEDIATE`, 8 rows, guarded, committed |
| Verify zero remaining 2098 rows | Done — 0 in every table (Section 6) |
| Verify 2026 counts/coverage and KPI intact | Done — row count, day count, per-month, and KPI all identical (Section 6, 7) |
| Revalidate alleged duplicate count | Done — retracted (Section 8) |
| Do not deduplicate other records | Complied — no deduplication performed |
| Do not change the authoritative F1.3 field | Complied — no code changed |
| Do not modify frontend, Pareto, Evidence, Message Center, unrelated data | Complied — zero product-code changes; `fact_f13_national`, `sys_kpi_thresholds`, `system_config` untouched |
| Do not delete `BCVH TEST` unless it matches the 2098 predicate | Complied — all 4 matched; none existed outside 2098 (Section 3.4) |

## 10. Residual Findings

Reported, not acted on — both are outside this ticket's authorized scope.

### 10.1 `ruleEngineService` computes KPI on the non-authoritative field (`RESIDUAL-01`, severity: high)

`backend/src/services/ruleEngineService.js` lines 53–64 compute `passed_bg`, `failed_bg`, `kpi_rate`, and `avg_kpi` using `ket_qua_f13`:

```sql
SUM(CASE WHEN ket_qua_f13 = 'Đạt' THEN 1 ELSE 0 END) as passed_bg,
(SUM(CASE WHEN ket_qua_f13 = 'Đạt' THEN 1.0 ELSE 0.0 END) / COUNT(*)) * 100 as kpi_rate
```

This is **live**: `kpiController.js:356` calls `ruleEngineService.evaluate(fromDate, toDate)` to serve `GET /f13/recommendations`, which the Operation Dashboard consumes.

Measured divergence against the authoritative field over the last 30 days:

| BCVH | Authoritative % (`danh_gia_2026`) | Rule engine % (`ket_qua_f13`) | Gap (pts) |
| --- | --- | --- | --- |
| BCVH Hương Trà | 50.96 | 56.54 | **+5.58** |
| BCVH Thuận Hóa | 62.38 | 67.90 | **+5.52** |
| BCVH Thuận An | 68.52 | 73.05 | **+4.53** |
| BCVH Hương Thủy | 45.45 | 48.26 | **+2.81** |
| BCVH Phú Lộc | 37.08 | 37.17 | +0.10 |
| BCVH A Lưới | 68.09 | 68.19 | +0.10 |

Province-wide the two fields differ by nearly 5 points (`58.6233%` authoritative vs `63.4988%` reference). The recommendations surface is therefore **systematically optimistic** relative to the authoritative KPI, by up to 5.58 points for an individual BCVH.

This does not contradict the Product Owner's instruction — no production KPI logic was *switched to* `ket_qua_f13` by this ticket; the divergence pre-existed the decision. But aligning `ruleEngineService` to `danh_gia_2026` requires a separate authorized ticket. Flagged here because it is the one place where a live surface still disagrees with the now-authoritative field.

### 10.2 Orphaned legacy repository (`RESIDUAL-02`, severity: low)

`backend/src/repositories/FactBuuGuiRepository.js` issues `INSERT INTO fact_f13 (session_id, ..., extended_data)` — neither `session_id` nor `extended_data` exists in the `fact_f13` schema, so this insert path would fail if executed. It is required by `F13DashboardService.js` and `RecommendationService.js`, so it is not dead at module level, though the defective insert method appears unused. Not investigated further; outside this ticket's scope.

---

## 11. Closure

- Status: `COMPLETED / TECHNICAL PASS / CLOSED`
- Closed on: `2026-08-04`
- Closure authority: CTO review — `TECHNICAL PASS`
- Reviewed implementation commit: `3b605beb7ed2deeae239dbb050cf9b03fbad9c43`

Authoritative closure result: 4 `fact_f13` rows deleted; 4 `import_log` rows deleted; zero 2098 rows remain; zero `BCVH TEST` rows remain; 2026 unchanged at 663,126 rows / 213 days; authoritative `danh_gia_2026` KPI remains `58.6233%`.

**Backup is retained at `backend/src/db/backups/database.pre-2098-cleanup.2026-08-04.sqlite` and must not be deleted.**

Defect state after this cleanup: `DQ-01` CLOSED by the cleanup; `DQ-03` CLOSED because `BCVH TEST` was removed; `DQ-04` RESOLVED by Product Owner decision; `DQ-07` RETRACTED. **Confirmed open defect count is four: `DQ-02`, `DQ-05`, `DQ-06`, `DQ-08`.**

No further ticket is activated. `RESIDUAL-01` and `RESIDUAL-02` remain reported candidates only, not authorized scope.
