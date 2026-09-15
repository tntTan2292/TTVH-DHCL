# F13-ROUTE-POSTMAN-IDENTITY-01 Manifest

Status: `DISCOVERED / NOT ACTIVATED (2026-09-15)`. Registration only — no discovery, audit, design, or code work is authorized yet.

## 1. Ticket Information

- Ticket ID: `F13-ROUTE-POSTMAN-IDENTITY-01`
- Ticket Name: `F1.3 — Bổ sung Mã bưu tá + Tên bưu tá vào Tuyến phát Ranking`
- Owner: unassigned — pending Product Owner/CTO activation.
- Governance Version: `V2 Active`
- Registration authority: Product Owner decision received in chat, 2026-09-15, as part of the same instruction that paused `F41-DASHBOARD-MINIMUM-01` and activated `F13-BCVH-MONTHLY-CUMULATIVE-01`. This ticket is registered only, at the Product Owner's explicit direction — not activated.
- Branch registered on: `codex/da-impl-006`
- Baseline commit: `19b0021`

## 2. Objective (for whoever activates this ticket)

Bổ sung "Mã bưu tá" (postman/carrier code) và "Tên bưu tá" (postman name) vào Tuyến phát Ranking (Route Ranking), căn cứ trên các trường có trong BatchFile nguồn. Before any implementation: **audit the BatchFile's actual mapping and historical data** to confirm the postman code/name fields exist reliably, are stable per route, and reconcile against however Tuyến phát Ranking currently identifies a route — do not implement against an assumed mapping.

## 3. Scope (not yet locked — activation ticket must lock this)

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

Awaiting Product Owner/CTO decision to activate this ticket. Activation must first lock: the exact BatchFile source and its confirmed column mapping, the audit scope for historical-data reconciliation, and the Design of Record process this will follow (per `CODEX_PROMPT_STANDARD.md`) before any implementation begins. Not self-activated by this registration, and not self-activated by any other ticket's closure or pause.
