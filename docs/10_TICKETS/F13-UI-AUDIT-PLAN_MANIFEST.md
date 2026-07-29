# F13-UI-AUDIT-PLAN Manifest

- Ticket ID: `F13-UI-AUDIT-PLAN`
- Ticket Name: `F1.3 UI Audit and Standardization Planning`
- Phase: `F1.3 UI Planning`
- Current state: `READY FOR PO UI/UX PLANNING`
- Technical Status: `PLANNING SCOPE NOT YET DISPATCHED`
- Runtime Status: `NOT RUN - PLANNING ONLY`
- PO UI Check Required: `No - planning review only`
- PO Product Status: `NOT READY`
- Activation authority: `Product Owner authorized Antigravity UI audit planning after QIS-LAN-DEPLOY-001 PO PASS closure`
- Handoff date: `2026-07-29`
- Coordination owner: `ChatGPT with Product Owner`
- Primary executor: `Antigravity`
- Antigravity executor state: `NOT YET DISPATCHED`
- Execution boundary: `DISCUSSION AND PLANNING ONLY / NO IMPLEMENTATION`

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

## Current Workflow State

Required incremental workflow:

1. Product Owner opens a fresh ChatGPT coordination chat.
2. ChatGPT and Product Owner define the Operation Dashboard audit scope.
3. Only after Product Owner agreement, ChatGPT writes one bounded Antigravity prompt.
4. Antigravity audits Operation Dashboard and submits a plan only.
5. ChatGPT reviews that plan as CTO, data-analysis specialist, and postal-quality specialist.
6. Product Owner approves or requests changes.
7. Complete one UI area before activating the next.

Current authorized focus only:

- `Operation Dashboard`

Future sequence, not currently authorized:

- `BCVH Ranking`
- `Route Ranking`
- `shared navigation/frame/filters`
- `Login and system states`
- `final consistency review`

## Objective

Antigravity will inspect the current completed F1.3 product and prepare a Product Owner review plan to standardize and improve the UI, but only after ChatGPT coordination and Product Owner finish the bounded Operation Dashboard scope discussion.

The first bounded audit scope includes only:

- Operation Dashboard
- dashboard filters
- dashboard cards
- dashboard tables
- dashboard charts
- dashboard loading states
- dashboard empty-data states
- dashboard warning and error states
- dashboard desktop usage
- dashboard leadership presentation and large-screen readability
- dashboard viewer experience

## In Scope

- Current UI inventory for Operation Dashboard.
- Findings for the Operation Dashboard scope with severity and user impact.
- Layout, spacing, typography, color, table-readability, and chart-readability findings for Operation Dashboard.
- Leadership-presentation suitability assessment for Operation Dashboard.
- Proposed visual design principles and standardized component/layout rules beginning with Operation Dashboard.
- Operation Dashboard remediation plan.
- Implementation priority and future sequence proposal after Operation Dashboard planning review.
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
- Dispatching Antigravity before ChatGPT coordination and Product Owner agree the bounded Operation Dashboard scope.

## Locked Boundaries

- Preserve accepted F1.3 screens and runtime behavior.
- Preserve Dashboard BCVH compact overview contract.
- Preserve `/f13/ranking/bcvh` accepted detailed ranking contract.
- Preserve Route Ranking accepted runtime contract and internal-route audit outcome.
- Preserve viewer/admin permissions and LAN deployment contract exactly as accepted.
- Preserve current frontend port `5178` and backend port `5050`.
- Preserve current formulas, thresholds, route exclusions, and Import behavior.

## Required Antigravity Deliverables

1. current UI inventory for Operation Dashboard
2. findings by screen within the bounded Operation Dashboard scope
3. severity and user impact
4. inconsistent layout, spacing, typography and color findings
5. table readability findings
6. chart readability findings
7. leadership-presentation suitability assessment
8. proposed visual design principles
9. standardized component and layout rules
10. Operation Dashboard remediation plan
11. implementation priority and future sequence
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

ChatGPT and Product Owner define the bounded Operation Dashboard audit scope in a fresh coordination chat. Antigravity prompt creation is authorized only after that agreement.

## Handoff

Status: `READY FOR PO UI/UX PLANNING`.

This ticket authorizes discussion and planning only. Antigravity is not yet dispatched. ChatGPT coordination must first align the Operation Dashboard scope with Product Owner, then write one bounded Antigravity prompt for plan-only audit work.
