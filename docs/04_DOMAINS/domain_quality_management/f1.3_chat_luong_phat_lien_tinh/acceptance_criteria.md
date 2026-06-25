---
title: Acceptance Criteria
purpose: Tiêu chí nghiệm thu nghiệp vụ F1.3
owner: Product Owner
ssot: True
dependencies: business_rules.md
version: 1.0.0
---

# Acceptance Criteria

Tài liệu định nghĩa các tiêu chí nghiệm thu (Acceptance Criteria) ở góc độ nghiệp vụ cho Indicator F1.3.

## 1. Dữ liệu (Data Import & Processing)
- Hệ thống nạp thành công dữ liệu file Excel F1.3 từ Tổng công ty.
- Xử lý trùng lặp đúng luật: Bỏ qua dòng trùng lặp (cùng `ma_bg` và `ngay_do_kiem`), nạp dòng hợp lệ, ghi nhận danh sách lỗi mà không hủy toàn bộ file.
- Ghi đè file nếu bị trùng ngày đo kiểm, có ghi log lịch sử.

## 2. Executive Dashboard & KPI
- KPI tổng quan F1.3 khớp 100% với Dashboard Tổng công ty (Zero deviance).
- Các chỉ số điều hành (Tổng Bưu gửi, Bưu gửi Đạt/Không đạt, Tỷ lệ Không đạt) tính toán chính xác theo công thức quy định.
- Hiển thị đúng 2 chữ số thập phân cho KPI và dấu phân cách hàng nghìn cho sản lượng.
- Phân tích xu hướng 30 ngày và so sánh DoD, SWC hiển thị chính xác.

## 3. Phân tích & Cảnh báo (Analytics & Alerts)
- Bảng xếp hạng BCVH và Tuyến phát hiển thị màu cảnh báo đúng theo cấu hình (Xanh, Hồng, Vàng, Đỏ).
- Phân tích Impact Analysis: Tổng tỷ trọng % Không đạt của tất cả BCVH/Tuyến phải bằng 100% của toàn mạng.
- Phân tích Pareto: Biểu đồ tính toán chính xác giá trị lũy kế để tìm ra nhóm 20% tuyến phát gây ra 80% Bưu gửi Không đạt.
- Phân tích RCA (Nộp tiền muộn): Bộ lọc nguyên nhân chỉ được áp dụng trên nhóm "Bưu gửi Không đạt". Tỷ lệ được tính đúng trên nhóm này.

## 4. Bộ lọc và Drill Down
- Drill down hoạt động chính xác theo phân cấp: Toàn mạng -> BCVH -> Tuyến phát -> Bưu gửi.
- Bộ lọc thời gian (Mặc định N-7 đến N-1), BCVH, Tuyến hoạt động đồng bộ trên toàn module.

## 5. Báo Cáo
- TODO – Waiting Product Owner (Kiểm chứng file xuất ra Excel/PDF đúng định dạng).
