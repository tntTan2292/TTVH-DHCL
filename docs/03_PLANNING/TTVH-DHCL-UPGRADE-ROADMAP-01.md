# TTVH-DHCL Upgrade Roadmap 01

Status: `ACTIVE COORDINATION ROADMAP (2026-09-15)`

## 1. Purpose

This roadmap is the cross-ticket coordination record for the current TTVH-DHCL upgrade program. It preserves sequencing and scope boundaries across new chats and executors. It does not activate a ticket, authorize implementation, or replace any ticket Manifest, Checkpoint, Design of Record, review, or Product Owner gate.

## 2. Product Owner Direction

The Product Owner confirmed two independent upgrade groups:

1. **Nâng cấp F1.3**
2. **Nâng cấp Quản trị**, containing two separate workstreams: Import and User/RBAC.

The tickets below must remain separate. Their listed order is the intended coordination sequence only; it is not automatic activation.

## 3. Project Workboard

| Group | Ticket | Objective | Current Status | Intended Order | Executor / Owner | Gate Before Next Phase |
| --- | --- | --- | --- | ---: | --- | --- |
| Nâng cấp F1.3 | `F13-BCVH-MONTHLY-CUMULATIVE-01` | Add current-month cumulative to Operation Dashboard and BCVH Ranking, show all canonical BCVH, reconcile with the PO operating Excel. | `DISCOVERY / READ-ONLY AUDIT` — Current Ticket | 1 | Antigravity (Gemini) audit | Audit report plus Excel reconciliation; PO/CTO decision before design or implementation. |
| Nâng cấp F1.3 | `F13-ROUTE-POSTMAN-IDENTITY-01` | Add postman code and name to Route Ranking based on BatchFile. | `DISCOVERED / NOT ACTIVATED` | 2 | Unassigned | Explicit activation; read-only BatchFile mapping and historical-data audit before implementation. |
| Nâng cấp Quản trị — Import | `IMPORT-BULK-REIMPORT-ALL-01` | Preserve “Chọn tất cả chưa hoàn tất”; add a separate “Chọn tất cả” including successful imports for intentional bulk reimport. | `DISCOVERED / NOT ACTIVATED` | 3 | Unassigned | Explicit activation; audit selection scope, queue/dedup, reimport rules, confirmation warning, safety and recovery. |
| Nâng cấp Quản trị — User/RBAC | `ADMIN-USER-MODULE-ACCESS-01` | Admin creates users and assigns which modules each user can see and access. | `DISCOVERY / READ-ONLY AUDIT AUTHORIZED / QUEUED` | 4 | Antigravity (Gemini), separate second audit report | Complete independent audit; PO locks data model, module matrix, backend enforcement and Admin UI before implementation. |
| Cross-cutting UI | `UI-DATA-TABLE-READABILITY-01` | Increase operational-table text to at least 2× its current rendered size; redesign density/responsiveness to prevent wrapping, overlap and clipping on PC/phone. | `DISCOVERY / READ-ONLY AUDIT AUTHORIZED / URGENT` | Parallel audit standard; implementation separately gated | Antigravity audit | Measured current/target typography, responsive proposal, affected-table inventory and PO-approved design before implementation. |
| Paused work | `F41-DASHBOARD-MINIMUM-01` | F4.1 minimum dashboard. | `PAUSED BY PO PRIORITY` | Unscheduled | Unassigned | Separate explicit PO resumption; no other ticket may reactivate it. |

## 4. Scope Boundaries

| Ticket | May Audit / Affect If Later Authorized | Must Not Be Mixed With |
| --- | --- | --- |
| `F13-BCVH-MONTHLY-CUMULATIVE-01` | Existing F1.3 Operation Dashboard, BCVH Ranking, current services/repositories and PO Excel reconciliation. | Route-postman identity, Import, account/RBAC, F4.1. |
| `F13-ROUTE-POSTMAN-IDENTITY-01` | F1.3 Route Ranking, BatchFile mapping, route-to-postman history. | BCVH monthly cumulative, Import, RBAC. |
| `IMPORT-BULK-REIMPORT-ALL-01` | Import selection UI, queue/run creation, dedup, reimport/overwrite contract, warnings and safety. | KPI formula changes, user administration/RBAC. |
| `ADMIN-USER-MODULE-ACCESS-01` | User/session/role model, Admin UI, Sidebar, route guards and backend API authorization. | Import mechanics and KPI calculations. |

## 5. Mandatory Coordination Rules

1. Each ticket has its own audit, Design of Record, implementation authorization, commits, validation, independent review and Product Owner gate.
2. Completion or progress of one ticket never self-activates another.
3. Do not combine Import and User/RBAC in one implementation scope or commit.
4. User/RBAC enforcement must cover all three layers: Sidebar visibility, frontend route/direct URL, and backend API authorization.
5. Missing, invalid or stale module permission data must default to deny, subject only to a PO-approved administrator recovery path.
6. No executor may infer an unapproved business rule, change KPI/SSOT, or award PO PASS.
7. `F41-DASHBOARD-MINIMUM-01` remains paused until separately resumed by the Product Owner.
8. `UI-DATA-TABLE-READABILITY-01` is a cross-cutting presentation standard: it may be audited alongside an affected feature, but its implementation and validation remain a separate ticket and commit scope.

## 6. Current Execution Sequence

1. Antigravity completes `F13-BCVH-MONTHLY-CUMULATIVE-01` read-only audit.
2. CTO reviews the report and presents open decisions to the Product Owner.
3. No next implementation phase starts without explicit PO/CTO authorization.
4. In the same audit round, Antigravity may then produce a **separate** read-only report for `ADMIN-USER-MODULE-ACCESS-01`.
5. Antigravity also audits the two evidenced F1.3 tables under `UI-DATA-TABLE-READABILITY-01`, reporting measured typography and responsive constraints separately from F1.3 data logic.
6. `F13-ROUTE-POSTMAN-IDENTITY-01` and `IMPORT-BULK-REIMPORT-ALL-01` remain not activated until separately prioritized.

## 7. New-Session Onboarding

A new chat/session must read, in order:

1. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
2. The Current Manifest and Current Checkpoint named there
3. This roadmap
4. The Current Ticket's Required Reading

The Current Manifest/Checkpoint remain authoritative for ticket execution. This roadmap is authoritative only for cross-ticket grouping, sequence and scope separation.
