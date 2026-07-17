# TICKET-0101 Login API and Session

## 1. Review Result

- Ticket ID: `TICKET-0101`
- Ticket name: `Login API and Session`
- Technical Status: `PASS`
- Runtime Status: `PASS`
- PO Product Status: `READY FOR PO CHECK`
- Review status: `READY FOR PO CHECK`
- Review date: `2026-07-18`

## 2. Scope

- Stabilize the existing QIS V2 login API and session lifecycle.
- Validate login, session restore, invalid or expired session behavior, and logout.
- Do not implement TICKET-0102 route protection or broad access guards.
- Do not invent role, permission, credential storage, password, timeout, MFA, password reset, user administration, account lifecycle, or authorization business rules.

## 3. Current Auth And Session Contract

- `POST /api/auth/login`
  - Validates `username` and `password` against the configured runtime user list in `backend/src/controllers/authController.js`.
  - Missing credentials return HTTP `400` with code `MISSING_CREDENTIALS`.
  - Invalid credentials return HTTP `401` with code `UNAUTHORIZED`.
  - Successful login returns `success: true`, an opaque `session_id`, and a user object.
  - Successful login does not return a password.
- Backend session store
  - Stores opaque session IDs in memory.
  - Stores user, creation time, and expiry time.
  - Preserves the existing default session lifetime.
  - Deletes expired sessions when read.
- `GET /api/auth/me`
  - Reads the session from `x-session-id` or `Authorization: Bearer <session>`.
  - Valid sessions return HTTP `200`, `session_id`, and user.
  - Missing, invalid, or expired sessions return HTTP `401` with code `UNAUTHORIZED`.
- `POST /api/auth/logout`
  - Deletes the supplied session when present.
  - Returns `success: true`.
- Frontend session propagation
  - `authClient.login` stores the opaque session under the existing `qis_auth_session` key.
  - `httpClient` sends the stored session as both bearer authorization and `x-session-id`.
  - HTTP `401` clears the stored session.
  - `AuthContext` restores authenticated state through `/auth/me`.

No actual credential values, session IDs, tokens, cookies, or secrets are recorded in this document.

## 4. Root Causes Found

- Login page default state exposed runtime credential values in the visible form.
- Frontend login accepted a malformed success payload without proving both `session_id` and user were present.
- Logout removed stored browser state through `authClient`, but `AuthContext` could keep in-memory authenticated state if the logout request failed.
- Session expiry existed but lacked a deterministic test path.
- HTTP client session propagation and unauthorized cleanup lacked focused frontend tests.

## 5. Implementation Summary

- Login form now starts with empty username and password fields.
- Login redirect now preserves the original pathname, search, and hash context.
- `authClient.login` now rejects malformed success payloads and removes stale session state.
- `AuthContext.logout` now clears in-memory user state in a `finally` block.
- `httpClient` can be imported in direct Node tests without changing browser behavior.
- `AuthSessionStore` now supports deterministic test TTL and clearing while preserving the production default lifetime.

## 6. Automated Validation

### Backend Tests

- Command: `node --test backend/src/controllers/authController.test.js backend/src/services/auth/AuthSessionStore.test.js`
- Result: `PASS`, `8` tests.

### Frontend Tests

- Command: `node --test frontend/src/api/authClient.test.js frontend/src/api/httpClient.test.js frontend/src/auth/AuthContext.test.js frontend/src/pages/LoginPage.test.js`
- Result: `PASS`, `8` tests.

### Full Current Node Test Set

- Backend command: all `backend/src/**/*.test.js`
- Result: `PASS`, `16` tests.
- Frontend command: all `frontend/src/**/*.test.js`
- Result: `PASS`, `35` tests.

### Lint And Build

- Frontend lint: `PASS` with existing warnings only.
- Frontend build: `PASS` with existing chunk-size warning only.

## 7. Direct API Validation

| Scenario | Result |
| --- | --- |
| Missing credentials | HTTP `400`, code `MISSING_CREDENTIALS` |
| Invalid credentials | HTTP `401`, code `UNAUTHORIZED` |
| Successful login | HTTP `200`, `success: true`, session present, user present, password absent |
| `/auth/me` with bearer session | HTTP `200`, `success: true` |
| `/auth/me` with `x-session-id` | HTTP `200`, `success: true` |
| Logout | HTTP `200`, `success: true` |
| `/auth/me` after logout | HTTP `401`, code `UNAUTHORIZED` |

No session value was printed, stored in documentation, or committed.

## 8. Targeted Browser Runtime Validation

- Browser path: local preview `/login`.
- Login form initial state: username and password empty.
- Invalid login: remains on `/login` and shows an error.
- Valid login: navigates to `/f13/dashboard`.
- Refresh after login: remains on `/f13/dashboard` with `Logout` visible.
- Logout: returns to `/login`.
- App page console errors observed: `0`.
- Screenshots were not captured because they were not required for diagnosis.

## 9. PO Handoff

- TICKET-0101 is technically and runtime validated.
- TICKET-0101 is ready for manual PO acceptance.
- Codex stops at `READY FOR PO CHECK`.
- No PO PASS is recorded by Codex.
- TICKET-0102 remains inactive.
