# TODAY-006 Ticket Manifest

## 1. Ticket Information

- Ticket ID: `TODAY-006`
- Ticket Name: `Restore and Preserve Existing Dashboard Charts`
- Phase: `Leadership Dashboard Delivery`
- Owner: `Codex`
- Governance Version: `V2 Active`

## 2. Objective

- Restore the approved Operation Dashboard analysis surfaces without removing or regressing `TODAY-003` through `TODAY-005` work.

## 3. Current Status

- Current state: `Technical PASS / Runtime PASS / PO PASS / CLOSED`
- PO UI Check Required: `Yes`
- PO Product Status: `PO PASS`
- Review status: `CLOSED`

## 4. Required Reading

- `README_AI.md`
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
- `docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md`
- `docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md`
- `docs/10_TICKETS/TODAY-005_MANIFEST.md`
- `docs/06_REVIEWS/Import/TODAY-005_SAME_PERIOD_COMPARISON_TRENDLINE.md`
- `docs/06_REVIEWS/Import/TODAY-005_PO_ACCEPTANCE_CHECKLIST.md`

## 5. Business Context

- Preserve all approved analysis surfaces and canonical BCVH behavior.
- Do not fabricate business formulas or modify SSOT.

## 6. Technical Context

- Relevant frontend files:
  - `frontend/src/features/dashboard/DashboardPage.jsx`
  - `frontend/src/features/dashboard/components/QualityVolumeComboTrendlineAdapter.jsx`
  - `frontend/src/features/dashboard/components/SamePeriodComparisonTrendlineAdapter.jsx`
  - `frontend/src/features/dashboard/components/QualityTimelineAdapter.jsx`
  - `frontend/src/features/dashboard/components/BcvhOperationTableAdapter.jsx`
  - `frontend/src/features/dashboard/components/dashboardKpiCards.js`
- Relevant backend files:
  - `backend/src/services/F13DashboardService.js`
  - `backend/src/services/timelineService.js`
  - `backend/src/repositories/FactBuuGuiRepository.js`
- Relevant route(s):
  - `/api/f13/dashboard/kpi`
  - `/api/f13/dashboard/daily-trend`
  - `/api/f13/dashboard/quality-timeline`
  - `/api/f13/ranking/bcvh`
- Relevant state or contract constraints:
  - Keep one shared `daily-trend` request for the accepted charts.
  - Preserve missing-date null semantics.
  - Preserve canonical `ma_bcvh` context and Vietnamese labels.

## 7. Runtime Context

- Current runtime endpoint: `/f13/dashboard`
- Browser origin: authenticated local dashboard session
- Backend origin: `http://localhost:5050`
- Observed validation state: implementation pending validation

## 8. Related Review

- Review document: `docs/06_REVIEWS/Import/TODAY-006_RESTORE_AND_PRESERVE_EXISTING_DASHBOARD_CHARTS.md`
- Review status: `READY FOR PO CHECK`
- Key evidence: runtime KPI mapping, restored timeline, restored ranking surface, preserved daily-trend sharing, authenticated browser validation

## 9. Related PO Findings

- PO finding IDs: none expected
- Status: `N/A`
- Closure or recheck requirement: closed after explicit PO PASS

## 10. Documents To Update

- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md`
- `docs/06_REVIEWS/Import/TODAY-006_RESTORE_AND_PRESERVE_EXISTING_DASHBOARD_CHARTS.md`
- `docs/06_REVIEWS/Import/TODAY-006_PO_ACCEPTANCE_CHECKLIST.md`

## 11. Validation

- Technical validation:
  - frontend unit tests for KPI mapping, trendline windows, and preserved BCVH contract
- Runtime validation:
  - backend daily-trend and quality timeline contracts remain intact
- Browser validation:
  - restored analysis surfaces remain visible
  - accepted charts remain correct
  - no status selector appears
  - no duplicate daily-trend request
- Build or lint validation:
  - build and lint must pass

## 12. Expected Output

- What the ticket must achieve:
  - restore approved dashboard analysis surfaces without regression
- What must remain unchanged:
  - accepted 30-day combo chart
  - same-period 7-day comparison chart
  - canonical BCVH dropdown behavior
  - Vietnamese labels
- What must not be introduced:
  - duplicate daily-trend fetches
  - fabricated values for missing dates
  - TODAY-007 cleanup

## 13. Next Ticket

- Next ticket ID: `TODAY-007`
- Next ticket name: `Dashboard Executive Layout Cleanup`
- Blockers or handoff notes: do not activate until `TODAY-006` receives explicit PO PASS

## 14. PO Acceptance Checklist

- Checklist document: `docs/06_REVIEWS/Import/TODAY-006_PO_ACCEPTANCE_CHECKLIST.md`
- PO purpose: verify restored analysis surfaces and preserve accepted trends
- Screen URL: `/f13/dashboard`
- Data conditions: authenticated session, latest runtime dashboard data, canonical BCVH values, and aggregate `Tất cả BCVH`
- Step-by-step checks: see the linked checklist

## 15. Authority Escalation

- Escalate to `PROJECT_SNAPSHOT.md` for current ticket state.
- Do not close this ticket without explicit PO PASS.
