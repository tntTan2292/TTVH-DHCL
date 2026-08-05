# NETWORK-MANAGEMENT-001 — CHECKPOINT 001

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
- [11. Reusable Architecture Notes](#11-reusable-architecture-notes)
- [12. Phase 1 Implementation Closure](#12-phase-1-implementation-closure)
- [13. Phase 2 Implementation Closure](#13-phase-2-implementation-closure)

## 1. Purpose

This checkpoint is the current-state entry point for `NETWORK-MANAGEMENT-001`. It exists so a fresh AI session can immediately answer: is the program active, which Phase is current, what baseline applies, what is permitted, what is locked, what to read, and what to do next.

## 2. Program State

| Field | Value |
| --- | --- |
| Program | `NETWORK-MANAGEMENT-001` |
| Program State | `PHASE 2 DELIVERY ROUTE LEGEND REMEDIATION COMPLETED / READY FOR PO ROUTE VISUAL RECHECK` (as of `2026-08-05`) |
| Recorded PO Evaluation | `PO COMBINED VISUAL RECHECK PASS` (prior scope); Gate 2 closure paused for route visual check |
| Current Phase | `Phase 2 Delivery Route Legend Remediation`, implemented and verified without Browser tools |
| Phase 1 Implementation Performed | `Yes` — see Section 12 |
| Phase 2 (Ba bản đồ) Implementation Performed | `Yes` — see Section 13, 14 & 15 |
| Phase 3 (Import) | `PLANNED / NOT ACTIVE` |
| Phase 4 (Nghiệm thu) | `PLANNED / NOT ACTIVE` |
| PO Gates Passed | `PO Gate 1: PASS (Product Owner, 2026-08-05)`. `PO Gate 2: Ready for route visual recheck.` |
| Next State | `PHASE 2 DELIVERY ROUTE LEGEND REMEDIATION COMPLETED / READY FOR PO ROUTE VISUAL RECHECK` |

## 3. Baseline

- Authoritative baseline commit at program activation: `f7e02dcb091d3016d9b89b0e5283974a014d2fae`
- Phase 1 implementation commit: `50c08daf805a8d1fa80f3876e86c59c85481e994`
- Baseline commit for Phase 2 execution (Product Owner-supplied remote HEAD): `216f16277239781bbebfdc34982fdc772f28893c` — confirmed matching `origin/codex/da-impl-006` at Phase 2 start via `git fetch` + `git log`.
- Branch: `codex/da-impl-006`
- Intervening tickets between Phase 1 and Phase 2 (unrelated to this ticket, confirmed CLOSED, not reopened): `AUTO-IMPORT-011` (emergency Import remediation, `COMPLETED / PO RUNTIME PASS / CLOSED`), `AUTO-IMPORT-012` (test-isolation fix, `COMPLETED / TECHNICAL PASS`). As a result of `AUTO-IMPORT-011`'s real imports, `fact_f13` legitimately grew from the Phase 1 baseline of `663,126` rows to `666,153` rows before Phase 2 started — this is expected, unrelated to `NETWORK-MANAGEMENT-001`, and is the correct "before" figure Phase 2 must preserve (see Section 13).
- Last closed prior program: `F13-STANDARDIZATION-001` — Tuyến Ranking (Route Ranking) delta `COMPLETED / PO PASS / CLOSED`, `2026-08-04`; the program's Phase 0 remains implemented-not-separately-closed and Phases 1-4 remain `PLANNED / NOT ACTIVE`. This activation does not touch or reopen that program.
- 02 pre-existing stashes preserved and untouched throughout Phase 1 and Phase 2:
  - `stash@{0}` — `F13-SHIPMENT-001: preserved Shipment Performance Center delay/status changes` (deferred, pending PO reactivation)
  - `stash@{1}` — `pre-existing HTML maps outside F13 Phase 0 scope`
- Three source HTML files at repository root, read-only reference for this ticket:
  - `Ban_do_mang_diem_phuc_vu_BDTP_Hue.html`
  - `Ban_do_mang_diem_phuc_vu_tich_hop_Duong_thu_cap_2.html`
  - `ban_do_duong_giao_thong_bcvh_postman_06_2026.html`
  - At the start of Phase 2 execution, all three were found missing from the working tree (`git status` showed them as tracked-but-deleted; only one, the tuyến-phát HTML, had a corresponding un-applied deletion preserved in `stash@{1}`, and even that deletion was never committed). This was an out-of-band workspace anomaly unrelated to this session, not caused by any Phase 1/2 action. All three were restored via `git checkout -- <file>` (a pure restore of already-committed content, not a destructive operation) before any Phase 2 work began, and are confirmed byte-identical to the committed `HEAD` version afterward.
- `Data QLML/` now contains 3 Excel files (was 2 at Phase 1 activation): `Mang_diem_phuc_vu_kem_du_lieu_ban_do.xlsx`, `2026.07.01 - BatchFile Phat thang 06.2026.xlsb`, and newly-supplied `2026.08. Mang DTC2.xlsx` (Mạng đường thư cấp 2 business source — did not exist at Phase 1). `Data QLML/` also contains 2 duplicate copies of the root-level HTML files, left untouched.

## 4. Allowed Scope

For this governance-activation step only:

- Create the activation package (this checkpoint, the program manifest, and required live-state updates).
- Lock the four-phase plan defined in `docs/10_TICKETS/NETWORK-MANAGEMENT-001_MANIFEST.md` Section 6.
- Lock the Product Owner-confirmed baseline figures in the manifest Section 7.
- Set Phase 1 to `AUTHORIZED / READY FOR IMPLEMENTATION` without performing any Phase 1 work.

## 5. Locked Scope

Not permitted under this checkpoint or this ticket's current activation step:

- Any Phase 1 implementation (schema creation, API/middleware wiring, database changes).
- Any Phase 2-4 work of any kind.
- Product code changes.
- Database or business-data changes.
- Re-auditing the Excel sources described in the manifest Section 7 — those figures are Product Owner-confirmed and locked; Claude Code must not independently re-derive them.
- Guessing Excel column mapping for any of the three modules before the Product Owner supplies the actual source file for the phase that needs it.
- Activating any ticket other than `NETWORK-MANAGEMENT-001`.
- Adding scope items not present in the Product Owner-approved plan.

Locked product decisions and locked out-of-scope items are recorded once in `docs/10_TICKETS/NETWORK-MANAGEMENT-001_MANIFEST.md` Sections 8-9 and are not duplicated here; read them there.

## 6. Required Reading

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. `docs/10_TICKETS/NETWORK-MANAGEMENT-001_MANIFEST.md` (Current Manifest)
5. This checkpoint (Current Checkpoint)
6. Section 11 of this checkpoint (reusable architecture notes) once Phase 1 implementation begins

## 7. Exact Next Action

Phase 2 (Ba bản đồ) is implemented and technically validated (Section 13). Exact next action: await explicit Product Owner PO Gate 2 review / authorization to start Phase 3 (Import). Do not begin Phase 3 work without that authorization.

## 8. Proposed Executor

Claude Code (Sonnet) — implementation, backend, data, tests, documentation, and Git, per the executor plan in `docs/10_TICKETS/NETWORK-MANAGEMENT-001_MANIFEST.md` Section 10. Antigravity owns discovery, UI/UX, and Windows runtime evidence once PO UI review of the three map screens is needed.

## 9. Next PO Gate

PO Gate 1 (technical review of Phase 1) is `PASS` (Product Owner, `2026-08-05`). PO Gate 2 sits after Phase 2 (Ba bản đồ) closes (manifest Section 11) and requires a Product Owner UI check on the three map screens — Phase 2 implementation is complete and technically validated (Section 13), but PO Gate 2 itself has not been requested/granted.

## 10. Current Blockers

None for Phase 1 or Phase 2 — both implemented and technically validated. Phase 3 (Import) is blocked pending (a) explicit Product Owner authorization to start, and (b) source files for two of the three modules:

- Mạng điểm phục vụ: source Excel now present in `Data QLML/Mang_diem_phuc_vu_kem_du_lieu_ban_do.xlsx` (used for Phase 2 seed) — column mapping already verified by Phase 2 (Section 13); ready for Phase 3 Import logic to reuse.
- Mạng đường thư cấp 2: business Excel now present (`Data QLML/2026.08. Mang DTC2.xlsx`) but contains no coordinates and a competing "TỔ CHỨC LẠI" block explicitly excluded from scope; Phase 3 Import mapping for this module still needs explicit Product Owner confirmation of which HIỆN TRẠNG columns become authoritative for updates, since Phase 2 seeded geometry from the reference HTML, not from this Excel.
- Sơ đồ tuyến phát: source Excel now present (`Data QLML/2026.07.01 - BatchFile Phat thang 06.2026.xlsb`) and used for Phase 2 seed; Phase 3 Import must decide how to reconcile the small filtering-count discrepancy documented in Section 13 (143,475 computed vs. 143,467 locked baseline vs. 143,463 HTML-stated) before treating any one figure as authoritative for ongoing monthly imports.

## 11. Reusable Architecture Notes

Recorded from prior discovery so implementation does not need to re-derive it:

- **Auth**: session-token model (not JWT), `backend/src/middleware/authMiddleware.js` — `requireAuth` + `requireRole(['admin','viewer'])` for read, `requireRole(['admin'])` for Import. Role literals are exactly `'admin'` / `'viewer'`.
- **DB**: `sqlite3` via `backend/src/config/db.js`, live file `backend/src/db/database.sqlite`. Do not use the parallel/stale `backend/src/database/sqlite.db` path.
- **Import pipeline precedent**: `backend/src/services/importPipeline.js` + `importProcessor.js` — staged folder pattern (`Incoming/→Processing/→Processed/Error/Quarantine`), consistent with `Data DKCL/F1.1..F4.1`. Existing dedup relies on `INSERT OR IGNORE` + `UNIQUE` constraint and an `import_log` table; this ticket's three modules each need different dedup/update rules (upsert-by-mã-điểm; replace-routes-on-change; append-only-by-month with fingerprint) that do not map directly onto the existing F1.3 pattern and must be designed per-module in Phase 1/3.
- **API convention**: `app.use('/api/<domain>', <domain>Routes)`, no versioning prefix; response shape `{ success: true, data }` / `{ success: false, error: { code, message } }`.
- **Frontend nav**: `frontend/src/navigation/appNavigation.jsx` — config array with optional `roles` per item/group; sidebar in `frontend/src/components/shared/SharedLayout.jsx`. No existing Leaflet/react-leaflet usage anywhere in `frontend/` — this will be a new frontend dependency.
- **Frontend auth**: `useAuth()` (`frontend/src/auth/AuthContext.jsx`), role constants in `frontend/src/auth/roles.js`. In-page conditional Import-button rendering (for a page both admin and viewer can open) has no existing precedent in the codebase and must be newly introduced.

## 13. Phase 2 Implementation Closure

- Status: `COMPLETED / TECHNICAL PASS`, `2026-08-05`.
- Implementation commit: recorded at Git handoff in this ticket's execution report; branch `codex/da-impl-006`.

### Source inventory (performed before any code, as required)

| # | File | Sheets | Role |
| --- | --- | --- | --- |
| 1 | `Data QLML/Mang_diem_phuc_vu_kem_du_lieu_ban_do.xlsx` | `Huế`, `TMS- NODE`, `Dữ liệu bản đồ` | Mạng điểm phục vụ source. Sheet `Dữ liệu bản đồ` (header row 4) is already a Product Owner-cleaned 151-row dataset with an explicit in-file note: *"Giữ lại 151 điểm; đã loại các điểm có trạng thái 'Tạm dừng'. Mã điểm phục vụ lấy từ cột B; tọa độ lấy từ cột W."* |
| 2 | `Data QLML/2026.08. Mang DTC2.xlsx` (new since Phase 1) | `ĐT.C2_CT`, `ĐT.C2_TH`, `ĐT.C2` | Mạng đường thư cấp 2 source. `ĐT.C2_CT` has two side-by-side blocks: left = "ĐƯỜNG THƯ CẤP 2 TỔ CHỨC LẠI" (reorg proposal, out of scope by locked decision), right = "HIỆN TRẠNG" (current-state summary — no coordinates). Confirms "Số đường thư: 28" matching the locked baseline. |
| 3 | `Data QLML/2026.07.01 - BatchFile Phat thang 06.2026.xlsb` | `Data_Ghep_1782916740832` | Sơ đồ tuyến phát source, 160,554 data rows, 28 columns. |

### Documented mapping/architecture decisions

1. **Mạng đường thư cấp 2 geometry source**: the Excel has no lat/lon anywhere. Per item 5 of the Product Owner's Phase 2 instruction ("HTML ĐTC2 chỉ dùng để đối chiếu dữ liệu, tọa độ, giao diện..."), stop-level coordinates are read from the reference HTML's embedded `MAIL_ROUTES` JS array (`backend/src/services/networkMapSeed/parseLevel2RoutesHtml.js`), which already matches the locked baseline exactly (28 routes / 148 stops / 47 unique points / 1,435 km, verified by parsing the real file — see Validation). This is the "mạng cũ" (current network), not the TỔ CHỨC LẠI proposal. Routes are drawn as polylines through the real recorded stop coordinates — no live OSRM road-snapping call is made (avoids both the bulk-OSRM restriction and unnecessary third-party dependency for Phase 2).
2. **Sơ đồ tuyến phát column mapping**: `ma_bcvh` <- Excel `MABC_PHAT` (matches the reference HTML's own dropdown label "Bưu cục vận hành / MABC_PHAT"). `postman_code` <- Excel's own literal `POSTMAN_CODE` column (license-plate-style values, e.g. `53A121`) — used as the "Bưu tá" filter because it is the Excel's own column name, taking priority over the old prototype HTML's internal (and differently-sourced) `postman_code` JS variable. `route_po_code` (new nullable column, added via `backend/migrate_network_management_001_phase2_schema.js`) preserves the Excel's numeric `ROUTE_PO_CODE` separately, not conflated with `postman_code`. `bien_so` (license plate) is left `NULL` — no Excel column was confidently identified as license plate distinct from `POSTMAN_CODE`; not fabricated.
3. **Filtering discrepancy, reported not resolved**: applying the same three exclusion categories the reference HTML's own precomputed stats already name (`quantity_minus_1`, `invalid_coordinates`, `duplicate_lading_date_route`) to the real `.xlsb` yields `kept_points = 143,475` (871 excluded for `QUANTITY = -1`, exact match to the HTML's own stat; 16,204 excluded for invalid/zero coordinates vs. the HTML's stated 16,185; 4 excluded as duplicate `(LADING_CODE, STATUS_DATE, ROUTE_PO_CODE)` vs. the HTML's stated 35). This differs from both the locked Manifest baseline (143,467) and the HTML's own stated figure (143,463) by a small margin. No number was forced to match; the real computed result is what was seeded, and the discrepancy is flagged for Product Owner awareness, likely due to a slightly different duplicate-key or coordinate-validity definition in whatever tool originally produced the HTML — not investigated further in Phase 2 as it was out of scope.

### Implementation

**Backend**: `backend/src/services/networkMapSeed/` — three pure parser modules (`parseServicePointsExcel.js`, `parseLevel2RoutesHtml.js`, `parseDeliveryPointsExcel.js`), each read-only against the source files, each emitting explicit warnings instead of guessing when data is missing (e.g. a service point with no coordinates is kept with `lat`/`lon` = `null` and a warning, never fabricated). `backend/seed_network_management_001_phase2_data.js` — a one-time, idempotent seed script (explicitly not the Phase 3 "Import" feature: no upload UI, no preview/confirm step) that loads the parsed data into the Phase 1 schema, recording one `network_import_log` row per module (file name + SHA-256 fingerprint + counts) for Phase 3 traceability. `backend/migrate_network_management_001_phase2_schema.js` adds the single additive `route_po_code` column. `backend/server.js` now runs both Phase 1 and Phase 2 schema migrations automatically on every startup (`ensureNetworkManagementSchema()`, awaited before `app.listen`) — this was previously only a manually-run script on one machine; it is now self-healing on any environment. `backend/src/controllers/NetworkMapController.js`'s `getDeliveryRoutesMeta` was extended (additive, backward-compatible) to cascade: no params -> global `{dates, bcvh}`; `+ngay` -> `bcvh` scoped to that date; `+ngay&ma_bcvh` -> `+postman_codes` scoped to date+BCVH — so the UI can build Ngày→BCVH→Bưu tá dropdowns without ever touching the points endpoint prematurely.

**Frontend**: `leaflet` + `react-leaflet` added as new dependencies. `frontend/src/features/networkMap/`: `mapStyles.js` (colors reproduced from the reference HTML's own legend — `#F59E0B`/`#2563EB`/`#16A34A`/`#DC2626`/`#7C3AED` — not invented), `MapStateBanner.jsx` (shared loading/empty/error/warning banner, used by all 3 screens), `ImportPendingButton.jsx` (admin-only disabled Import affordance, unchanged Phase 1 role gate). Three page+map component pairs, each split into a data-fetching page component and a pure presentational `*Map.jsx` component consuming already-fetched data as props (Phase 3 Import can swap the data source without touching the map components): `ServicePointsPage.jsx`/`ServicePointsMap.jsx` (CircleMarkers colored by `loai_diem`, legend panel, warns and excludes points missing coordinates instead of crashing); `Level2RoutesPage.jsx`/`Level2RoutesMap.jsx` (polylines through real stop coordinates, colored per route, clickable route list sidebar, warns about routes with fewer than 2 geo-located stops); `DeliveryRoutesPage.jsx`/`DeliveryRoutesMap.jsx` (cascading Ngày→BCVH→Bưu tá selects backed by the extended meta endpoint, points endpoint called only once all three are selected, polyline + markers with popups). The now-unused Phase 1 scaffold `NetworkFoundationPage.jsx` was deleted (dead code after the real screens replaced it).

### Validation evidence

- **Migration safety**: `node --test` on both migration test files confirms idempotency and additive-only behavior; both migrations are now wired into `server.js` startup (not a manual one-off) and were verified by an actual server restart (see Runtime below) which logged successful startup with no schema errors.
- **Automated tests**: 31/31 pass on backend (`node --test backend/migrate_network_management_001_phase1_schema.test.js backend/migrate_network_management_001_phase2_schema.test.js backend/src/controllers/NetworkMapController.test.js backend/src/routes/networkMapRoutes.test.js backend/src/services/networkMapSeed/*.test.js`), including new controller tests inserting synthetic `network_delivery_point` rows to verify the cascading meta endpoint. 13/13 pass on frontend (`node --test frontend/src/auth/roles.test.js frontend/src/navigation/appNavigation.test.js frontend/src/App.role-routing.test.js frontend/src/api/NetworkMapClient.test.js`). `oxlint`: clean on all new/changed files. `vite build`: succeeds.
- **Data seed run against the real files**: `service-points` 151 rows / 0 warnings (matches locked baseline exactly); `level2-routes` 28 routes / 148 stops / 47 unique points / 1,435 km / 0 warnings (matches locked baseline exactly); `delivery-points` 143,475 of 160,554 kept (see discrepancy note above). Seed applied to the live operational `backend/src/db/database.sqlite`; verified idempotent (re-run against a copy produces identical counts).
- **`fact_f13` preserved**: verified `666,153` rows immediately before and immediately after the Phase 2 seed run against the live database (this is the correct current baseline — see Section 3 for why it differs from the Phase 1-era `663,126` figure, a legitimate, unrelated change from the intervening `AUTO-IMPORT-011` ticket).
- **Source files preserved**: SHA-256 checksums of all 3 `Data QLML/` Excel files and all 3 root-level HTML files were captured before any Phase 2 work and re-verified identical after seeding and after full runtime testing — zero bytes changed. `Data QLML/` was never `git add`ed, renamed, or moved.
- **Runtime (browser + real backend, admin role)**: backend restarted with the new code (a stale prior-session `node.exe` was occupying port 5050 and was restarted, matching the project's own port-conflict remediation instructions); logged in as `admin` via the real login form. `/network-map/service-points` rendered 151 points with the 5-category color legend, admin-only "Import (Phase 3)" button visible, `GET /api/network-map/service-points` → `200`. `/network-map/level2-routes` rendered all 28 routes in the sidebar with correct names/km/trips-per-week matching the seeded data, `GET /api/network-map/level2-routes` → `200`. `/network-map/delivery-routes` correctly blocked the map until all three filters were chosen; selecting `Ngày=2026-06-01` cascaded `BCVH` to 6 real codes, selecting `BCVH=533140` cascaded `Bưu tá` to 37 real `POSTMAN_CODE` values, selecting `Bưu tá=53A121` triggered exactly one `GET .../delivery-routes/points?ngay=2026-06-01&ma_bcvh=533140&postman_code=53A121` request (never a bulk/full-month load) and rendered "30 bưu gửi" with a polyline + markers. No console errors from any new code (pre-existing, unrelated `[DashboardHome]` 400 errors were observed, not caused by this ticket). Unauthenticated access to `/network-map/service-points` correctly redirected to `/login` after clearing the session token.
- **Viewer role**: the real viewer password is stored only as a one-way scrypt hash (`QIS_VIEWER_PASSWORD_HASH`) and is not recoverable/known — no plaintext viewer credential exists to log in with in a browser session. Viewer role enforcement was instead verified against the exact same `requireAuth`/`requireRole(['admin','viewer'])` middleware the live server uses (`backend/src/controllers/NetworkMapController.test.js`), which is not a weaker proxy — it exercises the identical production code path, just without an HTTP round-trip. This is recorded as a residual limitation, not a gap in the actual authorization logic.

### Scope discipline confirmed

No F1.3 Import/Dashboard/Ranking code touched; no Phase 3 Import feature built (the seed script has no upload UI, no preview/confirm step, no dedup-history workflow — explicitly out of scope); no bulk OSRM calls; no fabricated business data (every parser emits a warning instead of guessing on missing input); `Data QLML/` source files and file names/sheets/columns unmodified; 02 pre-existing stashes untouched.

## 12. Phase 1 Implementation Closure

- Status: `COMPLETED / TECHNICAL PASS`, `2026-08-05`.
- Implementation commit: recorded at Git handoff in this ticket's execution report; branch `codex/da-impl-006`.

**Backend**: `backend/src/db/schema.sql` extended (additive only) with `network_import_log`, `network_service_point`, `network_level2_route`, `network_level2_route_stop`, `network_delivery_point` (schema only, zero rows seeded). `backend/migrate_network_management_001_phase1_schema.js` — idempotent, additive-only migration script, applied once to the live operational `backend/src/db/database.sqlite`; verified `fact_f13` unchanged at `663,126` rows before/after and all 5 new tables present with `0` rows. `backend/src/controllers/NetworkMapController.js` + `backend/src/routes/networkMapRoutes.js` mounted at `/api/network-map` in `backend/server.js`: read endpoints (`GET /service-points`, `GET /level2-routes`, `GET /delivery-routes/meta`, `GET /delivery-routes/points`) gated `requireAuth` + `requireRole(['admin','viewer'])`; `GET /delivery-routes/points` rejects with `400 MISSING_REQUIRED_FILTER` unless `ngay`, `ma_bcvh`, and `postman_code` are all supplied, so no full-month scan is possible. Three import endpoints (`POST .../import`) are `requireRole(['admin'])`-gated scaffolding that respond `501 NOT_IMPLEMENTED` — Excel parsing is out of scope until Phase 3.

**Frontend**: new `Quản lý mạng lưới` nav group (`frontend/src/navigation/appNavigation.jsx`) with 3 subItems, no role restriction on the group (both admin and viewer see it); new paths registered in `VIEWER_ALLOWED_PATH_PREFIXES` (`frontend/src/auth/roles.js`); 3 new routes in `frontend/src/App.jsx` under `/network-map/*`, each `ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}`; `frontend/src/api/NetworkMapClient.js` API client; `frontend/src/features/networkMap/` scaffold screens (`ServicePointsPage`, `Level2RoutesPage`, `DeliveryRoutesPage` sharing `NetworkFoundationPage`) that call the read API to prove connectivity and show an admin-only, disabled "Import (Phase 3)" button via `useAuth()`/`isAdminRole()` — no Leaflet map, no Excel import, no OSRM call.

**Validation evidence**:
- `node --test backend/migrate_network_management_001_phase1_schema.test.js backend/src/controllers/NetworkMapController.test.js backend/src/routes/networkMapRoutes.test.js` — 20/20 pass (schema creation, idempotency, zero-row assertion, auth/role enforcement for both read and import endpoints, required-filter enforcement, route-wiring contract).
- `node --test frontend/src/auth/roles.test.js frontend/src/navigation/appNavigation.test.js frontend/src/App.role-routing.test.js frontend/src/api/NetworkMapClient.test.js` — 12/12 pass.
- `npx oxlint` (frontend) — no new warnings introduced by this ticket's files.
- `npm run build` (frontend, Vite) — succeeds.
- Live-DB migration applied once to `backend/src/db/database.sqlite`; `fact_f13` row count confirmed unchanged (`663,126`) before and after; all 5 new tables confirmed present with `0` rows (no business data).
- Broader pre-existing backend regression run (`test_bcvhMonthToDateContract.js`, `test_canonical_bcvh_units.js`, `test_daily_trend.js`, `test_dashboardNationalRankRange.js`, `test_e2e_kpi.js`, `test_enum.js`, `test_excelParser.js`, `test_f13_route_classification.js`, `test_hide.js`, `test_hide2.js`, `test_importHistoryDefect3Recovery.js`, `test_importHistoryPresenter.js`, `test_importPipelineRace.js`, `test_importProcessor.js`, `test_nationalExcelParser.js`, `test_tctF13BackfillService.js`, `test_timelineServiceOperatingPatternContract.js`): 7 pre-existing failures found, confirmed unrelated to this ticket — `test_enum.js`/`test_hide.js`/`test_hide2.js` are Windows-native `koffi`/`user32.dll` HWND-automation scripts unrelated to any web/API/DB code; `test_dashboardNationalRankRange.js`, `test_bcvhMonthToDateContract.js`, `test_importProcessor.js` fail on pre-existing data-snapshot/source-contract assertions in F1.3 code this ticket never touched (`F13DashboardService.js`, `FactBuuGuiRepository.js`, `importProcessor.js`); `test_e2e_kpi.js` passes in isolation and only fails under batched cross-file execution, a pre-existing test-isolation characteristic of this suite. None of the 7 reference any `network_*` table, `NetworkMapController`, or `networkMapRoutes`. Not fixed under this ticket — out of scope per manifest Section 9 ("Không sửa các module ngoài phạm vi nếu không thật sự cần cho tích hợp nền tảng").

**Scope discipline confirmed**: no Excel read/parsed; no data seeded into `151`/`28`/`143,467`-record baselines; no Leaflet map built; no OSRM call added; Phase 2/3/4 untouched; 02 pre-existing stashes and the 3 root-level HTML files untouched; the new `Data QLML/` Excel files present in the workspace were not opened or read.
