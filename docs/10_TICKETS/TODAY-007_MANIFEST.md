# TODAY-007 Manifest

## 1. Ticket Information

- Ticket ID: `TODAY-007`
- Ticket Name: `Dashboard Executive Layout Cleanup`
- Phase: `Leadership Dashboard Delivery`
- Owner: `Codex`
- Governance Version: `V2 Active`

## 2. Objective

- Clean up the executive dashboard layout while preserving the accepted analysis surfaces, scoped KPI behavior, BCVH filtering, and existing chart and table contracts.

## 3. Current Status

- Current state: `READY FOR PO CHECK`
- PO UI Check Required: `Yes`
- PO Product Status: `READY FOR PO CHECK`
- Technical Status: `PASS`
- Runtime Status: `PASS`
- Review status: `READY FOR PO CHECK`
- Handoff date: `2026-07-17`

## 4. Business Context

- This ticket is layout cleanup only.
- The active dashboard behavior already accepted for TODAY-006 and the prior recovery tickets remains the baseline.
- The layout update must not change business formulas, data contracts, or filter semantics.

## 5. Technical Context

- Layout adjustments must preserve the current runtime routes and the shared dashboard request patterns.
- Codex owns technical validation.
- Product Owner owns visible UI acceptance.

## 6. Required Reading

- [README_AI.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/README_AI.md)
- [docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)
- [docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md)
- [docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md)
- [docs/01_GOVERNANCE/DOCUMENT_INDEX.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/DOCUMENT_INDEX.md)

## 7. In Scope

- Executive layout cleanup on the dashboard.
- Visual spacing and arrangement improvements that do not alter product behavior.
- Clearer presentation where the existing dashboard already renders approved data.

## 8. Out of Scope

- KPI formulas.
- SSOT updates.
- BCVH canonical mapping.
- API contracts.
- database schema changes.
- accepted 30-day combo chart behavior.
- accepted 7-day comparison chart behavior.
- scoped KPI behavior.
- filter semantics.
- Vietnamese business labels unless specifically authorized.
- TODAY-008 scope.

## 9. UI Behavior That Must Remain Unchanged

- `Sản lượng và chất lượng phát – 30 ngày`
- `So sánh cùng kỳ 7 ngày`
- the canonical BCVH options
- the canonical `ma_bcvh` URL context
- missing-date null semantics
- the absence of the `Đạt / Không đạt` selector

## 10. Technical Validation Requirements

- Verify the layout renders without breaking the restored dashboard surfaces.
- Verify the accepted charts, tables, and filter state remain mounted.
- Verify no duplicate identical requests are introduced.
- Keep browser automation targeted and non-default.

## 10.1 Technical Validation Evidence

- Targeted dashboard regression tests: `PASS`.
- Frontend lint: `PASS` with existing warnings only.
- Frontend build: `PASS`.
- Authenticated Chromium validation against a production-equivalent preview build: `PASS`.
- Duplicate dashboard request recovery: `PASS`; every normalized `/api/f13/dashboard/*` request now occurs once per endpoint/context.
- Executive Summary remains a four-metric 2x2 layout.
- No visible Executive Summary `Xếp hạng` card or fake rank fallback remains.
- KPI cards, timeline, accepted 30-day chart, accepted 7-day comparison chart, tables, filters, and canonical `ma_bcvh` context remain mounted and functional.
- No new console or runtime errors were observed during targeted runtime validation.

Detailed evidence:

- [TODAY-007 duplicate dashboard request recovery review](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/TODAY-007_DUPLICATE_DASHBOARD_REQUEST_RECOVERY.md)
- [TODAY-007 PO acceptance checklist](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/TODAY-007_PO_ACCEPTANCE_CHECKLIST.md)

## 11. Documentation Requirements

- Update the manifest status when implementation is complete.
- Update the project snapshot when the ticket advances or closes.
- Keep the documentation index aligned with the active manifest.

## 12. PO UI Check

- PO UI Check Required: `Yes`
- Codex stops at `READY FOR PO CHECK`
- Provide a concise manual PO checklist for visible changes.
- Browser automation is not the default.
- Codex must not self-award PO PASS.
- TODAY-008 remains inactive until explicit governance activation.

## 13. Next Ticket

- Next ticket ID: `TODAY-008`
- Next ticket name: `PO Data Reconciliation and Leadership View`
