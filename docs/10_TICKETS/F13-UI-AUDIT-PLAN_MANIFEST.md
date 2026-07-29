# F13-UI-AUDIT-PLAN Manifest

- Ticket ID: `F13-UI-AUDIT-PLAN`
- Ticket Name: `F1.3 UI Audit and Standardization Planning`
- Phase: `F1.3 UI Planning`
- Current state: `PO APPROVED PLAN / READY FOR PHASED DISPATCH`
- Technical Status: `APPROVED PLAN - IMPLEMENTATION NOT YET DISPATCHED`
- Runtime Status: `NOT RUN - PLANNING ONLY`
- PO UI Check Required: `No - planning review approved`
- PO Product Status: `APPROVED PLAN`
- Activation authority: `Product Owner recorded: PO APPROVE UI/UX AUDIT AND STANDARDIZATION PLAN.`
- Handoff date: `2026-07-29`
- Coordination owner: `ChatGPT with Product Owner`
- Primary executor: `Antigravity`
- Antigravity executor state: `NOT YET DISPATCHED FOR IMPLEMENTATION`
- Execution boundary: `APPROVED PLAN ONLY / DO NOT DISPATCH IMPLEMENTATION UNTIL CHATGPT COORDINATION ISSUES A SEPARATELY BOUNDED PROMPT`

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

Approved Operation Dashboard Plan Workflow:

1. Product Owner recorded: `PO APPROVE UI/UX AUDIT AND STANDARDIZATION PLAN.`
2. Current ticket `F13-UI-AUDIT-PLAN` checkpoint updated to record PO decision.
3. UI implementation is NOT started and implementation phases are NOT dispatched in this step.
4. ChatGPT coordination will issue a separately bounded prompt when dispatching the first implementation phase (Phase 1: Filter Bar & Executive Command Belt).
5. Complete one implementation phase before activating the next.

Approved focus:

- `Operation Dashboard (/f13/dashboard)`

Future sequence, not currently authorized:

- `BCVH Ranking`
- `Route Ranking`
- `shared navigation/frame/filters`
- `Login and system states`
- `final consistency review`

## Objective

Antigravity has inspected the current completed F1.3 product and submitted a Product Owner UI/UX improvement plan for Operation Dashboard. Product Owner has recorded `PO APPROVE UI/UX AUDIT AND STANDARDIZATION PLAN.`

The approved audit scope includes:

- Operation Dashboard
- dashboard filters
- dashboard cards
- dashboard tables (compact 9-column BCVH overview table)
- dashboard charts
- dashboard loading states (structural pulse skeletons)
- dashboard empty-data states
- dashboard warning and error states
- dashboard desktop usage
- dashboard leadership presentation and large-screen readability
- dashboard viewer experience

## In Scope

- Current UI inventory for Operation Dashboard.
- Findings for the Operation Dashboard scope with severity and user impact.
- CRM 3.0 visual inspiration for interface surfaces, visual depth, borders, shadows, typography, controls, and feedback.
- Operation Dashboard 4-phase remediation plan with phase-specific PO acceptance checklists.
- Preserved compact 9-column BCVH table contract.
- Consumed business-semantic colors, KPI labels, thresholds, formulas, and target lines from authoritative SSOT.
- Handoff directive for phased implementation prompt generation by ChatGPT coordination.

## Out Of Scope

- Product-code or UI implementation in this ticket.
- F1.3 formula, threshold, data, or calculation changes.
- Business-contract changes for Dashboard, BCVH Ranking, or Route Ranking.
- Viewer/admin permission changes.
- Port changes for `5178` or `5050`.
- Import remediation reopening.
- Implementation of `F1.1`, `F1.2`, `F4.1`, Shipment, Pareto, Evidence, or Message modules.
- Public-Internet exposure.
- Dispatching UI implementation before ChatGPT coordination issues a separately bounded prompt.

## Locked Boundaries

- Preserve accepted F1.3 screens and runtime behavior.
- Preserve Dashboard BCVH compact 9-column overview contract.
- Preserve `/f13/ranking/bcvh` accepted detailed ranking contract.
- Preserve Route Ranking accepted runtime contract and internal-route audit outcome.
- Preserve viewer/admin permissions and LAN deployment contract exactly as accepted.
- Preserve current frontend port `5178` and backend port `5050`.
- Preserve current formulas, thresholds, route exclusions, and Import behavior.

## Required Antigravity Deliverables

1. current UI inventory for Operation Dashboard
2. findings by screen within the bounded Operation Dashboard scope
3. severity and user impact
4. CRM 3.0-inspired visual design principles for UI surfaces and controls
5. SSOT consumption rules for business-semantic colors and thresholds
6. Operation Dashboard 4-phase remediation plan
7. Phase-specific Product Owner acceptance checklists
8. risks, protected boundaries, and recorded PO approval decision

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

Product Owner recorded `PO APPROVE UI/UX AUDIT AND STANDARDIZATION PLAN.` Next step is for ChatGPT coordination to write a separately bounded prompt for Phase 1 implementation (Filter Bar & Executive Command Belt). UI implementation must not be dispatched until that prompt is issued.

## Handoff

Status: `PO APPROVED PLAN / READY FOR PHASED DISPATCH`.

Product Owner approved the Operation Dashboard UI/UX plan. UI implementation is not started and implementation phases are not dispatched until ChatGPT coordination issues a separately bounded prompt.
