# F13-UI-AUDIT-PLAN Manifest

- Ticket ID: `F13-UI-AUDIT-PLAN`
- Ticket Name: `F1.3 UI Audit and Standardization Planning`
- Phase: `F1.3 UI Planning & Execution`
- Current state: `COMPLETED / PO PASS (PHASE 1-4) / CLOSED`
- Technical Status: `PHASE 1, 2, 3 & 4 IMPLEMENTED AND PO PASS (COMMITS 6ea7819, cbe5bc2, dd9cbf5, 32c10f5, 235b69d0, 32ccdb06, 525339c2, 77efbcde, cdb9eab2)`
- Runtime Status: `PHASE 1-4 VERIFIED PO PASS`
- PO UI Check Required: `Yes - Phase 1-4 PO PASS recorded`
- PO Product Status: `PHASE 1-4 PO PASS`
- Activation authority: `Product Owner recorded PO PASS PHASE 3 (Commit 32c10f5470bf1d3a530a767b42ab1948f7f3e61d) and, on 2026-08-03, PO PASS PHASE 4 - OPERATION DASHBOARD (latest accepted runtime implementation commit cdb9eab246415a3835210dd70329996e6ef6521c). Phase 4 spans the original Observation Group Viewport Optimization (235b69d0) plus follow-on layout/heatmap fixes (32ccdb06, 525339c2, 77efbcde, cdb9eab2). All phases are now PO PASS; ticket is closed.`
- Handoff date: `2026-07-29`
- Reactivation date: `2026-07-31`
- Closure date: `2026-08-03`
- Coordination owner: `ChatGPT with Product Owner`
- Primary executor: `Antigravity`
- Antigravity executor state: `PHASE 1-4 COMPLETED / PO PASS`
- Execution boundary: `PHASE 1-4 PO PASS / CLOSED / NO NEW IMPLEMENTATION AUTHORIZED / repository awaits Product Owner direction for any next scope`

## Closure Evidence

Product Owner runtime acceptance, `2026-08-03`, on the standard launcher path:

- Heatmap in `OperatingPatternTabsCard` displays the month-cumulative rank inside the `TB THÁNG` cell as intended.
- Backend was restarted to load the `timelineService.js` `monthly_ytd` computation fix (commit `cdb9eab2`).
- Product Owner confirmed the runtime result after restart.

This is `PO PASS PHASE 4 - OPERATION DASHBOARD`, closing the ticket at Phase 1-4 PO PASS.

## Fresh-Chat Onboarding Authority

This ticket is `CLOSED`. It is no longer part of the fresh onboarding chain; fresh onboarding now resolves through `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`, which currently has `Current Ticket = None` pending Product Owner direction.

Historical onboarding chain used while this ticket was active:

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

1. Product Owner recorded: `PO PASS PHASE 1 REMEDIATION` (Commit `cbe5bc2`), `PO PASS PHASE 2 – COMPACT BCVH TABLE UI/UX` (Commit `dd9cbf5`), `PO PASS PHASE 3 – CHARTS, OPERATING PATTERNS & ACTION CENTER UI/UX` (Commit `32c10f5`), and `PO PASS PHASE 4 - OPERATION DASHBOARD` (Commit `cdb9eab2`).
2. All four phases are `COMPLETED / PO PASS`. This ticket is `CLOSED`.
3. No new UI implementation is authorized. `Current Ticket = None` in `PROJECT_SNAPSHOT.md`; the repository awaits Product Owner direction for the next scope.
4. The future-sequence items below remain unauthorized and are not self-activated by this closure.

Approved focus:

- `Operation Dashboard (/f13/dashboard)`

Future sequence, not currently authorized:

- `BCVH Ranking`
- `Route Ranking`
- `shared navigation/frame/filters`
- `Login and system states`
- `final consistency review`

## Objective

Antigravity has inspected Operation Dashboard, submitted a PO-approved UI/UX plan, and implemented Phase 1, Phase 1 Remediation, Phase 2, Phase 3, and Phase 4. Product Owner recorded `PO PASS PHASE 3 – CHARTS, OPERATING PATTERNS & ACTION CENTER UI/UX` and, on `2026-08-03`, `PO PASS PHASE 4 - OPERATION DASHBOARD` (Commit `cdb9eab2`). All phases are `COMPLETED / PO PASS`; the ticket is closed.

The completed Phase 1, 2 & 3 scope includes:

- Operation Dashboard filter bar (`GlobalFilterBar`)
- Executive command summary cards & full-width briefing banner (`UnifiedCommandSummary`)
- Compact 9-column BCVH overview table (`BcvhOperationTable`)
- Integrated trend risk workspace (`IntegratedTrendRiskWorkspace`) with gradient volume bars, high-visibility reference line for target 90% (`QUALITY_TARGET_RATE`), floating dark glass tooltip, and D-1/D-7 leadership comparison cards
- Operating pattern tabs card (`OperatingPatternTabsCard`) with segmented pill-belt tabs, top-accented 5 monthly summary cards, high-contrast heatmap cells with `tabular-nums` typography, and floating detail tooltip
- Unified action center (`UnifiedActionCenter`) with Executive Bulletin visual alignment, solid P1/P2/P3 priority badges, left accent border cards, and CTA action buttons
- Preserved compact 9-column BCVH table contract and isolated BCVH Ranking table
- Consumed business-semantic colors, KPI labels, thresholds, formulas, and target lines from authoritative SSOT (the authoritative current dashboard target is 90%, consumed from `QUALITY_TARGET_RATE`)
- Recorded protected findings for shared components, table isolation, deferred Executive Insight content review, and deferred target-line semantic color normalization

## Protected & Deferred Findings Recorded

1. **Executive Insight Content Quality Review — DEFERRED / NOT AUTHORIZED under current UI/UX implementation phases**: Visual presentation and full-width card layout of *"Bản tin chỉ đạo điều hành"* is accepted. Generated wording, recommendations, prioritization, and business usefulness belong to content-generation/business-interpretation logic, NOT current UI/UX scope. Future Phase 4 work MUST preserve existing content-generation logic and MUST NOT rewrite, remove, or add generated conclusions.
2. **Target-line Semantic Color Normalization — MINOR / DEFERRED / NON-BLOCKING**: Current target-line color presentation does not affect data, formulas, APIs, permissions, target calculation, or business behavior. Local hard-coded color versus central semantic token inconsistency (`#DC2626` local vs `#7c3aed` token) is accepted for the current Phase 3 release. It may be normalized later during a bounded theme/semantic-token cleanup and MUST NOT block Phase 3 PO PASS or Phase 4 dispatch.
3. **Shared Visual Components Policy**: Phase 1 styling on `GlobalFilterBar` appearing on BCVH Ranking is accepted for the current visual treatment. Any future change to a shared component must validate both `/f13/dashboard` and `/f13/ranking/bcvh`. A future BCVH Ranking ticket must not assume changing shared styling is automatically authorized for Dashboard.
4. **Table Presentation Isolation Policy**: Operation Dashboard continues rendering compact 9-column `BcvhOperationTable`. BCVH Ranking continues rendering detailed `UnifiedBcvhAnalysisTable`. Do not reconnect or replace either table unless Product Owner explicitly approves a new contract. Future BCVH Ranking remediation must verify Dashboard table structure and behavior remain unchanged.
5. **Current Phase Status**:
   - Phase 1: `COMPLETED / PO PASS`
   - Phase 1 Remediation: `COMPLETED / PO PASS`
   - Phase 2: `COMPLETED / PO PASS`
   - Phase 3: `COMPLETED / PO PASS`
   - Phase 4: `COMPLETED / PO PASS` (Commits `235b69d0`, `32ccdb06`, `525339c2`, `77efbcde`, `cdb9eab2`)
   - Next state: `CLOSED / AWAITING PRODUCT OWNER DIRECTION`


## Out Of Scope

- Implementing Phase 3 or Phase 4 in this step.
- F1.3 formula, threshold, data, or calculation changes.
- Business-contract changes for Dashboard, BCVH Ranking, or Route Ranking.
- Viewer/admin permission changes.
- Port changes for `5178` or `5050`.
- Import remediation reopening.
- Implementation of `F1.1`, `F1.2`, `F4.1`, Shipment, Pareto, Evidence, or Message modules.
- Public-Internet exposure.
- Dispatching Phase 3 UI implementation before ChatGPT coordination issues a separately bounded prompt.

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
7. Phase 1 & 2 implementation & PO PASS evidence
8. Protected findings for shared components, table isolation, and deferred content review

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

Product Owner recorded `PO PASS` for Phase 1, Phase 1 Remediation, Phase 2, Phase 3, and, on `2026-08-03`, Phase 4. All Operation Dashboard phases are `PO PASS`. This ticket is `CLOSED`. `PROJECT_SNAPSHOT.md` now has `Current Ticket = None`. No ticket from the future sequence (`BCVH Ranking`, `Route Ranking`, shared navigation/filters, Login/system states, final consistency review) is self-activated by this closure; the repository awaits explicit Product Owner direction before any of them is opened.

## Handoff

Status: `COMPLETED / PO PASS (PHASE 1-4) / CLOSED`.

Product Owner awarded PO PASS to Phase 1, Phase 1 Remediation, Phase 2, Phase 3, and Phase 4 (`2026-08-03`, Commit `cdb9eab246415a3835210dd70329996e6ef6521c`). This ticket is closed. No new implementation is authorized. `Current Ticket = None`; the repository awaits Product Owner direction for the next scope.
