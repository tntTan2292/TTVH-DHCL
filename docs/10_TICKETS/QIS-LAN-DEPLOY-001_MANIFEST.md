# QIS-LAN-DEPLOY-001 Manifest

- Ticket ID: `QIS-LAN-DEPLOY-001`
- Ticket Name: `F1.3 Local Network Viewer Deployment`
- Phase: `F1.3 Local Network Deployment`
- Current state: `IMPLEMENTATION COMPLETE / READY FOR PO REVIEW`
- Technical Status: `IMPLEMENTED / SELF-VALIDATED`
- Runtime Status: `LAN SELF-VERIFIED`
- PO UI Check Required: `Yes - login, navigation, access control, and LAN startup are visible behaviors`
- PO Product Status: `READY FOR PO REVIEW`
- Activation authority: `Product Owner authorization to deploy the completed F1.3 product for read-only access from other computers on the same local network`
- Handoff date: `2026-07-29`
- Primary executor: `Codex`
- Secondary executor: `None unless a later explicit UI-polish-only follow-up is authorized`

## Fresh-Chat Onboarding Authority

Required onboarding chain:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. `docs/10_TICKETS/QIS-LAN-DEPLOY-001_MANIFEST.md`
5. Required Reading from this manifest

Required Reading:

- `docs/06_REVIEWS/Deployment/QIS_LAN_DEPLOY_001_CHECKPOINT_001.md`
- `docs/10_TICKETS/F13-BCVH-RANKING-REDESIGN-IMPL_MANIFEST.md`
- `docs/06_REVIEWS/BCVH/F13_BCVH_RANKING_REDESIGN_IMPL_WAVE2_CHECKPOINT_001.md`
- `docs/05_DEVELOPMENT/Implementation/deployment_infrastructure.md`
- `docs/04_TECHNICAL_PLANNING/Backlog/DEVELOPMENT_BACKLOG.md`

## Product Owner Scope Locked

Deploy only the completed F1.3 product for read-only LAN access inside the same local network.

This ticket is bounded to:

- hide unfinished top-level modules `F1.1`, `F1.2`, and `F4.1` from normal users
- add one read-only F1.3 viewer role/account
- preserve existing administrator access
- enforce authorization by direct URL and API boundary, not menu hiding alone
- configure frontend and backend to accept LAN connections while preserving localhost access
- provide clear Windows LAN deployment instructions

The implementation must preserve:

- accepted F1.3 formulas
- accepted F1.3 screens and closed-ticket behavior
- Dashboard BCVH compact overview contract
- `/f13/ranking/bcvh` accepted detailed ranking contract
- existing administrator access
- localhost access

## In Scope

- Viewer login and session support for a read-only F1.3 role.
- Frontend route protection for viewer vs administrator access.
- Backend authorization for viewer-readable F1.3 APIs and administrator-only import/admin APIs.
- Hiding unfinished top-level modules `F1.1`, `F1.2`, and `F4.1` from normal users.
- Hiding System Administration from viewer role.
- LAN-safe frontend/backend host and port configuration on the server machine.
- Windows deployment/runbook documentation for LAN-only operation.

## Out Of Scope

- Public Internet exposure.
- F1.3 formula changes, threshold changes, accepted-screen redesign, or data changes.
- Import logic changes other than access restriction.
- Reopening completed Dashboard, Import, or BCVH redesign remediation.
- Broad repository audit.
- New business roles beyond `admin` and one read-only F1.3 viewer role.

## Technical Contract Direction

- Reuse the existing auth/session flow as the base contract.
- Support secure initial viewer password configuration without hardcoding a production password.
- Preserve in-memory session handling unless a smaller authoritative seam requires otherwise.
- Preserve the existing fixed backend/frontend ports unless a bounded deployment requirement requires explicit configuration support.
- Preserve localhost while additionally allowing LAN access on the server machine.
- Keep LAN deployment restricted to local-network listening and Windows firewall guidance only.

## Documents To Update

- `docs/10_TICKETS/QIS-LAN-DEPLOY-001_MANIFEST.md`
- `docs/06_REVIEWS/Deployment/QIS_LAN_DEPLOY_001_CHECKPOINT_001.md`
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `README_AI.md`
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md`
- `docs/04_TECHNICAL_PLANNING/Backlog/DEVELOPMENT_BACKLOG.md`
- `PROJECT_PROGRESS.md`
- `PROJECT_STATUS.md`
- `docs/05_DEVELOPMENT/Implementation/deployment_infrastructure.md`
- `docs/01_GOVERNANCE/PROJECT_HANDOVER.md` if closure changes active handoff state
- `docs/01_GOVERNANCE/PROJECT_CONTEXT.md` if closure changes active runtime/access contract state

## Delivered Contract

- Viewer login is supported through the existing session flow with an env-configured password hash.
- Default viewer username is `f13viewer`; `QIS_VIEWER_USERNAME` may override it.
- Viewer may access only:
  - `/f13/dashboard`
  - `/f13/ranking/bcvh`
  - `/f13/ranking/route`
- Viewer may not access System Administration, import flows, unfinished top-level modules, Shipment, Pareto, Evidence, or Message.
- Backend import/admin APIs require `admin`.
- Backend serves the built frontend on `0.0.0.0:5050`, preserving localhost and allowing LAN access on `http://<server-ip>:5050`.

## Validation

- Focused backend auth/session/authorization tests.
- Focused frontend route/menu/auth tests.
- Targeted build/lint for the touched frontend scope.
- Targeted runtime/server startup verification for LAN host and localhost preservation.
- `git diff --check`
- Remote verification of the pushed commit and onboarding Blob URLs.
- Fresh onboarding simulation starting from `README_AI.md`.

## PO Acceptance

Ready-for-PO handoff must include a concise manual checklist covering:

- viewer login
- accessible F1.3 screens
- blocked System Administrator and import/admin screens
- direct URL authorization checks
- LAN startup and second-computer access steps
- PASS / WARNING / FAIL criteria

Do not self-award PO PASS.

## Next Ticket

- Next ticket ID: `None currently authorized`
- Blockers or handoff notes:
  - After this delivery, await Product Owner direction unless a concrete deployment defect is found.

## Handoff

This manifest authorizes one bounded delivery only. A fresh executor must read the onboarding chain, implement the LAN-only viewer deployment without reopening closed F1.3 behavior, update documentation, push, verify remote state, and finish with a fresh-onboarding handoff.
