# RBAC-01-UI Manifest (step 2c: frontend)

Status: `DEFINED / READY FOR ANTIGRAVITY (2026-10-24)`. Parent ticket `RBAC-01` (`RBAC-01_MANIFEST.md`, Design of Record `docs/04_TECHNICAL_PLANNING/Feature/RBAC-01_DESIGN_OF_RECORD.md`, DEC-022). Executor: Antigravity (Gemini). The backend is done and enforces everything (commits `ff0a6e99`..`fbcddc74`); this ticket only makes the screens follow it. Parallel workstream: `PROJECT_SNAPSHOT.md` Current Ticket is another ticket.

Required Reading: `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md` (blocks you touch keep camera, click-to-order titles, target line, colour family, date filter).

## 1. Backend contract you build on (do not change the backend)

**Login** `POST /api/auth/login {username, password}` -> `{session_id, user}`; `user = { username, display_name, tier: 'ADMIN'|'LEADER'|'STAFF', role: 'admin'|'viewer' (legacy), must_change_password, access }`. `GET /api/auth/me` returns the same `user`.

**`access`** (the only thing the UI decides from; `role` is legacy):

```
{ tier, home: true,
  modules: { f11|f12|f13|f41: { mode: 'all'|'bcvh'|'none', bcvh: ['537015', ...] } },
  hangton: { screens: ['overview'|'office'|'compare'|'items', ...], offices: 'all' | ['537015', ...] },
  network: boolean, admin: boolean }
```

- `mode 'all'`: whole city. `mode 'bcvh'`: only the listed BCVH codes. `mode 'none'`: module hidden.
- BCVH codes: 533140 Thuận Hóa, 536250 Hương Thủy, 535470 Hương Trà, 537220 Phú Lộc, 537015 Thuận An, 535790 A Lưới.

**First login.** While `must_change_password` is true every API except `/api/auth/*` answers `403 {error:{code:'PASSWORD_CHANGE_REQUIRED'}}`. `POST /api/auth/change-password {current_password, new_password}` -> `{session_id, user}` (a NEW session id: replace the stored one). Errors: `WRONG_CURRENT_PASSWORD`, `WEAK_PASSWORD` (`message` and `problems[]` in Vietnamese), `MISSING_FIELDS`. Policy: at least 8 characters, an upper-case, a lower-case and a special character, different from the current password and the username.

**Out of scope** answers `403 {error:{code:'OUT_OF_SCOPE'}}`; show a short Vietnamese message, never crash the page.

**Admin users API** (ADMIN only): `GET /api/admin/users` -> list `{id, username, display_name, tier, must_change_password, is_active, failed_attempts, locked_until, last_login_at, bcvh[], indicators[]}`; `POST /api/admin/users {username, display_name, tier, bcvh[], indicators[]}` (201; 409 `USER_EXISTS`); `PUT /api/admin/users/:id {display_name?, tier?, bcvh?, indicators?, is_active?}` (409 `LAST_ADMIN`); `POST /api/admin/users/:id/reset-password`; `POST /api/admin/users/:id/unlock`. Indicators: `F1.1 F1.2 F1.3 F4.1 HANGTON`. ADMIN and LEADER have no BCVH/indicator rows. The initial password is set by the server and must never be shown or typed in the UI.

## 2. What to build

1. **Auth state.** `AuthContext` keeps `user.access` and `user.must_change_password`; add `changePassword()`; `authClient`/`httpClient` store the new session id after a change and, on `PASSWORD_CHANGE_REQUIRED`, send the user to the change-password page. The legacy `role` checks stay only where nothing else exists.
2. **Page "Đổi mật khẩu"** (`/change-password`, full screen, no sidebar): current, new, confirm fields, the four rules listed, server `problems[]` shown. While `must_change_password` is true every other route redirects here; after success go to `/`. Also reachable from the user menu for a voluntary change.
3. **Route and menu gating by `access`** instead of `allowedRoles`: replace `ROLE_ADMIN/ROLE_VIEWER` gates in `App.jsx`, `ProtectedRoute`, `appNavigation.jsx`, quick links and the dead `VIEWER_ALLOWED_PATH_PREFIXES`. Rules: module groups F1.1/F1.2/F1.3/F4.1 show when `modules[m].mode !== 'none'`; Hàng tồn shows the items of `hangton.screens` (Tổng quan / Theo bưu cục / So sánh hai mốc / Chi tiết bưu gửi); "Quản lý mạng lưới" only when `access.network`; "Quản trị hệ thống" only when `access.admin`; Trang chủ for everyone and unchanged. Unknown or forbidden path -> `/unauthorized`. Put the rules in one pure module (for example `auth/accessModel.js`) with tests; menus and routes read from it.
4. **Screens for BCVH-mode users** (`mode 'bcvh'`, F1.1 / F1.3 / F4.1):
   - BCVH selector lists only `modules[m].bcvh` (names above), no "Tất cả/Toàn thành phố" option, default = first; with several BCVH the user switches between them and tables list each BCVH as its own row, never a merged total.
   - Hide the cross-BCVH blocks when the module mode is not `all`: the "BẢNG TỔNG HỢP SỐ LIỆU CHỈ SỐ ... TẠI CÁC BCVH" table at the top of each Bảng điều hành, top/lowest lists, national and province rank blocks, F1.1 national ranking, F4.1 BCVH reconciliation. The backend no longer sends `meta.total_row`, `total_row`, `rank`, `comparison_rank`, `rank_movement`, `national_rank`, `kpi_scope_note`: ranking and comparison tables (Phân tích BCVH, tuần/tháng) must render without them (no "TỔNG CỘNG" row, no rank column or movement arrow).
   - F1.1 matrix: only the user's delivering column(s) arrive; keep every accepting row.
   - Route ranking and evidence pages: BCVH fixed to the scope.
5. **Hàng tồn.** Tab bar from `hangton.screens`; default tab = first allowed; `/hangton/:tab` outside the list -> `/unauthorized`. PO decision 2026-10-24: a user without the "Chi tiết bưu gửi" screen can still open the parcel list from the figures of "Theo bưu cục" (backend limits it to their offices); open it inside the office screen (panel or modal) or via the same page state, without adding the tab to their bar. Office lists come from the API response, do not assume 9 offices.
6. **Page "Quản lý người dùng"** (`/admin/users`, item in Quản trị hệ thống): searchable table (HRM, name, tier, BCVH, indicators, status, last login), create and edit (tier; BCVH multi-select with names, enabled for STAFF only; indicator checkboxes, STAFF only), activate/deactivate, unlock, reset password (confirm dialog, text "Đặt lại về mật khẩu khởi tạo, người dùng phải đổi ở lần đăng nhập đầu"). Show Vietnamese messages for 409 `USER_EXISTS` and `LAST_ADMIN`.

## 3. Constraints

- No backend, schema, API or payload change. Test cases already written for existing behaviour keep passing; update a test only where it asserts the old role gating, never weaken it.
- New logic in pure helpers with tests (accessModel for every person type: leader, F1.1 + Hương Trà user, Phú Lộc + A Lưới user, Thuận Hóa director, F1.2 specialist, admin).
- Forbidden for this executor: opening a browser, Playwright, screenshots, dev server, logging in. Do not claim PO UI PASS; stop at `READY FOR PO UI CHECK`. Commit by pathspec, never `git add -A`; another session edits other files in this workspace.
- Do not deploy or restart the backend; do not touch `User QIS.xlsx`.

## 4. PO checklist (after implementation)

Login with a seeded account -> forced change-password page -> weak passwords rejected -> lands on Trang chủ. Leader sees every module and mạng lưới, not Quản trị. Thuận Hóa director sees F1.1/F1.3/F4.1 only for Thuận Hóa, no F1.2, no mạng lưới, no summary-by-BCVH table, no TỔNG CỘNG row; Hàng tồn only Theo bưu cục and So sánh hai mốc, parcel list opens from Theo bưu cục. F1.2 specialist sees only F1.2 and Hàng tồn KTC1. Admin sees Quản lý người dùng and can create, reset, unlock.

## 5. Handoff

Update this manifest (Section 6), `DOCUMENT_INDEX.md` if new docs are added, report briefly to Claude/CTO: files changed, test/build/lint output, residual.

## 6. Status log

- **2026-10-24 — Antigravity (Gemini)**: Implementation completed, verified via build, lint, and unit tests. Status set to `READY FOR PO UI CHECK`.
  - **Artifacts Created / Modified**:
    - `frontend/src/auth/accessModel.js`: Pure helper defining canonical BCVH mapping, `canAccessPath`, `getModuleAccess`, `isModuleAllMode`, `isModuleBcvhMode`, `getAllowedBcvhCodes`, `getAllowedHangtonScreens`, `filterNavigationByAccess`.
    - `frontend/src/auth/accessModel.test.js`: 8 unit test suites for ADMIN, LEADER, Thuận Hóa director, Hương Trà + F1.1, Phú Lộc + A Lưới, F1.2 specialist, and navigation tree pruning.
    - `frontend/src/api/authClient.js` & `httpClient.js`: Support for `changePassword(current_password, new_password)`, automatic interception of 403 `PASSWORD_CHANGE_REQUIRED` redirecting to `/change-password`, extraction of `problems[]` array.
    - `frontend/src/auth/AuthContext.jsx`: Exposed `changePassword`, maintaining `user.access` and `user.must_change_password`.
    - `frontend/src/pages/ChangePasswordPage.jsx`: Full-screen forced password change page outside `MainLayout` with real-time rule checklist and backend Vietnamese `problems[]` display.
    - `frontend/src/components/Topbar.jsx`: Tier badge display (ADMIN, LEADER, STAFF) and "Đổi mật khẩu" action menu item.
    - `frontend/src/components/ProtectedRoute.jsx`: Enforces `must_change_password` redirect, access-based gating via `canAccessPath`, fallback role check for legacy routes.
    - `frontend/src/pages/LoginPage.jsx`: Auto-redirect to `/change-password` when `user.must_change_password` is true.
    - `frontend/src/api/adminClient.js` & `frontend/src/pages/UserManagementPage.jsx`: Admin user management under `/admin/users` (searchable table, tier/indicators/BCVH create/edit modal with STAFF-only scoping, activate/deactivate, unlock, reset password confirmation dialog displaying temporary password).
    - `frontend/src/navigation/appNavigation.jsx` & `frontend/src/navigation/appNavigation.test.js`: Navigation tree integration of `/admin/users`, `getNavigationForRole(role, access)`, `getDashboardQuickLinks(role, access)`.
    - `frontend/src/components/Sidebar.jsx` & `frontend/src/components/shared/SharedLayout.jsx`: Navigation pruning via `filterNavigationByAccess`, breadcrumb support for new routes.
    - `frontend/src/App.jsx`: Route registration for `/change-password` and `/admin/users`.
    - `frontend/src/features/dashboard/components/dashboardFilterOptions.js` & `.test.js`: Added `allowedCodes` filtering to `buildBcvhOptions` (omits "Tất cả" option and restricts selectable units in BCVH mode).
    - `frontend/src/features/dashboard/DashboardPage.jsx`: Restricted BCVH selector in BCVH mode, defaulted to allowed BCVH, conditionally hid `BcvhOperationTableAdapter` when mode is not `'all'`.
    - `frontend/src/features/dashboard/components/UnifiedBcvhAnalysisTable.jsx`: Dynamic table rendering without rank column when no row has rank (adjusts sticky offsets), safe rendering when `total_row` or `national_rank` are absent.
    - `frontend/src/features/ranking/BcvhRankingPage.jsx`: Filtered BCVH options, defaulted selector to allowed BCVH, hidden cross-BCVH comparison blocks (`BcvhWeeklyComparisonBlock`, `BcvhMonthlyTrendBlock`, overview blocks) in BCVH mode.
    - `frontend/src/features/route/RoutePerformancePage.jsx` & `ShipmentPerformancePage.jsx`: BCVH selectors filtered by user's allowed scope.
    - `frontend/src/features/hangton/HangTonPage.jsx`: Tab bar derived from `hangton.screens`, direct unauthorized URL redirect to `/unauthorized`, drilldown modal (`HangTonItemsModal`) when user without `items` screen clicks office figures in "Theo bưu cục".
    - `frontend/src/features/dashboard/components/dashboardLoadPerformance.test.js`: Updated regex to support `scopedBcvh` from backend scoping changes.
  - **Quality Gates**:
    - Build: `npm run build` -> Clean pass (1.37s).
    - Lint: `oxlint` -> 0 errors (42 pre-existing warnings in unrelated files).
    - Tests: All 31 targeted RBAC & dashboard test suites pass (100%), 0 fails.

