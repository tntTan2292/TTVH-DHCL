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
| POF-TODAY-001-01 | 2026-07-16 | PO reported `/import` returned 404 and import summary/history were empty | DEFECT | Data Import Center | Import runtime center | `/import` | `TODAY-001 Import Daily Data Verification` | Recovery completed, waiting PO recheck | DEFECT | `/import` renders the Data Import Center, status API returns runtime import logs, and reimport requires explicit confirmation before overwrite | Stale backend process served missing import runtime routes, causing browser 404/no visible history for PO | Blocks import acceptance and daily data verification | High | Yes | Restart correct backend runtime, verify route/status, add visible reimport confirmation and status error handling | `TODAY-001-R1 Import Runtime Route and Reimport Recovery` | Before `TODAY-002 Daily Trend Data Adapter` | PO should open `http://localhost:5178/import`, confirm summary/history render, and retry duplicate-date import confirmation | `docs/06_REVIEWS/Import/TODAY-001-R1_IMPORT_RUNTIME_ROUTE_AND_REIMPORT_RECOVERY.md` | Browser `/import` rendered summary/history; `GET /api/import/f13/status` HTTP 200; duplicate upload HTTP 409; force reimport HTTP 200 | Pending PO recheck | READY FOR PO RECHECK |  |
| POF-TODAY-001-02 | 2026-07-16 | Import history is limited to 20 rows and has no pagination or page-size selection | DEFECT | Data Import Center | Import History | `/import` | `TODAY-001 Import Daily Data Verification` | Recovery completed, waiting PO recheck | DEFECT | ADMIN can review full import history with server-side pagination and page sizes 20, 50, and 100 | History API was hardcoded to `LIMIT 20`, and UI displayed only the latest 20 rows | Blocks import auditability and daily data verification | High | Yes | Add server-side pagination, total count, page-size selector, and Previous/Next controls | `TODAY-001-R2 Import History Pagination and Vietnam Timezone Recovery` | Before `TODAY-002 Daily Trend Data Adapter` | PO should open `http://localhost:5178/import`, choose 20/50/100 rows, and move between pages | `docs/06_REVIEWS/Import/TODAY-001-R2_IMPORT_HISTORY_PAGINATION_AND_VIETNAM_TIMEZONE_RECOVERY.md` | API page sizes 20/50/100 PASS; browser pagination 50 rows and Next/Previous PASS | Pending PO recheck | READY FOR PO RECHECK |  |
| POF-TODAY-001-03 | 2026-07-16 | Import timestamps display around seven hours behind Vietnam local time | DEFECT | Data Import Center | Latest Import and Import History | `/import` | `TODAY-001 Import Daily Data Verification` | Recovery completed, waiting PO recheck | DEFECT | Import timestamps display in Vietnam timezone `Asia/Ho_Chi_Minh` | SQLite `CURRENT_TIMESTAMP` stored UTC without timezone suffix, and frontend displayed the raw value without an explicit Vietnam timezone contract | Blocks trust in import timing and operational audit trail | High | Yes | Normalize API timestamps to ISO 8601 UTC and format UI with `Asia/Ho_Chi_Minh` | `TODAY-001-R2 Import History Pagination and Vietnam Timezone Recovery` | Before `TODAY-002 Daily Trend Data Adapter` | PO should confirm latest import and table times match Vietnam local time | `docs/06_REVIEWS/Import/TODAY-001-R2_IMPORT_HISTORY_PAGINATION_AND_VIETNAM_TIMEZONE_RECOVERY.md` | New import at local `09:54:27 +07` stored as DB `02:54:27`, API `2026-07-16T02:54:27.000Z`, browser displayed `09:54:27 16/07/2026` | Pending PO recheck | READY FOR PO RECHECK |  |
