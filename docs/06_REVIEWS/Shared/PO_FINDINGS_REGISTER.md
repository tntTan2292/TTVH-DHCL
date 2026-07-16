# PO Findings Register

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. Classification Rules](#2-classification-rules)
- [3. Lifecycle](#3-lifecycle)
- [4. Required Columns](#4-required-columns)
- [5. Example Records](#5-example-records)
- [6. Closure Rules](#6-closure-rules)
- [7. Relation to Tickets](#7-relation-to-tickets)
- [8. Relation to Progress Reporting](#8-relation-to-progress-reporting)

## 1. Purpose

This register records Product Owner findings that arise during product review, UI acceptance, and runtime checking.

It is the authoritative traceability record for:

- defects
- incomplete scope
- planned future functionality
- missing backlog ownership
- data/context verification issues
- governance defects in status reporting

## 2. Classification Rules

Use one of the following classifications:

- `DEFECT`
- `INCOMPLETE`
- `PLANNED`
- `NOT PLANNED`
- `VERIFY DATA`
- `GOVERNANCE DEFECT`

### DEFECT

The responsible ticket was already completed, but the implementation is incorrect or missing required behavior.

### INCOMPLETE

The ticket was started or partially completed, but the intended scope is not fully delivered.

### PLANNED

The behavior belongs to a future approved ticket that has not started yet.

### NOT PLANNED

The behavior is not owned by any approved ticket.

### VERIFY DATA

The issue may be caused by data, test context, permissions, or environment rather than code.

### GOVERNANCE DEFECT

The issue is in documentation, workflow, status reporting, or project control rather than product code.

## 3. Lifecycle

NEW

↓

TRIAGED

↓

CLASSIFIED

↓

LINKED TO RESPONSIBLE TICKET

↓

ASSIGNED

↓

IN PROGRESS

↓

READY FOR PO RECHECK

↓

PO PASS / PO WARNING / PO FAIL

↓

CLOSED

Alternative branches:

- VERIFY DATA
- NOT PLANNED -> PO backlog decision

## 4. Required Columns

| Column | Description |
| --- | --- |
| PO Finding ID | Unique register identifier |
| Date Reported | When the PO raised the finding |
| PO Finding | Short description of the observation |
| Finding Type | Defect / Incomplete / Planned / Not Planned / Verify Data / Governance Defect |
| Affected Module | Module or center impacted |
| Affected Screen | Screen or surface impacted |
| Route / URL | Exact route or URL for recheck |
| Related Ticket | Ticket that owns the behavior or fix |
| Ticket Lifecycle Position | Ticket status relative to the finding |
| Classification | Final classification |
| Expected or Contracted Behavior | What should happen |
| Actual Observed Behavior | What happened instead |
| Business Impact | Product impact |
| Severity | Severity level |
| Blocking | Whether the finding blocks product completion |
| Immediate Action | Next action required |
| Responsible Fix Ticket | Ticket responsible for the fix or recovery |
| Planned Delivery Position | Where the fix sits in the roadmap |
| PO Recheck Point | Where the PO should retest |
| Technical Evidence | Build/runtime/trace evidence |
| Runtime Evidence | Runtime screenshots, logs, or URLs |
| PO Result | PASS / WARNING / FAIL |
| Status | Open / In Progress / Ready for Recheck / Closed |
| Closure Date | When the finding was closed |

## 5. Example Records

| PO Finding ID | PO Finding | Classification | Related Ticket | Ticket Lifecycle Position | Immediate Action | Blocking |
| --- | --- | --- | --- | --- | --- | --- |
| POF-001 | Shipment is missing from the sidebar menu | DEFECT | TICKET-0053 Shipment Performance Center Runtime Data Integration | Ticket runtime completed | Create Navigation Fix / Shipment Review Fix ticket | Yes |
| POF-002 | Dashboard shell still shows placeholder language | INCOMPLETE | Dashboard Foundation tickets | Ticket technically completed | Create Dashboard Product Recovery ticket | Yes |
| POF-003 | Dashboard heatmap is not present | INCOMPLETE | TODAY-006 Restore and Preserve Existing Dashboard Charts | Planned / queued for PO-prioritized delivery | Restore the heatmap surface without removing existing charts | Yes |
| POF-004 | Dashboard day/week/month trend is not present | PLANNED | TODAY-003, TODAY-004, TODAY-005 | Planned / queued for PO-prioritized delivery | Deliver the supplementary trendline tickets in the TODAY queue | Yes |
| POF-005 | Dashboard frequency analysis is not present | INCOMPLETE | TODAY-006 Restore and Preserve Existing Dashboard Charts | Planned / queued for PO-prioritized delivery | Restore the frequency analysis surface without removing existing charts | Yes |
| POF-006 | Shipment shows no runtime data for the PO date/context | VERIFY DATA | Shipment Performance Center | Ticket runtime completed | Validate known-good context before defect ticketing | No |

## 6. Closure Rules

A finding cannot be closed because build PASS succeeded.

A finding can be closed only when:

- the responsible ticket or recovery ticket is completed
- runtime evidence is available when applicable
- PO recheck point is provided
- PO confirms PASS if PO review applies

## 7. Relation to Tickets

Each PO finding must point to one of:

- an existing completed ticket
- an in-progress ticket
- a future planned ticket
- a recovery ticket
- a newly approved ticket
- no responsible ticket exists

If no responsible ticket exists, the finding must be escalated to the Product Owner for backlog decision.

## 8. Relation to Progress Reporting

Progress tables and completion reports must expose:

- whether PO UI Check is required
- whether a PO finding exists
- which ticket owns the finding
- whether the finding blocks completion
- what the next PO recheck point is

## 9. Active Records

| PO Finding ID | Date Reported | PO Finding | Finding Type | Affected Module | Affected Screen | Route / URL | Related Ticket | Ticket Lifecycle Position | Classification | Expected or Contracted Behavior | Actual Observed Behavior | Business Impact | Severity | Blocking | Immediate Action | Responsible Fix Ticket | Planned Delivery Position | PO Recheck Point | Technical Evidence | Runtime Evidence | PO Result | Status | Closure Date |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| POF-TODAY-001-01 | 2026-07-16 | PO reported `/import` returned 404 and import summary/history were empty | DEFECT | Data Import Center | Import runtime center | `/import` | `TODAY-001 Import Daily Data Verification` | Recovery completed and accepted by PO | DEFECT | `/import` renders the Data Import Center, status API returns runtime import logs, and reimport requires explicit confirmation before overwrite | Stale backend process served missing import runtime routes, causing browser 404/no visible history for PO | Blocks import acceptance and daily data verification | High | Yes | Closed after PO final acceptance | `TODAY-001-R1 Import Runtime Route and Reimport Recovery` | Closed before `TODAY-002 Daily Trend Data Adapter` | PO accepted `/import`, summary/history, duplicate confirmation, cancel, overwrite, upload, and reimport behavior | `docs/06_REVIEWS/Import/TODAY-001_PO_ACCEPTANCE_CLOSURE.md` | Browser `/import` rendered summary/history; `GET /api/import/f13/status` HTTP 200; duplicate upload HTTP 409; force reimport HTTP 200; Product Owner final acceptance | PO PASS | CLOSED | 2026-07-16 |
| POF-TODAY-001-02 | 2026-07-16 | Import history is limited to 20 rows and has no pagination or page-size selection | DEFECT | Data Import Center | Import History | `/import` | `TODAY-001 Import Daily Data Verification` | Recovery completed and accepted by PO | DEFECT | ADMIN can review full import history with server-side pagination and page sizes 20, 50, and 100 | History API was hardcoded to `LIMIT 20`, and UI displayed only the latest 20 rows | Blocks import auditability and daily data verification | High | Yes | Closed after PO final acceptance | `TODAY-001-R2 Import History Pagination and Vietnam Timezone Recovery` | Closed before `TODAY-002 Daily Trend Data Adapter` | PO accepted 20/50/100 page sizes, Previous/Next controls, total count, and newest-first ordering | `docs/06_REVIEWS/Import/TODAY-001_PO_ACCEPTANCE_CLOSURE.md` | API page sizes 20/50/100 PASS; browser pagination 50 rows and Next/Previous PASS; Product Owner final acceptance | PO PASS | CLOSED | 2026-07-16 |
| POF-TODAY-001-03 | 2026-07-16 | Import timestamps display around seven hours behind Vietnam local time | DEFECT | Data Import Center | Latest Import and Import History | `/import` | `TODAY-001 Import Daily Data Verification` | Recovery completed and accepted by PO | DEFECT | Import timestamps display in Vietnam timezone `Asia/Ho_Chi_Minh` | SQLite `CURRENT_TIMESTAMP` stored UTC without timezone suffix, and frontend displayed the raw value without an explicit Vietnam timezone contract | Blocks trust in import timing and operational audit trail | High | Yes | Closed after PO final acceptance | `TODAY-001-R2 Import History Pagination and Vietnam Timezone Recovery` | Closed before `TODAY-002 Daily Trend Data Adapter` | PO accepted latest import and table timestamps in Vietnam timezone | `docs/06_REVIEWS/Import/TODAY-001_PO_ACCEPTANCE_CLOSURE.md` | New import at local `09:54:27 +07` stored as DB `02:54:27`, API `2026-07-16T02:54:27.000Z`, browser displayed `09:54:27 16/07/2026`; Product Owner final acceptance | PO PASS | CLOSED | 2026-07-16 |
| POF-TODAY-002-01 | 2026-07-16 | Dashboard runtime paths still diverged between the legacy KPI column and KPI 2026 | DEFECT | Leadership Dashboard | Dashboard Overview / Ranking / Timeline | `/f13/dashboard` | `TODAY-002-R2 KPI 2026 Dashboard Consistency Recovery` | Recovery completed and documented | DEFECT | All current reporting surfaces must use the approved KPI 2026 source column while preserving one-row-per-date, missing-day handling, returned-shipment NULL semantics, ascending order, and optional BCVH filter | The runtime adapter and overview/ranking paths could produce different values because some paths still aggregated from the legacy KPI column | Distorts leadership decisions across dashboard surfaces | High | Yes | Closed after runtime correction and documentation closure | `TODAY-002-R2 KPI 2026 Dashboard Consistency Recovery` | Closed | Recheck dashboard KPI, BCVH ranking, and timeline against actual dates and BCVH filter | `docs/06_REVIEWS/Import/TODAY-002-R2_KPI_2026_DASHBOARD_CONSISTENCY_RECOVERY.md` | `backend/test_daily_trend.js` (23 passed, 0 failed), `backend/test_e2e_kpi.js` (22 passed, 0 failed), commit `cebe1ff655febf09242e23719150192c059d6555` | PO PASS | CLOSED | 2026-07-16 |
| POF-TODAY-003-01 | 2026-07-16 | Quality Delivery Rate Trendline request must resolve through the runtime backend instead of failing in the browser | DEFECT | Leadership Dashboard | Quality Delivery Rate Trendline | `/f13/dashboard` | `TODAY-003-R1 Quality Trendline Runtime Route Recovery` | Ready for PO check | DEFECT | Browser navigation must reach `GET /api/f13/dashboard/daily-trend` and render actual runtime data with the 90% target line | The authenticated browser session now resolves the trendline request to `http://localhost:5050/api/f13/dashboard/daily-trend` and receives `HTTP 200` with real daily quality data | Prevents PO verification of the quality trendline if the browser cannot reach runtime data | High | Yes | Keep ticket open for PO recheck | `TODAY-003-R1 Quality Trendline Runtime Route Recovery` | Ready for PO check | Recheck dashboard trendline loading, tooltip values, and missing-date gaps in browser DevTools Network | `docs/06_REVIEWS/Import/TODAY-003-R1_QUALITY_TRENDLINE_RUNTIME_ROUTE_RECOVERY.md` | Browser validation: `meta` 200, `kpi` 200, `daily-trend` 200; data for `2026-07-15` returned `67.2015%` | PO CHECK REQUIRED | OPEN | |
| POF-TODAY-003-02 | 2026-07-16 | Quality Delivery Rate Trendline collapses to the dashboard-selected date range instead of a 30-day rolling window | DEFECT | Leadership Dashboard | Quality Delivery Rate Trendline | `/f13/dashboard` | `TODAY-003-R2 Quality Trendline 30-Day Window Recovery` | Ready for PO check | DEFECT | The trendline must request a rolling 30-day window ending on the selected end date or latest available reporting date | The dashboard-linked trendline was using the same selected date range as KPI cards, so a one-day filter reduced the chart to one point | Blocks analytical trend interpretation and PO acceptance | High | Yes | Keep ticket open for PO recheck | `TODAY-003-R2 Quality Trendline 30-Day Window Recovery` | Ready for PO check | Recheck dashboard trendline loading, request window, BCVH filter, and missing-date gaps in browser DevTools Network | `docs/06_REVIEWS/Import/TODAY-003-R2_QUALITY_TRENDLINE_30_DAY_WINDOW_RECOVERY.md` | Browser validation must show a request window like `2026-06-16` through `2026-07-15`; chart must preserve gaps and target line | PO CHECK REQUIRED | OPEN | |
