---
title: Testing Scenarios
purpose: Kịch bản kiểm thử bắt buộc cho cả hai luồng F4.1 khi triển khai
owner: QA
ssot: True
dependencies: business_rules.md
version: 1.0.0
---

# Testing Scenarios

Implementation status: the Phase 1/2 product tables now exist (`fact_f41`, `fact_f41_national`). These scenarios remain the acceptance/regression bar for the implemented contracts.

## 1. HUE Parser

| ID | Scenario | Expected |
| --- | --- | --- |
| T-HUE-01 | Parse the real audited file `F4.1-2026.08.01.xlsx` (HUE) unmodified. | Exactly `4.695` rows; `2.863` `Đạt` / `1.581` `Không đạt` / `251` blank on `danh_gia_co_tms_ptc_8h`. |
| T-HUE-02 | Header row missing `Số hiệu bưu gửi`. | Hard parse error, matching F1.3's `REQUIRED_COLUMN` guard behavior. |
| T-HUE-03 | Filename `F4.1-2026.08.01.xlsx`. | `ngay_do_kiem = '2026-08-01'`, from filename only. |
| T-HUE-04 | Filename `F1.3-2026.08.01.xlsx` fed to the F4.1 parser. | Rejected — the F4.1 filename pattern requires the `F4.1-` prefix; F1.3-prefixed files are never accepted by the F4.1 lane. |
| T-HUE-05 | Filename with an invalid/missing date (e.g. `F4.1-hue.xlsx`). | Hard parse error. No fallback date. |
| T-HUE-06 | A duration cell with an unpadded minute (`46:7`) or an hour ≥ 24 (`107:38`). | Stored as raw TEXT unchanged; never coerced to a time value; never rejected. |
| T-HUE-07 | A row with `Thời gian PTC` as a native Excel date-serial cell (hypothetical future file variant). | Out of scope for this contract version — the audited file has none; flag rather than silently coerce if ever encountered. |

## 2. HUE KPI And Denominator

| ID | Scenario | Expected |
| --- | --- | --- |
| T-KPI-01 | Compute `F4_001` over the full imported `2026-08-01` dataset. | `2.863 / 4.695 = 60,98%`, exactly matching `measurement.md` §1/§4. |
| T-KPI-02 | Compute `F4_001` using the F1.3-pattern denominator (`sl_bg_ptc`-equivalent, i.e. rows with `thoi_gian_ptc` set) by mistake. | Must be caught by a regression test asserting the result is **not** `64,29%` — this is the exact defect this contract exists to prevent. |
| T-KPI-03 | Compute `F4_002` (BCVH Ranking subtotal). | `2.862 / 4.694 = 60,97%`, excluding `531120`. |
| T-KPI-04 | Assert `F4_001 ≠ F4_002` on this dataset and that both are simultaneously correct. | Both values present and distinctly labelled wherever shown together. |
| T-KPI-05 | Per-BCVH breakdown. | Matches `measurement.md` §4 exactly for all 7 units (6 canonical + `531120`). |

## 3. `531120` Handling

| ID | Scenario | Expected |
| --- | --- | --- |
| T-531-01 | Import a dataset containing a `531120` row. | Row is stored in `fact_f41` like any other row. |
| T-531-02 | Compute the module KPI (`F4_001`). | `531120`'s row is included in both numerator and denominator. |
| T-531-03 | Render BCVH Ranking. | `531120` does not appear as a row. |
| T-531-04 | Assert no `531120` string literal exists in the ranking-exclusion logic. | Exclusion is implemented by reusing `canonicalBcvhUnits.js`, not a hardcoded code. |

## 4. Blank-Evaluation Rows (Section 6 Of `measurement.md`)

| ID | Scenario | Expected |
| --- | --- | --- |
| T-BLANK-01 | Count rows with `danh_gia_co_tms_ptc_8h` blank. | `251`, all retained in the `F4_001` denominator. |
| T-BLANK-02 | Classify the 251 blanks by the Group A/B/C field pattern (`measurement.md` §6). | `241 / 9 / 1`, summing to `251`. |
| T-BLANK-03 | Any code or documentation that asserts "all blank-evaluation rows are returns". | Must fail review — only Group A (`241`) is evidenced as a return; Groups B and C have no asserted cause. |

## 5. Delayed-Cash / Reason Classification (HUE Lane)

| ID | Scenario | Expected |
| --- | --- | --- |
| T-REASON-01 | A `Không đạt` row with both `thoi_gian_ptc` and `thoi_gian_nop_tien` present, gap > 3h. | Classified `Chậm nộp tiền`, using the same `RULE_F13_302` threshold F1.3 uses. |
| T-REASON-02 | A `Không đạt` row with both timestamps present, gap ≤ 3h. | Classified `Không đạt khác`. |
| T-REASON-03 | A `Không đạt` row missing either timestamp. | Classified `Chưa xác định nguyên nhân`. |
| T-REASON-04 | Any TCT-sourced row. | Never enters reason classification — the TCT lane has no rows to classify. |

## 6. TCT Parser

| ID | Scenario | Expected |
| --- | --- | --- |
| T-TCT-01 | Parse the real audited file `F4.1-2026.08.01.xlsx` (TCT) unmodified. | Exactly `46` raw unit rows read; the grand-total row (row 4) is **not** accepted as a unit row; exactly `34` F1.3-parity province/city rows are returned for storage. |
| T-TCT-02 | Encounter non-province operational/legacy rows such as `01`, `08`, `11`, `12`, `14`, `15`, `34`, `49`, `71`, `75`, `77`, `82`. | These `12` rows are excluded from `fact_f41_national`, with code/name evidence exposed for validation. |
| T-TCT-03 | A published `Tỷ lệ` percent-string column. | Stored as raw TEXT unchanged; never parsed into a float. |
| T-TCT-04 | `Mã tỉnh` mixed string/number typing (`"01"` vs `10`). | Normalized to a zero-padded string on ingest. |
| T-TCT-05 | Filename with an invalid/missing date. | Hard parse error — the TCT file has no date field of any kind to fall back on. |
| T-TCT-06 | Attempt to write a TCT row into `fact_f41`, or a HUE row into `fact_f41_national`. | Rejected — the two tables are never cross-populated. |
| T-TCT-07 | Missing/shifted two-level header, malformed formula legend row, missing row-4 grand total, or grand-total counts that do not reconcile to the 46 raw rows. | Hard F4.1 TCT format error before any unit row is returned. |

## 7. Cross-Lane Reconciliation

| ID | Scenario | Expected |
| --- | --- | --- |
| T-XLANE-01 | Compare `F4_001` (HUE) against the TCT Huế row's `idx 27` numerator for the same date. | Numerators match exactly (`2.863 = 2.863`). |
| T-XLANE-02 | Compare `F4_001`'s denominator against the TCT Huế row's `idx 10`. | Denominators legitimately differ (`4.695` vs `4.684`); test asserts the difference is `11`, not that they match. |
| T-XLANE-03 | Any screen displaying both `F4_001` and `F4_003` (TCT reference rate) together. | Both labelled distinctly; `F4_003` never overwrites or is averaged with `F4_001`. |

## 8. Role Gating

| ID | Scenario | Expected |
| --- | --- | --- |
| T-ROLE-01 | `viewer` requests Dashboard/BCVH Ranking/Evidence for F4.1. | `200`, allowed. |
| T-ROLE-02 | `viewer` requests F4.1 Import (any endpoint). | `403`, denied. |
| T-ROLE-03 | `admin` requests any F4.1 endpoint, including Import. | `200`, allowed. |

## 9. Scope Boundaries

| ID | Scenario | Expected |
| --- | --- | --- |
| T-SCOPE-01 | Any request or UI affordance for "F4.1 Tuyến Ranking". | Does not exist — no route to build it against, by design (`business_rules.md` §4). |
| T-SCOPE-02 | Any code path that reads or writes `fact_f13` while implementing F4.1. | None exists — F4.1 is fully additive; a regression test on the F1.3 suite passing unchanged is the proof. |
