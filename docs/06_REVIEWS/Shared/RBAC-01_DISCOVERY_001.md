# RBAC-01 Discovery 001 (Phase 1, read-only)

Date 2026-10-24. Claude Code (Sonnet 5.5). No product code or data changed. Source: routes, controllers, `responseCache.js`, `database.sqlite` schema (read-only), `appNavigation.jsx`.

## 1. Findings that change the design

1. **Cache leak (blocker).** `responseCache.js` keys entries by `req.originalUrl` and its header states the controllers "do not read `req.auth`". Today a response is shared by everyone. Once responses depend on user scope, the key must include the scope, or the cache must be skipped for scoped users.
2. **No controller reads the user.** Scope has to be added as a mandatory middleware (`req.scope`) that the controllers pass to the services; the optional `ma_bcvh` / `bcvh` query parameter must be overridden, not trusted.
3. **Two kinds of endpoints.**
   - Type A: take an optional BCVH filter (`ma_bcvh`, `bcvh_id`, `bcvh`). Force it to the scope; reject a value outside the scope with 403.
   - Type B: return every BCVH and have no filter. Need a new row filter in the service (see section 2).
4. **Unit key differs per module.** F1.1 and F4.1 facts: `ma_bc_phat`. F1.3 facts: `ma_bcvh`. Aggregates `agg_f11/f13/f41_day` carry the BCVH dimension (good: no need to read the large fact tables). F1.2 aggregates are by accepting office / district, with no delivering BCVH: consistent with rule "BCVH users never see F1.2".
5. **National tables** (`fact_f11/f12/f13/f41_national`) hold other provinces. They feed `national-ranking` endpoints and "include_national_rank". These are province-level and must be hidden from BCVH users, except on Trang chủ (rule 9).
6. **Hàng tồn** items have `office_code` equal to the BCVH code for the 6 BCVH; `535710` (KT A Lưới) is mapped to A Lưới by PO; `530100` KTC1 for the F1.2 specialist; `531110`, `531120` LEADER only. The list filter is by `office` (name) today: the scoped filter should use `office_code`.
7. **Frontend gating is weak.** Only the "Quản trị hệ thống" group is role-gated; `VIEWER_ALLOWED_PATH_PREFIXES` is dead. Every route outside admin is open to `viewer`.
8. **Several GET endpoints under `/import` use `requireAuth` only** (auto-backfill coverage, runs, events, report, holiday calendar, exceptions, selectable). Any logged-in user, including BCVH staff, can read them. Must become ADMIN only.
9. **`/api/auth/me` and `/logout` have no middleware** (read the session themselves); fine, but the new user object must carry tier and scopes.

## 2. Endpoint x scope matrix (what Phase 3 must do)

| Area | Endpoints | Kind | Required handling |
|---|---|---|---|
| F1.1 | `dashboard/summary`, `daily-trend`, `ranking/bcvh/window-comparison` | A (`ma_bcvh`) | force scope |
| F1.1 | `dashboard/pair-table` (accepting x delivering matrix) | B | keep all accepting rows, restrict delivering column to scope |
| F1.1 | `dashboard/meta`; `ranking/bcvh`, `overview`, `weeks`, `weekly-comparison`, `weekly-trend`, `months`, `monthly-comparison` | B | rows limited to scope BCVH; indicator specialist and LEADER unrestricted |
| F1.1 | `dashboard/national-ranking` | C | hide for BCVH users |
| F1.2 | all `/api/f12/*` | - | LEADER, ADMIN, F1.2 specialist only; 403 for BCVH users |
| F1.3 | `dashboard/kpi`, `daily-trend`, `quality-timeline` (`ma_bcvh`), `dashboard/top`, `recommendations` | A | force scope |
| F1.3 | `ranking/bcvh*` (8 endpoints) | B | row filter |
| F1.3 | `ranking/route`, `ranking/route/periods` (`bcvh`), `evidence-list` (`bcvh`), `evidence` (query service) | A | force scope; `evidence` needs check that BCVH is derivable |
| F1.3 | `quality-timeline` option `include_national_rank` | C | disable for BCVH users |
| F4.1 | `dashboard/kpi`, `summary`, `daily-trend`, `ranking/bcvh/window-comparison` | A | force scope |
| F4.1 | `dashboard/bcvh-reconciliation`, `ranking/bcvh*` | B | row filter; reconciliation is a cross-BCVH table: specialist, LEADER, ADMIN only |
| Hàng tồn | `/snapshots`, `/overview`, `/items`, `/items/export`, `/compare` | B | BCVH users: office_code filter, only "Theo bưu cục" and "So sánh hai mốc" data (overview and items endpoints 403 for them); LEADER all |
| Mạng lưới | `service-points`, `level2-routes`, `delivery-routes/*`, `postman-catalog` (3 GET) | - | LEADER, ADMIN only |
| Trang chủ | `/api/home/executive`, `national-ranking` | - | all logged-in users, unchanged |
| Admin | `/api/import/*`, f13 import/pareto/message/agg-status, hangton `snapshots/run`, all network-map writes | - | ADMIN only (close the `requireAuth`-only GETs in section 1.8) |

## 3. The BCVH summary table

"BẢNG TỔNG HỢP SỐ LIỆU CHỈ SỐ ... TẠI CÁC BCVH" is built in `frontend/src/features/dashboard/components/bcvhOperationTableData.js` (rendered by `BcvhOperationTable.jsx`). It is cross-BCVH data, so the frontend must hide it and the backend must refuse the data (Type B row endpoints) for BCVH users. Two "BẢNG TỔNG HỢP SO SÁNH ... THEO TUẦN / THÁNG TẠI CÁC BCVH" tables in `BcvhWeeklyComparisonBlock.jsx` are the same class: they follow rule 6 (own BCVH rows only on Phân tích BCVH).

## 4. Open design points (technical, to settle in Phase 2 design)

- Whether BCVH users on Type B ranking pages get a one-row table or a screen redesigned around one unit; PO rule 6 says own rows only.
- Cache: include a scope fingerprint in the key (preferred, keeps the cache for repeated reads) versus bypass.
- Lockout threshold and session TTL (manifest section 7).

## 5. Next

Phase 2 (foundation): users and scope tables, seed from `User QIS.xlsx` (file stays untracked), persistent sessions, login with forced password change, ADMIN user screen. Needs explicit activation by the PO. Recommend a short Design of Record first (data model, middleware contract, cache key), reviewed before coding.
