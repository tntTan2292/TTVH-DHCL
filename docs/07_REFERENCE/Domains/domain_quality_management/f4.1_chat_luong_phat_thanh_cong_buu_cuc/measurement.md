---
title: Measurement
purpose: Công thức KPI F4.1 và mốc đối soát bắt buộc mọi triển khai tương lai phải tái tạo được
owner: Product Owner
ssot: True
dependencies: business_rules.md
version: 1.0.0
---

# Measurement & Formulas

## 1. F4_001: Module KPI (HUE Lane)

```
F4_001 = COUNT(danh_gia_co_tms_ptc_8h = 'Đạt') / COUNT(*)
```

over every row of `fact_f41` for the selected date. **The denominator is total rows — never `sl_bg_ptc`, never a filtered subset.** This is the single most important formula in this package; see `business_rules.md` §2 for why the F1.3-pattern denominator is explicitly forbidden here.

For `2026-08-01`: `2.863 / 4.695 = 60,98%` (PO-2, exact).

## 2. F4_002: BCVH Ranking Subtotal (HUE Lane, Six Canonical BCVH Only)

```
F4_002 = SUM(dat over the 6 canonical BCVH) / SUM(total over the 6 canonical BCVH)
```

`531120` excluded (`business_rules.md` §6). For `2026-08-01`: `2.862 / 4.694 = 60,97%`.

`F4_001` and `F4_002` are **both correct and intentionally different**. Any screen or report showing both must label them distinctly — e.g. "Toàn tỉnh (mọi bưu cục)" vs "6 BCVH xếp hạng" — never as a single unlabeled percentage.

## 3. F4_003: TCT Lane Published Rate (Reference Only, Never A Substitute For F4_001)

```
F4_003 = idx28 (Tỷ lệ gửi PTC 8 giờ tại bưu cục có quét TMS) — published directly by the TCT report, per-unit
```

For Huế, `2026-08-01`: TCT reports `2.863 / 4.684 = 61,12%` (idx 27 / idx 10). This is **not** recomputed by the module — it is the value the national report itself publishes, stored and displayed as-is, and never blended with `F4_001`. See `business_rules.md` §11-12.

## 4. Reconciliation Baseline — `2026-08-01`, HUE Lane (Per-BCVH)

Reproduced directly from the audited source file; every implementation must reproduce this table exactly once `fact_f41` exists.

| Mã BCVH | Tên BC phát | Tổng | Đạt | Không đạt | Trống | Tỷ lệ |
| --- | --- | --- | --- | --- | --- | --- |
| 533140 | BCVH Thuận Hóa | 2.184 | 1.494 | 539 | 151 | 68,41% |
| 535470 | BCVH Hương Trà | 736 | 390 | 301 | 45 | 52,99% |
| 537220 | BCVH Phú Lộc | 580 | 62 | 489 | 29 | 10,69% |
| 536250 | BCVH Hương Thủy | 509 | 347 | 155 | 7 | 68,17% |
| 535790 | BCVH A Lưới | 346 | 268 | 76 | 2 | 77,46% |
| 537015 | BCVH Thuận An | 339 | 301 | 21 | 17 | 88,79% |
| 531120 | Khách hàng lớn | 1 | 1 | 0 | 0 | 100,00% |
| — | **F4_001 — Tổng toàn tỉnh (module KPI)** | **4.695** | **2.863** | **1.581** | **251** | **60,98%** |
| — | **F4_002 — 6 BCVH Ranking (không gồm 531120)** | **4.694** | **2.862** | **1.581** | **251** | **60,97%** |

## 5. Reconciliation Baseline — `2026-08-01`, TCT Lane (Huế Row, Cross-Lane Check)

| Quantity | HUE row-level (`F4_001` source) | TCT Huế row |
| --- | --- | --- |
| Numerator (`Đạt`, PO-1 metric) | 2.863 | 2.863 (exact match) |
| Denominator | 4.695 | 4.684 |
| Rate | 60,98% (`F4_001`, authoritative) | 61,12% (`F4_003`, published reference only) |

Six further evaluation measures also match exactly between the two lanes on this date (`PTC 8h XNĐ BD1` 2.889, `PTC lần đầu 8h XNĐ BD1` 2.855, `PTC lần đầu 8h có quét TMS` 2.831, `so sánh 12,5h Đạt` 3.341, `so sánh 12,5h Không đạt` 1.112, `so sánh 72h Đạt` 4.194) — proving both lanes measure the same population on the same day, even though their published rate differs. See `business_rules.md` §12 for the unresolved, non-blocking `11`-row denominator gap.

## 6. Breakdown Of The 251 Blank-Evaluation Rows (HUE Lane, `2026-08-01`)

All `251` remain in the `F4_001` denominator (§1). Their composition, exhaustively re-audited row-by-row — **do not generalize this to "all blanks are returns"**:

| Group | Count | Proven field pattern |
| --- | --- | --- |
| A | 241 | `Thời gian chuyển hoàn` present, `Thời gian PTC` absent — evidenced return. |
| B | 9 | `Thời gian PTC` present, `Thời gian chuyển hoàn` absent, `Thời gian TMS XNĐ BCP` absent. Cause not asserted. |
| C | 1 | Neither `Thời gian PTC` nor `Thời gian chuyển hoàn`; `Thời gian TMS XNĐ BCP` present. Cause not asserted. |

`241 + 9 + 1 = 251`. Zero rows carry both a return timestamp and a PTC timestamp.

## 7. Comparative/Period Measures — Not Yet Defined

F1.3 supports day-over-day (`D1`), same-weekday-comparison (`D7`), and month-to-date comparisons (`F13DashboardService._shiftDate`, `_getMonthStart`, `_getPreviousMonthComparablePeriod`). Only one F4.1 HUE day (`2026-08-01`) exists at the time this package was written, so **no period-comparison formula for F4.1 can be validated yet**. Building the multi-day capability itself is not blocked — only the *acceptance* of any comparison output waits until a second HUE day exists. Do not invent a comparison baseline from one day of data.
