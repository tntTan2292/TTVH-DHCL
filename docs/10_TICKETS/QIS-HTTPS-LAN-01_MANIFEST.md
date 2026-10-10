# QIS-HTTPS-LAN-01 Manifest

Status: `IMPLEMENTED / TECH PASS / WAITING FOR THE FRONTEND RESTART AND THE PO CHECK (2026-10-10)`. Serve the QIS V2 frontend over HTTPS on the LAN so the browser gives pages the clipboard and the camera button copies a picture in one click.

## Table of Contents

- [1. Ticket Information](#1-ticket-information)
- [2. Why](#2-why)
- [3. Changes](#3-changes)
- [4. Validation](#4-validation)
- [5. Operating notes](#5-operating-notes)
- [6. PO Check](#6-po-check)

## 1. Ticket Information

- Ticket ID: `QIS-HTTPS-LAN-01` — HTTPS for the LAN frontend. Owner: `Claude Code (Sonnet 5.5)`.
- Authorization: PO in chat 2026-10-10 ("Dán được vào Viber rồi, làm https đi") after the camera-button follow-up of `F11-DASHBOARD-UI-01`.
- Extends the closed deployment ticket `QIS-LAN-DEPLOY-001` (`docs/05_DEVELOPMENT/Implementation/deployment_infrastructure.md`). No change to the backend, the database, ports or the firewall (port 5178 stays the only frontend port).

## 2. Why

The system is opened as `http://10.47.33.24:5178`. On a plain-http address a page cannot write an image to the clipboard, so the camera button could only show a picture to copy by hand. Over HTTPS the same button copies the picture directly (Ctrl+V into Zalo/Viber).

## 3. Changes

| File | Change |
| --- | --- |
| `frontend/scripts/make-dev-cert.mjs` | creates `frontend/certs/dev-cert.pem` + `dev-key.pem` with OpenSSL (Git for Windows ships it): self-signed, 10 years, names localhost, the computer name and every IPv4 address of the computer; `--force` recreates it after an address change |
| `frontend/vite.config.js` | serves HTTPS (dev and preview) when both certificate files exist, otherwise plain HTTP exactly as before; `QIS_HTTPS=off` forces HTTP. The `/api` proxy to `http://127.0.0.1:5050` is unchanged |
| `frontend/src/api/apiBaseUrl.js` (+ test) | over HTTPS the page calls `/api` on its own address (forwarded by the proxy) instead of `http://host:5050/api`, which the browser would block as mixed content; over HTTP and with `VITE_API_BASE_URL` nothing changes |
| `TTVH_ControlCenter.ps1` | "Open Dashboard" opens `https://localhost:5178` when the certificate exists |
| `.gitignore` | `frontend/certs/` (the private key never goes to Git) |

## 4. Validation

- Frontend 621/621, build and lint clean; Control Center script parses.
- A separate test server on port 5179 (the running 5178 server was not touched): in Chromium over `https://localhost:5179` and `https://10.47.33.24:5179` the login page loads, `isSecureContext` is true and the clipboard write API exists; `/api` through the HTTPS proxy reaches the backend (a bad login answers 401 on both addresses). The pane's own browser refuses the self-signed certificate, so the one-click copy into Viber itself is for the PO to confirm.

## 5. Operating notes

1. **Restart the frontend** (Control Center → stop/start, or restart `npm run dev`) to switch from HTTP to HTTPS. After that the address is `https://10.47.33.24:5178`; `http://10.47.33.24:5178` no longer answers (bookmarks must be changed).
2. **First visit on each computer/browser:** the certificate is self-signed, so the browser warns once ("Nâng cao" → "Tiếp tục tới 10.47.33.24"). To remove the warning for good, install `frontend/certs/dev-cert.pem` as a trusted certificate on that computer (a security setting of that computer, left to its owner).
3. If the server's IP address changes: `node scripts/make-dev-cert.mjs --force` in `frontend`, then restart the frontend.
4. **Back to HTTP:** delete `frontend/certs` or start with `QIS_HTTPS=off`, restart the frontend. Nothing else depends on HTTPS.
5. The backend stays plain HTTP on 5050 for the local proxy; browsers no longer call it directly over HTTPS.

## 6. PO Check

After the restart: open `https://10.47.33.24:5178` (accept the warning once), sign in, click the camera button on the operations table and paste into Viber. Also confirm the dashboards load normally from a second computer.
