# F13-UI-AUDIT-PLAN Manifest

- Ticket ID: `F13-UI-AUDIT-PLAN`
- Ticket Name: `F1.3 UI Audit and Standardization Planning`
- Phase: `F1.3 UI Planning`
- Current state: `READY FOR ANTIGRAVITY DISCOVERY`
- Technical Status: `PLANNING NOT STARTED`
- Runtime Status: `NOT RUN - PLANNING ONLY`
- PO UI Check Required: `No - planning review only`
- PO Product Status: `NOT READY`
- Activation authority: `Product Owner authorized Antigravity UI audit planning after QIS-LAN-DEPLOY-001 PO PASS closure`
- Handoff date: `2026-07-29`
- Primary executor: `Antigravity`
- Execution boundary: `PLAN REVIEW ONLY / NO IMPLEMENTATION`

## Fresh-Chat Onboarding Authority

Required onboarding chain:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. `docs/10_TICKETS/F13-UI-AUDIT-PLAN_MANIFEST.md`
5. Required Reading from this manifest

Required Reading:

- `docs/06_REVIEWS/UI/F13_UI_AUDIT_PLAN_CHECKPOINT_001.md`
- `docs/10_TICKETS/QIS-LAN-DEPLOY-001_MANIFEST.md`
- `docs/06_REVIEWS/Deployment/QIS_LAN_DEPLOY_001_CHECKPOINT_001.md`
- `docs/10_TICKETS/F13-BCVH-RANKING-REDESIGN-IMPL_MANIFEST.md`
- `docs/06_REVIEWS/BCVH/F13_BCVH_RANKING_REDESIGN_IMPL_WAVE2_CHECKPOINT_001.md`
- `docs/10_TICKETS/F13-INTERNAL-ROUTE-AUDIT_MANIFEST.md`
- `docs/06_REVIEWS/Route/F13_INTERNAL_COUNTER_ROUTE_AUDIT.md`
- `docs/05_DEVELOPMENT/Implementation/deployment_infrastructure.md`
- `docs/04_TECHNICAL_PLANNING/Backlog/DEVELOPMENT_BACKLOG.md`

## Recently Closed Authority

`QIS-LAN-DEPLOY-001` is `COMPLETED / PO PASS / CLOSED`.

Accepted closure state:

- frontend LAN port: `5178`
- backend/API LAN port: `5050`
- normal LAN URL: `http://<server-ip>:5178`
- viewer username is configured locally as `ttvhhue`
- viewer authentication is operational
- viewer may access only completed F1.3 screens
- viewer remains blocked from System Administrator, Import, unfinished modules, and restricted APIs
- admin access remains unchanged
- viewer credential failure root cause was a malformed local password-hash value
- local `.env` was corrected without committing plaintext credentials or hashes
- accepted runtime remediation commit: `99c865e92b840a587dc9a889294c535fecc68816`

## Objective

Antigravity must inspect the current completed F1.3 product and prepare a Product Owner review plan to standardize and improve the UI.

The audit scope includes:

- Login
- global navigation and page frame
- Operation Dashboard
- BCVH Ranking
- Route Ranking
- filters
- cards
- tables
- charts
- loading states
- empty-data states
- warning and error states
- desktop usage
- leadership presentation and large-screen readability
- viewer experience

## In Scope

- Current UI inventory across the completed F1.3 surfaces.
- Findings by screen with severity and user impact.
- Layout, spacing, typography, color, table-readability, and chart-readability findings.
- Leadership-presentation suitability assessment.
- Proposed visual design principles and standardized component/layout rules.
- Screen-by-screen remediation plan.
- Implementation priority and sequence proposal.
- Product Owner acceptance checklist for later remediation.
- Risks, protected boundaries, and decisions requiring Product Owner approval.

## Out Of Scope

- Product-code or UI implementation.
- F1.3 formula, threshold, data, or calculation changes.
- Business-contract changes for Dashboard, BCVH Ranking, or Route Ranking.
- Viewer/admin permission changes.
- Port changes for `5178` or `5050`.
- Import remediation reopening.
- Implementation of `F1.1`, `F1.2`, `F4.1`, Shipment, Pareto, Evidence, or Message modules.
- Public-Internet exposure.
- Writing a Codex implementation prompt before Product Owner approves the plan.

## Locked Boundaries

- Preserve accepted F1.3 screens and runtime behavior.
- Preserve Dashboard BCVH compact overview contract.
- Preserve `/f13/ranking/bcvh` accepted detailed ranking contract.
- Preserve Route Ranking accepted runtime contract and internal-route audit outcome.
- Preserve viewer/admin permissions and LAN deployment contract exactly as accepted.
- Preserve current frontend port `5178` and backend port `5050`.
- Preserve current formulas, thresholds, route exclusions, and Import behavior.

## Required Antigravity Deliverables

1. current UI inventory
2. findings by screen
3. severity and user impact
4. inconsistent layout, spacing, typography and color findings
5. table readability findings
6. chart readability findings
7. leadership-presentation suitability assessment
8. proposed visual design principles
9. standardized component and layout rules
10. screen-by-screen remediation plan
11. implementation priority and sequence
12. Product Owner acceptance checklist
13. risks and protected boundaries
14. decisions requiring Product Owner approval

## Documentation Requirements

- Create and maintain `docs/10_TICKETS/F13-UI-AUDIT-PLAN_MANIFEST.md`.
- Create and maintain `docs/06_REVIEWS/UI/F13_UI_AUDIT_PLAN_CHECKPOINT_001.md`.
- Update live onboarding/governance documents when the planning state advances.
- Keep `DOCUMENT_INDEX.md`, `PROJECT_SNAPSHOT.md`, `README_AI.md`, `PROJECT_HANDOVER.md`, `PROJECT_CONTEXT.md`, `PROJECT_STATUS.md`, and `PROJECT_PROGRESS.md` aligned with the active planning state.

## Validation

- `git diff --check`
- Confirm no product code changed.
- Confirm no `.env`, password, or password hash is tracked or committed.
- Remote verification of pushed documentation-only commit and onboarding Blob URLs.
- Fresh onboarding simulation from `README_AI.md`.

## Next Action

Antigravity audits the current UI and submits a standardization plan for Product Owner review.

## Handoff

Status: `READY FOR ANTIGRAVITY DISCOVERY`.

This ticket authorizes planning review only. Antigravity must audit the current completed F1.3 product, produce the planning deliverables above, preserve all locked boundaries, and stop without implementing UI code.
