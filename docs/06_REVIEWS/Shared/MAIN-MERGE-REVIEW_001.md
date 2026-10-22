# MAIN-MERGE-REVIEW-001 — Bảng rà soát các ticket trước khi đưa lên `main`

Ngày lập: 2026-10-22. Người lập: Claude Code (Sonnet 5.5). Yêu cầu của PO: lập bảng rà soát các ticket để quyết định đưa lên `main`. Tài liệu này chỉ liệt kê và đề xuất; **chưa gộp, chưa đẩy gì lên `main`**.

## 1. Tình hình

| Mục | Giá trị |
| --- | --- |
| `origin/main` | `9bff48d` (2026-07-20, "handoff auto-import-005 to da-impl-006") |
| Nhánh làm việc | `codex/da-impl-006`, đã đẩy lên GitHub (đầu nhánh `ece7548`) |
| Số commit nhánh hơn `main` | **770** (2026-07-20 đến 2026-10-22), **0 commit merge**, `main` không có commit nào mà nhánh thiếu |
| Hệ quả | Lịch sử là một đường thẳng, nên việc gộp là **fast-forward**: `main` sẽ nhảy lên đầu nhánh và mang theo **tất cả 770 commit**. Không chọn riêng từng ticket được nếu không cherry-pick (dễ xung đột, vì các ticket đan xen trong cùng tệp). |
| Manifest ticket chạm trong khoảng này | 96 (93 mới) |
| Commit không ghi mã ticket trong tiêu đề | 493/770 (bảng 5) |

## 2. Sức khỏe của đầu nhánh (kiểm tra 2026-10-22)

- Frontend: **746/746 test đạt**, build sạch, lint chỉ có cảnh báo cũ (import thừa).
- Backend (`node --experimental-sqlite --test`): **590/595 đạt, 5 lỗi, không lỗi nào do công việc gần đây**:
  - `DashboardController.r6.integration.test.js` (3 test): cần backend chạy thật trên cổng, lỗi `fetch failed` (môi trường).
  - `f11TctExcelParser.test.js` "real single-day TCT file": đã được ghi nhận từ trước trong PROJECT_SNAPSHOT (cập nhật 12/10); liên quan thay đổi KXD của phiên khác.
  - `timelineService.recovery.test.js` "monthly rank enrichment…": test dò chuỗi nguồn đã lỗi thời so với mã (liên quan F13-TIMELINE-RECOVERY-DEFECT-01).
- Chưa chạy: các bộ `test_*.js` ở thư mục gốc backend (lệnh sweep không gom).

## 3. Tổng hợp theo nhóm

| Nhóm | Số ticket | Đề xuất |
| --- | ---: | --- |
| A. Đã đóng / PO duyệt | 48 | Có thể lên main |
| B. Đã làm, chờ PO kiểm hoặc mới "chấp nhận tạm" | 19 | Cần PO duyệt (hoặc ghi rõ chấp nhận) trước khi lên main |
| C. Code đã vào, đang TẮT hoặc chờ chạy thật / chờ bật | 8 | Lên main được nếu mặc định đang TẮT; PO xác nhận |
| D. Chỉ kế hoạch, khám phá, lỗi đã đăng ký hoặc tạm dừng | 8 | Tài liệu: lên main được; không có code chạy |
| E. Trạng thái trên manifest không rõ / lỗi thời (cần xác nhận) | 13 | Cập nhật manifest / PO xác nhận rồi xếp lại nhóm |

## 4. Bảng ticket (có manifest)

Cột "Chạm" là số commit trong khoảng này đã sửa manifest (không phải số commit mã). Trạng thái lấy từ dòng trạng thái đầu manifest.

### A. Đã đóng / PO duyệt

| Ticket | Thời gian | Chạm | Trạng thái trên manifest | Ghi chú / việc cần làm |
| --- | --- | ---: | --- | --- |
| `DA-IMPL-006` | 07-20 → 07-21 | 2 | - Current state: COMPLETED / PO PASS |  |
| `DA-IMPL-007` | 07-21 → 07-22 | 5 | - Current state: COMPLETED / PO PASS |  |
| `AUTO-IMPORT-001` | 07-22 → 07-22 | 1 | - PO Product Status: NOT REQUIRED (Discovery-only scope has no UI/product acceptance gate, but follow-on imple | Chỉ khám phá, không cần PO UI. |
| `AUTO-IMPORT-003` | 07-24 → 07-24 | 1 | - Current state: COMPLETED / PO PASS |  |
| `AUTO-IMPORT-004` | 07-24 → 07-24 | 1 | - Current state: COMPLETED / PO PASS |  |
| `AUTO-IMPORT-007` | 07-24 → 07-26 | 10 | - Current State: GOVERNANCE CLOSURE / PO PASS |  |
| `DA-IMPL-004-MTD` | 07-24 → 07-24 | 1 | - Current state: COMPLETED / PO PASS |  |
| `DA-IMPL-008` | 07-27 → 07-28 | 14 | - Current state: COMPLETED / PO PASS |  |
| `F13-BCVH-RANKING-REDESIGN-IMPL` | 07-28 → 07-29 | 6 | - Current state: COMPLETED / PO PASS / CLOSED |  |
| `F13-BCVH-RANKING-REDESIGN-PLAN` | 07-28 → 07-28 | 2 | F13-INTERNAL-ROUTE-AUDIT is COMPLETED / PO PASS. |  |
| `F13-INTERNAL-ROUTE-AUDIT` | 07-28 → 07-28 | 6 | - Current state: COMPLETED / PO PASS |  |
| `F13-UI-AUDIT-PLAN` | 07-29 → 08-03 | 9 | - Current state: COMPLETED / PO PASS (PHASE 1-4) / CLOSED |  |
| `QIS-LAN-DEPLOY-001` | 07-29 → 07-29 | 4 | - Current state: COMPLETED / PO PASS / CLOSED |  |
| `AUTO-IMPORT-010` | 07-31 → 07-31 | 7 | - Current State: COMPLETED / PO RUNTIME PASS / CLOSED |  |
| `F13-ROUTE-RANKING-REDESIGN-IMPL` | 08-03 → 08-03 | 10 | Status: COMPLETED / PO PASS / CLOSED (2026-08-03). Final PO-accepted implementation commit: 43819b9272910fcadd |  |
| `F13-ROUTE-RANKING-REDESIGN-PLAN` | 08-03 → 08-03 | 3 | Status: COMPLETED / CLOSED (2026-08-03). Final locked design decisions are recorded in docs/06_REVIEWS/Route/F |  |
| `F13-SHARED-NAV-FILTERS-IMPL` | 08-03 → 08-04 | 5 | - Current state: COMPLETED / PO UI PASS / CLOSED |  |
| `F13-DATA-2098-CLEANUP-IMPL` | 08-04 → 08-04 | 2 | - Current state: COMPLETED / TECHNICAL PASS / CLOSED |  |
| `F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT-PLAN` | 08-04 → 08-04 | 3 | - Current state: CLOSED — PO DECISIONS RECORDED 2026-08-04 |  |
| `NETWORK-MANAGEMENT-001` | 08-04 → 08-10 | 23 | - [36. Program Final Closure — PO FINAL PASS / COMPLETED / CLOSED](#36-program-final-closure--po-final-pass--c |  |
| `AUTO-IMPORT-011` | 08-05 → 08-05 | 2 | - Current State: COMPLETED / PO RUNTIME PASS / CLOSED |  |
| `AUTO-IMPORT-013` | 08-07 → 08-07 | 3 | - Phase: Emergency remediation — CLOSED |  |
| `AUTO-IMPORT-014` | 08-08 → 08-10 | 4 | - Phase: Emergency remediation — CLOSED |  |
| `NETWORK-MANAGEMENT-002` | 08-10 → 08-10 | 4 | - [14. Implementation Record — READY FOR PO CHECK](#14-implementation-record--ready-for-po-check) | Manifest ghi READY FOR PO CHECK nhưng PROJECT_SNAPSHOT ghi CLOSED / PO PASS (11/08): cập nhật manifest. |
| `F41-MODULE-PLAN` | 08-17 → 08-17 | 3 | Status: PLAN COMPLETE / AWAITING PO APPROVAL (2026-08-17, planning remediation round applied). Planning and do | Kế hoạch; F4.1 đã làm xong theo kế hoạch (F41-PHASE-2, F41-DASHBOARD-RANKING-01 PO PASS). |
| `F41-PHASE-0` | 08-17 → 08-17 | 1 | Status: PHASE 0 COMPLETE / READY FOR PO REVIEW (2026-08-17). Documentation only — no product code, database, s | Giai đoạn đầu của F4.1; F41-PHASE-2 và F41-DASHBOARD-RANKING-01 đã PO PASS. |
| `F41-PHASE-1` | 08-17 → 08-17 | 2 | Status: PHASE 1 COMPLETE / READY FOR PO REVIEW (2026-08-17). | Giai đoạn đầu của F4.1; F41-PHASE-2 và F41-DASHBOARD-RANKING-01 đã PO PASS. |
| `F41-PHASE-2` | 08-17 → 09-08 | 5 | Status: CLOSED / PO PASS (2026-09-08). Product Owner decision received in chat: "PO PASS / F41-PHASE-2 CLOSED  |  |
| `AUTO-BACKFILL-F41` | 08-18 → 08-18 | 7 | Status: COMPLETED / PO GATE 4 PASS (2026-08-18). |  |
| `AUTO-BACKFILL-PLAN` | 08-18 → 08-18 | 2 | Status: PLAN COMPLETE / PO APPROVED (2026-08-18). The planning execution was documentation only. Product Owner | Kế hoạch đã được PO phê duyệt (18/08). |
| `AUTO-BACKFILL-SAFETY` | 08-18 → 08-18 | 2 | Status: COMPLETED / PO GATE 5 PASS (2026-08-18). |  |
| `AUTO-BACKFILL-UI` | 08-18 → 08-19 | 8 | Status: READY FOR PO FINAL PLAN APPROVAL (2026-08-18). | Manifest ghi READY FOR PO FINAL PLAN APPROVAL; đã được AUTO-BACKFILL-UI-REMEDIATION (PO UI CHECK PASS) thay thế. |
| `AUTO-BACKFILL-COVERAGE-EXCEPTION` | 08-19 → 08-19 | 4 | Status: CLOSED / PO BACKEND GATE PASS (2026-08-19). |  |
| `AUTO-BACKFILL-UI-REMEDIATION` | 08-19 → 08-20 | 4 | Status: CLOSED / PO UI CHECK PASS (frontend, 2026-08-20); backend deltas (Sections 5-6) PO BACKEND GATE PASS.  |  |
| `F41-DASHBOARD-MINIMUM-01` | 09-08 → 10-09 | 8 | Status: PHASE F1 DELIVERED AND CLOSED under F41-DASHBOARD-RANKING-01 (Sections 12-13, 2026-10-09); earlier sta | Giai đoạn F1 đã giao và đóng dưới F41-DASHBOARD-RANKING-01. |
| `F13-BCVH-MONTHLY-CUMULATIVE-01` | 09-15 → 09-17 | 6 | Status: CLOSED / PO PASS (2026-09-17). Product Owner accepted the final UI at implementation commit 03b925e802 |  |
| `IMPORT-BULK-REIMPORT-ALL-01` | 09-15 → 09-22 | 11 | Status: IMPLEMENTED / PO UI PASS / CLOSED (2026-09-22). Registered 2026-09-15. See Section 6-7 for the complet |  |
| `F13-BCVH-DAILY-SAMEWEEKDAY-01` | 09-22 → 09-22 | 2 | IMPLEMENTED / PO UI PASS / CLOSED (2026-09-22). See Section 7 for closure record. |  |
| `F13-BCVH-WEEKLY-COMPARISON-01` | 09-22 → 09-28 | 4 | IMPLEMENTED / PO UI PASS / CLOSED (2026-09-28). |  |
| `AUTO-IMPORT-015` | 10-02 → 10-03 | 3 | CLOSED -- PROVISIONAL (2026-10-03). No PO UI PASS was awarded; see Section 12. Previously: IMPLEMENTED -- READ | Đóng TẠM (provisional) theo lệnh PO 03/10, không có PO UI PASS; mở lại nếu tái diễn. |
| `UI-CHART-DATA-LABELS-01` | 10-03 → 10-03 | 4 | Status: IMPLEMENTED / PO UI PASS / CLOSED (2026-10-03). Frontend-only; no backend, API, SSOT or KPI change. |  |
| `F13-BCVH-MONTHLY-COMPARISON-01` | 10-07 → 10-07 | 2 | Status: IMPLEMENTED / PO UI PASS / CLOSED (2026-10-07). |  |
| `F13-BCVH-WEEKLY-TREND-01` | 10-07 → 10-07 | 4 | Status: IMPLEMENTED / PO UI PASS / CLOSED (2026-10-07; reopened and re-closed the same day with extended scope |  |
| `F41-DASHBOARD-RANKING-01` | 10-08 → 10-09 | 12 | Status: IMPLEMENTED / PO UI PASS / CLOSED (2026-10-09). All of T0-T6 and T8 done; G1 passed 2026-10-08; G2 (/f |  |
| `UI-BCVH-RANKING-DECLUTTER-01` | 10-08 → 10-08 | 1 | Status: IMPLEMENTED / PO UI PASS / CLOSED (2026-10-08). |  |
| `TEST-API-BASE-URL-STALE-01` | 10-09 → 10-09 | 1 | Status: IMPLEMENTED / CLOSED (2026-10-09). Executor: Claude Code (Sonnet 5.5). Test-only, LEVEL 1; PO UI Check |  |
| `UI-IMPORT-DAYVIEW-01` | 10-10 → 10-10 | 7 | Status: IMPLEMENTED / PO UI PASS / CLOSED (2026-10-10). See Section 11 for the closure. History: round 1 deliv |  |
| `AUTO-LOGIN-01` | 10-20 → 10-20 | 2 | Status: CLOSED - NOT FEASIBLE (captcha); code removed 2026-10-21 | CLOSED - NOT FEASIBLE (captcha); code đã gỡ 21/10. |

### B. Đã làm, chờ PO kiểm hoặc mới "chấp nhận tạm"

| Ticket | Thời gian | Chạm | Trạng thái trên manifest | Ghi chú / việc cần làm |
| --- | --- | ---: | --- | --- |
| `COORDINATOR-ROLE-MIGRATION` | 08-19 → 08-19 | 1 | Status: IMPLEMENTED / READY FOR PO CHECK (2026-08-19). | Tài liệu, ghi READY FOR PO CHECK. |
| `F11-PHASE-0` | 10-09 → 10-09 | 1 | Status: PHASE 0 COMPLETE / READY FOR PO REVIEW (2026-10-09). Documentation only — no product code, database, s |  |
| `F11-PHASE-1` | 10-09 → 10-09 | 5 | Status: IMPLEMENTED / TECH PASS / READY FOR PO REVIEW (2026-10-09). Backend foundation only: table, file reade |  |
| `F11-PHASE-2` | 10-09 → 10-09 | 1 | Status: IMPLEMENTED / TECH PASS / FIRST LIVE LOAD DONE / READY FOR PO REVIEW (2026-10-09). Import of the Huế F |  |
| `F11-PHASE-3` | 10-09 → 10-10 | 10 | Status: IMPLEMENTED / LIVE RUN PASSED / REVIEWED (Opus) / ENABLED IN CODE (2026-10-10). Portal discovery and a |  |
| `F11-PHASE-4` | 10-09 → 10-09 | 1 | Status: IMPLEMENTED / TECH PASS / FIRST LIVE LOAD DONE / READY FOR PO REVIEW (2026-10-09). TCT national lane f |  |
| `UI-DELTA-WORDING-01` | 10-09 → 10-09 | 1 | Status: IMPLEMENTED / READY FOR PO UI CHECK (2026-10-09). Executor: Claude Code (Sonnet 5.5). Frontend only, n |  |
| `F11-DASHBOARD-RANKING-01` | 10-10 → 10-10 | 3 | Status: BACKEND DONE / SCREENS DELIVERED (F11-DASHBOARD-UI-01) / WAITING FOR THE PO UI CHECK WITH REAL DATA (2 | Backend xong, màn hình đã giao (F11-DASHBOARD-UI-01); chờ PO kiểm với dữ liệu thật. |
| `F11-DASHBOARD-UI-01` | 10-10 → 10-11 | 11 | Status: DELIVERED / REVIEWED / READY FOR PO CHECK (2026-10-10); see Sections 9-10 for the PO delta and the rev |  |
| `F12-PHASE-0-4` | 10-11 → 10-11 | 1 | Status: IMPLEMENTED / TECH PASS / FIRST LIVE LOAD DONE (2026-10-11). F1.2 reference package (Phase 0), data fo | TECH PASS, đã nạp thật lần đầu. |
| `UI-GLASS-THEME-01` | 10-11 → 10-11 | 2 | Status: PHASE A IMPLEMENTED / OPUS REVIEWED, BLOCKER FIXED / ACCEPTED BY PO FOR NOW (2026-10-11); PHASE B NOT  | Giai đoạn A: PO chấp nhận "tạm thời". |
| `UI-GLASS-THEME-02` | 10-11 → 10-11 | 3 | Status: PARTIALLY IMPLEMENTED / OPUS REVIEWED, BLOCKERS FIXED (2026-10-11); REMAINING PAGES NOT YET THEMED. Ph | Làm một phần, Opus review đã sửa blocker; còn trang chưa phủ giao diện. |
| `UI-GLASS-THEME-03` | 10-11 → 10-11 | 2 | Status: READY FOR PO UI CHECK (2026-10-11). Phase C of the light Glass theme: the pages that UI-GLASS-THEME-02 |  |
| `UI-VN-LABELS-01` | 10-11 → 10-11 | 1 | Status: IMPLEMENTED / TECH PASS / ACCEPTED BY PO FOR NOW (2026-10-11). Display text only: no route, path, perm | PO chấp nhận "tạm thời", chưa PASS chính thức. |
| `F12-DASHBOARD-RANKING-01` | 10-12 → 10-12 | 4 | Status: BACKEND DONE / TECH PASS / WAITING FOR THE SCREENS (F12-DASHBOARD-UI-01) AND A BACKEND RESTART (2026-1 | Backend xong; màn hình do F12-DASHBOARD-UI-01. |
| `F12-DASHBOARD-UI-01` | 10-12 → 10-13 | 5 | Status: READY FOR PO CHECK (2026-10-12). Screens for F1.2 (thu gom liên tỉnh): Operation Dashboard and Ranking |  |
| `HOME-BI-01` | 10-13 → 10-13 | 8 | Status: READY FOR PO CHECK (2026-10-13). Executive Home page (Trang chủ điều hành) for the leadership of Bưu đ |  |
| `IMPORT-LOG-AUDIT-01` | 10-16 → 10-19 | 12 | Status: IMPLEMENTED / READY FOR PO UI CHECK |  |
| `HOME-BI-02` | 10-21 → 10-22 | 14 | Trạng thái: IMPLEMENTED / TECH PASS / READY FOR PO UI CHECK (2026-10-21). Người làm: Claude Code (backend + gi |  |

### C. Code đã vào, đang TẮT hoặc chờ chạy thật / chờ bật

| Ticket | Thời gian | Chạm | Trạng thái trên manifest | Ghi chú / việc cần làm |
| --- | --- | ---: | --- | --- |
| `IMPORT-TCT-TIMEOUT-01` | 10-09 → 10-09 | 1 | Status: IMPLEMENTED / TECH PASS / PENDING RUNTIME VERIFICATION (2026-10-09). Executor: Claude Code (Sonnet 5.5 | TECH PASS, chờ xác nhận chạy thật. |
| `QIS-HTTPS-LAN-01` | 10-10 → 10-10 | 1 | Status: IMPLEMENTED / TECH PASS / WAITING FOR THE FRONTEND RESTART AND THE PO CHECK (2026-10-10). Serve the QI | TECH PASS, chờ khởi động lại frontend và PO kiểm. |
| `F12-PHASE-3` | 10-11 → 10-12 | 4 | Status: IMPLEMENTED / SUPERVISED DRY RUN PASSED (PO accepted) / ENABLED, BACKEND RESTART AND FIRST AUTO BACKFI | Chạy thử có giám sát PASS (PO chấp nhận), đã bật; chờ khởi động lại backend và đợt backfill đầu. |
| `PERF-LOAD-01` | 10-13 → 10-13 | 10 | Status Phase 1 IMPLEMENTED (2026-10-13, Claude Code/Sonnet 5.5); Phases 2-4 not authorized | Phase 1-2 đã giao; chế độ shadow bật trong .env, chờ chạy một ngày làm việc có giám sát rồi mới chuyển "on". |
| `IMPORT-COVERAGE-SPEED-01` | 10-16 → 10-16 | 2 | Status: IMPLEMENTED (backend only) / needs backend restart | Chỉ backend, cần khởi động lại backend và kiểm chạy thật. |
| `AUTO-IMPORT-SCHEDULE-01` | 10-20 → 10-21 | 7 | Status: BACKEND IMPLEMENTED / OFF BY DEFAULT (keep-alive on) / WAITING FOR THE PO TO ENABLE | Code xong, TẮT mặc định, chờ PO bật. |
| `AUTO-BACKFILL-PARALLEL-LANES-01` | 10-21 → 10-21 | 2 | Status: BACKEND IMPLEMENTED, OPUS REVIEWED (PASS WITH FIXES, fixed) / OFF BY DEFAULT / WAITING FOR THE PO TO E | Code xong, Opus review PASS WITH FIXES, TẮT mặc định, chờ PO bật. |
| `UI-TREND-7DAY-CUM-01` | 10-21 → 10-21 | 5 | Status: BACKEND DELIVERED / UI WITH ANTIGRAVITY (2026-10-21). Parallel workstream: PROJECT_SNAPSHOT.md Current | Luồng song song của phiên khác: backend đã giao, giao diện đang làm với Antigravity (tệp IntegratedTrendRiskWorkspace.jsx còn sửa dở trong thư mục). |

### D. Chỉ kế hoạch, khám phá, lỗi đã đăng ký hoặc tạm dừng

| Ticket | Thời gian | Chạm | Trạng thái trên manifest | Ghi chú / việc cần làm |
| --- | --- | ---: | --- | --- |
| `F13-SHARED-NAV-FILTERS-PLAN` | 08-03 → 08-03 | 3 | Audit and propose a comprehensive standardization plan for shared navigation (SidebarNavigation, Topbar, Bread | Kế hoạch; việc thực hiện đã PO UI PASS (F13-SHARED-NAV-FILTERS-IMPL). |
| `F13-DASHBOARD-RECOVERY-DEFECTS-01` | 09-08 → 09-09 | 2 | Status: DISCOVERED / NOT ACTIVATED (2026-09-08). Registration only — no code was changed by this ticket, and n | DISCOVERED / NOT ACTIVATED: chỉ đăng ký lỗi. |
| `F13-TIMELINE-RECOVERY-DEFECT-01` | 09-09 → 09-09 | 1 | Status: DISCOVERED / NOT ACTIVATED (2026-09-09). Registration only — no code was changed by this ticket, and n | DISCOVERED / NOT ACTIVATED: chỉ đăng ký lỗi (còn 1 test nguồn lỗi thời trong timelineService.recovery.test.js). |
| `ADMIN-USER-MODULE-ACCESS-01` | 09-15 → 09-15 | 1 | Status: DISCOVERY / READ-ONLY AUDIT AUTHORIZED / QUEUED (2026-09-15). Separate workstream in the current coord | Kiểm tra chỉ-đọc đã cho phép, đang xếp hàng. |
| `F13-ROUTE-POSTMAN-IDENTITY-01` | 09-15 → 09-20 | 11 | Status: PHASE 3 UI IMPLEMENTED / READY FOR PO UI CHECK (2026-09-19). Directory foundation (Phase 1), ranking c | TẠM DỪNG theo quyết định PO (hiển thị bưu tá ở Tuyến Ranking); Phase 3 UI đã làm, chờ PO. |
| `UI-DATA-TABLE-READABILITY-01` | 09-15 → 09-15 | 2 | Status: DISCOVERY / READ-ONLY AUDIT AUTHORIZED / URGENT (2026-09-15). Cross-cutting UI accessibility/readabili | Kiểm tra chỉ-đọc, mức KHẨN, chưa làm. |
| `F11-MODULE-PLAN` | 10-09 → 10-09 | 4 | Status: PLAN COMPLETE / AWAITING PO DECISIONS (Gate 0, 2026-10-09). Planning and documentation only — no produ | Kế hoạch chờ PO quyết; F11-PHASE-* đã triển khai theo kế hoạch. |
| `F12-MODULE-PLAN` | 10-11 → 10-11 | 3 |  | Kế hoạch (tài liệu), manifest không có dòng trạng thái; đã được F12-PHASE-* thực hiện. |

### E. Trạng thái trên manifest không rõ / lỗi thời (cần xác nhận)

| Ticket | Thời gian | Chạm | Trạng thái trên manifest | Ghi chú / việc cần làm |
| --- | --- | ---: | --- | --- |
| `AUTO-IMPORT-006` | 07-22 → 07-24 | 14 | - Current State: ACTIVE / AWAITING NEXT AUTHORIZATION | Manifest ghi ACTIVE / AWAITING NEXT AUTHORIZATION: xác nhận đã đóng. |
| `DOC-GOV-CLEANUP-001` | 07-24 → 07-24 | 3 |  | Manifest không có dòng trạng thái. |
| `AUTO-IMPORT-008` | 07-26 → 07-27 | 7 | Order Defect Status Current Authorization | Đầu manifest không có dòng trạng thái rõ; mã trong snapshot ghi COMPLETED / CLOSED. |
| `AUTO-IMPORT-009` | 07-27 → 07-30 | 9 | - Current State: ACTIVE / PO RUNTIME FAIL | Manifest còn ghi ACTIVE / PO RUNTIME FAIL; AUTO-IMPORT-010 đóng sau đó (PO RUNTIME PASS): xác nhận 009 đã được 010 thay thế. |
| `F13-DATA-QUALITY-001` | 07-28 → 07-28 | 2 |  | Manifest không có dòng trạng thái. |
| `F13-SHIPMENT-001` | 07-28 → 07-28 | 2 |  | Manifest không có dòng trạng thái. |
| `F13-STANDARDIZATION-001` | 08-04 → 09-08 | 64 | - Phase: Program activation (documentation-only), followed by a Product Owner-authorized Tuyến Ranking delta ( | 64 commit chạm manifest, dòng trạng thái là mô tả giai đoạn; snapshot: "Phase 0 partially implemented, Evidence consolidation closed". Cần PO chốt phạm vi đã xong. |
| `AUTO-IMPORT-012` | 08-05 → 08-05 | 1 |  | Chỉ ghi TECHNICAL PASS, chưa có PO. |
| `AUTO-BACKFILL-COVERAGE` | 08-18 → 08-18 | 3 | Status: AUTO-BACKFILL-COVERAGE IMPLEMENTED / READY FOR PO GATE 1 (2026-08-18). | Ghi READY FOR PO GATE 1; các gate 4 và 5 sau đó đã PASS: xác nhận gate 1-3 đã qua. |
| `AUTO-BACKFILL-F13` | 08-18 → 08-18 | 2 | Status: IMPLEMENTED / READY FOR PO GATE 3 (2026-08-18). | Ghi READY FOR PO GATE 3: xác nhận gate đã qua. |
| `AUTO-BACKFILL-QUEUE` | 08-18 → 08-18 | 3 | Status: IMPLEMENTED / READY FOR PO GATE 2 (2026-08-18). | Ghi READY FOR PO GATE 2: xác nhận gate đã qua. |
| `AUTO-BACKFILL-RUNTIME` | 08-20 → 09-07 | 39 | Status: ACTIVATED / READY FOR PO CHECK (2026-08-20; governance activation completed by Codex continuation). | 39 commit chạm manifest; ghi ACTIVATED / READY FOR PO CHECK: xác nhận PO đã kiểm chạy thật. |
| `HANGTON-INVENTORY-01` | 10-17 → 10-19 | 14 | Status: PLANNED (decisions recorded 2026-10-17, no code yet). Does not change Current Ticket. | Manifest ghi PLANNED nhưng commit "docs(hangton)" 19/10 ghi PO UI PASS giai đoạn 3: cập nhật manifest rồi mới tính là đóng. |


## 5. Commit không ghi mã ticket (493)

Phần lớn là công việc có tiêu đề kiểu `fix(import): …` hoặc không theo mẫu. Gom theo khu vực (chưa gán ticket vì tiêu đề không cho biết chắc); khu vực lớn nhất:

| Khu vực (scope) | Số commit | Khoảng ngày | Mẫu tiêu đề gần nhất |
| --- | ---: | --- | --- |
| `import` | 84 | 07-21 → 10-16 | perf(import): batched coverage scan, scan cache with invalidation, faster /import/status,  |
| `docs` | 36 | 07-21 → 08-18 | docs: record blocked F4.1 portal discovery |
| `f13` | 26 | 08-03 → 09-20 | feat(f13): pause route postman display on Route Ranking per PO decision |
| `f13-standardization-001` | 25 | 08-10 → 08-15 | feat(f13-standardization-001): Phase 4 — retire RouteViolationEvidencePage.jsx |
| `ui` | 21 | 07-29 → 10-13 | feat(ui): enhance sidebar navigation with hover peek, pin to lock, search filter, module d |
| `dashboard` | 20 | 07-21 → 08-03 | fix(dashboard): optimize Operation Dashboard layout density and 7-day comparison semantics |
| `fix` | 18 | 07-24 → 08-04 | fix: standardize F1.3 phase 0 foundations |
| `auto-backfill` | 17 | 08-18 → 10-21 | feat(auto-backfill): HUE and TCT queue jobs can run in parallel (per-lane lease and index, |
| `(không theo mẫu)` | 15 | 07-28 → 08-18 | Align F41 TCT national population with F13 |
| `f41-dashboard-ranking-01` | 14 | 10-08 → 10-09 | docs(f41-dashboard-ranking-01): close ticket (PO UI PASS) |
| `f11` | 14 | 10-09 → 10-12 | fix(f11): F1.1 denominator = evaluated parcels (Đạt + Không đạt), supersedes PD-9 (F11-DEN |
| `auto-backfill-ui` | 11 | 08-18 → 08-23 | fix(auto-backfill-ui): stop false-positive WAITING_AUTH banner on a normally running/compl |
| `hangton` | 11 | 10-17 → 10-19 | fix(hangton): totals, >=5 and COD follow the shown levels when columns are hidden; offices |
| `governance` | 10 | 07-22 → 09-15 | docs(governance): complete Import ticket snapshot registration |
| `import-bulk-reimport-all-01` | 10 | 09-21 → 09-22 | docs(import-bulk-reimport-all-01): record Part A independent review 001 (PASS, no blocker) |
| `ranking` | 9 | 08-28 → 09-28 | feat(ranking): UI enhancements and multi-column sorting for BCVH weekly comparison |
| `auto-login` | 8 | 10-20 → 10-20 | feat(auto-login): rate-limited unattended DKCL sign-in, scheduled import, PO probe (all of |
| `gov` | 7 | 07-24 → 07-24 | docs(gov): activate document cleanup ticket |
| `network-map` | 7 | 08-05 → 08-10 | docs(network-map): record PO-confirmed closure of the 5-point ĐTC2 discovery delta |
| `import-log-audit` | 7 | 10-16 → 10-19 | docs(import-log-audit): Opus round-3 review prompt |
| `route-ranking` | 6 | 08-03 → 08-03 | feat(route-ranking): implement CTO-locked Route Ranking redesign MVP |
| `auto-import-014` | 6 | 08-08 → 08-10 | fix(auto-import-014): TCT Re-Update DUPLICATE_DATES delta (StrictMode double-invoke) |
| `network-management-002` | 6 | 08-10 → 08-10 | docs(network-management-002): activate ticket — discovery + planning complete |
| `f41-dashboard-minimum-01` | 5 | 09-08 → 09-15 | docs(f41-dashboard-minimum-01): Phase B1 Independent Re-Review PASS |
| `import-ui` | 5 | 10-19 → 10-19 | fix(import-ui): picking another day for all indicators adds to the selection; round-3 prom |

## 6. Commit và tệp cần PO biết

- `06c289a` **wip**: "another session's uncommitted F1.1 KXD / DKCL preflight changes, saved before an account switch" — thay đổi dở của phiên khác, chưa qua ticket.
- `81a1199` **chore**: "one-off F1.3 analysis scripts, auto-sync helpers, sample notice and patch" — script dùng một lần và bản mẫu tin, lưu trước khi đổi tài khoản.
- Chưa commit trong thư mục (của phiên khác, KHÔNG nằm trong nhánh đã đẩy): `frontend/src/features/dashboard/components/IntegratedTrendRiskWorkspace.jsx` (UI-TREND-7DAY-CUM-01), `backend/migrate_auto_backfill_queue_schema.js` (có lúc bị sửa), `.claude/skills/`.

## 7. Phương án và đề xuất

**Phương án 1 (đề xuất): gộp cả nhánh một lần, sau khi PO chốt các mục "chờ".**
1. PO duyệt hoặc ghi rõ "chấp nhận tạm" cho nhóm B; xác nhận nhóm C đang tắt mặc định.
2. Cập nhật manifest lỗi thời ở nhóm E (nhiều mục chỉ cần PO xác nhận một dòng).
3. Quyết định có giữ hai commit `wip`/`chore` ở mục 6 trên `main` không (đề xuất: giữ vì đã nằm sau lưng lịch sử, nhưng ghi chú trong lần gộp).
4. Sửa hoặc đánh dấu 2 test lỗi thời (timeline, TCT real-file) để `main` có nhánh test sạch.
5. Gắn tag mốc (ví dụ `before-main-merge-2026-10`) rồi fast-forward `main`.

**Phương án 2: gộp theo mốc.** Đưa `main` tới một commit cũ hơn, giữ phần mới ở nhánh. Mốc gợi ý: **`605e8e74`** (cuối ngày 2026-10-08, trước chuỗi F11 / F12 / Glass / Home chưa duyệt), tức 568 commit. Hạn chế: nhóm E và C vẫn lẫn trong phần cũ và mốc không tách sạch theo ticket.

**Phương án 3: cherry-pick từng ticket đã đóng.** Chỉ dùng cho vài ticket nhỏ, rủi ro xung đột cao.

## 8. Việc PO cần quyết

1. Chọn phương án 1 hay 2.
2. Nhóm B: từng ticket "chờ PO" (HOME-BI-01/02, F11-DASHBOARD-UI-01, F12-DASHBOARD-UI-01, UI-GLASS-THEME-02/03, UI-DELTA-WORDING-01, IMPORT-LOG-AUDIT-01, …): duyệt, hay chấp nhận tạm.
3. Nhóm C: xác nhận các tính năng đang TẮT mặc định (AUTO-IMPORT-SCHEDULE-01, AUTO-BACKFILL-PARALLEL-LANES-01) được phép lên `main` ở trạng thái tắt.
4. Nhóm E: xác nhận trạng thái thật của AUTO-IMPORT-006/008/009/012, AUTO-BACKFILL-RUNTIME, F13-STANDARDIZATION-001, HANGTON-INVENTORY-01.
5. Hai commit `wip`/`chore` ở mục 6.
6. Thời điểm khởi động lại backend/frontend để các ticket chờ chạy thật (nhóm C) được kiểm.

## 9. Kết quả đã thực hiện (2026-10-22): đưa phần chắc chắn lên `main`

**Quyết định của PO:** cái gì chắc chắn thì đưa lên `main`, cái chưa chắc để lại trên nhánh (PO làm việc ở nhiều tài khoản Claude nên không nhớ hết từng ticket; Claude Code tự tìm bằng chứng trong kho).

**Cách làm:** lịch sử là một đường thẳng nên chỉ đưa lên được theo kiểu **cắt tại một mốc** (fast-forward, không ghi đè). Mốc được chọn là commit ngay trước ticket đầu tiên còn chưa chắc.
- Bằng chứng bổ sung cho các manifest lỗi thời (commit "close … PO PASS", PROJECT_SNAPSHOT, ghi chú đóng trong tài liệu): AUTO-IMPORT-008 (PO PASS 27/07), AUTO-IMPORT-009 (commit "close PO pass" 27/07), AUTO-IMPORT-012 (đóng cùng ngày, TECHNICAL PASS), AUTO-IMPORT-006 (các giai đoạn đã PO PASS, chỉ còn nhãn ACTIVE), AUTO-BACKFILL-* (gate 4, 5 PASS và COVERAGE-EXCEPTION đóng; sự cố SQLITE_BUSY dưới RUNTIME PO xác nhận 07/09), F13-STANDARDIZATION-001 (các giai đoạn "PO runtime pass"), NETWORK-MANAGEMENT-002 (PO PASS 11/08 theo snapshot). Các ticket này được tính là chắc chắn.
- Ticket đầu tiên còn chưa chắc: **F13-ROUTE-POSTMAN-IDENTITY-01** (đăng ký ở commit \`425ed1c\`, 15/09): Phase 3 UI "READY FOR PO UI CHECK", hiển thị bưu tá đang TẠM DỪNG theo quyết định PO, kiểm Postman Catalog còn chờ PO.

**Mốc đã đưa lên \`main\`:** \`19b00215\` ("docs(f41-dashboard-minimum-01): Phase B1 Independent Re-Review PASS", 2026-09-15), gồm **477 commit** (20/07 → 15/09). \`origin/main\` chuyển từ \`9bff48d\` sang \`19b00215\` bằng fast-forward.

**Kiểm tra trước khi đẩy** (xuất cây tại mốc ra thư mục tạm, không đụng thư mục làm việc):
- Frontend: build sạch; 475/479 test đạt. 4 test lỗi là test lỗi thời đã được sửa ở các ticket sau (3 test dashboardFilterOptions / wording, 1 test dataImportBackfillQueue "API base"), không phải lỗi chức năng.
- Backend (dùng DB thật): 351/355 đạt; 4 lỗi giống hệt đầu nhánh (3 test tích hợp cần backend chạy thật, 1 test timeline dò chuỗi nguồn lỗi thời).
- Không có tệp \`.env\`, khóa, cookie hay phiên đăng nhập thật được thêm; có \`backend/node_modules/\` gồm một số gói runtime Playwright được theo dõi có chủ đích (commit "materialize HUE playwright runtime packages", 31/07).

**Còn lại trên nhánh (chưa lên \`main\`): 294 commit** (từ 15/09). Trong đó:
- **Chắc chắn nhưng bị xếp sau ticket Postman** (không tách được vì lịch sử một đường thẳng): F13-BCVH-MONTHLY-CUMULATIVE-01, IMPORT-BULK-REIMPORT-ALL-01, F13-BCVH-DAILY-SAMEWEEKDAY-01, F13-BCVH-WEEKLY-COMPARISON-01, F13-BCVH-MONTHLY-COMPARISON-01, F13-BCVH-WEEKLY-TREND-01, F41-DASHBOARD-RANKING-01, UI-BCVH-RANKING-DECLUTTER-01, UI-CHART-DATA-LABELS-01, UI-IMPORT-DAYVIEW-01, AUTO-IMPORT-015 (đóng tạm), TEST-API-BASE-URL-STALE-01 (sửa 4 test lỗi thời nói trên).
- **Mốc tiếp theo nếu PO chấp nhận ticket Postman** (hiển thị đang tạm dừng theo quyết định PO, Postman Catalog còn chờ PO kiểm): \`86ef5569\` (09/10, "F41-DASHBOARD-RANKING-01 closed (PO UI PASS)"), thêm **97 commit** gồm toàn bộ các ticket chắc chắn ở trên. Sau mốc này là ticket \`UI-DELTA-WORDING-01\` và chuỗi F11, F12, UI-GLASS, HOME-BI-01/02, PERF-LOAD-01, IMPORT-LOG-AUDIT-01, HANGTON (nhóm B, C, E của mục 4) còn chờ PO.
