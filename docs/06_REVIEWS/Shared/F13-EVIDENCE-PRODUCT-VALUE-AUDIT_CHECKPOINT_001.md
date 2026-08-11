# F13 Evidence Product-Value Audit — CHECKPOINT 001

## Table of Contents

- [1. Purpose And Authority](#1-purpose-and-authority)
- [2. Method](#2-method)
- [3. Central Finding — Evidence Is Not The Frozen Evidence Center](#3-central-finding--evidence-is-not-the-frozen-evidence-center)
- [4. Q1 — Why Tuyến Ranking Still Shows Shipments Itself](#4-q1--why-tuyến-ranking-still-shows-shipments-itself)
- [5. Q2 — How The Two Screens Overlap/Split](#5-q2--how-the-two-screens-overlapsplit)
- [6. Q3 — Who Evidence Actually Serves](#6-q3--who-evidence-actually-serves)
- [7. Q4 — Widget-By-Widget Audit](#7-q4--widget-by-widget-audit)
- [8. Q5 — Numeric Consistency Against Tuyến Ranking](#8-q5--numeric-consistency-against-tuyến-ranking)
- [9. Q6 — Proposed Target Flow](#9-q6--proposed-target-flow)
- [10. Q7 — KEEP / REMOVE / MERGE / REDESIGN](#10-q7--keep--remove--merge--redesign)
- [11. Q8 — Wireframe (No-Code) And Acceptance Criteria](#11-q8--wireframe-no-code-and-acceptance-criteria)
- [12. Decisions Requested From Product Owner](#12-decisions-requested-from-product-owner)
- [13. Scope Discipline](#13-scope-discipline)

## 1. Purpose And Authority

Product Owner instruction (chat, this round): the prior Evidence closure (`3924fd69`, `PO RUNTIME CHECK PASS`) proved only that `/f13/evidence` works technically, not that it delivers product value. This audit traces `Tuyến Ranking → current shipment detail → /f13/evidence` end to end and answers 8 required questions. **Discovery/planning only — no product code changed.**

## 2. Method

Direct source read of every file in the chain, plus the frozen Evidence architecture set (`docs/02_ARCHITECTURE/EVIDENCE/*`, `docs/EVIDENCE_CENTER_WIDGET_SPECIFICATION.md`) and the prior static-inspection handoff (`docs/F13_ROUTE_RANKING_EVIDENCE_HANDOFF.md`, `2026-08-03`, superseded for `RoutePerformancePage.jsx`'s current layout but still accurate for terminology/precedent). No runtime/browser session was opened. No database query was run — all figures below are code-traced contract behavior, not live counts (the one live count already on record, `318` rows as the real dataset's largest Không đạt set, is carried over from the prior PO recheck, not re-measured here).

Files read: `RoutePerformancePage.jsx`, `routeRankingCalculations.js`, `routeRankingFilters.js`, `routeViolationEvidenceData.js`, `RouteViolationEvidencePage.jsx`, `ShipmentPerformancePage.jsx`, `shipmentPerformanceData.js`, `ShipmentExecutiveBrief.jsx`, `ShipmentImpactOverview.jsx`, `ShipmentTimeline.jsx`, `ShipmentRootCause.jsx`, `ShipmentEvidenceSummary.jsx`, `ShipmentRecommendation.jsx`, `ShipmentDrilldown.jsx`, `ShipmentShellShared.jsx`, `F13DashboardClient.js`, `DashboardController.js`, `FactBuuGuiRepository.js`, `App.jsx`, `appNavigation.jsx`, `docs/02_ARCHITECTURE/EVIDENCE/EVIDENCE_CENTER_INFORMATION_ARCHITECTURE.md`, `docs/02_ARCHITECTURE/EVIDENCE/EVIDENCE_CENTER_SCREEN_ARCHITECTURE.md` (partial), `docs/EVIDENCE_CENTER_WIDGET_SPECIFICATION.md`, `docs/F13_ROUTE_RANKING_EVIDENCE_HANDOFF.md`.

## 3. Central Finding — Evidence Is Not The Frozen Evidence Center

This is the single most consequential finding and frames every answer below.

`docs/02_ARCHITECTURE/EVIDENCE/EVIDENCE_CENTER_INFORMATION_ARCHITECTURE.md` (frozen) defines Evidence Center as a **distinct stage after** Shipment Performance Center in the drill-down chain:

> `Dashboard → BCVH Performance Center → Route Performance Center → Shipment Performance Center → Evidence Center → Action Center`

...and states explicitly, twice, as a locked design principle (Section 8): **"Không lặp Shipment Performance Center"** (must not duplicate Shipment Performance Center) and **"Không đưa Recommendation sang Evidence"** (must not put Recommendation into Evidence). `docs/EVIDENCE_CENTER_WIDGET_SPECIFICATION.md` (frozen) defines Evidence Center's actual 8 widgets as a **verification/validation layer**: Executive Summary, Coverage, Timeline, Scan History, Rule Validation, Supporting Evidence, RCA Evidence, Decision Support — answering "is the evidence sufficient/valid to proceed to Action Center," not "here is the shipment list."

What is actually running at `/f13/evidence` today (Product Owner-accepted as canonical, prior round) is `ShipmentPerformancePage.jsx` — the **Shipment Performance Center** component, renamed in title only ("Evidence — Chi tiết bưu gửi"), carrying a `ShipmentRecommendation` widget. This is, by the frozen document's own stated rules, exactly the two things Evidence Center is explicitly forbidden from being: a duplicate of Shipment Performance Center, and a carrier of Recommendation content.

**This is not reported as a defect to silently fix.** Per `CLAUDE.md` ("do not change SSOT, frozen architecture, or frozen documents" / "escalate instead of guessing when... a frozen document or SSOT would need to change"), this is escalated to the Product Owner as Decision 1 in Section 12. Two honest paths exist, not one:

- **Path A — Amend the frozen Evidence Center architecture** to match what the database can actually support today (a `Không đạt` shipment list, classified by `violation_reason`, with timeline and a bounded recommendation) — i.e., ratify what was actually already built and accepted as the real "Evidence" screen for this product, and formally retire the abstract Scan History/Rule Validation/RCA-Evidence widget set, none of which have a data source in `fact_f13` (confirmed by the `2026-08-04` database audit: no rule/scan/RCA field exists).
- **Path B — Build toward the frozen spec** and treat the current `ShipmentPerformancePage.jsx`-at-`/f13/evidence` as a placeholder Shipment Performance Center that needs its own separate route, with a real Evidence Center built afterward as new scope.

Neither path is authorized by this audit. Everything below (widget audit, KEEP/REMOVE/MERGE, target flow, wireframe) is written to serve **Path A specifically**, because it is the only path consistent with what has already been built, tested, and Product Owner-accepted twice — but it is explicitly flagged as requiring the frozen-document amendment in Decision 1 before any redesign work can start.

## 4. Q1 — Why Tuyến Ranking Still Shows Shipments Itself

Traced to a **separate design lineage**, not an oversight in the recent Evidence work.

- `RoutePerformancePage.jsx`'s `RouteSelectedPanel` renders a button **"Mở chi tiết bưu gửi vi phạm"** (`Link to={violationLink}`), built by `buildViolationEvidenceLink()` in `routeViolationEvidenceData.js`, targeting **`/f13/ranking/route/violations`** — a completely different route from `/f13/evidence`.
- That route renders `RouteViolationEvidencePage.jsx`: its own full page — violation-reason tabs (Chậm nộp tiền / Không đạt khác / Chưa xác định nguyên nhân / Tất cả), its own shipment table (`ma_bg`, `violationReason`, `pickupTime`, `handoverTime`, `delayLabel`), its own back-link to Tuyến Ranking.
- This screen and its wiring were built and **closed with explicit Product Owner `PO PASS`** under the Tuyến Ranking delta (`F13-STANDARDIZATION-001_MANIFEST.md` Section 16, `2026-08-04`), **before** the `/f13/evidence` canonicalization work (`2026-08-11`) existed. The two efforts were never reconciled — the Tuyến Ranking closure's own scope note says explicitly: *"it does not close... Evidence... Shipment Performance Center."*
- Net effect: Tuyến Ranking's drill-down button still points at its own PO-accepted violation screen because nothing ever told it to point anywhere else. It is not "duplicated by accident" — it is the original, working, tested destination that the later Evidence work never touched (`RouteViolationEvidencePage.jsx` is confirmed untouched by both prior Evidence rounds via `git diff --name-only`).

## 5. Q2 — How The Two Screens Overlap/Split

Three implementations now sit on the exact same backend contract (`GET /f13/evidence-list` → `DashboardController.getEvidence` → `FactBuuGuiRepository.getEvidenceListFacts`, `WHERE ngay_do_kiem = ? AND ma_bcvh = ? [AND ma_tuyen = ?] AND danh_gia_2026 = 'Không đạt'`):

| | `/f13/ranking/route/violations` (`RouteViolationEvidencePage.jsx`) | `/f13/evidence` (`ShipmentPerformancePage.jsx`) |
| --- | --- | --- |
| Reached from | Tuyến Ranking row's "Mở chi tiết bưu gửi vi phạm" button only | Sidebar nav; no other screen links here |
| Role | `admin`-only | `admin`+`viewer` |
| Violation classification | **Yes** — 4 tabs (Chậm nộp tiền default, Không đạt khác, Chưa xác định, Tất cả), counts from `meta.violation_summary` | **No** — `violation_reason` is never read from the API response at all |
| Route selector | None — always a single fixed route from the link | Real, BCVH-dependent, supports "Tất cả tuyến" |
| Row-level detail | Table only, no per-shipment drill-in | `ShipmentEvidenceSummary` lets you pick one shipment, feeding 4 mostly-decorative widgets |
| Pagination | **Same unfixed defect this program already fixed in Evidence**: hardcoded `getEvidenceList(date, bcvhId, routeId, 1, 1000, reasonFilter)` — a single 1,000-row request, no `fetchAllEvidenceRows()` equivalent | Fixed (`fetchAllEvidenceRows()`, `2026-08-11`) |
| Recommendation content | None | Yes (`ShipmentRecommendation` — itself a frozen-architecture violation, Section 3) |

The split is real and costly: a manager arriving via Tuyến Ranking gets violation-reason classification but no route selector, no viewer access, and the still-open 1,000-row cap; a manager arriving via the Sidebar gets the opposite trade — full filtering but zero violation-reason visibility, the exact classification that Tuyến Ranking's whole drill-down exists to produce.

## 6. Q3 — Who Evidence Actually Serves

Traced from what the screen actually does today, not from its aspirational name:

- **Audience**: an F1.3 operations manager (or viewer-role stakeholder, since `2026-08-11`) who has already identified a failing BCVH+route+date combination via Dashboard/BCVH Ranking/Tuyến Ranking and needs the list of individual failed shipments (`Không đạt`) behind that number.
- **Question it actually answers**: "Which specific bưu gửi failed for this BCVH/date/route, when were they picked up and handed over, and how late was the cash handover?" — a **shipment-level exception list**, not a verification/validation judgment.
- **Question it does not answer, despite the frozen spec's intent**: "Is the evidence for this failure sufficient/valid to escalate?" (no coverage/scan/rule-validation concept exists anywhere in the data) or "What should I do next?" (the one widget that tries, `ShipmentRecommendation`, just echoes the delay number back — see Section 7).
- **Conclusion**: Evidence today functions as **Shipment Performance Center**, matching its component name, its data, and the frozen IA's own description of what Shipment Performance Center (the stage *before* Evidence Center) is supposed to do: *"Shipment Performance Center xác định bưu gửi đại diện cho vấn đề"* (identify the representative shipment(s) for the problem). It is not currently answering an Evidence-stage question at all.

## 7. Q4 — Widget-By-Widget Audit

All 7 widgets are wrapped in `ShipmentShellCard`, which still renders its original boilerplate on every card regardless of content: *"Đây là shell theo Screen Architecture đã Freeze. Dữ liệu nghiệp vụ sẽ được bổ sung ở ticket sau."* ("This is a shell per the frozen Screen Architecture. Business data will be added in a later ticket.") This disclaimer is stale copy left over from the original shell-only implementation and is shown to end users on a screen the Product Owner has already twice accepted as functionally real — flagged for removal regardless of any other decision.

| Widget | Data it actually uses | What it reflects | Real admin action it enables | Verdict |
| --- | --- | --- | --- | --- |
| `ShipmentExecutiveBrief` | Real: selected shipment ID, BCVH, Route, Result (`danh_gia_2026`) | A restated identity card of the currently selected row | None — pure read | Real data, no unique value beyond the table row itself |
| `ShipmentImpactOverview` | `Delay` (real), **`Search` (the literal search-box text)**, **`Runtime rows` (row count)** | Two of three fields are UI-state echo, not business impact — same defect class already flagged for Route Ranking's KPI row (`F13_ROUTE_RANKING_EVIDENCE_HANDOFF.md` G8) | None | Mostly decorative |
| `ShipmentTimeline` | Real: pickup time, handover time, delay, status — as **plain text lines**, not an actual timeline visualization | Duplicates `ExecutiveBrief` + the evidence table's own PTC/handover columns | None | Redundant with existing table columns |
| `ShipmentRootCause` | Canned bullet strings ("Shipment X is the active runtime selection", "Route context: Y", "Delay signal: Z") — **never reads `violation_reason`**, which the API already returns | Nothing beyond what's already visible; the one thing a "root cause" widget should show (Chậm nộp tiền vs Không đạt khác vs Chưa xác định) is the one field it omits | None | Does not do its stated job |
| `ShipmentEvidenceSummary` | Real: the full shipment table with selection | The actual evidence list — this is the substantive widget | Select a shipment to focus context | Real and useful; incomplete without a `violation_reason` column/filter |
| `ShipmentRecommendation` | `selectedShipment.delayLabel` echoed into a sentence template | Restates the delay number as if it were a recommendation | None — no threshold, no escalation logic, no link to the locked `> 3.0h` delayed-cash rule (`F13-BCVH-RANKING-REDESIGN-IMPL` SSOT) is applied here | Not a real recommendation; also a direct frozen-IA violation (Section 3) |
| `ShipmentDrilldown` | None — static text about "Navigation Map" and "Shared Layout Integration" (the architecture itself, not the shipment) | Nothing shipment-related | None | Pure scaffolding text, zero business content |

## 8. Q5 — Numeric Consistency Against Tuyến Ranking

- **Date, BCVH, route, denominator**: traced through code, not measured live. `RouteViolationEvidencePage.jsx` and `ShipmentPerformancePage.jsx` both ultimately call the same `FactBuuGuiRepository.getEvidenceListFacts(date, bcvh, route)` with the identical `WHERE` predicate — **given the same three key values, the counts are guaranteed identical by construction** (same query, same table, same filter). This is the one genuinely reassuring finding in this audit.
- **But the three key values are not guaranteed to arrive identical**, because the two screens use an incompatible URL contract:
  - `buildViolationEvidenceLink()` emits a single `date` param.
  - `ShipmentPerformancePage.jsx` reads `from_date`/`to_date` and resolves `analysisDate = toDateParam || fromDateParam` — it **never reads `date`** at all.
  - `bcvh_id`, `bcvh_name`, `route_id`, `route_name` param names do match between the two.
  - **Concrete risk**: if a future round simply repoints the Tuyến Ranking button from `/f13/ranking/route/violations` to `/f13/evidence` without translating `date` → `from_date`, Evidence would silently fall back to `metaMaxDate` instead of the actually-selected analysis date — a real, specific migration defect this audit is flagging before it happens, not after.
- **Nhóm vi phạm (violation group)**: cannot be cross-checked today because Evidence has no violation-group concept at all (Section 7) — there is no "does Evidence's Chậm nộp tiền count match Tuyến Ranking's" comparison possible until that gap is closed.
- **Mẫu số (denominator) semantics**: identical between the two by construction (same query), confirmed above; not separately re-verified against `danh_gia_2026` upstream KPI figures in this audit (that reconciliation was already closed as `MD-01`/`DQ-07` in the `2026-08-04` database audit and is not reopened here).

## 9. Q6 — Proposed Target Flow

```
Tuyến Ranking (route list, KEEP)
        │  click a route
        ▼
Danh sách vi phạm (violation list — MERGE target: the real
implementation already exists at RouteViolationEvidencePage.jsx;
retire the duplicate table inside ShipmentPerformancePage.jsx)
   - violation_reason tabs (Chậm nộp tiền default) — KEEP, already built
   - + add: the real Tuyến/"Tất cả tuyến" selector currently only in Evidence
   - + add: viewer role access currently only in Evidence
   - + fix: the still-open 1,000-row cap (apply fetchAllEvidenceRows() here too)
        │  click one shipment row (new interaction — does not exist today)
        ▼
Nguyên nhân / Timeline cho MỘT bưu gửi (single-shipment detail — NEW,
replaces the 4 decorative widgets in Section 7 with one substantive panel)
   - PTC time, handover time, computed delay, violation_reason — all real
   - the locked "> 3.0h = Chậm nộp tiền" rule applied and shown, not just echoed
        │
        ▼
Hành động (Action) — explicit hand-off point only, per the frozen
Evidence IA boundary ("Evidence Center xác minh bằng chứng" / hands off
to Action Center). No fabricated action button — a clear
"chuyển sang Action Center" state, honestly labeled
CHƯA CÓ ACTION CENTER / not yet built, if Action Center does not exist yet.
```

This flow directly answers the Product Owner's requested sequence (Tuyến Ranking → danh sách vi phạm → chọn bưu gửi → nguyên nhân/timeline → hành động) and requires **retiring one of the two current screens**, not keeping both.

## 10. Q7 — KEEP / REMOVE / MERGE / REDESIGN

| Screen area | Verdict | Why |
| --- | --- | --- |
| Tuyến Ranking table + `RouteSelectedPanel` | **KEEP** | Already `PO PASS`, no defect found here |
| `RouteViolationEvidencePage.jsx` (`/f13/ranking/route/violations`) | **MERGE** — becomes the base of the real destination screen | Already has the one thing Evidence is missing (violation_reason classification); needs Evidence's route selector + viewer access + pagination fix folded in |
| `ShipmentPerformancePage.jsx` at `/f13/evidence` (current canonical) | **REDESIGN** | Real BCVH/route/pagination infrastructure is worth keeping; the widget set above it is not |
| `ShipmentExecutiveBrief` | **MERGE** | Fold into a single compact context header (same information the violations page's "context bar" already renders more concisely) |
| `ShipmentImpactOverview` | **REMOVE** | `Search`/`Runtime rows` are UI-state echo, not business data |
| `ShipmentTimeline` | **REMOVE** | Fully redundant with table's PTC/handover columns once those are shown per-row |
| `ShipmentRootCause` | **REDESIGN** | Replace canned bullets with the actual `violation_reason` + timeline for the selected shipment |
| `ShipmentEvidenceSummary` | **KEEP, REDESIGN column set** | The one real substantive widget; add `violation_reason` column and tab/filter |
| `ShipmentRecommendation` | **REMOVE** (pending Decision 1) | Frozen Evidence IA explicitly forbids Recommendation content in Evidence; also not a real recommendation today (no threshold logic) |
| `ShipmentDrilldown` | **REMOVE** | Zero business content, pure placeholder text |
| `ShipmentShellCard`'s "shell/data added later" disclaimer | **REMOVE regardless of any other decision** | Stale copy shown to end users on an already-accepted screen |

## 11. Q8 — Wireframe (No-Code) And Acceptance Criteria

### 11.1 Wireframe (regions, no visual design — for PO/Antigravity review, not implementation-ready)

```
┌───────────────────────────────────────────────────────────────────┐
│ Header: "Danh sách vi phạm" · BCVH [selector] · Ngày [date]        │
│         · Tuyến [selector incl. "Tất cả tuyến"]                    │
├───────────────────────────────────────────────────────────────────┤
│ Violation-reason tabs: [Chậm nộp tiền*] [Không đạt khác]            │
│                        [Chưa xác định] [Tất cả không đạt]           │
├───────────────────────────────────────┬─────────────────────────────┤
│ Evidence table (left, majority width)  │ Selected-shipment panel     │
│  Mã BG | Lý do vi phạm | PTC | Nộp tiền│  (right, appears on row     │
│  | Độ trễ                              │   click)                   │
│  (real pagination — no 1,000 cap;      │  - Mã BG, BCVH, Tuyến        │
│   sort by any column)                  │  - Lý do vi phạm (badge)    │
│                                         │  - PTC / Nộp tiền / Độ trễ  │
│                                         │  - "> 3h" rule shown        │
│                                         │    explicitly if triggered  │
│                                         │  - "Chuyển sang Action      │
│                                         │    Center" (hand-off state, │
│                                         │    honestly labeled if not  │
│                                         │    yet built)               │
└─────────────────────────────────────────┴─────────────────────────────┘
```

### 11.2 Acceptance criteria (reconciliation-checkable)

1. Selecting a BCVH+date+route on this screen and reading the "Tất cả không đạt" tab count must exactly equal Tuyến Ranking's `failed`/`total_failed` figure for that same route/date.
2. The 4 violation-reason tab counts must sum exactly to the "Tất cả không đạt" count, for every BCVH/date/route combination tested.
3. Arriving via the Tuyến Ranking button must land with the exact same date/BCVH/route context already selected (no silent fallback to a different date).
4. Selecting "Tất cả tuyến" must show rows from every route for that BCVH/date, and the total must equal the sum of every individual route's count for that BCVH/date.
5. No screen in this flow may fetch a fixed `page_size` and silently omit rows beyond it — the displayed total must equal `meta.pagination.total_items` at all times.
6. `viewer` role must reach the merged screen; `admin`-only actions (if any) must be visibly gated, not silently absent.
7. Every widget remaining after REMOVE/MERGE must have a demonstrable non-empty state and a demonstrable "no data" state that says so honestly (no `N/A` standing in for a real zero, per the project's existing `null`-vs-`0` discipline).
8. No visible end-user text may say "shell," "placeholder," or "sẽ được bổ sung ở ticket sau."

## 12. Decisions Requested From Product Owner

1. **Frozen-architecture path (Section 3)** — Path A (amend `EVIDENCE_CENTER_INFORMATION_ARCHITECTURE.md`/`EVIDENCE_CENTER_SCREEN_ARCHITECTURE.md`/`EVIDENCE_CENTER_WIDGET_SPECIFICATION.md` to match the real, data-grounded shipment-exception-list product that already exists and has twice been accepted) or Path B (build toward the frozen verification/RCA spec as new, separate scope, and give the current screen a non-"Evidence" route/name)? This audit's remaining recommendations (Sections 9-11) assume Path A but implement neither path.
2. **Merge direction (Section 10)**: confirm or amend — retire `ShipmentPerformancePage.jsx`'s own evidence table and consolidate around `RouteViolationEvidencePage.jsx`'s violation-reason-first structure, carrying over Evidence's route selector, viewer access, and pagination fix?
3. **`ShipmentRecommendation` widget**: REMOVE per the frozen-IA boundary, or redesign it into a real rule-driven recommendation (applying the locked `> 3.0h` delayed-cash threshold) if Path A is chosen and the boundary is formally relaxed?
4. **Route naming**: does the merged screen stay at `/f13/evidence`, move to `/f13/ranking/route/violations`, or take a new URL? (Affects the legacy-redirect chain already built for `/f13/ranking/shipment`.)
5. **Sequencing**: authorize this as the next F1.3 scope now, or hold pending other priorities? No implementation is started by this audit either way.

## 13. Scope Discipline

- Discovery/planning only. No product code, route, component, schema, or database change was made.
- `F13-SHIPMENT-001` (`stash@{0}`) was not opened, read, or reactivated.
- Dashboard, BCVH Ranking, and `Data QLML/` were not touched or audited.
- `NETWORK-MANAGEMENT-001`/`NETWORK-MANAGEMENT-002` were not reopened.
- `.claude/` and both stashes (`stash@{0}`, `stash@{1}`) confirmed untouched.
- This audit does not reopen or amend the `2026-08-11` `PO RUNTIME CHECK PASS` closure — it adds a new, later finding on top of it, per explicit Product Owner instruction that the prior closure proved technical function only.
