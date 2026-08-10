# NETWORK-MANAGEMENT-002 — MANIFEST

## Table of Contents

- [1. Ticket Information](#1-ticket-information)
- [2. Objective](#2-objective)
- [3. Current Status](#3-current-status)
- [4. Required Reading](#4-required-reading)
- [5. Locked Scope](#5-locked-scope)
- [6. Locked Out Of Scope](#6-locked-out-of-scope)
- [7. Discovery Findings](#7-discovery-findings)
- [8. Implementation Approach — Recommendation](#8-implementation-approach--recommendation)
- [9. UI / Navigation / Access Control Plan](#9-ui--navigation--access-control-plan)
- [10. Expected File Changes](#10-expected-file-changes)
- [11. Test Plan](#11-test-plan)
- [12. Executor Plan](#12-executor-plan)
- [13. Authority Escalation](#13-authority-escalation)
- [14. Implementation Record — READY FOR PO CHECK](#14-implementation-record--ready-for-po-check)

## 1. Ticket Information

- Ticket ID: `NETWORK-MANAGEMENT-002`
- Ticket Name: Bản đồ tích hợp Điểm phục vụ + Đường thư cấp 2 (Integrated Service Points + Level-2 Mail Route Map)
- Phase: `IMPLEMENTATION COMPLETE — READY FOR PO CHECK` (`2026-08-11`). Product Owner/CTO approved Option B; implementation delivered and technically validated (Section 14). Awaiting Product Owner UI acceptance.
- Owner: Claude Code (implementation, backend, data, tests, documentation, Git per `DEC-020`)
- Governance Version: `V2 Active`
- Authorization: Product Owner, `2026-08-10` — explicit activation request naming `NETWORK-MANAGEMENT-002` and locking scope (Section 5) directly in the activation prompt
- Relationship to prior work: independent of `NETWORK-MANAGEMENT-001` (`COMPLETED / PO FINAL PASS / CLOSED`, `2026-08-10`) — this ticket does not reopen it, does not touch its code/data, and consumes its two already-shipped read modules (Mạng điểm phục vụ, Mạng đường thư cấp 2) as-is. This ticket's scope is narrower than the previously-noted, still-unauthorized "Bản đồ tổng thể mạng lưới" candidate (which named all three modules); this activation does not authorize that broader candidate.

## 2. Objective

Add exactly one new, read-only map screen that renders the existing Mạng điểm phục vụ and Mạng đường thư cấp 2 data together on a single Leaflet map, with each dataset shown as an independently toggleable layer — reusing the two source modules' already-PO-approved markers, popups, legend, routing, and interactions verbatim, without copying data into a new table or building any Import/Export/History/Rollback surface for this screen.

## 3. Current Status

- Current state: `READY FOR PO CHECK`, as of `2026-08-11`. Implementation delivered per locked scope (Section 5) via Option B; technically validated (Section 14). No PO PASS declared; ticket not closed.
- PO UI Check Required: `Yes` — see the runtime checklist in the corresponding chat report / checkpoint Section 12.
- PO Product Status: implementation technically complete, not yet PO-reviewed.

## 4. Required Reading

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. This manifest (Current Manifest)
5. `docs/06_REVIEWS/Shared/NETWORK-MANAGEMENT-002_CHECKPOINT_001.md` (Current Checkpoint)
6. For historical context only, not required reading: `docs/10_TICKETS/NETWORK-MANAGEMENT-001_MANIFEST.md` (closed program that built the two source modules this ticket reuses)

## 5. Locked Scope

Locked by explicit Product Owner instruction (`2026-08-10`), verbatim intent preserved:

1. Create exactly one integrated map screen.
2. Display data directly from the two source modules (Mạng điểm phục vụ, Mạng đường thư cấp 2) — no data duplication.
3. Independently show/hide the Điểm phục vụ layer and the ĐTC2 layer.
4. Preserve the marker, popup, legend, routing, and interaction behavior already approved by the Product Owner on the two source screens — reused, not redesigned.
5. No data copying; no new database table.
6. No dedicated Import/Export/History/Rollback for this screen.
7. No behavior change to the two original screens (`ServicePointsPage`/`ServicePointsMap`, `Level2RoutesPage`/`Level2RoutesMap`).
8. Do not fold the Shipment Detail / Evidence screens into this ticket.

## 6. Locked Out Of Scope

- Sơ đồ tuyến phát (delivery routes) as a third layer — not requested, not authorized here.
- Any database schema, migration, or new table.
- Any Import/Export/History/Rollback feature for the integrated screen.
- Any change to `NETWORK-MANAGEMENT-001`'s closed ticket state, code, or data.
- F1.3 Shipment Detail / Evidence screens.
- The broader, still-unauthorized "Bản đồ tổng thể mạng lưới" candidate (this ticket is a narrower, separately-authorized scope, not that candidate).
- Repo-wide audit; `Data QLML/`; either pre-existing git stash.

## 7. Discovery Findings

Read-only discovery of the two source modules and the app's routing/nav/auth scaffolding, `2026-08-10`:

- **Data access is already reusable, zero backend change needed.** Both source pages fetch via existing `frontend/src/api/NetworkMapClient.js` methods — `getServicePoints()` → `GET /api/network-map/service-points`, `getLevel2Routes()` → `GET /api/network-map/level2-routes` — both already `admin`+`viewer` readable, unfiltered, no query parameters required. The integrated screen can call both directly; no new endpoint, no new table, no migration.
- **Both source Map components are self-contained, monolithic units.** `ServicePointsMap.jsx` (~16 KB) and `Level2RoutesMap.jsx` (~34 KB) each own their own `<MapContainer>` + `<TileLayer>` + all marker/popup/polyline JSX + their own filter/legend sidebar, in one file. Neither exposes a reusable "layer-only" component today.
- **Shared building blocks already exist and are reusable as-is** (pure modules, not tied to either page): `mapStyles.js` (shared map constants — `HUE_MAP_CENTER`, `HUE_MAP_DEFAULT_ZOOM`, OSM tile config, marker SVG builders — both screens already center on the identical coordinates/zoom, so hosting both layers on one shared `<MapContainer>` is geometrically consistent with zero adjustment); `roadRoutingService.js` (OSRM road routing, timeout/fallback/bounds-exclusion, already shared by both ĐTC2 and Sơ đồ tuyến phát); `routeJourneyGeometry.js` (ĐTC2 selected-route outbound/turnaround/return classification + spiderfy + arrow density, currently only consumed by `Level2RoutesMap.jsx`).
- **ĐTC2's full approved interaction is non-trivial to reproduce.** "Routing và tương tác đã được PO duyệt" for Mạng đường thư cấp 2 includes: real road-routed polylines (not straight lines) for all 28 routes on the unselected overview, and — on selecting a route — the full journey-visual mode (outbound/turnaround/return classification, same-coordinate marker spiderfying, direction arrows scaled to leg length, consolidated per-location popups, two-way hover/click sync). This is the single largest implementation-complexity item in this ticket; it is not optional under the PO's "keep approved routing and interaction" instruction, since route selection is normal, expected ĐTC2 usage, not a separate advanced mode.
- **Nav/routing wiring is a simple, established pattern.** `frontend/src/App.jsx` mounts the 3 existing screens under `<Route path="network-map">` with `<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}>`; `frontend/src/navigation/appNavigation.jsx`'s `Quản lý mạng lưới` nav group lists the same 3 entries with no per-item role restriction. A 4th entry follows byte-for-byte the same pattern.
- **One latent gap found, unrelated to this ticket's own risk**: `frontend/src/auth/roles.js` exports `VIEWER_ALLOWED_PATH_PREFIXES`, a hardcoded allowlist already containing the 3 existing `/network-map/*` paths — but a repo-wide search found **zero consumers** of this constant anywhere else in the frontend; it is currently dead configuration, not an active gate. Noted for completeness; the new path should still be added to it for consistency with the other 3 entries, in case it is wired up later, but it is not currently load-bearing for viewer access (that access is enforced by `ProtectedRoute`'s `allowedRoles`, which already gates the other 3 pages correctly).
- **No existing automated component/visual tests exist for any of the 3 current map screens** (`ServicePointsMap`/`Level2RoutesMap`/`DeliveryRoutesMap` have zero dedicated `*.test.jsx` files) — established project precedent for this feature area is: unit-test only pure/extracted logic modules (`mapStyles.js`-style helpers, `routeJourneyGeometry.js`), and rely on real-browser Claude Code technical verification plus Product Owner UI acceptance for the rendered map itself. This ticket should follow the same precedent, not introduce a new testing standard unilaterally.

## 8. Implementation Approach — Recommendation

Two viable approaches were identified; **Option B is recommended** as the default unless CTO/PO prefers Option A:

- **Option A — extract shared layer components.** Refactor the marker/popup/legend/filter rendering out of `ServicePointsMap.jsx` and the marker/polyline/routing/journey rendering out of `Level2RoutesMap.jsx` into new, reusable "layer" components (e.g. `ServicePointsLayer.jsx`, `Level2RoutesLayer.jsx`) that render inside any `<MapContainer>`. Both original pages are refactored to consume these extracted layers (a behavior-preserving refactor, not a redesign); the new integrated screen imports both layers into one shared map. *Pro*: single source of truth — a future fix to either layer's rendering applies everywhere at once, eliminating drift. *Con*: touches both existing, already-PO-approved files; "no behavior change to the two original screens" then must be proven (visual/interaction equivalence), not merely assumed from "the files weren't touched."
- **Option B — zero-touch to the two original files (recommended default).** Leave `ServicePointsMap.jsx` and `Level2RoutesMap.jsx` completely unmodified. Build the new integrated screen as an independent component that imports the same shared pure modules (`mapStyles.js`, `roadRoutingService.js`, `routeJourneyGeometry.js`) already used by both originals, and re-implements the marker/popup/polyline/legend JSX for its own two layers. *Pro*: zero regression risk to the two original, already-PO-approved screens — they are provably untouched, satisfying the "no behavior change" lock at the file level, not just visually. *Con*: some JSX is duplicated between the original screens and the new one; a future visual fix to (for example) the ĐTC2 arrow rendering would need to be applied in two places until a later, separately-authorized refactor consolidates them.

This is a technical implementation choice, not a business-rule or product-behavior decision — Claude Code will proceed with Option B by default at implementation time unless the Product Owner or CTO specifies otherwise before that round begins.

## 9. UI / Navigation / Access Control Plan

- **New page**: `frontend/src/features/networkMap/IntegratedMap.jsx` (name indicative, confirmed at implementation time), read-only — no admin-only Import/Export/History/Rollback section (none is in scope), so no `NetworkAdminSection` wiring is needed at all, unlike the 3 existing pages.
- **Layout**: single `<MapContainer>` centered on the same `HUE_MAP_CENTER`/`HUE_MAP_DEFAULT_ZOOM` both source screens already use; two independent checkbox toggles ("Hiện Điểm phục vụ" / "Hiện ĐTC2"), styled consistently with the existing "Hiện điểm Tạm dừng" toggle pattern already used in `ServicePointsMap.jsx`'s sidebar (not Leaflet's native `LayersControl` widget, to stay visually consistent with the rest of the app rather than introducing a second, differently-styled toggle UI).
- **Data fetching**: on mount, call `networkMapClient.getServicePoints()` and `networkMapClient.getLevel2Routes()` independently (both already unauthenticated-safe reads gated by the existing session, same as the two source pages); each layer's own loading/empty/error state is shown via the existing `MapStateBanner` component, matching the two source pages' pattern.
- **Route**: `App.jsx` — new `<Route path="integrated" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><IntegratedMap /></ProtectedRoute>} />` nested under the existing `<Route path="network-map">`, at `/network-map/integrated`.
- **Navigation**: `navigation/appNavigation.jsx` — one new entry in the existing `Quản lý mạng lưới` group, same icon family, no per-item `roles` restriction (matching the other 3 entries, whose access is enforced by `ProtectedRoute`, not the nav config).
- **Access control**: identical to the 3 existing network-map screens — `admin` and `viewer` both get read access; there is no admin-only action on this screen at all, since Import/Export/History/Rollback are explicitly out of scope.

## 10. Expected File Changes (at implementation time; none changed in this discovery round)

Frontend-only — no backend, schema, or migration file is expected:

- **New**: `frontend/src/features/networkMap/IntegratedMap.jsx` (page + map, Option B: self-contained)
- **Modify**: `frontend/src/App.jsx` — add the new route
- **Modify**: `frontend/src/navigation/appNavigation.jsx` — add the new nav entry
- **Modify (minor, defensive)**: `frontend/src/auth/roles.js` — add `/network-map/integrated` to `VIEWER_ALLOWED_PATH_PREFIXES` for consistency, even though this constant currently has no active consumer
- **No changes anticipated**: `ServicePointsMap.jsx`, `Level2RoutesMap.jsx`, `ServicePointsPage.jsx`, `Level2RoutesPage.jsx`, any backend file, `schema.sql`, any migration script, `NetworkMapClient.js` (its existing `getServicePoints`/`getLevel2Routes` methods are reused unchanged)

## 11. Test Plan

- `oxlint` clean on all new/changed frontend files.
- `vite build` succeeds.
- Regression proof for the "no behavior change to the two original screens" lock: `git diff --name-only` confirms `ServicePointsMap.jsx`/`Level2RoutesMap.jsx`/their Page wrappers are absent from the changed-file list (Option B); if Option A is chosen instead, a real-browser side-by-side comparison of both original screens before/after is required and must be recorded as evidence.
- Real-browser technical verification by Claude Code (matching this project's established precedent for map screens — no dedicated component test suite exists for any of the 3 current map screens either): both layers render with real data; each toggle independently shows/hides its own layer without affecting the other; Điểm phục vụ layer markers/popups/legend match the source screen's rendering; ĐTC2 layer's route overview and selected-route journey view (routing, arrows, spiderfy) match the source screen's rendering; role gating confirmed (`admin`+`viewer` can open the page).
- Data-integrity check: no migration file created; `network_service_point`, `network_level2_route`, `network_level2_route_stop` row counts unchanged before/after (trivially true for a read-only feature, confirmed anyway); `Data QLML/` untouched; both stashes untouched.
- PO UI acceptance: per governance, Claude Code stops at `READY FOR PO CHECK` with a concise manual checklist once implementation is technically verified; Claude Code does not self-award PO PASS for this or any ticket.

## 12. Executor Plan

- Claude Code (Sonnet): implementation, backend confirmation (none expected), frontend, tests, documentation, Git — per `DEC-020`.
- Antigravity: not required for this ticket unless a UI/UX or Windows-runtime-specific need is identified during implementation (none anticipated; this reuses two already-PO-approved UI patterns verbatim).

## 13. Authority Escalation

No escalation required. This activation directly executes explicit Product Owner authorization (`2026-08-10`) naming `NETWORK-MANAGEMENT-002` and locking its scope (Section 5) in the same instruction. No conflict was found with current repository governance state (`PROJECT_SNAPSHOT.md` showed `Current Ticket = None / AWAITING PO DIRECTION` immediately prior to this activation, with `NETWORK-MANAGEMENT-001` `COMPLETED / PO FINAL PASS / CLOSED` and not reopened by this ticket).

## 14. Implementation Record — READY FOR PO CHECK (2026-08-11)

Product Owner/CTO approved Option B (Section 8) and authorized implementation. Delivered exactly the locked scope (Section 5) — no scope expansion, no code touched beyond what follows.

**Files changed**:
- New `frontend/src/features/networkMap/IntegratedMap.jsx` — single shared `<MapContainer>`, both layers default on, re-implements `ServicePointsMap.jsx`'s and `Level2RoutesMap.jsx`'s approved rendering (including full ĐTC2 selection/routing/journey-visual behavior) on the same shared pure modules those two screens already use.
- New `frontend/src/features/networkMap/IntegratedMapPage.jsx` — fetches both datasets via the existing `NetworkMapClient` methods.
- Modified `frontend/src/App.jsx` — new `/network-map/integrated` route, `ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}`.
- Modified `frontend/src/navigation/appNavigation.jsx` — one new nav entry.
- **Not modified**: `ServicePointsMap.jsx`, `Level2RoutesMap.jsx`, their Page wrappers, any backend file, `schema.sql`, any migration, `auth/roles.js` (left untouched per explicit instruction not to edit dead configuration defensively).

**Validation**: `oxlint` clean, `vite build` succeeds, 53/53 relevant frontend tests pass (unchanged files). Real-browser verification as `admin`: real data loads (156 điểm, 28 hành trình); all 4 layer-toggle states (both on / only Điểm phục vụ / only ĐTC2 / both off) confirmed independently; ĐTC2 route selection on Tuyến 6 reproduces the exact known-good outbound/turnaround/return/spiderfy behavior; deselect reverts cleanly; the two original screens re-verified to render identically to before. Live viewer-role check not performed (no credential available, same precedent as the closed `NETWORK-MANAGEMENT-001` Phase 4 round) — flagged as a PO checklist item; role gating confirmed by static code instead. `network_service_point`/`network_level2_route`/`network_level2_route_stop`/`network_delivery_point` row counts unchanged (zero writes); `Data QLML/` and both stashes untouched. Full detail: checkpoint Section 12.

**State**: `READY FOR PO CHECK`. Not PO PASS, not closed.
