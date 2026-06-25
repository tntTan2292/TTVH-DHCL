---
title: Data Blueprint
purpose: Từ điển dữ liệu và chiến lược nạp dữ liệu
owner: Data Architect
ssot: True
dependencies: core_knowledge.md
version: 1.0.0
---

# Data Blueprint

## 1. Nguồn Dữ Liệu
- **Nguồn chính**: File chi tiết F1.3 do Tổng công ty cung cấp.
- **Nguồn đối soát**: Dashboard KPI Tổng công ty.

## 2. Danh mục thực thể (Entities)

### Entity 01 - BCVH
- `ma_bcvh`: Mã BCVH
- `ten_bcvh`: Tên BCVH

### Entity 02 - Tuyến phát
- `ma_tuyen`: Mã tuyến
- `ten_tuyen`: Tên tuyến
- `ma_bcvh`: BCVH quản lý

### Entity 03 - Bưu gửi
- `ma_bg`: Mã Bưu gửi
- `ngay_do_kiem`: Ngày đo kiểm
- `ma_bcvh`: BCVH phát
- `ma_tuyen`: Tuyến phát

## 3. Source File Column Mapping
Ánh xạ dữ liệu từ file Excel Tổng công ty sang hệ thống.
Nguyên tắc:
- Một cột Excel chỉ ánh xạ tới một field.
- Không được suy diễn dữ liệu.
- Mọi thay đổi phải cập nhật Data Dictionary trước khi thực thi.

**Import Strategy & Field Selection**
- Lưu trữ toàn vẹn: Hệ thống lưu toàn bộ 41 cột từ file Excel Tổng công ty. Không loại bỏ các cột chưa dùng.
- Phạm vi hiển thị MVP: Dashboard MVP chỉ sử dụng một phần dữ liệu.

**Trường dữ liệu Hệ thống (System Fields)**
- `ngay_do_kiem`: Nguồn từ Tên file (Ví dụ: `F1.3-2026.06.18.xlsx` => `2026-06-18`). Tuyệt đối không lấy từ cột bên trong nội dung file Excel. Hỗ trợ phân tích thời gian.

**Bảng Mapping Chính thức (MVP Core Fields)**
| Excel Column | System Field | Data Type | Nullable | Mô tả |
|---|---|---|---|---|
| Số hiệu bưu gửi | `ma_bg` | string | No | Mã định danh Bưu gửi |
| Mã BC phát | `ma_bcvh` | string | No | Mã định danh Bưu cục văn hóa |
| Tên BC phát | `ten_bcvh` | string | No | Tên BCVH để hiển thị |
| Mã tuyến phát | `ma_tuyen` | string | Yes | Mã định danh Tuyến phát |
| Tên tuyến phát | `ten_tuyen` | string | Yes | Tên Tuyến phát để hiển thị |
| Đánh giá (Đạt/Không đạt) | `ket_qua_f13` | string | No | Kết quả Đạt / Không đạt |
| Thời gian PTC | `thoi_gian_ptc` | datetime | Yes | Thời gian phát thành công |
| Thời gian nộp tiền | `thoi_gian_nop_tien` | datetime | Yes | Thời gian nộp tiền |

## 4. Reimport Strategy
Khi import file có ngày đo kiểm đã tồn tại:
- Cảnh báo: "Đã tồn tại dữ liệu ngày đo kiểm YYYY-MM-DD. Bạn có muốn ghi đè dữ liệu cũ không?"
- Hủy: Hủy tiến trình.
- Ghi đè: Xóa toàn bộ dữ liệu ngày đó -> Import mới -> Ghi log lịch sử.

## 5. Cấu Trúc Toàn Vẹn Dữ Liệu (Data Constraints)
- **Luật duy nhất (Unique Constraint)**: Một Bưu gửi (`ma_bg`) chỉ được phép xuất hiện 1 lần trong một Ngày đo kiểm (`ngay_do_kiem`).
- **Hành vi xử lý lỗi trùng lặp (Duplicate Behavior)**:
  - Nhập (Import) các dòng dữ liệu hợp lệ.
  - Bỏ qua các dòng bị trùng lặp và ghi nhận lại danh sách lỗi để cảnh báo cho người quản trị.
  - Tuyệt đối không hủy bỏ toàn bộ quá trình nạp file chỉ vì một số dòng bị trùng lặp.
*(Chi tiết triển khai kỹ thuật: Xem tại tài liệu `05_TECHNICAL_IMPLEMENTATION/`)*