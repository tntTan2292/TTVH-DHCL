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
- [14. Phase 3 Implementation Closure](#14-phase-3-implementation-closure)
- [15. PO Gate 3 Runtime Remediation](#15-po-gate-3-runtime-remediation)

## 1. Purpose

This checkpoint is the current-state entry point for `NETWORK-MANAGEMENT-001`. It exists so a fresh AI session can immediately answer: is the program active, which Phase is current, what baseline applies, what is permitted, what is locked, what to read, and what to do next.

## 2. Program State

| Field | Value |
| --- | --- |
| Program | `NETWORK-MANAGEMENT-001` |
| Program State | `PHASE 3 REMEDIATED / TECHNICAL PASS — AWAITING PO GATE 3 RUNTIME RECHECK` (as of `2026-08-06`) |
| Recorded PO Evaluation (Phase 2) | `PO ROUTE VISUAL RECHECK PASS — LEGEND AND ROAD ROUTES ACCEPTED` |
| Current Phase | `Phase 3 (Import) implemented and technically validated; first PO Gate 3 attempt returned RUNTIME FAIL on 3 defects (Section 15); root-caused and remediated same day; awaiting PO Gate 3 runtime recheck` |
| Phase 1 Implementation Performed | `Yes` — see Section 12 |
| Phase 2 (Ba bản đồ) Implementation Performed | `Yes` — see Section 13, 14, 15 & 16 |
| Phase 3 (Import) Implementation Performed | `Yes` — see Section 14 (Phase 3 Implementation Closure) and Section 15 (PO Gate 3 Runtime Remediation) |
| Phase 4 (Nghiệm thu) | `PLANNED / NOT ACTIVE` |
| PO Gates Passed | `PO Gate 1: PASS (Product Owner, 2026-08-05)`. `PO Gate 2: PASS (Product Owner, 2026-08-05).` `PO Gate 3: first attempt RUNTIME FAIL (Product Owner, 2026-08-06) — 3 defects, remediated same day per Section 15; PO Gate 3 not yet re-granted.` |
| Next State | `PHASE 3 REMEDIATED / TECHNICAL PASS — AWAITING PO GATE 3 RUNTIME RECHECK` |

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

Phase 3 (Import) is implemented and technically validated (Section 14); the first PO Gate 3 runtime check returned RUNTIME FAIL on 3 defects, root-caused and remediated the same day (Section 15). Exact next action: await Product Owner PO Gate 3 runtime recheck. Do not declare PO Gate 3 PASS and do not begin Phase 4 work without that explicit re-check and authorization.

## 8. Proposed Executor

Claude Code (Sonnet) — implementation, backend, data, tests, documentation, and Git, per the executor plan in `docs/10_TICKETS/NETWORK-MANAGEMENT-001_MANIFEST.md` Section 10. Antigravity owns discovery, UI/UX, and Windows runtime evidence once PO UI review of Import/Export/Rollback is needed.

## 9. Next PO Gate

PO Gate 1 `PASS` (Product Owner, `2026-08-05`). PO Gate 2 `PASS` (Product Owner, `2026-08-05`). PO Gate 3 sits after Phase 3 (Import) closes (manifest Section 11) and requires a Product Owner UI check on Import/Export/History/Rollback across all three modules — the first PO Gate 3 attempt (`2026-08-06`) returned `RUNTIME FAIL` on 3 defects (ĐTC2 straight-line routing, tuyến-phát routing resilience, Date Picker month-availability semantics); all 3 were root-caused and remediated the same day (Section 15) with automated tests and real-browser runtime re-validation, but PO Gate 3 itself has not been re-requested/re-granted.

## 10. Current Blockers

None for Phase 1, 2, or 3 technically — all implemented and technically validated, including the PO Gate 3 remediation (Section 15). Phase 4 (Nghiệm thu) is blocked pending explicit Product Owner PO Gate 3 runtime recheck and PASS, then a separate authorization to start Phase 4.

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

## 14. Phase 3 Implementation Closure

- Status: `COMPLETED / TECHNICAL PASS`, `2026-08-06`.
- Implementation commit: recorded at Git handoff in this ticket's execution report; branch `codex/da-impl-006`.
- Closure authority: direct execution of explicit Product Owner Phase 3 Implementation Authorization following the approved "Corrected Recommended Design"; PO Gate 3 itself remains a separate, not-yet-requested Product Owner confirmation.

### Locked design decisions carried through unchanged from PO review

1. **Mạng điểm phục vụ**: upsert-by-`ma_diem` (`INSERT ... ON CONFLICT(ma_diem) DO UPDATE`), never deletes absent points. `trang_thai` copied verbatim at every step — never defaulted/inferred/transformed. Hard-error scope: any error row blocks Confirm for the entire file.
2. **Đường thư cấp 2**: `network_level2_route.id` used directly as the Export "Route ID" — **no separate `route_key` column was created**, confirmed technically sufficient because it is `INTEGER PRIMARY KEY AUTOINCREMENT` (SQLite never reuses a freed AUTOINCREMENT id for the table's lifetime). Every stop's `Mã điểm` is validated for **existence only** against `network_service_point` — `trang_thai` (including "Tạm dừng") never filters or blocks this geometry linkage, per explicit PO instruction. Admin selects specific hành trình(s) to replace (delete-and-reinsert scoped to only that route's stops); other routes in the same file remain untouched. Hard-error scope: a route with an invalid `Mã điểm` blocks only that route — other valid routes in the same file remain individually selectable for Confirm.
3. **Sơ đồ tuyến phát**: locked row key `(ma_buu_gui, ngay_phat, route_po_code)` unchanged — **not** switched to `LADING_CODE`-only (the count-discrepancy investigation from the prior discovery report was carried as a technical finding only, never used to alter the locked rule). Confirm writes via `INSERT ... ON CONFLICT(...) DO UPDATE` — **`INSERT OR IGNORE` is never used**, so an edited-and-reimported row's changes are preserved, not silently discarded. A real `UNIQUE(ma_buu_gui, ngay_phat, route_po_code)` index now enforces this key at the DB level (added via migration, pre-flight-checked for zero existing violations before creation). A same-month, different-fingerprint file is allowed to re-import; only the exact-fingerprint case is rejected. Hard-error scope: any error row blocks Confirm for the entire file. Never deletes existing rows or rows absent from the file.
4. **Rollback**: `network_import_snapshot` records a before-image **and** an explicit `operation` (`INSERT`/`UPDATE`/`DELETE`) per affected row. Rollback reverses by operation type: `INSERT` → delete the row; `UPDATE` → restore the before-image; `DELETE` (ĐTC2's delete-and-reinsert) → re-insert the before-image. Rollback is refused, with the blocking import's id named in the error, when a **later, still-active (non-rolled-back)** Import for the same module touched an overlapping row-key scope — enforced via `id`-based ordering (not `created_at`, which only has second-level resolution and could not reliably distinguish two imports in the same second — found and fixed via a failing test, see Validation). An already-rolled-back import cannot be rolled back again.
5. **Export/Import**: Export always produces the same flat, denormalized, Import-ready structure the corresponding parser reads — proven by a real round-trip test per module (Export → re-parse → 0 header/structure warnings) — not the original merged-layout/raw-batch-file source Excel, which remains untouched. Import/Export/History/Rollback are `admin`-only at both API (`requireRole(['admin'])` on every new route) and UI (`isAdminRole()`-gated `NetworkAdminSection`) layers, independently enforced. Sơ đồ tuyến phát Export defaults to a month/date-range with an admin opt-in "toàn bộ" and always shows the expected row count before download.

### Documented finding carried forward, not resolved by fiat

The prior discovery report's technical root-cause analysis of the tuyến-phát count discrepancy (`143,475` computed here vs. `143,467` locked baseline vs. `143,463` HTML-stated) is preserved as informational context only — per explicit PO instruction, it was **not** used to change the locked `(ma_buu_gui, ngay_phat, route_po_code)` dedupe rule.

### Implementation

**Backend** — Step 1 (migration): `backend/migrate_network_management_001_phase3_schema.js` (+ test) adds `network_import_session`, `network_import_snapshot`, `network_import_log.rollback_of_import_log_id`, and the `UNIQUE(ma_buu_gui, ngay_phat, route_po_code)` index — all additive/idempotent, pre-flight-checked, wired into `server.js` startup alongside Phase 1/2. Step 2 (Export/Preview/Confirm/History/Rollback): `backend/src/services/networkMapImport/` — `importSession.js`, `importSnapshot.js`, `transactionHelper.js`, `fingerprint.js`, `servicePointsImport.js`, `deliveryRoutesImport.js`, `level2RoutesImport.js`, `parseLevel2RoutesImportExcel.js` (new — flat Route-ID-keyed parser), `parseDeliveryRoutesImportExcel.js` (new — flat named-header parser, distinct from Phase 2's raw-batch-file-only `parseDeliveryPointsExcel.js`), `exportBuilders.js`, `rollbackService.js`; `backend/src/controllers/NetworkImportController.js` (new, all 3×5 endpoints); `backend/src/routes/networkMapRoutes.js` extended (old `501`-stub import routes replaced with real `preview`/`confirm`/`export`/history/rollback routes); `backend/src/controllers/NetworkMapController.js` cleaned of the now-dead stub helper. `backend/src/services/networkMapSeed/parseServicePointsExcel.js` corrected (real bug found via testing, see Validation): a row with a missing `Mã điểm phục vụ` is now returned with `ma_diem: null` instead of being silently skipped by the parser, so Phase 3's classify step can see and flag it as a blocking error — the original Phase 2 seed's already-committed 151-point result is unaffected (that source file had zero such rows).

**Frontend** — Step 3: `frontend/src/features/networkMap/import/` — `NetworkAdminSection.jsx` (admin-gated container), `FlatImportPanel.jsx` (shared preview/confirm UI for Mạng điểm phục vụ + Sơ đồ tuyến phát), `Level2RoutesImportPanel.jsx` (per-route selection UI for ĐTC2), `ImportHistoryPanel.jsx` (shared history + rollback), `ExportButton.jsx`, `DeliveryExportPanel.jsx` (month/range + toàn-bộ + row-count preview). `frontend/src/api/httpClient.js` extended with `getBlob()` for binary Export downloads (the existing `request()`/`get()` always call `response.json()`, which would corrupt a binary payload). `frontend/src/api/NetworkMapClient.js` extended with all 15 new Phase 3 methods. All 3 map pages wired to the new admin section, replacing the Phase 1/2 disabled `ImportPendingButton.jsx` (deleted, now dead code). `ServicePointsMap.jsx`/`mapStyles.js` extended per PO's explicit Phase 3 frontend requirement: "Tạm dừng" points default-hidden (data always fetched/kept — display-only toggle), a dedicated legend checkbox toggle, and a distinct grey/dashed marker (`createTamDungMarkerSvg`) that never reuses any of the 5 active `loai_diem` colors — this is additive frontend work inside the still-open Phase 3 scope, made necessary by Phase 3 introducing "Tạm dừng" points into the live dataset for the first time; Phase 2's already-closed PO Gate 2 PASS deliverable is not altered or reopened.

### Real business outcome delivered (not just scaffolding)

Using the new live Import API, the 5 "Tạm dừng" points identified and audited in the prior PO-approved discovery step (`536101`, `536102`, `537200`, `534630`, `534989` — exact `ma_diem`/tên điểm/coordinates from column `W` of sheet "Huế", `trang_thai` kept as "Tạm dừng") were actually imported through Preview → Confirm against the live database: `network_service_point` grew from 151 to 156 rows, and the 11 previously-orphaned ĐTC2 stop references to these 5 codes now resolve real geometry via the `network_service_point` join, exactly as the approved design specified.

### Validation evidence

- **Automated tests**: 77/77 pass on backend (`node --test` across all 3 phase-migration files, `networkMapSeed/*.test.js`, `networkMapImport/*.test.js`, `NetworkMapController.test.js`, `NetworkImportController.test.js`, `networkMapRoutes.test.js`), 25/25 pass on frontend (roles, appNavigation, App routing, `NetworkMapClient.test.js`, `httpClient.test.js`). `oxlint`: clean (one pre-existing-pattern `react(only-export-components)` style warning, same class already present elsewhere in the codebase). `vite build`: succeeds.
- **Two real defects found and fixed via testing, not shipped**: (1) the migration's multi-statement `CREATE TABLE` block was run with `db.run()`, which only executes a SQL string's first statement — `network_import_snapshot` silently never got created; fixed by switching to `db.exec()`, caught by `migrate_network_management_001_phase3_schema.test.js`. (2) Rollback eligibility compared `created_at` timestamps, which have only second-level resolution in SQLite's `CURRENT_TIMESTAMP` — two imports in the same second were indistinguishable, so a genuinely later, scope-overlapping import could slip past the eligibility check; fixed by comparing monotonic `id` instead, caught by `rollbackService.test.js`. A third bug (rollback of an already-rolled-back import silently "succeeded" a second time) was also found and fixed by adding an explicit `ALREADY_ROLLED_BACK` check.
- **Live-DB verification**: `fact_f13` confirmed unchanged (`669,847` rows — the correct current baseline, grown further via ongoing, unrelated F1.3 production imports since Phase 2 closed) before Step 1's migration, after Step 1, and again after the real 5-point Import in Step 2 — three checkpoints, zero drift. All 5 new/altered `network_*` schema objects confirmed present with a real backend restart (picking up the new code), not just a manual one-off script.
- **Source files preserved**: SHA-256 of all 3 `Data QLML/` Excel files re-verified byte-identical at the start of this session and again after all backend/frontend work, the live 5-point Import, and full runtime browser testing — zero bytes changed. `Data QLML/` never `git add`ed, renamed, or moved.
- **Runtime (real browser + real backend, admin role)**: backend restarted with the new code (a stale prior-session process was occupying port 5050, restarted per the project's own port-conflict remediation instructions). Logged in as `admin`; `/network-map/service-points` showed **156** points (151 + the 5 real Imports), the "Hiện điểm Tạm dừng (5)" toggle default-unchecked, admin panel expanded to show Export/Import/History with both the Phase 2 seed log row and the new real Import log row, each with a working "Rollback" action. `/network-map/level2-routes` and `/network-map/delivery-routes` both rendered with their admin panels present and functional; the tuyến-phát Export row-count preview correctly returned **143,475** for the June 2026 range, matching the live table exactly. Unauthenticated access to `/network-map/service-points` correctly redirected to `/login`; direct unauthenticated `curl` requests to `.../import/preview`, `.../import/:id/rollback`, and `.../import/history/:module` all returned `401 UNAUTHORIZED`. No console errors from any new code (pre-existing, unrelated `[DashboardHome]` 400 errors were observed, not caused by this ticket).
- **Viewer role**: the real viewer password remains a one-way scrypt hash, not recoverable for a live browser session (same residual as Phase 2) — viewer/admin role separation for every new endpoint is instead verified via the exact production `requireRole(['admin'])` middleware in automated controller/route tests, which exercise the identical code path the live server uses.

### Scope discipline confirmed

No F1.3 Import/Dashboard/Ranking code touched; no Phase 4 (Nghiệm thu) work started; no bulk OSRM calls; the original merged-layout ĐTC2 Excel and raw `.xlsb` tuyến-phát source remain untouched, read-only historical references — Export/Import only ever round-trips through this ticket's own flat templates. `Data QLML/` source files and file names/sheets/columns unmodified. 02 pre-existing stashes untouched throughout.

## 15. PO Gate 3 Runtime Remediation

Product Owner submitted the first PO Gate 3 runtime check (`2026-08-06`) against baseline commit `2efa6fa227d1cda4c514f8afb4f8f91144acf59d` and returned `RUNTIME FAIL` on 3 defects. Claude Code first ran an audit-only investigation (no code changes), reported root cause per defect, then was explicitly authorized to remediate all 3 in the same scope.

### Root cause per defect (from the audit)

1. **ĐTC2 straight-line routing**: `Level2RoutesMap.jsx` had never called any routing service since its original Phase 2 implementation — it always rendered a plain straight `Polyline` between raw stop coordinates. Not a regression from Phase 3 (no Phase 3 commit touches this file). The reference source `Ban_do_mang_diem_phuc_vu_tich_hop_Duong_thu_cap_2.html` (`mailLoadRoute`, lines ~10580-10614) does call OSRM with a 2-provider fallback for ĐTC2 routes — this was part of the reference UX the ticket was scoped to preserve and was never ported.
2. **Sơ đồ tuyến phát routing resilience**: `deliveryRoutingService.js`'s `fetchChunkRoadRoute` called `fetch()` with no timeout/`AbortController`, so an unresponsive OSRM provider could hang the request indefinitely, leaving the UI on an unstyled placeholder line with no warning ever firing — a silent failure mode. Live-DB audit also found 10 out-of-Huế-bounds coordinate rows (8 in Morocco, 2 near Hải Phòng) inherited unchanged from the original Phase 2 `.xlsb` seed, which would break any OSRM waypoint chain that included them.
3. **Date Picker allowing July with only June imported**: not a hardcode — `getDeliveryRoutesMeta`/`listDeliveryPoints` used `COALESCE(ngay_nhap_phat, ngay_phat)` as the filter/calendar date, and 8 real DB rows have `ngay_phat` in June but `ngay_nhap_phat` (actual delivery-scan timestamp) genuinely drifted into July — real postal data, inherited unchanged from the Phase 2 seed. This was a field-semantics gap never locked by any PO decision, not a bug in the date-picker's navigation logic itself (confirmed no `new Date()`/current-month logic outside its empty-state fallback).

### PO-locked remediation decisions (verbatim intent, honored unchanged)

- ĐTC2 must reuse a routing helper shared with Sơ đồ tuyến phát where appropriate; Route ID, stop order, and the `network_service_point`-via-`ma_diem` coordinate source are unchanged.
- Each OSRM provider call is bounded by a 15s `AbortController` timeout; on timeout/failure the second provider is tried; if both fail the UI must show an explicit "could not build road route" state — never a silent straight line disguised as real geometry.
- The 8 Morocco-coordinate rows (and, by the same bounds principle, 2 Hải Phòng-area rows found during the audit) are excluded from routing calculations only — never edited/deleted in `Data QLML/` or the DB — and one bad coordinate must never break routing for the rest of an otherwise-valid route; the UI must name the excluded points explicitly (identifier + coordinates) so Admin can recognize the source data issue.
- `ngay_phat` is now the sole business date for calendar availability, min/max, the date list, and every delivery-route filter; `ngay_nhap_phat`/`thoi_gian_nhap_phat` are used only to order records within an already-selected `ngay_phat` — `COALESCE(ngay_nhap_phat, ngay_phat)` is no longer used as a filter date anywhere. A June `ngay_phat` row with a July `ngay_nhap_phat` stays classified as June and never makes July calendar-available.

### Implementation

- `frontend/src/features/networkMap/deliveryRoutingService.js` renamed to `roadRoutingService.js` (git-tracked rename) and generalized into the shared routing helper: adds `HUE_ROUTING_BOUNDS`/`isWithinHueRoutingBounds` (bounds-exclusion filter, sized from live `network_service_point`/`network_delivery_point` coordinate ranges to comfortably contain every legitimate Huế-area point while excluding both confirmed artifact clusters), a 15s per-provider `AbortController` timeout in `fetchChunkRoadRoute`, and `fetchRoadRoute` (the new generic entry point; `fetchDeliveryRoadRoute` kept as a backward-compatible alias) which splits routable vs. excluded locations before chunking and returns `excluded` for the caller to surface.
- `frontend/src/features/networkMap/Level2RoutesMap.jsx`: fetches per-route road geometry via the shared helper for all 28 ĐTC2 routes independently (one route's routing failure never blocks another's), renders one `Polyline` per routing segment (road-colored solid vs. amber-dashed fallback vs. gray-dashed loading placeholder — three visually distinct states, never conflated), and surfaces failed routes both as a map overlay banner and a per-route ⚠️ marker in the sidebar list and tooltip.
- `frontend/src/features/networkMap/DeliveryRoutesMap.jsx`: switched to the shared `fetchRoadRoute`; combines the routing-failure warning with an explicit excluded-points warning naming each excluded point's `ma_buu_gui` and coordinates; changed the pre-fetch loading placeholder to a neutral gray dashed style (previously identical blue-dashed styling to the confirmed-fallback state, which could be misread as a real/attempted route).
- `backend/src/controllers/NetworkMapController.js`: `getDeliveryRoutesMeta` and `listDeliveryPoints` filter/aggregate strictly by `ngay_phat`; `ORDER BY thoi_gian_nhap_phat ASC, status_time ASC, id ASC` (unchanged) still governs intra-day sequencing only.

### Validation evidence

- **Automated tests**: 31/31 backend (`NetworkMapController.test.js` — including 2 new PO Gate 3 regression tests for the June/July `ngay_phat`-vs-`ngay_nhap_phat` case — plus `networkMapRoutes.test.js`, `NetworkImportController.test.js`, all 3 phase-migration test files) and 39/39 frontend (`networkMapRemediation.test.js` — including new tests for provider-timeout-then-fallback, both-providers-fail explicit non-silent state, Huế-bounds exclusion not dropping/breaking the rest of a route, 1-point chunk-boundary continuity, and ĐTC2 road-geometry-not-straight-line — plus `NetworkMapClient.test.js`) all pass. `oxlint`: clean (same one pre-existing unrelated warning as Phase 3 closure). `vite build`: succeeds.
- **Real-browser runtime, all 3 map screens, after a real backend restart** (stale prior-session process on port 5050 killed first, per the project's own port-conflict remediation instructions): logged in as `admin`.
  - ĐTC2 (`/network-map/level2-routes`): all 28 routes rendered with a single solid (non-dashed) path each — verified via direct DOM inspection of `path.leaflet-interactive[stroke-dasharray]`, confirming zero fallback/loading placeholders remained and all 28 routes built real OSRM road geometry.
  - Sơ đồ tuyến phát (`/network-map/delivery-routes`): selected `22/06/2026` / BCVH `533140` / Bưu tá `53A141` (413 bưu gửi, 18 distinct locations, matching the live DB exactly) — rendered a single solid blue road polyline, no warning. Selected `03/06/2026` / BCVH `536250` / Bưu tá `53T022` (the Morocco-outlier route) — rendered a solid road polyline for the 4 valid locations and displayed the exact expected warning: *"Đã bỏ qua 1 tọa độ ngoài phạm vi bản đồ Huế khi dựng đường giao thông ... CD398006975VN (31.6597, -8.0231)"*.
  - Date Picker: navigating the calendar view to Tháng 07/2026 showed all 31 days disabled (`enabledDays: []`) even though the month selector itself is unrestricted; Tháng 06/2026 showed all 30 days enabled, matching `ngay_phat` presence exactly.
  - Mạng điểm phục vụ (`/network-map/service-points`): unaffected by this remediation — 156 points, "Hiện điểm Tạm dừng (5)" still default-off, confirming no regression from Phase 3 closure.
- **Data/source integrity**: `fact_f13` unchanged (`669,847`); `network_delivery_point` row count unchanged (`143,475` — query-logic-only change, no data mutation); all `Data QLML/` source files re-verified byte-identical via SHA-256 (2 hashes cross-checked directly against their recorded `network_import_log.file_fingerprint` values); `Data QLML/` never `git add`ed; both pre-existing stashes untouched.

### Scope discipline confirmed

No change to Import/Export/History/Rollback logic, no Phase 4 work, no expansion beyond the 3 named PO Gate 3 defects. PO Gate 3 is **not** declared PASS by this remediation — Product Owner runtime recheck is still required before Phase 4 may be authorized.
