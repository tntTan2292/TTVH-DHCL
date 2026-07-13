# 1. Project Overview

- Tên dự án: `TTVH Quality Intelligence System (QIS V2)`
- Mục tiêu: `Decision Support System` cho điều hành chất lượng, chuẩn hóa quyết định bằng SSOT, runtime và bằng chứng dữ liệu.
- Kiến trúc: `Dashboard -> BCVH Performance Center -> Route Performance Center -> Shipment Performance Center -> Evidence Center -> Action Center -> Report Center`.
- Vai trò: `Chief Commander -> Decision -> Prompt -> Codex -> Runtime -> Product Owner nghiệm thu -> PASS/FAIL`.
- Khung tư duy: `EIDAF = Evidence -> Insight -> Decision -> Action -> Feedback`.

# 2. Workflow

Workflow chuẩn:

Chief Commander

↓

Decision

↓

Prompt

↓

Codex

↓

Runtime

↓

Product Owner nghiệm thu

↓

PASS / FAIL

Nguyên tắc:

- One Bug = One Ticket = One Commit
- Không Refactor
- Không Rewrite
- Không Audit lan
- Không thay đổi Business Rule
- Runtime là tiêu chuẩn nghiệm thu

# 3. Current Project Status

- Dashboard Runtime: `PASS`
- BCVH Ranking Runtime: `PASS (Baseline)`
- Current phase: `Architecture`
- Architecture discovery: `In Progress`

# 4. SSOT Freeze

Kết luận cuối cùng đã chốt:

- Executive Header: `Frozen`
- Operation Table: `SSOT locked`
- Import: `SSOT locked`
- National Ranking: `SSOT locked`
- Dashboard only: `Frontend only, no business logic duplication`
- Calculated: `Backend/runtime computed`
- Imported: `Import rules frozen`
- QIS V2: `Decision Support System`
- EIDAF: `Architecture principle locked`

Không ghi lịch sử trao đổi, chỉ giữ kết luận cuối cùng.

# 5. Import Recovery History

- Root Cause: Dữ liệu runtime và SSOT trước đây chưa đồng bộ, một số màn hình còn phụ thuộc mock/legacy mapping.
- Cách Recovery: Chuẩn hóa nguồn dữ liệu, đồng bộ API theo SSOT, khóa lại mapping và rule ở backend/runtime.
- Ticket: `DOC-SSOT-01` và các ticket recovery liên quan của Dashboard/BCVH.
- Runtime Result: Dashboard đã recovery và xác nhận `PASS`; BCVH Ranking Runtime đạt `PASS (Baseline)`.

# 6. Environment

Đã chuẩn hóa:

- Backend: Nguồn tính toán và rule execution.
- Frontend: Chỉ hiển thị, không chứa business logic nghiệp vụ.
- Control Center: Điều phối vận hành theo workflow chuẩn.
- Git Ignore: Ổn định để tránh commit artifact không cần thiết.
- Runtime Log: Là căn cứ nghiệm thu thực tế.

# 7. Current Roadmap

- Dashboard Runtime: `PASS`
- BCVH Ranking Runtime: `PASS (Baseline)`
- Architecture Phase
  - Business Discovery
  - Freeze Business
  - Information Architecture

Future centers:

- BCVH Performance Center
- Route Performance Center
- Shipment Performance Center
- Evidence Center
- Action Center
- Report Center

# 8. Current Active Phase

- Current Phase: `Architecture`
- Workstream: `QIS V2 Architecture`
- Status: `In Progress`

# 9. Important Decisions

- Operation Table SSOT
- KPI 2026
- National Ranking
- Dashboard Runtime Rule
- Import Rule
- Frontend only for dashboard presentation
- Backend/runtime only for calculation and business rule execution
- Runtime is the acceptance standard
- No mock data as final acceptance source
- No business rule changes unless explicitly approved by PO
- QIS V2 is a Decision Support System
- EIDAF is the organizing framework

# 10. Next Chat Instructions

Nếu bắt đầu chat mới, chỉ cần đọc:

- `docs/PROJECT_SSOT.md`
- `PROJECT_STATUS.md`

Sau đó tiếp tục theo current phase và workflow hiện hành.
Không cần đọc lại lịch sử chat cũ.
