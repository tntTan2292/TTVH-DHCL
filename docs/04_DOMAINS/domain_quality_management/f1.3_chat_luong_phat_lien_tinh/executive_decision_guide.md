---
title: Executive Decision Guide
purpose: Hướng dẫn quy trình điều hành và ra quyết định
owner: Product Owner
ssot: True
dependencies: core_knowledge.md
version: 1.0.0
---

# Executive Decision Guide

Tài liệu này hướng dẫn quy trình sử dụng hệ thống QIS để ra quyết định điều hành cho Indicator F1.3.

## 1. Quy Trình Điều Hành Tiêu Chuẩn

### Bước 1: Executive Dashboard (Nhận diện toàn cảnh)
- Giám đốc TTVH quan sát Dashboard trong 30 giây để nắm bắt chỉ số F1.3 hôm nay, so sánh DoD, SWC và lũy kế.
- Xác định trạng thái màu cảnh báo hiện tại (Xanh, Hồng, Vàng, Đỏ).
- Nhận diện Top 5 BCVH kéo giảm KPI toàn mạng.

### Bước 2: Impact Analysis & BCVH Ranking (Khoanh vùng đơn vị yếu)
- Phân tích mức độ ảnh hưởng của từng BCVH đối với kết quả toàn mạng.
- Sử dụng bảng xếp hạng để định vị chính xác đơn vị cần điều hành (Ví dụ: "Hương Thủy, Phú Lộc và Hương Trà chiếm 58% số Bưu gửi không đạt toàn mạng").

### Bước 3: Root Cause Analysis - RCA (Xác định nguyên nhân gốc)
- Chọn đơn vị yếu kém để thực hiện RCA.
- Phân tích nguyên nhân: Đặc biệt chú ý "Nộp tiền muộn" (Thời gian nộp tiền - Thời gian PTC > 2 giờ).
- Trả lời câu hỏi: Bao nhiêu % số Bưu gửi rớt F1.3 liên quan đến lỗi nộp tiền muộn?
- *Các nguyên nhân khác (Chậm phát, chậm khai thác, chậm điều độ): TODO - Waiting Product Owner.*

### Bước 4: Drill Down & Pareto Analysis (Điều hành cấp Tuyến phát)
- Khoanh vùng 20% tuyến phát gây ra 80% Bưu gửi Không đạt.
- Thực hiện Drill Down từ BCVH -> Tuyến phát -> Danh sách Bưu gửi.
- Xác định điểm nghẽn chính xác tại tuyến nào.

### Bước 5: Quyết Định Điều Hành
- TODO - Waiting Product Owner (Chờ bổ sung các hướng dẫn ra quyết định cụ thể dựa trên số liệu).
