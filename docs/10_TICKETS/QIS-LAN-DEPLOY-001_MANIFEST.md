# QIS-LAN-DEPLOY-001 Manifest

- Ticket ID: `QIS-LAN-DEPLOY-001`
- Ticket Name: `F1.3 Local Network Viewer Deployment`
- Phase: `F1.3 Local Network Deployment`
- Current state: `COMPLETED / PO PASS / CLOSED`
- Technical Status: `PASS`
- Runtime Status: `PO VERIFIED`
- PO UI Check Required: `No - Product Owner verification completed`
- PO Product Status: `PO PASS`
- Activation authority: `Product Owner authorization to deploy the completed F1.3 product for read-only access from other computers on the same local network`
- Handoff date: `2026-07-29`
- Closure date: `2026-07-29`
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
- Frontend LAN path remains `0.0.0.0:5178` with `strictPort: true`.
- Backend/API LAN path remains `0.0.0.0:5050`.
- Normal LAN access path is `http://<server-ip>:5178`, with frontend API requests targeting backend port `5050` on the same hostname.
- If either port is occupied, startup must fail clearly instead of changing ports automatically.
- Windows pre-start conflict inspection is provided by `scripts/check-qis-lan-ports.ps1`.
- Canonical backend startup is provided by `scripts/start-qis-backend.ps1`.
- Backend startup diagnostics must reveal only: loaded `.env` path, configured viewer username, viewer enabled `yes/no`, and viewer hash valid `yes/no`.
- Final accepted local viewer username configuration is `ttvhhue`.

## Validation

- Focused backend auth/session/authorization tests.
- Focused frontend route/menu/auth tests.
- Targeted build/lint for the touched frontend scope.
- Targeted runtime/server startup verification for LAN host and localhost preservation.
- `git diff --check`
- Remote verification of the pushed commit and onboarding Blob URLs.
- Fresh onboarding simulation starting from `README_AI.md`.

## PO Acceptance

Product Owner decision recorded: `PO PASS`.

Accepted implementation and remediation evidence:

- frontend LAN port: `5178`
- backend/API LAN port: `5050`
- normal LAN URL: `http://<server-ip>:5178`
- viewer username is configured locally as `ttvhhue`
- viewer authentication is operational
- viewer may access only completed F1.3 screens
- viewer remains blocked from System Administrator, Import, unfinished modules, and restricted APIs
- admin access remains unchanged
- viewer credential failure was caused by a malformed local password-hash value
- local `.env` was corrected without committing plaintext credentials or hashes
- accepted runtime remediation commit: `99c865e92b840a587dc9a889294c535fecc68816`

## Next Ticket

- Next ticket ID: `F13-UI-AUDIT-PLAN`
- Blockers or handoff notes:
  - Next authorized activity is Antigravity planning discovery only.
  - No UI implementation is authorized until Product Owner approves the audit plan.

## Handoff

This manifest is now a closure record. A fresh executor must preserve the accepted LAN deployment contract, treat this ticket as closed, and continue from `F13-UI-AUDIT-PLAN` for planning-only Antigravity discovery.
