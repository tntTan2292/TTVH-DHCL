# TODAY-006-R3 Ticket Manifest

## 1. Ticket Information

- Ticket ID: `TODAY-006-R3`
- Ticket Name: `Shared KPI Request and PO Readiness Recovery`
- Phase: `Leadership Dashboard Delivery`
- Owner: `Codex`
- Governance Version: `V2 Active`

## 2. Objective

- Restore a single shared KPI request for the dashboard, preserve accepted surfaces, and prepare the ticket for PO review without activating `TODAY-007`.

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
- `docs/10_TICKETS/TODAY-006-R2_MANIFEST.md`
- `docs/06_REVIEWS/Import/TODAY-006-R2_AGGREGATE_KPI_CONTEXT_AND_RUNTIME_VALIDATION_RECOVERY.md`
- `docs/06_REVIEWS/Import/TODAY-006-R2_PO_ACCEPTANCE_CHECKLIST.md`

## 5. Business Context

- Keep `all` aggregate for KPI requests.
- Preserve the approved fourth KPI card as `Tỷ lệ Không đạt`.
- Do not invent ranking formulas or reintroduce the `Xếp hạng` / `f13_303_rate` mapping.

## 6. Technical Context

- Relevant frontend files:
  - `frontend/src/features/dashboard/DashboardPage.jsx`
  - `frontend/src/features/dashboard/components/ExecutiveSummaryAdapter.jsx`
  - `frontend/src/features/dashboard/components/ExecutiveDailyBriefAdapter.jsx`
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
- Observed validation state: authenticated browser validation completed

## 8. Related Review

- Review document: `docs/06_REVIEWS/Import/TODAY-006-R3_SHARED_KPI_REQUEST_AND_PO_READINESS_RECOVERY.md`
- Review status: `READY FOR PO CHECK`

## 9. Related PO Findings

- PO finding IDs: none expected
- Status: `N/A`

## 10. Documents To Update

- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md`
- `docs/06_REVIEWS/Import/TODAY-006-R3_SHARED_KPI_REQUEST_AND_PO_READINESS_RECOVERY.md`
- `docs/06_REVIEWS/Import/TODAY-006-R3_PO_ACCEPTANCE_CHECKLIST.md`

## 11. Validation

- Technical validation:
  - shared KPI request dedupe
  - accepted dashboard surface regression coverage
- Runtime validation:
  - authenticated browser evidence captured with one shared `daily-trend` request
- Build or lint validation:
  - frontend build and lint
  - backend targeted recovery tests

## 12. Expected Output

- What the ticket must achieve:
  - one shared KPI request and PO-ready dashboard state
- What must remain unchanged:
  - accepted 30-day combo chart
  - 7-day same-period comparison chart
  - six canonical BCVH plus `Tất cả BCVH`
  - Vietnamese labels
- What must not be introduced:
  - duplicate KPI fetches
  - `all` in SQL params
  - TODAY-007 cleanup

## 13. Next Ticket

- Next ticket ID: `TODAY-007`
- Next ticket name: `Dashboard Executive Layout Cleanup`
- Blockers or handoff notes: keep inactive until explicit `TODAY-006-R3` closure

## 14. PO Acceptance Checklist

- Checklist document: `docs/06_REVIEWS/Import/TODAY-006-R3_PO_ACCEPTANCE_CHECKLIST.md`
- Screen URL: `/f13/dashboard`

## 15. Authority Escalation

- Escalate to `PROJECT_SNAPSHOT.md` for current ticket state.
- Do not close this ticket without explicit PO PASS.
