# TODAY-005 Ticket Manifest

## 1. Ticket Information

- Ticket ID: `TODAY-005`
- Ticket Name: `Same-Period Comparison Trendline`
- Phase: `Leadership Dashboard Delivery`
- Owner: `Codex`
- Governance Version: `V2 Active`

## 2. Objective

- Add a professional 7-day same-period comparison card below the accepted 30-day combo chart using the shared daily-trend payload.

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
- `docs/10_TICKETS/TODAY-004-R3_MANIFEST.md`
- `docs/06_REVIEWS/Import/TODAY-005_SAME_PERIOD_COMPARISON_TRENDLINE.md`
- `docs/06_REVIEWS/Import/TODAY-005_PO_ACCEPTANCE_CHECKLIST.md`

## 5. Business Context

- Compare the current 7 calendar days ending on the selected `to_date` against the immediately preceding 7 calendar days.
- Align by weekday/day position and apply the selected canonical `ma_bcvh`.
- Use the same normalized daily-trend payload as the 30-day combo chart.

## 6. Technical Context

- Relevant frontend files:
  - `frontend/src/features/dashboard/DashboardPage.jsx`
  - `frontend/src/features/dashboard/components/QualityVolumeComboTrendlineAdapter.jsx`
  - `frontend/src/features/dashboard/components/SamePeriodComparisonTrendlineAdapter.jsx`
  - `frontend/src/features/dashboard/components/samePeriodComparisonData.js`
- Relevant backend files:
  - `backend/src/services/F13DashboardService.js`
  - `backend/src/repositories/FactBuuGuiRepository.js`
- Relevant route(s):
  - `/api/f13/dashboard/daily-trend`
- Relevant state or contract constraints:
  - Preserve one shared daily-trend request.
  - Preserve missing-date gaps and null handling.
  - Do not introduce a second backend fetch for the 7-day card.

## 7. Runtime Context

- Current runtime endpoint: `/f13/dashboard`
- Browser origin: authenticated local dashboard session
- Backend origin: `http://localhost:5050`
- Observed validation state: frontend implementation and unit tests pending validation

## 8. Related Review

- Review document: `docs/06_REVIEWS/Import/TODAY-005_SAME_PERIOD_COMPARISON_TRENDLINE.md`
- Review status: `READY FOR PO CHECK`
- Key evidence: frontend unit tests PASS; backend daily-trend tests PASS; build PASS; lint PASS with existing warnings only; authenticated browser PASS; shared 30-day payload now feeds both the accepted combo chart and the new 7-day comparison card

## 9. Related PO Findings

- PO finding IDs: `POF-TODAY-004-01`, `POF-TODAY-004-02`, `POF-TODAY-004-03`
- Status: `CLOSED`
- Closure or recheck requirement: explicit PO PASS on `TODAY-004-R3`

## 10. Documents To Update

- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md`
- `docs/06_REVIEWS/Import/TODAY-005_SAME_PERIOD_COMPARISON_TRENDLINE.md`
- `docs/06_REVIEWS/Import/TODAY-005_PO_ACCEPTANCE_CHECKLIST.md`
- `docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md`

## 11. Validation

- Technical validation:
  - frontend unit tests PASS for range derivation, alignment, missing data, and deltas
- Runtime validation:
  - backend daily-trend tests PASS with 23 passed
  - one shared daily-trend request for the 30-day and 7-day surfaces
- Browser validation:
  - authenticated browser PASS
  - accepted 30-day chart remains visible
  - new 7-day comparison card is visible
  - BCVH filter still offers seven options and no status selector
- Build or lint validation:
  - build PASS
  - lint PASS with existing warnings only

## 12. Expected Output

- What the ticket must achieve:
  - show the new same-period comparison card with correct dates and aligned data
- What must remain unchanged:
  - accepted 30-day combo chart
  - canonical BCVH dropdown behavior
  - Vietnamese labels
- What must not be introduced:
  - duplicate daily-trend fetches
  - fabricated values for missing dates
  - activation of `TODAY-006`

## 13. Next Ticket

- Next ticket ID: `TODAY-006`
- Next ticket name: `Restore and Preserve Existing Dashboard Charts`
- Blockers or handoff notes: do not activate until `TODAY-005` receives explicit PO PASS

## 14. PO Acceptance Checklist

- Checklist document: `docs/06_REVIEWS/Import/TODAY-005_PO_ACCEPTANCE_CHECKLIST.md`
- PO purpose: verify the 7-day comparison card, shared runtime payload, and BCVH behavior
- Screen URL: `/f13/dashboard`
- Data conditions: authenticated session, latest 30-day trend payload, all six canonical BCVH values, and aggregate `Tất cả BCVH`
- Step-by-step checks: see the linked checklist
- PASS / WARNING / FAIL criteria: see the linked checklist
- Follow-up action after PASS: update governance and close the ticket only after explicit PO PASS
- Follow-up action after WARNING: keep ticket open for recheck
- Follow-up action after FAIL: create or update the responsible recovery work
- Documents to update per result: manifest, snapshot, index, findings register, review evidence

## 15. Authority Escalation

- Escalate to `PROJECT_SNAPSHOT.md` for current ticket state.
- Do not close this ticket without explicit PO PASS.
