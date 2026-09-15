# ADMIN-USER-MODULE-ACCESS-01 Manifest

Status: `DISCOVERY / READ-ONLY AUDIT AUTHORIZED / QUEUED (2026-09-15)`. Separate workstream in the current coordination round; no design or implementation is authorized.

## 1. Ticket Information

- Ticket ID: `ADMIN-USER-MODULE-ACCESS-01`
- Ticket Name: `Quản trị — Tạo user và phân quyền truy cập theo Module`
- Phase: `Discovery / Read-Only Audit`
- Next Executor: `Antigravity (Gemini)`, as a separate second audit report after the active F13 audit.
- Governance Version: `V2 Active`
- Authorization: Product Owner instruction received in chat, 2026-09-15: bổ sung trong quyền quản trị phương án tạo user và phân quyền mỗi user có thể thấy/truy cập những Module nào trong lần điều phối này.
- Branch: `codex/da-impl-006`
- Baseline commit: `1e0dea8`

## 2. Objective

Audit the existing authentication and ADMIN/USER RBAC implementation, then propose an additive administration capability that allows an administrator to:

1. Create a user account.
2. Configure which top-level modules that user may see and access.
3. Update the assigned module access later.
4. Ensure an unassigned module is unavailable both in navigation and by direct URL/API access.

The current three-module information architecture must be discovered from the live branch and reused, not duplicated or guessed.

## 3. Mandatory Read-Only Audit

The executor must trace and evidence:

- Current user source/storage, account fields, password hashing, session lifecycle, login response, and ADMIN/USER role semantics.
- Existing frontend role routing, Sidebar visibility, default landing/fallback behavior, direct-URL handling, and unauthorized states.
- Existing backend authentication/authorization middleware and route/API protection.
- Exact module and child-route inventory, including hidden-but-existing routes.
- Whether permissions should be stored per user, by reusable permission group/role, or through another minimal model; present trade-offs and migration impact without selecting an unstated business rule.
- User creation validation: unique username, required fields, initial password/reset handling, active/disabled state, prevention of privilege escalation, and audit history.
- Permission update behavior for an already logged-in user, session refresh/invalidation, default-deny behavior, and ADMIN self-lockout protection.
- Database/schema/migration/API/frontend surfaces and tests that would be affected if implementation is later authorized.

## 4. Security Lock

Hiding a module in the Sidebar is not authorization. The proposed contract must enforce the same permission at:

1. Sidebar/menu visibility.
2. Frontend route guard and direct URL.
3. Backend API authorization.

Default behavior for missing, invalid, or stale permission data must be **deny**, except for the explicitly documented administrator recovery path proposed for PO decision.

## 5. Required Reading

- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- This manifest
- `frontend/src/App.jsx`
- `frontend/src/App.role-routing.test.js`
- `frontend/src/components/Sidebar.jsx`
- `frontend/src/layouts/MainLayout.jsx`
- `frontend/src/auth/AuthContext.jsx`
- `frontend/src/auth/roles.js` and their tests
- `backend/src/controllers/authController.js` and tests
- `backend/src/middleware/authMiddleware.js` and tests
- `backend/src/routes/authRoutes.js`
- `backend/src/services/auth/runtimeUsers.js`, `AuthSessionStore.js`, `passwordHash.js` and tests
- Existing database schema/migrations relevant to accounts or sessions
- Prior Auth review documents under `docs/06_REVIEWS/Auth/`

## 6. Expected Output

A separate read-only discovery report containing:

- Current-state architecture and verified gaps.
- Exact module/route/API permission matrix.
- Data-model options and recommended minimal option, clearly marked as a proposal.
- Proposed Admin screens and flows for user creation and module assignment.
- Backend enforcement and security model.
- Migration/backward-compatibility plan.
- Test and acceptance gates.
- Open Product Owner decisions.
- Exact files likely to change if a later implementation phase is approved.

## 7. Scope Boundaries

- Do not merge this work into `F13-BCVH-MONTHLY-CUMULATIVE-01`.
- Do not create/update any real user, password, role, session, or permission.
- Do not change code, test, schema, database, configuration, SSOT, or Governance during the audit.
- Do not implement from the audit or self-grant PO PASS.
- `F13-BCVH-MONTHLY-CUMULATIVE-01` remains the Current Ticket and must be reported separately.
- `F41-DASHBOARD-MINIMUM-01` remains paused.
