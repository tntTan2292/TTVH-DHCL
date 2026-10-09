# F11-PHASE-3 Manifest

Status: `ACTIVATED / DISCOVERY PLAN READY / WAITING FOR PO EVIDENCE PACK (2026-10-09)`. Portal discovery and automatic download for F1.1 (Huế and TCT). Nothing has been run against the portal, no export, no Import, no database write.

## Table of Contents

- [1. Ticket Information](#1-ticket-information)
- [2. Objective](#2-objective)
- [3. Current Status](#3-current-status)
- [4. Required Reading](#4-required-reading)
- [5. Lessons Taken From F4.1](#5-lessons-taken-from-f41)
- [6. What Is Already Known / Not Known](#6-what-is-already-known--not-known)
- [7. Plan](#7-plan)
- [8. Evidence Pack The PO Provides (plain-language checklist)](#8-evidence-pack-the-po-provides-plain-language-checklist)
- [9. Exit Criteria](#9-exit-criteria)
- [10. Risks](#10-risks)
- [11. Next Step](#11-next-step)

## 1. Ticket Information

- Ticket ID: `F11-PHASE-3` — `F1.1 Portal discovery and automatic download (HUE + TCT)`
- Parent: `F11-MODULE-PLAN` (checkpoint Section 13); depends on `F11-PHASE-2` and `F11-PHASE-4`
- Owner: `Claude Code (Sonnet 5.5)`; Windows runtime evidence by Antigravity where a visible window is needed
- Authorization: `PO in chat 2026-10-09: "thăm dò tải trước, số liệu phải đầy đủ một chút rồi xây dashboard và bcvh"`
- Standard: `docs/07_REFERENCE/Shared_Business/portal_adapter_standard.md` (evidence-gated; a lane stays `MANUAL_ONLY` until every item is proven for that exact lane)

## 2. Objective

Let the system download the F1.1 Huế detail file and the F1.1 TCT summary file by itself for one business date at a time, import them through the existing pipeline, and backfill the history (from `2026-01-01`, Q-10) so that the Dashboard and BCVH Ranking have enough days (week and month comparisons).

## 3. Current Status

- State: plan written; **blocked only on the PO's evidence pack (Section 8)** and, for a live run, on the PO releasing the browser session.
- PO UI Check Required: `No` for discovery; `Yes` later for the Import Center backfill view.

## 4. Required Reading

`portal_adapter_standard.md` (all of it, Sections 4-9 especially); `docs/06_REVIEWS/Import/AUTO-BACKFILL-F41_CHECKPOINT_001.md` Sections 6, 10-18, 22 (what was hard); `backend/src/services/autoBackfillF41Contract.js` (identity + the AB-AUTH-17 comments); `backend/probe_f41_hue_detail_export.js` (bounded probe template); F11 checkpoint Sections 14, 25.

## 5. Lessons Taken From F4.1

What cost time in F4.1, and how F1.1 avoids it:

| F4.1 difficulty (checkpoint reference) | What we do for F1.1 |
| --- | --- |
| The running backend owns the Chromium windows; a task cannot attach to them. Discovery sat at "blocked" (Sections 6, 10) | Plan one **bounded live session**: the PO stops the backend through its normal shutdown, the supported client reopens the saved profile with `requireExistingSession=true`; if the portal asks for a login the PO signs in by hand. No profile/cookie/credential is ever read. |
| Automated request failed with HTTP 500 while the PO's Chrome got HTTP 200 (Section 12) | Get the PO's **successful request from Chrome first** (Section 8) and make the automated request byte-identical before the first submit. |
| First difference was a filter value: `ALL` vs the untouched `NULL`; empty string, `NULL` and `ALL` are three different values (Section 14, standard §5.5) | Compare field by field with the PO's request; never normalise ancillary filters. |
| Nested detail tables contaminated the row/total count (Section 15) | Read **direct outer rows only** (DOM ownership), never value heuristics. |
| Account mismatch between PO Chrome and the automated profile (Section 15-16) | Record the displayed account; the PO confirms the supported profile. |
| For HUE the workbook comes from the **detail** form returned inside the detail response, with its own store identity; the download file name is a **slug of the report**, not the store name (AB-AUTH-17 comments in `autoBackfillF41Contract.js`) | Observe both the detail identity and the real generated file name; do not poll for a stored-procedure name. |
| TCT file: grand total row among the direct rows (47 = 1 + 46) | The F1.1 TCT parser already skips and verifies the grand-total row. |

## 6. What Is Already Known / Not Known

**Known (from real downloads and files):** the generated file names are slugs `F1.1_bao_cao_chat_luong_toan_trinh_buu_giay_noi_tinh_chi_tiet` (Huế detail) and `F1.1_bao_cao_chat_luong_toan_trinh_buu_giay_noi_tinh` (summary, used by TCT); the Huế detail file has 52 or 55 columns (header-name parser handles both); the TCT report is the same summary report at national scope; business date for a file = the file name date.

**Not known — must be observed, never guessed:** the report page route and the detail route; the store identities and export actions; the filter names and values for Huế (`BC` / province `53` is the F1.3/F4.1 pattern, not evidence) and for TCT (`TINH` / `ALL` likewise); the exact single-date encoding; how the portal's date filter behaves (the 07/10 Huế file contained 14 parcels completed on 08/10 and 23 without completion: the filter is not simply "completion date = D"); whether a partial day can be exported before the day ends (N-1 rule: the system should fetch day D only on day D+1).

## 7. Plan

1. **Evidence pack from the PO's Chrome** (Section 8): route, exact successful request, account, export request and file name, for Huế and TCT. (PO, about 15 minutes per lane, no code.)
2. **Contract draft** `autoBackfillF11Contract.js`: identities from the evidence only (same shape as `autoBackfillF41Contract.js`).
3. **One bounded live discovery** (only if the evidence pack leaves a gap or for verification): backend stopped by the PO, supported client reopen, one business date (07/10, whose result is already known: 2.621 rows / TCT Huế row), at most one submit and one export per lane, files saved outside `Data DKCL`, no Import, no database write. Windows runtime evidence by Antigravity if a visible window is required.
4. **Verify against the known answer:** the downloaded Huế detail must be the same 2.621 rows (SHA of content differences allowed, row set equal); the TCT file's Huế row must equal the Huế detail on the evaluated-rows view.
5. **Implement** the HUE and TCT single-date services and executors (client methods, completion policy `indicator × lane × date`, filename `F1.1-YYYY.MM.DD.xlsx`), register them before the coordinator starts, flip F1.1 to `ACTIVE` and both lanes to `AUTOMATED` **only after step 4 passes**.
6. **Backfill** from 2026-01-01 through the existing queue, newest first or as the PO prefers; holidays/exception rules as for F1.3/F4.1.
7. Tests: fake client, isolated database, retry/circuit classes (existing Safety policy), registry validation; Opus review of the adapter before it is switched on (different model from the implementer).

## 8. Evidence Pack The PO Provides (plain-language checklist)

Please do this in your normal Chrome, logged in as you always are, for **Huế first** and then **TCT**. Use the date 07/10/2026. **Do not send HAR files, cookies, passwords or tokens.**

For each lane send me:

1. **The web address (URL) of the F1.1 report page** — copy it from the address bar after opening the report.
2. **Which filter choices you pick** and what they are called on screen (for Huế: e.g. group by, province, dates; for TCT likewise), and which option is "all"/left empty.
3. **The request that returns the result:** press F12 → tab *Network* → press the button that shows the result → click the first new request (type document/xhr) → right-click → *Copy → Copy link address*. Paste the whole address (it contains the filters). Also tell me the status number (200 is good).
4. **A screenshot of the result table** with the total line visible (so I can match 2.621 / 4.xxx).
5. **For Huế only:** the number you click to open the detail table, and the request address of that detail table (same way as step 3); then the **Export** button: the address it calls and the **exact name of the downloaded file**.
6. **For TCT:** the Export button address and the exact downloaded file name.
7. **The account name** shown on screen after login.

Anything you cannot find, just say so — I will ask one precise question instead of guessing.

## 9. Exit Criteria

Per lane (standard §7): transport proven; direct outer rows reconcile (Huế 2.621 detail rows; TCT 84 rows with the Huế row equal to the Huế detail); report identity, export action and generated-file match observed; parser accepts the real workbook unchanged; completion policy satisfied; cleanup proven; PO gate. Then `AUTOMATED`.

## 10. Risks

| Risk | Mitigation |
| --- | --- |
| Automated request differs from Chrome's (F4.1: HTTP 500) | byte-compare the URL with the PO's before submit; stop at the first differing field |
| Portal date filter semantics unclear (partial days, next-day completions) | observe on 07/10 (known answer); fetch day D on D+1 |
| Header drift in exports (52 → 55 already) | existing header-name parser with hard errors |
| Backend restart interrupts a running import/backfill | PO chooses the moment; probe runs only with backend stopped |
| Session/account mismatch | PO confirms the account; no credentials handled |

## 11. Next Step

PO sends the evidence pack (Section 8). Then the contract draft and, if needed, one controlled live run. Dashboard and BCVH Ranking work (`F11-DASHBOARD-RANKING-01`) can start in parallel on the days already loaded, but the PO asked for data completeness first.
