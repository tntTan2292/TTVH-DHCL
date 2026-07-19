# DA Implementation Ticket Register

## 1. Authority

- Status: `Active`
- Authority: Product Owner `PO PASS` on `2026-07-18`
- Approved plan: [docs/04_TECHNICAL_PLANNING/Dashboard/SMART_DASHBOARD_IMPLEMENTATION_PLAN.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Dashboard/SMART_DASHBOARD_IMPLEMENTATION_PLAN.md)
- Closed audit: [docs/10_TICKETS/DASHBOARD-AUDIT-001_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/DASHBOARD-AUDIT-001_MANIFEST.md)

## 2. Sequencing Rule

Do not activate all DA implementation tickets simultaneously.

`DA-IMPL-003` is completed with Product Owner `PO PASS`. `AUTO-IMPORT-002` is `COMPLETED / VERIFIED - awaiting PO commit approval` for backend/manual-trigger Huế F1.3 acquisition only; AUTO-IMPORT-003 and later DA-IMPL tickets remain planned and inactive until the prior ticket receives `PO PASS` or explicit governance authority allows parallel work.

`TICKET-0102` remains deferred and inactive during the Dashboard implementation sequence unless Product Owner changes priority.

## 3. Ticket Register

| Sequence | Ticket | Status | PO Product Status | Manifest |
| ---: | --- | --- | --- | --- |
| 1 | `DA-IMPL-001` Dashboard Language and Semantic Foundation | `COMPLETED` | `PO PASS` | [docs/10_TICKETS/DA-IMPL-001_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/DA-IMPL-001_MANIFEST.md) |
| 2 | `DA-IMPL-002` Unified Command Summary | `COMPLETED` | `PO PASS` | [docs/10_TICKETS/DA-IMPL-002_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/DA-IMPL-002_MANIFEST.md) |
| 3 | `DA-IMPL-003` Integrated Trend and Risk Workspace | `COMPLETED` | `PO PASS` | [docs/10_TICKETS/DA-IMPL-003_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/DA-IMPL-003_MANIFEST.md) |
| 4 | `AUTO-IMPORT-001` Source Portal Discovery and Security Assessment | `COMPLETED / HANDOFF`; `Atomic importer claim - COMPLETED / VERIFIED` | `NOT READY` | [docs/10_TICKETS/AUTO-IMPORT-001_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/AUTO-IMPORT-001_MANIFEST.md) |
| 5 | `AUTO-IMPORT-002` Automated Download and Validation Pipeline | `COMPLETED / VERIFIED - awaiting PO commit approval`; `LIVE END-TO-END VERIFICATION PASSED FOR 2026-07-16` | `VERIFIED / AWAITING PO COMMIT APPROVAL` | [docs/10_TICKETS/AUTO-IMPORT-002_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/AUTO-IMPORT-002_MANIFEST.md) |
| 6 | `AUTO-IMPORT-003` Scheduled Import, Retry, Monitoring and Operations UI | `PLANNED / INACTIVE` | `NOT READY` | `Pending manifest` |
| 7 | `DA-IMPL-004` Unified BCVH Analysis Table | `PLANNED / INACTIVE` | `NOT READY` | [docs/10_TICKETS/DA-IMPL-004_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/DA-IMPL-004_MANIFEST.md) |
| 8 | `DA-IMPL-005` Operating Pattern Tabs | `PLANNED / INACTIVE` | `NOT READY` | [docs/10_TICKETS/DA-IMPL-005_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/DA-IMPL-005_MANIFEST.md) |
| 9 | `DA-IMPL-006` Unified Action Center | `PLANNED / INACTIVE` | `NOT READY` | [docs/10_TICKETS/DA-IMPL-006_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/DA-IMPL-006_MANIFEST.md) |
| 10 | `DA-IMPL-007` Smart Dashboard Final Assembly | `PLANNED / INACTIVE` | `NOT READY` | [docs/10_TICKETS/DA-IMPL-007_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/DA-IMPL-007_MANIFEST.md) |

## 4. Consolidated Scope

- `DA-IMPL-001`: PO-facing labels, remove shell/placeholder wording, semantic color tokens, shared legend/status vocabulary, remove clearly unauthorized placeholder widgets where safe. No layout restructuring yet.
- `DA-IMPL-002`: consolidate top KPI cards and Executive Summary, show one KPI story, do not show `Tỷ lệ đạt` and `Tỷ lệ không đạt` as independent KPI cards at the same time, restore `Xếp hạng toàn quốc` from imported nationwide data, use `Bưu gửi cần xử lý` as the action card with `Tỷ lệ không đạt` as supporting information, add missing/unknown explanation, add one grounded executive insight, remove duplicate summary presentation, and begin reducing total Dashboard height without increasing page height.
- `DA-IMPL-003`: completed with Product Owner `PO PASS` on `2026-07-18`: `Functionally accepted; visual polish deferred to DA-IMPL-007.` Accepted scope includes the integrated 30-day trend, 7-day same-period comparison, simultaneous D-1 and D-7 leadership widgets, comparison limited to `Tỷ lệ đạt` and `Sản lượng`, one `Tỷ lệ đạt` trend line, `Chuyển hoàn` semantics, `Đạt + Không đạt + Chuyển hoàn = Tổng mẫu đo kiểm`, Quality Pulse, and grounded risk evidence. Visual styling, spacing, and final aesthetic refinement are deferred to DA-IMPL-007 and are not open blockers against DA-IMPL-003.
- `AUTO-IMPORT-001`: discovery handoff recorded; no credentials, login automation, CAPTCHA/OTP handling, or download implementation. Technical sub-item `Atomic importer claim` is completed and verified with a real DKCL file.
- `AUTO-IMPORT-002`: backend/manual-trigger Huế F1.3 acquisition engine completed and verified for live date `2026-07-16`; visible metric/detail population, workbook rows, DB rows, distinct shipment codes, and Dashboard backend `total_bg` all equal `3941`; exactly `1 SUCCESS` import log, `0` skipped/error rows; target generated portal file deleted successfully with exact filename `matchCount = 0`. Implemented decisions include DKCL hidden date `MM/DD/YYYY`, `BCKT/BC` all-default `NULL`, visible metric drill-down instead of hidden `d-none` cells, detail-table total as authoritative row count, exact-filename cleanup, persistent profile with one automatic username/password/fixed-HRM login, `AUTHENTICATION_REQUIRED` fallback, and no force replacement. No Data Import Center UI, missing-date scan, daily scheduler, TCT workflow, bulk portal cleanup, repeated login attempts, HRM bypass, or KPI business-rule changes.
- `AUTO-IMPORT-003`: plan scheduled import, retry, monitoring, and operations UI after approved pipeline work; remains inactive.
- `DA-IMPL-004`: consolidate ranking, comparison, and operational BCVH summary into one analytical table with sorting, compact trend, warning, and detail entry while preserving canonical BCVH context.
- `DA-IMPL-005`: consolidate weekly, monthly, and heatmap views into one selected mode at a time, add threshold legend and grounded summary, retain calculation behavior unless a separately authorized defect exists.
- `DA-IMPL-006`: consolidate recommendations, brief, message, row guidance, and follow-up; eliminate repeated issue presentation; identify source and confidence of each action; preserve unknown values instead of inventing them.
- `DA-IMPL-007`: final hierarchy, spacing, responsive behavior, loading/empty/error/missing-data states, removal of remaining obsolete surfaces only after replacements are accepted, full Dashboard regression and PO acceptance.

## 5. Compactness Rule

From DA-IMPL-002 onward, each Dashboard implementation ticket must avoid increasing total Dashboard height and should prepare detailed content for tabs, collapse, drawer, or drill-down rather than permanently expanded widgets. DA-IMPL-007 remains responsible for final full-page assembly, but the compactness direction is active now.
