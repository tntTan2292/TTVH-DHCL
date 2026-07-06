# API DESIGN SPECIFICATION v1.0 (F1.3)

## 1. API Architecture
### 1.1 API Structure & Versioning
- **Base Path**: `/api/v1/f13`
- **Versioning**: Sử dụng URL Versioning (`v1`).
- **REST Standard**: Tuân thủ chuẩn RESTful API.
- **Naming Convention**: 
  - URL sử dụng `kebab-case` (e.g., `/evidence-list`).
  - JSON keys sử dụng `snake_case` cho DB mapping trực tiếp, hoặc `camelCase` tùy quy chuẩn Frontend (Quy chuẩn tại tài liệu này: `snake_case`).

### 1.2 Response Standard
Mọi Response đều bọc trong một chuẩn chung (Envelope):
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total_items": 100,
      "total_pages": 5
    }
  },
  "error": null
}
```

### 1.3 Error Standard
```json
{
  "success": false,
  "data": null,
  "meta": null,
  "error": {
    "code": "ERR_404_NOT_FOUND",
    "message": "Không tìm thấy dữ liệu Bưu cục vận hành."
  }
}
```

---

## 2. Endpoint Catalog

| Phân hệ | Endpoint | Method | Purpose |
| :--- | :--- | :---: | :--- |
| **Dashboard** | `/api/v1/f13/dashboard/kpi` | GET | Lấy tổng quan số liệu KPI F1.3 và tỷ lệ F13_303 |
| **Ranking** | `/api/v1/f13/ranking/bcvh` | GET | Lấy danh sách xếp hạng BCVH |
| **Ranking** | `/api/v1/f13/ranking/route` | GET | Lấy danh sách xếp hạng Tuyến phát (Drill-down từ BCVH) |
| **RCA** | `/api/v1/f13/rca/pareto` | GET | Lấy dữ liệu vẽ biểu đồ Pareto và Impact Analysis |
| **Evidence** | `/api/v1/f13/evidence-list` | GET | Lấy danh sách BG chậm nộp tiền (Drill-down từ Tuyến) |
| **Engine** | `/api/v1/f13/recommendations` | GET | Lấy danh sách cảnh báo Auto-Insight từ Rule Engine |
| **Engine** | `/api/v1/f13/messages` | GET | Lấy thông điệp điều hành (đã render từ Engine) |
| **Import** | `/api/v1/f13/import/upload` | POST | Upload file dữ liệu F1.3 |

---

## 3. Request & Response Specification

### 3.1 `GET /api/v1/f13/dashboard/kpi`
- **Query**:
  - `from_date` (Required): `YYYY-MM-DD`
  - `to_date` (Required): `YYYY-MM-DD`
- **Response**:
```json
{
  "success": true,
  "data": {
    "total_bg": 10000,
    "passed_rate": 80.5,
    "failed_rate": 19.5,
    "f13_303_rate": 12.0
  }
}
```

### 3.2 `GET /api/v1/f13/ranking/bcvh`
- **Query**:
  - `date`: `YYYY-MM-DD`
  - `page`, `page_size`, `sort`, `order` (Optional)
- **Response**:
```json
{
  "success": true,
  "data": [
    {
      "ma_bcvh": "BC01",
      "ten_bcvh": "BCVH Trung Tâm",
      "total_bg": 5000,
      "passed_rate": 85.0,
      "total_failed": 750,
      "f13_303_rate": 5.2
    }
  ],
  "meta": { "pagination": { "page": 1, "page_size": 20, "total_items": 1 } }
}
```

### 3.3 `GET /api/v1/f13/rca/pareto`
- **Query**:
  - `date`: `YYYY-MM-DD`
  - `ma_bcvh` (Optional): Phân tích Pareto cho 1 BCVH cụ thể.
- **Response**:
```json
{
  "success": true,
  "data": {
    "pareto_chart": [
      {
        "ten_tuyen": "Tuyến A",
        "bg_cham_nop_tien": 150,
        "cumulative_pct": 35.5
      }
    ],
    "impact_table": [
      {
        "ten_tuyen": "Tuyến A",
        "total_failed": 300,
        "bg_cham_nop_tien": 150,
        "impact_pct": 50.0
      }
    ]
  }
}
```

### 3.4 `GET /api/v1/f13/evidence-list`
- **Query**:
  - `date`: `YYYY-MM-DD`
  - `ma_bcvh` (Required for Drill-down)
  - `ma_tuyen` (Required for Drill-down)
  - `page`, `page_size`
- **Response**:
```json
{
  "success": true,
  "data": [
    {
      "ma_bg": "VN123456789",
      "thoi_gian_ptc": "2026-06-18 08:00:00",
      "thoi_gian_nop_tien": "2026-06-18 14:00:00",
      "do_tre_gio": 6.0
    }
  ],
  "meta": { "pagination": { "page": 1, "page_size": 20, "total_items": 45 } }
}
```

---

## 4. Drill Down Flow
Backend chịu hoàn toàn trách nhiệm Query Data theo cấu trúc phân cấp. Frontend không tự tải toàn bộ dữ liệu về để filter cục bộ.
**Luồng Drill-down**:
1. Dashboard gọi `/dashboard/kpi`
2. Sang BCVH Ranking gọi `/ranking/bcvh`
3. Click BCVH → Gọi `/ranking/route?ma_bcvh={id}`
4. Click Tuyến → Gọi `/evidence-list?ma_bcvh={id}&ma_tuyen={id}`
5. Dữ liệu trả về Evidence List cung cấp danh sách BG để Frontend hiển thị trực tiếp.

---

## 5. Import API Specification

### `POST /api/v1/f13/import/upload`
- **Body** (multipart/form-data):
  - `file`: Bắt buộc (.xlsx).
  - `force_overwrite`: `true/false` (Mặc định `false`).
- **Logic**:
  - Nếu `force_overwrite = false` và phát hiện trùng ngày, trả về `409 Conflict`.
  - Nếu `force_overwrite = true`, hệ thống xóa dữ liệu cũ ngày đó, nạp dữ liệu mới.
- **Response (Thành công)**:
```json
{
  "success": true,
  "data": {
    "total_records": 10000,
    "inserted_records": 9500,
    "error_records": 500,
    "import_log_id": 1024
  }
}
```

---

## 6. Error Response Code
Chuẩn hóa HTTP Status Code và Internal Error Code:
- **400 Bad Request**: Sai tham số Query/Body (VD: `ERR_400_INVALID_DATE`).
- **404 Not Found**: Tham số truy vấn không khớp bản ghi nào.
- **409 Conflict**: Import trùng ngày (yêu cầu `force_overwrite = true`).
- **422 Unprocessable Entity**: File Excel sai định dạng (thiếu cột).
- **500 Internal Server Error**: Lỗi Database hoặc Server (VD: `ERR_500_DB_FAIL`).

---

## 7. Pagination Standard
Mọi danh sách (BCVH, Tuyến, Evidence List) bắt buộc kế thừa chuẩn Query sau:
- `page` (int): Trang hiện tại (Mặc định 1).
- `page_size` (int): Số dòng / trang (Mặc định 20).
- `sort` (string): Tên cột cần sắp xếp.
- `order` (string): `asc` hoặc `desc`.
- `search` (string): Chuỗi tìm kiếm tự do (Optional).

---

## 8. Security Boundary
- API chỉ làm nhiệm vụ **Trả Dữ Liệu (Data Provider)**.
- API `/api/v1/f13/recommendations` chỉ trả về JSON lấy từ `Rule Engine Service`. API Controller không được phép code `if (kpi < 90) return Alert`. Toàn bộ Business Logic phải nằm sâu ở tầng Service / Rule Engine.

---

## 9. Open Decisions
Các Missing Fields (Màn 04) và Action Flow (Gửi tin nhắn) từ Phase A2 vẫn đang là Open Decisions. Do đó:
- API `/evidence-list` hiện tại chỉ trả về các trường chắc chắn có trong SSOT (Mã BG, PTC, Nộp tiền, Độ trễ).
- **KHÔNG THIẾT KẾ** API POST `/action/send-message` tại Phase này để tránh tạo quy trình ngoài SSOT. 
- Mọi bổ sung sẽ được cập nhật dưới dạng **Future Enhancement (v1.1)** khi Product Owner có quyết định chính thức.
