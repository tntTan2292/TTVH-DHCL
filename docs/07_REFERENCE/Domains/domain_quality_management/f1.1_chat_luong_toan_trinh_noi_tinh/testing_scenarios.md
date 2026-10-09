---
title: Testing Scenarios
purpose: Kịch bản kiểm thử bắt buộc cho hai luồng F1.1 khi triển khai
owner: QA
ssot: True
dependencies: business_rules.md
version: 1.0.0
---

# Testing Scenarios

Implementation status: Phase 1 delivers the HUE foundation (`fact_f11`, parser, blank flag); everything else below is the acceptance bar for later phases.

## 1. HUE parser (Phase 1)

1. A 52-column workbook parses; the 3 optional columns are `NULL`.
2. A 55-column workbook parses; the 3 optional columns are kept as text.
3. A workbook missing any of the 52 required headers fails and **names the missing header**.
4. File name `F1.1-YYYY.MM.DD.xlsx` gives `ngay_do_kiem`; `F1.3-…`, `F4.1-…`, `F1.1_2026.10.07.xlsx`, `F1.1-2026.13.40.xlsx` and a non-xlsx name are rejected.
5. Code columns (`53`, `533140`, `-1`) are stored as TEXT; empty cells are `NULL`; `Thời gian thực tế` `1169:33` and the ISO KTTỉnh timestamp pass through unchanged.
6. Rows with an empty `Số hiệu bưu gửi` are skipped; all other rows are kept.

## 2. Real-file baseline (Phase 1; skipped when the PO file is absent)

`Data DKCL/F1.1-2026.10.07.xlsx` parses to **2.621 rows**, 0 duplicate `ma_bg`, and, loaded into a temporary database: Đạt 2.348, Không đạt 240, blank 33 (13 / 1 / 19), module rate **89,58 %**, six-unit rate **89,54 %**, every per-unit row of `measurement.md` §6, pair-grid cells summing to each unit's total and to 2.621.

## 3. Schema (Phase 1)

Migration creates `fact_f11` on a fresh database, is idempotent, inserts no data, and leaves `fact_f13`/`fact_f41` row counts unchanged; `UNIQUE(ngay_do_kiem, ma_bg)` rejects a duplicate.

## 4. Blank-evaluation flag

The four reasons of `measurement.md` §5, in order, including a row that matches two conditions (first wins) and a row with a blank evaluation but a PTC date equal to `ngay_do_kiem` and a target (→ `KHAC`).

## 5. Import (Phase 2)

An `F1.1-*.xlsx` never lands in `fact_f13`/`fact_f41` and vice versa; re-import of the same date replaces only that date and changes nothing for the reference file; F1.3/F4.1 import suites pass unchanged.

## 6. TCT (Phase 4)

Total row skipped; 34 required codes present or the day is rejected with the missing codes; a file whose date window is not confirmed as one date is refused; Huế row = Huế detail on the evaluated-rows view.

## 7. Dashboard (later tickets)

Rate 89,58 % not 90,73 %; six-unit 89,54 %; week/month additivity; pair table totals; national rank "x/34" from the published rate; F1.3/F4.1 screens unchanged.
