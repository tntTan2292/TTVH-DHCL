# F13-BCVH-WEEKLY-COMPARISON-01 — So sánh chất lượng theo tuần (BCVH Ranking)

`IMPLEMENTED / PO UI PASS / CLOSED` (2026-09-28).

## 1. Ticket Information

- Ticket ID: `F13-BCVH-WEEKLY-COMPARISON-01`
- Ticket Name: `BCVH Ranking — bảng điều hành so sánh chất lượng hàng tuần`
- Phase: `Remediation & PO Acceptance`
- Executors: `Claude Code (Sonnet 5)` (initial) + `Antigravity (Gemini)` (remediation & UI adjustments)
- Branch: `codex/da-impl-006`
- Governance Version: `V2 Active`
- Status: `IMPLEMENTED / PO UI PASS / CLOSED` (2026-09-28)
- Does not reopen `F13-BCVH-RANKING-OVERVIEW-01` or any other closed ticket. Does not affect `F13-ROUTE-POSTMAN-IDENTITY-01`.

## 2. Product Owner Authorization & Review Remediation

- Activation: chat instruction, 2026-09-22, requesting weekly quality-comparison table in BCVH Ranking.
- Independent Review (Opus): 4 blockers identified and resolved in this remediation:
  - **B1 – Mốc không phải Thứ Năm**: Snaps non-Thursday dates to Thursday (`snapToThursday`). Selecting `14/09/2026` (Monday) resolves to `10/09/2026` (Tuần 37, `10/09–16/09/2026`), never `14/09–20/09`.
  - **B2 – Không sinh tuần giả**: Removed all hardcoded fallbacks (`2026-09-17`). No fake future weeks (W39/W40) generated. Empty backend returns `Chưa có dữ liệu tuần`. Future dates clamp to latest real week with clear notice.
  - **B3 – Không làm mất tuần có dữ liệu**: Changing anchor (e.g. to `10/09/2026`) preserves W38 in dropdown list (newest first). Only real weeks from `/weeks` are displayed.
  - **B4 – Tuần 38**: In-progress Tuần 38 displays real data range `17/09–21/09/2026` and note `Dữ liệu đến ngày 21/09/2026`.
  - **Header Responsiveness**: Typography updated, removed `whitespace-nowrap` on multi-line text to prevent column collision at 1280px / 1440px / mobile.
- PO UI Adjustments (2026-09-28):
  - **Vị trí bộ lọc**: Chuyển khối bộ lọc độc lập lên trên cùng trước tiêu đề báo cáo, tạo khối `.bcvh-weekly-report-capture-area` liền mạch giữa tiêu đề 2 dòng và bảng dữ liệu 11 cột phục vụ chụp ảnh báo cáo.
  - **Tên nhóm cột**: Đổi `CHÊNH LỆCH` thành `SO SÁNH`.
  - **Bỏ lưu ý trong header bảng**: Gỡ badge cảnh báo lệch số ngày khỏi `<th>`, chỉ hiển thị cảnh báo tập trung tại khối bộ lọc phía trên.
  - **Sắp xếp mặc định**: Các BCVH tự động được sắp xếp theo Tỷ lệ đạt KPI 2026 của Tuần kỳ này giảm dần (`current_rate` desc), tie-break bằng sản lượng đo kiểm.
  - **Hỗ trợ đảo chiều sắp xếp (Sort toggle) toàn diện**: Tích hợp hàm `sortBcvhWeeklyRows` và `renderSortableTh` cho phép người dùng click vào bất kỳ tiêu đề cột nào (mã, tên, sản lượng đo kiểm, số đạt, tỷ lệ đạt KPI, chênh lệch) để đảo chiều tăng dần/giảm dần, có icon định hướng `ArrowDown`/`ArrowUp`/`ArrowUpDown`.
- **Product Owner Acceptance**: Product Owner đã trực tiếp kiểm tra giao diện, xác nhận hoàn thành xử lý các blocker B1–B4 và các yêu cầu điều chỉnh UI, chính thức xác nhận **PO UI PASS / CLOSED** cho ticket `F13-BCVH-WEEKLY-COMPARISON-01` (2026-09-28).

## 3. Required Reading

- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/04_TECHNICAL_PLANNING/Feature/F13-BCVH-WEEKLY-COMPARISON-01_DESIGN.md` (Design of Record, updated with Remediation Section 5 & 5.6)
- `docs/06_REVIEWS/BCVH/F13-BCVH-WEEKLY-COMPARISON-01_CHECKPOINT_001.md` (Checkpoint 001)

## 4. Implementation & Remediation Record

### 4.1 Files Changed in Remediation & UI Adjustments

- `frontend/src/features/ranking/bcvhWeeklyComparisonData.js` — helper functions for `snapToThursday`, `resolveWeekFromAnchorDate`, `resolveWeeksListWithAnchor`, `buildWeekOptions`, `checkWeeksDaysMismatch`, `formatWeekDataNote`, và hàm sắp xếp đa cột `sortBcvhWeeklyRows`.
- `frontend/src/features/ranking/BcvhWeeklyComparisonBlock.jsx` — bảng điều hành mới độc lập theo chuẩn Operation Dashboard (bộ lọc đặt trên cùng, khối tiêu đề 2 dòng liền với bảng, nhóm cột `SO SÁNH` sạch sẽ không chứa badge lưu ý, hỗ trợ click sort toggle trên toàn bộ các cột, mặc định xếp theo `current_rate` giảm dần).
- `frontend/src/features/ranking/bcvhWeeklyComparisonData.test.js` — 14 behavioral tests covering B1–B4, empty states, date snapping, and multi-column sorting (rate, volume, name, delta).
- `frontend/src/features/ranking/bcvhWeeklyComparisonBlock.test.js` — 10 integration tests covering component decoupling, independent filters, filter placement above title, SO SÁNH header, header non-overflow, and interactive multi-column sorting.
- `frontend/src/features/ranking/BcvhRankingPage.jsx` — độc lập, không ảnh hưởng khối khác.
- Governance docs: `DESIGN.md`, `CHECKPOINT_001.md`, `MANIFEST.md`, `PROJECT_SNAPSHOT.md`, `DOCUMENT_INDEX.md`.

### 4.2 Validation Results

- `node --test frontend/src/features/ranking/*.test.js`: **62/62 PASS** (100%).
- `node --experimental-sqlite --test backend/src/services/bcvhWeeklyComparisonService.test.js backend/src/repositories/FactBuuGuiRepository.weeklyComparison.test.js`: **15/15 PASS**.
- `oxlint`: **0 errors**.
- `vite build`: **Clean**, built successfully (1.46s).
- No Browser/Playwright used per instruction. No schema, index, or backend contract changes.

## 5. Status & Sign-off

`IMPLEMENTED / PO UI PASS / CLOSED` (2026-09-28).
Product Owner đã trực tiếp kiểm tra và phê duyệt nghiệm thu toàn bộ bảng điều hành so sánh chất lượng tuần tại BCVH Ranking.
Ticket chính thức đóng thành công.


