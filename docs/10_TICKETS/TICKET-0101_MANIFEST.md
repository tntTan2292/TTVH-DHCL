# TICKET-0101 Manifest

## 1. Ticket Information

- Ticket ID: `TICKET-0101`
- Ticket Name: `Login API and Session`
- Phase: `V2.0 Foundation`
- Owner: `Codex`
- Governance Version: `V2 Active`

## 2. Objective

- Implement and validate the QIS V2 login API and session lifecycle so authorized users can sign in, retain authenticated state across refresh, and log out.

## 3. Current Status

- Current state: `READY FOR PO CHECK`
- PO UI Check Required: `Yes`
- PO Product Status: `READY FOR PO CHECK`
- Technical Status: `PASS`
- Runtime Status: `PASS`
- Review status: `READY FOR PO CHECK`
- Activation date: `2026-07-18`
- Technical handoff date: `2026-07-18`

## 4. Required Reading

- [README_AI.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/README_AI.md)
- [docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)
- [docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md)
- [docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md)
- [docs/01_GOVERNANCE/DOCUMENT_INDEX.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/DOCUMENT_INDEX.md)
- [docs/04_TECHNICAL_PLANNING/Backlog/DEVELOPMENT_BACKLOG.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Backlog/DEVELOPMENT_BACKLOG.md)
- [docs/04_TECHNICAL_PLANNING/Feature/FEATURE_PLANNING.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Feature/FEATURE_PLANNING.md)
- [docs/04_TECHNICAL_PLANNING/Epic/EPIC_PLANNING.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Epic/EPIC_PLANNING.md)
- [backend/src/controllers/authController.js](https://github.com/tntTan2292/TTVH-DHCL/blob/main/backend/src/controllers/authController.js)
- [backend/src/routes/authRoutes.js](https://github.com/tntTan2292/TTVH-DHCL/blob/main/backend/src/routes/authRoutes.js)
- [backend/src/services/auth/AuthSessionStore.js](https://github.com/tntTan2292/TTVH-DHCL/blob/main/backend/src/services/auth/AuthSessionStore.js)
- [frontend/src/api/httpClient.js](https://github.com/tntTan2292/TTVH-DHCL/blob/main/frontend/src/api/httpClient.js)
- [frontend/src/api/authClient.js](https://github.com/tntTan2292/TTVH-DHCL/blob/main/frontend/src/api/authClient.js)
- [frontend/src/auth/AuthContext.jsx](https://github.com/tntTan2292/TTVH-DHCL/blob/main/frontend/src/auth/AuthContext.jsx)
- [frontend/src/pages/LoginPage.jsx](https://github.com/tntTan2292/TTVH-DHCL/blob/main/frontend/src/pages/LoginPage.jsx)
- [docs/06_REVIEWS/Auth/TICKET-0101_LOGIN_API_AND_SESSION.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Auth/TICKET-0101_LOGIN_API_AND_SESSION.md)
- [docs/06_REVIEWS/Auth/TICKET-0101_PO_ACCEPTANCE_CHECKLIST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Auth/TICKET-0101_PO_ACCEPTANCE_CHECKLIST.md)

## 5. Business Context

- QIS V2 requires a stable authentication foundation before broader protected module work continues.
- The authorized backlog scope is login API, session lifecycle, and logout handling.
- The accepted runtime behavior is that a valid user can log in and retain authenticated state across a page refresh.

## 6. Technical Context

- Existing backend route area: `/api/auth`.
- Existing backend route file: `backend/src/routes/authRoutes.js`.
- Existing backend controller: `backend/src/controllers/authController.js`.
- Existing backend session store: `backend/src/services/auth/AuthSessionStore.js`.
- Existing frontend auth client: `frontend/src/api/authClient.js`.
- Existing frontend auth state: `frontend/src/auth/AuthContext.jsx`.
- Existing login screen: `frontend/src/pages/LoginPage.jsx`.
- Existing HTTP session propagation: `frontend/src/api/httpClient.js`.

## 7. In Scope

- Inspect the current login, session restore, and logout flow end-to-end.
- Implement the smallest necessary corrections to make the authorized login/session scope reliable.
- Validate `POST /api/auth/login`, `GET /api/auth/me`, and `POST /api/auth/logout`.
- Validate authenticated state persists across browser refresh using the approved existing client session mechanism.
- Add focused automated tests for login success, invalid credentials, session restore, session expiry or invalid session behavior, and logout.
- Preserve existing protected-route behavior unless a TICKET-0101 defect requires a targeted correction.
- Create or update TICKET-0101 review evidence and PO acceptance checklist.

## 8. Out of Scope

- Role and permission guard implementation beyond what is required by the existing login/session contract.
- TICKET-0102 access guard and route protection.
- New authorization business rules.
- New user administration screens.
- Database schema changes unless an existing authoritative source explicitly requires them.
- Password policy, MFA, password reset, audit logging, or account lifecycle rules not already authorized.
- Broader Dashboard widget, chart-meaning, color-consistency, or layout audit.
- Changes to accepted TODAY-003 through TODAY-008 dashboard/import behavior.

## 9. Business Rule Guard

- Do not infer missing authentication, credential storage, role, permission, password, session timeout, or user-management business rules.
- If implementation requires a business rule not present in the Required Reading or existing code contract, stop and record the precise blocker instead of guessing.
- Do not commit credentials, tokens, session IDs, secrets, screenshots containing secrets, or runtime session values.

## 10. Technical Validation Requirements

- Add or update focused backend tests for auth API behavior.
- Add or update focused frontend tests for auth client/context behavior when applicable.
- Run backend tests applicable to auth.
- Run frontend tests applicable to auth.
- Run lint and build where applicable.
- Perform targeted runtime/API validation of login, session restore, and logout.
- Browser automation is optional and must remain targeted technical evidence only.

## 11. Documentation Requirements

- Update this manifest when implementation reaches technical completion.
- Create or update a TICKET-0101 review evidence document.
- Create or update a concise TICKET-0101 PO acceptance checklist.
- Update `PROJECT_SNAPSHOT.md` when the ticket advances or closes.
- Keep `DOCUMENT_INDEX.md` aligned with any new TICKET-0101 documents.
- Update PO findings records only if a PO finding is created or closed.

## 12. PO UI Check

- PO UI Check Required: `Yes`
- Codex stops at `READY FOR PO CHECK`.
- Product Owner owns visible UI acceptance and final PO PASS / WARNING / FAIL.
- Codex must not self-award PO PASS.
- Provide a concise manual PO checklist covering `/login`, authenticated refresh behavior, logout, expected visible result, and PASS / WARNING / FAIL criteria.

## 12.1 Technical Handoff Evidence

- Review evidence: `docs/06_REVIEWS/Auth/TICKET-0101_LOGIN_API_AND_SESSION.md`
- PO acceptance checklist: `docs/06_REVIEWS/Auth/TICKET-0101_PO_ACCEPTANCE_CHECKLIST.md`
- Auth API contract validated:
  - `POST /api/auth/login`
  - `GET /api/auth/me`
  - `POST /api/auth/logout`
- Runtime behavior validated:
  - successful login reaches authenticated dashboard;
  - invalid login stays on `/login` with an error;
  - refresh keeps the authenticated dashboard session;
  - logout returns to `/login`;
  - no app page console errors were observed.
- No credentials, tokens, session IDs, secrets, cookies, or screenshots were committed.
- Final state: `READY FOR PO CHECK`.

## 13. Authority Guard

- Implementation authority comes from `docs/04_TECHNICAL_PLANNING/Backlog/DEVELOPMENT_BACKLOG.md`, `docs/04_TECHNICAL_PLANNING/Feature/FEATURE_PLANNING.md`, and `docs/04_TECHNICAL_PLANNING/Epic/EPIC_PLANNING.md`.
- If a higher-authority document conflicts with this manifest, stop and report the conflict.
- If SSOT access rules are required but absent for a proposed change, record `BLOCKED BY SSOT` instead of inventing the rule.

## 14. Next Ticket

- Next ticket ID: `TICKET-0102`
- Next ticket name: `Access Guard and Route Protection`
- Handoff note: TICKET-0102 remains inactive until TICKET-0101 receives explicit PO PASS and a separate governance action activates the next ticket.
