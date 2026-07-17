# TODAY-006-R4 Ticket Manifest

## 1. Ticket Information

- Ticket ID: `TODAY-006-R4`
- Ticket Name: `BCVH-Scoped Executive KPI Recovery`
- Phase: `Leadership Dashboard Delivery`
- Owner: `Codex`
- Governance Version: `V2 Active`

## 2. Objective

- Make the Executive Header KPI, Executive Summary, and Executive Daily Brief all reflect the selected BCVH scope without exposing stale aggregate values during loading.

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
- `docs/10_TICKETS/TODAY-006-R3_MANIFEST.md`
- `docs/06_REVIEWS/Import/TODAY-006-R3_SHARED_KPI_REQUEST_AND_PO_READINESS_RECOVERY.md`
- `docs/06_REVIEWS/Import/TODAY-006-R3_PO_ACCEPTANCE_CHECKLIST.md`

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
- Observed validation state: runtime trace and screenshot captured, but scoped KPI display still shows stale aggregate values during filter changes

## 8. Related Review

- Review document: `docs/06_REVIEWS/Import/TODAY-006-R4_BCVH_SCOPED_EXECUTIVE_KPI_RECOVERY.md`
- Review status: `READY FOR PO CHECK`

## 9. Related PO Findings

- PO finding IDs:
  - `POF-TODAY-006-01`
- Status: `OPEN`

## 10. Documents To Update

- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md`
- `docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md`
- `docs/06_REVIEWS/Import/TODAY-006-R4_BCVH_SCOPED_EXECUTIVE_KPI_RECOVERY.md`
- `docs/06_REVIEWS/Import/TODAY-006-R4_PO_ACCEPTANCE_CHECKLIST.md`

## 11. Validation

- Technical validation:
  - KPI payload reset on BCVH change
  - no stale aggregate cards during scoped loading
  - shared KPI response consumed by header, summary, and daily brief
- Runtime validation:
  - authenticated Chrome evidence with aggregate and scoped BCVH changes
- Build or lint validation:
  - frontend build and lint
  - backend targeted fixture tests

## 12. Expected Output

- What the ticket must achieve:
  - BCVH-scoped Executive KPI rendering with no stale aggregate bleed-through
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
- Blockers or handoff notes: keep inactive until explicit `TODAY-006-R4` closure

## 14. PO Acceptance Checklist

- Checklist document: `docs/06_REVIEWS/Import/TODAY-006-R4_PO_ACCEPTANCE_CHECKLIST.md`
- Screen URL: `/f13/dashboard`

## 15. Authority Escalation

- Escalate to `PROJECT_SNAPSHOT.md` for current ticket state.
- Do not close this ticket without explicit PO PASS.
