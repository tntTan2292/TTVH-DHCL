# UI-DATA-TABLE-READABILITY-01 Manifest

Status: `DISCOVERY / READ-ONLY AUDIT AUTHORIZED / URGENT (2026-09-15)`. Cross-cutting UI accessibility/readability ticket; no implementation is authorized yet.

## 1. Ticket Information

- Ticket ID: `UI-DATA-TABLE-READABILITY-01`
- Ticket Name: `UI — Tăng khả năng đọc các bảng số liệu điều hành`
- Phase: `Discovery / Read-Only Audit`
- Priority: `URGENT — leadership dissatisfaction`
- Next Executor: `Antigravity (Gemini)` audits the affected F1.3 tables in the current round and inventories other data tables separately.
- Governance Version: `V2 Active`
- Authorization: Product Owner instruction received in chat, 2026-09-15.
- Branch: `codex/da-impl-006`
- Baseline commit: `6293d60`

## 2. Product Owner Requirement

The current table text is too small to read on both phone and PC. Leadership is dissatisfied because operational figures are not readily visible.

The future design must:

1. Increase rendered table text to **at least 2× the current rendered size** for headers, primary figures, labels and critical comparison values.
2. Rebalance row height, padding, column width and table density so information remains readable.
3. Prevent text and figures from wrapping, overlapping, clipping or covering adjacent content.
4. Preserve all operational values and their meaning.
5. Work on both desktop and mobile.

The 2× requirement must be measured against the actual computed font sizes in the affected components, not assumed from class names.

## 3. Responsive Layout Constraint

At 2× font size, every existing column cannot be compressed into a phone viewport without harming readability. The audit and later design must prefer:

- Explicit minimum column widths.
- `white-space: nowrap` for headers and numeric cells where required.
- Horizontal scrolling on narrow viewports.
- A sticky first identifying column (for example, BCVH).
- Sticky header where useful.
- Clear grouping or controlled visibility of secondary columns.
- No automatic font shrinking to force the full table into one screen.
- No hidden operational field without a Product Owner-approved way to reveal it.

## 4. Initial Evidence Scope

Product Owner screenshots identify at least:

- BCVH Ranking — current-month cumulative table (`BcvhMtdSummaryBlock`).
- Operation Dashboard — “Bảng điều hành BCVH” and its shared table components.

The audit must inventory all data tables in the three current top-level modules and classify:

- Critical operational tables requiring the urgent minimum.
- Supporting/detail tables.
- Tables already meeting the standard.
- Shared components where one correction safely covers multiple screens.
- Tables requiring independent treatment to prevent regression.

## 5. Mandatory Read-Only Audit

The executor must provide:

1. Current computed font size, line height, row height, padding and column behavior for each affected table at representative desktop and phone widths.
2. Exact source component/style responsible for each rendered value.
3. A before/after target matrix, including minimum font sizes in px/rem after satisfying the 2× PO requirement.
4. Width calculations showing why columns fit, scroll or require controlled grouping.
5. Desktop and mobile wireframe/proposal with no wrapping or overlap.
6. Impact on sticky columns, expandable rows, tooltips, badges, progress bars and totals.
7. Accessibility checks for contrast, zoom and touch targets.
8. Exact files and regression tests likely to change.
9. A screenshot-validation plan at representative viewports before PO UI check.

## 6. Acceptance Gates for a Later Implementation

Implementation cannot be accepted unless:

- Every audited critical table meets the measured ≥2× rendered font-size target.
- No header, label or numerical value wraps, overlaps or clips at the locked test viewports.
- Desktop remains readable without excessive empty space.
- Mobile provides an obvious horizontal-scroll affordance and retains row identity through a sticky first column.
- Totals, KPI colors, comparison arrows, badges and progress bars remain semantically correct.
- Screenshot evidence is supplied for desktop and phone.
- Existing data/API/KPI behavior is unchanged.
- Product Owner performs the final UI check; no executor self-awards PO PASS.

## 7. Scope Boundaries

- This ticket changes presentation only if later implemented; it must not change KPI formulas, business data, API meaning, ranking logic or SSOT.
- It is separate from `F13-BCVH-MONTHLY-CUMULATIVE-01`; that ticket may reference this readability standard but must not absorb a repo-wide table refactor.
- It is separate from Import and User/RBAC.
- No code or stylesheet change is authorized during discovery.
