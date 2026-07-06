# DEVELOPMENT ARCHITECTURE BLUEPRINT v1.0 (F1.3)

## 1. Source Tree (Cấu trúc thư mục)
Kiến trúc thư mục được phân tách rõ ràng (Separation of Concerns) để Backend và Frontend phát triển độc lập.

```text
TTVH-DHCL/
├── backend/
│   ├── src/
│   │   ├── api/                 # Controllers & Routes (Xử lý HTTP, Validate Request)
│   │   ├── services/            # Core Business Flow (Xử lý luồng nghiệp vụ)
│   │   ├── repositories/        # Data Access Layer (Giao tiếp SQLite)
│   │   ├── engine/
│   │   │   ├── rules/           # Rule Engine (Đánh giá ngưỡng KPI F13_303 > 3h)
│   │   │   ├── recommendations/ # Recommendation Engine (Sinh Auto-Insight)
│   │   │   └── messages/        # Message Generation (Template tin nhắn)
│   │   ├── import/              # Upload, Excel Parser, Preview/Confirm Logic
│   │   └── config/              # Constants, DB Connection
│   └── tests/                   # Unit & Integration Tests
└── frontend/
    ├── src/
    │   ├── api/                 # API Client (Axios calls map 1-1 với Backend API)
    │   ├── pages/               # Dashboard, BCVH Ranking, RCA, Evidence List
    │   ├── components/          # Widgets, Pareto Chart, DataTable
    │   └── store/               # State Management
```

---

## 2. Coding Order (Trình tự lập trình)
Để tránh Blocker giữa 2 team, tiến trình code tuân thủ theo luồng Bottom-Up (từ lõi ra vỏ):

1. **Database Schema** (Khởi tạo SQLite DDL).
2. **Repository Layer** (Các hàm CRUD cơ bản).
3. **Core Services & Rule Engine** (Code logic nghiệp vụ nền tảng).
4. **API Controllers** (Đóng gói Service thành REST API, chốt Contract).
   *(Đến đây Frontend có thể gọi API thực tế hoặc Mock).*
5. **Import Module** (Xây dựng luồng Preview/Confirm để có dữ liệu thực).
6. **Frontend API Client & Store** (Gắn kết Frontend với Backend).
7. **Frontend Components** (Code UI, Vẽ Chart).
8. **Dashboard Assembly** (Lắp ráp UI thành luồng hoàn chỉnh).
9. **End-to-End Testing**.

---

## 3. Dependency Graph
Kiến trúc quy định rõ luồng phụ thuộc một chiều (Unidirectional Dependency).

```mermaid
graph TD
    %% Frontend Layer
    FE[Frontend Dashboard] --> API[API Controllers]
    
    %% Transport Layer
    API --> SVC[Core Services]
    API --> IMP[Import Module]
    
    %% Business Layer
    SVC --> RE[Rule Engine]
    SVC --> MSG[Message Generation]
    SVC --> REC[Recommendation Engine]
    
    %% Engine Layer Dependencies
    REC --> RE
    MSG --> RE
    
    %% Data Layer
    SVC --> REP[Repositories]
    IMP --> REP
    
    %% Storage
    REP --> DB[(SQLite Database)]
    
    %% Forbidden Routes (Red)
    FE -.->|CẤM| DB
    API -.->|CẤM| DB
    API -.->|CẤM| RE
```
**Quy tắc vi phạm (Forbidden Dependency):**
- Frontend **Tuyệt đối không** gọi trực tiếp DB (Chống SQL Injection).
- API **Tuyệt đối không** gọi thẳng Repository hoặc DB (Bypass Service).
- API **Tuyệt đối không** nhúng tay vào Rule Engine.

---

## 4. Layer Boundary (Khóa Kiến trúc)

| Layer | Input | Output | Responsibility (Trách nhiệm) | Forbidden (Cấm) |
| :--- | :--- | :--- | :--- | :--- |
| **Database** | SQL Query | Raw Data | Lưu trữ, bảo vệ toàn vẹn Constraints. | Chứa Business Logic (SP/Trigger phức tạp). |
| **Repository** | ID, Query Params | Model Object | Giao tiếp SQLite, chạy Index. | Tính toán KPI F13_303. |
| **Service** | DTO | Business Model | Điều phối luồng, kết nối Engine & Repo. | Nhận HTTP Request/Response. |
| **Rule Engine** | Fact (Data) | Alert / Result | Tính toán ngưỡng (> 3h), sinh KPI. | Truy vấn Database trực tiếp. |
| **Message Gen** | Alert / Rule | Text Template | Render nội dung tin nhắn. | Thay đổi trạng thái bưu gửi. |
| **API** | HTTP Request | JSON Envelope | Validate tham số, Authentication. | Viết `if/else` logic nghiệp vụ. |
| **Frontend** | User Click | API Call / UI | Hiển thị Chart, Xử lý giao diện. | Tự Filter/Sort Data cục bộ thay cho Backend. |

---

## 5. Development Milestone (Sprints)

### Sprint 1: Foundation & Data Import
- **Goal**: Dựng móng hệ thống và luồng nạp dữ liệu.
- **Deliverables**: DB Schema, Repository, Import API (Preview/Confirm).
- **Exit Criteria**: Nạp thành công file Excel F1.3 thực tế vào Database, bảo đảm báo lỗi đúng khi sai định dạng.

### Sprint 2: Core Engine & API Providers
- **Goal**: Xây dựng toàn bộ lõi tính toán và bộc lộ API.
- **Deliverables**: Rule Engine, Recommendation Engine, API Endpoints (KPI, Ranking, RCA, Evidence).
- **Exit Criteria**: Postman test trả về JSON chính xác 100% theo Contract A3. 

### Sprint 3: Dashboard & Ranking (Frontend)
- **Goal**: Lắp ráp UI khối Tổng quan và Xếp hạng.
- **Deliverables**: Executive Dashboard (KPI Cards, Chart), BCVH Ranking, Route Ranking.
- **Exit Criteria**: UI hiển thị đúng số liệu lấy từ API, chuyển trang mượt mà không vỡ layout.

### Sprint 4: RCA & Drill-down Integration
- **Goal**: Thông luồng trải nghiệm RCA cuối cùng.
- **Deliverables**: Pareto Chart, Impact Analysis, Evidence List, Khung hiển thị Message.
- **Exit Criteria**: Trải nghiệm mượt mà từ `Dashboard → BCVH → Tuyến → Danh sách BG → Gửi tin nhắn`. Hoàn thành dự án.
