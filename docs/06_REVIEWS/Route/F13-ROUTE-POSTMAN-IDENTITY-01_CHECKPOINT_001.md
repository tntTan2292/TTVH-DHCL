# F13-ROUTE-POSTMAN-IDENTITY-01 Checkpoint 001

## Section 1 — Activation

Product Owner decision received in chat on 2026-09-17 after PO UI PASS of `F13-BCVH-MONTHLY-CUMULATIVE-01`: **“ok pass bước tiếp theo nhé”**.

Per the approved upgrade Roadmap, `F13-ROUTE-POSTMAN-IDENTITY-01` is the next F1.3 ticket. It is activated at `DISCOVERY / READ-ONLY AUDIT` only.

- Objective: assess adding `Mã bưu tá` and `Tên bưu tá` to F1.3 Route Ranking from actual BatchFile evidence.
- Executor: `Antigravity (Gemini)`.
- Activation baseline: `03b925e8025f609c9d7fc92da4db57f81756f0a4`.
- Branch: `codex/da-impl-006`.
- No implementation or PO PASS is authorized.

## Section 2 — Scope Lock

The audit must:

1. Identify the exact BatchFile source, sheets and header-based mapping for postman code/name.
2. Trace the existing route-ranking pipeline from import/source to storage, service/API and UI.
3. Reconcile BatchFile identities against routes already present in Route Ranking using real read-only evidence.
4. Quantify missing, duplicate and conflicting mappings and determine whether identity is time-dependent.
5. Propose the minimal truthful data contract/UI placement and list schema/import/backfill implications.
6. Return open decisions and a phased recommendation to PO/CTO.

Out of scope: product-code edits, schema/migration, imports, backfills, business-data writes, F1.3 KPI/SSOT changes, Browser/Web automation, and any work from other tickets.

## Section 3 — Required Reading

- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/03_PLANNING/TTVH-DHCL-UPGRADE-ROADMAP-01.md`
- `docs/10_TICKETS/F13-ROUTE-POSTMAN-IDENTITY-01_MANIFEST.md`
- `docs/06_REVIEWS/Shared/NETWORK-MANAGEMENT-001_CHECKPOINT_001.md` Section 19
- `backend/src/services/networkMapImport/parseDeliveryRoutesBatchFileExcel.js`
- `frontend/src/features/ranking/RouteRankingPage.jsx`
- Route-ranking paths in `backend/src/services/F13DashboardService.js`
- Relevant route/source fields around `ma_tuyen`, `ten_tuyen`, BatchFile postman code and postman name

## Section 4 — Discovery & Reconciliation Findings (2026-09-17)

Antigravity performed the read-only discovery audit across the codebase, 4 monthly BatchFiles, database records, and the newly provided `2026.09.17 - DB Buu ta.xls` directory file.

### 4.1. Core Audit Facts
1. **BatchFile Schema**: All 4 BatchFiles (`Data QLML/*.xlsb`) adhere to a 29-column schema. Column 5 is `POSTMAN_CODE`, Column 6 is `ROUTE_PO_CODE`. **No column stores postman name (`Tên bưu tá`)**.
2. **Active Route Ranking Component**: The active component mounted at `/f13/ranking/route` in `App.jsx` is `RoutePerformancePage.jsx` (not `RouteRankingPage.jsx` which is an orphan mock).
3. **Canonical Route Coverage**: 118 / 123 canonical Hue postman routes (95.9%) in `fact_f13` match `route_po_code` in BatchFile records.
4. **Multi-postman reality**: Route-to-postman is strictly N:M. 55 of 118 routes (46.6%) have multiple postmen over time; 21.3% of active (day, route) pairs have multiple postmen on the same day.
5. **Postman Directory (`2026.09.17 - DB Buu ta.xls`)**:
   - Total valid rows: 198 (all unique postman codes, 0 duplicates).
   - Mapping: `Tên tài khoản` = `Mã bưu tá`; `Họ tên người dùng` = `Tên bưu tá`; `Mã bưu cục` = Mã BCVH (cross-check).
   - Data minimization: Phone number, HRM code, and contract type are explicitly excluded from system storage.
6. **Cross-Reconciliation (BatchFiles vs DB Bưu tá)**:
   - Total distinct postmen in BatchFiles: 277 codes.
   - **Matched codes**: 172 codes (covering 555,765 / 678,328 = 81.93% of all delivery points).
   - **BatchFile codes missing in DB Bưu tá**: 105 codes (18.07% volume). 51 codes have >100 deliveries, 29 have <=10 deliveries.
   - **DB Bưu tá codes only in DB**: 26 codes (no deliveries in BatchFiles).
   - **BCVH mismatches**: 0.
7. **Locked Stitching Pipeline**: `fact_f13 (ngay_do_kiem, ma_tuyen)` -> `network_delivery_point (ngay_phat, route_po_code)` -> `postman_code` -> `dm_buu_ta (ma_buu_ta, ten_buu_ta)`. Preserves multiple postmen per route on a single day.
8. **Design Proposal**: Dedicated "Rà soát danh mục bưu tá" management UI (`/admin/postman-catalog`) with two tabs: (1) Current Directory, (2) New/Unnamed codes from BatchFiles with inline name entry.

## Section 5 — Completion Gate

Discovery audit is complete. Status advances to: `DISCOVERY AUDIT COMPLETE / READY FOR PO DESIGN OF RECORD APPROVAL`. No product-code, schema, migration, import, backfill or business data has been modified. Implementation and PO PASS remain strictly blocked pending separate PO/CTO approval.


## Section 6 — Independent Design Review 001 (2026-09-17)

Claude Code (Opus 5) review recorded in `docs/06_REVIEWS/Route/F13-ROUTE-POSTMAN-IDENTITY-01_DESIGN_REVIEW_001.md`. Result: **BLOCKED pending PO decisions D1-D4**. Direction PASS; R1 (placement/permission) and R2 (query performance) corrected in the review's contract; R3-R8 gaps addressed there. Review used read-only SQLite and read-only file parse only; no code, schema, migration, import or data write. Implementation and PO PASS remain blocked.

## Section 7 — Product Owner Decisions D1-D4 and Design of Record v2 (2026-09-18)

Product Owner approved the design direction and locked D1-D4 (conflict handling, anchor-date display, retention of codes absent from a newer file, daily BF as shared base source plus BCCP enrichment redesign). Claude Code published `docs/04_TECHNICAL_PLANNING/Feature/F13-ROUTE-POSTMAN-IDENTITY-01_DESIGN_OF_RECORD.md` as DoR v2 and marked the v1 proposal superseded. R1-R8 from the Section 6 review are all dispositioned (DoR v2 Section 3): R1, R2, R3, R5, R7, R8 resolved; R4 resolved by D2; R6 superseded by D4 with an interim coverage-range requirement in Phase 3.

Phase gates: Phases 1-3 (directory foundation, ranking contract, UI) are ready for implementation; Phase 4 (daily BF auto-import) is blocked until the PO supplies the source and retrieval method; Phase 5 (BCCP định vị enrichment) is blocked until the PO supplies a sample file. PO UI acceptance applies at the end of Phase 3 only and is never self-awarded. This checkpoint update is documentation only: no code, schema, migration, import or database write was performed.

## Section 8 — Phase 1-2 Implementation and Real Data Load (2026-09-18, Claude Code / Sonnet 5)

PO authorized Phase 1-2 implementation and, contingent on backup/dry-run/rollback gates passing, loading the real `2026.09.17 - DB Buu ta.xls` into the operational database. Full technical detail is in `docs/10_TICKETS/F13-ROUTE-POSTMAN-IDENTITY-01_MANIFEST.md` Section 11; summarized here for the checkpoint record:

- Migration `dm_buu_ta` / `dm_buu_ta_event` / `dm_buu_ta_conflict` + ranking covering index applied to the live operational DB after a verified `VACUUM INTO` backup (`database.pre-f13-route-postman-identity-01-phase1-migration.2026-09-18T03.sqlite`, integrity-checked, `fact_f13` count matches live).
- Pre-load gate results, all PASS: 198/198 valid rows parsed (0 rejected, 0 duplicate codes); 0 forbidden fields (phone/HRM/contract) on the parsed record shape; conflict/history/rollback mechanism verified by 9 passing `postmanCatalogService.test.js` tests (KEPT_MANUAL, APPLIED_FILE, rollback of INSERT/UPDATE, rollback-refused-when-blocked, re-import-no-duplicates) against the exact production classify/apply functions on an isolated SQLite instance; full backend sweep 385/389 (4 pre-existing/environmental, unrelated).
- Real load executed: 198 rows inserted (`nguon=IMPORT`), verified 198/198 distinct, spot-checked against source. A second, real (non-synthetic) re-import against the same live file classified all 198 `unchanged` — proving no duplication on the actual production data, not just the test fixture.
- Phase 2 ranking join re-verified against live data after the load: a real (route, date) pair now resolves a real name through `dm_buu_ta` end-to-end.
- R2 performance gate: `EXPLAIN QUERY PLAN` uses the new covering index; measured 15 ms (102-route day query) / 13 ms (123-route period query) against the live DB's busiest real date.

Not done: Phase 3 UI (Antigravity, not started), Phase 4/5 (still blocked on PO inputs). No PO UI PASS is claimed by this section — Phases 1-2 are Claude Code's own technical validation only.

## Section 9 — Independent Backend Review 002 (2026-09-18, Claude Code / Opus 5)

Read-only independent review of Phase 1-2 at `4f339b1` against baseline `b15d648`. Result: **BLOCKED** on one defect; every other Product Owner verification item PASS. Full record: `docs/06_REVIEWS/Route/F13-ROUTE-POSTMAN-IDENTITY-01_BACKEND_REVIEW_002.md`.

- PASS: 198/198 directory rows match the source file; no phone/HRM/contract value is stored in any column or in any `dm_buu_ta_event` image; re-import yields 198 `unchanged` with no duplicates; D1 conflict queue and both resolutions behave as designed; D3 keeps and flags absent codes; rollback restores and is correctly refused when a later batch intervened; viewer gets 403 on all six write/history endpoints while admin is allowed; KPI matches raw `fact_f13` for 31/31 routes with only additive response fields; the new covering index gives ~102 ms -> ~15 ms with identical results; the pre-migration backup is `integrity_check = ok`, matches pre-change counts and contains no `dm_buu_ta`.
- 4 failing tests confirmed pre-existing: reproduced on baseline `b15d648` under identical invocation; the files involved are byte-identical at both commits. Manifest Section 11 attributes 3 of them to `DashboardController.r6.integration.test.js`; it is 2 there plus 1 in `DashboardController.recovery.test.js`.
- **B1 (blocking)**: `postmanRankingService.js` groups by the alias `ma_buu_ta`, which SQLite resolves to the joined `dm_buu_ta.ma_buu_ta` (NULL for codes without a name), so two or more unnamed postmen on the same route and day merge into one row — a code disappears and its volume is added to another. 232 of 9,269 (date, route) pairs affected, 501 code occurrences. Violates D2. Display-only; no stored data or KPI affected.
- Minor: M2 file no longer refreshes BCVH/status for MANUAL records (diverges from DoR v2 §7); M3 rollback leaves OPEN conflicts and conflict events reuse the import batch id; M4 the migration fails if run standalone against an empty database; M5 manifest test attribution.

Next gate: fix B1 with a regression test for two unnamed postmen on one route/day, then Phase 3 UI may start. No PO UI PASS is claimed or implied.
