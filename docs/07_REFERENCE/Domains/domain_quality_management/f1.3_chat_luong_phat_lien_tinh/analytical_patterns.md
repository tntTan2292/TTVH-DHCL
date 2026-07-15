---
title: Analytical Patterns
purpose: Chuẩn hóa các mô hình phân tích dữ liệu
owner: Product Owner
ssot: True
dependencies: measurement.md
version: 1.0.0
---

# Analytical Patterns

Tài liệu chuẩn hóa các mô hình phân tích được áp dụng trên F1.3 nhằm đảm bảo tính đồng nhất (Single Source of Truth) trong góc nhìn điều hành.

## 1. Phân Tích Xu Hướng (Trend Analysis)
- **Mục đích**: Theo dõi chuỗi thời gian của KPI F1.3.
- **Áp dụng**: Biểu đồ xu hướng 30 ngày gần nhất (Ngày -> F1.3 %).

## 2. Phân Tích So Sánh (Comparison Analytics)
- **DoD (Day-over-Day)**: Chênh lệch giữa Hôm nay và Hôm qua.
- **SWC (Same Weekday Comparison)**: Chênh lệch giữa Hôm nay và Đúng ngày này tuần trước (Hôm nay vs Hôm nay - 7 ngày).
- **WoW (Week-over-Week)**: TODO - Waiting Product Owner (Chưa triển khai).
- **MoM (Month-over-Month)**: TODO - Waiting Product Owner (Chưa triển khai).

## 3. Phân Tích Xếp Hạng (Ranking)
- **BCVH Ranking**: Sắp xếp các BCVH theo Tỷ lệ Đạt / Không đạt và màu cảnh báo tương ứng. Mục đích định vị đơn vị yếu.
- **Route Ranking (Tuyến phát)**: Tìm top 20 tuyến thấp nhất.

## 4. Phân Tích Tác Động (Impact Analysis)
- **Mục đích**: Tìm ra đối tượng (BCVH, Tuyến) làm kéo giảm số liệu toàn mạng mạnh nhất.
- **Áp dụng**: Tính % Không đạt toàn mạng do từng đơn vị gây ra.

## 5. Phân Tích Nguyên Nhân (Root Cause Analysis - RCA)
- **Mục đích**: Tìm lý do dẫn đến kết quả Không đạt.
- **Áp dụng**: Chỉ phân tích trên nhóm Bưu gửi Không đạt. Bóc tách lỗi (Ví dụ: Nộp tiền muộn).

## 6. Phân Tích Pareto
- **Mục đích**: Tuân theo quy luật 80/20 để tối ưu nguồn lực điều hành.
- **Áp dụng**: Sắp xếp tuyến phát theo tỷ lệ Không đạt lũy kế.

## 7. Phân Tích Khoan Sâu (Drill Down)
- **Mục đích**: Đi từ số liệu tổng quát xuống chi tiết từng Bưu gửi.
- **Cấu trúc**: Toàn mạng -> BCVH -> Tuyến phát -> Bưu gửi.
