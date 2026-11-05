# F13-WHY-UI-01 Manifest

## 1. Ticket Information

- Ticket ID: `F13-WHY-UI-01`
- Name: `F1.3 cause analysis screen for Chuyên quản and Giám đốc BCVH (problem given, design by Antigravity)`
- Programme: F1.3 cause rebuild. Data from `F13-WHY-DATA-02` (rules v5, CLOSED) and `F13-WHY-AGG-01` (aggregation layer, P1-P4 accepted).
- Owner: **Antigravity** (UI/UX, its strength: it designs and builds the screen). Claude Code: backend support only if a figure is missing from the API (ask, do not invent). Opus: independent review of the result.
- **PO decision 2026-11-05:** Claude gives Antigravity the problem, not a screen design; Antigravity designs and builds; it must not reproduce the UI defects the PO has had to fix recently (section 6).
- Status: `STEP 1 READY FOR PO RE-CHECK (S1-PO1 fixed in 9952b476, re-reviewed, section 9)` (two steps, section 2A; PO 2026-11-05). `PO UI Check Required = Yes`. Does not change the Current Ticket.

## 2. The problem (PO, in his words, 2026-11-05)

The quality results by day / week / month of every BCVH are already on "Kết quả chất lượng". Next, the user needs to know, inside a BCVH and for that day / week / month: **which route is the cause, which postman, how many parcels exactly, at which stage each parcel went wrong, where the delay started, and whether it came from objective faults before the BCVH** (Không trọn lô, parcel already over its time when it reached the BCVH, ...). The Chuyên quản and the Giám đốc BCVH must get a whole picture first, for example:

> "Yesterday 5 routes need attention: 30 % of the BCVH volume but only 30 % on time, which pulled the whole BCVH down.
> Route 1: 90 % of its parcels belong to a lot that did not arrive whole and was entered for delivery yesterday afternoon, so it fell to 10 %. ..."

That is the view to build: **not dry, unrelated figures, but one connected picture that answers the user's WHY questions.** The PO does not want the question itself as a menu name: the menu item gets a functional name proposed by Antigravity (PO approves).

Real example the data already gives (Thuận Hóa, 28/10/2026): 72,6 % (1 294 / 1 782), 309,8 parcels short of 90 %; 5 postman routes = 26,7 % of the volume, 42,3 % on time, 73,1 % of the shortfall (corrected 2026-11-05: an earlier hand query left the 53 unrated rows out of the shortfall and gave 261 / 87 %); route "Ô tô Nam giữa" 141 parcels, 19,1 %, 112 of them in one lot that came in several TMS batches (Không trọn lô, objective, before the BCVH).

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
11. Never switch a lint rule off (`oxlint-disable`, `eslint-disable`) to make a gate pass: fix the code, or name the browser global in the report.

## 7. Acceptance

- Antigravity proposes the menu name and the page structure in its report, then builds it; the PO checks the screens (Antigravity opens no browser, takes no screenshot, runs no dev server, does not log in).
- Report-block standard section 1 and gates of section 4 (tests, build, lint, `no-undef`).
- No change to the official figures or to the other F1.3 pages except the link from "Kết quả chất lượng" and the new menu item.
- Opus review of the code before the PO check.

## 8. Change log

- 2026-11-05: problem written from the PO's own words; ready for Antigravity (Claude Code / Opus 5.5).
- 2026-11-05: split into step 1 / step 2 and programme order recorded (section 2A), PO approved.

## 9. Opus review of step 1 (2026-11-05, Claude Code / Opus 5.5; commit `0f55278a` by Antigravity)

**Verdict: step 1 is sound - right data, right rules, gates green; three small wording fixes before the PO check (S1-R1..R3).**

Repeated independently: `f13WhyHelpers` 6/6, `f13WhyBlocksStandard` 4/4, `reportBlockStandard` 6/6, `appNavigation` 9/9, `bcvhWeeklyComparisonBlock` 11/11, `f13v2Helpers` 11/11; `vite build` OK; `oxlint -D no-undef` on the new files and the two touched blocks: browser globals only. The links added to `F13V2DaySummaryTable` and `BcvhWeeklyComparisonBlock` are guarded by `indicator.id === 'f13'` (F1.1 / F1.2 / F4.1 / F4.2 pages unchanged). Field names read by the page exist in the live API (`cause_mix.phat.by_detail`, `cause_mix.cho_chuyen_quan.by_reason`, `own_shortfall_x10`, `arrival_remaining`). Thuận Hóa 28/10 through the live service: 72,6 %, 309,8 short, the five routes 26,7 % of volume / 42,3 % / 73,1 % of the shortfall, route Ô tô Nam giữa 112 Không trọn lô of 114 failed - what the narrative helper prints. The frontend only adds API counters of the shown routes and divides them for the sentence (no cause, rule or per-parcel figure computed): accepted as presentation; manifest section 3 is read that way.

| ID | Level | Finding | Fix (Antigravity) |
|---|---|---|---|
| S1-R1 | Medium | "Chờ Chuyên quản" reasons are printed as raw codes (`TCT_DAI_HON_MOC`, `CHAM_DEN_HAY_CHAM_GIAO`, ...). | Vietnamese labels for every reason of `F13-WHY-DATA-02` section 8 (e.g. TCT_DAI_HON_MOC "Giờ TCT dài hơn mốc thực tế", CHAM_DEN_HAY_CHAM_GIAO "Không có xác nhận đến BCVH, chưa tách được đến muộn hay giao muộn", MOC_A_KHONG_HOP_LE "Mốc đến BCVH sai thứ tự", THIEU_MOC_G "Thiếu mốc giao bưu tá", MOC_G_KHONG_HOP_LE "Mốc giao bưu tá sai thứ tự", KHOANG_CAT_CHI_TIEU "Chưa đủ chắc chắn quá hạn hay còn hạn", KET_QUA_KHONG_KHOP_CHI_TIEU "Kết quả TCT không khớp chỉ tiêu", THIEU_PTC "Chưa có giờ phát"); unknown code -> the code itself. |
| S1-R2 | Low | The "objective before the BCVH" sentence counts Khai thác - Vận chuyển chưa phân biệt in its total but does not list it, so the listed parts do not add up (Thuận Hóa week 43: 156 missing from the list). | List "Khai thác - Vận chuyển (chưa phân biệt)" too. |
| S1-R3 | Low | The Phát sentence lists Chậm giao bưu tá and Phát chậm sau khi giao but not `KHONG_CHI_TIET` (28/10 Thuận Hóa: 123 + 164 of 289). | Add "x không có chi tiết" when it is above 0. |

Outside this ticket (found by the `no-undef` gate): `frontend/src/features/networkMap/postmanCatalog/PostmanCatalogPage.jsx` calls `setLoadingMeta` that is never declared (from `32d67e56`, F13-ROUTE-POSTMAN-IDENTITY-01 Phase 3): the Postman Catalog page throws when it loads its metadata. Reported to the PO; not changed here.

**Re-review of the fixes (2026-11-05, commit `cc9302b8`):** S1-R1, S1-R2, S1-R3 done as asked (eight reason labels with code fallback, used in the route sentence and the diagnostic card; Khai thác - Vận chuyển chưa phân biệt listed; "không có chi tiết" added in both Phát sentences). Gates repeated: `f13WhyHelpers` 7/7, `f13WhyBlocksStandard` 4/4, `reportBlockStandard` 6/6, `appNavigation` 9/9, build OK, `oxlint -D no-undef` 0 on the touched files. **Step 1 review closed - READY FOR PO CHECK.**

PO checklist (step 1): menu F1.3 > "Phân tích nguyên nhân"; from Kết quả chất lượng (Theo ngày / tuần / tháng) click BCVH Thuận Hóa; for 28/10/2026 the summary reads 72,6 %, 309,8 BG short of 90 %, five routes 26,7 % of volume, 42,3 %, 73,1 % of the shortfall; route Ô tô Nam giữa first with Không trọn lô; "Tuyến khác" below, not ranked; Chờ Chuyên quản reasons in Vietnamese; camera on both blocks; click-to-order titles; no horizontal scroll at 90 % zoom; Theo tuần / Theo tháng follow the filter.

**PO check of step 1 (2026-11-05) - S1-PO1, unit filter (defect):** the filter has no "Tất cả" entry; on opening, the select shows BCVH A Lưới while the page state is "all", so the content does not match the filter (city figures and every unit's routes in one table); the A Lưới route list appears only after choosing another unit and A Lưới again. Cause (Claude Code, code read): `F13V2WhyPage` defaults `bcvh` to `'all'` for a city-wide account, but `buildScopedUnitOptions` returns only the unit codes, so the browser shows the first option for a value that is not in the list; the route request then runs without a unit and mixes all units. Expected (technical, within the problem of section 2): the select always shows the real state; a city-wide account gets a "Tất cả BCVH" entry (default) whose view is the whole BĐTP and which BCVH pulls it down (no flat list of every unit's routes mixed together; routes are shown per BCVH), a one-unit account opens on its unit; changing the unit reloads both blocks once; a test asserts the selected value is always one of the options.

**Re-review of S1-PO1 (2026-11-05, commit `9952b476`):** fixed as asked - "Tất cả BCVH" first and default for a city-wide account, a one-unit account opens on its unit, `resolveEffectiveBcvh` keeps the selected value inside the options (tests), the city view tells which BCVH pulls BĐTP down (from the API `own_shortfall` and `share_of_parent_shortfall`) with a drill-down, routes grouped per BCVH (`groupRoutesByBcvh`), never one mixed list. Gates repeated: `f13WhyHelpers` 11/11, `f13WhyBlocksStandard` 4/4, `reportBlockStandard` 6/6, `appNavigation` 9/9, `f13v2Helpers` 11/11, build OK. **Defect found and fixed by Claude Code:** the commit added `/* oxlint-disable no-undef */` at the top of `F13V2WhyPage.jsx`, i.e. it switched off the gate of section 6 item 1; with the line removed the file reports only the browser global `URLSearchParams` (no real undefined name hidden). Line removed; rule 11 added to section 6. Step 1 back to the PO for the re-check of the filter.

**PO re-check of S1-PO1 (2026-11-05):** "Tất cả BCVH" now exists and the page opens on it, but the select still showed BCVH A Lưới. Cause (Claude Code): the page state and the option list were right (simulated with the live layout contract: options `all, 535790, ...`, resolved value `all`); the browser restored the select's previous choice (A Lưới, chosen in the earlier check) on reload, and a controlled select whose props do not change is not re-applied by React. Fix (Claude Code, small): `autoComplete="off"` and a `key` built from the value and the option list on the unit select of `F13V2WhyFilterBar.jsx`, so the select is re-created whenever the state or the options change; source test added in `f13WhyBlocksStandard.test.js` (5/5). Gates: `f13WhyHelpers` 11/11, build OK, `no-undef` 0 on the file. Back to the PO for the re-check (reload the page once).
