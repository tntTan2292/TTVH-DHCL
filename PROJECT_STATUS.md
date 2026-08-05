# Project Status

## Purpose

`PROJECT_STATUS.md` là nhật ký tiến độ của dự án.

Quy tắc cập nhật:

- Sau mỗi ticket PASS, bắt buộc cập nhật file này.
- Phải cập nhật các mục:
  - Current Phase
  - Current Ticket
  - Completed Tickets
  - Current Progress
  - Next Ticket

## Current Phase

- `QIS V2`
- `NETWORK-MANAGEMENT-001` — Phase 2 Delivery Route Legend Remediation
- `Status: PHASE 2 DELIVERY ROUTE LEGEND REMEDIATION COMPLETED / READY FOR PO ROUTE VISUAL RECHECK`

## Current Ticket

- `NETWORK-MANAGEMENT-001` — Quản lý mạng lưới (Phase 2 Delivery Route Legend Remediation)
- `Status: PHASE 2 DELIVERY ROUTE LEGEND REMEDIATION COMPLETED / READY FOR PO ROUTE VISUAL RECHECK. Technical Pass on Delivery Route Legend Remediation confirmed. Added an interactive, collapsible Legend Box ('CHÚ GIẢI BẢN ĐỒ') to Sơ đồ tuyến phát: 1) Expandable/collapsible overlay with toggle button. 2) Marker sequence explanation (# number = 'Thứ tự nhập phát theo thời gian', START/END badges, position cluster badges). 3) Service category colors derived directly from code mapping (DELIVERY_LEGEND_ITEMS, DELIVERY_SERVICE_COLORS). 4) Route line style explanations (Solid blue line = OSRM road snapped, Dashed amber line = Fallback straight line). 5) Mandatory quality disclaimer note: 'Màu điểm chỉ thể hiện nhóm dịch vụ, không phản ánh đạt hoặc không đạt chất lượng.' 6) Preserved OSRM road routing, Calendar Date Picker, shift filters, markers, popups, and database invariants. All 59 unit tests pass, oxlint 0 errors/warnings, Vite build succeeds. Ready for PO route visual re-check. NOT moved to Phase 3.`

## Completed Tickets

- `DOC-SSOT-01` - Create Project Master SSOT
- `M1-T1` - BCVH Ranking Recovery
- `M1-T2.4` - BCVH Ranking Alignment Recovery
- `TICKET-0051` - Shipment Performance Center Shell
- `TICKET-0053` - Shipment Performance Center Runtime Data Integration
- `Shipment Performance Center Review`
- `PO UI Acceptance Gate and PO Findings Traceability`
- `GOV-PO-UI-01 PO UI Acceptance Gate and PO Findings Traceability`
- `TODAY-001 Import Daily Data Verification` - PO PASS / MODULE COMPLETED
- `TODAY-001-R1 Import Runtime Route and Reimport Recovery` - CLOSED
- `TODAY-001-R2 Import History Pagination and Vietnam Timezone Recovery` - CLOSED
- `TODAY-002-R1 KPI 2026 Source Column Recovery` - CLOSED
- `TODAY-002-R2 KPI 2026 Dashboard Consistency Recovery` - COMPLETED
- `TODAY-007 Dashboard Executive Layout Cleanup` - PO PASS / COMPLETED
- `TODAY-008 PO Data Reconciliation and Leadership View` - PO PASS / COMPLETED
- `TICKET-0101 Login API and Session` - PO PASS / COMPLETED
- `DASHBOARD-AUDIT-001 Dashboard Widget, Chart and Visual Consistency Audit` - PO PASS / COMPLETED
- `DA-IMPL-001 Dashboard Language and Semantic Foundation` - PO PASS / COMPLETED
- `DA-IMPL-002 Unified Command Summary` - PO PASS / COMPLETED
- `DA-IMPL-003 Integrated Trend and Risk Workspace` - PO PASS / COMPLETED
- `DA-IMPL-004 Unified BCVH Analysis Table` - PO PASS / COMPLETED
- `DA-IMPL-005 Operating Pattern Tabs` - PO PASS / COMPLETED
- `AUTO-IMPORT-002 Automated Download and Validation Pipeline` - PO PASS / COMPLETED
- `AUTO-IMPORT-003 Scheduled Import, Retry, Monitoring and Operations UI` - PO PASS / COMPLETED
- `AUTO-IMPORT-004 TCT Source Discovery and Nationwide Ranking Contract` - PO PASS / COMPLETED
- `AUTO-IMPORT-005 TCT Manual Backfill and Shared DKCL Background Operations` - PO PASS / COMPLETED
- `DA-IMPL-006 Unified Action Center` - PO PASS / COMPLETED
- `DA-IMPL-007 Smart Dashboard Final Assembly` - PO PASS / COMPLETED
- `F13-BCVH-RANKING-REDESIGN-PLAN` - COMPLETED / HANDOFF
- `F13-BCVH-RANKING-REDESIGN-IMPL` - PO PASS / COMPLETED / CLOSED
- `QIS-LAN-DEPLOY-001 F1.3 Local Network Viewer Deployment` - PO PASS / COMPLETED / CLOSED
- `AUTO-IMPORT-010 HUE Browser Broker / Browser Launch Recovery` - PO RUNTIME PASS / COMPLETED / CLOSED; HUE first-click browser-open residual recorded as KNOWN RESIDUAL / DEFERRED / NON-BLOCKING
- `F13-UI-AUDIT-PLAN F1.3 UI Audit and Standardization Planning` - PO PASS PHASE 1-4 / COMPLETED / CLOSED (2026-08-03); latest accepted runtime implementation commit `cdb9eab246415a3835210dd70329996e6ef6521c`
- `F13-STANDARDIZATION-001 — Tuyến Ranking (Route Ranking) delta` - PO PASS / COMPLETED / CLOSED (2026-08-04); latest PO-tested implementation commit `03ce28bacc36b49d961caa1c006a011beb804bc7`; covers only Tuyến Ranking and its violation drill-down — the program's Phase 0-4 remain otherwise unclosed
- `AUTO-IMPORT-012 Emergency follow-up — isolate Import test suites from production data` - COMPLETED / TECHNICAL PASS / CLOSED (2026-08-05); fixed the AUTO-IMPORT-011-confirmed test-isolation defect; no PO UI check applicable (test infrastructure only)
- `AUTO-IMPORT-011 Emergency — 2098 future-date import recurrence and HUE/TCT browser-open failure` - COMPLETED / PO RUNTIME PASS / CLOSED (2026-08-05); Symptom A root-caused and fixed; Symptom B recovered via server restart, no technical root cause, no code fix — recurrence requires a new remediation ticket with live backend console capture before any restart

## Current Progress

- Dashboard Runtime: `PASS`
- BCVH Ranking Runtime: `PASS (Baseline)`
- Architecture Freeze: `PASS`
- UX Freeze: `PASS`
- UX Ready for Technical Planning: `True`
- Implementation Architecture: `PASS`
- Release Planning: `PASS`
- Epic Planning: `PASS`
- Feature Planning: `PASS`
- Development Backlog: `PASS`
- Shipment Performance Center Review: `PASS`
- PO UI Acceptance Governance: `PASS`
- TODAY-001 Import Delivery: `MODULE COMPLETED / PO PASS`
- TODAY-002 Daily Trend Data Adapter: `COMPLETED`
- TODAY-002-R1 KPI 2026 Source Column Recovery: `CLOSED`
- TODAY-002-R2 KPI 2026 Dashboard Consistency Recovery: `COMPLETED`
- DASHBOARD-AUDIT-001: `COMPLETED / PO PASS`
- Approved Dashboard Direction: `Consolidated smart Dashboard`
- DA-IMPL-001: `COMPLETED / PO PASS`
- DA-IMPL-002: `COMPLETED / PO PASS`
- DA-IMPL-003: `COMPLETED / PO PASS`
- DA-IMPL-004: `COMPLETED / PO PASS`
- DA-IMPL-005: `COMPLETED / PO PASS`
- AUTO-IMPORT-001: `COMPLETED / HANDOFF`; `Atomic importer claim - COMPLETED / VERIFIED`
- AUTO-IMPORT-002: `COMPLETED / PO PASS`; `LIVE END-TO-END VERIFICATION PASSED FOR 2026-07-16`
- AUTO-IMPORT-002 implementation commit: `4798ec82bb6cc1f343167a6b596aa5d6f58d57cc`
- AUTO-IMPORT-003: `COMPLETED / PO PASS`
- AUTO-IMPORT-003 accepted operational condition: manual Huế F1.3 backfill requires a valid DKCL authenticated session; while valid, the operator does not need to log in for every `Update`; if expired or invalid, queue creation is blocked before `RUNNING` and the operator is instructed to re-authenticate. No automatic login, credential storage, or additional session persistence is included in this ticket.
- DA-IMPL-005 accepted UI/UX follow-up: Heatmap responsive layout at 100% desktop zoom, month block adaptation, controlled scrolling or compact cell sizing, non-overlapping chart legends/labels, improved spacing, typography, information density, and desktop usability without browser zoom changes were completed, absorbed, and accepted within `DA-IMPL-007`.
- AUTO-IMPORT-004: `COMPLETED / PO PASS`; controlled TCT F1.3 import accepted for `2026-07-19` with Hue rank `24/34`.
- AUTO-IMPORT-005: `COMPLETED / PO PASS`
- DA-IMPL-006: `COMPLETED / PO PASS`
- DA-IMPL-007: `COMPLETED / PO PASS`
- F13-BCVH-RANKING-REDESIGN-IMPL: `COMPLETED / PO PASS / CLOSED`; verified implementation commit `a6235b2fc99fd662971a7c0fc9d7f43190b133b4`
- F13 accepted contract: Dashboard BCVH table stays compact overview; `/f13/ranking/bcvh` stays detailed independent ranking; `D-1` and `D-7` each render `Sản lượng / Tỷ lệ / SS SL / SS Tỷ lệ`; comparison-rank and rank-movement columns are not rendered; KPI labels remain `Tốt / Cần chú ý / Cảnh báo / Rủi ro cao`; route-distribution labels remain `Tốt / Khá / Trung bình / Kém`
- F13 delayed-cash SSOT accepted for `2026-07-28`: numerator `334`, denominator `1536`, rate `21.7%`; denominator includes canonical selected-day BCVH facts with `danh_gia_2026 != Đạt`, missing/invalid timestamps stay in the denominator, and zero denominator publishes `0%`
- Pre-DA-IMPL-007 focused Import Center/Dashboard regression remediation: `COMPLETED / PO PASS` on `2026-07-21`; accepted commits are `f32afc3`, `43dc587`, `5d44b69`, and `de8bcbd27470e521d4c52be1d16b2be01fb73dc8`.
- TICKET-0102: `DEFERRED / INACTIVE`
- PO findings from TODAY-001: `CLOSED`
- PO UI Check Required: `No`
- QIS-LAN-DEPLOY-001: `COMPLETED / PO PASS / CLOSED`; accepted runtime remediation commit `99c865e92b840a587dc9a889294c535fecc68816`; frontend `5178`, backend `5050`, viewer username configured locally as `ttvhhue`, viewer auth operational, viewer restricted to completed F1.3 screens, admin unchanged
- F13-UI-AUDIT-PLAN: `COMPLETED / PO PASS (PHASE 1-4) / CLOSED` (2026-08-03); Phase 4 - Operation Dashboard final acceptance: heatmap shows month-cumulative rank in the `TB THÁNG` cell, backend restarted, Product Owner confirmed runtime result; latest accepted commit `cdb9eab246415a3835210dd70329996e6ef6521c`
- F13-SHARED-NAV-FILTERS-IMPL: `COMPLETED / PO UI PASS / CLOSED` (2026-08-04); final implementation commit `e4c57e0d`
- F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT-PLAN: `CLOSED — PO DECISIONS RECORDED` (2026-08-04); read-only audit of database, API capabilities, and all F1.3 surfaces. PO decisions: `danh_gia_2026` is the authoritative F1.3 result field (FINAL); the duplicate overwrite/upsert rule on the authoritative business key is already decided; year-2098 removal authorized; the duplicate count is a technical validation item
- F13-DATA-2098-CLEANUP-IMPL: `COMPLETED / TECHNICAL PASS / CLOSED` (2026-08-04); reviewed implementation commit `3b605beb7ed2deeae239dbb050cf9b03fbad9c43`; 4 `fact_f13` + 4 `import_log` rows deleted, zero 2098 rows and zero `BCVH TEST` rows remain, 2026 unchanged at 663,126 rows / 213 days, authoritative `danh_gia_2026` KPI remains `58.6233%`; pre-cleanup backup retained and must not be deleted
- F1.3 confirmed open data-quality defects: `FOUR` — `DQ-02`, `DQ-05`, `DQ-06`, `DQ-08`. `DQ-01` and `DQ-03` closed by the 2098 cleanup; `DQ-04` resolved by PO decision; `DQ-07` retracted (`ma_bg` alone is not the business key; the enforced key is `UNIQUE(ngay_do_kiem, ma_bg)` and zero duplicates exist on it)
- F13-STANDARDIZATION-001 program activated (2026-08-04): locked five-phase F1.3 standardization plan; Phase 0 foundational items implemented and technically validated (commit `e3ca2429`) — KPI field standardization to `danh_gia_2026` (remediates `RESIDUAL-01`), two audited `/f13` API path fixes, `dd/MM/yyyy` timestamp parsing fix; not separately PO-runtime-confirmed as its own closure.
- F13-STANDARDIZATION-001 Tuyến Ranking (Route Ranking) delta: `COMPLETED / PO PASS / CLOSED` (2026-08-04); Route Ranking data contract standardized (`a0d4b041`), violations classified into `Chậm nộp tiền` / `Không đạt khác` / `Chưa xác định nguyên nhân` with API contract (`a892a276`), UI/UX refined (`6e575308`), pagination `10 tuyến/trang` and default ascending `passed_rate` sort added and PO-confirmed (`03ce28ba`). Scope: Tuyến Ranking and its violation drill-down only.
- F13-SHIPMENT-001 (Shipment Performance Center): remains `DEFERRED / PRESERVED`; its delta changes are preserved untouched in git stash (`F13-SHIPMENT-001: preserved Shipment Performance Center delay/status changes`), pending Product Owner reactivation.
- PO Product Status: `Tuyến Ranking (Route Ranking) delta closed; program otherwise awaiting Product Owner direction`

## Next Ticket

- Current active ticket: `None`.
- Next planned action: `Await explicit Product Owner direction, including whether to resume NETWORK-MANAGEMENT-001 (Phase 1 COMPLETED / TECHNICAL PASS, PAUSED). If the HUE/TCT browser-open failure recurs, open a new remediation ticket and capture live backend console output before any restart.`
- Candidates only, not authorized tickets: `(1) formally start F13-STANDARDIZATION-001 Phase 1 (Chuẩn hóa cấu trúc F1.3); (2) reactivate deferred F13-SHIPMENT-001 (Shipment Performance Center), whose delta remains preserved in a git stash; (3) F13-SURFACE-CLEANUP-PLAN covering Evidence merge, Message Center hide, Vietnamese Shipment Ranking naming, redirect behavior, and verified orphan-page removal; (4) Pareto product design later, distinguishing Pareto analysis from true RCA. Evidence MERGE and Message Center HIDE remain pending explicit Product Owner confirmation and must not be inferred. RESIDUAL-01 is remediated as of Phase 0 implementation commit e3ca2429 and is no longer an open candidate.`

## Notes

- `PROJECT_SSOT.md` là tài liệu kiến trúc và quyết định cuối cùng.
- `PROJECT_STATUS.md` chỉ ghi trạng thái tiến độ hiện hành, không ghi lịch sử trao đổi dài.
- Từ nay, chat mới chỉ cần đọc:
  - `docs/PROJECT_SSOT.md`
  - `PROJECT_STATUS.md`
