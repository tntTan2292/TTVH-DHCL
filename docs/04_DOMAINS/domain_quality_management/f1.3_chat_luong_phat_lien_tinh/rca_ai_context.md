---
title: RCA & AI Context
purpose: Root Cause Analysis và kịch bản phân tích
owner: AI Engineer
ssot: True
dependencies: measurement.md
version: 1.0.0
---

# Root Cause Analysis (RCA)

Chỉ thực hiện phân tích nguyên nhân trên nhóm: **Bưu gửi Không đạt F1.3**. Không phân tích nhóm Đạt.
Trả lời câu hỏi: Vì sao BCVH thấp?

## 1. RCA Nộp Tiền Muộn

### F13_301: Bưu gửi có nộp tiền
- **Điều kiện**: Có thời gian nộp tiền.

### F13_302: Bưu gửi chậm nộp tiền
- **Điều kiện**: `Thời gian nộp tiền - Thời gian PTC > 3 giờ`

### F13_303: Tỷ lệ chậm nộp tiền
- **Công thức**: `Số BG chậm nộp tiền / Tổng số BG Không đạt`
- **Phạm vi**: BCVH, Tuyến phát, Toàn mạng

### F13_401: Bưu gửi Không đạt nộp tiền muộn
- **Điều kiện**: `Không đạt F1.3 AND (Thời gian nộp tiền - Thời gian PTC > 3 giờ)`


## 2. Nhóm Nguyên Nhân Khác (TODO - Waiting Product Owner)
- Chậm phát
- Chậm khai thác
- Chậm điều độ
(Dành cho tương lai, hiện chưa triển khai).

## 3. Pareto Analysis
Tìm đúng nơi gây lỗi. 20% tuyến gây ra 80% Bưu gửi Không đạt.

### F13_601: Xếp hạng tuyến theo Bưu gửi Không đạt
- Theo số lượng Bưu gửi Không đạt.

### F13_602: Tỷ lệ tích lũy Pareto
- **Công thức**: `Lũy kế Không đạt / Không đạt toàn mạng`