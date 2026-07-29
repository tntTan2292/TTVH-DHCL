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

- Backend host: `0.0.0.0`
- Backend port: `5050`
- Frontend LAN deployment: built Vite assets served by `backend/server.js`
- Localhost URL: `http://localhost:5050`
- Current detected LAN URL format on the server machine: `http://10.47.33.24:5050`

The backend also keeps Vite LAN development support on `5178` for engineering use, but the deployment URL for normal LAN viewers is the backend-served URL on `5050`.

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

Build the frontend once after pulling the approved commit:

```powershell
cd "D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong\frontend"
npm.cmd run build
```

Start the backend host that serves both `/api/*` and the built frontend:

```powershell
cd "D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong\backend"
node .\server.js
```

Expected listening contract:

- `Host: 0.0.0.0`
- `Port: 5050`

## Firewall Rule

Allow inbound TCP `5050` on the Windows Private profile only:

```powershell
New-NetFirewallRule `
  -DisplayName "QIS V2 F1.3 LAN Viewer 5050" `
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
http://<SERVER_IPV4>:5050
```

Validated example on the current server machine:

- `http://10.47.33.24:5050`

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
- Do not expose `5050` to the public Internet.
