# F13-EVIDENCE-01 Manifest

## 1. Ticket Information

- Ticket ID: `F13-EVIDENCE-01`
- Name: `F1.3 "Dữ liệu minh chứng" rebuilt: the evidence behind every figure, and the place where the Chuyên quản analyses parcels`
- Programme: F1.3 cause rebuild, item 3 of `F13-WHY-UI-01` section 2A. Data: `F13-WHY-DATA-02` (rules v5), `F13-WHY-AGG-01` (table `f13_cause_parcel`, `/api/f13/v2/why/*`), `F13-WHY-UI-01` ("Phân tích nguyên nhân", CLOSED).
- Executors: **Claude Code / Sonnet 5.5** for the backend (phase B1); **Antigravity** for the screen (phase U1), designed by Antigravity from the problem below. **Opus** reviews each phase. Does not change the Current Ticket.
- Status: `U1 BLOCKED - U1-R5/R6 fixed (42fa9735); U1-R7 week/month and U1-R8 rate found by the real render, fix by Antigravity`. `PO UI Check Required = Yes` (after U1).

## 2. The problem

"Phân tích nguyên nhân" gives the **conclusion** (which BCVH, route, postman, which cause). The users then need the **evidence**, and a place to **work on the parcels** the system could not conclude or concluded wrongly:

1. **Check any figure against the source.** For any filter (day / week / month / free range, BCVH, route, postman, verdict, cause, Chờ Chuyên quản reason) the user sees every parcel behind it - **all F1.3 rows, Đạt included** - with its five milestones and where each came from (F1.3, F1.1 bag, F4.1 or BatchFile, first F4.2 handover), the official TCT hours and limit, the system's cause / Phát detail / Chờ Chuyên quản reason, data flags and hints, and can export the list to Excel. Used to verify a conclusion, to answer TCT, and to look up any parcel.
2. **Let the Chuyên quản and the Giám đốc BCVH analyse parcels.** They record their own conclusion on a failed parcel, starting with the "Chờ Chuyên quản phân tích" ones, and correct a system conclusion they find wrong.
3. **Keep every analysis so the system can learn later.** Each analysis is kept with who, when and why; the counts of "system said X, Chuyên quản said Y" become, in a later ticket, rule proposals the PO approves (decision E8 of `F13-WHY-DATA-02`).

## 3. PO decisions (2026-11-06, in chat)

| ID | Decision |
|---|---|
| V1 | Who records an analysis: the **Chuyên quản BCVH and the Giám đốc BCVH, for the parcels of their own unit**; BĐTP / TTVH leaders and IT see the analyses, do not record. |
| V2 | **The figures of "Phân tích nguyên nhân" keep the system's conclusion.** Beside them the screens show how many parcels have been analysed by the Chuyên quản and what they concluded. The system figures change only when the PO approves a correction as a rule (later ticket). |
| V3 | **Any Không đạt parcel** may be analysed, including one the system already explained (a reason is then mandatory). "Chờ Chuyên quản phân tích" parcels come first in the list. Đạt and unrated parcels are evidence only, no analysis. |
| V4 | The analyst **chooses a cause from the list** (Không trọn lô, Khai thác, Vận chuyển, Khai thác - Vận chuyển chưa phân biệt, Phát - Chậm giao bưu tá, Phát - Phát chậm sau khi giao, Khác) **plus a free note** (note mandatory for "Khác" and when the choice differs from the system's cause). |

Rules that stay: one primary cause per parcel; official F1.3 results never changed; no blame wording on a person or unit (facts only); BCVH scope as everywhere (a BCVH account sees and analyses its own unit only).

## 4. Phase B1 - backend (Claude Code / Sonnet)

Scope:
- **Analysis log**, append-only (the pattern of `HANGTON-HANDLING-01`): one row per recorded analysis (`ngay_do_kiem`, `ma_bg`, `ma_bcvh`, chosen cause, Phát detail if any, note, the system cause / detail / reason at that moment, `classifier_version`, user, position, time); the current analysis of a parcel is its latest row; a correction is a new row, nothing is updated or deleted. Additive schema at startup like the other migrations.
- **Permissions** through the position registry `backend/src/services/auth/access/roles.js`: new capabilities `F13_ANALYSIS_VIEW` (every position with F1.3 access) and `F13_ANALYSIS_WRITE` (`CHUYEN_QUAN`, `GD_BCVH`; ADMIN for support); writing is refused outside the account's BCVH, for a non-failed parcel, with a cause outside the list, or without the mandatory note (V3, V4).
- **Evidence API** under `/api/f13/v2/evidence/`: list (same common filter as `/why`, plus `analysed` yes / no, analyst cause; paged; every F1.3 row incl. Đạt, the five milestones with their sources, TCT hours, limit, system cause / detail / reason, flags, hints, current analysis), Excel export of the same list (whole filtered set, server side, size limit stated), record an analysis, history of a parcel. Milestones come from the existing journey code path (one implementation).
- **"Analysed" counts in the aggregation layer:** `/why/*` rows gain `analysed` (count of failed parcels with a current analysis) and `analysed_mix` (count by analyst cause, and how many differ from the system); the system figures are unchanged (V2).
- Tests: permissions per position and scope, append-only history, mandatory note, list = figure for every filter (count parity as in `F13-WHY-UI-01` section 10), Excel row count = list total, `/why` system figures unchanged by any analysis.

Acceptance B1: suites green one file at a time with `--experimental-sqlite`; count-parity check on live data (read only) 0 differences; no write to any official table; the analysis table is the only new write.

## 5. Phase U1 - screen (Antigravity, its own design)

The menu item "Dữ liệu minh chứng" (F1.3) opens the rebuilt screen; the old evidence page is replaced at the end, after the PO accepts (its route redirects). The screen solves section 2 on the B1 API: filters identical to "Phân tích nguyên nhân" (and reachable from it: a figure's parcel list there can open here with the same filter), the evidence list, the parcel details, the analysis entry for the allowed positions, the "đã phân tích" figures beside the system ones. Report-block standard, the defects list of `F13-WHY-UI-01` section 6 (rules 1-11) and no blame wording apply. Antigravity proposes the layout in its report.

## 6. Required Reading

- This manifest.
- B1: `docs/10_TICKETS/F13-WHY-AGG-01_MANIFEST.md` (sections 15-21), `docs/10_TICKETS/F13-WHY-DATA-02_MANIFEST.md` (sections 3, 8, 9), `docs/10_TICKETS/HANGTON-HANDLING-01_MANIFEST.md` (append-only log and positions), `backend/src/services/auth/access/roles.js`.
- U1: `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md`, `docs/10_TICKETS/F13-WHY-UI-01_MANIFEST.md` sections 2A, 4, 6.

## 7. Restrictions

Never change the official F1.3 data or the cause rules; analyses never change the system figures (V2). Shared worktree: commit by pathspec only; never `User QIS.xlsx`, `.claude/skills/`, `exports/`, `.gitignore`, `.graphifyignore`, `graphify-out/`. Never switch a lint rule off. Antigravity: no browser, screenshots, dev server or login. Claude Code: no backend restart without telling the PO (the new tables are created at the next restart; Claude Code does it with the usual checks).

## 8. Change log

- 2026-11-06: problem and PO decisions V1-V4 recorded (Claude Code / Opus 5.5).
- 2026-11-06: B1 implemented (section 9), for Opus review.
- 2026-11-06: B1 reviewed and accepted (section 10, Claude Code / Opus 5.5).
- 2026-11-06: U1 built by Antigravity (`e1c5443b`), reviewed by Opus (section 12); READY FOR PO CHECK.

## 9. B1 results (2026-11-06, Claude Code / Sonnet 5.5; for Opus review, not self-approved)

**Built (backend only; the only new write is the analysis table).**
- `backend/migrate_f13_evidence_01_schema.js` (additive, idempotent, applied at startup from `server.js`): `f13_analysis_log`, **append-only enforced by triggers** (UPDATE and DELETE abort), keyed `(ngay_do_kiem, ma_bg)` like `f13_cause_parcel`, no foreign key (the cause table is rebuildable, the analyses are not). One row per analysis: chosen cause (CHECK on the V4 list), Phát detail for the two Phát choices, note, the system line / cause / detail / status / reason and `classifier_version` at that moment, user, position, time, `supersedes_id`. The current analysis of a parcel is its latest row.
- `roles.js`: capabilities `f13.analysis.view` (every position) and `f13.analysis.write` (`CHUYEN_QUAN`, `GD_BCVH`, `ADMIN`). Three existing tests that pinned exact capability lists were updated (`resolveAccess`, `adminUserRoutes`, `handling`).
- `EvidenceService.js` and routes `/api/f13/v2/evidence/`: `GET catalog`, `GET list`, `GET export`, `GET history`, `POST analyses`. List: the common filter of `/why` (same WHERE builder: `from`/`to` | `week` | `month`, `bcvh`, `route`, `route_scope`, `postman`, `verdict`, `cause`, `reason`, `remaining`, `a_source`, `hint`) plus `analysed=yes|no`, `analyst_cause`, `search` (BG or lot code); every F1.3 row incl. Đạt; per row the five milestones with their source (F1.3, F1.1 bag, F4.1 or BatchFile, first F4.2 handover, F1.3) taken from `JourneyService._parcels` (one implementation, cached per day for 5 min), the shown handover, TCT hours, limit, the system's cause line / label / status / reason / step / basis, flags, hints, lot, and the current analysis (cause, note, by, position, time, `versus_system` SAME / DIFFERENT / NO_SYSTEM_CAUSE). Default order: failed parcels waiting for the Chuyên quản and not yet analysed first (V3), then the newest day; `sort=date` drops the priority. Page size 50 (cap 100). Milestones are loaded for at most 12 distinct days of a page; the rest get `milestones_state = SKIPPED_TOO_MANY_DAYS` (the priority order keeps pages day-compact, so this is a guard). Export: the whole filtered set, server side, streamed xlsx, limit **31 days and 150 000 rows**, refused before anything is streamed (`EXPORT_TOO_LARGE`, the message states the limit); row count in header `X-Export-Rows`.
- Writing (`POST /evidence/analyses {ngay_do_kiem, ma_bg, cause, note}`): 403 without the capability; 403 `OUT_OF_SCOPE` for a parcel outside the account's BCVH (a city-wide account other than the admin too); 404 unknown parcel; 400 `NOT_FAILED` for Đạt or unrated, `INVALID_CAUSE` outside the list, `NOTE_REQUIRED` for "Khác", for a parcel the system already explained (confirm or change, V3) and when the choice differs from the system's cause (V4), `NOTE_TOO_LONG` over 1 000 characters. A waiting or "chưa đủ căn cứ" parcel takes any listed cause without a note. History: every row of a parcel, newest first, with the system's conclusion at that time; scope-checked.
- `/why/*` rows (`summary`, `bcvh`, `routes`, `postmen`) gain `analysed` (failed parcels with a current analysis) and `analysed_mix` (`by_cause`, `same_as_system`, `different_from_system`, `no_system_cause`). Every system figure is unchanged (test: deep equality before and after analyses without those two keys; the official tables and `f13_cause_parcel` identical).

**Tests** (`node --experimental-sqlite --test <file>`, one file at a time, all green): new `f13v2Evidence.test.js` 15/15 (permissions per position and scope, validation and mandatory note, append-only history with refused UPDATE and DELETE, list with Đạt, milestones and sources, order, list = `/why` parcels and = every figure for 17 filters and every cause line, analysed filters = `/why` analysed, Excel rows = list total with scope and limit, system figures unchanged, official tables untouched), `migrate_f13_evidence_01_schema` 2/2, `server.startupMigrations` 1, and `CauseRefresh` 19, `CauseAggBuilder` 21, `CauseAggQueryService` 22, `f13v2WhyRoutes.scope` 5, `f13v2Routes.scope` 13, `f13v2Units` 20, `JourneyService` 25, `CauseClassifier` 29, `tctIntervals` 45, `migrate_f13_why_agg_01_schema` 3, `resolveAccess` 10, `adminUserRoutes` 3, `handling` 21, `opsJournalRoutes` 13, `hangtonHandlingRoutes` 4.

**Count parity on live data, read only** (`backend/scripts/f13_evidence_parity.js --db src/db/database.sqlite --readonly`; one read transaction, so figures and lists come from the same snapshot; the live file has no analysis log until the restart, so an empty TEMP table of the connection stands in and nothing is written to the file): **6 380 checks, 0 differences**. Week 43: 271 figure rows (BCVH, routes, postmen); October: 131 (BCVH, routes); each with rows, failed, unrated, passed, every cause line, Chờ Chuyên quản and its reasons, and hints equal to the evidence total of the same filter; six BCVH 23 098 and 113 235 rows; `analysed=no` = all rows, `analysed=yes` = 0. Excel of week 43 for Thuận An: 1 472 rows in the file = list total (10 s for 7 days); a list page of 20 rows has the milestones for all 20. Output `exports/F13-EVIDENCE-01/b1_parity_live_readonly.txt`, SHA-256 prefix `9b9b4bcdb63211a9` (git-ignored folder).

**Notes for the review.**
- The live backend has not been restarted: the new table, capabilities and routes exist from the next restart (Opus does it after the review). Until then `/why` is unchanged and `/evidence/*` does not exist live.
- A first page costs one `JourneyService` read per distinct day (about 1.6-3 s uncached, then cached 5 min); the export reads one day at a time (7 days about 10 s, 31 days about 50 s).
- The note rule goes one step beyond V4 read literally: a parcel the system already explained needs a reason even when the analyst confirms it (V3, "a reason is then mandatory").
- `versus_system` compares with the system's conclusion now; the one at the time of the analysis is kept in the history row.
- Not done by design: no screen, no change to cause rules or official data, no restart.

READY FOR OPUS REVIEW.

## 10. Opus review of B1 (2026-11-06, Claude Code / Opus 5.5; commit `224dd196`)

**Verdict: B1 ACCEPTED - V1-V4 implemented as decided, system figures unchanged, count parity 0 differences. No blocker; one small follow-up (B1-R1) before the restart.**

Checked independently (not taken from section 9):
- **Write permission (V1, V3, V4).** `f13.analysis.write` only on `CHUYEN_QUAN`, `GD_BCVH`, `ADMIN` (`roles.js`); the route refuses without it (403 `FORBIDDEN`). `record()` refuses a parcel outside `scopedBcvhList` (403 `OUT_OF_SCOPE`) and any city-wide account other than the admin (scope `null`), a parcel that is not Không đạt (`NOT_FAILED`), a cause outside the V4 list (`INVALID_CAUSE`, also a table CHECK and a load-time guard that the two lists are identical), a missing note for Khác / an explained parcel / a different choice (`NOTE_REQUIRED`), over 1 000 characters. The rule "note also when confirming an explained parcel" is V3 read literally ("a reason is then mandatory"), accepted.
- **Append-only.** `f13_analysis_log` has BEFORE UPDATE / BEFORE DELETE triggers that abort; the service has no UPDATE or DELETE; current = `MAX(id)` per parcel; history newest first with the system conclusion at that time and `classifier_version`. No foreign key to the rebuildable cause table (correct).
- **V2.** `/why/*` only gains `analysed` and `analysed_mix` (a separate query over failed parcels with the same WHERE); counters, cause mix and hints are computed exactly as before; `/why` is not response-cached, so the analysed counts are current.
- **Evidence = figure.** One WHERE builder (`CauseAggQueryService._where`, `forParcels`) for figures, `/why/parcels`, the evidence list, its count and the export. Parity rerun on the live file read-only (`scripts/f13_evidence_parity.js --readonly`, opened `OPEN_READONLY`, the log as an empty TEMP table): **6 380 checks, 0 differences, 61 s**. Export = whole filtered set by day, limits checked before the first byte.
- **Restrictions.** No write statement outside the INSERT into the log; the parity script writes nothing to the file; no `eslint-disable`, `.only` or `skip` added (the backend has no ESLint config; nothing switched off). The three edited old tests only add the new capability to exact lists.
- Suites rerun one file at a time with `--experimental-sqlite`: `f13v2Evidence` 15/15, `CauseAggQueryService` 22/22, `migrate_f13_evidence_01_schema` 2/2, `resolveAccess` 10/10.

| ID | Level | Finding | Resolution |
|---|---|---|---|
| B1-R1 | Low (fix before restart) | `analysed=yes / no` of the list tests only `a_id`, while `/why` `analysed` counts failed parcels only. A parcel analysed while Không đạt that becomes Đạt or unrated after a TCT reload or cause rebuild would be in `analysed=yes` but not in the `/why` figure: count parity breaks for that filter. | Sonnet: `analysed=yes` = `a_id IS NOT NULL AND danh_gia = 'Không đạt'`, `analysed=no` = its complement; same for `analyst_cause`; the item keeps showing an old analysis; one test with a parcel whose verdict changes after the analysis. |
| B1-R2 | Low (UI) | System line `PHAT_KHONG_CHI_TIET` (Phát without detail, about 25 BG a week) has no analyst choice of its own: any choice counts as "different" and needs a note. | Accepted (the analyst states the Phát detail); U1 says so beside the choice. |
| B1-R3 | Low (UI) | A 31-day export takes about 50 s. | U1 shows a waiting state and the stated limits from `catalog`. |
| B1-R4 | Info | `supersedes_id` is read before the insert; two simultaneous saves may name the same predecessor. The current analysis is `MAX(id)`, so nothing is lost. | Accepted. |

Next: B1-R1 by Sonnet, then the backend restart (creates `f13_analysis_log`, routes live) with the usual checks; then U1 (section 5) by Antigravity.

## 11. B1-R1 and backend restart (2026-11-06, Claude Code / Sonnet 5.5)

**B1-R1 (commit `7ff4eb31`).** `EvidenceService._where`: `analysed=yes` = `a_id IS NOT NULL AND danh_gia = 'Không đạt'`; `analysed=no` = its complement (`a_id IS NULL OR danh_gia IS NOT 'Không đạt'`, so a NULL verdict falls in the complement); `analyst_cause` also only on Không đạt parcels. The item still shows an old analysis (`can_analyse` false). New test in `f13v2Evidence.test.js` (16/16): a parcel analysed while Không đạt and then set to Đạt or to unrated: `/why` analysed drops by one and `analysed=yes`, `analyst_cause=KHAI_THAC` of the list equal `/why` `analysed` and `by_cause`, yes + no = the whole list, the item still shows the old analysis. `CauseAggQueryService` 22/22.

**Checks before the restart (read only).** `auto_backfill_job`: no QUEUED or RUNNING job (states CANCELLED, FAILED_TERMINAL, SKIPPED_ALREADY_SUCCESS, SUCCESS only); `auto_backfill_run`: none open (COMPLETED, COMPLETED_WITH_ERRORS, CANCELLED); `auto_backfill_worker_lease` empty; last `import_log` row 01:06 UTC (SUCCESS, 50 minutes earlier), none in the last 10 minutes; no RUNNING `f13_cause_run`; no `supervisor.pause`.

**Restart (08:58 Vietnam time).** Stopped the listeners on 5050 (PID 25144) and 5178 (PID 6600); the supervisor started both again within 20 s: backend PID 20428, front end PID 38196, log `logs/backend-20261106-085817.out.log`.

**After the restart.**
- Startup log: `[auth] restored 2 session(s)`, `TTVH Backend running on port 5050`, `[f13-cause] run 17 DONE: 0 day(s) built, 0 failed (2026-09-22..2026-11-06, startup)` (the table was already complete); no error line. The err log holds only the usual chokidar ExperimentalWarning and the two "removed a stale profile lock" lines.
- Database: `f13_analysis_log` exists with indexes `idx_f13_analysis_parcel`, `idx_f13_analysis_bcvh` and the two triggers `trg_f13_analysis_no_update`, `trg_f13_analysis_no_delete`; 0 rows.
- `GET /api/f13/v2/evidence/catalog` without a login: **401** (also `evidence/list` and `why/summary`: 401). No login was tried on the real backend.
- DKCL: HUE session re-attached and its queue lane woken; **TCT: saved session not re-attached (`NO_SESSION`)**: no backfill was running, so nothing was lost, but the TCT window needs the PO's DKCL login again before the 07:30 import or any backfill uses that lane.
- `scripts/realign-handling-entries.js` dry run: 0 entries to change, 0 left as typed, 0 that cannot be realigned: `--apply` not needed, nothing written.

B1 is live. Real render of `42fa9735` (Claude Code / Opus, isolated 5051/5199): **U1-R5 fixed** (from the menu the page opens on the latest day, `from` = `to`); **U1-R6 fixed for the counts** (Chuyên quản Thuận An: 10 BG, 4 Đạt, 5 Không đạt, Khai thác 1, Chậm giao bưu tá 1, Chờ Chuyên quản 2, analysed 0/5; city leader over two days: 40 / 16 / 20, 4 / 4 / 8); the list total equals the figure for `cause` = KHAI_THAC 4, GIAO_BUU_TA_QUA_GIO 4, CHO_CHUYEN_QUAN 8, PHAT 4; no failed API call, no page error.

| ID | Level | Finding | Resolution |
|---|---|---|---|
| U1-R7 | **Blocker** | Week and month modes: `F13V2EvidencePage.jsx` reads `res.week.id` / `res.month.id`, but `resolvePeriod` returns `week.week_id` (and the month object of `monthBounds`), so it falls back to the hard-coded `'2026-W44'` / `'2026-11'`; the week / month lists read `layout.available_weeks` / `available_months`, which `/v2/layout` does not return, so they are empty. `F13V2WhyPage` takes the lists from `/time-axis/weeks` and `/time-axis/months`. | Antigravity: same sources as `F13V2WhyPage`; no hard-coded period anywhere. |
| U1-R8 | **Blocker** (wrong figure) | Đạt rate shows "4000,00%": `totals.rate` is already a percentage (`percentOne`, 40.0), the card multiplies it by 100 again. | Antigravity: show `rate` as given (one decimal, comma); the test payload uses the real scale. |

Next: U1-R7 and U1-R8 by Antigravity, then Claude Code repeats the real render before the PO check. PO PASS is not self-awarded.
