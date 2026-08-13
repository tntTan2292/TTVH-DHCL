# F13 Evidence Consolidation — PLAN CHECKPOINT 001

## Table of Contents

- [1. Purpose And Authority](#1-purpose-and-authority)
- [2. New Findings Discovered During Planning](#2-new-findings-discovered-during-planning)
- [3. Task 1 — Data / Context Contract](#3-task-1--data--context-contract)
- [4. Task 2 — No-Code Wireframe](#4-task-2--no-code-wireframe)
- [5. Task 3 — Widget Disposition](#5-task-3--widget-disposition)
- [6. Task 4 — Old Screen, Redirect And Bookmarks](#6-task-4--old-screen-redirect-and-bookmarks)
- [7. Task 5 — Acceptance Criteria](#7-task-5--acceptance-criteria)
- [8. Task 6 — Architecture Documents Needing Amendment](#8-task-6--architecture-documents-needing-amendment)
- [9. Task 7 — Implementation Phases, Test Plan, File Scope](#9-task-7--implementation-phases-test-plan-file-scope)
- [10. Risks And Open Questions](#10-risks-and-open-questions)
- [11. Scope Discipline](#11-scope-discipline)
- [12. Phase 1 Implementation Record (2026-08-11)](#12-phase-1-implementation-record-2026-08-11)
- [13. Phase 1 Remediation — PO Runtime Evidence (2026-08-11)](#13-phase-1-remediation--po-runtime-evidence-2026-08-11)
- [14. PO Finding — Search Result Presentation Ambiguity, Locked Into Phase 2 (2026-08-12)](#14-po-finding--search-result-presentation-ambiguity-locked-into-phase-2-2026-08-12)
- [15. Session Continuity Checkpoint — Work Paused For Date-Filter Diagnosis (2026-08-12)](#15-session-continuity-checkpoint--work-paused-for-date-filter-diagnosis-2026-08-12)
- [16. Date-Filter Remediation — PO-Authorized Bounded Fix (2026-08-13)](#16-date-filter-remediation--po-authorized-bounded-fix-2026-08-13)
- [17. Date-Filter Remediation — PO Runtime Recheck PASS, Closure (2026-08-13)](#17-date-filter-remediation--po-runtime-recheck-pass-closure-2026-08-13)
- [18. Evidence Consolidation Phase 1 — Formal Closure (2026-08-13)](#18-evidence-consolidation-phase-1--formal-closure-2026-08-13)
- [19. Frozen-Document Governance Delta — Execution Record (2026-08-13)](#19-frozen-document-governance-delta--execution-record-2026-08-13)
- [20. Phase 2 Implementation Record (2026-08-13)](#20-phase-2-implementation-record-2026-08-13)

## 1. Purpose And Authority

Product Owner decision received (chat, `2026-08-11`), on the audit recorded in `docs/06_REVIEWS/Shared/F13-EVIDENCE-PRODUCT-VALUE-AUDIT_CHECKPOINT_001.md`:

1. Keep `/f13/evidence` as the single shared violation-detail screen.
2. Tuyến Ranking must lead into Evidence; do not maintain a separate shipment-detail flow.
3. Streamline Evidence per the audit.
4. Remove Recommendation within this scope.
5. Planning a controlled amendment of the locked (frozen) architecture documents is permitted.

This document is **planning only**. No product code was changed. Frozen documents were **not** edited — Section 8 lists what would need amending, for separate Product Owner approval.

Baseline: `e2c32178`. Branch: `codex/da-impl-006`.

## 2. New Findings Discovered During Planning

Three defects found while building the contract below. None were known at audit time; all three change the plan.

### F-1 (blocking for "Tất cả tuyến") — the API silently drops route and BCVH identity from every row

`FactBuuGuiRepository.getEvidenceListFacts()` runs `SELECT * FROM fact_f13`, so `ma_tuyen`, `ten_tuyen`, `ma_bcvh`, `ten_bcvh` are all present in the raw result. But `f13DashboardService.getEvidenceList()`'s mapper returns only six fields — `ma_bg`, `thoi_gian_ptc`, `thoi_gian_nop_tien`, `danh_gia_2026`, `do_tre_gio`, `violation_reason` — discarding route and BCVH identity before the response leaves the backend.

Consequence today on `/f13/evidence`: `ShipmentPerformancePage.jsx` maps `routeId: item.ma_tuyen || routeIdParam` and `routeName: item.ten_tuyen || routeName`. Because `item.ma_tuyen` is always `undefined`, every row silently falls back to the URL parameter. In "Tất cả tuyến" mode `routeIdParam` is empty and `routeName` is the literal string "Tất cả tuyến" — so **every shipment in the all-routes view displays "Tất cả tuyến" as its route**, and the search box's route-name matching silently matches nothing. The feature the previous round shipped as its headline capability cannot actually tell the manager which route a violating shipment belongs to.

This must be fixed in the backend contract (Section 3.2) before the merged screen can honour the PO's "Tuyến Ranking leads into Evidence" decision, because the merged screen's whole purpose is per-route accountability.

### F-2 (latent crash) — undefined variable in the Tuyến Ranking selected-route panel

`RoutePerformancePage.jsx:262`: `const failed = toNumber(route.failed ?? row.total_failed);` — `row` does not exist in `RouteSelectedPanel`'s scope. This throws a `ReferenceError` and blanks the panel whenever `route.failed` is null or undefined. It is currently masked only because the backend mapper always populates `failed`. It sits in the exact file and component this plan modifies (the drill-down button), so it is in scope to fix as a one-line correction.

### F-3 (test baseline correction) — the real frontend baseline is 256/269, not the "25/25" previously reported

Previous rounds reported "frontend 25/25 pass". That figure was accurate for the narrow targeted subset actually run, but it is **not** the full-suite figure. Running the complete frontend suite at baseline `e2c32178` gives **256 pass / 13 fail out of 269**.

All 13 failures are proven pre-existing and unrelated to the Evidence delta: `git diff --name-only b83900af HEAD -- frontend/src/features/route/ frontend/src/features/dashboard/ frontend/src/pages/` returns empty, i.e. every directory holding a failing test is untouched since before the Evidence implementation. They cluster in Dashboard tests, Route Ranking tests (`blackReturned`, `dateResolution`, `delayedCash`, `delayedCashWidget`, `routeRankingFilters`), and `dataImportBackfillQueue`.

One of them matters directly here: `RoutePerformancePage.dateResolution.test.js` asserts the drill-down button reads **"Xem bưu gửi vi phạm"**, while the code renders **"Mở chi tiết bưu gửi vi phạm"**. That test is failing today and the button is exactly what this plan rewires — the implementation phase must reconcile label and test deliberately rather than inherit the mismatch.

This plan does not adopt the remaining 12 pre-existing failures as its own scope, but records them so no future round mistakes them for a regression introduced here.

## 3. Task 1 — Data / Context Contract

### 3.1 URL contract: Tuyến Ranking → `/f13/evidence`

The audit flagged that the two screens speak different URL dialects (`date` versus `from_date`/`to_date`). The contract below settles it. **`/f13/evidence` keeps the parameter names it already reads today** — this avoids touching the already-accepted Evidence date-resolution logic and the already-shipped `/f13/ranking/shipment` redirect, and puts the whole translation burden on the link builder that is being rewritten anyway.

| Parameter | Value sent by Tuyến Ranking | Required | Meaning on Evidence |
| --- | --- | --- | --- |
| `from_date` | Tuyến Ranking's resolved `analysisDate` | Yes | Lower bound of the display-only date pair |
| `to_date` | The same `analysisDate` value, repeated | Yes | **Authoritative analysis day** — Evidence resolves `to_date \|\| from_date` |
| `bcvh_id` | `bcvhId` | Yes | BCVH filter, drives the route list |
| `bcvh_name` | `bcvhName` | No (display only) | Label shown before the BCVH list loads |
| `route_id` | `ma_tuyen` of the selected route | No — omitted means "Tất cả tuyến" | Route filter |
| `route_name` | `ten_tuyen` of the selected route | No (display only) | Label shown before the route list loads |
| `reason` | `delayed_cash` (default) or omitted | No | Pre-selected violation group |
| `return_to` | Tuyến Ranking's current query string | No | Powers the "Quay lại Tuyến Ranking" link |

Both `from_date` and `to_date` must be sent with the identical value. Sending only `date` (today's behaviour) is the defect being removed: Evidence never reads `date`, so it would silently fall back to the newest imported day and show a different set of shipments than the row the manager clicked.

The single-day rule is unchanged: one evaluation day (`ngay_do_kiem`) drives the query, resolved by the same shared `resolveDefaultRouteDate` helper Route Ranking, Dashboard and BCVH Ranking already use. The two date inputs remain display-only. No range filtering is introduced.

### 3.2 API contract: `GET /f13/evidence-list`

Unchanged: query parameters (`date`, `bcvh`, `route` optional, `page`, `page_size`, `reason`), the `Không đạt`-only population, the single-day `ngay_do_kiem` predicate, server-side pagination, and `meta.violation_summary` / `meta.pagination`.

**One required additive change (fixes F-1):** the service mapper must also pass through the four identity fields it currently discards — `ma_tuyen`, `ten_tuyen`, `ma_bcvh`, `ten_bcvh`. These already exist in the row the repository returns; nothing new is queried, nothing is recomputed, and no existing field changes shape or meaning. Purely additive, so `RouteViolationEvidencePage.jsx` and every other current consumer keep working unchanged during the transition.

### 3.3 Reconciliation contract (the numbers that must agree)

| Figure | Source of truth | Must equal |
| --- | --- | --- |
| Route's failed count on Tuyến Ranking | `/f13/ranking/route` → `failed` / `total_failed` | Evidence's "Tất cả không đạt" tab count for the same day + BCVH + route |
| Evidence group counts | `meta.violation_summary.{delayed_cash_count, other_failed_count, unknown_count}` | Must sum exactly to `total_failed` |
| Evidence displayed total | `meta.pagination.total_items` | Must equal the number of rows actually reachable in the table |
| "Tất cả tuyến" total | Evidence with `route_id` omitted | Must equal the sum of every individual route's count for that day + BCVH |

These hold by construction — both screens reach the same repository query — provided, and only provided, the day/BCVH/route values arrive intact. That is precisely what the URL contract in 3.1 protects.

The four violation groups are fixed by the backend and must not be re-derived on the client: `Chậm nộp tiền` (slug `delayed_cash`, the `> 3.0h` cash-handover rule), `Không đạt khác` (`other`), `Chưa xác định nguyên nhân` (`unknown`, missing or unparseable timestamps), and `Tất cả không đạt` (`all`). Counts always come from `meta.violation_summary`, never from counting the rows on screen.

## 4. Task 2 — No-Code Wireframe

Regions and behaviour only — not visual design, not implementation-ready markup.

### 4.1 Desktop

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ← Quay lại Tuyến Ranking        Evidence — Chi tiết bưu gửi vi phạm       │
│                                  BCVH Thuận Hóa · Tuyến A · 02/08/2026    │
├──────────────────────────────────────────────────────────────────────────┤
│ CONTEXT / FILTER BAR                                                      │
│  Ngày [__/__/____]   BCVH [▼ real list]   Tuyến [▼ incl. Tất cả tuyến]    │
│  Tìm kiếm [_____________]                                                 │
├──────────────────────────────────────────────────────────────────────────┤
│ SEARCH RESULT SUMMARY  (only rendered while a keyword is active — added   │
│ 2026-08-12, see Section 14)                                                │
│  "Tìm thấy [n bưu gửi] thuộc [m tuyến] cho '[keyword]'"   [Xóa từ khóa]   │
├──────────────────────────────────────────────────────────────────────────┤
│ VIOLATION GROUP TABS  (counts from the server, never counted on screen)   │
│  [ Chậm nộp tiền  N ]* [ Không đạt khác  N ] [ Chưa xác định  N ]          │
│  [ Tất cả không đạt  N ]                          * = default selected     │
├────────────────────────────────────────┬─────────────────────────────────┤
│ VIOLATION TABLE (≈ 2/3 width)          │ EVIDENCE DETAIL (≈ 1/3 width)   │
│                                         │                                 │
│  No active keyword: flat table —        │  Empty until a shipment is      │
│  Mã BG │ Tuyến* │ Lý do │ PTC │ Nộp      │  explicitly chosen:             │
│  tiền │ Độ trễ — click a row to select. │  "Chọn một bưu gửi để xem       │
│                                         │   bằng chứng chi tiết." — never │
│  Active keyword (2026-08-12, Section    │   auto-selected by a keyword    │
│  14): rows regroup by real route        │   search (Section 14, point 1). │
│  ([mã] - [tên tuyến] + count); every    │                                 │
│  matching/near-matching route shown as  │  When chosen:                   │
│  its own group, expandable to the       │   • Mã bưu gửi                  │
│  individual bưu gửi (Section 14, points │   • BCVH · Tuyến · Ngày         │
│  3-4); grouping keyed by real ma_bg/     │   • Kết quả (danh_gia_2026)     │
│  ma_tuyen, never by route-name text      │   • Nhóm vi phạm (badge)        │
│  alone (Section 14, point 9).            │   • Mốc thời gian:              │
│                                         │       PTC → Nộp tiền            │
│  * "Tuyến" column in "Tất cả tuyến"     │   • Độ trễ, and the "> 3.0h"    │
│    mode needs the F-1 backend fix       │     rule stated explicitly when │
│    (already shipped, Phase 1).          │     it is what caused the       │
│                                         │     classification              │
│  ─────────────────────────────────────  │   • Hand-off: "Chuyển sang      │
│  Hiển thị X–Y / TỔNG  ◀ Trước  Sau ▶    │     Action Center" — shown as   │
│  (TỔNG = meta.pagination.total_items;   │     an honest not-yet-available │
│  distinct from the pre-search context   │     state while Action Center   │
│  total — Section 14, point 6)           │     does not exist              │
└────────────────────────────────────────┴─────────────────────────────────┘
```

### 4.2 Mobile

Single column, in this order: context header (collapsible) → group tabs (horizontally scrollable) → violation table reduced to `Mã BG`, `Lý do`, `Độ trễ` → tapping a row opens the evidence detail as a full-screen sheet with a back control returning to the list with scroll position and selection intact. Pagination controls stay directly beneath the table. No horizontal page scroll at any width; the table itself may scroll horizontally inside its own container if columns overflow.

### 4.3 Loading / empty / error

| State | Behaviour |
| --- | --- |
| Loading (first load) | Full-region loading indicator in the table area; context bar stays interactive so the manager can change filters immediately |
| Loading (filter change) | Table area shows loading; current tab counts dim rather than resetting to zero, so no misleading "0" flashes |
| Empty — no violations for this day/BCVH/route | "Không có bưu gửi vi phạm" plus the exact active context, and a suggestion to widen to "Tất cả tuyến". A genuine zero is stated as zero — never as "no data" |
| Empty — group has zero but others do not | Table empty-state within the selected tab; other tabs keep their real counts and stay clickable |
| Error — request failed | Error message plus a retry control; the context bar remains usable; already-loaded rows are not silently left on screen as if current |
| Error — missing/invalid context | Names exactly which of day / BCVH is missing, and offers the return link to Tuyến Ranking |
| Over-ceiling (page-walk safety limit hit) | The existing visible warning banner is kept — the manager is told some rows are not shown and advised to narrow the filter. Never silent truncation |

## 5. Task 3 — Widget Disposition

| Current widget / area | Disposition | Note |
| --- | --- | --- |
| Context / filter bar (date, BCVH, route selector, search) | **KEEP** | Already real; gains the incoming-context handling from 3.1 |
| Violation group tabs (currently only on the old screen) | **MERGE** into `/f13/evidence` | The one capability Evidence lacks today; counts stay server-sourced |
| `ShipmentEvidenceSummary` (the shipment table) | **KEEP + REDESIGN columns** | Add `Lý do vi phạm`; add `Tuyến` in all-routes mode (needs F-1); make it the primary table |
| `ShipmentExecutiveBrief` | **MERGE** into the context header — reaffirmed 2026-08-12, no interim patch | Its four values duplicate the header; no separate card. Its "auto-selects the first matching row/route" behavior (Section 14) is a symptom of this widget's design, not something to fix in place — the widget is already locked for removal as a standalone card, so it is addressed by the Section 14 contract (no auto-selection, explicit selection only) applied to the merged context header/detail panel in Phase 2, never by patching `ShipmentExecutiveBrief.jsx` itself (Section 14, point 10) |
| `ShipmentRootCause` | **REDESIGN** into the evidence-detail panel | Replace canned bullets with real `violation_reason` + timeline + the `> 3.0h` rule statement |
| `ShipmentTimeline` | **MERGE** into the evidence-detail panel | Becomes the PTC → Nộp tiền timeline block, not a standalone card |
| `ShipmentImpactOverview` | **REMOVE** | Two of its three fields echo UI state (search text, row count), not business data |
| `ShipmentRecommendation` | **REMOVE** | Per PO decision 4, and per the frozen Evidence boundary |
| `ShipmentDrilldown` | **REMOVE** | Static text about the architecture itself; no shipment content |
| `ShipmentShellCard`'s "shell / data added later" disclaimer | **REMOVE** | Stale developer copy shown to end users on an accepted screen |
| Old screen `RouteViolationEvidencePage` | **MERGE then REMOVE** | See Section 6 |
| Tuyến Ranking table, KPI cards, selected-route panel | **KEEP unchanged** | Out of scope except the single drill-down button and the F-2 one-liner |

Net effect: seven loosely-related cards collapse into three purposeful regions — context, list, detail.

## 6. Task 4 — Old Screen, Redirect And Bookmarks

`/f13/ranking/route/violations` is `admin`-only today, reachable only from the Tuyến Ranking button, and carries no state of its own. Proposed handling, mirroring the pattern already shipped and PO-accepted for `/f13/ranking/shipment`:

1. **Rewire the source.** Tuyến Ranking's drill-down button targets `/f13/evidence` using the Section 3.1 parameter contract, with `reason=delayed_cash` pre-selected so the manager lands on the same default group the old screen opened on.
2. **Keep the old path as a translating redirect — do not delete it.** `/f13/ranking/route/violations` continues to resolve, converting its old dialect into the new one: `date` → both `from_date` and `to_date`; `bcvh_id`, `bcvh_name`, `route_id`, `route_name`, `reason`, `return_to` pass through unchanged. Any existing bookmark therefore lands on the correct day rather than silently on the newest imported day.
3. **Widen the role on the redirect** to `admin` + `viewer`, matching the destination, so a viewer following an old link is redirected rather than bounced to "unauthorized".
4. **Retire the component** (`RouteViolationEvidencePage.jsx` and its two test files) only in the final phase, once the merged screen has Product Owner runtime acceptance — not before.
5. **Keep the return path working.** `return_to` continues to rebuild the manager's original Tuyến Ranking filters on the way back.

A useful side effect: the old screen's still-unfixed 1,000-row cap disappears with it, since the destination already walks every page.

## 7. Task 5 — Acceptance Criteria

Numbered so a Product Owner check can cite them individually. AC-1 to AC-5 are the reconciliation checks; AC-6 to AC-9 are the date-parameter protections.

| # | Criterion | How to verify |
| --- | --- | --- |
| AC-1 | For any day + BCVH + route, Evidence's "Tất cả không đạt" count equals that route's `Không đạt` figure on Tuyến Ranking | Read both screens side by side; the two numbers must match exactly |
| AC-2 | The three group counts sum exactly to "Tất cả không đạt", with no rounding or leftovers | Add the three tab badges; compare to the fourth |
| AC-3 | "Tất cả tuyến" total equals the sum of every individual route's total for the same day + BCVH | Sum each route's count, compare to the all-routes total |
| AC-4 | The displayed total always equals `meta.pagination.total_items`, and every counted row is reachable through pagination | Page to the last page; last row index must equal the stated total |
| AC-5 | In "Tất cả tuyến" mode every row shows its own real route, and no row displays the literal text "Tất cả tuyến" as its route | Scan the Tuyến column; confirm at least two distinct route names appear (this is the F-1 regression guard) |
| AC-6 | Arriving from Tuyến Ranking lands on the exact day of the clicked row — never the newest imported day | Choose a day that is deliberately *not* the newest, click through, confirm the date shown matches |
| AC-7 | An old bookmark carrying only `date=` lands on that same day after redirect | Open an old `/f13/ranking/route/violations?date=…` URL; confirm the day survives |
| AC-8 | A URL carrying a genuine range (`from_date` ≠ `to_date`) resolves to `to_date`, consistent with Dashboard, BCVH Ranking and Tuyến Ranking | Compare the resolved day against those screens for the same URL |
| AC-9 | Changing BCVH refreshes the route list and clears a route that no longer belongs to it, rather than silently querying an invalid route | Select a route, switch BCVH, confirm the selector returns to "Tất cả tuyến" |
| AC-10 | Both `admin` and `viewer` can open `/f13/evidence` and the redirect; a live login is performed for each role and recorded as evidence | Log in as each role; do not infer from code |
| AC-11 | No visible text contains "shell", "placeholder", or "sẽ được bổ sung ở ticket sau" | Read the rendered screen |
| AC-12 | No Recommendation content appears anywhere on Evidence | Read the rendered screen |
| AC-13 | Empty, loading and error states each render as specified in 4.3, and a genuine zero reads as zero rather than as missing data | Force each state |
| AC-14 | Tuyến Ranking's own table, KPI cards and selected-route panel are visually and numerically unchanged apart from the drill-down button | Compare against the current screen |

AC-10 is stated deliberately: the previous round could not evidence a dual-role login and had to record technical verification instead. This plan treats a real two-role login as a required acceptance item rather than an optional one.

**AC-15 to AC-23 — added 2026-08-12** (Product Owner finding, locked into Phase 2 scope; full evidence and the 10-point source contract: Section 14):

| # | Criterion | How to verify |
| --- | --- | --- |
| AC-15 | Typing a keyword only filters the result set — it never auto-selects a row/route as a "representative" result, and the evidence-detail panel stays empty ("Chọn một bưu gửi...") until the user explicitly clicks one shipment | Type a keyword with multiple matches; confirm the detail panel does not populate until a row is clicked |
| AC-16 | Directly below the filter bar, an active keyword shows the exact line "Tìm thấy [n bưu gửi] thuộc [m tuyến] cho '[keyword]'" | Type a keyword; read the summary line; confirm `n` and `m` match the real result set |
| AC-17 | All matching shipments are shown, grouped by route as `[mã] - [tên tuyến]` + shipment count, each group expandable to the individual bưu gửi | Type a keyword matching multiple routes; confirm every group is visible and expandable |
| AC-18 | Every route whose name matches or nearly matches the keyword appears as its own group — never only the first matching route | Use a keyword known to match ≥2 routes (e.g. "hồng th"); confirm all matching route groups appear, not just one |
| AC-19 | Three counts are visibly distinct and never conflated: total Evidence in the context before search, the count after search, and the currently selected shipment | Apply a keyword; confirm the pre-search total, the post-search count, and the selected-shipment indicator are three separate, correctly-labeled numbers |
| AC-20 | The Tuyến dropdown remains a separate, independent filter from search — search never implicitly restricts results to one route or behaves like a route selector | Use search and the Tuyến dropdown independently and together; confirm neither silently overrides the other |
| AC-21 | Explicit 0/1/n result states exist, a "clear keyword" control is present and works, and behavior is correct on both desktop and mobile | Force each result count; confirm state and control; check both viewport sizes |
| AC-22 | Grouping and reconciliation use real `ma_bg`/`ma_tuyen` values, never route-name text alone — two differently-coded routes must never merge into one group even if their display names are identical or similar | Find or construct a case with similar/duplicate route names on different `ma_tuyen`; confirm they remain separate groups |
| AC-23 | `ShipmentExecutiveBrief.jsx` receives no interim patch for this finding — its disposition remains exactly what Section 5 already locks (MERGE into the context header, not a standalone auto-selecting card) | Confirm no code change was made to `ShipmentExecutiveBrief.jsx` outside the Phase 2 widget-consolidation work itself |

## 8. Task 6 — Architecture Documents Needing Amendment

**None of these were edited.** Each needs separate, explicit Product Owner approval before any change, per the standing rule that frozen documents are not modified by the executor.

| Document | Why it must change | Nature of the amendment |
| --- | --- | --- |
| `docs/02_ARCHITECTURE/EVIDENCE/EVIDENCE_CENTER_INFORMATION_ARCHITECTURE.md` | Section 8 forbids "duplicating Shipment Performance Center" and "bringing Recommendation into Evidence"; the drill-down chain places Evidence Center *after* a separate Shipment Performance Center stage. The approved design merges those two stages into one screen | Redefine Evidence Center as the merged violation-detail stage; collapse the chain to `Dashboard → BCVH → Tuyến → Evidence → Action`; keep the Recommendation prohibition (now satisfied by removal) |
| `docs/02_ARCHITECTURE/EVIDENCE/EVIDENCE_CENTER_SCREEN_ARCHITECTURE.md` | Prescribes eight zones/widgets (Coverage, Scan History, Rule Validation, Supporting Evidence, RCA Evidence, Decision Support) that have no data source in `fact_f13` | Replace the zone list with the three real regions: context/filter, violation list, evidence detail |
| `docs/EVIDENCE_CENTER_WIDGET_SPECIFICATION.md` | Same eight widgets, all marked "Must-have", none implementable against current data | Re-specify against the real widget set; record the retired widgets as "no data source available", not as outstanding debt |
| `docs/02_ARCHITECTURE/SHIPMENT/SHIPMENT_PERFORMANCE_CENTER_*` (2 files) | Describe a standalone Shipment Performance Center stage that this consolidation removes | Mark as superseded by the merged Evidence screen; preserve history rather than deleting |
| `docs/03_UX/evidence/EVIDENCE_CENTER_UX_ARCHITECTURE.md`, `docs/03_UX/shipment/SHIPMENT_PERFORMANCE_CENTER_UX_ARCHITECTURE.md` | UX layers built on the superseded structures | Align with the Section 4 wireframe once approved |
| `docs/SHIPMENT_PERFORMANCE_CENTER_WIDGET_SPECIFICATION.md` | Specifies the widget set being removed/merged | Mark superseded |
| `PROJECT_PROGRESS.md` "Frozen Documents" list | Names several of the above as frozen | Record the controlled amendment and its authorising decision |

`F13-SHIPMENT-001_MANIFEST.md` (deferred, `stash@{0}`) also describes the superseded standalone Shipment screen. It was **not** opened or read in this round and is listed only so the Product Owner knows it will eventually need reconciling.

## 9. Task 7 — Implementation Phases, Test Plan, File Scope

Four phases, each independently verifiable, ordered so nothing user-visible breaks midway.

### Phase 1 — Backend contract (additive only)

Pass `ma_tuyen`, `ten_tuyen`, `ma_bcvh`, `ten_bcvh` through the `getEvidenceList` mapper (fixes F-1). No query change, no new field computed, no existing field altered.

- Files: `backend/src/services/f13DashboardService.js`; tests in `backend/src/services/F13DashboardService.evidenceList.test.js`.
- Verify: new tests asserting the four fields survive for both single-route and all-routes calls; existing 16 targeted backend tests still pass; both current consumers unaffected.

### Phase 2 — Evidence screen rebuild

Add violation group tabs and the `Lý do vi phạm` column; add the conditional `Tuyến` column; build the evidence-detail panel; remove Impact Overview, Recommendation and Drilldown; merge Executive Brief into the header and Timeline into the detail panel; delete the stale shell disclaimer; implement the 4.3 states.

- Files: `frontend/src/features/shipment/ShipmentPerformancePage.jsx`; `frontend/src/features/shipment/shipmentPerformanceData.js`; delete `ShipmentImpactOverview.jsx`, `ShipmentRecommendation.jsx`, `ShipmentDrilldown.jsx`; rework `ShipmentEvidenceSummary.jsx`, `ShipmentRootCause.jsx`, `ShipmentTimeline.jsx`, `ShipmentExecutiveBrief.jsx`, `ShipmentShellShared.jsx`; reuse the existing group-tab logic from `routeViolationEvidenceData.js` rather than rewriting it.
- Verify: unit tests for tab-count binding, the conditional Tuyến column, and each of the 4.3 states; lint; build.

### Phase 3 — Rewire Tuyến Ranking and redirect the old path

Point the drill-down button at `/f13/evidence` with the 3.1 contract; convert `/f13/ranking/route/violations` into a translating redirect at `admin` + `viewer`; fix F-2; reconcile the button label with its currently-failing test.

- Files: `frontend/src/features/route/routeViolationEvidenceData.js` (link builder + a new parameter translator), `frontend/src/features/route/RoutePerformancePage.jsx` (button target, F-2 one-liner), `frontend/src/App.jsx` (redirect route), and the affected tests `routeViolationEvidenceData.test.js`, `RoutePerformancePage.dateResolution.test.js`, `App.role-routing.test.js`.
- Verify: link-builder tests proving `from_date` and `to_date` are both emitted with the same value; redirect tests proving `date` is translated, not dropped; F-2 covered by a test exercising a null `failed`.

### Phase 4 — Retire the old component, then Product Owner acceptance

Remove `RouteViolationEvidencePage.jsx` and its two test files once the merged screen is accepted; keep the redirect permanently.

- Verify: full frontend suite; confirm the count of failures has not risen above the 13 pre-existing ones from F-3; Product Owner runtime check against AC-1 to AC-14, including a real dual-role login for AC-10.

### Test plan summary

- **Backend**: extend `F13DashboardService.evidenceList.test.js` for the pass-through fields; re-run the 16-test targeted suite and the 111-test sweep, expecting the same 4 pre-existing failures and no new ones.
- **Frontend**: new unit tests for the link contract, redirect translation, tab-count binding, conditional Tuyến column, and the F-2 guard; re-run the full 269-test suite and compare against the 13 known pre-existing failures.
- **Runtime**: AC-1 to AC-14, performed by the Product Owner or Antigravity, with a real `admin` login and a real `viewer` login recorded separately.

### Files not to be touched

`DashboardPage.jsx`, `BcvhRankingPage.jsx`, the Tuyến Ranking table/KPI/panel logic beyond the two specified edits, every `NETWORK-MANAGEMENT` file, `Data QLML/`, both stashes, `frontend/src/auth/roles.js`, and all frozen architecture documents.

## 10. Risks And Open Questions

| # | Item | Recommendation |
| --- | --- | --- |
| R-1 | Frozen-document amendment (Section 8) is a prerequisite for Phase 2 being formally compliant, not merely tidy | Approve the amendment list before Phase 2 starts, or accept a recorded, time-boxed deviation |
| R-2 | The 13 pre-existing frontend failures (F-3) sit partly in the files Phase 3 edits, making "no new failures" harder to read | Fix the one directly-affected test in Phase 3; leave the other 12 explicitly out of scope |
| R-3 | Removing three widgets is visible to anyone who saw the accepted screen | Covered by AC-11/AC-12 and called out in the Phase 4 acceptance notes |
| OQ-1 | Should the merged screen keep the page title "Evidence — Chi tiết bưu gửi", or adopt the old screen's "Chi tiết Bưu gửi vi phạm theo tuyến"? | Recommend the former; it is already the accepted canonical name |
| OQ-2 | Should `reason=delayed_cash` be pre-selected on arrival from Tuyến Ranking, matching today's old-screen behaviour? | Recommend yes; it preserves the accepted default |
| OQ-3 | Action Center does not exist. Confirm the hand-off shows an honest unavailable state rather than a disabled button with no explanation | Recommend an explicit "chưa khả dụng" state |

## 11. Scope Discipline

Planning only. No product code, route, component, schema, database, or frozen document was changed — `git status` shows documentation files only. `F13-SHIPMENT-001` (`stash@{0}`) was not opened; `stash@{1}` untouched; Dashboard, BCVH Ranking, `Data QLML/` and all `NETWORK-MANAGEMENT` scope untouched and unexpanded; `.claude/` not committed. The `2026-08-11` `PO RUNTIME CHECK PASS` closure is not reopened or amended — this plan builds forward from it.

## 12. Phase 1 Implementation Record (2026-08-11)

Product Owner approved this plan and authorized Phase 1 only. Implemented at commit `b147df7c` (plan approved at `34f42c57`); status `PHASE 1 IMPLEMENTED / READY FOR PO CHECK`.

### What changed

`backend/src/services/f13DashboardService.js` — `getEvidenceList()`'s row mapper now additionally returns `ma_tuyen`, `ten_tuyen`, `ma_bcvh`, `ten_bcvh` (fixes F-1). `FactBuuGuiRepository.getEvidenceListFacts()`'s `SELECT *` already returned these four fields; the mapper was the only place discarding them. No query changed, no existing field's meaning changed, no query predicate changed.

**No frontend file was touched.** Direct code read confirmed `ShipmentPerformancePage.jsx`'s row mapping (`routeId: item.ma_tuyen || routeIdParam`, `routeName: item.ten_tuyen || routeName`, and the equivalent for `bcvhId`/`bcvhName`) already prefers a real API value over its own URL-parameter fallback via `||` — once the backend stopped discarding the fields, the existing frontend wiring started displaying and searching real per-row routes with zero additional change. This was verified by reasoning over the existing code, not by a runtime session (no credential is available in this workspace, per the precedent already recorded for the prior Evidence rounds).

### Data/context contract — now locked with passing tests, not just a plan-only assertion

Unchanged from Section 3 above, confirmed correct: single-day `ngay_do_kiem`; BCVH and Tuyến now returned per row (previously discarded); `violation_reason` proven to be a true partition of the failed set (mutually exclusive, exhaustive over `ma_bg`) rather than assumed from the numeric sum; `meta.violation_summary`/`meta.pagination.total_items` proven equal to the unique-`ma_bg`-set sizes.

### Tests added (`F13DashboardService.evidenceList.test.js`)

1. Route/BCVH pass-through for a single-route request.
2. Route/BCVH pass-through in "Tất cả tuyến" mode (route omitted) — asserts two different rows resolve two different, correct routes, directly guarding against the exact reported defect (every row previously collapsed onto one fallback value).
3. `violation_reason` classification proven to be a true partition: union of the three groups' unique `ma_bg` sets equals the full failed set; no `ma_bg` counted twice; only then is the numeric summary sum asserted — implementing the Product Owner's exact reconciliation instruction rather than assuming AC-2 held.
4. `violation_reason` classification proven to always return exactly one of the three known labels, exercised across every timestamp-presence/parseability combination the classifier can encounter.

### Validation

- Targeted evidence-list suite (service + repository): **20/20 pass**.
- Full backend sweep: **111/115 pass** — the same 4 pre-existing failures already on record (`DashboardController.recovery.test.js` live-KPI-database tests ×3, `timelineService.recovery.test.js` monthly-rank test ×1), unrelated to this change.
- Full frontend sweep, re-run to confirm no incidental regression despite zero frontend files touched: **256/269 pass**, identical to the F-3 baseline in Section 2 — this is the true full-suite figure, reported honestly rather than as a narrowed "25/25"-style subset.
- Backend has no lint script; no frontend file changed, so `oxlint`/`vite build` were not re-run.

### Decisions received this round, locked for Phase 2/3 (not implemented now)

- Screen name: **"Evidence — Chi tiết bưu gửi vi phạm"**.
- Arriving from Tuyến Ranking keeps the exact violation group clicked; clicking the total `Không đạt` figure opens "Tất cả không đạt".
- No Action Center button until a real hand-off flow exists.
- Frozen-document amendment (Section 8) approved in principle; requires its own separate governance delta before Phase 2, not mixed into any implementation commit.

### Scope discipline for this round

Backend-only, additive-only. No Phase 2-4 work performed. No frozen document edited. `F13-SHIPMENT-001` not opened; Dashboard, BCVH Ranking, `Data QLML/`, and every `NETWORK-MANAGEMENT` file untouched; `.claude/` and both stashes confirmed untouched.

## 13. Phase 1 Remediation — PO Runtime Evidence (2026-08-11)

Product Owner ran Phase 1 and reported 2 additional defects, both frontend-only, still within Phase 1 scope (no Phase 2-4 work, no widget consolidation, no frozen document).

### DEFECT A — Vietnamese IME input corrupts the search box

**Root cause, traced through the actual event flow** (`onChange` → `setSearchParams` → React Router navigation → full page re-render → widget tree re-render): the search `<input>` inside the shared `GlobalFilterBar` component (used by Dashboard, BCVH Ranking, Route Ranking, and Evidence) was fully controlled straight off the URL — every keystroke's `onChange` synchronously called `setSearchParams`, which is a router navigation that re-renders the whole page tree on every character. When typing Vietnamese via an IME (UniKey/EVKey, Telex/VNI), that heavy synchronous re-render could land mid-composition (`compositionstart`..`compositionend`), corrupting or dropping characters — e.g. "phía" becoming "pịa". The input had no `compositionstart`/`compositionend` handlers at all, so React had no way to know a composition was even in progress.

**Fix, in the shared component** (not duplicated per-consumer, since the `<input>` DOM element only exists in one place): new pure module `frontend/src/components/shared/searchCommitController.js` — a composition-aware, debounced commit controller. Contract: while composing, `onCommit` is never called (an in-progress composed sequence is never treated as a finished search term, never triggers a URL update); `compositionend` commits the final composed value immediately, no extra delay; outside composition, commits are debounced (300ms) so a burst of keystrokes coalesces into one trailing commit instead of one URL update per character. `SharedLayout.jsx`'s `GlobalFilterBar` search field now uses a local, uncontrolled-while-typing `<input>` wired to this controller via `onCompositionStart`/`onCompositionEnd`/`onChange`, syncing from the external `searchValue` prop only when not actively composing (so an external reset, e.g. a future "Xóa từ khóa" action, still works, but never stomps on an in-progress composition) and disposing its pending timer on unmount.

Diacritic-insensitive search was also added (Product Owner: "hỗ trợ tìm tên tuyến có dấu; nếu contract hiện hành cho phép, bổ sung tìm không dấu nhưng không làm sai tìm kiếm mã tuyến"): `frontend/src/features/shipment/shipmentPerformanceData.js` gained `stripVietnameseDiacritics()` and `matchesSearchQuery()` — matching tries an exact (with-diacritics) substring first (this alone already covers route codes, which are digits with no diacritics, and correctly-typed Vietnamese names), then falls back to a diacritic-stripped comparison. This only ever widens matching; it never narrows or alters it, so route-code search cannot be broken by it. `ShipmentPerformancePage.jsx`'s `filteredRows` now calls `matchesSearchQuery()` instead of a raw `.includes()` check.

**Tests** (regression coverage for IME, paste, delete, fast typing, exactly as instructed):

- `searchCommitController.test.js` (8 tests, pure logic, deterministic fake scheduler — no real waiting): intermediate composition states never commit; `compositionend` commits the final value immediately; typing resumes normal debounce after composition; a burst of plain keystrokes (fast typing) coalesces into exactly one trailing commit; a single paste event debounces and commits normally; delete/backspace keystrokes debounce to the final (possibly empty) value; `dispose()` cancels a pending timer; `isComposing()` reflects state correctly.
- `shipmentPerformanceData.test.js` (+7 tests): diacritic stripping correctness; exact-diacritics match; diacritic-insensitive fallback match; route-code search is never broken by the diacritic path; empty/whitespace query matches everything; no-match returns false; null/undefined/empty fields are skipped safely.
- `SharedLayout.searchInput.test.js` (4 new tests, source-level regression guards — this repository has no React rendering/jsdom harness): composition handlers present; wired through the shared controller; disposes on unmount; the old raw `onChange={(e) => onSearchChange?.(e.target.value)}` pattern (the exact defect) no longer exists anywhere in the file.

### DEFECT B — Empty state did not distinguish "no violations" from "no match"

**Verification performed before any code change**, per explicit instruction to re-confirm the prior "PO RUNTIME FAIL" reading: a direct, read-only query against the real operational database (`backend/src/db/database.sqlite`, `OPEN_READONLY`) for `ma_bcvh='535790'` (BCVH A Lưới), `ngay_do_kiem='2026-08-10'`, grouped by route and result. Ground truth for Tuyến `53579015` ("535790 - Hương Phong"): **exactly 2 real shipments that day, both `danh_gia_2026='Đạt'`, zero `'Không đạt'`.** Conclusion: **the filter is correct — this route genuinely had no failing shipments that day.** The reported "empty state" was real data, not a filter defect; only the empty-state messaging needed remediation, exactly as the Product Owner's own contingency instruction anticipated ("Nếu không có Evidence: filter đúng, sửa empty-state và ghi lại kết luận").

**Dropdown contract verified** (Product Owner instruction: "không tự kết luận phải loại tuyến khỏi dropdown"): traced `backend/src/repositories/FactBuuGuiRepository.js`'s `getRouteRanking()` — the route dropdown is populated from `fact_f13 GROUP BY ma_tuyen WHERE ngay_do_kiem = ? AND ma_bcvh = ? AND ma_tuyen IS NOT NULL ...`, i.e. a route only appears if it has at least one real `fact_f13` row for that exact date+BCVH. A route with literally zero shipments that day cannot appear at all (there is nothing to group). Confirmed: Tuyến 53579015 appearing in the dropdown for 2026-08-10 is therefore evidence of real operational activity that day (the 2 "Đạt" rows above), not a defect to fix by filtering the route out of the dropdown. No change was made to the dropdown population logic — it is already correct by construction, and the finding is recorded here rather than inferred as a needed fix.

**Cross-check against "Tất cả tuyến" by real route code**: the same `ma_tuyen='53579015'` value is used consistently by both the per-route query (`route_id=53579015` sent to `/f13/evidence-list`) and the "Tất cả tuyến" aggregate (route omitted, every row carrying its own real `ma_tuyen` per the Phase 1 F-1 fix) — both draw from the identical `fact_f13` predicate, so the two views cannot disagree for the same date/BCVH/route by construction.

**Fix**: `ShipmentPerformancePage.jsx`'s empty state, previously one generic message ("Không tìm thấy bưu gửi... Hãy đổi bộ lọc hoặc chọn 'Tất cả tuyến'." — shown unconditionally, even while already viewing "Tất cả tuyến") is now `emptyStateContent`, computed with exactly 3 distinguished branches, checked in this priority order per explicit instruction ("Có keyword thì empty state phải ưu tiên giải thích do keyword"):
1. **A keyword is active and matched nothing** → *"Không tìm thấy kết quả phù hợp với từ khóa '[từ khóa]'."*, with a real "Xóa từ khóa" action button. Checked first regardless of route selection.
2. **No keyword, a specific Tuyến is selected, zero rows returned** → *"Tuyến [mã] - [tên] không có bưu gửi vi phạm"* plus the current ngày/BCVH, explicitly stating this is a real result, not a filter error, with a real "Xem Tất cả tuyến" action button.
3. **No keyword, "Tất cả tuyến" selected, zero rows across every route** → *"Không có Evidence trong bối cảnh này"* plus ngày/BCVH — no "chọn Tất cả tuyến" suggestion, since that state is already active.

Loading and API/load-error states were already separately handled (`status === 'loading'` / `status === 'error'` branches, unchanged) and are unaffected by this remediation.

**Tests**: `ShipmentPerformancePage.remediation.test.js` (5 new tests, source-level — no render harness available): the three distinct messages are all present; the old unconditional "chọn 'Tất cả tuyến'" text is confirmed gone; both real action handlers/buttons exist; the keyword branch is confirmed to be checked before the route branch in source order (priority requirement).

### Validation

- Full frontend sweep: **280/293 pass** (24 new tests, all passing; the same 13 pre-existing failures already on record — unchanged file set, confirmed via `git status` showing zero backend files touched this round — remain unrelated and unchanged in count/identity).
- `oxlint`: clean on all 8 changed/new frontend files.
- Backend sanity re-run (no backend file touched this round): **111/115**, identical to the Phase 1 baseline — confirms no incidental regression.

### Scope discipline

Frontend-only. No widget consolidation (Phase 2), no frozen document, no Phase 2-4 work. `F13-SHIPMENT-001` not opened; Dashboard, BCVH Ranking, `Data QLML/`, `NETWORK-MANAGEMENT` untouched (the shared `GlobalFilterBar` fix changes search-input *correctness* for those screens' existing search boxes, not any feature/behavior — no new scope was added to those screens). `.claude/` and both stashes confirmed untouched. The direct database query performed for DEFECT B's verification was read-only (`OPEN_READONLY`) against the existing production file; no row was inserted, updated, or deleted.

Governance state: `PO PHASE 1 REMEDIATION RECHECK PASS / CLOSURE PAUSED` (corrected 2026-08-13 per PO instruction — the Product Owner ran this remediation and passed it; formal Phase 1 closure itself remains paused pending the date-filter finding below, not because this remediation is unresolved).

## 14. PO Finding — Search Result Presentation Ambiguity, Locked Into Phase 2 (2026-08-12)

- Status: `FINDING LOCKED INTO PHASE 2 SCOPE / NOT IMPLEMENTED`
- Authority: Product Owner finding (chat, `2026-08-12`), explicitly scoped as **documentation only** — updates the Phase 2 finding/acceptance-criteria record; **no implementation performed**, and Phase 2 remains blocked on its own prerequisite (the frozen-document governance delta, Section 8) regardless of this addition.

### Product Owner finding

Search now filters the correct data (DEFECT A/B from the `2026-08-11` remediation are not reopened by this), but the *presentation* of a keyword search misleads the reader. Evidence given:

- Keyword "hồng th" matched 9 runtime rows.
- `ShipmentExecutiveBrief` (already locked `MERGE`, Section 5) auto-displays the first matching shipment and its route as if representative of the whole result.
- When multiple routes have names matching the keyword, the other matching routes are never shown to the user.
- The "Evidence Runtime" KPI card kept showing `30` — "toàn bộ tập kết quả" (the pre-search context total) — while the actual 9 filtered results live inside a different widget, with no results list rendered near the search box itself.

Net effect: a manager cannot tell, from the search box alone, how many shipments matched, across how many routes, or see anything beyond the one auto-picked example.

### Locked Phase 2 contract (verbatim intent, 10 points)

1. Typing a keyword only filters the result set; it must never auto-select a row as a "representative" shipment.
2. Directly below the filter, show: *"Tìm thấy [n bưu gửi] thuộc [m tuyến] cho '[keyword]'."*
3. Show all matching results, grouped by route first: `[mã] - [tên tuyến]` + shipment count; each group expandable to the individual bưu gửi.
4. Every route with a matching or near-matching name must appear — not only the first one.
5. The detail panel updates only after the user explicitly selects one shipment.
6. Clearly distinguish: total Evidence in context before search; result count after search; the currently selected shipment.
7. The Tuyến dropdown remains its own, independent filter — search must not become a de facto route dropdown.
8. Explicit 0/1/n result states, a clear-keyword control, and correct desktop/mobile behavior are all required.
9. Reconcile/group results by real `ma_bg`/`ma_tuyen` — never by route-name text alone.
10. Do not patch `ShipmentExecutiveBrief` further if this widget is already locked for removal/merge in Phase 2.

### What this updates

- **Section 4 (wireframe)**: a "SEARCH RESULT SUMMARY" region added below the filter bar; the violation table's active-keyword state now groups by real route (`[mã] - [tên tuyến]` + count, expandable), replacing the flat table only while a keyword is active; the evidence-detail panel note now states explicitly it is never auto-selected by search; the table footer note now distinguishes the post-search total from the pre-search context total.
- **Section 5 (widget disposition)**: `ShipmentExecutiveBrief`'s row reaffirmed — its auto-selection symptom is addressed by applying this contract to the Phase 2 merged context header, never by an interim patch to the widget itself.
- **Section 7 (acceptance criteria)**: AC-15 through AC-23 added, one per contract point (points 1 and 5 share AC-15, since both describe "no auto-selection").

### Scope discipline

Documentation only. No product code, route, component, schema, or frozen document was changed. This finding does not reopen or amend the `2026-08-11` Phase 1 / Phase 1 remediation closures — it adds new, later-discovered scope directly into the not-yet-started Phase 2, which remains blocked on the frozen-document governance delta (Section 8) regardless of this addition. `F13-SHIPMENT-001` not opened; Dashboard, BCVH Ranking, `Data QLML/`, `NETWORK-MANAGEMENT` untouched; `.claude/` and both stashes confirmed untouched.

## 15. Session Continuity Checkpoint — Work Paused For Date-Filter Diagnosis (2026-08-12)

Written before a context compaction, per explicit instruction — not a governance state change, no new PO decision, no closure. Purely a continuity record so a fresh session can resume exactly here.

- **Branch / HEAD**: `codex/da-impl-006` at `7215bcb0` (matches `origin/codex/da-impl-006`; this checkpoint edit itself is uncommitted at time of writing — see "Files currently changed" below).
- **Ticket / state**: `F13-STANDARDIZATION-001` (existing program group). Live state remains exactly as recorded in Section 14 / manifest Section 24: Evidence Consolidation Phase 1 Remediation is `IMPLEMENTED / READY FOR PO RECHECK` (commit `d6cd022d`); the search-result-presentation finding is `FINDING LOCKED INTO PHASE 2 SCOPE / NOT IMPLEMENTED`. Neither changed in this session. *(Correction, 2026-08-13: the Product Owner has since passed this recheck — see Section 16. The status line above is kept as written at the time for an accurate continuity record; it is superseded, not edited in place.)*
- **PO decision on the date-filter finding**: **none yet.** A bounded, read-only diagnosis was performed and reported in chat (not yet written to a governance document) confirming: `DashboardController.getBcvh` requires `from_date` but silently discards it before querying; both `getBcvhRanking` and `getBcvhOperationMetricsByDate` query `WHERE ngay_do_kiem = ?` (single exact day, `to_date` only), never a range. Live evidence (BCVH Thuận Hóa `533140`): `to_date=2026-08-11` alone and `from_date=2026-08-01/to_date=2026-08-11` both return the identical `{sl_bg_ptc:1820, dat:753, khong_dat:986}`; a true `BETWEEN` range aggregate would be `{18895, 10179, 7841}`. Operation Dashboard's "Bảng điều hành BCVH" table is affected and internally contradicts its own page's correctly-ranged KPI cards (`/f13/dashboard/kpi` genuinely uses `ngay_do_kiem >= ? AND <= ?`). BCVH Ranking hits the same defective endpoint but is UI-self-consistent (single-day labeled throughout, no visible contradiction). Tuyến Ranking, Evidence, Pareto/RCA: not affected / not applicable. **Awaiting Product Owner direction**: fix `from_date` to genuinely range-aggregate, or remove the misleading date-range UI in favor of an explicit single-day contract — this is a product decision, not decided here.
- **Remediation scope authorized**: **none.** Diagnosis was explicitly bounded to read-only; no code, schema, or document fix was authorized or performed.
- **Work done this session**: (1) Evidence Consolidation Phase 1 Remediation implemented and pushed (`d6cd022d`, `338a6af5`) — IME-safe debounced search commit controller, diacritic-insensitive search fallback, 3-branch empty state; ground-truth-verified via a direct read-only DB query. (2) A new PO finding (search-result presentation) was recorded and locked into Phase 2 scope, documentation-only, pushed (`7215bcb0`). (3) On explicit "STOP" instruction: Phase 1 closure, the 8-frozen-document governance delta, and all Phase 2 work were paused with zero uncommitted changes at the time (`git status` was clean). (4) A bounded read-only date-filter cross-module diagnosis was performed and reported in chat (Section 15 here is the first written record of it).
- **Work not done**: no remediation for the date-filter finding (no PO decision yet); Phase 2 implementation not started (blocked on both the frozen-document governance delta and, now, this new finding); the frozen-document governance delta itself not started (requires separate explicit PO approval per the standing instruction, plan Section 8).
- **Files currently changed (uncommitted)**: only this file, `docs/06_REVIEWS/Shared/F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md` (adding this Section 15 and its Table-of-Contents entry). No other file is modified — confirmed via `git status --porcelain` immediately before this edit (clean except the always-untracked `.claude/` and `Data QLML/`). **Not committed, not pushed**, per explicit instruction not to commit incomplete work.
- **Tests run this session**: none — this session was diagnosis-only (direct read-only SQLite queries via Node, not the project's automated test suites). The last recorded automated-test state remains the Phase 1 Remediation validation already committed: frontend full sweep 280/293 (13 pre-existing failures, unchanged), backend sanity 111/115 (unchanged), `oxlint` clean.
- **Blocker**: Product Owner decision on the date-filter finding's remediation direction (fix `from_date` vs remove the misleading range UI). Everything downstream (Phase 1 closure, the frozen-document delta, Phase 2) stays paused until instructed to resume, independent of this blocker resolving.
- **Next step**: on resuming, either (a) receive and record the Product Owner's date-filter decision and scope its remediation as its own bounded delta, keeping it separate from Phase 1/Phase 2, or (b) receive explicit instruction to resume Phase 1 closure / the frozen-document delta / Phase 2 while the date-filter finding remains a separately tracked, not-yet-actioned item.
- **Explicitly confirmed still paused**: Phase 1 closure (Evidence Consolidation) — paused, not closed. The 8-frozen-document governance delta — paused, not started. All Phase 2 implementation — paused, not started.
- **Explicitly confirmed untouched**: `.claude/` (still untracked, not committed). Both stashes present and unchanged — `stash@{0}` (`F13-SHIPMENT-001`, deferred), `stash@{1}` (pre-existing HTML maps).

## 16. Date-Filter Remediation — PO-Authorized Bounded Fix (2026-08-13)

- Status: `DATE-FILTER REMEDIATION IMPLEMENTED / READY FOR PO RECHECK`
- Authority: Product Owner product decision (chat, `2026-08-13`), "PO PRODUCT DECISION — AUTHORIZE BOUNDED DATE-FILTER REMEDIATION", accepting the diagnosis recorded in Section 15 and locking a 3-point contract + explicit bounded remediation scope.

### Contract (as locked by the PO)

1. Operation Dashboard is a range screen: "Bảng điều hành BCVH" must genuinely aggregate `ngay_do_kiem BETWEEN from_date AND to_date`, both bounds inclusive.
2. BCVH Ranking keeps its single-evaluation-day contract — never becomes a multi-day cumulative ranking; its request must visibly carry `from_date === to_date`.
3. Tuyến Ranking and Evidence stay single-day, unmodified.

### Root cause (confirmed, unchanged from Section 15)

`DashboardController.getBcvh` required `from_date` at the validation layer but never passed it past that point — `f13DashboardService.getBcvhRanking(to_date, ...)` and `FactBuuGuiRepository.getBcvhRanking(date, ...)` / `getBcvhOperationMetricsByDate(date)` / `getFactByDate(date)` were all single-exact-day queries (`ngay_do_kiem = ?`). `from_date` was accepted, validated as present, then silently discarded.

### What changed

**No branching on caller/page identity anywhere** — the fix is purely parameter-driven, per the PO's explicit "Không tạo branching dựa trên tên trang hoặc logic ngầm":

- [`backend/src/controllers/DashboardController.js`](../../../backend/src/controllers/DashboardController.js) — `getBcvh()` now passes both `from_date` and `to_date` through to the service (previously only `to_date`), and validates `from_date <= to_date` before querying (`400 INVALID_RANGE` otherwise, mirroring the existing `getDailyTrend` pattern).
- [`backend/src/services/f13DashboardService.js`](../../../backend/src/services/f13DashboardService.js) — `getBcvhRanking(fromDate, toDate, page, pageSize, sort, order)` (was `getBcvhRanking(date, ...)`): validates ISO format and `fromDate <= toDate` (throws `INVALID_DATE`/`INVALID_RANGE`, now propagated instead of swallowed); `currentMetrics` and `currentFacts` (the figures that actually populate the BCVH table's `sl_bg_ptc`/`Đạt`/`Không đạt`/F13.302/route-distribution columns) now source from the new range-aware repository calls below instead of single-day ones; `effectiveDate` (used for D-1/D-7 comparisons and month-to-date, which the PO did not ask to change) stays anchored to `toDate`, unchanged in meaning; `meta.date_range: { from_date, to_date, single_day }` added so both the API contract and the tests below can assert the actual bounds a response was computed over.
- [`backend/src/repositories/FactBuuGuiRepository.js`](../../../backend/src/repositories/FactBuuGuiRepository.js) — `getBcvhRanking(fromDate, toDate, ...)`'s SQL changed from `WHERE ngay_do_kiem = ?` to `WHERE ngay_do_kiem BETWEEN ? AND ?` (both count and data queries); new `getFactBetween(fromDate, toDate)` added as the range counterpart of the existing `getFactByDate(date)`, same `SELECT * ... BETWEEN` shape, used for the per-BCVH F13.302/route-distribution figures. The pre-existing `getBcvhOperationMetricsBetween(startDate, endDate)` (previously used only for month-to-date) is reused for the requested-period aggregate — no new SQL shape was needed there.
- [`frontend/src/features/ranking/BcvhRankingPage.jsx`](../../../frontend/src/features/ranking/BcvhRankingPage.jsx) — the `/f13/ranking/bcvh` request now sends `from_date: toDate, to_date: toDate` (previously `from_date: fromDate, to_date: toDate`), so the request explicitly carries the single-day contract regardless of what the two independent date pickers hold. This is a no-op on displayed data: `to_date` was already the only value the backend ever honoured before this fix, so runtime behaviour for this screen is unchanged — only the request itself now states the contract explicitly, as required now that the shared endpoint genuinely honours a range for other callers. The two date pickers themselves (`onFromDateChange`/`onToDateChange`) were not touched.

Nothing else was touched: `getBcvhOperationMetricsByDate` (still used for D-1/D-7), Tuyến Ranking, Evidence, Pareto/RCA, and every other `/f13/ranking/bcvh` call site were confirmed unaffected by direct code trace before implementation (Operation Dashboard's `BcvhOperationTable.jsx` already sent a genuine range and needed no change; `UnifiedBcvhAnalysisTable.jsx`'s own internal fetch is dead code in its only real usage, inside `BcvhRankingPage`, which always supplies `prefetchedData` and short-circuits it; `kpiController.getBcvhRanking` is unregistered dead code, confirmed via `f13Routes.js` — not touched).

### Numeric reconciliation (PO evidence, reproduced against the live database with the fixed code, not mocked)

BCVH Thuận Hóa (`533140`):

| Query | `sl_bg_ptc` | `Đạt` | `Không đạt` |
| --- | --- | --- | --- |
| Single day `2026-08-11` (`from_date=to_date=2026-08-11`) | 1,820 | 753 | 986 |
| Range `2026-08-01`..`2026-08-11` | 18,895 | 10,179 | 7,841 |

Both rows reproduce the PO's own reported figures exactly, run live against `database.sqlite` through the actual fixed `DashboardController`/service/repository chain (`node -e` ad hoc script, not a stub).

**The 81-count gap on `2026-08-11`** (`1820 - 753 - 986 = 81`) was verified by a direct read-only query before concluding anything: `SELECT danh_gia_2026, COUNT(*) FROM fact_f13 WHERE ma_bcvh='533140' AND ngay_do_kiem='2026-08-11' GROUP BY danh_gia_2026` returns exactly `{Đạt: 753, Không đạt: 986, NULL: 81}` — the 81 are rows where `danh_gia_2026 IS NULL`. This is the same pre-existing unclassified/BLACK-style category already modeled elsewhere in this codebase (`getDashboardKpi`'s `total_unknown = total_bg - total_passed - total_failed`; Evidence's `Chưa xác định nguyên nhân` violation-reason group for facts missing a usable result). Per the PO's own instruction not to alter the metric/formula when the gap is a valid existing category, **no formula was changed** — `sl_bg_ptc`, `dat_kpi_2026`, and `khong_dat_kpi_2026` all continue to mean exactly what they meant before this fix; only the date window they aggregate over changed.

### Required test scenarios (PO's 7-point list) — all covered, all passing

New file [`backend/src/controllers/DashboardController.dateFilterRemediation.test.js`](../../../backend/src/controllers/DashboardController.dateFilterRemediation.test.js) (9 tests, numbered to the PO's list):

1. Single day (`from_date === to_date`) resolves to a single-evaluation-day request, `meta.date_range.single_day === true`.
2. Range `2026-08-01`..`2026-08-11`: both dates forwarded to the service unchanged, `single_day === false`.
3. Only `from_date` changes (`to_date` held constant) — verified as an independent parameter.
4. Only `to_date` changes (`from_date` held constant) — verified as an independent parameter.
5. BCVH Ranking's own single-day contract — covered separately, see below (frontend).
6. Reversed/invalid range (`from_date > to_date`): rejected `400 INVALID_RANGE` at the controller **before** the service is called (test 6), and independently rejected at the service layer too (test 6b, defence in depth).
7. Repository issues a genuine `BETWEEN ? AND ?` query with both inclusive bounds as the first two params (test 7, mocked `db.get`/`db.all`, asserts on the actual SQL string and param order — not just the returned data); a single-day call collapses to the same query with both bounds equal (test 7b); and a service-level test (7c) proves the Dashboard table no longer collapses a genuine range onto to_date-only figures, reproducing the PO's own `1820→18895` / `753→10179` / `986→7841` evidence with mocked repo data.

New file [`frontend/src/features/ranking/BcvhRankingPage.singleDayContract.test.js`](../../../frontend/src/features/ranking/BcvhRankingPage.singleDayContract.test.js) (3 tests, source-level — this repository has no React rendering/jsdom harness) covers point 5: the request always sends `from_date: toDate` (not the independently-derived `fromDate`), and the two date pickers remain unchanged.

### Validation

- New dedicated test file: **9/9 pass**.
- `backend/src/services/F13DashboardService.recovery.test.js`: 9 pre-existing BCVH-ranking tests updated for the new `(fromDate, toDate, ...)` signature (mock data moved from `getBcvhOperationMetricsByDate`/`getFactByDate` to `getBcvhOperationMetricsBetween`/`getFactBetween` for the current-period figures, keeping D-1/D-7/month-to-date stubs unchanged) — **23/23 pass**.
- Full backend sweep: **209/213 pass** — true baseline established by temporarily removing this round's two new test files and stashing all tracked changes (not merely diffing against memory): **200/204 pass, 4 fail** at baseline, same 4 failures by name after the fix (`live KPI database and HTTP payloads stay aligned for canonical BCVH scope`, `dashboard KPI invalid code returns HTTP 400`, `KPI all and missing ma_bcvh normalize to aggregate null and never pass all to SQL`, `monthly rank enrichment uses full prior months and latest-data current month without BCVH scope`) — all four confirmed pre-existing and unrelated to this change (reproduced identically on the unmodified baseline). Net: `+9` new tests, `0` regressions.
- Full frontend sweep: **283/296 pass** — same baseline method: **280/293 pass, 13 fail** at baseline, identical 13 failure names after the fix (Route Ranking/RoutePerformancePage/dataImportBackfillQueue/dashboard-metadata tests already on record from prior rounds). Net: `+3` new tests, `0` regressions.
- `oxlint` on the two changed/new frontend files: clean.
- Backend has no lint script (unchanged from prior rounds).
- Live-database verification (not test-mocked): reproduced the PO's exact evidence figures end-to-end through the real fixed code (table above); confirmed `from_date=to_date` (BCVH Ranking's own call pattern) returns `200` with the single-day figures; confirmed a reversed range returns `400 INVALID_RANGE`.

### Scope discipline

Bounded to the date-filter finding only. Tuyến Ranking, Evidence, Pareto/RCA: not touched (confirmed via `git status --porcelain` and `git diff --name-only` scoped to `frontend/src/features/route/`, `frontend/src/features/shipment/`, `frontend/src/features/dashboard/components/UnifiedBcvhAnalysisTable.jsx` other than the one line described above — none touched). No frozen architecture document touched. No Phase 2 work. The 8-frozen-document governance delta not started. `F13-SHIPMENT-001` not opened; `Data QLML/`, `NETWORK-MANAGEMENT` untouched; `.claude/` and both stashes confirmed untouched throughout (re-verified via `git stash list` after every stash/pop cycle used for baseline comparison during this round).

Phase 1 closure, the 8-frozen-document delta, and all Phase 2 work remain `PAUSED`, per explicit PO instruction, pending this remediation's own runtime recheck.

## 17. Date-Filter Remediation — PO Runtime Recheck PASS, Closure (2026-08-13)

- Status: `CLOSED / PO DATE-FILTER RUNTIME RECHECK PASS`
- Authority: Product Owner runtime recheck (chat, `2026-08-13`), "PO DATE-FILTER RUNTIME RECHECK PASS", performed after a backend restart.

### Product Owner confirmation

1. Operation Dashboard's "Bảng điều hành BCVH" now aggregates correctly across the whole selected date range.
2. Changing the date range updates the BCVH table's figures correctly per the filter.
3. The earlier-observed to_date-only behavior was the old backend process not yet restarted to pick up the new implementation — **not** a defect still present at commit `0a15ddf4`.
4. When a specific BCVH is filtered, the Sản lượng widget scopes to that BCVH and does not show a national rank in that context — **explicitly confirmed as correct behavior**, not a data-loss or missing-ranking defect. (Pre-existing behavior, `getDashboardKpi`'s `nationalRank = normalizedBcvh ? null : await this._getNationalRankSummary(...)` — unrelated to and unmodified by this remediation; recorded here because the Product Owner raised it during this recheck.)

### Implementation commits recorded

- Implementation: `0a15ddf4`
- Documentation: `4201fca6`

### Closure

The date-filter remediation (Section 16) is closed. No residual defect. No further action required on this finding.

## 18. Evidence Consolidation Phase 1 — Formal Closure (2026-08-13)

- Status: `PHASE 1 CLOSED / PO PASS`
- Authority: Product Owner instruction (chat, `2026-08-13`), governance-only continuation following the date-filter runtime recheck PASS, explicitly directing formal closure of Evidence Consolidation Phase 1.

Phase 1 (Section 12, backend F-1 fix) and its remediation (Section 13, DEFECT A Vietnamese IME search / DEFECT B empty-state distinction) both received Product Owner runtime PASS — the remediation's own recheck passed `2026-08-13` (recorded in Section 15/16's corrections and manifest Section 23). Formal closure was sequenced behind the date-filter remediation only, per explicit PO instruction on `2026-08-12`; that sequencing condition is now satisfied (Section 17).

**This closes Phase 1 of the Evidence Consolidation plan only.** It does not close:

- Phase 2 (widget consolidation, the 10-point search-result-presentation contract locked in Section 14) — remains `NOT IMPLEMENTED`, now unblocked on the frozen-document delta (Section 19) but still requiring its own separate implementation authorization before any code is written.
- The `F13-STANDARDIZATION-001` program itself, which remains open (Phase 0 of the original 5-phase program plan partial; Phases 1-4 of that program `PLANNED / NOT ACTIVE` — a different phase sequence from this plan's own 4 phases).

## 19. Frozen-Document Governance Delta — Execution Record (2026-08-13)

- Status: `GOVERNANCE DELTA EXECUTED`
- Authority: Product Owner instruction (chat, `2026-08-13`) explicitly directing execution of the frozen-document amendment that was approved in principle on `2026-08-11` (Section 12's "Decisions received this round" and Task 6/Section 8 above) as its own separate governance delta.

### What was amended

All 8 documents listed in Section 8 above, plus `PROJECT_PROGRESS.md`'s Frozen Documents list (a 9th document, the registry itself, not one of the 8). Each of the 8 gained a `## 0. GOVERNANCE AMENDMENT NOTICE (2026-08-13)` section inserted immediately after its title, recording the authorizing decision and the substance of the change; **original content was preserved below the notice as the historical record, not deleted or rewritten in place**, per the standing rule against destroying frozen-document history and per this plan's own Section 8 instruction ("preserve history rather than deleting").

1. `docs/02_ARCHITECTURE/EVIDENCE/EVIDENCE_CENTER_INFORMATION_ARCHITECTURE.md` — **AMENDED**. Redefined as the merged violation-detail stage; drill-down chain collapsed from `Dashboard → BCVH → Route → Shipment → Evidence → Action` to `Dashboard → BCVH → Tuyến → Evidence → Action`; the two "Không lặp Shipment Performance Center" / "Không đưa Recommendation sang Evidence" prohibitions in the original Section 8 recorded as now literally satisfied (merge, not duplication; removal, not addition).
2. `docs/02_ARCHITECTURE/EVIDENCE/EVIDENCE_CENTER_SCREEN_ARCHITECTURE.md` — **AMENDED**. Eight-zone/widget list replaced with the three real regions (context/filter bar, violation list, evidence-detail panel), matching this plan's Section 4/5.
3. `docs/EVIDENCE_CENTER_WIDGET_SPECIFICATION.md` — **AMENDED**. Re-specified against the real, implemented widget set; the six widgets with no `fact_f13` data source (Coverage, Scan History, Rule Validation-as-widget, Supporting Evidence, RCA Evidence-as-widget, Decision Support) explicitly recorded as "no data source available" rather than outstanding implementation debt.
4. `docs/02_ARCHITECTURE/SHIPMENT/SHIPMENT_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` — **SUPERSEDED**. Standalone Shipment Performance Center stage no longer exists; merged into Evidence Center.
5. `docs/02_ARCHITECTURE/SHIPMENT/SHIPMENT_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md` — **SUPERSEDED**, same reason.
6. `docs/03_UX/evidence/EVIDENCE_CENTER_UX_ARCHITECTURE.md` — **AMENDED**. Journeys/wireflow aligned to the merged screen's actual entry point (Tuyến Ranking or the URL contract, not "Shipment drill-down"), journey steps, and wireflow.
7. `docs/03_UX/shipment/SHIPMENT_PERFORMANCE_CENTER_UX_ARCHITECTURE.md` — **SUPERSEDED**, same reason as #4/#5.
8. `docs/SHIPMENT_PERFORMANCE_CENTER_WIDGET_SPECIFICATION.md` — **SUPERSEDED**. Widget-by-widget fate cross-referenced to this plan's Section 5 disposition table.
9. `PROJECT_PROGRESS.md`'s "Frozen Documents" section — updated with a controlled-amendment record listing all 8 documents above and pointing back to this section.

### Validation performed (documentation-only change — no product-code test suite applies)

- Every one of the 8 files confirmed to exist and be readable before editing (`find`/`Read`), matching the exact paths named in Section 8 — no path was guessed.
- Every edit confirmed additive-at-the-top: `git diff` for each of the 8 files (checked before commit) shows only an inserted `## 0. GOVERNANCE AMENDMENT NOTICE` section and a one-line "(historical — ...)" annotation on the immediately-following original heading; zero lines of original body content were deleted, reordered, or rewritten in any of the 8 files.
- Cross-references between the amended documents verified by direct `grep`: each Evidence-side document's amendment notice points to the correct counterpart document and to this plan checkpoint's Sections 4/5/6 as the source of the real design it now reflects.
- No product code, schema, route, or test file was touched by this delta — confirmed via `git status --porcelain` / `git diff --name-only` scoped to `backend/` and `frontend/` returning empty for this round's frozen-document changes.

### Scope discipline

Documentation-only. No Phase 2 product code implemented — the 10-point search-result-presentation contract (Section 14, AC-15..AC-23) remains locked as scope only. `F13-SHIPMENT-001` (`stash@{0}`) not opened. `Data QLML/`, `NETWORK-MANAGEMENT` untouched. `.claude/` and both stashes confirmed untouched.

### Phase 2 prerequisite status

With this delta executed and Phase 1 formally closed (Section 18), Phase 2's two stated prerequisites are now both satisfied at the governance level:

- (a) Product Owner recheck of Phase 1 — **satisfied** (Section 17/18).
- (b) The frozen-document governance delta — **satisfied** (this section).

**Phase 2 is not thereby authorized to begin implementation.** Per the standing rule that a governance-only round does not itself authorize new product-code work, and per this Product Owner instruction's own explicit boundary ("Chưa triển khai product code Phase 2 trong lượt governance này"), Phase 2 implementation requires a separate, explicit Product Owner authorization to start — the same pattern already used for every prior phase in this program (Phase 1 required its own explicit "PO APPROVES EVIDENCE CONSOLIDATION PLAN — start Phase 1" instruction; Phase 2 will require its own equivalent).

## 20. Phase 2 Implementation Record (2026-08-13)

- Status: `PHASE 2 IMPLEMENTED / READY FOR PO RUNTIME RECHECK`
- Authority: Product Owner instruction, "PO AUTHORIZATION — BEGIN EVIDENCE CONSOLIDATION PHASE 2 IMPLEMENTATION" (chat, `2026-08-13`), baseline `457329e2` confirmed matching before any edit.

### Scope implemented

Plan Section 9's "Phase 2 — Evidence screen rebuild" file scope, plus the Section 14 search-result-presentation contract (AC-15..AC-23), in the same round per explicit Product Owner instruction. Frontend-only.

### What changed

- `frontend/src/features/shipment/ShipmentPerformancePage.jsx` — rewritten. Violation group tabs (reused from `routeViolationEvidenceData.js`'s `buildViolationGroupTabs`, not reimplemented); `reason` now participates in the evidence fetch, server-scoped per tab; the auto-select-first-row effect removed entirely — `selectedShipment` now derives only from an explicit `shipment_id` match, never a fallback; conditional `Tuyến` column (`showRouteColumn={!routeIdParam}`); a search-result summary region (AC-16) rendered only while a keyword is active; three distinct KPI counts (AC-19: context total / search result count / selected shipment); header merges BCVH/Tuyến/Ngày directly into `PageContainer`'s action badges (replacing the old `ShipmentExecutiveBrief` card). The pre-existing DEFECT A/B empty-state logic (`emptyStateContent`) and the single-day date contract (`analysisDate`) were left byte-for-byte unchanged.
- `frontend/src/features/shipment/shipmentPerformanceData.js` — added `formatSearchResultSummary` (AC-16's exact wording) and `groupRowsByRoute` (AC-17/18/22: groups by real `ma_tuyen`, never by display-name text; never truncates to the first match; never drops a row). `matchesSearchQuery`, `stripVietnameseDiacritics`, `calculateDelayHours`, `fetchAllEvidenceRows` unchanged.
- `frontend/src/features/shipment/ShipmentEvidenceSummary.jsx` — reworked from a static candidate list into the primary violation widget: flat table (no active search) or grouped-by-route expandable accordion (active search, AC-17), with a conditional Tuyến column and mobile-hidden secondary columns (`hidden sm:table-cell` on Tuyến/PTC/Nộp tiền, leaving Mã BG/Lý do vi phạm/Độ trễ visible on narrow viewports, per the plan's mobile wireframe).
- `frontend/src/features/shipment/ShipmentEvidenceDetail.jsx` — **new file**. Consolidates the old `ShipmentTimeline` + `ShipmentRootCause` widgets into one evidence-detail panel (plan Section 5: Timeline MERGE, Root Cause REDESIGN — both "into the evidence-detail panel", so they no longer exist as separate widgets). Renders only when a shipment is explicitly selected (AC-15); shows identity, BCVH/Tuyến/Ngày, kết quả badge, nhóm vi phạm badge, PTC→Nộp tiền timeline, the `>3.0h` rule statement only when the classification is `Chậm nộp tiền`, and an honest "Chưa khả dụng" Action Center hand-off state.
- **Deleted** (Section 5 widget disposition, REMOVE or fully absorbed elsewhere): `ShipmentImpactOverview.jsx`, `ShipmentRecommendation.jsx`, `ShipmentDrilldown.jsx` (REMOVE, unchanged from plan); `ShipmentExecutiveBrief.jsx` (MERGE into the header — no separate card remains, satisfying AC-23's "no interim patch" by removing the file entirely rather than patching it); `ShipmentTimeline.jsx`, `ShipmentRootCause.jsx` (superseded by the new consolidated `ShipmentEvidenceDetail.jsx`); `ShipmentShellShared.jsx` (its only purpose was the "shell/sẽ được bổ sung ở ticket sau" disclaimer AC-11 already required removed; once every consumer was reworked or deleted, no file imported it any longer, so it was deleted rather than kept as dead code — a minor deviation from the plan's literal "rework" instruction for this one file, made because the file had no remaining purpose or consumer, not a scope expansion).

### Scope discipline confirmed

- No metric, F1.3 formula, date contract, or data source changed — `analysisDate` resolution untouched; `violation_reason`/`do_tre_gio` consumed as-is from the existing (Phase 1) API contract, no new backend field or query.
- No backend file touched this round (`git diff --name-only -- backend/` empty).
- No other module touched: Operation Dashboard, BCVH Ranking, Tuyến Ranking, Pareto/RCA, Network Management confirmed untouched (`git status --porcelain` scoped outside `frontend/src/features/shipment/`).
- `F13-SHIPMENT-001` (`stash@{0}`) not opened. `Data QLML/`, `.claude/`, both stashes confirmed untouched.
- No redesign beyond the locked plan/AC — the one deviation (deleting `ShipmentShellShared.jsx` instead of reworking it) is disclosed above, not silently made, and is a deletion of now-dead code, not new design.

### Acceptance criteria → implementation/test mapping

| Criterion | Implementation | Test |
| --- | --- | --- |
| AC-15 (no auto-selection; explicit selection only) | `selectedShipment` useMemo: `if (!shipmentId) return null;`, no fallback to `sortedRows[0]` | `ShipmentPerformancePage.phase2.test.js` #1 |
| AC-16 (exact summary line) | `formatSearchResultSummary()` in `shipmentPerformanceData.js`, rendered in `searchResultSummary` only while `isSearchActive` | `shipmentPerformanceData.test.js` (exact-wording + zero-result), `ShipmentPerformancePage.phase2.test.js` #2 |
| AC-17 (grouped by route, expandable) | `ShipmentEvidenceSummary` `mode="grouped"`, `groupRowsByRoute(sortedRows)`, expand/collapse via `collapsedRouteIds` | `ShipmentPerformancePage.phase2.test.js` #3, `shipmentPerformanceData.test.js` grouping tests |
| AC-18 (every matching route shown, not just first) | `groupRowsByRoute` has no truncation; all groups passed to the widget (`groups={groupedRows}`) | `shipmentPerformanceData.test.js` "surfaces every matching route" |
| AC-19 (3 distinct counts) | `contextTotal` / `searchResultCount` / `selectedShipment` rendered as 3 separate `KPICard`s | `ShipmentPerformancePage.phase2.test.js` #4 |
| AC-20 (Tuyến dropdown independent) | `handleRouteChange` only ever sets `route_id`/`route_name`, never touches `search` | `ShipmentPerformancePage.phase2.test.js` #5 |
| AC-21 (0/1/n states, clear-keyword, desktop/mobile) | `EmptyState` (0), flat/grouped table (1/n), `handleClearSearch` reused in both the empty state and the search summary; responsive Tailwind (`sm:table-cell`, `xl:grid-cols-3`) | `ShipmentPerformancePage.phase2.test.js` #6; desktop/mobile verified via `vite build` only — **not** verified via a live browser screenshot (no usable login credential in this workspace, same precedent as every prior Evidence round) |
| AC-22 (real `ma_bg`/`ma_tuyen` reconciliation) | Row mapper keys `routeId: item.ma_tuyen`, `shipmentId: item.ma_bg`-derived; `groupRowsByRoute` groups on `routeId`, never route-name text | `shipmentPerformanceData.test.js` "groups by real ma_tuyen... never route-name text alone"; live backend proof below |
| AC-23 (no interim patch to `ShipmentExecutiveBrief`) | File deleted entirely | `ShipmentPerformancePage.phase2.test.js` #8 |

### Live-database proof (service layer, not mocked — same technique used throughout this session)

Real context (`2026-07-27`, BCVH Thuận Hóa `533140`, 1,573 "Không đạt" rows): `violation_summary = {total_failed: 1573, delayed_cash_count: 217, other_failed_count: 427, unknown_count: 929}`; "Tất cả tuyến" mode returns 32 distinct real `ma_tuyen` values among the rows (proving route identity survives, not a fallback constant); filtering by `reason=delayed_cash` returns exactly 217 rows, matching `violation_summary.delayed_cash_count` exactly, and every one of those 217 rows has `violation_reason === 'Chậm nộp tiền'` — proving the tab-count-to-row-filter reconciliation this screen depends on.

### Validation

- New tests: `ShipmentPerformancePage.phase2.test.js` (14 tests) + 5 new tests in `shipmentPerformanceData.test.js` — **19/19 pass**.
- Full frontend sweep: **302/315 pass** — re-verified true baseline before this round was 283/296 (12 fewer tests, same identities); the 13 failures are byte-identical by name to that baseline; zero regressions.
- `oxlint`: clean on every changed/new file in `frontend/src/features/shipment/`.
- `vite build`: succeeds.
- Old `ShipmentPerformancePage.contract.test.js` (Phase 1) and `ShipmentPerformancePage.remediation.test.js` (Phase 1 remediation, DEFECT A/B) — both **unmodified and still 100% passing** (8 + 7 = 15 tests), confirming this round did not regress either prior acceptance.

### Simplification disclosed

The plan's mobile wireframe (Section 4.2) describes tapping a row opening a full-screen sheet. This round implements a lighter responsive layout instead (columns collapse via Tailwind breakpoints; the detail panel stacks below the table on narrow viewports via the existing `xl:grid-cols-3` grid) rather than building a new modal/sheet interaction pattern. This is disclosed as a scope-conscious simplification for Product Owner review, not a silent deviation — the exact-sheet interaction can be a follow-up if required at runtime recheck.

Claude Code does not self-award PO PASS and does not self-close Phase 2.
