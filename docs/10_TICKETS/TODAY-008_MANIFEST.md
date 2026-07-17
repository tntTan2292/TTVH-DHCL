# TODAY-008 Manifest

## 1. Ticket Information

- Ticket ID: `TODAY-008`
- Ticket Name: `PO Data Reconciliation and Leadership View`
- Phase: `Leadership Dashboard Delivery`
- Owner: `Codex`
- Governance Version: `V2 Active`

## 2. Objective

- Provide the Product Owner with a validated import-to-dashboard reconciliation path so imported data and leadership dashboard charts can be checked end-to-end.

## 3. Current Status

- Current state: `COMPLETED`
- PO UI Check Required: `Yes`
- PO Product Status: `PO PASS`
- Technical Status: `PASS`
- Runtime Status: `PASS`
- Review status: `CLOSED`
- Activation date: `2026-07-17`
- Technical handoff date: `2026-07-17`
- Completion date: `2026-07-18`
- Closure authority: explicit Product Owner `PO PASS` decision

## 4. Required Reading

- [README_AI.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/README_AI.md)
- [docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)
- [docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md)
- [docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md)
- [docs/01_GOVERNANCE/DOCUMENT_INDEX.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/DOCUMENT_INDEX.md)
- [docs/04_TECHNICAL_PLANNING/Backlog/DEVELOPMENT_BACKLOG.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Backlog/DEVELOPMENT_BACKLOG.md)
- [docs/10_TICKETS/TODAY-007_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/TODAY-007_MANIFEST.md)
- [docs/06_REVIEWS/Import/TODAY-007_DUPLICATE_DASHBOARD_REQUEST_RECOVERY.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/TODAY-007_DUPLICATE_DASHBOARD_REQUEST_RECOVERY.md)
- [docs/06_REVIEWS/Import/TODAY-008_PO_DATA_RECONCILIATION_AND_LEADERSHIP_VIEW.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/TODAY-008_PO_DATA_RECONCILIATION_AND_LEADERSHIP_VIEW.md)
- [docs/06_REVIEWS/Import/TODAY-008_PO_ACCEPTANCE_CHECKLIST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/TODAY-008_PO_ACCEPTANCE_CHECKLIST.md)

## 5. Business Context

- The Product Owner needs one clear path to confirm that imported operational data reaches the leadership dashboard correctly.
- TODAY-001 through TODAY-007 established import availability, dashboard runtime data, accepted charts, canonical BCVH context, and the executive dashboard layout.
- TODAY-008 is the PO-facing reconciliation layer for the import and dashboard chain.

## 6. Technical Context

- Relevant routes: `/import`, `/f13/dashboard`.
- Relevant module areas: Data Import Center and Operation Dashboard.
- The implementation must use existing approved runtime routes and contracts unless a required reconciliation gap is documented and fixed within scope.
- The ticket may add reconciliation-facing evidence, UI affordances, checks, or documentation needed for PO validation, but it must not invent business formulas or modify frozen SSOT.

## 7. In Scope

- Validate that imported daily records can be reconciled with dashboard leadership charts.
- Provide or improve the visible PO validation path across `/import` and `/f13/dashboard`.
- Confirm the accepted dashboard surfaces remain visible during reconciliation.
- Confirm canonical BCVH and aggregate contexts remain usable during reconciliation.
- Record technical, runtime, and PO handoff evidence for the import-to-dashboard chain.
- Add focused tests for reconciliation behavior or guards introduced by this ticket.

## 8. Out of Scope

- Broad dashboard widget audit.
- Chart-meaning redesign.
- Color-consistency audit.
- General executive layout cleanup beyond reconciliation needs.
- KPI formula changes.
- SSOT changes.
- BCVH canonical mapping changes.
- API contract changes unless a reconciliation defect requires a targeted correction.
- Database schema changes.
- Replacing accepted 30-day or 7-day chart behavior.
- Restoring `Xếp hạng` as an Executive Summary KPI.
- Restoring the `Đạt / Không đạt` selector.
- Any TODAY-009 or non-authorized future scope.

## 9. UI Behavior That Must Remain Unchanged

- Import screen remains available at `/import`.
- Operation Dashboard remains available at `/f13/dashboard`.
- Accepted dashboard charts and surfaces from TODAY-006 and TODAY-007 remain mounted unless a reconciliation-specific issue is documented and corrected.
- The six canonical BCVH codes plus `Tất cả BCVH` remain the dashboard BCVH selection set.
- The canonical `ma_bcvh` URL context remains preserved.
- Missing-date null semantics remain preserved.
- Vietnamese business labels remain preserved unless a reconciliation-specific wording fix is explicitly documented.

## 10. Technical Validation Requirements

- Run focused automated tests for any changed frontend/backend logic.
- Run lint and build where applicable.
- Validate import-to-dashboard runtime data path through direct API checks and targeted browser/runtime validation where needed.
- Verify no duplicate identical dashboard requests are introduced.
- Verify no accepted TODAY-003 through TODAY-007 dashboard behavior regresses.
- Keep browser automation targeted; it remains technical evidence only and does not replace PO review.

## 11. Documentation Requirements

- Update this manifest status when implementation reaches technical completion.
- Create or update a TODAY-008 review evidence document.
- Create or update a concise TODAY-008 PO acceptance checklist.
- Update `PROJECT_SNAPSHOT.md` when the ticket advances or closes.
- Keep `DOCUMENT_INDEX.md` aligned with any new TODAY-008 documents.
- Update PO findings records only if a PO finding is created or closed.

## 12. PO UI Check

- PO UI Check Required: `Yes`
- Codex stops at `READY FOR PO CHECK`.
- Product Owner owns visible UI acceptance and final PO PASS / WARNING / FAIL.
- Codex must not self-award PO PASS.
- Provide a concise manual PO checklist covering `/import`, `/f13/dashboard`, reconciliation context, actions, expected result, and PASS / WARNING / FAIL criteria.

## 12.1 Technical Handoff Evidence

- Reconciliation evidence: `docs/06_REVIEWS/Import/TODAY-008_PO_DATA_RECONCILIATION_AND_LEADERSHIP_VIEW.md`
- PO acceptance checklist: `docs/06_REVIEWS/Import/TODAY-008_PO_ACCEPTANCE_CHECKLIST.md`
- Deterministic import scenario:
  - Import log ID: `118`
  - File: `F1.3-2026.07.15.xlsx`
  - Imported data date: `2026-07-15`
  - Aggregate context: `ma_bcvh=all`
  - Canonical BCVH spot-check: `535790`
- Source records were verified through direct database checks.
- Dashboard data was verified through direct API checks and targeted browser/runtime validation.
- No duplicate identical dashboard requests were observed in the targeted runtime trace.
- Accepted TODAY-003 through TODAY-007 dashboard surfaces remained mounted.
- Final state: `COMPLETED`.
- PO closure authority: explicit Product Owner `PO PASS` decision on `2026-07-18`.

## 13. Authority Guard

- Implementation authority comes from `docs/04_TECHNICAL_PLANNING/Backlog/DEVELOPMENT_BACKLOG.md` lines defining TODAY-008 as PO data reconciliation and leadership view.
- The proposed full-dashboard widget, chart-meaning, color-consistency, and layout audit is not authorized by this manifest unless first recorded in an appropriate authoritative roadmap, ticket, or manifest update.
- If reconciliation requires a business-rule decision not present in the repository, stop and record the blocker instead of guessing.

## 14. Next Ticket

- Next ticket ID: `TICKET-0101`
- Next ticket name: `Login API and Session`
- Handoff note: the next roadmap item requires a separate governance readiness review before activation.
