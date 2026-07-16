# TODAY-003-R1 Ticket Manifest

## Table of Contents

- [1. Ticket Information](#1-ticket-information)
- [2. Objective](#2-objective)
- [3. Current Status](#3-current-status)
- [4. Required Reading](#4-required-reading)
- [5. Business Context](#5-business-context)
- [6. Technical Context](#6-technical-context)
- [7. Runtime Context](#7-runtime-context)
- [8. Related Review](#8-related-review)
- [9. Related PO Findings](#9-related-po-findings)
- [10. Documents To Update](#10-documents-to-update)
- [11. Validation](#11-validation)
- [12. Expected Output](#12-expected-output)
- [13. Next Ticket](#13-next-ticket)

## 1. Ticket Information

- Ticket ID: `TODAY-003-R1`
- Ticket Name: `Quality Trendline Runtime Route Recovery`
- Phase: `Leadership Dashboard Delivery`
- Owner: `Codex`
- Governance Version: `V2 Draft / V1 Compatible`

## 2. Objective

Restore and verify the Quality Delivery Rate Trendline runtime path so browser requests resolve to the backend and render actual data for Product Owner recheck.

## 3. Current Status

- Current state: `Technical PASS / Runtime PASS / Ready for PO Check`
- Live phase, current commit, branch, PO status, and next ticket are owned by `PROJECT_SNAPSHOT.md`
- PO UI Check Required: `Yes`

## 4. Required Reading

Only the following documents are required to continue this ticket:

- [README_AI.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/README_AI.md)
- [docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)
- [docs/06_REVIEWS/Import/TODAY-003-R1_QUALITY_TRENDLINE_RUNTIME_ROUTE_RECOVERY.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/TODAY-003-R1_QUALITY_TRENDLINE_RUNTIME_ROUTE_RECOVERY.md)
- [docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md)
- [docs/01_GOVERNANCE/PROJECT_CONTEXT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_CONTEXT.md)
- [docs/01_GOVERNANCE/PROJECT_HANDOVER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_HANDOVER.md)
- [docs/04_TECHNICAL_PLANNING/Backlog/DEVELOPMENT_BACKLOG.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Backlog/DEVELOPMENT_BACKLOG.md)

## 5. Business Context

- Business problem: the Quality Delivery Rate Trendline must be available to leadership in the Operation Dashboard.
- Business impact: the PO must be able to verify the chart against live runtime data.
- Approved business rule constraints: keep `danh_gia_2026`, keep missing dates as gaps, keep the 90% target as presentation-only, preserve optional BCVH filtering.
- Current phase, current ticket ownership, and next ticket routing are referenced from `PROJECT_SNAPSHOT.md`.

## 6. Technical Context

- Relevant frontend files:
  - `frontend/src/features/dashboard/DashboardPage.jsx`
  - `frontend/src/features/dashboard/components/QualityDeliveryTrendlineAdapter.jsx`
  - `frontend/src/api/client.js`
- Relevant backend files:
  - `backend/server.js`
  - `backend/src/routes/f13Routes.js`
  - `backend/src/controllers/DashboardController.js`
  - `backend/src/services/F13DashboardService.js`
- Relevant route(s):
  - `GET /api/f13/dashboard/meta`
  - `GET /api/f13/dashboard/kpi`
  - `GET /api/f13/dashboard/daily-trend`
- Relevant state or contract constraints:
  - `danh_gia_2026` remains current-reporting source
  - runtime response contract must remain unchanged
  - browser request must resolve to backend origin, not the frontend dev server

## 7. Runtime Context

- Current runtime endpoint: `GET /api/f13/dashboard/daily-trend`
- Browser origin: `http://localhost:5178`
- Backend origin: `http://localhost:5050`
- Observed validation state:
  - `meta` returns `200`
  - `kpi` returns `200`
  - `daily-trend` returns `200`
  - chart renders the 90% target line and actual data point

## 8. Related Review

- Review document: `docs/06_REVIEWS/Import/TODAY-003-R1_QUALITY_TRENDLINE_RUNTIME_ROUTE_RECOVERY.md`
- Review status: `PASS / Ready for PO Check`
- Key evidence:
  - browser requests resolved to `http://localhost:5050/api/f13/dashboard/daily-trend`
  - `2026-07-15` returned `67.2015%`
  - missing dates remain gaps

## 9. Related PO Findings

- PO finding IDs: `POF-TODAY-003-01`
- Status: `OPEN`
- Closure or recheck requirement: keep ticket open until PO rechecks the browser and confirms the chart behavior
- PO gate and current product state are referenced from `PROJECT_SNAPSHOT.md`.

## 10. Documents To Update

- `README_AI.md` only if onboarding entry points change
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md` when current manifest changes
- `docs/06_REVIEWS/Import/TODAY-003-R1_QUALITY_TRENDLINE_RUNTIME_ROUTE_RECOVERY.md` for evidence updates
- `docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md` if PO finding status changes
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md` if manifest inventory changes

## 11. Validation

- Technical validation: backend endpoint returns `200`
- Runtime validation: browser route resolves to backend endpoint
- Browser validation: network shows `meta`, `kpi`, and `daily-trend` all return `200`
- Build or lint validation: no additional code changes required for this manifest-only framework

## 12. Expected Output

- The ticket remains `READY FOR PO CHECK`
- The manifest acts as the single ticket entry point after `README_AI.md` and `PROJECT_SNAPSHOT.md`
- Governance V1 remains compatible and unchanged
- No new business rules are introduced

## 13. Next Ticket

- Next ticket ID: `TODAY-004`
- Next ticket name: `Volume Trendline`
- Blockers or handoff notes: keep `TODAY-004` blocked / not started until PO check outcome is recorded for `TODAY-003-R1`
- Next ticket ownership is referenced from `PROJECT_SNAPSHOT.md`.
