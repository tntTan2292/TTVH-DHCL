# PROJECT SNAPSHOT

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. Current Snapshot](#2-current-snapshot)
- [3. Usage Rules](#3-usage-rules)
- [4. Continuation Notes](#4-continuation-notes)

## 1. Purpose

This document is the Governance V2 current-state snapshot for AI onboarding.

It is designed to be the shortest safe entry point for a new AI session while preserving continuity with the existing Governance V1 workflow.

## 2. Current Snapshot

| Field | Value |
| --- | --- |
| Current Phase | `REMEDIATION-005A / AWAITING REVIEW` |
| Current Ticket | `AUTO-IMPORT-006` |
| Next Ticket | `Chief Architect review, then PO runtime recheck` |
| Last PO Status | `AUTO-IMPORT-006 PO RECHECK FAILED / REMEDIATION-005 AWAITING REVIEW` |
| Current Branch | `codex/da-impl-006` |
| Current Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/AUTO-IMPORT-006_MANIFEST.md` |
| Current Checkpoint | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/06_REVIEWS/Import/AUTO-IMPORT-006_CHECKPOINT_007.md` |
| Current State | `ACTIVE / AWAITING REVIEW` |
| Technical Status | `PASS` |
| Runtime Status | `AWAITING CHIEF ARCHITECT REVIEW / PO RECHECK` |
| PO UI Check Required | `Yes` |
| PO Product Status | `NOT READY` |
| Last Reviewed Phase | `R4.1B` |
| Last Reviewed Commit | `58fb723e9c5eeb82f17b75d14b7662c3503ee262` |
| Phase Review Status | `AWAITING REVIEW` |
| Next Phase Authorization | `PO RUNTIME RECHECK GRANTED` |
| Governance Version | `V2 Active` |
| Last Updated | `2026-07-23` |

## 3. Usage Rules

- Read this document immediately after `README_AI.md`.
- Treat this document as the single live project-state SSOT for Governance V2 Draft.
- Do not infer current state from chat history when this snapshot is available.
- Do not use this document to override SSOT, frozen docs, or PO decisions.
- Keep workflow behavior unchanged unless a dedicated governance change is approved.
- `Last Closed Manifest` must always be a concrete GitHub Blob URL pointing to the manifest of the most recently closed ticket when Current Ticket = None.
- `Last Closed Manifest` must not contain placeholder labels or descriptive text.
- `Last PO Status` represents the most recently recorded Product Owner status for the last closed ticket when Current Ticket = None.

## 4. Continuation Notes

This snapshot is intentionally narrow.

It exists to answer only the questions a fresh AI needs in order to continue:

- where the project is
- what ticket is active
- what comes next
- what branch is active
- what manifest governs the current reading scope

Historical note: `GOVERNANCE-PO-UI-SEPARATION` is completed and preserved for reference only.

Fresh-chat onboarding chain for the active ticket:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
3. `docs/10_TICKETS/AUTO-IMPORT-006_MANIFEST.md`
4. `docs/06_REVIEWS/Import/AUTO-IMPORT-006_CHECKPOINT_007.md`

AUTO-IMPORT-006 is active in `REMEDIATION-005A / AWAITING REVIEW` after correcting the browser lifecycle wording and implementation from taskbar minimize to native browser window hide after `SESSION_VALID`. Technical status is `PASS`; runtime status is `AWAITING CHIEF ARCHITECT REVIEW / PO RECHECK`; PO product status is `NOT READY`. The ticket cannot be completed without explicit PO PASS.

TODAY-007 is completed with explicit Product Owner `PO PASS`.

TODAY-008 is completed with explicit Product Owner `PO PASS`.

TODAY-008 scope remains limited to PO data reconciliation and the leadership import-to-dashboard validation path. Broader dashboard widget, chart-meaning, color-consistency, or layout audit scope must be recorded in an authoritative roadmap, ticket, or manifest before implementation.

TICKET-0101 is completed with explicit Product Owner `PO PASS`.

TICKET-0101 scope remains limited to Login API and Session. Codex must not infer missing authentication, credential storage, role, permission, password, session timeout, or user-management business rules; if required authority is absent, record the blocker instead of guessing.

DASHBOARD-AUDIT-001 is completed with explicit Product Owner `PO PASS`. The audit findings are accepted, no Dashboard product-code changes were performed under the audit ticket, and the original multi-widget concept was rejected as insufficiently optimized.

The approved Dashboard direction is the consolidated smart Dashboard with five decision surfaces: Command Summary, Integrated Trend and Risk, BCVH Analysis, Operating Patterns, and Action Center.

DA-IMPL-001 is completed with Product Owner `PO PASS` after PO warning closure for visible technical wording and failed-rate card semantic color.

DA-IMPL-002 is completed with Product Owner `PO PASS` after runtime environment verification and Product Owner acceptance of the Unified Command Summary.

DA-IMPL-002 includes the Product Owner KPI-system requirements transferred from DA-IMPL-001 closure: do not show `Tỷ lệ đạt` and `Tỷ lệ không đạt` as two independent KPI cards at the same time; restore `Xếp hạng toàn quốc` from imported nationwide data; use `Bưu gửi cần xử lý` as the action card and keep `Tỷ lệ không đạt` as supporting information.

DA-IMPL-002 runtime evidence confirms the Unified Command Summary is visible in the first `1440x900` viewport, uses four leadership cards, restores national rank from imported `fact_f13_national` data, and removes the duplicate Executive Summary presentation.

DA-IMPL-003 is completed with Product Owner `PO PASS`: `Functionally accepted; visual polish deferred to DA-IMPL-007.` Accepted scope includes the integrated 30-day trend, 7-day same-period comparison, simultaneous D-1 and D-7 leadership widgets, comparison limited to `Tỷ lệ đạt` and `Sản lượng`, one `Tỷ lệ đạt` trend line, `Chuyển hoàn` semantics, `Đạt + Không đạt + Chuyển hoàn = Tổng mẫu đo kiểm`, Quality Pulse, and grounded risk evidence. Visual styling, spacing, and final aesthetic refinement are deferred to DA-IMPL-007 and are not open blockers against DA-IMPL-003.

AUTO-IMPORT-001, AUTO-IMPORT-002, AUTO-IMPORT-003, AUTO-IMPORT-004, AUTO-IMPORT-005, DA-IMPL-004, and DA-IMPL-005 are completed.

AUTO-IMPORT-001 technical sub-item `Atomic importer claim` is `COMPLETED / VERIFIED`. Root cause was multiple backend/watcher instances processing the same `Incoming` file; the fix uses atomic move from `Incoming` to `Processing` so only the winning process imports. Real verification used `F1.3-2026.02.01.xlsx`, ended in `Data DKCL\F1.3\Processed\HUE\F1.3-2026.02.01.xlsx`, imported `2374` rows with `2374` distinct shipment codes, exactly `1 SUCCESS` log, `0` error/skipped rows, and no duplicate or trailing `FAILED` log.

AUTO-IMPORT follow-on status: Huế manual missing-date/backfill was completed under `AUTO-IMPORT-003`; TCT source discovery and controlled one-date nationwide F1.3 import validation were completed under `AUTO-IMPORT-004`; TCT manual backfill and shared DKCL background operations were completed under `AUTO-IMPORT-005`; unattended scheduling remains unauthorized.

AUTO-IMPORT-002 is `COMPLETED / PO PASS` for backend/manual-trigger Huế F1.3 acquisition only. Product Owner formally accepted implementation commit `4798ec82bb6cc1f343167a6b596aa5d6f58d57cc`. Controlled live verification for `2026-07-16` passed end to end using visible business metric `SL bưu gửi phát thành công/Nộp tiền/CH`; visible metric/detail population, workbook rows, imported DB rows, distinct shipment codes, and Dashboard backend `total_bg` all equal `3941`. Import logging has exactly `1 SUCCESS` with `0` skipped/error rows. Portal cleanup deleted target generated file `19-07-2026_23-08-07_F1.3_chat_luong_phat_buu_giay_lien_tinh_chi_tiet(1).xlsx`, and exact filename verification returned `matchCount = 0`. Implementation decisions: DKCL hidden dates use `MM/DD/YYYY`, `BCKT/BC` all-default values use `NULL`, drill-down uses visible metric cells rather than hidden `d-none` cells, detail-table total is authoritative, cleanup targets exact filename row only, persistent profile supports one automatic username/password/fixed-HRM login, `AUTHENTICATION_REQUIRED` remains the fallback, and no force replacement is allowed.

TICKET-0102 is deferred and inactive during the Dashboard implementation sequence unless Product Owner later changes priority.

Governance V1 remains the full workflow reference until a later migration phase explicitly replaces any part of it.

AUTO-IMPORT-003 is `COMPLETED / PO PASS` as of `2026-07-20`. Accepted scope is Data Import Center operations UI for Hue F1.3 manual backfill first: missing-date scan, individual-date or date-range selection, update action, sequential queue, retry/stop controls, progress and status monitoring, coverage summary, and import/export/validation/error evidence. Accepted operational condition: manual Huế F1.3 backfill requires a valid DKCL authenticated session; the operator does not need to log in for every `Update` while the session remains valid; if the DKCL session is expired or invalid, queue creation is blocked before `RUNNING` and the operator is instructed to re-authenticate. This ticket does not add automatic login, credential storage, or additional DKCL session persistence. Daily scheduling remains disabled; TCT and KPI business formula changes remain out of scope.

DA-IMPL-004 is `COMPLETED / PO PASS` as of `2026-07-20`. Product Owner accepted: Unified BCVH analysis table `PASS`; date context synchronization `PASS`; Chuyển hoàn reconciliation `PASS`; detail navigation `PASS`. Accepted note: destination Route Performance Center remains runtime-incomplete by existing scope and is not a DA-IMPL-004 defect. Exclusions remained preserved: no SSOT changes, no KPI formula changes, no new BCVH mapping rules, no new business thresholds, no TCT, no AUTO-IMPORT changes, no Architecture Freeze changes, and no broad UI redesign outside the unified BCVH analysis table.

DA-IMPL-005 `Operating Pattern Tabs` is `COMPLETED / PO PASS` as of `2026-07-20`. Product Owner accepted: tab order/default `PASS`; `Theo tháng` management view `PASS`; `Theo thứ` combo view `PASS`; Heatmap management view and month separation `PASS`; data contracts and filter context `PASS`. Accepted UI/UX follow-up items are not blockers for DA-IMPL-005: Heatmap is too wide/tall at normal desktop zoom 100% and may require reducing browser zoom to approximately 50%; chart legend, explanatory text, and labels can overlap or become visually crowded. Future DA-IMPL UI/UX completion must address responsive Heatmap layout at 100% browser zoom, month blocks adapting to viewport width, controlled scrolling or compact cell sizing, non-overlapping chart legends and labels, improved spacing, typography, information density, and desktop usability without browser zoom changes. Exclusions remained preserved: no SSOT changes, no KPI formula changes, no business rule changes, no new thresholds, no new BCVH mappings, no backend schema changes, no AUTO-IMPORT, no TCT, no Architecture Freeze changes, and no broad Dashboard redesign outside the operating-pattern card.

AUTO-IMPORT-004 `TCT Source Discovery and Nationwide Ranking Contract` is `COMPLETED / PO PASS` as of `2026-07-20`. Checkpoint 001 discovery is documented in `docs/06_REVIEWS/Import/AUTO-IMPORT-004_CHECKPOINT_001.md`; Checkpoint 002 controlled TCT download/import validation is documented in `docs/06_REVIEWS/Import/AUTO-IMPORT-004_CHECKPOINT_002.md`; PO acceptance is documented in `docs/06_REVIEWS/Import/AUTO-IMPORT-004_PO_ACCEPTANCE.md`. PO accepted TCT F1.3 `2026-07-19`: ranked population `34`; Hue volume `2,399`; Hue pass `1,261`; Hue KPI `52.56%`; Hue nationwide rank `24/34`; TCT workbook downloaded, imported, and deleted successfully; Dashboard result accepted.

AUTO-IMPORT-005 `TCT Manual Backfill and Shared DKCL Background Operations` is `COMPLETED / PO PASS` as of `2026-07-20`. Checkpoint 001 discovery/contract is documented in `docs/06_REVIEWS/Import/AUTO-IMPORT-005_CHECKPOINT_001.md`; Checkpoint 002 shared session preflight plus TCT coverage/missing-date scan is documented in `docs/06_REVIEWS/Import/AUTO-IMPORT-005_CHECKPOINT_002.md`; Checkpoint 003 TCT queue/import vertical slice and PO defect evidence are documented in `docs/06_REVIEWS/Import/AUTO-IMPORT-005_CHECKPOINT_003.md`. Product Owner accepted TCT manual backfill, session preflight and explicit re-authentication, missing/incomplete/completed date classification, controlled re-import of incomplete national dates, sequential in-memory queue, graceful Stop, eligible Retry, Hue/TCT source separation, and cumulative range-based nationwide ranking. Its manifest now records the authoritative next-ticket handoff to `DA-IMPL-006 Unified Action Center`, sourced from `docs/04_TECHNICAL_PLANNING/Dashboard/DA_IMPLEMENTATION_TICKET_REGISTER.md`.

DA-IMPL-006 `Unified Action Center` is `COMPLETED / PO PASS` as of `2026-07-20`. Product Owner accepted final remediation removing the Dashboard `BCVH nổi bật và cần cải thiện` / Top 2 area and removing `Tin điều hành` / `Tin báo cáo` message drafts from Dashboard. The retained Unified Action Center shows recommendations/issues, valid KPI context, existing evidence/follow-up, and explicit loading/empty/error/partial states. Future message building, viewing, and management belongs in a future governed `BCVH Ranking` module ticket.

DA-IMPL-007 `Smart Dashboard Final Assembly` is `COMPLETED / PO PASS` as of `2026-07-22`. Primary executor is `Antigravity`. Layout reordering, canonical 06 BCVH table filter, Top 3 Risks, Top 3 Actions, full-width monthly trend, and Hôm Nay hierarchy comparison cards are fully implemented, verified, build/lint-checked, and Remote-pushed.
