# QIS LAN Deploy 001 Checkpoint 001

- Ticket: `QIS-LAN-DEPLOY-001`
- Date: `2026-07-29`
- Scope: `F1.3 local network viewer deployment`
- Status: `IMPLEMENTATION COMPLETE / READY FOR PO REVIEW`
- PO UI Check Required: `Yes`

## Delivered Scope

- hid unfinished top-level modules `F1.1`, `F1.2`, and `F4.1` from the viewer role
- added one read-only F1.3 viewer role backed by the existing session model
- preserved existing administrator access
- enforced direct-URL and API authorization boundaries
- configured LAN hosting on `0.0.0.0:5050` while preserving localhost
- served the built frontend from the backend for one final LAN URL
- documented Windows startup, firewall, IP discovery, and LAN access steps

## Viewer Contract

Viewer username:

- default `f13viewer`
- optional override via `QIS_VIEWER_USERNAME`

Secure password setup:

- generate `QIS_VIEWER_PASSWORD_HASH` with `backend/scripts/generateViewerPasswordHash.js`
- store the hash in `.env`
- no production viewer password is hardcoded in product code

Viewer-readable screens:

- `/f13/dashboard`
- `/f13/ranking/bcvh`
- `/f13/ranking/route`

Viewer-blocked screens:

- `/import`
- `/kpi-config`
- `/system-info`
- `/f11`
- `/f12`
- `/f41`
- `/f13/pareto`
- `/f13/evidence`
- `/f13/message`
- `/f13/ranking/shipment`

## Implementation Notes

- Backend session/auth remains in-memory and reused from the existing runtime seam.
- Viewer access is enforced in both frontend route protection and backend API middleware.
- Admin-only import and administration APIs are now blocked with authenticated `403` responses for viewer sessions.
- Backend now serves `frontend/dist` so the LAN deployment URL stays on the fixed backend port.
- Vite dev/proxy LAN support remains available for engineering, but the normal deployment path is `http://<server-ip>:5050`.

## Runtime Evidence

Confirmed on `2026-07-29`:

- backend started successfully on `Host: 0.0.0.0`, `Port: 5050`
- localhost root responded `200`
- LAN root responded `200` at `http://10.47.33.24:5050`
- viewer login returned `success: true`, `username: f13viewer`, `role: viewer`
- viewer `GET /api/f13/dashboard/meta` returned `success: true`
- viewer `GET /api/import/status` returned `403`
- unauthenticated `GET /api/import/status` returned `401`

## Validation Evidence

Focused backend tests:

- `node --test backend/src/controllers/authController.test.js backend/src/middleware/authMiddleware.test.js backend/src/services/auth/AuthSessionStore.test.js`
- Result: `13` passed, `0` failed

Focused frontend tests:

- `node --test frontend/src/auth/roles.test.js frontend/src/navigation/appNavigation.test.js frontend/src/api/client.test.js frontend/src/App.role-routing.test.js frontend/src/api/httpClient.test.js frontend/src/api/authClient.test.js frontend/src/auth/AuthContext.test.js frontend/src/pages/LoginPage.test.js`
- Result: `15` passed, `0` failed

Frontend build:

- `npm.cmd run build`
- Result: `PASS`

Frontend lint:

- `npm.cmd run lint`
- Result: `PASS with pre-existing warnings only`; no new bounded-delivery failure blocked release

Additional checks:

- runtime LAN URL verification: `PASS`
- direct URL and API-boundary verification: `PASS`
- `git diff --check`: pending final delivery step

## PO Manual Check Focus

1. Configure the viewer hash in `.env`, build frontend, and start `backend/server.js`.
2. From a second computer, open `http://10.47.33.24:5050`.
3. Log in as the viewer and confirm only completed F1.3 screens are reachable.
4. Enter blocked direct URLs manually and confirm the viewer cannot access them.
5. Log in as administrator and confirm import/admin screens still work.
6. Confirm localhost `http://localhost:5050` still works on the server machine.
