# F13-WHY-UI-01 Manifest

## 1. Ticket Information

- Ticket ID: `F13-WHY-UI-01`
- Name: `F1.3 cause analysis screen for Chuyên quản and Giám đốc BCVH (problem given, design by Antigravity)`
- Programme: F1.3 cause rebuild. Data from `F13-WHY-DATA-02` (rules v5, CLOSED) and `F13-WHY-AGG-01` (aggregation layer, P1-P4 accepted).
- Owner: **Antigravity** (UI/UX, its strength: it designs and builds the screen). Claude Code: backend support only if a figure is missing from the API (ask, do not invent). Opus: independent review of the result.
- **PO decision 2026-11-05:** Claude gives Antigravity the problem, not a screen design; Antigravity designs and builds; it must not reproduce the UI defects the PO has had to fix recently (section 6).
- Status: `STEP 1 READY FOR ANTIGRAVITY` (two steps, section 2A; PO 2026-11-05). `PO UI Check Required = Yes`. Does not change the Current Ticket.

## 2. The problem (PO, in his words, 2026-11-05)

The quality results by day / week / month of every BCVH are already on "Kết quả chất lượng". Next, the user needs to know, inside a BCVH and for that day / week / month: **which route is the cause, which postman, how many parcels exactly, at which stage each parcel went wrong, where the delay started, and whether it came from objective faults before the BCVH** (Không trọn lô, parcel already over its time when it reached the BCVH, ...). The Chuyên quản and the Giám đốc BCVH must get a whole picture first, for example:

> "Yesterday 5 routes need attention: 30 % of the BCVH volume but only 30 % on time, which pulled the whole BCVH down.
> Route 1: 90 % of its parcels belong to a lot that did not arrive whole and was entered for delivery yesterday afternoon, so it fell to 10 %. ..."

That is the view to build: **not dry, unrelated figures, but one connected picture that answers the user's WHY questions.** The PO does not want the question itself as a menu name: the menu item gets a functional name proposed by Antigravity (PO approves).

Real example the data already gives (Thuận Hóa, 28/10/2026): 72,6 % (1 294 / 1 782), 261 parcels short of 90 %; 5 postman routes = 26,7 % of the volume, 42,3 % on time, 87 % of the shortfall; route "Ô tô Nam giữa" 141 parcels, 19,1 %, 112 of them in one lot that came in several TMS batches (Không trọn lô, objective, before the BCVH).

## 2A. Two steps and the programme order (PO approved 2026-11-05 on Claude's advice)

The screen is delivered in two steps; the PO checks step 1 before step 2 starts.

| Step | Content | Done when |
|---|---|---|
| **1** | **BCVH level** (summary in words for the chosen day / week / month: rate, parcels missing against 90 %, the routes that pull it down) and **route level** (postman routes needing attention ranked by parcels missing, each with its main cause in one sentence and its cause mix; "Tuyến khác" apart), menu item, link from "Kết quả chất lượng" | PO UI check of step 1 |
| **2** | **Postman level** (first-handover postman of a route: volume, failed, cause mix, facts only) and **parcel list** (the parcels behind any figure, with cause / Phát detail / Chờ Chuyên quản reason; a parcel opens Hành trình bưu gửi) | PO UI check of step 2 |

Programme order after this ticket: (3) **Dữ liệu minh chứng** rebuilt as the evidence of every figure (all parcels incl. Đạt, all sources and flags, Excel) and the place where the Chuyên quản analyses the "Chờ Chuyên quản" parcels and corrects a conclusion (decision E8 of F13-WHY-DATA-02: corrections kept, proposed as rules, approved by the PO); (4) **trial at BCVH Thuận Hóa** with its Chuyên quản and Giám đốc for 1-2 weeks, then retire the old "Phân tích tuyến phát" and give the old BCVH analysis page its real name (the menu item "Năng lực và chất lượng tuyến" currently opens it); (5) **Năng lực và chất lượng tuyến** after the PO defines route capacity. The former separate tickets "Phân tích tuyến phát" and "NARRATIVE" are merged into this screen.

## 3. Data available (backend, ready; do not compute rules in the browser)

`GET /api/f13/v2/why/{summary,bcvh,routes,postmen,parcels}` - common filter `from`+`to` | `week` | `month`, `bcvh`, `route`, `route_scope`, `postman`; `parcels` also `verdict`, `cause`, `reason`, `remaining`, `a_source`, `hint`, `sort`, `order`, `page`, `page_size`. Every group row has volume, passed, failed, unrated, rate, `own_shortfall` (parcels missing against 90 %), `net_contribution`, shares inside the parent, `cause_mix` (causes over Không đạt; Phát split into "Chậm giao bưu tá" / "Phát chậm sau khi giao"; "Chờ Chuyên quản phân tích" with its reasons), `arrival_remaining` (arrived over the limit / < 3 h / 3-6 h / >= 6 h), hints, `distinct_bg`, and the `filter` that opens its parcels. `meta.freshness` says whether the figures are complete or some days are stale; `meta.repeats` says rows vs distinct parcels. Parcel milestones (5 milestones, arrival source F4.1 / BatchFile) come from the existing Hành trình service. Field-level contract: `backend/src/services/f13v2/CauseAggQueryService.js`, manifest `F13-WHY-AGG-01` sections 15, 17, 19 and `F13-WHY-DATA-02` sections 3 and 8.

If a figure the design needs is not in the API, ask Claude Code; never compute a cause, a shortfall or a rate in the frontend.

## 4. Business rules the screen must respect (locked, PO)

- The official F1.3 result is never changed; counts are BG-day rows (show distinct parcels only as information when `meta.repeats.extra > 0`).
- Target 90 %; hot spots ranked by parcels missing against 90 % (`own_shortfall`), postman routes only; the NON_POSTMAN / OTHER buckets appear as "Tuyến khác", never ranked among routes.
- One primary cause per failed parcel; objective causes before the BCVH (Không trọn lô, Khai thác / Vận chuyển) come first in the story.
- Postman: the first-handover postman, name shown to Chuyên quản and Giám đốc; **no blame wording on a person or unit** (until the ĐTC2 level-2 deadlines exist): state facts and figures only.
- "Chờ Chuyên quản phân tích" is shown as such, with its reason; it is not a cause. Time left at arrival is information only.
- Permissions as the API returns them: a BCVH account sees its own unit only, no city total.
- Opens on a day / week / month with the same filter as "Kết quả chất lượng"; from a BCVH row of "Kết quả chất lượng" the user can open this view for the same BCVH and period. A whole-year range is slow in the API (about 8 s): do not make it the default.
- When `meta.freshness.complete` is false, the screen says so (which days), never shows the figures as final.

## 5. Required Reading for Antigravity

- this manifest;
- `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md` (mandatory functions and quality gates);
- `docs/04_TECHNICAL_PLANNING/Feature/F13-WHY-AGG-01_DESIGN_OF_RECORD.md` sections 6, 6A, 10 (definitions, rows vs distinct, permissions).

## 6. UI defects the PO had to fix recently - must not reappear

1. A missing import or variable that compiles but breaks the page at run time (`useEffect` in the monthly trend block, a capture variable): run `npx oxlint -D no-undef src` and fix every non-browser name.
2. Text clipped or overlapping, labels wrapping in cards and cells, tables wider than the screen: every table fits one laptop screen at 90 % zoom without horizontal scroll; short column titles; long names wrap inside their own column only.
3. Unit lists hard-coded or a unit filter that is ignored: units come from the API / layout scope; the selected BCVH filters every block.
4. Links that open a 404 or the wrong page / period: every link carries the period and the BCVH; check every route exists.
5. Blocks that do not follow the date filter, or a comparison against the wrong period.
6. A block shown twice on a page.
7. Camera: use the existing `BlockCaptureButton`; no blank band, no shrunk content; controls marked `data-no-capture`.
8. Colours: F1.3 blue family from `indicatorConfig.js`, light tones, no purple or dark tones; target line 90 % read from the config.
9. Change only what the ticket asks: do not shorten or rewrite other notes, captions or titles on existing pages.
10. Period buttons titled exactly "Theo ngày | Theo tuần | Theo tháng"; a missing number shows 0 where the table already does so.

## 7. Acceptance

- Antigravity proposes the menu name and the page structure in its report, then builds it; the PO checks the screens (Antigravity opens no browser, takes no screenshot, runs no dev server, does not log in).
- Report-block standard section 1 and gates of section 4 (tests, build, lint, `no-undef`).
- No change to the official figures or to the other F1.3 pages except the link from "Kết quả chất lượng" and the new menu item.
- Opus review of the code before the PO check.

## 8. Change log

- 2026-11-05: problem written from the PO's own words; ready for Antigravity (Claude Code / Opus 5.5).
- 2026-11-05: split into step 1 / step 2 and programme order recorded (section 2A), PO approved.
