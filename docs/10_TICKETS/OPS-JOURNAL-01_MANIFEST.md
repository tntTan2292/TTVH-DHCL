# OPS-JOURNAL-01 - Daily quality alerts and the Nhật ký điều hành (PL06) module, with Word / PDF export

Status: PLANNED (2026-10-29, Claude Code/Sonnet 5.5, quota-limited session). Parallel ticket: does not change the Current Ticket in `PROJECT_SNAPSHOT.md`.
Phase B (UI on a mock adapter) may start now with Antigravity. Phase A (backend) and Phase C (integration + review) wait for Claude Code quota.

## 1. PO request (2026-10-29)

Turn the paper-style daily journal (`PL06 - Nhat ky dieu hanh dd.mm.yyyy.docx`, template "Phụ lục 6", folder `...\2026.06.23 - Hướng dẫn lịch trực chiến hàng ngày - MVM`) into a QIS module:

1. Each day the system lists quality **black spots** (điểm đen) over F1.1, F1.2, F1.3, F4.1 (**not F4.2**) and hàng tồn. The Giám đốc TTVH (Mai Văn Mười) **selects 5-10** of them.
2. For each selected spot the Giám đốc TTVH fills the "6 rõ" rows (Ai / Làm gì / Ở đâu / Khi nào xong / Bằng cách nào / Kết quả gì) and **assigns** them.
3. **Visibility:** the module is visible **only** to the Giám đốc TTVH. Any other user sees nothing about it until a task is assigned to them; then they see **only their own tasks**, with the journal slip (phiếu) of that spot.
4. Export the day's journal to **Word and PDF**, same layout as PL06.

## 2. What the 19 sample journals show (the model to reproduce)

Evidence: the 19 `PL06` files (01-23/10/2026) and the hàng tồn report of 12/10. Since 19/10 every figure comes from QIS (07:30, channel "Dashboard").

- One journal per day, one black spot per journal so far; the PO now wants 5-10 per day.
- Spot kinds seen: hàng tồn of a BCVH (≥5 / ≥7 / ≥14 days, COD, "hàng Lô"); F1.3 of a BCVH (BCVH-level drop) and of a **delivery route** (tuyến phát, code + name); F1.1 of an **accepting x delivering pair** (e.g. Khách hàng lớn 531120 -> BCVH Hương Thủy 536250) and of a delivering BCVH; F1.2 at **Khách hàng lớn** (per customer); F4.1 of a BCVH.
- Headline sentence pattern (generate it, the leader edits): `Chỉ tiêu <F> của <đơn vị> ngày <N-1> đạt <x>% (<n> BG, <k> BG không đạt[, <m> BG chưa có kết quả đánh giá]), giảm <d>% so với cùng kỳ tuần trước (<date>: <y>%, <n2> BG); <worst sub-units>. Lũy kế tháng <MM> đến <date> đạt <z>%.` The data day is **N-1** ([[daily-notice-uses-n-minus-1-data]]); detection time 07:30, channel Dashboard.
- "6 rõ" rows follow a repeating 3-4 row pattern: (1) Giám đốc BCVH rà soát and report causes of the failed parcels; (2) Chuyên quản (TTVH) + Giám đốc BCVH find the solution, applied from N+1; (3) Chuyên quản tracks the rate daily and reports to leaders; for hàng tồn, (1) rà soát (2) xử lý dứt điểm to 0 (3) theo dõi. Roles are named by position and office, then by person. Default "Khi nào xong" = within the day. These become **editable templates per spot kind**.
- Section 3 (end-of-day result: giải quyết xong? phục hồi chưa?) and Section 4 (bài học, quy trình cần cập nhật) are entered by the Giám đốc TTVH, usually at 17:00.
- The hàng tồn follow-up already has a data trail: `HANGTON-HANDLING-01` (cause / plan / result per parcel). A hàng tồn spot should link to it, not duplicate it.

## 3. Assessment: what Antigravity can and cannot take

Governance (DEC-020/021): Antigravity owns discovery and UI/UX; Claude Code owns backend, data, tests, Git. Past Antigravity tickets (UI-IMPORT-DAYVIEW-01, UI-GLASS-THEME-0x, UI-IMPORT-*) were UI-only and were delivered; none touched permissions or data.

| Part | Risk | Owner |
| --- | --- | --- |
| Screens: black-spot list with tick 5-10, 6-rõ editor, assignee "Nhiệm vụ của tôi", end-of-day form, print-friendly preview | Low-medium | **Antigravity** (Phase B), on a mock adapter |
| Hiding the module from everyone else; showing an assignee only their own rows; no leak through counts, badges, menu, or cache | **High** (security; the RBAC lesson "derived numbers leak too") | Claude Code, Opus review |
| Detecting and scoring black spots across five indicators (reuse F1.1 / F1.2 / F1.3 / F4.1 / hàng tồn services, N-1, week-on-week) | Medium-high (needs each service's real contract and thresholds) | Claude Code |
| Word + PDF generation in the PL06 layout | Medium (new dependency, Vietnamese fonts, layout fidelity) | Claude Code |
| Schema, append-only history, assignment workflow | Medium | Claude Code |

Verdict: **do not hand the whole feature to Antigravity.** Doing so would put permission enforcement and the data engine on the executor with the least backend track record and no browser verification (PO checks UI). The UI (about 40 % of the work) is a good Antigravity job and is independent: it can be built **now** against a mock adapter that follows the contract of Section 6, so no quota is wasted waiting. Backend + integration wait for Claude Code quota. I cannot verify the capability of the specific Gemini model the PO has; the split above keeps each Antigravity prompt small and UI-only, so a weaker run costs little.

## 4. Decisions made by the CTO side (technical, may be changed by the PO)

- New position `GD_TTVH` (tier LEADER, rank above `LD_TTVH`) in `backend/src/services/auth/access/roles.js`, assigned **only** to Mai Văn Mười; capability `journal.manage`. The other BĐTP / TTVH leaders do **not** get it (PO: "chỉ Giám đốc TTVH"). Admin gets `journal.manage` for support, to confirm (Section 8, item 1).
- Assignee needs no capability: a user has access to a **task** when an `ops_journal_action` row names them and the leader has pressed Giao việc. Everything else returns 404 (not 403) so existence is not disclosed.
- Candidates are computed from the existing services for the **latest loaded data day** (N-1), compared with the same weekday last week, with a minimum-volume floor per indicator. Up to **20 candidates**, ranked; the leader ticks 5-10 and can add a manual spot. Default pre-selection: top 8, at most 3 per indicator. Ranking score (to confirm, Section 8, item 2): failed parcels x week-on-week drop, hàng tồn by parcels ≥5 days and COD.
- Output file name `PL06 - Nhat ky dieu hanh dd.mm.yyyy - <indicator> <office>.docx/.pdf` (the PO's name plus the spot, since there is one file per spot). One file per finalized spot (PO decision 2026-10-30, Section 8 item 3), not per day.
- Word via the `docx` npm package (new backend dependency; alternative: fill the PO's `.docx` as template). PDF via the Playwright already in `backend/package.json`, from the same HTML print view, or LibreOffice-free. Fonts must carry Vietnamese (Times New Roman / Arial as in the PL06 files).
- Tables are append-only where history matters (`ops_journal_action_log`), as in HANGTON-HANDLING-01.

## 5. Data (Phase A, additive tables created at backend start)

- `ops_journal_day(day PK, status DRAFT|ASSIGNED|CLOSED, created_by, ...)`.
- `ops_journal_spot(id, day, indicator F1.1|F1.2|F1.3|F4.1|HANGTON, scope_type BCVH|ROUTE|CUSTOMER|PAIR, scope_key, office_code, title, headline, metrics_json, source SYSTEM|MANUAL, detected_at, channel, sort)`.
- `ops_journal_action(id, spot_id, seq, who_text, assignee_user_ids, what, where_text, due, how, expected_result, assigned_at, status ASSIGNED|IN_PROGRESS|REPORTED|DONE, report_cause, report_text, reported_by, reported_at)`; `ops_journal_action_log` records every change.
- `ops_journal_closing(spot_id, resolved, recovered, handling_time_text, lesson, process_update, signed_by, done_time)`.
- A1 as built (2026-10-30): assignees live in `ops_journal_action_assignee(action_id, user_id)` instead of an `assignee_user_ids` column; a spot has its own `status` DRAFT|FINALIZED|CLOSED (+ `finalized_at/by`); an assignee sees a row only when `assigned_at` is set AND its spot is FINALIZED/CLOSED. `GET /my-tasks` returns one task per spot (`{ spotId, day, indicator, title, headline, metrics, status, myRows: [{ id, seq, ... }] }`, no task-level `actionId`); `GET /spots/:id` returns the phiếu with `myRows` only (no `actions`, `closing` or assignee ids) to an assignee, the full spot to the manager. Code: `migrate_ops_journal_01_schema.js`, `services/opsJournal/visibility.js`, `routes/opsJournalRoutes.js`, test `routes/opsJournalRoutes.test.js`.
- A1-R review (Opus, 2026-10-30): PASS WITH FIXES, fixes applied (commit 96b564d4): an assignee gets a whitelisted shape (no `seq`, `sort`, `source`, spot `status`); the change log refuses UPDATE / DELETE in the database; unset rows default to DRAFT; impossible dates are refused. PO decision 2026-10-30: co-assignees of one row **see each other** (the "Ai" column names the group, and a shared row's report is visible to everyone on that row), as on the paper journal; rows of other people stay hidden. A3 must check that each assignee `user_id` exists and is active before writing.
- Metrics are **snapshotted** at selection time (the journal must not change when the data is re-imported).

## 6. API contract (all under `/api/ops-journal`, session auth)

Leader (`journal.manage`):

- `GET /candidates?date=YYYY-MM-DD` -> `{ asOfDate, compareDate, items: [{ candidateId, indicator, scopeType, scopeKey, officeCode, officeName, title, headline, metrics: { rate, total, fail, notEvaluated, compareRate, compareTotal, delta, mtdRate, stockGe5, stockGe7, stockGe14, cod }, score, preselected }] }`
- `GET /days/:date` -> `{ date, status, spots: [{ id, indicator, ...fields above, actions: [...], closing }] }`
- `PUT /days/:date/spots` body `{ candidateIds: [], manual: [{ indicator, officeCode, title, headline }] }` (5-10 enforced) -> day.
- `PUT /spots/:id/actions` body `{ actions: [{ seq, whoText, assigneeUserIds, what, where, due, how, expectedResult }] }`.
- `POST /days/:date/assign` body `{ spotIds: [] }` -> finalizes (chốt) the given spots, status ASSIGNED, `assigned_at` set; content is locked afterwards.
- `PUT /spots/:id/closing`, `POST /days/:date/close`.
- `GET /spots/:id/export?format=docx|pdf` -> file stream, one PL06 per spot, only after the spot is finalized.
- `GET /assignable-users?officeCode=` -> users who hold a Giám đốc / Chuyên quản position for that office or indicator (from RBAC scope).

Assignee (any signed-in user; rows filtered server-side):

- `GET /my-tasks` -> `{ tasks: [{ actionId, spotId, day, indicator, title, headline, metrics, myRows: [...], status }] }` (empty array = the menu entry stays hidden).
- `POST /actions/:id/report` body `{ status: IN_PROGRESS|REPORTED, causeText, reportText }`.

Frontend gate (cosmetic, backend is the real one): "Nhật ký điều hành" menu entry when `access.capabilities` has `journal.manage`; "Nhiệm vụ của tôi" entry when `my-tasks` is non-empty.

## 7. Phases

| Phase | Content | Executor | Model |
| --- | --- | --- | --- |
| 0 | This manifest + Antigravity prompt | Claude Code | Sonnet (done 2026-10-29) |
| B | UI at `frontend/src/features/ops-journal/` + route + menu, mock adapter that follows Section 6, pure helpers with tests; no backend, no browser | **Antigravity** | Gemini |
| A | Position `GD_TTVH`, tables, candidate service, actions / assign / my-tasks with server-side visibility, tests (leak tests per role) | Claude Code | Sonnet |
| A1-R | Independent review of A1 (position, tables, server-side visibility, leak tests) before A2 starts; a different model from the implementer (PO decision 2026-10-30) | Claude Code | Opus review |
| A2 | Word + PDF export (PL06 layout, one file per finalized spot), tests that open the file | Claude Code | Sonnet |
| C | Replace the mock with the API, Playwright check with `ignoreHTTPSErrors` ([[qis-frontend-served-over-self-signed-https]]), independent security + permission review | Claude Code | Opus review |
| PO | UI check, then a trial week beside the paper journal | PO | - |

A and B are independent and can run in either order. Phase 2 (later): week-over-week follow-up of closed spots, auto "carry over" of unresolved spots to the next day, statistics of causes.

## 8. PO decisions (answered 2026-10-30)

1. Admin account sees the module (for support): **yes**.
2. Ranking rule for suggestions: **default** (failed parcels x week-on-week drop; hàng tồn by parcels ≥5 days and COD).
3. Export: **one Word / PDF file per black spot (per indicator), not one per day**. The Giám đốc TTVH picks which spots to generate; each file is addressed to the individual Chuyên quản BCVH and Giám đốc BCVH concerned, like the current paper journals. Flow (PO correction 2026-10-30): the **Giám đốc TTVH** edits the 6-rõ content, then finalizes (chốt) it to assign the work to the Chuyên quản + Giám đốc BCVH concerned; only after that is the Word / PDF printed. The BCVH side does not edit the journal content; it reports back (item 4). This supersedes the "one file per day" decision in Section 4 and the `GET /days/:date/export` contract in Section 6 (now per spot: `GET /spots/:id/export?format=docx|pdf`, available once the spot is finalized).
4. A BCVH Giám đốc reports back **inside QIS** (Phase 1: status + cause + free text): **yes**.
5. Spots not resolved by the end of the day: carry to next day - kept as a Phase 2 item.
6. Resolved: only the Giám đốc TTVH edits and finalizes a spot's 6-rõ content. Technical default (may change): after finalizing, content is locked; a correction reopens the spot and is written to `ops_journal_action_log`, and the assignee is notified.

## 9. Report-screen standard

The module is not a report block, but indicator chips use the family colours (F1.1 green, F1.3 blue, F4.1 orange; F1.2 neutral light, no purple / dark) and any rate shown follows `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md` (targets F1.1 95 %, F1.3 / F4.1 90 %). No chart in Phase 1.

## 10. Required reading for Phase B (Antigravity)

This manifest Sections 2, 6, 9; `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md`; the existing journal samples in the PO folder (read-only, for wording); `frontend/src/features/` neighbours for conventions. Do not read or edit backend files.

## 11. Acceptance

Phase B: build + lint + frontend tests pass; the three screens work on the mock with the contract shapes; the mock is switched in one constant; stop at `READY FOR PO UI CHECK`.
Whole ticket: a non-leader account cannot read any spot, count or file of the module before assignment (tests per position); after assignment it reads only its own rows; DOCX and PDF open and match PL06; PO UI PASS.
