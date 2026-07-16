---
title: Business Rules
purpose: Quy tắc nghiệp vụ và điều kiện hợp lệ
owner: Product Owner
ssot: True
dependencies: data_blueprint.md
version: 1.0.0
---

# Business Rules

## 1. Nguyên Tắc Cốt Lõi
- **KPI F1.3 hiển thị trong hệ thống phải khớp Dashboard Tổng công ty.**
- KPI chính thức không được tự tính lại. Hệ thống chỉ Tổng hợp, So sánh, Phân tích.
- Nếu có sai lệch: Dashboard Tổng công ty là nguồn chuẩn.

## 1.1 F1.3 Returned Shipment NULL Rule
- `ket_qua_f13 = NULL` may represent a returned shipment.
- A returned shipment remains part of the F1.3 evaluation population.
- A returned shipment must remain included in `total_volume`.
- `NULL` in this context is a valid business state and must not automatically be treated as missing, invalid, corrupt, or unavailable data.
- AI and developers must not infer that SQL `NULL` always means missing business data.

## 2. Drill Down Hierarchy
`Toàn mạng` -> `BCVH` -> `Tuyến phát` -> `Bưu gửi`

## 3. Quy Tắc Bộ Lọc Chung (Áp dụng toàn module)
- **Thời gian**: Mặc định Từ ngày = Today - 7 ngày | Đến ngày = Today - 1 ngày (Do dữ liệu mới nhất luôn là N-1).
  Các tùy chọn khác: Hôm qua, Tuần này, Tháng này, Tùy chọn.
- **BCVH**: Tất cả, Theo BCVH.
- **Tuyến phát**: Tất cả, Theo tuyến.
- **Mã bưu gửi**: Lọc theo `ma_bg`.

## 4. Quy Tắc Màu Cảnh Báo
Không hard-code. Lấy từ Settings Configuration. Admin được thay đổi.
- 🟢 Xanh: ≥ 70%
- 🩷 Hồng: 60% - <70%
- 🟡 Vàng: 50% - <60%
- 🔴 Đỏ: < 50%

## 5. Quy Tắc Hiển Thị
- KPI: 2 chữ số thập phân (Ví dụ: `67.81%`).
- Sản lượng: Có dấu phân cách hàng nghìn (Ví dụ: `1.234`).

## 6. Xuất Báo Cáo
- Excel: Tất cả bảng.
- PDF: Báo cáo điều hành ngày.

## 7. Danh sách Chưa Xác Nhận (TODO - Waiting Product Owner)
- Chậm phát
- Chậm nhập thông tin phát
- Loại dịch vụ
- Xã/phường phát
- Bưu tá phát
- Nguyên nhân chủ quan khác

## 8. Mâu thuẫn phát hiện (Conflict Review)
- Không có mâu thuẫn.
