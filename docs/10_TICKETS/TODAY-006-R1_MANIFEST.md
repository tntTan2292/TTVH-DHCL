# TODAY-006-R1 Ticket Manifest

## 1. Ticket Information

- Ticket ID: `TODAY-006-R1`
- Ticket Name: `Runtime KPI and Stable Dashboard Surfaces Recovery`
- Phase: `Leadership Dashboard Delivery`
- Owner: `Codex`
- Governance Version: `V2 Active`

## 2. Objective

- Correct the active `/api/f13/dashboard/kpi` contract end-to-end.
- Preserve stable dashboard analysis surfaces during loading, empty, and error states.

## 3. Current Status

- Current state: `Technical PASS / Runtime PASS / READY FOR PO CHECK`
- PO UI Check Required: `Yes`
- PO Product Status: `READY FOR PO CHECK`
- Review status: `READY FOR PO CHECK`

## 4. Required Reading

- `README_AI.md`
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
- `docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md`
- `docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md`
- `docs/10_TICKETS/TODAY-006_MANIFEST.md`
- `docs/06_REVIEWS/Import/TODAY-006_RESTORE_AND_PRESERVE_EXISTING_DASHBOARD_CHARTS.md`
- `docs/06_REVIEWS/Import/TODAY-006_PO_ACCEPTANCE_CHECKLIST.md`

## 5. Business Context

- Canonical `ma_bcvh` filtering must apply through the KPI route, with `all` preserved as aggregate.
- Do not invent a ranking field where no authoritative contract exists.

## 6. Technical Context

- Relevant frontend files:
  - `frontend/src/features/dashboard/DashboardPage.jsx`
  - `frontend/src/features/dashboard/components/dashboardKpiCards.js`
  - `frontend/src/components/f13/QualityTimelinePanel.jsx`
- Relevant backend files:
  - `backend/src/controllers/DashboardController.js`
  - `backend/src/services/F13DashboardService.js`
  - `backend/src/repositories/FactBuuGuiRepository.js`
- Relevant route(s):
  - `/api/f13/dashboard/kpi`
  - `/api/f13/dashboard/quality-timeline`
  - `/api/f13/dashboard/daily-trend`
- Relevant state or contract constraints:
  - Keep one shared `daily-trend` request for the accepted charts.
  - Keep timeline/heatmap/frequency content mounted during errors.
  - Preserve seven BCVH options and the absent status selector.

## 7. Runtime Context

- Current runtime endpoint: `/f13/dashboard`
- Browser origin: authenticated local dashboard session
- Backend origin: `http://localhost:5050`
- Observed validation state: implementation pending validation

## 8. Related Review

- Review document: `docs/06_REVIEWS/Import/TODAY-006-R1_RUNTIME_KPI_AND_STABLE_DASHBOARD_SURFACES_RECOVERY.md`
- Review status: `READY FOR PO CHECK`

## 9. Related PO Findings

- PO finding IDs: none expected
- Status: `N/A`

## 10. Documents To Update

- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md`
- `docs/06_REVIEWS/Import/TODAY-006-R1_RUNTIME_KPI_AND_STABLE_DASHBOARD_SURFACES_RECOVERY.md`
- `docs/06_REVIEWS/Import/TODAY-006-R1_PO_ACCEPTANCE_CHECKLIST.md`

## 11. Validation

- Technical validation:
  - KPI route filtering and stable card-state tests
  - timeline mounted-state tests
- Runtime validation:
  - authenticated browser must confirm scoped KPI values and one shared daily-trend request
- Build or lint validation:
  - frontend build and lint
  - targeted backend recovery tests

## 12. Expected Output

- What the ticket must achieve:
  - canonical KPI filtering and stable dashboard surfaces
- What must remain unchanged:
  - accepted 30-day combo chart
  - 7-day same-period comparison chart
  - canonical BCVH dropdown behavior
  - Vietnamese labels

## 13. Next Ticket

- Next ticket ID: `TODAY-007`
- Next ticket name: `Dashboard Executive Layout Cleanup`
- Blockers or handoff notes: keep inactive until explicit `TODAY-006-R1` closure

## 14. PO Acceptance Checklist

- Checklist document: `docs/06_REVIEWS/Import/TODAY-006-R1_PO_ACCEPTANCE_CHECKLIST.md`
- Screen URL: `/f13/dashboard`

## 15. Authority Escalation

- Escalate to `PROJECT_SNAPSHOT.md` for current ticket state.
- Do not close this ticket without explicit PO PASS.
