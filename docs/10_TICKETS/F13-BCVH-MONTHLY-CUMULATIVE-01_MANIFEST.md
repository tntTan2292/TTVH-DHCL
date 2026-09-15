# F13-BCVH-MONTHLY-CUMULATIVE-01 Manifest

Status: `DISCOVERY / READ-ONLY AUDIT (2026-09-15)`. Activated for discovery only — no design, no implementation, no product code, database, schema, or business-rule change authorized yet.

## 1. Ticket Information

- Ticket ID: `F13-BCVH-MONTHLY-CUMULATIVE-01`
- Ticket Name: `F1.3 — Lũy kế tháng hiện tại trên Operation Dashboard và BCVH Ranking`
- Phase: `Discovery / Read-Only Audit`
- Owner: `Claude Code (Sonnet)` — governance activation only.
- Next Executor: `Antigravity (Gemini)` — performs the actual discovery/read-only audit.
- Governance Version: `V2 Active`
- Activation authority: Product Owner decision received in chat, 2026-09-15: "Tạm dừng F4.1 và chuyển ưu tiên khẩn sang nâng cấp F1.3", naming this ticket by its exact scope (below) and directing it be opened at `DISCOVERY / READ-ONLY AUDIT` with `Antigravity (Gemini)` as next executor.
- Branch: `codex/da-impl-006`
- Baseline commit: `19b0021`
- Activation date: `2026-09-15`

## 2. Objective

Audit — read-only, no code change — how to add a "Lũy kế tháng hiện tại" (current-month cumulative) view to the Operation Dashboard and to BCVH Ranking, showing the aggregate across **all** BCVH (not per-unit only), and reconciled against the Product Owner's own operating Excel file (chỉ đạo điều hành). The addition must build on the existing Dashboard/BCVH Ranking features, not replace or rebuild them, and must not change the F1.3 KPI or its SSOT.

## 3. Required Reading

- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/06_REVIEWS/Shared/F13-BCVH-MONTHLY-CUMULATIVE-01_CHECKPOINT_001.md` (this ticket's activation record)
- `docs/07_REFERENCE/Domains/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/` — the F1.3 SSOT package (`data_blueprint.md`, `measurement.md`, `business_rules.md`, `acceptance_criteria.md` in particular). The KPI/SSOT defined here must not change.
- `frontend/src/features/dashboard/DashboardPage.jsx` and its `components/` (Operation Dashboard) — the existing screen this ticket adds to.
- `frontend/src/features/ranking/BcvhRankingPage.jsx` — the existing BCVH Ranking screen this ticket adds to.
- `backend/src/controllers/DashboardController.js`, `backend/src/services/F13DashboardService.js`, `backend/src/services/bcvhOverviewService.js` — the existing backend endpoints/services this ticket's audit must map against.

## 4. Business Context

- Business problem: Operation Dashboard and BCVH Ranking currently show KPI over a selected date range, but the Product Owner needs a distinct, always-current "month-to-date cumulative" view — reconciled against the Excel file they already use to run operations day to day — visible for the whole BCVH set at once, not filtered to one unit.
- This is explicitly an **addition** to the existing screens/APIs, not a rebuild: the existing date-range KPI, per-BCVH breakdown, and BCVH Ranking table/sort/pagination must remain unchanged in behavior.
- The F1.3 KPI definition and its SSOT (`danh_gia_2026`, `data_blueprint.md`, `measurement.md`) must not change — this ticket is a new presentation of existing data, not a new metric.

## 5. Scope

In scope for discovery only:

- Read-only audit of how "current month" and "cumulative across all BCVH" would be computed from the existing `fact_f13` data and existing service layer (`F13DashboardService`, `bcvhOverviewService`), without altering either.
- Read-only comparison against the Product Owner's operating Excel file, once supplied — this ticket must not guess its structure or figures; request the file from the Product Owner if it is not already in the workspace.
- Read-only survey of where a "Lũy kế tháng hiện tại" view fits into the existing Operation Dashboard and BCVH Ranking UI without disrupting either screen's current layout/behavior.
- Producing a discovery report and, if warranted, a data-contract/UI proposal for a later, separately-authorized design/implementation phase.

Explicitly out of scope for this activation:

- Any product code, database, schema, or API change.
- Any change to the F1.3 KPI definition, `danh_gia_2026`, or any frozen SSOT document.
- Any change to F4.1 (`F41-DASHBOARD-MINIMUM-01` is separately `PAUSED BY PO PRIORITY` and unrelated to this ticket).
- `F13-ROUTE-POSTMAN-IDENTITY-01` (separate, independent ticket — not merged into this one's scope).

## 6. Validation

Not applicable at this activation — no code changed. The discovery/audit phase (owned by the next executor, Antigravity) must itself stay read-only: no query that mutates data, no schema change, no server restart required beyond what is needed to read existing behavior.

## 7. Expected Output

- What this ticket must produce: a read-only discovery report — how "current-month cumulative, all-BCVH" would be computed against `fact_f13`/existing services, a reconciliation against the Product Owner's Excel file, and a proposed (not yet authorized) UI/data-contract addition to Operation Dashboard and BCVH Ranking.
- What must remain unchanged throughout discovery: all existing Dashboard/BCVH Ranking behavior, the F1.3 KPI/SSOT, the database, and F4.1.
- What must not be introduced: any inferred business rule, any guessed Excel structure, any implementation ahead of Product Owner approval of the discovery findings.

## 8. Next Step

Discovery/read-only audit to be performed by `Antigravity (Gemini)`. Findings return to the Product Owner for a design/implementation authorization decision — not self-activated by this ticket's opening.
