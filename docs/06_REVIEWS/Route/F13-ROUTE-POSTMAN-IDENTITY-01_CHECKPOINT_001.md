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

## Section 4 — Completion Gate

The ticket remains `DISCOVERY / READ-ONLY AUDIT ACTIVE` until Antigravity returns a source-grounded audit. Design and implementation remain blocked pending PO/CTO approval.
