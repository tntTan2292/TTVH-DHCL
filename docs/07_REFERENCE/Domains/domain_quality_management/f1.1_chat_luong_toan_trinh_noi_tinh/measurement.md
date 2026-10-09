---
title: Measurement
purpose: Công thức KPI F1.1 và mốc đối soát bắt buộc mọi triển khai tương lai phải tái tạo được
owner: Product Owner
ssot: True
dependencies: business_rules.md
version: 1.0.0
---

# Measurement & Formulas

## 1. F11_001: Module KPI (HUE lane)

```
F11_001 = COUNT(danh_gia_2026 = 'Đạt') / COUNT(*)
```

over every row of `fact_f11` for the selected period. **The denominator is total rows**; blank evaluations count as 0 Đạt (PD-9). Volume = `COUNT(*)`, passed = `= 'Đạt'`.

For 2026-10-07: `2.348 / 2.621 = 89,58 %`.

## 2. F11_002: BCVH Ranking subtotal (six canonical BCVH only)

```
F11_002 = SUM(Đạt over the 6 canonical BCVH) / SUM(rows over the 6 canonical BCVH)
```

`531110` and `531120` excluded. For 2026-10-07: `2.338 / 2.611 = 89,54 %`. F11_001 and F11_002 are both correct and different; any screen showing both labels them distinctly ("Toàn tỉnh (mọi bưu cục)" vs "6 BCVH xếp hạng").

## 3. F11_003: Pair rate (accepting office → delivering BCVH)

```
F11_003(office, bcvh) = COUNT(Đạt) / COUNT(*)  where ma_bc_chap_nhan = office AND ma_bc_phat = bcvh
```

Rows and columns of the pair table sum to the module/BCVH figures by construction. Day, week and month use the same formula over the period.

## 4. F11_004: National published rate (reference, never a substitute for F11_001)

```
F11_004(province) = SUM(đúng chỉ tiêu) / SUM(SL theo chỉ tiêu)
                    over ALL rows of fact_f11_national whose ma_tinh_phat = province   -- whatever the accepting province
```

PD-17: rows are grouped by the **delivering province**; a province with several rows has its numerators and denominators added first, and only then the rate is computed and ranked. Rank among the 34 frozen province codes (other delivery codes are not ranked), descending, ties by volume, not merged. It excludes unevaluable rows (portal definition) and therefore legitimately differs from F11_001 by those rows.

## 5. Blank-evaluation flag (PD-9, derived at read time, never stored)

A row with blank `danh_gia_2026` is shown as "Chưa có đánh giá" with the first matching reason:

| Order | Reason | Condition |
| --- | --- | --- |
| 1 | `CHUA_PTC` — chưa phát thành công / chưa nộp tiền | no `thoi_gian_ptc` and no `thoi_gian_nop_tien_cod` |
| 2 | `PTC_SAU_NGAY_DO_KIEM` — hoàn tất sau ngày đo kiểm | the PTC (else nộp tiền) date is later than `ngay_do_kiem` |
| 3 | `THIEU_CHI_TIEU_PHUONG` — thiếu chỉ tiêu phường xã | `thoi_gian_chi_tieu_2026` is null |
| 4 | `KHAC` | none of the above |

## 6. Baseline — 2026-10-07, HUE lane (every implementation must reproduce this)

| Mã BC phát | Đơn vị | Tổng | Đạt | Không đạt | Trống | Tỷ lệ |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 533140 | BCVH Thuận Hóa | 1.801 | 1.713 | 73 | 15 | 95,11 % |
| 535470 | BCVH Hương Trà | 273 | 205 | 53 | 15 | 75,09 % |
| 536250 | BCVH Hương Thủy | 248 | 183 | 64 | 1 | 73,79 % |
| 535790 | BCVH A Lưới | 84 | 74 | 10 | 0 | 88,10 % |
| 537220 | BCVH Phú Lộc | 132 | 96 | 35 | 1 | 72,73 % |
| 537015 | BCVH Thuận An | 73 | 67 | 5 | 1 | 91,78 % |
| 531110 | TT Hành chính công | 9 | 9 | 0 | 0 | 100 % |
| 531120 | Khách hàng lớn | 1 | 1 | 0 | 0 | 100 % |
| — | **F11_001 — Tổng (module KPI)** | **2.621** | **2.348** | 240 | 33 | **89,58 %** |
| — | **F11_002 — 6 BCVH Ranking** | **2.611** | **2.338** | 240 | 33 | **89,54 %** |

Blank split (33): `PTC_SAU_NGAY_DO_KIEM` 13, `THIEU_CHI_TIEU_PHUONG` 1, `CHUA_PTC` 19. Separately, 23 rows have no PTC at all: those 19 plus 4 that the source already marks `Không đạt` (overdue, undelivered); the 4 are inside the 240 `Không đạt` and are not blank. One more `Không đạt` row has its PTC on 08/10.

For comparison only (the portal's evaluated-rows view, **not** the system figure): `2.348 / 2.588 = 90,73 %`; six BCVH `2.338 / 2.578 = 90,69 %`. The `Đánh giá 2025` view: `2.400 / 2.571 = 93,35 %`.

## 7. Cross-lane check

For a date loaded in both lanes, the Huế row (53 → 53) of `fact_f11_national` equals the Huế detail aggregated on the **evaluated-rows view**. The single-day reference TCT file (2026-10-07) has the Huế row `2.588` evaluated / `2.348` đúng chỉ tiêu (`90,73 %`; the ≤ 24 h view is `92,70 % = 2.400 / 2.589`), equal to the Huế detail on every reproducible count column (Checkpoint Section 25.7). Huế ranks **4th of 34** on that day by the published rate grouped by delivering province (Cao Bằng 94,40 %, Quảng Trị 92,78 %, Lạng Sơn 92,44 %, Huế 90,73 %, Điện Biên 90,07 %; Hà Nội 85,85 % = 12th, TP Hồ Chí Minh 82,76 % = 18th after adding their several rows). The Huế dashboard rate of the same day is `89,58 %` (F11_001): labelled apart, never substituted.
