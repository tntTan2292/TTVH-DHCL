# HANGTON-HANDLING-01 - Follow-up of stock (hàng tồn) handling at the BCVH, with a reusable position / capability registry

Status: IMPLEMENTED (Phase 1, backend + frontend) / technical validation done / PO UI check pending / backend restart + position backfill pending
Owner: Claude Code (Sonnet 5.5), 2026-10-27. Does not change the Current Ticket.

## 1. PO request and decisions (2026-10-27)

The PO wants to manage how the BCVH handle stock: people enter the handling and its result, the system keeps a log per mốc and per day, parcels still in stock keep what was entered (no re-typing, corrections with history), statistics of reviewed / not reviewed parcels, and a permission model built once so later features do not rebuild it.

Decisions:

1. Who enters: **Giám đốc BCVH** and **Chuyên quản BCVH**. Leaders only view. Leaders are two groups: **Lãnh đạo BĐTP** (higher) and **Lãnh đạo TTVH + IT BĐTP** (one group).
2. Scope to review: stock of **>= 5 days** (target D4: >= 5 days to 0).
3. "Đã rà soát" = a day with an entry holding **every required field**.
4. Every question has a **"Khác"** option with free text; statistics **group the free texts smartly** so the reasons do not scatter.
5. An entry may be corrected **within the day**; a correction of a past day is applied only after the **Chuyên quản BCVH approves**.
6. Chuyên quản of Thuận Hóa (and of F1.3 / F4.1 / hàng tồn) is the **admin account for now** (the PO moves it to their own account later); KTC1 goes to **Nguyễn Anh Dũng**; offices without a chuyên quản go to the **admin**.
7. A parcel that stays in stock the next day shows the old entry as "Chờ xác nhận lại"; one tick + button **"Giữ nguyên"** (bulk) confirms it.

## 2. Data

Keyed by `item_code`, not by snapshot (snapshots are replaced; the handling is not). Tables (additive, created at backend start by `migrate_hangton_handling_01_schema.js`):

- `hangton_handling_log`: append-only. One row per review: parcel, business date, mốc (snapshot, slot), office, level and customer group at that time, `action` (REVIEW / KEEP / EDIT / EDIT_APPROVED), cause / plan / result (code + free text for "Khác"), due date, postman, note, who, position, approver, `supersedes_id`. Never updated or deleted. The entry that counts for a day is the last row of that day; the one carried forward is the newest by (date, id).
- `hangton_edit_request`: request to correct an entry of a past day (PENDING / APPROVED / REJECTED, reason, proposed values, decision).
- `hangton_reason_map`, `hangton_option_group`: wordings a chuyên quản put into a group, and groups they created.
- `qis_user.position` (nullable column added in place by `applyRbac01Schema`).

Standard answers and grouping rules live in code (`handling/catalog.js`), as the PO fixed them on 2026-10-27: **cause** = Khách hàng hẹn phát lại, Thư TCNH có yêu cầu lưu 7 ngày, Chờ chuyển VTN, Nguyên nhân khác; **plan** = Phát lại ngày …, Chuyển hoàn ngày …, Liên hệ Bưu cục gốc …, Chuyển cấp trên hỗ trợ …, Hướng xử lý khác; **result** = Đã xử lý, Chưa xử lý only (why a parcel is not handled is read from cause and plan). The date is required with the two "ngày" plans; "Liên hệ Bưu cục gốc" and "Chuyển cấp trên hỗ trợ" take an optional detail (`plan_text`). The former wordings (Khách vắng nhà, Hẹn lại khách, …) stay in the catalog as non-selectable groups so a "khác" text still lands in a group. The plan keeps a "Hướng xử lý khác" (decision 4); drop it in `catalog.js` if the PO does not want it. A "Khác" text is stored word for word and grouped only on read: manual mapping of that wording → first matching keyword rule (whole words, accents and case ignored) → "Khác – chưa phân nhóm". Adding a mapping or a rule regroups old and new entries at once.

## 3. Rules enforced by the backend

- Entry needs the capability and the office in the user's scope (`hangton.offices`); the parcel must be in the **newest** snapshot; all required fields (or the parcel is skipped as INVALID and reported).
- Second entry of the same parcel on the same day = `EDIT` row superseding the first (any writer of that office). A past day cannot be edited: `POST /edit-requests` (writer of the office, reason >= 5 chars, only the last entry of that day, one pending per entry), `POST /edit-requests/:id/decision` by a chuyên quản of the office or the admin; nobody approves their own request except the admin. Approval appends an `EDIT_APPROVED` row dated the corrected day.
- `KEEP` repeats the last entry; skipped when already reviewed today, when there is none, or when its due date has passed.
- "Reviewed" statistics are per business day of the selected mốc: needed (>= 5 days), done today, not done = never reviewed + waiting for confirmation; by BCVH, by level and the answers given (grouped), scoped to the user's offices and customer-group filter.

## 4. Position and capability registry (reuse for later permission work)

`backend/src/services/auth/access/roles.js` is the single place that names positions and what each may do; `resolveAccess` puts `position`, `positionLabel`, `rank`, `group`, `capabilities` into the access object (`/api/auth/me`), the frontend mirrors labels in `frontend/src/auth/accessModel.js`.

| Position | Tier | Group | Rank | Capabilities (hangton.handling.*) |
| --- | --- | --- | --- | --- |
| ADMIN | ADMIN | SYSTEM | 100 | view, write, approve, reasons |
| LD_BDTP Lãnh đạo BĐTP | LEADER | LEADER_BDTP | 90 | view |
| LD_TTVH Lãnh đạo TTVH / IT_BDTP IT BĐTP | LEADER | LEADER_TTVH_IT | 80 | view |
| CHUYEN_QUAN Chuyên quản BCVH | STAFF | BCVH | 50 | view, write, approve, reasons |
| GD_BCVH Giám đốc BCVH | STAFF | BCVH | 40 | view, write |
| STAFF Chuyên viên | STAFF | BCVH | 10 | none |

To add a permission for a later feature: add a capability name, list the positions that hold it in `POSITIONS`, gate the route with `needs(capability)` (see `hangtonHandlingRoutes.js`) and the screen with `hasCapability`. `outranks(a, b)` compares ranks (BĐTP leaders above TTVH/IT). The tier stays the coarse data-scope switch (CHECK constraint untouched). An account with no stored position gets the least-privileged position of its tier (leader → Lãnh đạo TTVH).

Ownership needs no new table: offices come from the existing scopes (a BCVH scope gives its offices, the F1.2 specialty gives KTC1, the HANGTON specialty gives every office) and the admin covers every office. So an office with no chuyên quản (Thuận Hóa today, Khách hàng lớn, Trung tâm Hành chính công) is handled and approved by the admin; when the PO opens their own account, give it position Chuyên quản with BCVH Thuận Hóa and indicators F1.3, F4.1, HANGTON in the user page (Chức vụ + scopes) and nothing else changes. KTC1: Nguyễn Anh Dũng holds F1.2, so with position Chuyên quản he covers office 530100.

## 5. Files

| Part | Where |
| --- | --- |
| Registry | `backend/src/services/auth/access/roles.js`, `resolveAccess.js`, `userStore.js` (`position`), `adminUserController.js` |
| Schema | `backend/migrate_hangton_handling_01_schema.js`, `migrate_rbac_01_schema.js` (position column), hooked in `server.js` |
| Service, catalog, Excel | `backend/src/services/hangtonInventory/handling/` (`handlingService.js`, `catalog.js`, `handlingExcel.js`) |
| API | `backend/src/routes/hangtonHandlingRoutes.js` (`/api/hangton/handling/*`); `/api/hangton/items` takes `?review=done|pending|never|stale` and returns `handling` per parcel |
| Position backfill | `backend/scripts/backfill-user-positions.js` (dry run by default; seed script also stores the position) |
| Screens | `frontend/src/features/hangton/handling/*` (form, drawer + history, statistics, requests, reason grouping, log), `components/HangTonHandlingTab.jsx`, `HangTonItemsTab.jsx` (columns, tick boxes, bulk, Excel), `UserManagementPage.jsx` (Chức vụ) |

API summary: `GET catalog, stats, history/:item, log, template, edit-requests, reasons/ungrouped|groups`; `POST entries, import, edit-requests, edit-requests/:id/decision, reasons/map`.

## 6. Validation (2026-10-27)

Backend: `handling.test.js` 13/13 (roles, catalog, grouping, entry scope, same-day edit, KEEP, stats, review filter, edit-request flow, reason grouping, log, Excel), `hangtonHandlingRoutes.test.js` 4/4 (HTTP permissions and flows), `resolveAccess.test.js` 10/10, `adminUserRoutes.test.js` 3/3, `seed-rbac-users.test.js` 3/3, `backfill-user-positions.test.js` 1/1, `authController.test.js` 16/16, `hangtonNetwork.scope.test.js` 7/7 (no office leak), `test_hangtonInventory.js` 17/17. Frontend: whole suite 802/802 (`handlingModel.test.js` 8/8), `vite build` OK. The live database was not touched (dry run of the backfill reports the column is missing).

## 7. To go live

1. Restart the backend (the schema is applied at start; the supervisor restarts it in about 20 s; restarting mid-backfill leaves the lanes idle until "Tiếp tục Run" is pressed, so choose the moment).
2. `node scripts/backfill-user-positions.js "../User QIS.xlsx"` (dry run), then `--apply`: stores the Chức vụ of the 16 accounts (Giám đốc BCVH, Chuyên quản, the leader groups). A session keeps the user snapshot taken at login, so anyone already signed in when the positions were stored must sign out and in again to get the new screens (an admin account needs nothing: no stored position = Admin). Done 2026-10-27 13:43 (backend restarted, 15 positions stored, tables created).
3. PO UI check (below).

## 8. PO UI check

1. Sign in as a Giám đốc BCVH: Hàng tồn > Chi tiết bưu gửi shows the review columns, tick boxes, "Rà soát các bưu gửi đã chọn", "Giữ nguyên như lần trước", "Tải file để điền" / "Nhập file đã điền"; click a parcel code → panel to enter and the history.
2. "Xử lý tồn" tab: statistics (needed / done / not done / rate by BCVH, answers), click a number to open the list.
3. A leader sees the same but cannot enter. Chuyên quản sees "Yêu cầu sửa" and "Gom nhóm lý do".
4. User page: "Chức vụ" for Leader (Lãnh đạo BĐTP / TTVH / IT) and Staff (Giám đốc / Chuyên quản).

## 8b. Amendment 2026-10-27 (PO): drop-down Excel and entry in the table

1. **Excel** (`handlingExcel.js`, library `exceljs`, added to `backend/package.json`): the answer columns Nguyên nhân tồn, Hướng xử lý, Kết quả xử lý are drop-downs fed by sheet "Danh mục" (stop-style: only list values); extra columns Nội dung "Nguyên nhân khác", Ngày phát lại / chuyển hoàn (real date, dd/mm/yyyy), Chi tiết hướng xử lý, Ghi chú; sheet "Hướng dẫn"; fill-in columns have a yellow header. The upload reads the same labels, Excel dates (serial or typed dd/mm/yyyy) and applies the same validation as the web.
2. **Web table** (Chi tiết bưu gửi): the columns Nguyên nhân tồn, Hướng xử lý (+ detail), Ngày, Kết quả xử lý, Ghi chú are entry cells on every row for whoever may write (read-only text for leaders). Typing marks the row amber and keeps it in a draft list across pages and sorting; **"Xác nhận dữ liệu (N)"** saves every complete row in one call (`POST /entries` with `entries:[{item_code,input}]`), incomplete rows stay marked and are reported. The tick-box bulk entry, "Giữ nguyên" and Excel stay.
3. **Order by any title**: every data column of the table is a sortable title, including Lý do, Rà soát, Nguyên nhân, Hướng xử lý, Ngày, Kết quả, Ghi chú (server side: `GET /items?sort=reason|review|cause|plan|due|result|note`, ordered by the catalog order, parcels with nothing entered last when ascending). STT is a running number and is not sortable.
4. Tests: handling.test.js 14/14 (catalog lists, drop-down validation read back with ExcelJS, round trip, sort), hangtonHandlingRoutes.test.js 4/4, frontend 815/815, `vite build` OK, server render of the entry cells and table headers OK. Not verified in a real browser. Needs a backend restart to serve the new catalog and file.
5. Repo note: `backend/node_modules` is tracked in this repository, so `npm install exceljs` adds files there (and changes `package-lock.json` and `node_modules/.package-lock.json`); commit them together with the code.

## 8c. Amendment 2026-10-27 (PO feedback after the first look)

1. Table is narrow for people who handle stock: Nhóm KH, Trạng thái TMS, Bưu tá and Lý do are not columns any more; they show when the parcel number is clicked (side panel) and are all in the Excel files. People without the handling feature keep the old full table.
2. Default 20 rows per page (options 20 / 50 / 100 / 200 / 500 / 1000 / all).
3. No separate "Ngày" column: the date picker appears under "Hướng xử lý" only when the plan is "Phát lại ngày" or "Chuyển hoàn ngày".
4. Confirming: a "Lưu" button at the end of each typed row (saves that parcel), plus a bar fixed at the bottom of the screen with "Xác nhận dữ liệu (N)" for every typed row, and the answer of the last save shown there. Incomplete rows are not saved and show what is missing. Not auto-saved on purpose: the log is append-only, so every half-finished choice would become a history entry.
5. Rows are a memoised component, so typing in one row does not redraw the other rows.

Tests: frontend 819/819, build OK, one row rendered on the server with the date picker, "Lưu" and the "Thiếu" message. Not checked in a real browser.

## 8d. Amendment 2026-10-27 (PO): one parcel on one line

The Chi tiết screen with the handling columns is laid out for a logical width of 1600 px (other screens stay 1280) and scales to the window by the existing fit zoom (min 0.6, max 1.5), so the text shrinks with the menu open and grows when wide. Cells and titles do not wrap; the action bar above the table is one compact row with small buttons. The whole table still scrolls sideways if the window is narrower than the minimum zoom allows. Not checked in a real browser.

## 8e. Amendment 2026-10-27 (PO): smarter Excel, two self-settling causes, result colours, recheck warning

1. Why the PO's file was refused: the row chose "Nguyên nhân khác" without writing the wording (that wording is required). The import report now names, per parcel (first five), the missing field.
2. Cause list: Phát thành công, Chuyển hoàn, Khách hàng hẹn phát lại, Thư TCNH có yêu cầu lưu 7 ngày, Chờ chuyển VTN, Nguyên nhân khác ("phát lại" of the PO's wording is read as "Khách hàng hẹn phát lại").
3. "Phát thành công" and "Chuyển hoàn" settle the parcel: plan locked (stored as DA_PHAT / CHUYEN_HOAN), result stored as Đã xử lý, nothing else to fill (backend `catalog.js` field `auto`, the backend overrides whatever was sent). "Chuyển hoàn" takes today as the date when it is empty.
4. Excel: `*` on the always-required titles; required-and-empty cells red, not-needed cells grey (plan and result for the two causes, the date unless a plan with a date or Chuyển hoàn), a live "Kiểm tra (tự tính)" column, result colours; old files without `*` still load (titles are matched without the mark).
5. Web table and form: locked plan / result for the two causes, date picker only where a date is needed, result coloured (Đã xử lý green, Chưa xử lý orange, Chưa rà soát rose).
6. Recheck: a parcel last marked Đã xử lý on an earlier day that is still in stock shows "Đã xử lý nhưng còn tồn" (orange row, warning in the one-parcel panel, backend `handling.recheck`). "Giữ nguyên" is refused for it (RECHECK_REQUIRED) so the warning cannot be hidden by repeating the old entry; a new review of the cause clears it.

Tests: backend hangtonInventory + routes 27/27, frontend 821/822 (the one failure is in `features/f42` files edited by another session, not here), build OK. Needs a backend restart (catalog, Excel, service). Not checked in a real browser or in real Excel.

## 8f. Amendment 2026-10-27 (PO): parcel-code search and keeping the demo entries

1. Search box in the Chi tiết filter bar: a code, a piece of one, or several pasted together (space, comma or line separated, up to 50), any case, after a 0.4 s pause or Enter. Server side (`?q=` on `/items`, `/items/export` and `/handling/template`), inside the account's offices; `%` and `_` are plain characters. It also narrows "Tải file để điền".
2. Entries already typed (BCVH Thuận Hóa, 38 rows on 2026-10-27 at the time of the check) stay: the log is append-only and keyed by parcel code, the new code adds no table or column, and every code used so far (causes KH_HEN_PHAT_LAI, THU_TCNH_LUU_7N, CHO_CHUYEN_VTN, OTHER; plans PHAT_LAI, CHUYEN_HOAN, OTHER; results DA_XU_LY, CHUA_XU_LY) is still in the catalog. A read-only JSON copy of the four handling tables was written to `exports/hangton_xu_ly_backup_2026-10-27.json` (git-ignored). Next day, the parcels saved as Đã xử lý that are still in stock show the recheck warning; those saved as Chưa xử lý can still be kept with "Giữ nguyên".

## 8g. Amendment 2026-10-27 (PO): how typed wordings are grouped

Read-side only, nothing stored changes. "hoàn" and "chuyển hoàn" = group Chuyển hoàn; "chờ hoàn" is its own group (still being followed, result Chưa xử lý); "phát hoàn TC" / "phát hoàn thành công" = group Phát thành công (also "ptc", assumed to be the same abbreviation, to be confirmed). The most specific keyword rule wins ("chờ hoàn" over "hoàn"). On the demo entries: Phát thành công 10, Chuyển hoàn 11, Chờ hoàn 4, still ungrouped 11. The 4 "chờ hoàn" entries were saved as Đã xử lý; they need correcting to Chưa xử lý on the web today, otherwise tomorrow they raise the recheck warning.

## 8h. Independent review (Opus, 2026-10-27) and what was fixed

Fixed: (1) an Excel loaded back without changes no longer re-saves the pre-filled lines (import mode `IMPORT`, reason UNCHANGED), so "Giữ nguyên" and the recheck warning keep their meaning; (2) every write transaction of the handling (and the snapshot write / extra-snapshot delete) now queues on the shared `importWriteLock`, the shared SQLite connection can no longer be given two transactions at once; (3) an edit request can be decided once and created once per entry (checked inside the queued transaction); (4) the Excel export honours the review filter and the template the status filter, and says when it holds fewer parcels than the filter; (5) "đã rà soát" is counted on today for the newest snapshot (between midnight and the first snapshot of the day), and the recheck warning needs the snapshot to be of a later day than the entry; (6) the edit-request form validates dates against the day being corrected; smaller: duplicate parcel lines in a batch, an auto cause keeps no date, a negative log limit, "Gom nhóm lý do" shows only the wordings of the account's offices, inputs locked while saving, drafts of parcels that left the stock are dropped.
Left as is (noted): counts of "chưa từng rà soát / chờ xác nhận" of an OLD snapshot also see entries typed later; `xlsx` 0.18.5 (already in the project) reads uploaded files; Excel conditional formats and `TODAY()` and the browser were not run for real.

## 8i. Amendment 2026-10-27 (PO): the result is automatic; "Nội dung xử lý"; Mất and Vô thừa nhận

Supersedes the result drop-down of 8/8b/8e. The user never chooses the result any more:
1. The first question is called **"Nội dung xử lý"** (code and column stay `cause`). New contents: **Mất**, **Vô thừa nhận** (list: Phát thành công, Chuyển hoàn, Mất, Vô thừa nhận, Chờ hoàn, Khách hàng hẹn phát lại, Thư TCNH có yêu cầu lưu 7 ngày, Chờ chuyển VTN, Nguyên nhân khác).
2. **Kết quả xử lý is derived by the backend** (`catalog.resultOf`, the input is ignored): Phát thành công, Mất, Vô thừa nhận and Chuyển hoàn = **Đã xử lý**; every other content (including "Nguyên nhân khác") = **Chưa xử lý**; nothing entered = Chưa rà soát.
3. The four settling contents lock the plan (stored as DA_PHAT / DA_MAT / DA_VTN / CHUYEN_HOAN); **Chuyển hoàn is always dated today** (the date sent is ignored). Any other content asks for a plan (and a date for "Phát lại ngày" / "Chuyển hoàn ngày", which stays a plan of the non-settling contents).
4. Excel: header "Nội dung xử lý *"; "Kết quả xử lý (tự tính)" is a formula column (no drop-down); the date column is grey unless the plan asks for a date; files made before (titles "Nguyên nhân tồn", a result column) still load, the result column is ignored.
5. Entries stored before this change keep their stored result (append-only); a re-save recomputes it.

## 8j. Amendment 2026-10-27 (PO): detail of a settling content, nothing typed may be lost

1. The four settling contents (Phát thành công, Chuyển hoàn, Mất, Vô thừa nhận) take an optional detail that reads after the label: "Mất 27/10", "Phát thành công 27/10" (Excel column "Chi tiết nội dung xử lý"). Their plan ("Hướng xử lý") is blank by design: it is set by the system and shown as "—" (Chuyển hoàn shows its date).
2. Realigning the entries already typed (`backend/scripts/realign-handling-entries.js`, dry run first, `--apply` after the backend runs this code): same-day EDIT rows, author unchanged, approver "Điều chỉnh theo quy hoạch 27/10 (Claude Code)". Nothing the person wrote is dropped: a plan written "mất 27/10" with the wording "chậm giao" becomes content "Mất" + detail "27/10" + note "Chậm giao"; a plan written "27/10" under "ptc" becomes the detail "Phát thành công 27/10"; any plan with real content that has no place any more goes to the note. `--apply` first saves `exports/hangton_xu_ly_truoc_dieu_chinh_*.json` (copy of the four handling tables) and `exports/hangton_xu_ly_dieu_chinh_*.csv` (before / after of every parcel). Left as typed and listed: an entry marked Chưa xử lý whose wording says it is settled.

## 9. Not in Phase 1 (proposed Phases 2-3)

Work queue and per-postman progress, due-date reminders and "tồn dai dẳng", cross-check of "đã phát" against the next mốc, assignment / escalation, effectiveness and cause analysis over time, end-of-day Viber summary.
