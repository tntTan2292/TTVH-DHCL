# DA Implementation Ticket Register

## 1. Authority

- Status: `Active`
- Authority: Product Owner `PO PASS` on `2026-07-18`
- Approved plan: [docs/04_TECHNICAL_PLANNING/Dashboard/SMART_DASHBOARD_IMPLEMENTATION_PLAN.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Dashboard/SMART_DASHBOARD_IMPLEMENTATION_PLAN.md)
- Closed audit: [docs/10_TICKETS/DASHBOARD-AUDIT-001_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/DASHBOARD-AUDIT-001_MANIFEST.md)

## 2. Sequencing Rule

Do not activate all DA implementation tickets simultaneously.

Only `DA-IMPL-003` is active and remains at `PO WARNING` pending Product Owner recheck. AUTO-IMPORT and later DA-IMPL tickets remain planned and inactive until the prior ticket receives `PO PASS` or explicit governance authority allows parallel work.

`TICKET-0102` remains deferred and inactive during the Dashboard implementation sequence unless Product Owner changes priority.

## 3. Ticket Register

| Sequence | Ticket | Status | PO Product Status | Manifest |
| ---: | --- | --- | --- | --- |
| 1 | `DA-IMPL-001` Dashboard Language and Semantic Foundation | `COMPLETED` | `PO PASS` | [docs/10_TICKETS/DA-IMPL-001_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/DA-IMPL-001_MANIFEST.md) |
| 2 | `DA-IMPL-002` Unified Command Summary | `COMPLETED` | `PO PASS` | [docs/10_TICKETS/DA-IMPL-002_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/DA-IMPL-002_MANIFEST.md) |
| 3 | `DA-IMPL-003` Integrated Trend and Risk Workspace | `PO WARNING` | `PO WARNING` | [docs/10_TICKETS/DA-IMPL-003_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/DA-IMPL-003_MANIFEST.md) |
| 4 | `AUTO-IMPORT-001` Source Portal Discovery and Security Assessment | `PLANNED / INACTIVE` | `NOT READY` | `Pending manifest` |
| 5 | `AUTO-IMPORT-002` Automated Download and Validation Pipeline | `PLANNED / INACTIVE` | `NOT READY` | `Pending manifest` |
| 6 | `AUTO-IMPORT-003` Scheduled Import, Retry, Monitoring and Operations UI | `PLANNED / INACTIVE` | `NOT READY` | `Pending manifest` |
| 7 | `DA-IMPL-004` Unified BCVH Analysis Table | `PLANNED / INACTIVE` | `NOT READY` | [docs/10_TICKETS/DA-IMPL-004_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/DA-IMPL-004_MANIFEST.md) |
| 8 | `DA-IMPL-005` Operating Pattern Tabs | `PLANNED / INACTIVE` | `NOT READY` | [docs/10_TICKETS/DA-IMPL-005_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/DA-IMPL-005_MANIFEST.md) |
| 9 | `DA-IMPL-006` Unified Action Center | `PLANNED / INACTIVE` | `NOT READY` | [docs/10_TICKETS/DA-IMPL-006_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/DA-IMPL-006_MANIFEST.md) |
| 10 | `DA-IMPL-007` Smart Dashboard Final Assembly | `PLANNED / INACTIVE` | `NOT READY` | [docs/10_TICKETS/DA-IMPL-007_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/DA-IMPL-007_MANIFEST.md) |

## 4. Consolidated Scope

- `DA-IMPL-001`: PO-facing labels, remove shell/placeholder wording, semantic color tokens, shared legend/status vocabulary, remove clearly unauthorized placeholder widgets where safe. No layout restructuring yet.
- `DA-IMPL-002`: consolidate top KPI cards and Executive Summary, show one KPI story, do not show `Tỷ lệ đạt` and `Tỷ lệ không đạt` as independent KPI cards at the same time, restore `Xếp hạng toàn quốc` from imported nationwide data, use `Bưu gửi cần xử lý` as the action card with `Tỷ lệ không đạt` as supporting information, add missing/unknown explanation, add one grounded executive insight, remove duplicate summary presentation, and begin reducing total Dashboard height without increasing page height.
- `DA-IMPL-003`: create the main integrated trend area, consolidate accepted 30-day and 7-day views under modes/tabs such as `30 ngay`, `7 ngay so sanh`, and `Theo BCVH`, incorporate Quality Pulse and risk markers, place current exceptions beside the chart, eliminate duplicated chart stories, preserve accepted formulas, API contracts, thresholds, and filter context, reduce Dashboard height, and continue the final target of approximately two vertical desktop viewports. The leadership comparison area shows D-1 and D-7 simultaneously and only exposes `Tỷ lệ đạt` plus `Sản lượng`; `Không đạt` and `Chuyển hoàn` remain supporting composition/evidence only under `Đạt + Không đạt + Chuyển hoàn = Tổng mẫu đo kiểm`. The legacy Daily Timeline story is converted into integrated trend/risk evidence and the duplicate widget is not rendered in the DA-IMPL-003 runtime pending Product Owner check. Do not invent causes, owners, deadlines, or new thresholds, and do not restructure DA-IMPL-004 through DA-IMPL-007 surfaces yet.
- `AUTO-IMPORT-001`: discover source portal behavior and security constraints only; no credentials, login automation, CAPTCHA/OTP handling, or download implementation.
- `AUTO-IMPORT-002`: plan automated download and validation pipeline after approved discovery; remains inactive.
- `AUTO-IMPORT-003`: plan scheduled import, retry, monitoring, and operations UI after approved pipeline work; remains inactive.
- `DA-IMPL-004`: consolidate ranking, comparison, and operational BCVH summary into one analytical table with sorting, compact trend, warning, and detail entry while preserving canonical BCVH context.
- `DA-IMPL-005`: consolidate weekly, monthly, and heatmap views into one selected mode at a time, add threshold legend and grounded summary, retain calculation behavior unless a separately authorized defect exists.
- `DA-IMPL-006`: consolidate recommendations, brief, message, row guidance, and follow-up; eliminate repeated issue presentation; identify source and confidence of each action; preserve unknown values instead of inventing them.
- `DA-IMPL-007`: final hierarchy, spacing, responsive behavior, loading/empty/error/missing-data states, removal of remaining obsolete surfaces only after replacements are accepted, full Dashboard regression and PO acceptance.

## 5. Compactness Rule

From DA-IMPL-002 onward, each Dashboard implementation ticket must avoid increasing total Dashboard height and should prepare detailed content for tabs, collapse, drawer, or drill-down rather than permanently expanded widgets. DA-IMPL-007 remains responsible for final full-page assembly, but the compactness direction is active now.
