# 1. Project Overview

- Tên dự án: `TTVH Quality Intelligence System (QIS)`
- Mục tiêu: Chuẩn hóa và điều hành chất lượng vận hành theo SSOT, bám dữ liệu runtime thực tế, hỗ trợ giám sát, phân tích, cảnh báo và ra quyết định.
- Kiến trúc: Frontend chỉ render; backend giữ rule, calculation, recommendation, template và API; database/runtime là nguồn kiểm chứng cuối cùng.
- Vai trò: `Chief Commander -> Decision -> Prompt -> Codex -> Runtime -> Product Owner nghiệm thu -> PASS/FAIL`.

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

Dashboard Recovery: `PASS`

Module đã Recovery:

- Executive KPI
- Executive Daily Brief
- Recommendation
- Timeline
- Weekly Pattern
- Monthly Pattern
- Heatmap
- Message Generation
- Top Ranking
- Operation Table

# 4. SSOT Freeze

Kết luận cuối cùng đã chốt:

- Executive Header: `Frozen`
- Operation Table: `SSOT locked`
- Import: `SSOT locked`
- National Ranking: `SSOT locked`
- Dashboard only: `Frontend only, no business logic duplication`
- Calculated: `Backend/runtime computed`
- Imported: `Import rules frozen`

Không ghi lịch sử trao đổi, chỉ giữ kết luận cuối cùng.

# 5. Import Recovery History

- Root Cause: Dữ liệu runtime và SSOT trước đây chưa đồng bộ, một số màn hình còn phụ thuộc mock/legacy mapping.
- Cách Recovery: Chuẩn hóa nguồn dữ liệu, đồng bộ API theo SSOT, khóa lại mapping và rule ở backend/runtime.
- Ticket: `DOC-SSOT-01` và các ticket recovery liên quan của Dashboard.
- Runtime Result: Dashboard đã recovery và xác nhận `PASS`.

# 6. Environment

Đã chuẩn hóa:

- Backend: Nguồn tính toán và rule execution.
- Frontend: Chỉ hiển thị, không chứa business logic nghiệp vụ.
- Control Center: Điều phối vận hành theo workflow chuẩn.
- Git Ignore: Đã ổn định để tránh commit artifact không cần thiết.
- Runtime Log: Là căn cứ nghiệm thu thực tế.

# 7. Current Roadmap

Dashboard Recovery: `PASS`

↓

M1

BCVH Ranking Recovery

↓

M2

Tuyến Ranking Recovery

↓

M3

Pareto / RCA

↓

M4

Evidence

↓

M5

Message Center

# 8. Current Active Phase

- Current Phase: `M1`
- Workstream: `BCVH Ranking Recovery`
- Status: `Waiting Audit`

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

# 10. Next Chat Instructions

Nếu bắt đầu chat mới, chỉ cần đọc file này:

- `docs/PROJECT_SSOT.md`

Sau đó tiếp tục theo current phase và workflow hiện hành.
Không cần đọc lại lịch sử chat cũ.
