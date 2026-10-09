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
F11_004(province) = SUM(đúng chỉ tiêu) / SUM(SL theo chỉ tiêu)   -- same-province rows of fact_f11_national, as published
```

Rank among the 34 frozen province codes, descending, ties by volume, not merged. It excludes unevaluable rows (portal definition) and therefore legitimately differs from F11_001 by those rows.

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

For a date loaded in both lanes, the Huế row (53 → 53) of `fact_f11_national` equals the Huế detail aggregated on the **evaluated-rows view**. The reference TCT file's Huế row is `4.538` evaluated / `4.013` đúng chỉ tiêu (88,43 %); it equals the 2026-10-07 detail (`2.588` / `2.348`) **plus** a second block of `1.950` / `1.665` on 13 recomputed columns — see Checkpoint Section 25 (G-5/G-6) and the open question Q-15.
