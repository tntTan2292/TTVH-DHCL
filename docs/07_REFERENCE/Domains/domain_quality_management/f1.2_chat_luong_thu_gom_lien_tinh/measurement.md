---
title: Measurement
purpose: Công thức KPI F1.2 và mốc đối soát bắt buộc mọi triển khai phải tái tạo được
owner: Product Owner
ssot: True
dependencies: business_rules.md
version: 1.0.0
---

# Measurement & Formulas — F1.2

## 1. F12_001: KPI tỉnh (HUE lane)

```
F12_001 = COUNT(danh_gia = 'Đạt') / COUNT(*)      over fact_f12 of the period
```

2026-10-10: `1.620 / 1.758 = 92,15 %`.

## 2. F12_002: KPI đơn vị / bưu cục

Same formula grouped by `ma_huyen` (unit) or `ma_bc_chap_nhan` (office). Units and offices sum to F12_001.

## 3. F12_003: National published rate (reference)

```
F12_003(province) = SUM(sl_dung_qd) / SUM(sl_bd10_dong_di)   over fact_f12_national rows of that accepting province
```

Ranked over the 34 frozen codes (BR-5). For Huế it equals F12_001 (same day, same definition): checkpoint Section 6.

## 4. Baseline — 2026-10-10

- Huế: 1.758 bưu gửi, 1.620 Đạt, 138 Không đạt, 92,15 %; national row 53 identical; 133 "chưa đủ thông tin" outside the denominator.
- National rank: Huế **8 / 34** (1st TP HCM 99,59 %, 4th Hà Nội 95,70 %, 9th Đà Nẵng 91,57 %, 12th Quảng Trị 90,84 %).

| Mã đơn vị | Đơn vị | Số BC | Tổng | Đạt | Không đạt | Tỷ lệ |
| --- | --- | --- | --- | --- | --- | --- |
| 5375 | BCVH Thuận Hóa (= 531120 Khách hàng lớn) | 1 | 550 | 549 | 1 | 99,82 % |
| 5304 | Bưu điện phường Thuận Hóa | 1 | 230 | 226 | 4 | 98,26 % |
| 5322 | Bưu điện xã Phú Vinh | 4 | 201 | 195 | 6 | 97,01 % |
| 5340 | Bưu điện phường Phú Xuân | 3 | 125 | 117 | 8 | 93,60 % |
| 5319 | Bưu điện phường Phong Quảng | 3 | 61 | 56 | 5 | 91,80 % |
| 5341 | Bưu điện phường Hương Trà | 1 | 51 | 51 | 0 | 100,00 % |
| 5315 | Bưu điện phường Phong Điền | 2 | 48 | 48 | 0 | 100,00 % |
| 5314 | Bưu điện phường Phú Bài | 2 | 47 | 40 | 7 | 85,11 % |
| 5306 | Bưu điện phường Thủy Xuân | 2 | 44 | 44 | 0 | 100,00 % |
| 5302 | Bưu điện phường Mỹ Thượng | 4 | 41 | 32 | 9 | 78,05 % |
| 5329 | Bưu điện xã Chân Mây - Lăng Cô | 3 | 38 | 23 | 15 | 60,53 % |
| 5312 | Bưu điện phường Thanh Thủy | 2 | 30 | 29 | 1 | 96,67 % |
| 5305 | Bưu điện phường An Cựu | 1 | 29 | 27 | 2 | 93,10 % |
| 5321 | Bưu điện xã Quảng Điền | 2 | 27 | 23 | 4 | 85,19 % |
| 5307 | Bưu điện phường Kim Long | 3 | 24 | 14 | 10 | 58,33 % |
| 5300 | Bưu điện phường Thuận An | 3 | 22 | 20 | 2 | 90,91 % |
| 5308 | Bưu điện phường Hương An | 2 | 20 | 19 | 1 | 95,00 % |
| 5326 | Bưu điện xã Hưng Lộc | 2 | 20 | 5 | 15 | 25,00 % |
| 5325 | Bưu điện xã Vinh Lộc | 3 | 17 | 11 | 6 | 64,71 % |
| 5318 | Bưu điện phường Phong Phú | 3 | 16 | 10 | 6 | 62,50 % |
| 5328 | Bưu điện xã Phú Lộc | 1 | 16 | 9 | 7 | 56,25 % |
| 5335 | Bưu điện xã A Lưới 2 | 1 | 15 | 12 | 3 | 80,00 % |
| 5316 | Bưu điện phường Phong Thái | 4 | 12 | 7 | 5 | 58,33 % |
| 5324 | Bưu điện xã Phú Vang | 3 | 12 | 11 | 1 | 91,67 % |
| 5342 | Bưu điện phường Kim Trà | 2 | 12 | 12 | 0 | 100,00 % |
| 5303 | Bưu điện phường Vỹ Dạ | 1 | 10 | 10 | 0 | 100,00 % |
| 5332 | Bưu điện xã Khe Tre | 1 | 10 | 7 | 3 | 70,00 % |
| 5323 | Bưu điện xã Phú Hồ | 1 | 7 | 0 | 7 | 0,00 % |
| 5317 | Bưu điện phường Phong Dinh | 2 | 5 | 2 | 3 | 40,00 % |
| 5327 | Bưu điện xã Lộc An | 1 | 4 | 3 | 1 | 75,00 % |
| 5339 | Bưu điện phường Dương Nỗ | 2 | 4 | 3 | 1 | 75,00 % |
| 5320 | Bưu điện xã Đan Điền | 1 | 3 | 3 | 0 | 100,00 % |
| 5336 | Bưu điện xã A Lưới 3 | 2 | 3 | 1 | 2 | 33,33 % |
| 5301 | Bưu điện phường Hóa Châu | 1 | 1 | 0 | 1 | 0,00 % |
| 5313 | Bưu điện phường Hương Thủy | 1 | 1 | 0 | 1 | 0,00 % |
| 5331 | Bưu điện xã Nam Đông | 1 | 1 | 0 | 1 | 0,00 % |
| 5333 | Bưu điện xã Bình Điền | 1 | 1 | 1 | 0 | 100,00 % |
