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

## 1. Purpose

This checkpoint is the current-state entry point for `NETWORK-MANAGEMENT-001`. It exists so a fresh AI session can immediately answer: is the program active, which Phase is current, what baseline applies, what is permitted, what is locked, what to read, and what to do next.

## 2. Program State

| Field | Value |
| --- | --- |
| Program | `NETWORK-MANAGEMENT-001` |
| Program State | `ACTIVE / AUTHORIZED / READY FOR PHASE 1 IMPLEMENTATION` (as of `2026-08-04`) |
| Current Phase | `PHASE 1 — Nền tảng`, `AUTHORIZED / READY FOR IMPLEMENTATION`; no implementation performed under this governance-activation step |
| Phase 1 Implementation Performed | `No` — governance activation only |
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

`Phase 1 (Nền tảng) implementation is authorized and may begin in a future execution step.` This governance-activation step performs no implementation. Phase 1 implementation must: (a) design SQLite schema for the three independent modules per the manifest's locked baseline, (b) wire authenticated read APIs (`admin`+`viewer`) and admin-only Import API scaffolding, reusing `backend/src/middleware/authMiddleware.js` patterns, (c) not touch Phase 2/3/4 scope. Phase 2 (screens) and Phase 3 (import) each require their own explicit start once Phase 1 closes; Excel source files must be requested from the Product Owner at the start of the phase that needs them, not assumed now.

## 8. Proposed Executor

Claude Code (Sonnet) — implementation, backend, data, tests, documentation, and Git, per the executor plan in `docs/10_TICKETS/NETWORK-MANAGEMENT-001_MANIFEST.md` Section 10. Antigravity owns discovery, UI/UX, and Windows runtime evidence once Phase 2 produces UI-visible change.

## 9. Next PO Gate

No PO Gate has been passed. PO Gate 1 is defined to sit after Phase 1 (Nền tảng) closes (manifest Section 11), and Phase 1 has not started.

## 10. Current Blockers

None for Phase 1 (Nền tảng) — the phase is `AUTHORIZED / READY FOR IMPLEMENTATION` and does not require an Excel file to begin (schema/API foundation work only). Phase 3 (Import) for two of the three modules is blocked pending Product Owner-supplied Excel source files:

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
