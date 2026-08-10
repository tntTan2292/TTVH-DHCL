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
- No active ticket. Most recently closed: `NETWORK-MANAGEMENT-002` (Bản đồ tích hợp Điểm phục vụ + Đường thư cấp 2).
- `Status: AWAITING PO DIRECTION`

## Current Ticket

- `None active.`
- Most recently closed: `NETWORK-MANAGEMENT-002` — Bản đồ tích hợp Điểm phục vụ + Đường thư cấp 2 (Integrated Service Points + Level-2 Mail Route Map).
- `Status: COMPLETED / PO PASS / CLOSED (2026-08-11).` Product Owner reported RUNTIME FAIL on the first delivered version (marker/route overlap too dense; Điểm phục vụ layer only had a whole-layer toggle), remediated same day via independent per-Loại-điểm checkboxes (`IntegratedMap.jsx` only, `ServicePointsMap.jsx`/`Level2RoutesMap.jsx`/backend/schema untouched throughout). Product Owner performed the recheck and confirmed the remediation resolved the density issue, granting explicit `PO PASS` and authorizing closure. Zero product code/schema/DB change made in the closure round. `Data QLML/` and both stashes confirmed untouched throughout the ticket's entire lifecycle. See `docs/10_TICKETS/NETWORK-MANAGEMENT-002_MANIFEST.md` Section 16 and checkpoint Section 14.

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
- `NETWORK-MANAGEMENT-001 Quản lý mạng lưới` - PO FINAL PASS / COMPLETED / CLOSED (2026-08-10); full 4-phase program (Mạng điểm phục vụ, Mạng đường thư cấp 2, Sơ đồ tuyến phát) — see below and `docs/10_TICKETS/NETWORK-MANAGEMENT-001_MANIFEST.md` Section 36
- `NETWORK-MANAGEMENT-002 Bản đồ tích hợp Điểm phục vụ + Đường thư cấp 2` - PO PASS / COMPLETED / CLOSED (2026-08-11); PO-reported marker/route density runtime fail remediated same day — see below and `docs/10_TICKETS/NETWORK-MANAGEMENT-002_MANIFEST.md` Section 16
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
- AUTO-IMPORT-011: `COMPLETED / PO RUNTIME PASS / CLOSED` (2026-08-05); `2098` future-date bypass fixed (commit `d8771174`); Symptom B (HUE/TCT browser-open failure) recovered via PO server restart, no code fix, not root-caused — recurrence requires a new ticket and live backend console capture before restart.
- AUTO-IMPORT-012: `COMPLETED / TECHNICAL PASS / CLOSED` (2026-08-05); test/production isolation guard added to `importPipeline.js` (commit `884c2ec6`), mirroring the existing `db.js` guard.
- NETWORK-MANAGEMENT-001: `PAUSED` at its current state (2026-08-07) by explicit Product Owner instruction, superseded as current active ticket by `AUTO-IMPORT-013`; Phase 4 Sơ đồ tuyến phát Import remains `PO PASS`, untouched, not rolled back.
- AUTO-IMPORT-013: `COMPLETED / PO RUNTIME PASS / CLOSED` (2026-08-07); urgent TCT interactive-login stall at `WAITING_FOR_LOGIN`, fixed by a bounded `LOGIN_TIMEOUT` terminal state (releases browser/lock, reports a specific message instead of hanging indefinitely) plus a frontend fix for a false-positive "window did not appear" warning that fired on the very first normal login poll (commit `f7a74d4f`). Real diagnostic evidence captured during the Product Owner's own TCT login confirmed `isAuthenticated()`'s existing marker regex matched correctly — no detector change was needed or made. Product Owner confirmed TCT login → F1.3 → import end-to-end and HUE regression unaffected; manual credential entry preserved, no auto-login built. See `docs/10_TICKETS/AUTO-IMPORT-013_MANIFEST.md`, `docs/06_REVIEWS/Import/AUTO-IMPORT-013_CHECKPOINT_001.md` through `_CHECKPOINT_003.md`.

- AUTO-IMPORT-014: `COMPLETED / PO RUNTIME PASS / CLOSED` (2026-08-08). General HUE/TCT session-lifecycle reliability hardening (Phase 2, per-source mutex/generalized activeOperation/bounded-retry classification/multi-page rebind/reconciliation, commit `0d959eb`) plus the TCT Re-Update `DUPLICATE_DATES` delta fix (Phase 3, a React.StrictMode double-invoked nested `setState` side effect duplicating a single click, fixed frontend-only, backend validation unweakened, commit `8ea547e`) — both confirmed end-to-end by the Product Owner on the real machine. Final recheck (commit `6159b8b7`): TCT Re-Update succeeds; window visible while `RUNNING`, auto-hides on completion — explicitly PO-accepted behavior, acceptance criterion corrected to match. See `docs/10_TICKETS/AUTO-IMPORT-014_MANIFEST.md`, `docs/06_REVIEWS/Import/AUTO-IMPORT-014_CHECKPOINT_001.md` through `_CHECKPOINT_004.md`.

- NETWORK-MANAGEMENT-001: `COMPLETED / PO FINAL PASS / CLOSED` (2026-08-10), superseding the earlier `PAUSED` line above. Product Owner reviewed the complete accumulated evidence set and explicitly authorized closing the full 4-phase program — no new PO runtime/UI recheck required for this closure. Phase 1 `PO Gate 1 PASS` (2026-08-05); Phase 2 `PO Gate 2 PASS` (2026-08-05); Phase 3 `PO Gate 3 PASS` (2026-08-06, baseline `7da98a79eb8`); Phase 4 — Sơ đồ tuyến phát data-contract remediation, two recheck-fail/fix cycles against the real May 2026 BatchFile (sheet-detection then text-cell coercion, both fixed same day), `Sơ đồ tuyến phát Import PO PASS` (2026-08-07, real May file: 144,289 valid rows, Confirm succeeded), manifest §6's full acceptance checklist (admin-only, "Tạm dừng" handling, cross-module regression, data integrity) reaching Technical PASS (2026-08-08), and 2 closed discovery deltas (5-point ĐTC2 classification; 29-column standardization, where PO explicitly decided not to persist all 29 columns now) both 2026-08-10 — Product Owner FINAL PASS (2026-08-10) constitutes PO Gate 4 PASS and program-wide closure. Documentation-only closure round; zero product code/schema/DB change. `Data QLML/` and both stashes confirmed untouched throughout. See `docs/10_TICKETS/NETWORK-MANAGEMENT-001_MANIFEST.md` Section 36, `docs/06_REVIEWS/Shared/NETWORK-MANAGEMENT-001_CHECKPOINT_001.md` Section 26.

- NETWORK-MANAGEMENT-002: `DISCOVERY + PLANNING COMPLETE` (2026-08-10). New, independent ticket — Bản đồ tích hợp Điểm phục vụ + Đường thư cấp 2 — activated by explicit Product Owner instruction the same day `NETWORK-MANAGEMENT-001` closed; does not reopen it. Read-only discovery only, no product code changed: confirmed the two source screens (Mạng điểm phục vụ, Mạng đường thư cấp 2) already read via existing `admin`+`viewer`-readable API endpoints (zero backend/schema work needed to build the new screen); confirmed both source Map components are self-contained with no existing reusable layer component; identified the ĐTC2 layer's full routing/journey-visual interaction as the main implementation-complexity item; proposed 2 implementation options, recommending the zero-touch-to-originals option by default. See `docs/10_TICKETS/NETWORK-MANAGEMENT-002_MANIFEST.md`, `docs/06_REVIEWS/Shared/NETWORK-MANAGEMENT-002_CHECKPOINT_001.md`.

- NETWORK-MANAGEMENT-002: `COMPLETED / PO PASS / CLOSED` (2026-08-11). Implementation delivered via Option B (new `IntegratedMap.jsx`/`IntegratedMapPage.jsx`, `/network-map/integrated`, both layers default on); Product Owner reported RUNTIME FAIL (marker/route overlap too dense, no per-Loại-điểm density control), remediated same day via independent per-category checkboxes derived from real data (`IntegratedMap.jsx` only, `ServicePointsMap.jsx`/`Level2RoutesMap.jsx`/backend/schema untouched throughout, confirmed via `git diff` at every round); Product Owner performed the recheck and granted explicit `PO PASS`, authorizing closure. Documentation-only closure round; zero product code/schema/DB change. `Data QLML/` and both stashes confirmed untouched throughout the ticket's entire lifecycle. See `docs/10_TICKETS/NETWORK-MANAGEMENT-002_MANIFEST.md` Section 16, `docs/06_REVIEWS/Shared/NETWORK-MANAGEMENT-002_CHECKPOINT_001.md` Section 14.

## Next Ticket

- Current active ticket: `None`. Most recently closed: `NETWORK-MANAGEMENT-002`.
- Next planned action: `Await explicit Product Owner direction for any next ticket. NETWORK-MANAGEMENT-001 and NETWORK-MANAGEMENT-002 are both fully CLOSED and must not be reopened without new explicit Product Owner authorization.`
- Candidates only, not authorized tickets: `(1) formally start F13-STANDARDIZATION-001 Phase 1 (Chuẩn hóa cấu trúc F1.3); (2) reactivate deferred F13-SHIPMENT-001 (Shipment Performance Center), whose delta remains preserved in a git stash; (3) F13-SURFACE-CLEANUP-PLAN covering Evidence merge, Message Center hide, Vietnamese Shipment Ranking naming, redirect behavior, and verified orphan-page removal; (4) Pareto product design later, distinguishing Pareto analysis from true RCA. Evidence MERGE and Message Center HIDE remain pending explicit Product Owner confirmation and must not be inferred. RESIDUAL-01 is remediated as of Phase 0 implementation commit e3ca2429 and is no longer an open candidate.`

## Notes

- `PROJECT_SSOT.md` là tài liệu kiến trúc và quyết định cuối cùng.
- `PROJECT_STATUS.md` chỉ ghi trạng thái tiến độ hiện hành, không ghi lịch sử trao đổi dài.
- Từ nay, chat mới chỉ cần đọc:
  - `docs/PROJECT_SSOT.md`
  - `PROJECT_STATUS.md`
