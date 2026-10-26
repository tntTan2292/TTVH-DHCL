---
title: Measurement
purpose: Công thức KPI F4.2 và mốc đối soát bắt buộc mọi triển khai phải tái tạo được
owner: Product Owner
ssot: True
dependencies: business_rules.md
version: 1.0.0
---

# Measurement & Formulas — F4.2

## 1. F42_001: KPI tỉnh (HUE lane)

```
F42_001 = COUNT(danh_gia = 'Đạt') / COUNT(*)      over fact_f42 of the period
```

Mẫu số là **mọi dòng**, không loại dòng `danh_gia IS NULL`.

2026-10-10: `4.475 / 6.466 = 69,21 %`.

## 2. F42_002: KPI BCVH và bưu tá

Cùng công thức, nhóm theo `ma_bc_phat` (BCVH) hoặc `ma_bc_phat` + `ma_buu_ta` (bưu tá). Các BCVH cộng lại bằng F42_001; bưu tá của một BCVH cộng lại bằng BCVH đó.

## 3. F42_003: tỷ lệ công bố toàn quốc (tham chiếu)

```
F42_003(tỉnh) = SUM(sl_dung_qd) / SUM(sl_gbt)   over fact_f42_national rows of that delivering province
```

Cột DKCL: `sl_gbt` = cột 14, `sl_dung_qd` = cột 17. Xếp hạng 34 mã cố định (BR-6). Với Huế, F42_003 = F42_001.

## 4. Đối chiếu màn hình DKCL (2026-10-10)

| Cột DKCL | Giá trị | Từ file chi tiết |
| --- | --- | --- |
| 14 SL GBT có thông tin phát | 6.466 | mọi dòng |
| 15 phát thành công | 5.232 (80,92 %) | Đạt + Không đạt |
| 17 PTC đúng QĐ 11,5 giờ | 4.475 | dòng Đạt |
| 18 = 17/14 | 69,21 % | F42_001 |

## 5. Baseline — 2026-10-10

- Huế: 6.466 dòng, 4.475 Đạt, 757 Không đạt, 1.234 chưa có đánh giá (1.141 chưa phát, 93 chuyển hoàn), 128 bưu tá.
- Hạng toàn quốc: Huế **26 / 34** (1 Cao Bằng 84,23 %, 2 Quảng Trị 83,26 %, 3 TP HCM 82,91 %, 34 Tuyên Quang 53,78 %); tổng 34 tỉnh 390.363 / 511.645 = 76,30 %.

| BCVH | Mã BC | Tổng | Đạt | Không đạt | Tỷ lệ |
| --- | --- | --- | --- | --- | --- |
| BCVH Thuận Hóa | 533140 | 3.518 | 2.367 | 255 | 67,28 % |
| BCVH Hương Trà | 535470 | 907 | 645 | 184 | 71,11 % |
| BCVH Hương Thủy | 536250 | 820 | 519 | 233 | 63,29 % |
| BCVH Phú Lộc | 537220 | 594 | 391 | 68 | 65,82 % |
| BCVH Thuận An | 537015 | 425 | 362 | 11 | 85,18 % |
| BCVH A Lưới | 535790 | 202 | 191 | 6 | 94,55 % |
