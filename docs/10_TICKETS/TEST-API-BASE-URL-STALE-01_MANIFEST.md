# TEST-API-BASE-URL-STALE-01 — MANIFEST

**Status:** IMPLEMENTED / CLOSED (2026-10-09). Executor: Claude Code (Sonnet 5.5). Test-only, LEVEL 1; `PO UI Check Required = No`.

## 1. Defect

`frontend/src/pages/dataImportBackfillQueue.test.js` failed in every frontend sweep (the only red test, present before F41-DASHBOARD-RANKING-01). It asserted the literal source text `VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5050/api'` inside `api/client.js`, but the client has since moved to `resolveApiBaseUrl()` (`api/apiBaseUrl.js`), which still supports both variables and defaults to port 5050. Stale assertion, not a product defect.

## 2. Fix

The assertion now checks that `client.js` uses `baseURL: resolveApiBaseUrl()` and exercises `resolveApiBaseUrl` itself for `VITE_API_BASE_URL`, `VITE_API_URL` and the default (`http://localhost:5050/api`). No product code changed.

## 3. Validation

`node --test $(find src -name "*.test.js")` in `frontend/`: all green (no remaining failure).
