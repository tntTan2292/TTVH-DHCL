# F13 Route Ranking Redesign — Plan Checkpoint 001

- Ticket: `F13-ROUTE-RANKING-REDESIGN-PLAN`
- Status: `CLOSED / DESIGN PLAN ACCEPTED / PO APPROVED / CTO FINALIZED`
- Date: `2026-08-03`
- Authors: static-code inspection by Antigravity (`docs/F13_ROUTE_RANKING_EVIDENCE_HANDOFF.md`), targeted data discovery and design plan by Claude Code–Opus, final scope lock by ChatGPT/CTO.
- Baseline: `7fd33ce130227a0c2b24d3b36aa0980bf8fc9ad3`; no product code changed in this ticket.

## 1. Discovery Basis

- Static code inspection (Antigravity, browser subagent `RESOURCE_EXHAUSTED`, no runtime/visual evidence): `docs/F13_ROUTE_RANKING_EVIDENCE_HANDOFF.md`.
- Targeted data discovery (Claude Code–Opus, read-only queries against `backend/src/db/database.sqlite`, `fact_f13`, 659,454 rows):
  - `fact_f13` has 45 columns; no postman/employee field exists anywhere in the database (6 tables total: `fact_f13`, `fact_f13_national`, `import_log`, `sqlite_sequence`, `sys_kpi_thresholds`, `system_config`). No route-to-postman mapping table exists.
  - `ket_qua_f13` domain is exactly `{Đạt, Không đạt, NULL}` — it is not a root-cause field.
  - Unevaluated (`danh_gia_2026 IS NULL`) share, last 30 days, Hue scope (`ma_tuyen LIKE '53%'`): 5.03% overall; 93.78% concentrated in the 7 PO-confirmed catalog routes; 0.49% in postman-classified routes.
  - `sys_kpi_thresholds` (Xanh ≥70 / Hồng 60–69.99 / Vàng 50–59.99 / Đỏ <50) exists in schema/seed but is read by no backend code, and its seed rows are duplicated 3x.
  - `loai_tuyen_phat` is 100% populated in Hue scope, 11 distinct values, exactly one value per route (verified: 0/92 routes have more than one value on the reference day).
  - Max routes per BCVH per day across all history: 35 (current `page_size=1000` is far in excess — client-side sort/filter confirmed safe).
  - Frontend hardcoded `from_date = '2026-06-23'` is 41 days stale versus the latest valid data date (`2026-08-02`); the database also contains 4 garbage future-dated rows (up to `2098-02-18`) that must be excluded when computing "latest valid date."

## 2. PO-Confirmed Business Objective

Recorded in `F13-ROUTE-RANKING-REDESIGN-PLAN_MANIFEST.md` Section 5 (`2026-08-03`): build an operational decision-support tool for route-level intervention need, priority, root cause, responsible postman, and next action — while preserving the full accepted filter/classification contract, and treating Route → Shipment drill-down as design-only pending separate authorization.

## 3. Locked Design Decisions (PO Approved / CTO Finalized, `2026-08-03`)

These decisions supersede the Opus design-plan draft (`priority tiers`, `<60% intervention threshold`, `≤20% unevaluated exclusion rule`, `Đỏ/Vàng/Xanh badges`) wherever they conflict. CTO explicitly cancelled that inferred threshold/tier logic.

1. **Default sort:** `Tỷ lệ đạt DESC` (passed_rate descending), consistent with BCVH Ranking's sort principle. Not `Không đạt DESC`, not `Tỷ lệ đạt ASC`.
2. **`sys_kpi_thresholds` is NOT used in MVP.** No color tiering, no `Đỏ/Vàng/Xanh` badges, no priority labels (`Cao/Trung bình/Thấp`), no `<60%` intervention threshold, no `≤20%` unevaluated-exclusion rule. All of this inferred logic from the draft plan is cancelled.
3. **Table columns (full set, no priority/tier column):** `Tổng BG`, `Đạt`, `Không đạt`, `Chưa đánh giá`, `Tỷ lệ đạt` — plus route identity columns (`Mã tuyến`, `Tên tuyến`) and the existing `Phân loại` badge. `Loại tuyến phát` may be added as an additional column/filter since it is 100%-covered and 1:1 per route.
4. **KPI row (MVP, 4 cards):**
   - Số tuyến phát sinh không đạt (count of routes with `total_failed > 0`)
   - Tỷ lệ đạt toàn BCVH = `ΣĐạt / ΣTổng BG`
   - Tổng BG không đạt = `Σtotal_failed`
   - Tổng số tuyến
5. **New filter:** `Chỉ tuyến có bưu gửi không đạt` (routes where `total_failed > 0`). This is a factual filter (no threshold, no inferred priority).
6. **Unevaluated data (`Chưa đánh giá`):** must be shown as an explicit number/column. No color coding, no quality conclusion, no exclusion rule may be applied to routes carrying unevaluated shipments.
7. **Shipment drill-down:** not rendered in MVP, not even as a disabled placeholder. Recorded in Deferred scope only (see Section 5).
8. **Default date:** must resolve to the latest valid data date not exceeding the current date, excluding garbage future-dated rows. The `2026-06-23` hardcode must not remain.
9. **Filter/classification contract:** `Tuyến bưu tá | Tất cả` labels and default, Hue `ma_tuyen LIKE '53%'` scope, the 7 PO-confirmed catalog routes, and `routeRankingFilters.js` remain fully unchanged.

## 4. Layout (PO Approved)

Two-column: ranking table ~65% width, selected-route context panel ~35% width; collapses to a single column below 1200px viewport width.

## 5. Deferred Scope (explicit — insufficient data, not a design choice)

| Item | What is missing | Condition to lift |
|---|---|---|
| Bưu tá phụ trách (responsible postman) | No column in `fact_f13` (45 columns checked); no route-to-postman mapping table anywhere in the database (6 tables checked) | A new data source: a PO-provided mapping catalog, or a postman field confirmed to exist in the upstream F1.3 source file (not yet checked — out of scope for this ticket) |
| Root cause / nguyên nhân F1.3 | `ket_qua_f13` domain is only `{Đạt, Không đạt, NULL}` — no field in `fact_f13` describes a reason | A reason/cause field in the upstream source, or a PO-defined derivation rule from timing fields (`thoi_gian_*`), which are not currently normalized |
| Route → Shipment drill-down | Design-only per PO; runtime requires its own separate validation and authorization | Separate PO/CTO authorization ticket |
| Trend / date-range comparison | Backend accepts a single `ngay_do_kiem = ?`; `to_date` has no path into the backend query | Backend change to accept a date range, out of scope here |

No dead UI, no placeholder blocks, and no fabricated data may be introduced for any Deferred item.

## 6. Explicitly Forbidden Inferences (binding on the implementation ticket)

- No priority tiering, no severity labels, no color-coded row/cell warnings of any kind.
- No `sys_kpi_thresholds` consumption.
- No threshold-based "cần can thiệp" (intervention) classification of any kind — the CTO-approved MVP identifies distress only via factual counts/filters (`Không đạt > 0`), not via a derived priority judgment.
- No quality conclusion drawn about a route while it carries unevaluated shipments — unevaluated count must be shown as-is.
- No fabricated postman or root-cause data, and no disabled/placeholder UI standing in for them.
- No change to `passed_rate`'s calculation formula, to the filter/classification contract, or to `routeRankingFilters.js`.

## 7. Known Repository Defects Noted But Explicitly Out of Remediation Scope

- `sys_kpi_thresholds` seed rows are duplicated 3x in `backend/src/db/schema.sql`. Not remediated by this ticket or its implementation successor; not to be scoped as an incidental fix.
- 4 garbage future-dated rows exist in `fact_f13` (up to `2098-02-18`). Not remediated as a data-quality fix; the implementation ticket may only apply the minimum date filtering necessary to compute "latest valid date not exceeding current date" for this screen's default, per Section 3 item 8.

## 8. Acceptance Criteria (carried into the implementation ticket)

1. Default sort is `Tỷ lệ đạt DESC`; sortable columns work client-side.
2. Filter/classification contract (`Tuyến bưu tá | Tất cả`, `53%` scope, 7 catalog routes) is byte-identical to the PO-PASS state.
3. Table shows `Tổng BG`, `Đạt`, `Không đạt`, `Chưa đánh giá`, `Tỷ lệ đạt` with no color tiering or priority labels anywhere.
4. KPI row shows exactly the 4 cards in Section 3 item 4, with `Tỷ lệ đạt toàn BCVH` computed as `ΣĐạt / ΣTổng BG`.
5. `Chỉ tuyến có bưu gửi không đạt` filter works and introduces no threshold logic.
6. Routes with unevaluated shipments show the unevaluated count plainly; no color/quality treatment differs because of it.
7. No Shipment drill-down UI (enabled or disabled) is rendered.
8. Default date resolves to the latest valid date ≤ current date, excluding future-dated garbage rows; no remaining `2026-06-23` hardcode.
9. No bưu tá or root-cause UI, placeholder, or fabricated data is present.

## 9. Handoff

`F13-ROUTE-RANKING-REDESIGN-PLAN` is closed with this checkpoint as its final design record. Next ticket: `F13-ROUTE-RANKING-REDESIGN-IMPL`, authorized by explicit PO approval and CTO scope finalization, executor `Claude Code–Sonnet`. See `docs/10_TICKETS/F13-ROUTE-RANKING-REDESIGN-IMPL_MANIFEST.md`.
