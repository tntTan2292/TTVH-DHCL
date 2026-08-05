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

## 1. Purpose

This checkpoint is the current-state entry point for `NETWORK-MANAGEMENT-001`. It exists so a fresh AI session can immediately answer: is the program active, which Phase is current, what baseline applies, what is permitted, what is locked, what to read, and what to do next.

## 2. Program State

| Field | Value |
| --- | --- |
| Program | `NETWORK-MANAGEMENT-001` |
| Program State | `PHASE 1 COMPLETED / TECHNICAL PASS — READY FOR PO GATE 1` (as of `2026-08-05`) |
| Current Phase | `PHASE 1 — Nền tảng`, implemented and technically validated; PO Gate 1 (Section 11 of the manifest) not yet reached |
| Phase 1 Implementation Performed | `Yes` — see Section 12 |
| Phase 2 (Ba bản đồ) | `PLANNED / NOT ACTIVE` |
| Phase 3 (Import) | `PLANNED / NOT ACTIVE` |
| Phase 4 (Nghiệm thu) | `PLANNED / NOT ACTIVE` |
| Phases Completed | `None` |
| PO Gates Passed | `None` |

## 3. Baseline

- Authoritative baseline commit at program activation: `f7e02dcb091d3016d9b89b0e5283974a014d2fae`
- Branch: `codex/da-impl-006`
- At activation time, local `HEAD` and `origin/codex/da-impl-006` both matched this baseline exactly.
- Last closed prior program: `F13-STANDARDIZATION-001` — Tuyến Ranking (Route Ranking) delta `COMPLETED / PO PASS / CLOSED`, `2026-08-04`; the program's Phase 0 remains implemented-not-separately-closed and Phases 1-4 remain `PLANNED / NOT ACTIVE`. This activation does not touch or reopen that program.
- 02 pre-existing stashes preserved and untouched by this activation:
  - `stash@{0}` — `F13-SHIPMENT-001: preserved Shipment Performance Center delay/status changes` (deferred, pending PO reactivation)
  - `stash@{1}` — `pre-existing HTML maps outside F13 Phase 0 scope`
- Three source HTML files at repository root, untouched, read-only reference for this ticket:
  - `Ban_do_mang_diem_phuc_vu_BDTP_Hue.html`
  - `Ban_do_mang_diem_phuc_vu_tich_hop_Duong_thu_cap_2.html`
  - `ban_do_duong_giao_thong_bcvh_postman_06_2026.html`

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

Phase 1 (Nền tảng) is implemented and technically validated (Section 12). Exact next action: await explicit Product Owner authorization to start Phase 2 (Ba bản đồ). Do not begin Phase 2 or Phase 3 work without that authorization; do not assume PO Gate 1 is passed until the Product Owner confirms it.

## 8. Proposed Executor

Claude Code (Sonnet) — implementation, backend, data, tests, documentation, and Git, per the executor plan in `docs/10_TICKETS/NETWORK-MANAGEMENT-001_MANIFEST.md` Section 10. Antigravity owns discovery, UI/UX, and Windows runtime evidence once Phase 2 produces UI-visible change.

## 9. Next PO Gate

No PO Gate has been passed yet. PO Gate 1 sits after Phase 1 (Nền tảng) closes (manifest Section 11); Phase 1 implementation is complete and technically validated (Section 12), but PO Gate 1 itself requires Product Owner confirmation, not just technical validation, and has not been requested/granted.

## 10. Current Blockers

None for Phase 1 (Nền tảng) — implemented and technically validated. Phase 2 (Ba bản đồ) implementation is blocked pending explicit Product Owner authorization to start. Phase 3 (Import) for two of the three modules is additionally blocked pending Product Owner-supplied Excel source files:

- Mạng điểm phục vụ: source Excel (260 rows audited) not yet in workspace/repository; needed to verify column mapping before Import logic is built.
- Mạng đường thư cấp 2: no business Excel source exists yet at all; HTML-derived baseline is a temporary seed only.
- Sơ đồ tuyến phát: Excel tháng 06/2026 audited outside repository; the file itself must be returned to the workspace before Import logic is built.

## 11. Reusable Architecture Notes

Recorded from prior discovery so implementation does not need to re-derive it:

- **Auth**: session-token model (not JWT), `backend/src/middleware/authMiddleware.js` — `requireAuth` + `requireRole(['admin','viewer'])` for read, `requireRole(['admin'])` for Import. Role literals are exactly `'admin'` / `'viewer'`.
- **DB**: `sqlite3` via `backend/src/config/db.js`, live file `backend/src/db/database.sqlite`. Do not use the parallel/stale `backend/src/database/sqlite.db` path.
- **Import pipeline precedent**: `backend/src/services/importPipeline.js` + `importProcessor.js` — staged folder pattern (`Incoming/→Processing/→Processed/Error/Quarantine`), consistent with `Data DKCL/F1.1..F4.1`. Existing dedup relies on `INSERT OR IGNORE` + `UNIQUE` constraint and an `import_log` table; this ticket's three modules each need different dedup/update rules (upsert-by-mã-điểm; replace-routes-on-change; append-only-by-month with fingerprint) that do not map directly onto the existing F1.3 pattern and must be designed per-module in Phase 1/3.
- **API convention**: `app.use('/api/<domain>', <domain>Routes)`, no versioning prefix; response shape `{ success: true, data }` / `{ success: false, error: { code, message } }`.
- **Frontend nav**: `frontend/src/navigation/appNavigation.jsx` — config array with optional `roles` per item/group; sidebar in `frontend/src/components/shared/SharedLayout.jsx`. No existing Leaflet/react-leaflet usage anywhere in `frontend/` — this will be a new frontend dependency.
- **Frontend auth**: `useAuth()` (`frontend/src/auth/AuthContext.jsx`), role constants in `frontend/src/auth/roles.js`. In-page conditional Import-button rendering (for a page both admin and viewer can open) has no existing precedent in the codebase and must be newly introduced.

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
