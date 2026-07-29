# F13-UI-AUDIT-PLAN Manifest

- Ticket ID: `F13-UI-AUDIT-PLAN`
- Ticket Name: `F1.3 UI Audit and Standardization Planning`
- Phase: `F1.3 UI Planning & Execution`
- Current state: `PHASE 1 PO PASS / READY FOR PHASE 2 DISPATCH`
- Technical Status: `PHASE 1 IMPLEMENTED (COMMIT 6ea7819) / PHASE 2 NOT YET DISPATCHED`
- Runtime Status: `PHASE 1 VERIFIED PASS`
- PO UI Check Required: `Yes - Phase 1 PO PASS recorded`
- PO Product Status: `PHASE 1 PO PASS`
- Activation authority: `Product Owner recorded: PO PASS PHASE 1 – OPERATION DASHBOARD UI/UX.`
- Handoff date: `2026-07-29`
- Coordination owner: `ChatGPT with Product Owner`
- Primary executor: `Antigravity`
- Antigravity executor state: `PHASE 1 COMPLETED / AWAITING PHASE 2 DISPATCH`
- Execution boundary: `PHASE 1 PO PASS / DO NOT DISPATCH PHASE 2 UNTIL CHATGPT COORDINATION ISSUES A SEPARATELY BOUNDED PROMPT`

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

Approved Operation Dashboard Plan & Execution Workflow:

1. Product Owner recorded: `PO PASS PHASE 1 – OPERATION DASHBOARD UI/UX.` (Commit `6ea7819`).
2. Current ticket `F13-UI-AUDIT-PLAN` checkpoint updated to record PO decision and protected shared component / table isolation findings.
3. Phase 2, Phase 3, and Phase 4 implementation are NOT dispatched in this step.
4. ChatGPT coordination will issue a separately bounded prompt when dispatching Phase 2 implementation (Compact 9-Column BCVH Table Visual Polish).
5. Complete Phase 2 before activating Phase 3 or Phase 4.

Approved focus:

- `Operation Dashboard (/f13/dashboard)`

Future sequence, not currently authorized:

- `BCVH Ranking`
- `Route Ranking`
- `shared navigation/frame/filters`
- `Login and system states`
- `final consistency review`

## Objective

Antigravity has inspected Operation Dashboard, submitted a PO-approved UI/UX plan, and implemented Phase 1 (`GlobalFilterBar` & `UnifiedCommandSummary`). Product Owner recorded `PO PASS PHASE 1 – OPERATION DASHBOARD UI/UX.`

The Phase 1 scope includes:

- Operation Dashboard filter bar (`GlobalFilterBar`)
- Executive command summary cards & briefing banner (`UnifiedCommandSummary`)
- CRM 3.0-inspired surface depth, border, shadow, and tag chip styling
- Restrained geometry-matched pulse skeletons for Phase 1 loading state
- Preserved compact 9-column BCVH table contract
- Consumed business-semantic colors, KPI labels, thresholds, formulas, and target lines from authoritative SSOT
- Protected findings for shared component validation and table presentation isolation

## Protected Findings Recorded

1. **Shared Visual Components Policy**: Phase 1 styling on `GlobalFilterBar` appearing on BCVH Ranking is accepted for the current visual treatment. Any future change to a shared component must validate both `/f13/dashboard` and `/f13/ranking/bcvh`. A future BCVH Ranking ticket must not assume changing shared styling is automatically authorized for Dashboard.
2. **Table Presentation Isolation Policy**: Operation Dashboard continues rendering compact 9-column `BcvhOperationTable`. BCVH Ranking continues rendering detailed `UnifiedBcvhAnalysisTable`. Do not reconnect or replace either table unless Product Owner explicitly approves a new contract. Future BCVH Ranking remediation must verify Dashboard table structure and behavior remain unchanged.
3. **Current Phase Status**: Phase 1: `PO PASS`. Phase 2, 3, 4: not yet dispatched. No additional UI code implemented in this step.

## Out Of Scope

- Implementing Phase 2, Phase 3, or Phase 4 in this step.
- F1.3 formula, threshold, data, or calculation changes.
- Business-contract changes for Dashboard, BCVH Ranking, or Route Ranking.
- Viewer/admin permission changes.
- Port changes for `5178` or `5050`.
- Import remediation reopening.
- Implementation of `F1.1`, `F1.2`, `F4.1`, Shipment, Pareto, Evidence, or Message modules.
- Public-Internet exposure.
- Dispatching Phase 2 UI implementation before ChatGPT coordination issues a separately bounded prompt.

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
7. Phase 1 implementation & PO PASS evidence
8. Protected findings for shared component validation and table presentation isolation

## Documentation Requirements

- Maintain `docs/10_TICKETS/F13-UI-AUDIT-PLAN_MANIFEST.md`.
- Maintain `docs/06_REVIEWS/UI/F13_UI_AUDIT_PLAN_CHECKPOINT_001.md`.
- Update live onboarding/governance documents when the planning state advances.
- Keep `DOCUMENT_INDEX.md`, `PROJECT_SNAPSHOT.md`, `README_AI.md`, `PROJECT_HANDOVER.md`, `PROJECT_CONTEXT.md`, `PROJECT_STATUS.md`, and `PROJECT_PROGRESS.md` aligned with the active planning state.

## Validation

- `git diff --check`
- Confirm no product code changed in this step.
- Confirm no `.env`, password, or password hash is tracked or committed.
- Remote verification of pushed documentation commit and onboarding Blob URLs.
- Fresh onboarding simulation from `README_AI.md`.

## Next Action

Product Owner recorded `PO PASS PHASE 1 – OPERATION DASHBOARD UI/UX.` Next step is for ChatGPT coordination to write a separately bounded prompt for Phase 2 implementation (Compact 9-Column BCVH Table Visual Polish). UI implementation for Phase 2 must not be dispatched until that prompt is issued.

## Handoff

Status: `PHASE 1 PO PASS / READY FOR PHASE 2 DISPATCH`.

Product Owner awarded PO PASS to Phase 1. Phase 2 implementation is not started until ChatGPT coordination issues a separately bounded prompt.
