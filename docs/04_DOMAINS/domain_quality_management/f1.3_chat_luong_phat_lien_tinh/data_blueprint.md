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
- `ma_bg`: Mã bưu gửi
- `ngay_do_kiem`: Ngày đo kiểm
- `ma_bcvh`: BCVH phát
- `ma_tuyen`: Tuyến phát

## 3. Source File Column Mapping
Ánh xạ dữ liệu từ file Excel Tổng công ty sang Database.
Nguyên tắc:
- Một cột Excel chỉ ánh xạ tới một field hệ thống.
- Không được suy diễn dữ liệu.
- Mọi thay đổi phải cập nhật Data Dictionary trước khi code.

**Import Strategy & Field Selection**
- Lưu trữ toàn vẹn: Hệ thống lưu toàn bộ 41 cột từ file Excel TCT vào Database. Không loại bỏ các cột chưa dùng.
- Phạm vi hiển thị MVP: Dashboard MVP chỉ sử dụng một phần dữ liệu.

**Trường dữ liệu Hệ thống (System Fields)**
- `ngay_do_kiem`: Nguồn từ Tên file (Ví dụ: `F1.3-2026.06.18.xlsx` => `2026-06-18`). Tuyệt đối không lấy từ cột bên trong nội dung file Excel. Hỗ trợ phân tích thời gian.

**Bảng Mapping Chính thức (MVP Core Fields)**
| Excel Column | System Field | Data Type | Nullable | Mô tả |
|---|---|---|---|---|
| Số hiệu bưu gửi | `ma_bg` | string | No | Mã định danh bưu gửi |
| Mã BC phát | `ma_bcvh` | string | No | Mã định danh Bưu cục văn hóa |
| Tên BC phát | `ten_bcvh` | string | No | Tên BCVH để hiển thị |
| Mã tuyến phát | `ma_tuyen` | string | Yes | Mã định danh Tuyến phát |
| Tên tuyến phát | `ten_tuyen` | string | Yes | Tên Tuyến phát để hiển thị |
| Đánh giá (Đạt/Không đạt) | `ket_qua_f13` | string | No | Kết quả Đạt / Không đạt |
| Thời gian PTC | `thoi_gian_ptc` | datetime | Yes | Thời gian phát thành công |
| Thời gian nộp tiền | `thoi_gian_nop_tien` | datetime | Yes | Thời gian nộp tiền |

## 4. Reimport Strategy
Khi import file có ngày đo kiểm đã tồn tại:
- Hệ thống hiển thị cảnh báo: "Đã tồn tại dữ liệu ngày đo kiểm YYYY-MM-DD. Bạn có muốn ghi đè dữ liệu cũ không?"
- Hủy: Hủy tiến trình.
- Ghi đè: Xóa toàn bộ dữ liệu ngày đó -> Import mới -> Ghi log. (Không versioning, Không snapshot, Không rollback).

## 5. Duplicate Protection
- Bảng `fact_f13` sử dụng `UNIQUE(ngay_do_kiem, ma_bg)` làm Business Rule.
- Behavior khi duplicate trong 1 file:
  - Import phần hợp lệ.
  - Ghi nhận dòng lỗi vào `error_records`.
  - Trả danh sách `ma_bg` lỗi qua API.
  - Tuyệt đối không Cancel toàn bộ file.

## 6. MVP Database Engine
- SQLite: Không sử dụng PostgreSQL/MySQL cho MVP.