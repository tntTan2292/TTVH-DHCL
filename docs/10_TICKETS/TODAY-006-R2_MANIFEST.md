# TODAY-006-R2 Ticket Manifest

## 1. Ticket Information

- Ticket ID: `TODAY-006-R2`
- Ticket Name: `Aggregate KPI Context and Runtime Validation Recovery`
- Phase: `Leadership Dashboard Delivery`
- Owner: `Codex`
- Governance Version: `V2 Active`

## 2. Objective

- Normalize KPI BCVH context at the controller/service boundary and recover runtime validation evidence.

## 3. Current Status

- Current state: `Technical PASS / Runtime NOT PROVEN / READY FOR PO CHECK`
- PO UI Check Required: `Yes`
- PO Product Status: `READY FOR PO CHECK`
- Review status: `READY FOR PO CHECK`

## 4. Required Reading

- `README_AI.md`
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
- `docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md`
- `docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md`
- `docs/10_TICKETS/TODAY-006-R1_MANIFEST.md`
- `docs/06_REVIEWS/Import/TODAY-006-R1_RUNTIME_KPI_AND_STABLE_DASHBOARD_SURFACES_RECOVERY.md`
- `docs/06_REVIEWS/Import/TODAY-006-R1_PO_ACCEPTANCE_CHECKLIST.md`

## 5. Business Context

- `all` must remain aggregate for KPI requests.
- Unknown BCVH codes must be rejected with Vietnamese validation text.
- Do not invent business formulas or ranking fields.

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

## 7. Runtime Context

- Current runtime endpoint: `/f13/dashboard`
- Browser origin: authenticated local dashboard session
- Backend origin: `http://localhost:5050`
- Observed validation state: runtime validation pending

## 8. Related Review

- Review document: `docs/06_REVIEWS/Import/TODAY-006-R2_AGGREGATE_KPI_CONTEXT_AND_RUNTIME_VALIDATION_RECOVERY.md`
- Review status: `READY FOR PO CHECK`

## 9. Related PO Findings

- PO finding IDs: none expected
- Status: `N/A`

## 10. Documents To Update

- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md`
- `docs/06_REVIEWS/Import/TODAY-006-R2_AGGREGATE_KPI_CONTEXT_AND_RUNTIME_VALIDATION_RECOVERY.md`
- `docs/06_REVIEWS/Import/TODAY-006-R2_PO_ACCEPTANCE_CHECKLIST.md`

## 11. Validation

- Technical validation:
  - controller/service/repository normalization tests
  - timeline empty-state and regression tests
- Runtime validation:
  - authenticated browser evidence still required
- Build or lint validation:
  - frontend build and lint
  - backend targeted recovery tests

## 12. Expected Output

- What the ticket must achieve:
  - aggregate KPI context and stable runtime validation handoff
- What must remain unchanged:
  - accepted 30-day combo chart
  - 7-day same-period comparison chart
  - six canonical BCVH plus `Tất cả BCVH`
  - Vietnamese labels
- What must not be introduced:
  - `all` in SQL params
  - duplicate daily-trend fetches
  - TODAY-007 cleanup

## 13. Next Ticket

- Next ticket ID: `TODAY-007`
- Next ticket name: `Dashboard Executive Layout Cleanup`
- Blockers or handoff notes: keep inactive until explicit `TODAY-006-R2` closure

## 14. PO Acceptance Checklist

- Checklist document: `docs/06_REVIEWS/Import/TODAY-006-R2_PO_ACCEPTANCE_CHECKLIST.md`
- Screen URL: `/f13/dashboard`

## 15. Authority Escalation

- Escalate to `PROJECT_SNAPSHOT.md` for current ticket state.
- Do not close this ticket without explicit PO PASS.
