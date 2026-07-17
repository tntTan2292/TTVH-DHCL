# TODAY-004 Ticket Manifest

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

- Ticket ID: `TODAY-004`
- Ticket Name: `Volume Trendline`
- Phase: `Leadership Dashboard Delivery`
- Owner: `Codex`
- Governance Version: `V2 Active`

## 2. Objective

Implement and runtime-validate the daily total shipment volume trendline on the Operation Dashboard while preserving existing approved dashboard behavior, contracts, filters, and analysis surfaces.

## 3. Current Status

- Current state: `READY FOR IMPLEMENTATION`
- PO UI Check Required: `Yes`
- PO Product Status: `NOT READY`
- Live phase, current commit, PO status, and next-ticket routing are owned by `PROJECT_SNAPSHOT.md`

## 4. Required Reading

Only the following documents are required to continue this ticket:

- [README_AI.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/README_AI.md)
- [docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)
- [docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md)
- [docs/04_TECHNICAL_PLANNING/Backlog/DEVELOPMENT_BACKLOG.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Backlog/DEVELOPMENT_BACKLOG.md)
- [docs/06_REVIEWS/Import/TODAY-002_DAILY_TREND_DATA_ADAPTER_REVIEW.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/TODAY-002_DAILY_TREND_DATA_ADAPTER_REVIEW.md)
- [docs/06_REVIEWS/Import/TODAY-003-R2_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/TODAY-003-R2_MANIFEST.md)
- [docs/01_GOVERNANCE/PROJECT_CONTEXT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_CONTEXT.md)
- [docs/01_GOVERNANCE/PROJECT_HANDOVER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_HANDOVER.md)
- [docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md)
- [docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md)
- [docs/02_ARCHITECTURE/QIS_V2_ARCHITECTURE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/02_ARCHITECTURE/QIS_V2_ARCHITECTURE.md)
- [docs/02_ARCHITECTURE/CROSS_CENTER_INTERACTION_ARCHITECTURE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/02_ARCHITECTURE/CROSS_CENTER_INTERACTION_ARCHITECTURE.md)
- [docs/02_ARCHITECTURE/ROUTE/ROUTE_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/02_ARCHITECTURE/ROUTE/ROUTE_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md)
- [docs/02_ARCHITECTURE/SHIPMENT/SHIPMENT_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/02_ARCHITECTURE/SHIPMENT/SHIPMENT_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md)
- [docs/03_UX/shared/QIS_UX_DESIGN_PRINCIPLES.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/03_UX/shared/QIS_UX_DESIGN_PRINCIPLES.md)
- [docs/03_UX/shared/QIS_DESIGN_SYSTEM.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/03_UX/shared/QIS_DESIGN_SYSTEM.md)
- [docs/03_UX/route/ROUTE_PERFORMANCE_CENTER_UX_ARCHITECTURE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/03_UX/route/ROUTE_PERFORMANCE_CENTER_UX_ARCHITECTURE.md)
- [docs/03_UX/shipment/SHIPMENT_PERFORMANCE_CENTER_UX_ARCHITECTURE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/03_UX/shipment/SHIPMENT_PERFORMANCE_CENTER_UX_ARCHITECTURE.md)
- [docs/06_REVIEWS/Import/TODAY-004_PO_ACCEPTANCE_CHECKLIST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/TODAY-004_PO_ACCEPTANCE_CHECKLIST.md)
- [docs/06_REVIEWS/Import/TODAY-004_ACTIVE_MANIFEST_REMEDIATION.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/TODAY-004_ACTIVE_MANIFEST_REMEDIATION.md)

## 5. Business Context

- Business problem: leadership needs a daily total shipment volume trendline on the Operation Dashboard, and the active manifest must authorize implementation rather than pointer activation.
- Business impact: daily volume trend visibility helps leadership understand operational load and compare volume movement over time.
- Approved business rule constraints:
  - the metric represents daily total shipment volume
  - the chart belongs to the Operation Dashboard at `/f13/dashboard`
  - the chart is date-based
  - a clear tooltip is required
  - visible UI and runtime data require PO verification
  - existing dashboard features must not regress
  - unresolved behaviors remain `WAITING FOR SSOT` unless a higher-authority source defines them

## 6. Technical Context

- Relevant frontend files:
  - `frontend/src/features/dashboard/DashboardPage.jsx`
  - `frontend/src/features/dashboard/components/QualityDeliveryTrendlineAdapter.jsx`
  - `frontend/src/features/dashboard/components/qualityTrendlineWindow.js`
  - `frontend/src/features/dashboard/components/qualityTrendlineWindow.test.js`
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
  - the manifest reuses the existing daily-trend runtime contract where valid
  - the current quality trendline implementation pattern is the baseline for adapter and window behavior
  - `danh_gia_2026` remains the current reporting source for the quality trendline contract
  - missing-date behavior and optional BCVH filter semantics are governed by the authoritative existing contract

## 7. Runtime Context

- Current runtime endpoint: `GET /api/f13/dashboard/daily-trend`
- Browser origin: `http://localhost:5178`
- Backend origin: `http://localhost:5050`
- Observed validation state:
  - `TODAY-003-R2` verified the current dashboard runtime route and 30-day quality trendline behavior
  - `TODAY-004` requires fresh runtime validation once implementation is delivered

## 8. Related Review

- Review document: `docs/06_REVIEWS/Import/TODAY-004_ACTIVE_MANIFEST_REMEDIATION.md`
- Review status: `IN PROGRESS`
- Key evidence:
  - the previous active manifest described governance pointer activation rather than implementation authority
  - the remediation aligns `TODAY-004` with the actual Volume Trendline product requirement

## 9. Related PO Findings

- PO finding IDs: `N/A`
- Status: `N/A`
- Closure or recheck requirement: `PO acceptance checklist must be created before PO PASS can be recorded`

## 10. Documents To Update

- `docs/10_TICKETS/TODAY-004_MANIFEST.md`
- `docs/06_REVIEWS/Import/TODAY-004_ACTIVE_MANIFEST_REMEDIATION.md`
- `docs/06_REVIEWS/Import/TODAY-004_PO_ACCEPTANCE_CHECKLIST.md`
- `docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md` when applicable
- `docs/04_TECHNICAL_PLANNING/Backlog/DEVELOPMENT_BACKLOG.md` only if backlog authority changes
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md` when new documents are created

## 11. Validation

- Technical validation: manifest content matches the authoritative TODAY-004 backlog definition and removes stale governance-only status
- Runtime validation: a fresh AI starting from `README_AI.md` can reach the active manifest and determine implementation scope
- Browser validation: runtime execution still requires future ticket work and is not claimed in this remediation ticket
- Build or lint validation: not applicable to governance-only remediation

## 12. Expected Output

- the active manifest authorizes implementation of the Volume Trendline
- mutable live-state metadata remains owned by `PROJECT_SNAPSHOT.md`
- the manifest no longer behaves like a pointer activation artifact
- the next AI can continue from the manifest without repository search or guessing

## 13. Next Ticket

- Next ticket ID: `TODAY-005`
- Next ticket name: `Same-Period Comparison Trendline`
- Blockers or handoff notes: do not activate `TODAY-005` during this remediation ticket

## 14. PO Acceptance Checklist

PO Acceptance Checklist:

- [TODAY-004 PO Acceptance Checklist](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/TODAY-004_PO_ACCEPTANCE_CHECKLIST.md)

PO UI Check Required: `Yes`
PO Product Status: `NOT READY`
Valid outcomes: `PASS`, `WARNING`, `FAIL`

## 15. Authority Escalation

Escalate instead of guessing when:

- the manifest conflicts with `PROJECT_SNAPSHOT.md`
- a higher-authority document exists
- a frozen document or SSOT would need to change
- the ticket scope is unclear
- the update would add a second source of truth
- the manifest would duplicate mutable live-state metadata owned by `PROJECT_SNAPSHOT.md`

When escalation is required, stop and reference the authoritative document instead of expanding scope.
