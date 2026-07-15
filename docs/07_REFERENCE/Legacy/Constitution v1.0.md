# TTVH QUALITY INTELLIGENCE SYSTEM

# Constitution v1.0

---

# 1. Mục tiêu hệ thống

TTVH Quality Intelligence System (QIS) là hệ thống hỗ trợ điều hành chất lượng tập trung của Trung tâm Vận hành.

Hệ thống được xây dựng nhằm:

- Theo dõi kết quả chất lượng hàng ngày.
- Theo dõi xu hướng tuần, tháng, quý.
- Xác định đơn vị kéo giảm chỉ tiêu.
- Xác định nguyên nhân chủ quan ảnh hưởng chất lượng.
- Hỗ trợ điều hành dựa trên dữ liệu.
- Chuẩn hóa phương pháp phân tích giữa các chỉ tiêu.

---

# 2. Phạm vi hệ thống

Hệ thống bao gồm các module:

| Module | Chỉ tiêu |
|----------|----------|
| F1.1 | Chất lượng liên tỉnh nội tỉnh |
| F1.2 | Chất lượng thu gom liên tỉnh |
| F1.3 | Chất lượng phát liên tỉnh |
| F4.1 | Chất lượng phát Bưu cục |

Trong giai đoạn 1:

> **F1.3 là Pilot Module.**

Mọi kiến trúc, công thức và dashboard được hoàn thiện trên F1.3 trước khi nhân rộng sang các chỉ tiêu khác.

---

# 3. Đối tượng sử dụng

## Cấp 1 - Giám đốc TTVH

### Nhu cầu

- Xem nhanh tình hình toàn mạng.
- Xác định BCVH cần điều hành.
- Theo dõi xu hướng.

---

## Cấp 2 - Phòng Điều hành TTVH

### Nhu cầu

- Phân tích nguyên nhân.
- Xác định tuyến phát rủi ro.
- Theo dõi đơn vị kéo giảm chất lượng.

---

## Cấp 3 - BCVH

### Nhu cầu

- Theo dõi chất lượng đơn vị.
- Theo dõi tuyến phát.
- Theo dõi nguyên nhân phát sinh.

---

# 4. Nguyên tắc thiết kế

## 4.1 Single Source of Truth

Mọi KPI chính thức phải khớp:

- Dashboard Tổng công ty.
- Báo cáo Tổng công ty.
- File dữ liệu chi tiết.

Không được tự ý tính lại KPI chính.

---

## 4.2 Root Cause First

Hệ thống không chỉ hiển thị kết quả.

Mỗi KPI phải có khả năng truy vết nguyên nhân.

### Ví dụ

Không chỉ biết:

```text
F1.3 = 39,35%
```

Mà phải biết:

```text
65% số BG không đạt liên quan nộp tiền muộn.
```

---

## 4.3 Actionable Insight

Mọi dashboard phải trả lời được:

> TTVH cần hành động gì tiếp theo?

Không xây dựng dashboard chỉ để xem số.

---

## 4.4 Drill Down

Người dùng phải có khả năng phân tích:

```text
Toàn mạng
↓
BCVH
↓
Tuyến phát
↓
Bưu gửi
```

---

## 4.5 Daily Operation First

Ưu tiên phục vụ điều hành hàng ngày.

Các phân tích tuần/tháng được xây dựng trên cùng một nền dữ liệu.

---

# 5. Kiến trúc phân tích chuẩn

Mọi module KPI đều phải tuân theo cấu trúc:

## Tầng 1 - Executive

Kết quả toàn mạng.

---

## Tầng 2 - BCVH Ranking

Xếp hạng đơn vị.

---

## Tầng 3 - Impact Analysis

Đơn vị ảnh hưởng KPI toàn mạng.

---

## Tầng 4 - Root Cause Analysis

Nguyên nhân chủ quan.

---

## Tầng 5 - Operational Analysis

Tuyến phát, bưu tá, khu vực.

---

## Tầng 6 - Pareto Analysis

20% đối tượng gây ra 80% vấn đề.

---

# 6. Quy tắc phân loại chỉ số

Hệ thống chia thành 3 nhóm:

## A. KPI Chính thức

### Nguồn

Tổng công ty.

### Ví dụ

- F1.1
- F1.2
- F1.3
- F4.1

Không được tự tính.

---

## B. KPI Điều hành

Do TTVH định nghĩa.

### Ví dụ

- Tỷ lệ chậm nộp tiền.
- Tỷ lệ phát muộn.
- Tỷ lệ tồn cuối ngày.

---

## C. Root Cause Indicator

Chỉ số phân tích nguyên nhân.

### Ví dụ

- BG không đạt do nộp tiền muộn.
- BG không đạt do phát muộn.
- BG không đạt do nguyên nhân khác.

---

# 7. Chu kỳ dữ liệu

## Daily

Điều hành hàng ngày.

---

## Weekly

Xu hướng tuần.

---

## Monthly

Xu hướng tháng.

---

## YTD

Lũy kế năm.

---

# 8. Nguyên tắc phát triển

## Constitution Freeze

Mọi thay đổi:

- KPI
- Dashboard
- Công thức

phải được cập nhật vào tài liệu trước khi triển khai.

---

## No Assumption Policy

Không suy diễn dữ liệu.

Nếu không xác định được:

- Công thức
- Ý nghĩa cột
- Logic nghiệp vụ

thì phải hỏi lại.

---

# 9. Lộ trình triển khai

## Phase 1

F1.3 Pilot Module

---

## Phase 2

F1.1

---

## Phase 3

F1.2

---

## Phase 4

F4.1

---

## Phase 5

Executive Dashboard TTVH

---