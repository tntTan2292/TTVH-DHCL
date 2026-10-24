# RBAC-01 Manifest

Status: `DEFINED / NOT ACTIVATED / READY FOR DISCOVERY (2026-10-24)`. Business rules locked by the PO in chat (DEC-022). No product code changed yet. Executor: Claude Code (Sonnet 5.5) for implementation; independent review by Opus (high risk, cross-cutting, data-leak surface). `PO UI Check Required = Yes`. Parallel workstream; `PROJECT_SNAPSHOT.md` Current Ticket is another ticket.

Required Reading: `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md` (any report block touched keeps its camera, ordering, target line, colour family, date filter).

## 1. Problem

Today there are only two roles (`admin`, `viewer`), users come from environment variables (`runtimeUsers.js`, shared `f13viewer`), sessions live in RAM (`AuthSessionStore.js`, TTL 12 h) and the backend filters by role only, never by BCVH. A BCVH user must see only their own BCVH.

## 2. Users (source: `User QIS.xlsx`, 15 people; file holds HRM codes and names, must NOT be committed)

| Group | People | Tier |
|---|---|---|
| Lãnh đạo BĐTP / TTVH | Mai Văn Mười, Lê Thị Hồng Nhung, Lê Thanh Bình | LEADER |
| IT BĐTP | Âu Thái Tuấn | LEADER (not admin) |
| Giám đốc BCVH | one per BCVH (6) | STAFF, BCVH scope |
| Chuyên quản BCVH | Minh (Phú Lộc + A Lưới), Phát (Hương Thủy), Hương (Thuận An) | STAFF, BCVH scope |
| Chuyên quản BCVH + chỉ số | Bảo (Hương Trà + F1.1) | STAFF, BCVH scope + indicator F1.1 |
| Chuyên quản chỉ số | Dũng (F1.2) | STAFF, indicator scope |
| Admin | the PO's own account, separate, not listed in the Excel | ADMIN |

Model per user: `tier` (ADMIN / LEADER / STAFF), `bcvh_scope` (list of BCVH codes or ALL), `indicator_scope` (list of indicators seen city-wide). Giám đốc BCVH and Chuyên quản BCVH have the same permissions.

## 3. Rules (PO decisions)

1. LEADER: every module, whole city, except "Quản trị hệ thống" (ADMIN only).
2. STAFF with `bcvh_scope`: F1.1, F1.3, F4.1 only for their BCVH, by delivery side (`ma_bc_phat` / `ma_bcvh`). Matrix F1.1 accepting x delivering: all accepting directions, only their delivering BCVH. No province-wide view, no "khối điều hành ngày". Never F1.2.
3. Indicator specialist: full module of that indicator, whole city, not limited by BCVH. No other F module (Dũng sees only F1.2). F1.2 is visible only to users with no BCVH scope (LEADER, ADMIN, F1.2 specialist).
4. Union rule: Bảo sees F1.1 whole city; F1.3 and F4.1 only Hương Trà.
5. The table "BẢNG TỔNG HỢP SỐ LIỆU CHỈ SỐ ... TẠI CÁC BCVH ĐẾN NGÀY ..." at the top of each indicator's Bảng điều hành is visible to indicator specialists, LEADER and ADMIN only.
6. Pages "Phân tích BCVH" and "Phân tích tuyến phát": BCVH users see only their own BCVH's rows.
7. Hàng tồn: BCVH users see only "Theo bưu cục" and "So sánh hai mốc", only their BCVH (office_code = BCVH code for the 6 BCVH). Dũng also sees Hàng tồn of KTC1 (office_code 530100). LEADER sees all four screens, all offices. Office 535710 (KT A Lưới) is counted as BCVH A Lưới (PO 2026-10-24), so A Lưới users see it with 535790. Offices 531110, 531120 have no BCVH owner: LEADER only.
8. Quản lý mạng lưới (all 5 screens): LEADER and ADMIN only.
9. Trang chủ "Tổng quan điều hành": unchanged for every logged-in user, not filtered by scope.
10. Evidence/shipment/postman detail rows, Excel exports and the camera button follow the same scope as the screen.
11. Shared account `f13viewer` and `QIS_VIEWER_*` are removed once personal accounts exist.

## 4. Passwords

Username = HRM code. Initial password set by the seed script from an argument or env var (value never written to git or docs). First login forces a change: at least 8 characters with upper, lower and special character; the initial password cannot be reused. Hash with scrypt (`passwordHash.js`). Reset by ADMIN. Lockout after repeated failures (threshold to be proposed in discovery).

## 5. Technical risks to close in design

- `responseCache.js` keyed by URL: scope must be part of the key or one BCVH reads another's cached data.
- Pre-aggregated tables (`agg_f11/f12/f13/f41_day`) and `*_national` may lack a BCVH dimension: inventory per endpoint.
- Enforcement in backend repositories; query parameters from the client cannot widen scope. Frontend hiding is cosmetic only.
- F4.1 filters by `ma_bc_phat`, F1.3 by `ma_bcvh`: normalise in the query layer, no data change.
- Sessions must persist across backend restarts.
- Dead `VIEWER_ALLOWED_PATH_PREFIXES` in `frontend/src/auth/roles.js` to be replaced.

## 6. Phases

0. Rules locked (this document, DEC-022).
1. Discovery, read-only: table endpoint x filter column x cache x aggregate table.
2. Foundation: users/scope tables, seed from the Excel, persistent sessions, login with forced password change, ADMIN user management screen.
3. Scope enforcement per module: F1.3, F1.1, F4.1, F1.2, Hàng tồn, Quản lý mạng lưới; navigation and routes by permission; hide the summary table.
4. Permission-matrix tests (each user group x each endpoint, including forged `ma_bcvh`), independent Opus review, PO UI check.

## 7. Open items

- Lockout threshold and session TTL.
- Admin account name and its password handover.
- Whether Dũng's KTC1 Hàng tồn includes both screens (assumed: same two screens as BCVH users, "Theo bưu cục" and "So sánh hai mốc").
