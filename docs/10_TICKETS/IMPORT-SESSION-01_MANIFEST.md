# IMPORT-SESSION-01 - Sign in and disconnect the Huế / TCT DKCL sessions at any time from the Import page

Status: IMPLEMENTED / TECHNICAL VALIDATION DONE / READY FOR PO CHECK (PO UI Check Required = Yes)
Owner: Claude Code (Sonnet), 2026-10-22. Does not change the Current Ticket.

## 1. PO request (2026-10-22)

The TCT account asks for a password change from time to time. The PO wants to sign in to Huế and TCT on purpose, without waiting for an import to need it, so a fresh session is kept for the daily automatic import; and to **disconnect** a source's session and sign in again at once after changing a password, without stopping and restarting the server.

## 2. What was found

- The sign-in buttons lived only in the "Nạp thủ công (Excel)" tab and only showed when the state was `AUTHENTICATION_REQUIRED`; the default tab showed no session state.
- "Huỷ đăng nhập" (`cancel-login`) only closes the window. The cookies stay in the browser profile, and the keep-alive / scheduler `reattachSession` reopens a window from them, so it cannot end a session.
- The sign-in has a captcha (AUTO-LOGIN-01 closed): "sign in on purpose" means the button is always available and the person types the password in the opened browser window. Nothing is typed by the system.

## 3. Delivered

| Part | What | Where |
| --- | --- | --- |
| Status | `GET /api/import/dkcl/session/status[?source=]` -> state of HUE and TCT **without opening a browser** (safe to poll): `status` (`SESSION_VALID`, `LOGIN_IN_PROGRESS`, `DISCONNECTED`, `AUTHENTICATION_REQUIRED`, `LOGIN_TIMEOUT`, `NOT_CHECKED`), window present, busy (an import uses it), `last_validated_at`, disconnected time | `DkclSessionPreflightService.getSessionStatus`, controller `sessionStatus` |
| Disconnect | `POST /api/import/dkcl/session/disconnect {source}`: best-effort portal sign-out, clear the browser context cookies, close the window, end a browser left over for that profile, delete the profile's cookie files, mark the source disconnected. Refused with `409 SESSION_BUSY` while an import operation uses the session | `DkclSessionPreflightService.disconnect`, `DkclHueF13PortalClient.signOutAndClearCookies`, `dkclSessionDisconnect.js` |
| No revival | The marker is a file (`Data DKCL/BrowserProfiles/session-disconnected.json`), so a backend restart does not bring the old session back. While set: `preflight` opens no browser and answers `AUTHENTICATION_REQUIRED` (`DISCONNECTED_BY_USER`), `reattachSession` is refused (keep-alive and scheduler both use it; the scheduler lane then reports "needs manual login"), the keep-alive logs `DISCONNECTED`. Pressing Đăng nhập (`interactive-auth`) clears the marker | same + `dkclSessionKeepAlive.js` |
| Screen | Always-visible strip "Phiên đăng nhập nguồn dữ liệu" at the top of the Import page (above all tabs): per source a status light and label, **Đăng nhập** (always available; "Đăng nhập lại" when signed in), **Huỷ đăng nhập** (while waiting), **Ngắt session** (with a confirmation). It re-reads the status every 5 s and nudges the page's older HUE/TCT blocks after any change. Those blocks are unchanged | `components/DkclSessionStrip.jsx`, `dkclSessionStripModel.js`, `pages/DataImportCenter.jsx` |

After changing a password: **Ngắt session** -> **Đăng nhập** -> type the new password in the opened window. No server restart.

## 4. Validation

- `backend/test_dkclSessionDisconnect.js` 9/9: cookie wipe keeps other profile data; the marker persists across instances; disconnect order (sign-out, close) and cookie removal; no browser opened and no reattach after a disconnect; sign-in clears the marker; refused while an import uses the session; status of a window-less source and of a login in progress; keep-alive reports `DISCONNECTED` and skips reattach; controller returns both sources and maps `SESSION_BUSY` to 409.
- Unchanged and green: `autoImport015.test.js` 7/7, `dkclSessionWindowHide.test.js` 10/10, `test_autoImportScheduler.js` 16/16, `test_browserProfileLock.js`, `test_dkclReclaimLeftoverProfile.js` 4/4, `test_dkclSessionCoordinator.js`. `test_dkclSessionPreflightService.js` fails to load (duplicate `cleanupCalled` declaration at line 1146); it fails identically without this change (pre-existing, not touched).
- Frontend: `dkclSessionStripModel.test.js` (button rules per state, wiring), the five existing Data Import tests, `oxlint` (only two old warnings), `vite build` OK.
- Not verified live: the real portal sign-out URL (`/logout` GET is best-effort; the cookie wipe is what ends the session), a real disconnect and sign-in. Backend restart needed to load the new routes.

## 5. PO UI check

Open the Import page: the strip shows Huế and TCT. Try Đăng nhập (a window opens; sign in), then Ngắt session (confirm) and check the state turns "Đã ngắt" and that the window closes; then Đăng nhập again. Backend must be restarted first.

## 6. Residuals

- Huế broker mode (`DKCL_HUE_BROKER_ENABLED`, off today) disconnect only closes the broker browser; it cannot wipe the broker's cookies.
- The login window opens on the machine running the backend; from another computer the person needs that machine's screen (unchanged behaviour).
