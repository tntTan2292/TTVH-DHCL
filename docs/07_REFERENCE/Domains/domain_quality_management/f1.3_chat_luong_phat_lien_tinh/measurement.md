---
title: Measurement
purpose: Công thức tính toán và chỉ số đo lường
owner: Product Owner
ssot: True
dependencies: business_rules.md
version: 1.0.0
---

# Measurement & Formulas

Một chỉ số chỉ có duy nhất một công thức. Single Source Of Truth.

## 1. KPI Chính Thức

### F13_001: F1.3
- **Nguồn**: Dashboard Tổng công ty
- **Công thức**: Theo Tổng công ty.
- **Ghi chú**: Không được tự tính lại.

## 2. Chỉ Số Điều Hành

### F13_101: Tổng Bưu gửi
- **Công thức**: Tổng số Bưu gửi trong tập dữ liệu

### F13_102: Bưu gửi Đạt
- **Công thức**: Số Bưu gửi có kết quả Đạt

### F13_103: Bưu gửi Không đạt
- **Công thức**: Số Bưu gửi có kết quả Không đạt

### F13_104: Tỷ lệ Không đạt
- **Công thức**: `Bưu gửi Không đạt / Tổng Bưu gửi`

### F13_105: Record-level NULL
- `ket_qua_f13 = NULL` may represent a returned shipment.
- Returned shipments remain part of the F1.3 evaluation population.
- Returned shipments remain included in `total_volume`.
- `NULL` in this context is a valid business state and must not automatically be treated as missing, invalid, corrupt, or unavailable data.

### F13_106: Missing calendar date
- A missing calendar date means no operational fact records exist for the date.
- For a missing calendar date:
  - `total_volume = 0`
  - `passed = 0`
  - `failed = 0`
  - `quality_rate = null`
  - `data_available = false`

## 3. Impact Analysis

### F13_201: Không đạt toàn mạng
- **Công thức**: Tổng Bưu gửi Không đạt toàn mạng

### F13_202: % Không đạt toàn mạng
- **Công thức**: `Bưu gửi Không đạt BCVH / Không đạt toàn mạng`
- **Mục đích**: Xác định BCVH kéo giảm KPI nhiều nhất.

## 4. Phân Tích Tuyến Phát

### F13_501: F1.3 tuyến phát
- **Công thức**: Theo kết quả Bưu gửi thuộc tuyến.

### F13_502: Bưu gửi Không đạt tuyến
- **Công thức**: Số Bưu gửi Không đạt thuộc tuyến

### F13_503: Tỷ trọng Không đạt tuyến
- **Công thức**: `Bưu gửi Không đạt tuyến / Không đạt toàn mạng`

## 5. So Sánh Thời Gian (SWC)
- **Ghi chú SWC (Same Weekday Comparison)**: 
  - Chỉ áp dụng cho Dashboard ngày.
  - Công thức: `Current Date` vs `Current Date - 7 ngày`.
  - Hiển thị song song: KPI hiện tại, Delta DoD, Delta SWC.
  - Tuyệt đối không áp dụng SWC cho RCA, Pareto, Drilldown nguyên nhân.

## 6. Phân tích khác (TODO - Waiting Product Owner)
- Tuần này vs Tuần trước (QĐ8 – Period Comparison Analytics)
- Tháng này vs Tháng trước
- 30 ngày gần nhất vs 30 ngày liền trước
(DEFERRED TO PHASE 1C)
