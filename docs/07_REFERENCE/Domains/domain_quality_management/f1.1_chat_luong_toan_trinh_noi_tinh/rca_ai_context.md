---
title: RCA & AI Context
purpose: Rào chắn tránh các suy diễn sai đã phát hiện khi audit nguồn F1.1
owner: AI Engineer
ssot: True
dependencies: measurement.md
version: 1.0.0
---

# RCA & AI Context

Each guardrail names the mistake it prevents.

## 1. Never exclude blank evaluations from the denominator
The portal's own summary excludes unevaluable rows (`2.348 / 2.588 = 90,73 %`). The Product Owner decided otherwise (PD-9): `2.348 / 2.621 = 89,58 %`. Using the portal view silently changes the headline.

## 2. Never use the PO's pasted Excel sheets as numeric truth
`Bảo_F1.1 (23.09.2026).xlsx` sheet `F1.1 Ngay` has a total row that disagrees with its own body rows (188 vs 670). `Đánh giá CLP F1.1.xlsx` sheets are internally consistent but belong to other days and are not a reconciliation source (PD-12). Only raw portal exports are inputs.

## 3. Never recompute `Thời gian thực tế` or the evaluations
The source subtracts a night allowance (observed: 0 h when start and end fall on the same calendar day, 10 h when they cross midnight, plus ~1 % exceptions). The rule belongs to DKCL. Store and show the source values; show stage hop durations only as labelled raw timestamp differences.

## 4. The clock start is not `Chấp nhận`
It is `Nhận tin thu gom` when present (80 % of rows), else `Chấp nhận`. Using `Chấp nhận` alone reproduces the source elapsed time on far fewer rows.

## 5. Do not take the business date from cells
The 2026-10-07 file has PTC dates 07/10 (2.584), 08/10 (14) and empty (23), and acceptance dates over 14 days. The date is the file name (PD-10).

## 6. 531110 and 531120 are in the total but not in the ranking
Two labelled totals (`89,58 %` / `89,54 %`), never one unlabelled figure.

## 7. TCT and Huế are the same data; the national value is a published reference
The national rate excludes unevaluable rows; the Huế dashboard counts them as 0 Đạt. Both are right; never substitute one for the other.

## 8. A TCT file must be one business day — check the Huế row
A two-day TCT download was once sent by mistake: its Huế row equalled the 2026-10-07 detail **plus** another 1.982 / 1.950 / 1.665 parcels. The single-day file equals the detail exactly. Before trusting any TCT file, compare its Huế row with the Huế detail of the same date; a surplus means a wrong date range, not a partial Huế export.

## 9. Do not invent violation stages
The labels in the PO's hidden sheets (chậm thu gom/chấp nhận, đóng chuyển, đóng lạc hướng, giao bưu tá, cập nhật TTP, nộp tiền, khách quan) are candidates for training sessions, not rules.

## 10. Portal schema drifts
52 → 55 columns already happened. Parse by header name; never by position or column count.
