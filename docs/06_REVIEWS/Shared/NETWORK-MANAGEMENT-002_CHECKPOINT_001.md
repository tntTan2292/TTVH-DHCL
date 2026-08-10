# NETWORK-MANAGEMENT-002 — CHECKPOINT 001

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. Program State](#2-program-state)
- [3. Baseline](#3-baseline)
- [4. Allowed Scope](#4-allowed-scope)
- [5. Locked Scope](#5-locked-scope)
- [6. Required Reading](#6-required-reading)
- [7. Exact Next Action](#7-exact-next-action)
- [8. Proposed Executor](#8-proposed-executor)
- [9. Next PO Gate](#9-next-po-gate)
- [10. Current Blockers](#10-current-blockers)
- [11. Discovery — Delta-Only, Read-Only](#11-discovery--delta-only-read-only)

## 1. Purpose

This checkpoint is the current-state entry point for `NETWORK-MANAGEMENT-002`. It exists so a fresh AI session can immediately answer: is the ticket active, what is locked, what was discovered, what is permitted, and what to do next.

## 2. Program State

| Field | Value |
| --- | --- |
| Ticket | `NETWORK-MANAGEMENT-002` |
| Program State | `DISCOVERY + PLANNING COMPLETE` — manifest and this checkpoint created, no product code changed (as of `2026-08-10`) |
| Current Phase | Single-scope ticket (not phased like `NETWORK-MANAGEMENT-001`). Discovery complete (Section 11); implementation not started. |
| Discovery Performed | `Yes` — read-only, delta-only, scoped to the two source map modules and the app's routing/nav/auth scaffolding. See Section 11. |
| Implementation Performed | `No` — no product code, schema, or database change made in this round. |
| PO Gates Passed | None yet — implementation has not started. |
| Next State | Awaiting a Product Owner/CTO go-ahead to begin implementation (Option B default per manifest Section 8, unless redirected). |

## 3. Baseline

- Authoritative baseline commit at ticket activation: `5c0ff1bc` (branch `codex/da-impl-006`) — the exact commit at which `NETWORK-MANAGEMENT-001` was `COMPLETED / PO FINAL PASS / CLOSED`.
- Branch: `codex/da-impl-006`.
- Immediately prior repository state: no active ticket, `AWAITING PO DIRECTION` (`PROJECT_SNAPSHOT.md`), confirmed before this activation.
- `NETWORK-MANAGEMENT-001` is not reopened, not touched, and not referenced as a dependency by this ticket beyond reusing its two already-shipped, read-only data modules (Mạng điểm phục vụ, Mạng đường thư cấp 2) exactly as they exist today.
- 02 pre-existing stashes, confirmed present and untouched at activation:
  - `stash@{0}` — `F13-SHIPMENT-001: preserved Shipment Performance Center delay/status changes` (deferred, pending PO reactivation)
  - `stash@{1}` — `pre-existing HTML maps outside F13 Phase 0 scope`
- `Data QLML/` not accessed in this ticket's discovery round — this ticket consumes only already-imported, already-live database data via existing read APIs, never the source Excel/HTML files directly.

## 4. Allowed Scope

For this discovery-and-planning step only:

- Read-only inspection of the two source map modules' frontend code, their shared API client, the app's routing/navigation/auth-role scaffolding, and their backend read endpoints (read the controller/route wiring; no backend files modified).
- Create this checkpoint and the ticket manifest (`docs/10_TICKETS/NETWORK-MANAGEMENT-002_MANIFEST.md`).
- Update the minimal set of live-state governance documents needed to register this ticket as active (`PROJECT_SNAPSHOT.md`, `PROJECT_STATUS.md`, `README_AI.md`, `DOCUMENT_INDEX.md`, `PROJECT_PROGRESS.md`).
- Propose (not implement) a concrete implementation approach, UI/navigation/access-control plan, expected file-change list, and test plan (manifest Sections 8-11).

## 5. Locked Scope

Locked product decisions and locked out-of-scope items are recorded once in `docs/10_TICKETS/NETWORK-MANAGEMENT-002_MANIFEST.md` Sections 5-6 and are not duplicated here; read them there. In summary: one integrated read-only map screen, reusing the two source modules' data and already-approved UI/interaction verbatim, independently toggleable layers, no data copy, no new table, no dedicated Import/Export/History/Rollback, no behavior change to the two original screens, no Shipment Detail/Evidence merge, no Sơ đồ tuyến phát layer, no repo-wide audit, `Data QLML/` and both stashes untouched.

Not permitted under this checkpoint or this ticket's current activation step:

- Any product code, schema, or database change (deferred to a future, separately-scoped implementation round).
- Reopening or modifying `NETWORK-MANAGEMENT-001`.
- Adding scope items not present in the Product Owner's locked list (manifest Section 5) — in particular, no Sơ đồ tuyến phát layer, no Import/Export/History/Rollback surface, no F1.3 Shipment Detail/Evidence merge.
- Re-auditing `Data QLML/` or any source Excel/HTML file — this ticket consumes only already-live database data via existing read APIs.

## 6. Required Reading

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. `docs/10_TICKETS/NETWORK-MANAGEMENT-002_MANIFEST.md` (Current Manifest)
5. This checkpoint (Current Checkpoint)

## 7. Exact Next Action

Awaiting a Product Owner or CTO go-ahead to begin implementation. Default implementation approach if none is specified: manifest Section 8's Option B (zero-touch to the two original source files). Claude Code will not write product code for this ticket until that go-ahead is given, per the explicit instruction that this round is discovery-and-planning only.

## 8. Proposed Executor

Claude Code (Sonnet) — implementation, backend confirmation, frontend, tests, documentation, and Git, per the executor plan in `docs/10_TICKETS/NETWORK-MANAGEMENT-002_MANIFEST.md` Section 12. Antigravity is not anticipated to be needed (this ticket reuses two already-PO-approved UI patterns verbatim, no new UI/UX design or Windows-runtime evidence is expected), but may be engaged later if a visual/UX question arises during implementation.

## 9. Next PO Gate

Not yet defined — this is a single-scope ticket, not phased. The first (and only currently anticipated) PO Gate will be the Product Owner's UI acceptance of the finished integrated map screen once implementation completes and Claude Code hands off a `READY FOR PO CHECK` checklist.

## 10. Current Blockers

None for discovery/planning — complete. Implementation is blocked only on an explicit Product Owner/CTO go-ahead (and, optionally, a preference between Option A/B in manifest Section 8, though Claude Code will default to Option B absent one).

## 11. Discovery — Delta-Only, Read-Only (2026-08-10)

Full findings are recorded in `docs/10_TICKETS/NETWORK-MANAGEMENT-002_MANIFEST.md` Section 7 (not duplicated here in full); summary:

- Both source screens already read via existing, `admin`+`viewer`-readable, unfiltered endpoints (`GET /api/network-map/service-points`, `GET /api/network-map/level2-routes`) through `frontend/src/api/NetworkMapClient.js`'s existing `getServicePoints()`/`getLevel2Routes()` methods — zero backend/schema/migration work needed for this ticket.
- Both source Map components (`ServicePointsMap.jsx` ~16 KB, `Level2RoutesMap.jsx` ~34 KB) are self-contained, each owning its own `<MapContainer>` and all marker/popup/polyline/legend/filter JSX in one file; neither currently exposes a reusable "layer-only" component.
- Shared pure modules already exist and are directly reusable regardless of which implementation option is chosen: `mapStyles.js` (constants + marker SVG builders — both screens already share identical map center/zoom), `roadRoutingService.js` (OSRM road routing with timeout/fallback/bounds-exclusion), `routeJourneyGeometry.js` (ĐTC2 selected-route journey visual classification/spiderfy/arrows).
- The ĐTC2 layer's full PO-approved interaction (real road routing on the 28-route overview, plus the complete selected-route journey-visual mode) is the ticket's main implementation-complexity item — route selection is normal ĐTC2 usage, not an optional extra, so it must be reproduced in full under the "keep approved routing and interaction" lock.
- Nav/routing wiring (`App.jsx`, `navigation/appNavigation.jsx`) follows an established, simple, copy-pattern for adding a 4th `network-map` screen.
- One latent, ticket-unrelated gap noted: `auth/roles.js`'s `VIEWER_ALLOWED_PATH_PREFIXES` constant already lists the 3 existing `/network-map/*` paths but has zero consumers anywhere in the frontend today (dead configuration, not an active gate) — the new path should still be added for consistency, but viewer access is actually enforced by `ProtectedRoute`'s `allowedRoles`, which already works correctly for the 3 existing pages.
- No dedicated component/visual automated tests exist for any of the 3 current map screens — established project precedent is real-browser technical verification + Product Owner UI acceptance for the rendered map, with automated tests reserved for extracted pure logic. This ticket's test plan (manifest Section 11) follows the same precedent.

No product code, schema, or database change was made during this discovery. `Data QLML/` and both stashes confirmed untouched.
