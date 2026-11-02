# F13-V2-STRUCTURE-01 Manifest

## 1. Ticket Information

- Ticket ID: `F13-V2-STRUCTURE-01`
- Ticket Name: `F1.3 on the time axis (Theo ngày / Theo tuần / Theo tháng) — new module beside the old one`
- Owner: `Claude Code` (backend) · UI: `Antigravity` · Review: `Opus` (independent, DEC-021)
- Governance Version: `V2 Active`
- Activation authority: `PO request in chat 2026-11-02 (menu by time axis; Ngày page takes a free date range; build a new F1.3 first, remove the old one only after PO acceptance)`
- Branch: `codex/da-impl-006`
- Activation date: `2026-11-02`
- Does not change Current Ticket (parallel; F13-ROUTE-POSTMAN-IDENTITY-01 stays paused).

## 2. Objective

Same-time-axis structure for one indicator, starting with F1.3, without touching the old F1.3 pages.

## 3. Current Status

- State: `D1-D3 APPROVED / BACKEND DELIVERED / U1 REMEDIATED (B2-B5 FIXED) / READY FOR PO UI CHECK`.
  - Item 0: Đã cập nhật quy tắc chuyển trang không suy kỳ chéo ngày/tuần/tháng; mỗi trang tải kỳ gần nhất qua `resolvePeriod({ kind: 'latest' })`; bộ lọc giữ `bcvh`.
  - Item B2: Loại bỏ hardcode mã BCVH giả trong filter bar; lấy danh sách đơn vị từ `layout` và tên từ metadata; không mặc định "Tất cả BCVH" khi lỗi tải layout; truyền scoped units cho `BcvhUnitsProvider` ở cả 3 trang; áp dụng `bcvh` lọc bảng và biểu đồ tuần/tháng.
  - Item B3: Sửa endpoint gọi tháng từ `/f13/months` thành `/f13/ranking/bcvh/months`; tham số `?month=` điều khiển cả khối xu hướng tháng và quy luật vận hành.
  - Item B4: Thêm prop `hideTrend` tùy chọn cho `BcvhWeeklyComparisonBlock` (mặc định false). Trang Tuần có đúng 2 khối: So sánh BCVH (hideTrend) và 1 khối Diễn biến chất lượng theo tuần. Trang Tháng hiển thị So sánh BCVH theo tháng (hideTrend) và không hiển thị biểu đồ tuần.
  - Item B5: Kỳ so sánh tự động là kỳ liền trước kỳ đang chọn (`findPrecedingOption`); kiểm tra mềm `?week=` không hợp lệ (cảnh báo nhẹ, không làm trống ô chọn); ẩn toolbar bộ chọn riêng của khối khi có `controlledPeriod`.
  - Làm luôn: Menu "Chuyên đề" trong nhóm F1.3 (mới) liên kết đầy đủ cả 3 khối (`/f13/ranking/route`, `/f13/ranking/bcvh`, `/f13/evidence`); thẻ quy luật trang Ngày khóa tab "theo thứ"; nút camera truyền chuẩn prop `dateOrPeriod`; ngưỡng màu đọc đúng `indicatorTargetRate(indicator)`.
  - Kiểm thử: 79/79 test suite liên quan pass; frontend build & lint pass.
  - Sửa sau bàn giao (Claude Code, 2026-11-02): `BcvhRankingOverviewBlocks.jsx` dùng `useEffect` mà thiếu import, làm hỏng khối xu hướng tháng ở trang Theo tháng và trang Phân tích BCVH cũ của mọi chỉ tiêu; phát hiện bằng `oxlint -D no-undef` (gate của `report_block_ui_standard.md` Mục 4).
  - PO khi kiểm tra UI (2026-11-02): bảng đầu trang Theo ngày dùng đúng "BẢNG TỔNG HỢP SỐ LIỆU CHỈ SỐ F1.3 TẠI CÁC BCVH"; bỏ Trung tâm hành động khỏi trang này; chọn từ hai ngày trở lên thì có thêm bảng so sánh khoảng ngày theo cùng kỳ (thiết kế Mục 12, điểm 3-5).
- PO UI Check Required: `Yes`, tiến hành kiểm tra giao diện trước khi quyết định thay thế module cũ.

## 4. Required Reading

- `docs/04_TECHNICAL_PLANNING/Feature/F13-V2-STRUCTURE-01_DESIGN.md` (scope, filters, permissions, API, phases)
- `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md`
- `docs/04_TECHNICAL_PLANNING/Feature/RBAC-01_DESIGN_OF_RECORD.md` (scope rules)

## 5. Scope

In: `/api/f13/v2/{layout,period/resolve,day/summary}`, block registry with scope tags, `/f13/v2/{ngay,tuan,thang}` pages, menu group "F1.3 (mới)" (ADMIN only in trial), tests, parity script. Out: old F1.3 pages, other indicators, Home, Hàng tồn, database/Import, Chuyên đề rebuild.

## 6. Locked Rules

Existing business rules unchanged (weeks Thursday–Wednesday, TỔNG CỘNG by summed volume, F1.3 target 90 %, blue family). Permissions stay per module (`all` / `bcvh` / `none`); a `bcvh` account never receives a `city` block, city total or national rank.

## 7. Phases

B0 contract note → B1 backend → U1 UI → R1 Opus review → PO UI check → retire old pages. Details: design Section 8.

## 8. Next Ticket

After PO acceptance: the same template for F1.1, F1.2, F4.1, F4.2 (one ticket each).
