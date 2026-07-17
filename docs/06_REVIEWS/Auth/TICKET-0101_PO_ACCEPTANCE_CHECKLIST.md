# TICKET-0101 PO Acceptance Checklist

## 1. Ticket

- Ticket ID: `TICKET-0101`
- Ticket name: `Login API and Session`
- PO UI Check Required: `Yes`
- Current PO Product Status: `PO PASS`
- Checklist date: `2026-07-18`
- PO decision date: `2026-07-18`

## 2. Test Context

- Route: `/login`
- Required credentials: use authorized runtime credentials provided outside the repository.
- Do not record credentials, session IDs, tokens, cookies, or screenshots containing sensitive values in PO notes.

## 3. Manual PO Steps

1. Open `/login`.
2. Confirm the username and password fields are empty by default.
3. Enter invalid credentials and submit.
4. Confirm the page stays on `/login` and shows a login error.
5. Enter authorized runtime credentials and submit.
6. Confirm the application opens the authenticated dashboard.
7. Refresh the browser.
8. Confirm the authenticated dashboard remains open and `Logout` is visible.
9. Click `Logout`.
10. Confirm the browser returns to `/login`.
11. Open `/f13/dashboard` after logout.
12. Confirm the app redirects to `/login` instead of showing authenticated content.

## 4. Expected Visible Result

- Login page does not expose credentials by default.
- Invalid login does not authenticate the user.
- Valid login enters the authenticated app.
- Refresh keeps the authenticated session.
- Logout exits the authenticated session.
- No Dashboard or Import behavior is visibly changed by this ticket.

## 5. PO Decision Criteria

- `PASS`: All steps match the expected visible result and no blocking login/session defect remains.
- `WARNING`: Login/session works, but the PO observes a minor wording or usability issue that does not block acceptance.
- `FAIL`: Valid login fails, invalid login authenticates, refresh loses authenticated state, logout does not exit, or authenticated content remains visible after logout.

## 6. PO Decision

- PO Product Status: `PO PASS`
- PO decision: `PASS`
- Closure authority: explicit Product Owner `PO PASS` decision.
- Closure date: `2026-07-18`
- Codex did not self-award PO PASS.
