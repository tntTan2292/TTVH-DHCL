# TODAY-003-R2 Ticket Manifest

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
- [14. PO Acceptance Checklist](#14-po-acceptance-checklist)
- [15. Authority Escalation](#15-authority-escalation)

## 1. Ticket Information

- Ticket ID: `TODAY-003-R2`
- Ticket Name: `Quality Trendline 30-Day Window Recovery`
- Phase: `Leadership Dashboard Delivery`
- Owner: `Codex`
- Governance Version: `V2 Active`

## 2. Objective

Make the Quality Delivery Rate Trendline always display a meaningful rolling 30-day period while preserving approved filtering, data semantics, runtime contracts, and missing-date behavior.

## 3. Current Status

- Current state: `Technical PASS / Runtime PASS / PO PASS / Closed`
- Live phase, current commit, branch, PO status, and next ticket are owned by `PROJECT_SNAPSHOT.md`
- PO UI Check Required: `Yes`
- PO Acceptance Checklist: [docs/06_REVIEWS/Import/TODAY-003-R2_PO_ACCEPTANCE_CHECKLIST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/TODAY-003-R2_PO_ACCEPTANCE_CHECKLIST.md)
- The Product Owner has executed the checklist and confirmed PO PASS.
- Valid PO outcomes: `PASS`, `WARNING`, `FAIL`

## 4. Required Reading

Only the following documents are required to continue this ticket:

- [README_AI.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/README_AI.md)
- [docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)
- [docs/06_REVIEWS/Import/TODAY-003-R2_QUALITY_TRENDLINE_30_DAY_WINDOW_RECOVERY.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/TODAY-003-R2_QUALITY_TRENDLINE_30_DAY_WINDOW_RECOVERY.md)
- [docs/06_REVIEWS/Import/TODAY-003-R2_PO_ACCEPTANCE_CHECKLIST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/TODAY-003-R2_PO_ACCEPTANCE_CHECKLIST.md)
- [docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md)
- [docs/01_GOVERNANCE/PROJECT_CONTEXT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_CONTEXT.md)
- [docs/01_GOVERNANCE/PROJECT_HANDOVER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_HANDOVER.md)
- [docs/04_TECHNICAL_PLANNING/Backlog/DEVELOPMENT_BACKLOG.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Backlog/DEVELOPMENT_BACKLOG.md)

## 5. Business Context

- Business problem: the Quality Delivery Rate Trendline loses analytical meaning when it shrinks to the selected dashboard date range.
- Business impact: leadership must still see a 30-day rolling trend ending on the selected end date or latest available reporting date.
- Approved business rule constraints: keep `danh_gia_2026`, keep missing dates as gaps, keep the 90% target as presentation-only, preserve optional BCVH filtering.
- Current phase, current ticket ownership, and next ticket routing are referenced from `PROJECT_SNAPSHOT.md`.

## 6. Technical Context

- Relevant frontend files:
  - `frontend/src/features/dashboard/DashboardPage.jsx`
  - `frontend/src/features/dashboard/components/QualityDeliveryTrendlineAdapter.jsx`
  - `frontend/src/features/dashboard/components/qualityTrendlineWindow.js`
  - `frontend/src/api/client.js`
- Relevant backend files:
  - `backend/server.js`
  - `backend/src/routes/f13Routes.js`
  - `backend/src/controllers/DashboardController.js`
  - `backend/src/services/F13DashboardService.js`
  - `backend/src/repositories/FactBuuGuiRepository.js`
- Relevant route(s):
  - `GET /api/f13/dashboard/meta`
  - `GET /api/f13/dashboard/kpi`
  - `GET /api/f13/dashboard/daily-trend`
- Relevant state or contract constraints:
  - `danh_gia_2026` remains current-reporting source
  - runtime response contract must remain unchanged
  - trendline request must use a 30-day rolling window ending on the selected end date or latest reporting date

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

- Review document: `docs/06_REVIEWS/Import/TODAY-003-R2_QUALITY_TRENDLINE_30_DAY_WINDOW_RECOVERY.md`
- Review status: `PASS / PO PASS / Closed`
- Key evidence:
  - browser requests resolve to `http://localhost:5050/api/f13/dashboard/daily-trend`
  - `2026-07-15` anchors a rolling window from `2026-06-16` through `2026-07-15`
  - missing dates remain gaps

## 9. Related PO Findings

- PO finding IDs: `POF-TODAY-003-02`
- Status: `CLOSED`
- Closure or recheck requirement: closed after PO PASS and browser recheck confirmed the rolling 30-day window behavior
- PO gate and current product state are referenced from `PROJECT_SNAPSHOT.md`.

## 10. Documents To Update

- `README_AI.md` only if onboarding entry points change
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md` when current ticket or manifest changes
- `docs/06_REVIEWS/Import/TODAY-003-R2_QUALITY_TRENDLINE_30_DAY_WINDOW_RECOVERY.md` for evidence updates
- `docs/06_REVIEWS/Import/TODAY-003-R2_PO_ACCEPTANCE_CHECKLIST.md` for the recheck flow
- `docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md` if PO finding status changes
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md` if manifest inventory changes

## 11. Validation

- Technical validation: backend endpoint returns `200`
- Runtime validation: browser route resolves to backend endpoint and uses a 30-day request window
- Browser validation: network shows `meta`, `kpi`, and `daily-trend` all return `200`
- Build or lint validation: no additional code changes required beyond the rolling-window helper

## 12. Expected Output

- The ticket is `CLOSED` after PO PASS
- The manifest acts as the single ticket entry point after `README_AI.md` and `PROJECT_SNAPSHOT.md`
- Governance V1 remains compatible and unchanged
- No new business rules are introduced

## 13. Next Ticket

- Next ticket ID: `TODAY-004`
- Next ticket name: `Volume Trendline`
- Blockers or handoff notes: TODAY-004 is the next active ticket; do not implement it until its manifest is prepared.
- Next ticket ownership is referenced from `PROJECT_SNAPSHOT.md`.

## 14. PO Acceptance Checklist

PO Acceptance Checklist:

- [TODAY-003-R2 PO Acceptance Checklist](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/TODAY-003-R2_PO_ACCEPTANCE_CHECKLIST.md)

PO UI Check Required: `Yes`
PO has executed the checklist and the ticket is closed.
Valid outcomes: `PASS`, `WARNING`, `FAIL`

## 15. Authority Escalation

Escalate instead of guessing when:

- the manifest conflicts with `PROJECT_SNAPSHOT.md`
- a higher-authority document exists
- a frozen document or SSOT would need to change
- the ticket scope is unclear
- the update would add a second source of truth

When escalation is required, stop and reference the authoritative document instead of expanding scope.
