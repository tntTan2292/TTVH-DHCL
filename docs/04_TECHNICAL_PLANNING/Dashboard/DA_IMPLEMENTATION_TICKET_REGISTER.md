# DA Implementation Ticket Register

## 1. Authority

- Status: `Active`
- Authority: Product Owner `PO PASS` on `2026-07-18`
- Approved plan: [docs/04_TECHNICAL_PLANNING/Dashboard/SMART_DASHBOARD_IMPLEMENTATION_PLAN.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Dashboard/SMART_DASHBOARD_IMPLEMENTATION_PLAN.md)
- Closed audit: [docs/10_TICKETS/DASHBOARD-AUDIT-001_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/DASHBOARD-AUDIT-001_MANIFEST.md)

## 2. Sequencing Rule

Do not activate all DA implementation tickets simultaneously.

`DA-IMPL-003`, `AUTO-IMPORT-002`, `AUTO-IMPORT-003`, `AUTO-IMPORT-004`, `AUTO-IMPORT-005`, `DA-IMPL-004`, `DA-IMPL-005`, and `DA-IMPL-006` are completed with Product Owner `PO PASS`. `DA-IMPL-007` is active for Smart Dashboard final assembly handoff and must be executed primarily by `Antigravity`.

`TICKET-0102` remains deferred and inactive during the Dashboard implementation sequence unless Product Owner changes priority.

## 3. Ticket Register

| Sequence | Ticket | Status | PO Product Status | Manifest |
| ---: | --- | --- | --- | --- |
| 1 | `DA-IMPL-001` Dashboard Language and Semantic Foundation | `COMPLETED` | `PO PASS` | [docs/10_TICKETS/DA-IMPL-001_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/DA-IMPL-001_MANIFEST.md) |
| 2 | `DA-IMPL-002` Unified Command Summary | `COMPLETED` | `PO PASS` | [docs/10_TICKETS/DA-IMPL-002_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/DA-IMPL-002_MANIFEST.md) |
| 3 | `DA-IMPL-003` Integrated Trend and Risk Workspace | `COMPLETED` | `PO PASS` | [docs/10_TICKETS/DA-IMPL-003_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/DA-IMPL-003_MANIFEST.md) |
| 4 | `AUTO-IMPORT-001` Source Portal Discovery and Security Assessment | `COMPLETED / HANDOFF`; `Atomic importer claim - COMPLETED / VERIFIED` | `NOT READY` | [docs/10_TICKETS/AUTO-IMPORT-001_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/AUTO-IMPORT-001_MANIFEST.md) |
| 5 | `AUTO-IMPORT-002` Automated Download and Validation Pipeline | `COMPLETED / PO PASS`; `LIVE END-TO-END VERIFICATION PASSED FOR 2026-07-16` | `PO PASS` | [docs/10_TICKETS/AUTO-IMPORT-002_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/AUTO-IMPORT-002_MANIFEST.md) |
| 6 | `AUTO-IMPORT-003` Scheduled Import, Retry, Monitoring and Operations UI | `COMPLETED / PO PASS` | `PO PASS` | [docs/10_TICKETS/AUTO-IMPORT-003_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/AUTO-IMPORT-003_MANIFEST.md) |
| 7 | `DA-IMPL-004` Unified BCVH Analysis Table | `COMPLETED / PO PASS` | `PO PASS` | [docs/10_TICKETS/DA-IMPL-004_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/DA-IMPL-004_MANIFEST.md) |
| 8 | `DA-IMPL-005` Operating Pattern Tabs | `COMPLETED / PO PASS` | `PO PASS` | [docs/10_TICKETS/DA-IMPL-005_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/DA-IMPL-005_MANIFEST.md) |
| 9 | `AUTO-IMPORT-004` TCT Source Discovery and Nationwide Ranking Contract | `COMPLETED / PO PASS` | `PO PASS` | [docs/10_TICKETS/AUTO-IMPORT-004_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/AUTO-IMPORT-004_MANIFEST.md) |
| 10 | `AUTO-IMPORT-005` TCT Manual Backfill and Shared DKCL Background Operations | `COMPLETED / PO PASS` | `PO PASS` | [docs/10_TICKETS/AUTO-IMPORT-005_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/AUTO-IMPORT-005_MANIFEST.md) |
| 11 | `DA-IMPL-006` Unified Action Center | `COMPLETED / PO PASS` | `PO PASS` | [docs/10_TICKETS/DA-IMPL-006_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/DA-IMPL-006_MANIFEST.md) |
| 12 | `DA-IMPL-007` Smart Dashboard Final Assembly | `ACTIVE / HANDOFF - NOT IMPLEMENTED` | `NOT READY` | [docs/10_TICKETS/DA-IMPL-007_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/DA-IMPL-007_MANIFEST.md) |

## 4. Consolidated Scope

- `DA-IMPL-001`: completed with Product Owner `PO PASS`.
- `DA-IMPL-002`: completed with Product Owner `PO PASS`.
- `DA-IMPL-003`: completed with Product Owner `PO PASS` on `2026-07-18`; visual polish remains deferred to DA-IMPL-007.
- `AUTO-IMPORT-001`: discovery handoff recorded; technical sub-item `Atomic importer claim` is completed and verified.
- `AUTO-IMPORT-002`: backend/manual-trigger Huế F1.3 acquisition engine completed with Product Owner `PO PASS` for implementation commit `4798ec82bb6cc1f343167a6b596aa5d6f58d57cc`.
- `AUTO-IMPORT-003`: completed with Product Owner `PO PASS` on `2026-07-20` after Data Import Center Huế F1.3 missing-date scan, coverage summary, manual backfill selection, sequential queue, retry/stop controls, monitoring, and safe operational evidence. Accepted operational condition: manual Huế F1.3 backfill requires a valid DKCL authenticated session; while valid, the operator does not need to log in for every `Update`; if expired or invalid, queue creation is blocked before `RUNNING` and the operator is instructed to re-authenticate. Automatic login, credential storage, additional session persistence, unattended scheduling, TCT, KPI formula changes, force replacement, and broad AUTO-IMPORT-002 rewrites are out of scope.
- `DA-IMPL-004`: completed with Product Owner `PO PASS` on `2026-07-20`. Product Owner accepted Unified BCVH analysis table, date context synchronization, Chuyển hoàn reconciliation, and detail navigation. Accepted note: destination Route Performance Center remains runtime-incomplete by existing scope and is not a DA-IMPL-004 defect.
- `DA-IMPL-005`: completed with Product Owner `PO PASS` on `2026-07-20`. Product Owner accepted tab order/default, `Theo tháng` management view, `Theo thứ` combo view, Heatmap management view and month separation, and data contracts/filter context. Accepted UI/UX follow-up, not a DA-IMPL-005 blocker: future Dashboard UI/UX completion must address Heatmap responsiveness at 100% desktop zoom, month block adaptation, controlled scrolling or compact cell sizing, non-overlapping chart legends/labels, improved spacing/typography/information density, and desktop usability without browser zoom changes.
- `AUTO-IMPORT-004`: completed with Product Owner `PO PASS` on `2026-07-20`. Product Owner accepted TCT F1.3 `2026-07-19` evidence: ranked population `34`, Hue volume `2,399`, Hue pass `1,261`, Hue KPI `52.56%`, Hue national rank `24/34`, TCT workbook downloaded/imported/deleted successfully, and Dashboard result accepted.
- `AUTO-IMPORT-005`: completed with Product Owner `PO PASS` on `2026-07-20`. Product Owner accepted TCT manual backfill, session preflight and explicit re-authentication, missing/incomplete/completed date classification, controlled re-import, sequential in-memory queue, graceful Stop, eligible Retry, Hue/TCT source separation, and cumulative range-based nationwide ranking.
- `DA-IMPL-006`: completed with Product Owner `PO PASS`. Dashboard retains Unified Action Center recommendations/issues, KPI context, evidence, and follow-up; Top 2 area and Dashboard message drafts were removed by final PO decision. Future `Tin điều hành` / `Tin báo cáo` management belongs in a future governed `BCVH Ranking` module ticket.
- `DA-IMPL-007`: active handoff for final hierarchy, spacing, responsive behavior, loading/empty/error/missing-data states, removal of remaining obsolete surfaces only after replacements are accepted, full Dashboard regression, and PO acceptance. Primary executor: `Antigravity`; Codex reviews technical and regression scope when needed.

## 5. Compactness Rule

From DA-IMPL-002 onward, each Dashboard implementation ticket must avoid increasing total Dashboard height and should prepare detailed content for tabs, collapse, drawer, or drill-down rather than permanently expanded widgets. DA-IMPL-007 remains responsible for final full-page assembly, but the compactness direction is active now.
