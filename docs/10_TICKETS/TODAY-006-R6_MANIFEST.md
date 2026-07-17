# TODAY-006-R6 Ticket Manifest

## 1. Ticket Information

- Ticket ID: `TODAY-006-R6`
- Ticket Name: `KPI Scoped Data Contract Recovery`
- Phase: `Leadership Dashboard Delivery`
- Owner: `Codex`
- Governance Version: `V2 Active`

## 2. Objective

- Prove and preserve the scoped KPI data contract so the active runtime returns BCVH-specific values for the actual stored fact data.

## 3. Current Status

- Current state: `Technical PASS / API Contract PASS / PO PASS / CLOSED`
- PO UI Check Required: `Yes`
- PO Product Status: `PO PASS`
- Review status: `CLOSED`

## 4. Required Reading

- `README_AI.md`
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
- `docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md`
- `docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md`
- `docs/10_TICKETS/TODAY-006-R5_MANIFEST.md`
- `docs/06_REVIEWS/Import/TODAY-006-R5_EXECUTIVE_KPI_INFINITE_LOADING_RECOVERY.md`
- `docs/06_REVIEWS/Import/TODAY-006-R5_PO_ACCEPTANCE_CHECKLIST.md`

## 5. Business Context

- Keep `all` aggregate for KPI requests.
- Preserve the approved fourth KPI card as `Tỷ lệ Không đạt`.
- Do not invent ranking formulas or restore `Xếp hạng` / `f13_303_rate`.

## 6. Technical Context

- Relevant backend files:
  - `backend/src/controllers/DashboardController.js`
  - `backend/src/services/F13DashboardService.js`
  - `backend/src/repositories/FactBuuGuiRepository.js`
- Relevant frontend files:
  - `frontend/src/features/dashboard/DashboardPage.jsx`
  - `frontend/src/features/dashboard/components/ExecutiveSummaryAdapter.jsx`
  - `frontend/src/features/dashboard/components/ExecutiveDailyBriefAdapter.jsx`
- Relevant route(s):
  - `/api/f13/dashboard/kpi`

## 7. Runtime Context

- Current runtime endpoint: `/f13/dashboard`
- Browser origin: authenticated local dashboard session
- Backend origin: `http://localhost:5050`
- Observed validation state: direct database and HTTP proof captured; no browser automation used

## 8. Related Review

- Review document: `docs/06_REVIEWS/Import/TODAY-006-R6_KPI_SCOPED_DATA_CONTRACT_RECOVERY.md`
- Review status: `CLOSED`

## 9. Related PO Findings

- PO finding IDs:
  - `POF-TODAY-006-01`
- Status: `CLOSED`

## 10. Documents To Update

- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md`
- `docs/06_REVIEWS/Import/TODAY-006-R6_KPI_SCOPED_DATA_CONTRACT_RECOVERY.md`
- `docs/06_REVIEWS/Import/TODAY-006-R6_PO_ACCEPTANCE_CHECKLIST.md`

## 11. Validation

- Technical validation:
  - direct database aggregate and grouped totals
  - direct HTTP payload comparison for all and canonical BCVH values
  - integration test against the live runtime database and backend API
- Runtime validation:
  - not performed per ticket instruction
- Build or lint validation:
  - backend repository integration test
  - frontend build and lint

## 12. Expected Output

- What the ticket must achieve:
  - a provable KPI data contract where scoped API payloads differ by BCVH when the stored data differs
- What must remain unchanged:
  - accepted 30-day combo chart
  - 7-day same-period comparison chart
  - six canonical BCVH plus `Tất cả BCVH`
  - Vietnamese labels
- What must not be introduced:
  - another frontend lifecycle change
  - `all` in SQL params
  - TODAY-007 cleanup

## 13. Next Ticket

- Next ticket ID: `TODAY-007`
- Next ticket name: `Dashboard Executive Layout Cleanup`
- Blockers or handoff notes: keep inactive until explicit `TODAY-006-R6` closure

## 14. PO Acceptance Checklist

- Checklist document: `docs/06_REVIEWS/Import/TODAY-006-R6_PO_ACCEPTANCE_CHECKLIST.md`
- Screen URL: `/f13/dashboard`

## 15. Authority Escalation

- Escalate to `PROJECT_SNAPSHOT.md` for current ticket state.
- Closed after explicit PO PASS and documented runtime/database/API proof.
