# F13-ROUTE-POSTMAN-IDENTITY-01 Manifest

Status: `DISCOVERY / READ-ONLY AUDIT ACTIVE (2026-09-17)`. Product Owner authorized the next step after closing `F13-BCVH-MONTHLY-CUMULATIVE-01`. Audit only; no product-code, schema, database or KPI change is authorized.

## 1. Ticket Information

- Ticket ID: `F13-ROUTE-POSTMAN-IDENTITY-01`
- Ticket Name: `F1.3 — Bổ sung Mã bưu tá + Tên bưu tá vào Tuyến phát Ranking`
- Owner: `Antigravity (Gemini)` — discovery/read-only audit executor.
- Phase: `Discovery / Read-Only Audit`
- Governance Version: `V2 Active`
- Registration authority: Product Owner decision received in chat, 2026-09-15, as part of the same instruction that paused `F41-DASHBOARD-MINIMUM-01` and activated `F13-BCVH-MONTHLY-CUMULATIVE-01`.
- Activation authority: Product Owner decision received in chat, 2026-09-17: the predecessor is PO PASS and work proceeds to the next approved Roadmap step.
- Branch registered on: `codex/da-impl-006`
- Activation baseline commit: `03b925e8025f609c9d7fc92da4db57f81756f0a4`

## 2. Objective (for whoever activates this ticket)

Bổ sung "Mã bưu tá" (postman/carrier code) và "Tên bưu tá" (postman name) vào Tuyến phát Ranking (Route Ranking), căn cứ trên các trường có trong BatchFile nguồn. Before any implementation: **audit the BatchFile's actual mapping and historical data** to confirm the postman code/name fields exist reliably, are stable per route, and reconcile against however Tuyến phát Ranking currently identifies a route — do not implement against an assumed mapping.

## 3. Registered Scope (activation lock is in Section 5)

Named by the Product Owner, to be confirmed/refined at activation:

- Source: the BatchFile format (the same family of files already handled elsewhere in this project for delivery-route data — see `docs/06_REVIEWS/Shared/NETWORK-MANAGEMENT-001_CHECKPOINT_001.md` Section 19 for the existing 29-column BatchFile audit and its header-based parser, `backend/src/services/networkMapImport/parseDeliveryRoutesBatchFileExcel.js`, as the nearest known precedent for this file family — not assumed to be the same pipeline or the same file).
- Target: Tuyến phát Ranking (Route Ranking) in F1.3 — `frontend/src/features/ranking/RouteRankingPage.jsx`, `backend/src/services/F13DashboardService.js`'s route-ranking path, and the underlying `fact_f13` route identification (`ma_tuyen`/`ten_tuyen`).
- Required before implementation: a read-only audit of (a) whether the BatchFile's postman code/name fields exist and are populated for the routes Tuyến phát Ranking already tracks, (b) whether a route-to-postman mapping is 1:1, stable, or changes over time/period, and (c) what the historical data shows for routes already ranked — a route's postman identity must not be presented as more certain than the source data supports.

Explicitly out of scope at registration:

- Any product code, database, schema, or API change.
- Any change to the F1.3 KPI, `danh_gia_2026`, or any frozen SSOT document.
- `F13-BCVH-MONTHLY-CUMULATIVE-01` (separate, independent ticket registered by the same Product Owner decision — not merged into this ticket's scope, per explicit instruction that the two tickets are independent).
- `F41-DASHBOARD-MINIMUM-01` / F4.1 (separately `PAUSED BY PO PRIORITY`, unrelated).

## 4. Next Step

Antigravity performs the activated discovery/read-only audit and returns evidence to the Product Owner/CTO. No implementation begins from this activation.


## 5. Product Owner Activation — 2026-09-17

After granting PO UI PASS to `F13-BCVH-MONTHLY-CUMULATIVE-01`, the Product Owner directed: **“bước tiếp theo”**. The approved Roadmap order identifies this ticket as the next F1.3 upgrade. The ticket is therefore activated at `DISCOVERY / READ-ONLY AUDIT` only.

### 5.1 Audit questions

1. Identify the exact BatchFile source(s), sheet/header mapping and real fields for postman code and postman name.
2. Trace the current Route Ranking data path from source/import through persisted data and API to `RouteRankingPage.jsx`.
3. Measure real mapping coverage for ranked routes: populated, missing, duplicate and conflicting identities.
4. Determine whether route-to-postman identity is 1:1, changes by date/period, or can contain multiple postmen; preserve historical truth and do not collapse ambiguous mappings.
5. Determine the safest minimal data contract and UI placement for `Mã bưu tá` and `Tên bưu tá`, without changing F1.3 KPI calculations.
6. Report schema/import/backfill implications, risks, open Product Owner decisions and a phased recommendation. Do not implement the recommendation.

### 5.2 Scope and safety gates

- Read-only inspection of source files, code and database is authorized.
- No product code, schema, migration, import, backfill or business-data write.
- No F1.3 KPI/SSOT change.
- Do not merge with Import, RBAC, F4.1 or the closed BCVH monthly-cumulative ticket.
- Do not use Browser/Web automation. Local source inspection, read-only database queries and local tests are allowed.
- Return the audit report to PO/CTO; Design and implementation require separate authorization.
