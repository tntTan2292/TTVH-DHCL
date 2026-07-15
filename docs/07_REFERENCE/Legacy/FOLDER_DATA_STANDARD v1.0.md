# TTVH QUALITY INTELLIGENCE SYSTEM

# FOLDER_DATA_STANDARD v1.0

---

# 1. MỤC ĐÍCH

Tài liệu này quy định:

- Cấu trúc thư mục chuẩn của hệ thống.
- Quy tắc quản lý dữ liệu đầu vào.
- Quy trình Import dữ liệu.
- Quy trình lưu trữ dữ liệu lịch sử.
- Quy tắc lưu trữ tài liệu nghiệp vụ.

Áp dụng cho toàn bộ hệ thống:

- F1.1
- F1.2
- F1.3
- F4.1
- Các module phát triển trong tương lai.

---

# 2. CẤU TRÚC THƯ MỤC CHUẨN

```text
TTVH - He thong dieu hanh chat luong
│
├── Docs
│   │
│   ├── Constitution_v1.0.md
│   ├── Folder_Data_Standard_v1.0.md
│   │
│   ├── F1.1
│   ├── F1.2
│   │
│   ├── F1.3
│   │   ├── F1.3_MODULE_SPECIFICATION_v1.0.md
│   │   └── F1.3_DATA_DICTIONARY_v1.0.md
│   │
│   └── F4.1
│
├── Data DKCL
│   │
│   ├── F1.1
│   │   ├── Incoming
│   │   ├── Processed
│   │   └── Error
│   │
│   ├── F1.2
│   │   ├── Incoming
│   │   ├── Processed
│   │   └── Error
│   │
│   ├── F1.3
│   │   ├── Incoming
│   │   ├── Processed
│   │   └── Error
│   │
│   ├── F4.1
│   │   ├── Incoming
│   │   ├── Processed
│   │   └── Error
│   │
│   └── Archive
│       ├── 2026
│       ├── 2027
│       └── ...
│
└── Database
```

---

# 3. Ý NGHĨA THƯ MỤC

## Docs

Chứa toàn bộ tài liệu thiết kế hệ thống.

Bao gồm:

- Constitution.
- Data Dictionary.
- Module Specification.
- Tài liệu nghiệp vụ.

Không lưu dữ liệu vận hành.

---

## Data DKCL

Chứa toàn bộ file dữ liệu gốc tải từ Tổng công ty.

Đây là nguồn dữ liệu đầu vào của hệ thống.

---

## Database

Chứa dữ liệu đã Import.

Là nguồn dữ liệu chính của Dashboard.

Người dùng không thao tác trực tiếp.

---

# 4. Ý NGHĨA THƯ MỤC DỮ LIỆU

## Incoming

Chứa file mới tải về.

Hệ thống sẽ tự động quét và xử lý dữ liệu từ thư mục này.

---

## Processed

Chứa file đã Import thành công.

Dùng để đối soát khi cần.

---

## Error

Chứa file Import lỗi.

Dùng để kiểm tra và xử lý lại.

---

## Archive

Lưu trữ file gốc theo năm.

Phục vụ:

- Đối soát dữ liệu.
- Kiểm tra lịch sử.
- Kiểm toán nội bộ.

---

# 5. QUY TẮC ĐẶT TÊN FILE

## F1.1

```text
F1.1_YYYY-MM-DD.xlsx
```

Ví dụ:

```text
F1.1_2026-06-18.xlsx
```

---

## F1.2

```text
F1.2_YYYY-MM-DD.xlsx
```

Ví dụ:

```text
F1.2_2026-06-18.xlsx
```

---

## F1.3

```text
F1.3_YYYY-MM-DD.xlsx
```

Ví dụ:

```text
F1.3_2026-06-18.xlsx
```

---

## F4.1

```text
F4.1_YYYY-MM-DD.xlsx
```

Ví dụ:

```text
F4.1_2026-06-18.xlsx
```

---

# 6. QUY TRÌNH IMPORT DỮ LIỆU

## Bước 1

Người dùng tải file từ Tổng công ty.

---

## Bước 2

Copy file vào thư mục:

```text
Incoming
```

của từng chỉ tiêu.

Ví dụ:

```text
Data DKCL/F1.3/Incoming
```

---

## Bước 3

Hệ thống tự động phát hiện file mới.

---

## Bước 4

Kiểm tra:

- Tên file.
- Định dạng file.
- Cấu trúc cột.
- Dữ liệu trùng lặp.
- Tính hợp lệ dữ liệu.

---

## Bước 5

Import dữ liệu vào Database.

---

## Bước 6

Nếu thành công:

```text
Incoming
↓
Processed
```

---

## Bước 7

Nếu lỗi:

```text
Incoming
↓
Error
```

Đồng thời ghi nhận chi tiết lỗi.

---

# 7. XỬ LÝ DỮ LIỆU TRÙNG

## Nguyên tắc

Không cho phép Import trùng dữ liệu.

---

## Kiểm tra

Dựa trên:

- Module.
- Ngày dữ liệu.
- Tên file.
- Số lượng bản ghi.

---

## Kết quả

Nếu phát hiện trùng:

- Từ chối Import.
- Ghi nhận vào Log.

---

# 8. KIẾN TRÚC DỮ LIỆU

Nguyên tắc:

```text
Excel
↓
Import
↓
Database
↓
Dashboard
```

---

## Không cho phép

```text
Excel
↓
Dashboard
```

---

## Mục tiêu

Đảm bảo:

- Tốc độ.
- Tính ổn định.
- Khả năng mở rộng.

---

# 9. LỊCH SỬ IMPORT

Hệ thống phải lưu:

| Trường | Mô tả |
|----------|----------|
| File Name | Tên file |
| Module | F1.1 / F1.2 / F1.3 / F4.1 |
| Import Time | Thời gian Import |
| User | Người Import |
| Record Count | Số bản ghi |
| Status | Success / Error |
| Message | Nội dung lỗi |

---

# 10. QUẢN LÝ DỮ LIỆU LỊCH SỬ

## Mục tiêu

Cho phép phân tích:

- Hôm nay.
- Hôm qua.
- Tuần.
- Tháng.
- Quý.
- Năm.

---

## Yêu cầu

Dữ liệu sau Import phải được lưu vĩnh viễn trong Database.

Không phụ thuộc vào file Excel.

---

# 11. SAO LƯU DỮ LIỆU

## Tối thiểu

Sao lưu:

- Database.
- Folder Docs.

Tần suất:

- Hàng ngày.

---

## Khuyến nghị

Sao lưu:

```text
Backup
├── Daily
├── Weekly
└── Monthly
```

---

# 12. CONSTITUTION FREEZE

Phiên bản hiện tại:

> Folder_Data_Standard_v1.0

Mọi thay đổi liên quan đến:

- Cấu trúc thư mục.
- Quy tắc đặt tên file.
- Quy trình Import.
- Quy trình lưu trữ dữ liệu.
- Quy trình sao lưu.

phải được cập nhật vào tài liệu này trước khi triển khai.

---