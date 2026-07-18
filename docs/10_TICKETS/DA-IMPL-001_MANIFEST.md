# DA-IMPL-001 Manifest

## 1. Ticket Information

- Ticket ID: `DA-IMPL-001`
- Ticket Name: `Dashboard Language and Semantic Foundation`
- Phase: `Smart Leadership Dashboard Implementation`
- Owner: `Codex`
- Governance Version: `V2 Active`

## 2. Current Status

- Current state: `COMPLETED`
- Technical Status: `PASS`
- Runtime Status: `PASS`
- PO UI Check Required: `Yes`
- PO Product Status: `PO PASS`
- Review Status: `PO PASS`
- Activation date: `2026-07-18`
- Technical handoff date: `2026-07-18`
- PO closure date: `2026-07-18`

## 3. Objective

Establish the Dashboard language, semantic color, legend, and status foundation for the approved consolidated smart Dashboard without restructuring the layout.

## 4. Required Reading

- [README_AI.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/README_AI.md)
- [docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)
- [docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md)
- [docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md)
- [docs/04_TECHNICAL_PLANNING/Dashboard/SMART_DASHBOARD_IMPLEMENTATION_PLAN.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Dashboard/SMART_DASHBOARD_IMPLEMENTATION_PLAN.md)
- [docs/04_TECHNICAL_PLANNING/Dashboard/DA_IMPLEMENTATION_TICKET_REGISTER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Dashboard/DA_IMPLEMENTATION_TICKET_REGISTER.md)
- [docs/10_TICKETS/DASHBOARD-AUDIT-001_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/DASHBOARD-AUDIT-001_MANIFEST.md)
- [docs/06_REVIEWS/Dashboard/DASHBOARD-AUDIT-001_LEADERSHIP_DASHBOARD_AUDIT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Dashboard/DASHBOARD-AUDIT-001_LEADERSHIP_DASHBOARD_AUDIT.md)
- [frontend/src/features/dashboard/DashboardPage.jsx](https://github.com/tntTan2292/TTVH-DHCL/blob/main/frontend/src/features/dashboard/DashboardPage.jsx)

## 5. In Scope

- PO-facing labels and Vietnamese business terminology.
- Removal of shell, placeholder, or technical wording from visible Dashboard surfaces.
- Semantic color tokens and status vocabulary aligned to the approved color standard.
- Shared legend and target/reference wording foundation.
- Removal of clearly unauthorized placeholder widgets where safe and not layout-restructuring.

## 6. Out of Scope

- Dashboard layout restructuring.
- KPI formula changes.
- API contract changes.
- Database schema changes.
- Canonical BCVH mapping changes.
- New business thresholds, causes, owners, deadlines, statuses, roles, permissions, or calculations.
- Implementation of `DA-IMPL-002` or later surfaces.

## 7. Preservation Requirements

Preserve KPI formulas, SSOT, API contracts, database schema, canonical BCVH mappings, missing-date and missing-data semantics, accepted import reconciliation, login/session behavior, URL filter context, and accepted Dashboard runtime data.

## 8. Validation Requirements

- Run focused tests/lint/build checks applicable to changed frontend files.
- Run targeted runtime validation for `/f13/dashboard` if visible UI code changes.
- Run `git diff --check`.
- Verify no unrelated product or backend behavior changed.
- Update review/checklist documentation for `READY FOR PO CHECK`.

## 9. Completion Requirements

On completion, update this manifest, create/update PO review evidence, update `PROJECT_SNAPSHOT.md`, keep `DA-IMPL-002` as the next ticket, commit using One Ticket = One Commit, push to `origin/main`, verify remote commit, and run fresh onboarding from `README_AI.md`.

## 9.1. Completion Evidence

- Implementation review: [docs/06_REVIEWS/Dashboard/DA-IMPL-001_DASHBOARD_LANGUAGE_AND_SEMANTIC_FOUNDATION.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Dashboard/DA-IMPL-001_DASHBOARD_LANGUAGE_AND_SEMANTIC_FOUNDATION.md)
- PO checklist: [docs/06_REVIEWS/Dashboard/DA-IMPL-001_PO_ACCEPTANCE_CHECKLIST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Dashboard/DA-IMPL-001_PO_ACCEPTANCE_CHECKLIST.md)
- Product Owner decision: `PO PASS`
- PO warning closure: visible `runtime` wording removed from Dashboard business descriptions; `Tỷ lệ không đạt` KPI card changed from warning/yellow tone to danger/red tone and runtime-confirmed.

## 10. Next Ticket

- Next ticket ID: `DA-IMPL-002`
- Next ticket name: `Unified Command Summary`
- Next manifest: [docs/10_TICKETS/DA-IMPL-002_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/DA-IMPL-002_MANIFEST.md)

## 11. Deferred Ticket

`TICKET-0102` remains deferred and inactive during the Dashboard implementation sequence unless Product Owner later changes priority.
