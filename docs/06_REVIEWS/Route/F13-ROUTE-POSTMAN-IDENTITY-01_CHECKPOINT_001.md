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

