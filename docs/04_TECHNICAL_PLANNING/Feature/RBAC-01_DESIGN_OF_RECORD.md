# RBAC-01 Design of Record (v1, PO approved)

Date 2026-10-24. Author Claude Code (Sonnet 5.5). Status: `APPROVED BY PO 2026-10-24 (O1 amended, O2-O4 accepted as proposed)`. No code written. Business rules are those of `docs/10_TICKETS/RBAC-01_MANIFEST.md` (DEC-022) and are not restated here; this document only says how to build them. Evidence of the current system: `docs/06_REVIEWS/Shared/RBAC-01_DISCOVERY_001.md`.

## 1. Data model (SQLite, additive migration `migrate_rbac_01_schema.js`, registered in `server.js` startup like the other `migrate_*` files; no existing table touched)

| Table | Columns | Notes |
|---|---|---|
| `qis_user` | `id`, `username` (HRM, unique, trimmed), `display_name`, `tier` (`ADMIN`/`LEADER`/`STAFF`), `password_hash` (scrypt, existing `passwordHash.js`), `must_change_password` (0/1), `is_active`, `failed_attempts`, `locked_until`, `last_login_at`, `password_changed_at`, `created_at`, `updated_at` | one row per person |
| `qis_user_bcvh` | `user_id`, `ma_bcvh` | BCVH scope of STAFF. LEADER/ADMIN have no rows (implicit all). Codes: 533140, 536250, 535470, 537220, 537015, 535790 |
| `qis_user_indicator` | `user_id`, `indicator` (`F1.1`/`F1.2`/`F1.3`/`F4.1`/`HANGTON`) | indicators the user sees city-wide |
| `qis_session` | `session_hash` (sha256 of the id), `user_id`, `created_at`, `expires_at`, `last_seen_at` | replaces the in-memory `AuthSessionStore`; raw session id is never stored |
| `qis_auth_event` | `id`, `user_id`, `username`, `event`, `ip`, `at` | login ok/fail, lock, password change, reset, scope edit (who changed what) |

Static mapping in code (`access/officeMap.js`, tested): BCVH code to Hàng tồn office codes, where `535790` also owns `535710` (KT A Lưới, PO 2026-10-24); the other five own their own code; indicator `F1.2` grants Hàng tồn office `530100` (KTC1); `531110` and `531120` belong to nobody (LEADER only).

## 2. Access resolution (single pure function, the only place rules live)

`resolveAccess(user, bcvhList, indicators)` returns, and `/api/auth/me` and login send to the frontend:

```
{ tier, modules: { f11|f12|f13|f41: { mode: 'all'|'bcvh'|'none', bcvh: [codes] } },
  hangton: { screens: ['overview','office','compare','items'] subset, offices: 'all'|[office codes] },
  network: bool, admin: bool, crossBcvhBlocks: bool, home: true }
```

- ADMIN: everything, `admin:true`. LEADER: all modules `all`, all four Hàng tồn screens, `network:true`, `admin:false`, `crossBcvhBlocks:true`.
- STAFF, for f11/f13/f41: indicator in `qis_user_indicator` gives `all`; otherwise a non-empty BCVH scope gives `bcvh`; otherwise `none`. f12: `all` only with indicator F1.2, otherwise `none` (BCVH users never see F1.2). Union rule falls out of this (Bảo: f11 `all`, f13/f41 `bcvh [535470]`).
- Hàng tồn for STAFF: screens `office`, `compare` only; offices = map of the BCVH scope plus `530100` for the F1.2 specialist.
- `crossBcvhBlocks` (summary table "tại các BCVH", bảng đối chiếu, national rank) is true only where the module mode is `all`.
- `home` is true for every authenticated user and Trang chủ routes are not scoped.
- Multi-BCVH users (Minh: Phú Lộc + A Lưới) get `bcvh: [537220, 535790]`. PO decision O1: **never aggregate** BCVH (a merged figure would be wrong for per-BCVH analysis). Single-unit endpoints (KPI, trend, route ranking) take one BCVH: the requested one if in scope, otherwise the first code of the scope; the frontend shows a selector limited to the scope. List endpoints (Type B tables) return one row per BCVH in the scope, side by side.

## 3. Middleware contract

`requireAuth` loads the session from `qis_session`, rejects expired or inactive users, attaches `req.auth.user` and `req.access`. A user with `must_change_password=1` is allowed only `/auth/me`, `/auth/logout`, `/auth/change-password` (403 `PASSWORD_CHANGE_REQUIRED` elsewhere), enforced in the middleware, not the UI.

`requireModule('f13')` returns 403 when mode is `none`, otherwise sets `req.scope = { mode, bcvh }`. Routes are migrated module by module from `requireRole(['admin','viewer'])`; `requireRole` keeps working during the migration, so the system is never half-open.

Scope helpers used by controllers:
- `effectiveBcvh(req, requested)` is the only way a controller gets a BCVH filter. Mode `all`: the requested value or none. Mode `bcvh`: requested value must be in scope, otherwise 403 `OUT_OF_SCOPE`; absent means the first code of the scope for single-unit endpoints and the whole scope list for list endpoints (rows stay separate, never summed). Query values never widen scope.
- Type B list endpoints (all-BCVH rows) filter inside the service by `IN (scope)`. They must not return any number derived from other BCVH (city totals, ranks, averages): those fields are removed for mode `bcvh`.
- `requireAdmin` closes the GETs under `/api/import` that today need only `requireAuth` (Discovery 1.8).
- `requireCrossBcvh('f13')` guards `bcvh-reconciliation`, national rankings and `include_national_rank`.
- Exports (`items/export`, evidence) and the camera/screenshot data reuse the same scoped calls, so there is no second path.

## 4. Cache key

`responseCache.js` today uses `req.originalUrl`. Change: key = `originalUrl + '|' + scopeKey`, `scopeKey` = `all` or the sorted BCVH list (plus Hàng tồn office list on `/api/hangton`). `req.scope` is set before `cachedRead()`. Required test: two users with different scope request the same URL; the second must not receive the first's body. Home routes keep the plain key (they are not scoped).

## 5. Authentication flow

- **Login** `POST /api/auth/login {username, password}`; username is the HRM code. Generic error text for unknown user, wrong password and locked account. Response: `session_id`, `user {username, display_name, tier, role, must_change_password, access}`. `role` stays `admin` for ADMIN and `viewer` for everyone else, so the existing frontend gates keep working until Phase 3 replaces them with `access`.
- **Lockout:** 5 consecutive failures lock the account 15 minutes; success resets the counter. ADMIN can unlock. (Values adjustable, O2.)
- **First login:** accounts are seeded with `must_change_password=1`. `POST /api/auth/change-password {current_password, new_password}`: at least 8 characters with an upper-case letter, a lower-case letter and a special character, different from the current password (so the initial password cannot be kept) and from the username. On success the flag clears, other sessions of that user are revoked and the response carries a fresh session.
- **Sessions:** stored in `qis_session`, absolute 12 h (same as today), survive backend restarts, revoked on logout, reset and deactivation. Existing sessions are invalidated at deploy (one re-login).
- **Admin API** (ADMIN only, `/api/admin/users`): list, create, edit tier and scopes, reset password to the initial one with `must_change_password=1`, lock or unlock, deactivate. Every action writes `qis_auth_event`. An ADMIN cannot deactivate the last active ADMIN.
- **Passwords never appear** in the repository, logs, API responses or documents. The initial password comes from environment variable `QIS_INITIAL_PASSWORD` at seed time only.
- **Legacy removal:** the hard-coded `admin/admin123` default and the `QIS_VIEWER_*` path are removed from `runtimeUsers.js` once the DB accounts are verified; `f13viewer` is not migrated (PO: delete). Admin account is created by the seed from `QIS_ADMIN_USERNAME` (the PO's own account), with `must_change_password=1`.

## 6. Seed script (`scripts/seed-rbac-users.js`)

Input: path to `User QIS.xlsx` (outside git, remains untracked). Dry-run by default (prints counts and a masked list, writes nothing); `--apply` writes. Idempotent: upsert by username, update tier and scopes, never reset the password or the flag of an existing user. Parsing: `Đơn vị quản lý` split by comma, matched to BCVH codes through `ten_bcvh` in the data (`BCVH Phú Lộc` and so on); `Không` or empty gives no BCVH; `Chỉ tiêu quản lý` gives indicator rows; tier is LEADER for `Lãnh đạo BĐTP`, `Lãnh đạo TTVH`, `IT BĐTP`, STAFF otherwise. Unmatched unit name stops the run with the row number. Expected result for the current file: 15 users (3 + 1 LEADER, 11 STAFF) plus the ADMIN.

## 7. Frontend (UI owner: Antigravity; no browser use per standing instruction)

- `AuthContext` keeps `user.access`; `appNavigation.jsx` and `ProtectedRoute` gate by `access` (module, Hàng tồn screen, network, admin) instead of role; `VIEWER_ALLOWED_PATH_PREFIXES` is deleted.
- New pages: first-login "Đổi mật khẩu" (shown when `must_change_password`, blocks the rest of the app), admin "Quản lý người dùng" under Quản trị hệ thống.
- Where `crossBcvhBlocks` is false the "tại các BCVH" tables, national rank blocks and the BCVH comparison selectors are not rendered, and BCVH selectors list only the scope. The frontend hiding is cosmetic; the backend enforces.
- Report blocks touched keep the report block UI standard (camera, ordering, target line, colour family, date filter).

## 8. Delivery plan and tests

| Step | Content | Owner |
|---|---|---|
| 2a | Migration, `resolveAccess`, `officeMap`, session store, auth endpoints, change-password, lockout, admin API, seed script, legacy removal | Claude Code |
| 2b | Middleware (`requireModule`, `effectiveBcvh`, `requireAdmin`, cache key); no data endpoint behaviour changes yet except closing the `/import` GETs | Claude Code |
| 2c | Login, forced change-password page, admin users page | Antigravity |
| 3 | Module-by-module enforcement (F1.3, F1.1, F4.1, F1.2, Hàng tồn, Mạng lưới) per the Discovery matrix | Claude Code (+ UI hiding by Antigravity) |
| 4 | Independent review by Opus, PO UI check | Opus, PO |

Tests: unit tests of `resolveAccess` for every row of the Excel (expected modules per person); password policy; lockout; session survives restart; forced-change gating; `effectiveBcvh` rejects an out-of-scope `ma_bcvh`; cache isolation test; a **leak test** that calls every scoped endpoint as a BCVH user against a fixture holding two BCVH and fails if the response body contains the other BCVH's code or name; seed dry-run and idempotence; admin API refuses non-ADMIN.

## 9. PO decisions on the open items (2026-10-24)

- O1: no aggregation across BCVH; selector per BCVH; tables show each BCVH of the scope as its own row (section 2).
- O2: accepted, lockout 5 failures / 15 minutes, session 12 h.
- O3: accepted as proposed.
- O4: accepted, Dũng sees Hàng tồn "Theo bưu cục" and "So sánh hai mốc" for KTC1 `530100` only.

## 10. Implementation notes, step 2a (2026-10-24)

Deviations from the sections above, all technical:

- Sessions: `AuthSessionStore` keeps reads synchronous and in memory; with the persistence adapter attached at startup every stored-user session is also written to `qis_session` (sha256 of the id) and reloaded by `restore()`. Same guarantees (survive restart, revocable), no async change in `requireAuth`.
- `crossBcvhBlocks` is not a field of the access object: cross-BCVH blocks are shown for a module when `modules[m].mode === 'all'`.
- `runtimeUsers.js` and `generateViewerPasswordHash.js` are deleted outright; there is no env bootstrap login. The ADMIN account exists only after `seed-rbac-users.js --apply` with `QIS_ADMIN_USERNAME` set.
- **Deployment gate:** after the seed every account has `must_change_password=1` and the backend answers 403 `PASSWORD_CHANGE_REQUIRED` to everything but `/api/auth/*`. The current frontend has no change-password page, so the backend must not be restarted on the operational database with this code until step 2c (login redirect + change-password page) is delivered. The auto-sync script (`scripts/auto-sync-missing-days.js`) logs in as admin with `QIS_ADMIN_USERNAME/QIS_ADMIN_PASSWORD`: after the first password change it must be given the new password.

## 11. Implementation notes, step 2b (2026-10-24)

- `middleware/accessScope.js`: `requireModule(f11|f12|f13|f41)` (403 on mode `none`, sets `req.scope`), `requireAdminAccess`, `effectiveBcvh` (narrow-only, throws `OutOfScopeError` -> 403 `OUT_OF_SCOPE`, absent -> first code of the scope, never a merged view), `scopedBcvhList`, `scopeKey`.
- `responseCache.js`: key = URL + `|` + scopeKey when `req.scope` is set; unscoped routes (Trang chu) keep the URL key. `requireModule` must be mounted before `cachedRead()`.
- Wired now: `/api/f12` (`requireModule('f12')`: BCVH users get 403, F1.2 specialist/leader/admin pass; no filtering needed so enforcement is complete) and the 8 `/api/import` GETs that needed only `requireAuth` are now admin-only.
- Not wired yet (Phase 3, with the controller filtering that makes them meaningful): `requireModule` on f11/f13/f41, Hang ton, Mang luoi.

## 12. Implementation notes, step 3 - F1.3 (2026-10-24)

- `/api/f13`: `requireModule('f13')` mounted before `cachedRead()`; a router-level `scopeBcvhResponse()` removes, from every BCVH-mode body, any array row or map entry of a BCVH outside the scope (also catches nested lists such as `confirmed_non_postman_routes` in the route ranking meta and `bcvh_units` in `dashboard/meta`, found by the leak test).
- Type A (`resolveBcvh` in `DashboardController`): kpi, daily-trend, quality-timeline, window-comparison, ranking/route, ranking/route/periods, evidence-list, evidence. Foreign BCVH gives 403 `OUT_OF_SCOPE`; no BCVH or `all` is pinned to the first code of the scope. Quality-timeline therefore never computes the province-rank blocks for a BCVH user.
- Type B: route-level drops for BCVH mode: ranking `meta.total_row`, `meta.national_rank`, `data[].rank`; overview `data.mtd[].rank`, `data.meta.national_rank`; weekly and monthly comparison `data.total_row`; weekly trend `data.weeks[].total` and `national_rank`; window comparison `data.national_rank`. `dashboard/top` and `recommendations` are filtered to the own BCVH rows (recommendations carry `ten_bcvh`, matched by name).
- Tests: `routes/f13Routes.scope.test.js` runs the real router, session store and response cache on a fixture DB with three BCVH and scans every response (keys and values, first and cached) for another BCVH code or name; plus out-of-scope 403s, multi-BCVH separation (no merge), leader and F1.3 specialist see all, F1.2-only user gets 403, admin-only routes stay admin-only.
- Known gap carried to the UI step: for BCVH users `meta.pagination.total_items` counts only own rows (fine) and the frontend still expects `total_row` on the ranking pages, so Antigravity must render those pages without it.

## 13. Implementation notes, step 3 - F1.1 and F4.1 (2026-10-24)

- `/api/f11` and `/api/f41`: `requireModule` before `cachedRead()`, router-level `scopeBcvhResponse()`, controllers resolve the BCVH through `resolveBcvh` (summary, daily-trend, window-comparison; F4.1 also `dashboard/kpi`), out-of-scope errors become 403 through the controllers' `fail()`.
- Route-level drops for BCVH mode: `data.national_rank` (summary, window comparison), `meta.total_row`, `meta.national_rank`, `data[].rank` and the `comparison_rank` / `rank_movement` of the d1/d7 comparisons (ranking), `data.meta.national_rank` and `data.total_row` (weekly and monthly comparison), `kpi_scope_note` and `kpi_includes_non_canonical_bcvh` (meta, which also limits `bcvh_units` to the scope). The same weekly and monthly `meta.national_rank` and the comparison ranks were missing for F1.3 and are now dropped there too (found when the rank-key scan was added to the F1.3 test).
- City-wide only (`requireCityWide`, 403 in BCVH mode): F1.1 `dashboard/national-ranking`, F4.1 `dashboard/bcvh-reconciliation`.
- F1.1 accepting x delivering matrix (`restrictPairTable`): all accepting rows stay (PO rule 2), only the delivering columns of the scope remain, the "Khac" column of non-canonical delivering units is removed, and each row total and the grand total are recomputed from the remaining cells. A test proves the recomputation reproduces the service totals when nothing is removed.
- Test `routes/f11f41Routes.scope.test.js` (14 tests): per module leak scan of keys and values (first and cached answer), rank-key scan, own-rows-only tables, 403 on foreign BCVH, no cache mixing, multi-BCVH separation, leader / indicator specialist see all, other-indicator specialist gets 403, matrix behaviour. `rank` keys that order the routes inside the own BCVH (F1.3 route ranking) are intended and excluded from the scan.

## 14. Implementation notes, step 3 - Hang ton and Quan ly mang luoi (2026-10-24)

- Hang ton: `requireHangton(...screens)` per read endpoint sets `req.hangtonOffices` (null = all offices, else the office codes of the user). Screens: `/snapshots` any screen; `/overview` needs overview or office; `/compare` needs compare; `/items` and `/items/export` need items or office. The `office` (name) query only narrows further. `overview`, `items` and `compare` (all four SQL sides of the comparison) filter by `office_code`, so totals, charts, by-status, by-customer cards, resolved / new lists and exports contain only the scoped offices. Snapshot headers lose `source_row_count` and `kept_row_count` (size of the whole portal extract) for scoped users. The manual snapshot run stays admin-only.
- Decision to confirm with the PO: the Theo buu cuc screen opens a parcel list from its figures (commit 76165ebb) which calls `/items`. BCVH users therefore may call `/items` and `/items/export` for their own offices; their menu still shows only Theo buu cuc and So sanh hai moc (`access.hangton.screens`). If the PO wants the parcel list closed to them, the office screen must stop linking to it and `items` is removed from the office screen's endpoints.
- Quan ly mang luoi: `router.use(requireAuth, requireNetworkAccess)` before every route of `/api/network-map` (reads and admin writes), so only LEADER and ADMIN get in; the writes keep their admin gate.
- Test `routes/hangtonNetwork.scope.test.js` (7 tests; a mutation that disables the office filter fails 3 of them): foreign office code / name scan over every Hang ton endpoint incl. csv export and compare details, totals of the own office only, office filter cannot widen, KT A Luoi counted for A Luoi, F1.2 specialist sees KTC1 only, leader and admin see all, no-access user 403, admin-only snapshot run, network 403 for BCVH / F1.2 / F1.3 users.
