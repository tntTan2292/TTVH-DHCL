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
- [12. Implementation — READY FOR PO CHECK](#12-implementation--ready-for-po-check)
- [13. PO RUNTIME FAIL / REMEDIATION → READY FOR PO RECHECK](#13-po-runtime-fail--remediation--ready-for-po-recheck)
- [14. PO PASS — Closure](#14-po-pass--closure)

## 1. Purpose

This checkpoint is the current-state entry point for `NETWORK-MANAGEMENT-002`. It exists so a fresh AI session can immediately answer: is the ticket active, what is locked, what was discovered, what is permitted, and what to do next.

## 2. Program State

| Field | Value |
| --- | --- |
| Ticket | `NETWORK-MANAGEMENT-002` |
| Program State | `COMPLETED / PO PASS / CLOSED` (as of `2026-08-11`) — see Section 14 |
| Current Phase | Single-scope ticket (not phased like `NETWORK-MANAGEMENT-001`). Discovery (Section 11), implementation (Section 12), PO-runtime-fail remediation (Section 13), and PO PASS closure (Section 14) all complete. |
| Discovery Performed | `Yes` — read-only, delta-only, scoped to the two source map modules and the app's routing/nav/auth scaffolding. See Section 11. |
| Implementation Performed | `Yes` — Option B (manifest Section 8), then remediated for a PO-reported marker/route density issue (Section 13), then PO PASS (Section 14). |
| PO Gates Passed | `PASS` (Product Owner, `2026-08-11`) — confirmed the per-Loại-điểm remediation resolved the reported density issue. |
| Next State | `None — ticket CLOSED. No active ticket. AWAITING PO DIRECTION.` |

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

None. `NETWORK-MANAGEMENT-002` is `COMPLETED / PO PASS / CLOSED` (Section 14). No active ticket. State after closure: `AWAITING PO DIRECTION`.

## 8. Proposed Executor

Claude Code (Sonnet) — implementation, backend confirmation, frontend, tests, documentation, and Git, per the executor plan in `docs/10_TICKETS/NETWORK-MANAGEMENT-002_MANIFEST.md` Section 12. Antigravity is not anticipated to be needed (this ticket reuses two already-PO-approved UI patterns verbatim, no new UI/UX design or Windows-runtime evidence is expected), but may be engaged later if a visual/UX question arises during implementation.

## 9. Next PO Gate

The single PO Gate for this ticket — Product Owner UI acceptance of `/network-map/integrated` — is `PASS` (`2026-08-11`, Section 14). No further gate remains.

## 10. Current Blockers

None. Ticket `COMPLETED / PO PASS / CLOSED`.

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

## 12. Implementation — READY FOR PO CHECK (2026-08-11)

Product Owner/CTO approved Option B (manifest Section 8) and authorized implementation. Delivered exactly the locked scope (manifest Section 5) — no scope expansion.

**Files changed** (frontend-only, no backend/schema/migration):
- New `frontend/src/features/networkMap/IntegratedMap.jsx` — the single shared `<MapContainer>` + both layers + sidebar. Both layers default **on**. Re-implements `ServicePointsMap.jsx`'s marker/popup/legend/filter rendering and `Level2RoutesMap.jsx`'s route-overview/road-routing/`SelectedRouteJourneyLayer` (outbound/return, turnaround, spiderfy, direction arrows, mode toggle) verbatim, built on the same shared pure modules (`mapStyles.js`, `roadRoutingService.js`, `routeJourneyGeometry.js`) those two screens already use.
- New `frontend/src/features/networkMap/IntegratedMapPage.jsx` — fetches `getServicePoints()`/`getLevel2Routes()` independently (same `NetworkMapClient` methods the two source pages already use), owns per-layer loading/error/empty state.
- Modified `frontend/src/App.jsx` — new `<Route path="integrated">` under `network-map`, `ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}` (identical to the other 3 network-map routes).
- Modified `frontend/src/navigation/appNavigation.jsx` — one new entry ("Bản đồ tích hợp") in the existing `Quản lý mạng lưới` group.
- **Not modified, confirmed via `git diff --name-only`**: `ServicePointsMap.jsx`, `Level2RoutesMap.jsx`, their Page wrappers, any backend file, `schema.sql`, any migration, `auth/roles.js` (left untouched per explicit instruction — its `VIEWER_ALLOWED_PATH_PREFIXES` constant has no active consumer, so it was not touched "just in case").

**Validation performed**:
- `oxlint` clean on all new/changed files; full-repo `oxlint` shows only pre-existing, unrelated warnings.
- `vite build` succeeds (688 modules, no errors).
- `node --test` on the 3 relevant frontend suites (`networkMapRemediation.test.js`, `routeJourneyGeometry.test.js`, `NetworkMapClient.test.js`) — 53/53 pass, unchanged (none of these files were touched).
- Real-browser runtime verification (admin, logged in live): `/network-map/integrated` loads with real data (156 điểm phục vụ, 28 hành trình đường thư cấp 2) via existing APIs, both layers on by default. All 4 layer-toggle states confirmed independently: both on; only Điểm phục vụ (route list/legend for ĐTC2 disappear, its markers/lines gone from the map); only ĐTC2 (Điểm phục vụ legend/filter/zoom-overlay disappear, its markers gone); both off (empty map, only the two toggles remain). ĐTC2 route selection verified on Tuyến 6 — reproduces the exact known-good example from the original screen's PO-approved behavior: outbound stops 1-3 (BCVH Phú Lộc → Lộc Thủy → Thừa Lưu), turnaround at stop 4 (Lăng Cô), return stops 5-6 (Thừa Lưu → BCVH Phú Lộc), same-coordinate Thừa Lưu revisit spiderfied, mode toggle (Toàn hành trình/Chiều đi/Chiều về) and Quick Info Badge rendered correctly. Deselect ("✕ Bỏ chọn") verified — cleanly reverts to the 28-route overview. `ServicePointsPage`/`Level2RoutesPage` (the two original screens) re-verified live and render identically to before (156/156, 28 hành trình/1435 km, same legend counts, admin Import section unaffected).
- **Live viewer-role check not performed** — no viewer plaintext credential is available or appropriate to obtain (per the same precedent as the Phase 4 verification round, checkpoint Section 23). Role gating is confirmed by static code (`ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}`, byte-identical to the other 3 working network-map routes) — flagged as a PO checklist item.
- Data-integrity check: `network_service_point` (156), `network_level2_route` (28), `network_level2_route_stop` (148), `network_delivery_point` (287,759) all unchanged before/after — this feature performs zero writes. `fact_f13` moved (682,833, was 673,781 at the last recorded checkpoint) — unrelated background F1.3 activity in this live environment, not touched by this read-only, zero-write ticket. May/June BatchFile SHA-256 checksums unchanged; `Data QLML/` and both stashes (`stash@{0}`, `stash@{1}`) confirmed untouched.

**State**: `READY FOR PO CHECK`. Claude Code does not self-award PO PASS and does not declare this ticket closed. A concrete, ordered Product Owner runtime checklist was provided in the corresponding chat report.

## 13. PO RUNTIME FAIL / REMEDIATION → READY FOR PO RECHECK (2026-08-11)

**PO RUNTIME FAIL**: Product Owner reported that with both layers on (156 Điểm phục vụ + 28 tuyến ĐTC2), markers and route lines overlapped too heavily. The Điểm phục vụ layer only had a whole-layer on/off toggle — no way to reduce marker density by Loại điểm to make the combined map readable.

**Remediation, delta-only, scoped to `IntegratedMap.jsx` only** (no other file changed):

- Replaced the single-select "click a category to filter" legend behavior (inherited unmodified from the discovery-round port of `ServicePointsMap.jsx`'s pattern) with **independent per-Loại-điểm checkboxes**, all default **checked** (all types visible, matching the pre-existing "both layers open by default" contract).
- Category list is **derived from real data** (`Object.keys` of a stats map built by running every point in `points` through the existing shared `normalizeLoaiDiem()`), not a separately hand-typed array — a category present in the data can never be silently missing from the checkbox list.
- New `visibleCategories` state (object keyed by category, `false` = hidden) is seeded once per newly-seen category and otherwise never reset — so toggling the whole Điểm phục vụ layer off (which already fully unmounts its panel and markers, unchanged) and back on restores the exact same per-category selection from earlier in the session, satisfying the "restore previous selection" requirement without any special-case code.
- `filteredPoints` (what actually renders as markers) now also checks `visibleCategories[normCat] !== false`, combined with the existing (unchanged) status filter, "Hiện điểm Tạm dừng" toggle, and search — via a shared `passesNonCategoryFilters()` helper reused by both the marker filter and the new per-category "would show if checked" legend badges, so the two can never drift apart.
- Legend badges now show `visibleCount/totalCount` per category (visibleCount = how many of that category pass every *other* active filter) and the section header shows `đang hiện: {filteredPoints.length}/{points.length}` — both derived from the same filtering logic as the markers, so counts are provably consistent with what's on the map.
- ĐTC2 layer (`Level2RoutesMap.jsx`-derived code) and the two original screens (`ServicePointsMap.jsx`, `Level2RoutesMap.jsx`, their Pages) were **not touched** — confirmed via `git diff --name-only` showing only `IntegratedMap.jsx` changed.

**Validation**: `oxlint` clean; `vite build` succeeds; `node --test` on the 3 relevant frontend suites — 53/53 pass, unchanged. Real-browser re-verification as `admin`:
- All categories on (default): 151/156 shown (5 "Ngừng hoạt động" hidden by the unchanged default `showTamDung=false` rule) — matches the pre-remediation baseline exactly.
- Only 1 category checked (Văn hoá xã): 102/156 — exact match to that category's own count.
- Multiple categories checked (Văn hoá xã + Giao dịch + Văn phòng): 144/156 = 102+35+7 exactly.
- All categories unchecked: 0/156, zero Điểm phục vụ markers, ĐTC2 layer unaffected.
- Combined with status filter "Ngừng hoạt động" + a single category checked (Giao dịch): 2/156, matching exactly the "Tạm dừng" rows in that category (status-filter-bypasses-Tạm-dừng-hide rule confirmed unchanged and still composing correctly with the new category filter).
- Category filters unaffected by turning the ĐTC2 layer off, then back on.
- ĐTC2 route selection (Tuyến 6) re-verified working correctly *while* category filters are active — same known-good outbound/turnaround(Lăng Cô)/return/spiderfy behavior as before; deselect ("✕ Bỏ chọn") reverts cleanly. Category legend/state fully unaffected by route selection/deselection.
- `git diff --name-only` confirms only `IntegratedMap.jsx` changed — `ServicePointsMap.jsx`, `Level2RoutesMap.jsx`, their Pages, and every backend/schema/migration file remain untouched.
- `network_service_point`/`network_level2_route`/`network_level2_route_stop`/`network_delivery_point` unchanged (zero writes); `Data QLML/` and both stashes untouched.

**State**: `READY FOR PO RECHECK`. Claude Code does not self-award PO PASS and does not declare this ticket closed. A concrete, ordered Product Owner recheck checklist was provided in the corresponding chat report.

## 14. PO PASS — Closure (2026-08-11)

Product Owner performed the runtime recheck and explicitly confirmed `PO PASS`: the per-Loại-điểm checkbox filter (Section 13) resolved the reported marker/route overlap density issue. Product Owner explicitly authorized closing `NETWORK-MANAGEMENT-002`.

**Scope confirmed at closure**: one integrated read-only map screen at `/network-map/integrated` (`admin`+`viewer`), Điểm phục vụ and Đường thư cấp 2 layers independently toggleable (both default on), Điểm phục vụ further filterable per Loại điểm (independent checkboxes, derived from real data, default all-on, selection persists across the layer's own on/off toggle), all combining correctly with the existing status filter, "Hiện điểm Tạm dừng" toggle, search, and full ĐTC2 routing/journey-visual behavior (route selection, outbound/turnaround/return, spiderfy, direction arrows). No data duplication, no new database table, no dedicated Import/Export/History/Rollback for this screen. The two original screens (`ServicePointsMap.jsx`/`ServicePointsPage.jsx`, `Level2RoutesMap.jsx`/`Level2RoutesPage.jsx`) were never modified across the entire ticket (discovery Section 11, implementation Section 12, remediation Section 13) — confirmed by `git diff --name-only` at every round.

Documentation-only closure — no product code, schema, or database change made in this round. `Data QLML/` and both pre-existing stashes (`stash@{0}`, `stash@{1}`) confirmed untouched throughout the ticket's entire lifecycle.

**State**: `COMPLETED / PO PASS / CLOSED`. No active ticket. `AWAITING PO DIRECTION` for any next scope. `NETWORK-MANAGEMENT-001` remains separately `COMPLETED / PO FINAL PASS / CLOSED` (2026-08-10), unaffected. The Product Owner-named future "Bản đồ tổng thể mạng lưới" module remains noted only, not authorized, not self-activated by this closure.
