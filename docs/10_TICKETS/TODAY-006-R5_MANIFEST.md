# TODAY-006-R5 Ticket Manifest

## 1. Ticket Information

- Ticket ID: `TODAY-006-R5`
- Ticket Name: `Executive KPI Infinite Loading Recovery`
- Phase: `Leadership Dashboard Delivery`
- Owner: `Codex`
- Governance Version: `V2 Active`

## 2. Objective

- Fix the KPI request lifecycle so the dashboard always leaves loading state and reaches success, empty, or error for each stable filter context.

## 3. Current Status

- Current state: `Technical PASS / Runtime CONTRACT PASS / READY FOR PO CHECK`
- PO UI Check Required: `Yes`
- PO Product Status: `READY FOR PO CHECK`
- Review status: `READY FOR PO CHECK`

## 4. Required Reading

- `README_AI.md`
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
- `docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md`
- `docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md`
- `docs/10_TICKETS/TODAY-006-R4_MANIFEST.md`
- `docs/06_REVIEWS/Import/TODAY-006-R4_BCVH_SCOPED_EXECUTIVE_KPI_RECOVERY.md`
- `docs/06_REVIEWS/Import/TODAY-006-R4_PO_ACCEPTANCE_CHECKLIST.md`

## 5. Business Context

- Keep `all` aggregate for KPI requests.
- Preserve the approved fourth KPI card as `Tỷ lệ Không đạt`.
- Do not invent ranking formulas or restore `Xếp hạng` / `f13_303_rate`.

## 6. Technical Context

- Relevant frontend files:
  - `frontend/src/features/dashboard/DashboardPage.jsx`
  - `frontend/src/features/dashboard/components/ExecutiveSummaryAdapter.jsx`
  - `frontend/src/features/dashboard/components/ExecutiveDailyBriefAdapter.jsx`
- Relevant backend files:
  - `backend/src/controllers/DashboardController.js`
  - `backend/src/services/F13DashboardService.js`
  - `backend/src/repositories/FactBuuGuiRepository.js`
- Relevant route(s):
  - `/api/f13/dashboard/kpi`

## 7. Runtime Context

- Current runtime endpoint: `/f13/dashboard`
- Browser origin: authenticated local dashboard session
- Backend origin: `http://localhost:5050`
- Observed validation state: targeted runtime trace required only if needed to diagnose a technical failure

## 8. Related Review

- Review document: `docs/06_REVIEWS/Import/TODAY-006-R5_EXECUTIVE_KPI_INFINITE_LOADING_RECOVERY.md`
- Review status: `READY FOR PO CHECK`

## 9. Related PO Findings

- PO finding IDs:
  - `POF-TODAY-006-01`
- Status: `OPEN`

## 10. Documents To Update

- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md`
- `docs/06_REVIEWS/Import/TODAY-006-R5_EXECUTIVE_KPI_INFINITE_LOADING_RECOVERY.md`
- `docs/06_REVIEWS/Import/TODAY-006-R5_PO_ACCEPTANCE_CHECKLIST.md`

## 11. Validation

- Technical validation:
  - KPI effect no longer depends on `kpiState.data`
  - request lifecycle reaches success, empty, or error
  - stale response protection uses a request sequence / abort flow
- Runtime validation:
  - not required unless diagnosis needs it
- Build or lint validation:
  - frontend build and lint
  - backend targeted KPI tests

## 12. Expected Output

- What the ticket must achieve:
  - stable KPI terminal states without infinite loading
- What must remain unchanged:
  - accepted 30-day combo chart
  - 7-day same-period comparison chart
  - six canonical BCVH plus `Tất cả BCVH`
  - Vietnamese labels
- What must not be introduced:
  - duplicate KPI fetch locations
  - `all` in SQL params
  - TODAY-007 cleanup

## 13. Next Ticket

- Next ticket ID: `TODAY-007`
- Next ticket name: `Dashboard Executive Layout Cleanup`
- Blockers or handoff notes: keep inactive until explicit `TODAY-006-R5` closure

## 14. PO Acceptance Checklist

- Checklist document: `docs/06_REVIEWS/Import/TODAY-006-R5_PO_ACCEPTANCE_CHECKLIST.md`
- Screen URL: `/f13/dashboard`

## 15. Authority Escalation

- Escalate to `PROJECT_SNAPSHOT.md` for current ticket state.
- Do not close this ticket without explicit PO PASS.
