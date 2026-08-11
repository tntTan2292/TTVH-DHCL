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
│ VIOLATION GROUP TABS  (counts from the server, never counted on screen)   │
│  [ Chậm nộp tiền  N ]* [ Không đạt khác  N ] [ Chưa xác định  N ]          │
│  [ Tất cả không đạt  N ]                          * = default selected     │
├────────────────────────────────────────┬─────────────────────────────────┤
│ VIOLATION TABLE (≈ 2/3 width)          │ EVIDENCE DETAIL (≈ 1/3 width)   │
│                                         │                                 │
│  Mã BG │ Tuyến* │ Lý do │ PTC │ Nộp     │  Empty until a row is chosen:   │
│        │        │       │     │ tiền │  │  "Chọn một bưu gửi để xem      │
│        │        │       │     │ Độ trễ │   bằng chứng chi tiết."         │
│  ─────────────────────────────────────  │                                 │
│  (rows; click selects)                  │  When chosen:                   │
│                                         │   • Mã bưu gửi                  │
│  * "Tuyến" column appears only in       │   • BCVH · Tuyến · Ngày         │
│    "Tất cả tuyến" mode — needs the      │   • Kết quả (danh_gia_2026)     │
│    F-1 backend fix                      │   • Nhóm vi phạm (badge)        │
│                                         │   • Mốc thời gian:              │
│  ─────────────────────────────────────  │       PTC → Nộp tiền            │
│  Hiển thị X–Y / TỔNG  ◀ Trước  Sau ▶    │   • Độ trễ, and the “> 3.0h”    │
│  (TỔNG = meta.pagination.total_items)   │     rule stated explicitly when │
│                                         │     it is what caused the       │
│                                         │     classification              │
│                                         │   • Hand-off: “Chuyển sang      │
│                                         │     Action Center” — shown as   │
│                                         │     an honest not-yet-available │
│                                         │     state while Action Center   │
│                                         │     does not exist              │
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
| `ShipmentExecutiveBrief` | **MERGE** into the context header | Its four values duplicate the header; no separate card |
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
