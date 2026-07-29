# F13 UI Audit Plan Checkpoint 001

- Ticket: `F13-UI-AUDIT-PLAN`
- Date: `2026-07-29`
- Status: `READY FOR PO UI/UX PLANNING`
- Scope: planning review only; no product-code, runtime, permission, port, formula, data, or Import changes.

## Product Owner Authorization Recorded

Product Owner authorized the next activity as a UI audit and standardization planning pass for the current completed F1.3 product.

This checkpoint does not authorize implementation. It exists only to define the ChatGPT/PO planning boundary, the first bounded Operation Dashboard focus, later Antigravity discovery conditions, and protected contracts for Product Owner review.

## Closed-Delivery Baseline

The immediately preceding delivery is closed:

- Ticket: `QIS-LAN-DEPLOY-001`
- Status: `COMPLETED / PO PASS / CLOSED`
- Accepted runtime remediation commit: `99c865e92b840a587dc9a889294c535fecc68816`

Accepted baseline facts:

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

## Current Authorized Focus

Current state:

- Current Ticket: `F13-UI-AUDIT-PLAN`
- Current State: `READY FOR PO UI/UX PLANNING`
- Coordination owner: `ChatGPT with Product Owner`
- Antigravity executor: `NOT YET DISPATCHED`
- Boundary: `DISCUSSION AND PLANNING ONLY / NO IMPLEMENTATION`
- First bounded focus: `Operation Dashboard only`

## Required Workflow

1. Product Owner opens a fresh ChatGPT coordination chat.
2. ChatGPT and Product Owner define the Operation Dashboard audit scope.
3. Only after Product Owner agreement, ChatGPT writes one bounded Antigravity prompt.
4. Antigravity audits Operation Dashboard and submits a plan only.
5. ChatGPT reviews that plan as CTO, data-analysis specialist, and postal-quality specialist.
6. Product Owner approves or requests changes.
7. Complete one UI area before activating the next.

## First Bounded Scope

The first bounded audit scope is Operation Dashboard only, including:

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

Future sequence, not currently authorized:

- BCVH Ranking
- Route Ranking
- shared navigation/frame/filters
- Login and system states
- final consistency review

## Required Deliverables

1. current UI inventory for Operation Dashboard
2. findings within the Operation Dashboard scope
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

## Protected Boundaries

- No UI implementation or product-code edits.
- No F1.3 formula or threshold changes.
- No data or calculation changes.
- No business-contract changes for Dashboard, BCVH Ranking, or Route Ranking.
- No viewer/admin permission changes.
- No port changes for `5178` or `5050`.
- No Import remediation reopening.
- No implementation of `F1.1`, `F1.2`, `F4.1`, Shipment, Pareto, Evidence, or Message modules.
- No public-Internet exposure.
- No Codex implementation prompt before Product Owner approves the plan.
- No immediate whole-product UI audit dispatch to Antigravity before the bounded Operation Dashboard scope is agreed.

## Preserved Runtime and Contract Baseline

- Dashboard BCVH table remains the original compact overview surface.
- `/f13/ranking/bcvh` remains the accepted detailed independent ranking surface for later sequencing only.
- Route Ranking remains the accepted route-level analysis surface with current filter and internal-route audit behavior for later sequencing only.
- Viewer experience remains read-only and limited to completed F1.3 screens.
- LAN deployment remains `5178` frontend / `5050` backend with localhost preserved.

## Recommended Antigravity Working Rules

- Inspect the current UI, not legacy design intent alone.
- Trace every finding to a visible current screen or accepted runtime behavior.
- Separate management-facing design issues from logic or contract issues.
- Record any logic/backend blockers as protected-boundary notes rather than implementation requests.
- Keep findings factual and planning-oriented.

## Next Authorized State

ChatGPT coordination and Product Owner align the Operation Dashboard audit scope first.

After that agreement, one bounded Antigravity prompt may be written for Operation Dashboard planning only.

No implementation ticket is authorized until Product Owner reviews and approves the planning output.
