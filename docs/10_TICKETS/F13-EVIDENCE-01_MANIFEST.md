# F13-EVIDENCE-01 Manifest

## 1. Ticket Information

- Ticket ID: `F13-EVIDENCE-01`
- Name: `F1.3 "Dữ liệu minh chứng" rebuilt: the evidence behind every figure, and the place where the Chuyên quản analyses parcels`
- Programme: F1.3 cause rebuild, item 3 of `F13-WHY-UI-01` section 2A. Data: `F13-WHY-DATA-02` (rules v5), `F13-WHY-AGG-01` (table `f13_cause_parcel`, `/api/f13/v2/why/*`), `F13-WHY-UI-01` ("Phân tích nguyên nhân", CLOSED).
- Executors: **Claude Code / Sonnet 5.5** for the backend (phase B1); **Antigravity** for the screen (phase U1), designed by Antigravity from the problem below. **Opus** reviews each phase. Does not change the Current Ticket.
- Status: `READY - B1 FOR CLAUDE CODE, THEN U1 FOR ANTIGRAVITY`. `PO UI Check Required = Yes` (after U1).

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
