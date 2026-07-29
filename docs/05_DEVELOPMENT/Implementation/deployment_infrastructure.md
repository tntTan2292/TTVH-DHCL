---
title: Deployment Infrastructure
purpose: Windows LAN deployment runbook for the approved F1.3 read-only viewer delivery
owner: Engineering
ssot: True
dependencies: QIS-LAN-DEPLOY-001
version: 1.1.0
---

# Deployment Infrastructure

## Scope

This runbook applies only to the bounded LAN deployment authorized by `QIS-LAN-DEPLOY-001`.

- Serve the completed F1.3 product to other computers on the same local network.
- Keep administrator access intact.
- Keep the viewer role read-only.
- Preserve localhost access.
- Do not expose the service to the public Internet.

## Runtime Contract

- Frontend host: `0.0.0.0`
- Frontend port: `5178`
- Frontend strict-port behavior: `true`
- Backend host: `0.0.0.0`
- Backend port: `5050`
- Frontend localhost URL: `http://localhost:5178`
- Backend localhost URL: `http://localhost:5050`
- Current detected LAN URL format on the server machine: `http://10.47.33.24:5178`
- Frontend API target for LAN access: `http://<SERVER_IPV4>:5050`

Normal LAN access must stay on the separate frontend port `5178`. The backend remains an API-only service on `5050`.

## Viewer Credential Setup

Default viewer username:

- `f13viewer`

Optional username override:

- set `QIS_VIEWER_USERNAME` in `.env`

Secure initial password method:

1. Choose the initial viewer password on the server machine.
2. Generate a hash:

```powershell
cd "D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong\backend"
node .\scripts\generateViewerPasswordHash.js "<ViewerPassword>"
```

3. Put the emitted hash into the repository root `.env` or backend `.env`:

```env
QIS_VIEWER_USERNAME=f13viewer
QIS_VIEWER_PASSWORD_HASH=scrypt$...
```

Notes:

- Do not commit the generated password or hash.
- The viewer account is enabled only when `QIS_VIEWER_PASSWORD_HASH` is configured.
- Existing administrator login remains available.

## Startup Commands

Run the Windows port check before startup:

```powershell
cd "D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong"
powershell -ExecutionPolicy Bypass -File .\scripts\check-qis-lan-ports.ps1
```

If a port is occupied, the script reports:

- occupied port
- owning PID
- owning process
- a stop instruction such as `Stop-Process -Id <PID> -Force`

Build the frontend once after pulling the approved commit:

```powershell
cd "D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong\frontend"
npm.cmd run build
```

Start the backend API service:

```powershell
cd "D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong"
powershell -ExecutionPolicy Bypass -File .\scripts\start-qis-backend.ps1
```

This canonical startup path:

- starts `backend/server.js` from the correct backend directory
- refuses to start if port `5050` is already occupied
- avoids stale-process confusion from ad hoc working directories
- prints only safe viewer diagnostics:
  - loaded `.env` path
  - viewer username
  - viewer enabled `yes/no`
  - viewer hash valid `yes/no`

Start the frontend host separately:

```powershell
cd "D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong\frontend"
npm.cmd run preview -- --host 0.0.0.0 --port 5178 --strictPort
```

Expected listening contract:

- `Host: 0.0.0.0`
- `Port: 5178`
- `Strict port: true`
- `Host: 0.0.0.0`
- `Port: 5050`

If port `5178` is already occupied, Vite must fail with `Port 5178 is already in use`.

If port `5050` is already occupied, the backend must fail with `PORT 5050 IS OCCUPIED` and instruct the operator to run the port check script.

## Firewall Rules

Allow inbound TCP `5178` and `5050` on the Windows Private profile only:

```powershell
New-NetFirewallRule `
  -DisplayName "QIS V2 F1.3 LAN Frontend 5178" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 5178 `
  -Action Allow `
  -Profile Private

New-NetFirewallRule `
  -DisplayName "QIS V2 F1.3 LAN Backend 5050" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 5050 `
  -Action Allow `
  -Profile Private
```

Do not create a Public-profile rule unless Product Owner governance changes.

## Server IP Discovery

Find the server machine IPv4 address:

```powershell
ipconfig
```

Current detected IPv4 from implementation validation:

- `10.47.33.24`

## Final LAN URL

Use this format from another computer on the same network:

```text
http://<SERVER_IPV4>:5178
```

Validated example on the current server machine:

- `http://10.47.33.24:5178`

Backend API format:

```text
http://<SERVER_IPV4>:5050
```

## Access Contract

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

Viewer-readable backend APIs:

- `/api/auth/login`
- `/api/auth/me`
- `/api/auth/logout`
- `/api/f13/dashboard/kpi`
- `/api/f13/dashboard/daily-trend`
- `/api/f13/dashboard/quality-timeline`
- `/api/f13/dashboard/top`
- `/api/f13/dashboard/meta`
- `/api/f13/ranking/bcvh`
- `/api/f13/ranking/route`
- `/api/f13/recommendations`

Viewer-blocked backend APIs:

- `/api/import/*`
- `/api/f13/import/preview`
- `/api/f13/import/confirm`
- `/api/f13/rca/pareto`
- `/api/f13/evidence-list`
- `/api/f13/dashboard/message`
- `/api/f13/messages`

## LAN Safety Boundaries

- Keep deployment inside the same local network only.
- Use the Windows Private firewall profile only.
- Do not configure router port-forwarding.
- Do not publish the URL through a public DNS name.
- Do not expose `5178` or `5050` to the public Internet.
