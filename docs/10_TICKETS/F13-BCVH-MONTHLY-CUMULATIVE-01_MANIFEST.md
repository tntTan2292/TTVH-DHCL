# F13-BCVH-MONTHLY-CUMULATIVE-01 Manifest

Status: `CLOSED / PO PASS (2026-09-17)`. Product Owner accepted the final UI at implementation commit `03b925e8025f609c9d7fc92da4db57f81756f0a4`; all Section 11 blockers and Section 12 amendments are closed.

## 1. Ticket Information

- Ticket ID: `F13-BCVH-MONTHLY-CUMULATIVE-01`
- Ticket Name: `F1.3 — Lũy kế tháng hiện tại trên Operation Dashboard và BCVH Ranking`
- Phase: `Closed / Product Owner Accepted`
- Owner: `Product Owner / CTO workflow` — completed.
- Next Executor: none; the ticket is closed.
- Governance Version: `V2 Active`
- Activation authority: Product Owner decision received in chat, 2026-09-15: "Tạm dừng F4.1 và chuyển ưu tiên khẩn sang nâng cấp F1.3", naming this ticket by its exact scope (below) and directing it be opened at `DISCOVERY / READ-ONLY AUDIT` with `Antigravity (Gemini)` as next executor.
- Branch: `codex/da-impl-006`
- Baseline commit: `19b0021`
- Activation date: `2026-09-15`

## 2. Objective

Audit — read-only, no code change — how to add a "Lũy kế tháng hiện tại" (current-month cumulative) view to the Operation Dashboard and to BCVH Ranking, showing the aggregate across **all** BCVH (not per-unit only), and reconciled against the Product Owner's own operating Excel file (chỉ đạo điều hành). The addition must build on the existing Dashboard/BCVH Ranking features, not replace or rebuild them, and must not change the F1.3 KPI or its SSOT.

## 3. Required Reading

- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/06_REVIEWS/Shared/F13-BCVH-MONTHLY-CUMULATIVE-01_CHECKPOINT_001.md` (this ticket's activation record)
- `docs/07_REFERENCE/Domains/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/` — the F1.3 SSOT package (`data_blueprint.md`, `measurement.md`, `business_rules.md`, `acceptance_criteria.md` in particular). The KPI/SSOT defined here must not change.
- `frontend/src/features/dashboard/DashboardPage.jsx` and its `components/` (Operation Dashboard) — the existing screen this ticket adds to.
- `frontend/src/features/ranking/BcvhRankingPage.jsx` — the existing BCVH Ranking screen this ticket adds to.
- `backend/src/controllers/DashboardController.js`, `backend/src/services/F13DashboardService.js`, `backend/src/services/bcvhOverviewService.js` — the existing backend endpoints/services this ticket's audit must map against.

## 4. Business Context

- Business problem: Operation Dashboard and BCVH Ranking currently show KPI over a selected date range, but the Product Owner needs a distinct, always-current "month-to-date cumulative" view — reconciled against the Excel file they already use to run operations day to day — visible for the whole BCVH set at once, not filtered to one unit.
- This is explicitly an **addition** to the existing screens/APIs, not a rebuild: the existing date-range KPI, per-BCVH breakdown, and BCVH Ranking table/sort/pagination must remain unchanged in behavior.
- The F1.3 KPI definition and its SSOT (`danh_gia_2026`, `data_blueprint.md`, `measurement.md`) must not change — this ticket is a new presentation of existing data, not a new metric.

## 5. Scope

In scope for discovery only:

- Read-only audit of how "current month" and "cumulative across all BCVH" would be computed from the existing `fact_f13` data and existing service layer (`F13DashboardService`, `bcvhOverviewService`), without altering either.
- Read-only comparison against the Product Owner's operating Excel file, once supplied — this ticket must not guess its structure or figures; request the file from the Product Owner if it is not already in the workspace.
- Read-only survey of where a "Lũy kế tháng hiện tại" view fits into the existing Operation Dashboard and BCVH Ranking UI without disrupting either screen's current layout/behavior.
- Producing a discovery report and, if warranted, a data-contract/UI proposal for a later, separately-authorized design/implementation phase.

Explicitly out of scope for this activation:

- Any product code, database, schema, or API change.
- Any change to the F1.3 KPI definition, `danh_gia_2026`, or any frozen SSOT document.
- Any change to F4.1 (`F41-DASHBOARD-MINIMUM-01` is separately `PAUSED BY PO PRIORITY` and unrelated to this ticket).
- `F13-ROUTE-POSTMAN-IDENTITY-01` (separate, independent ticket — not merged into this one's scope).

## 6. Validation

Not applicable at this activation — no code changed. The discovery/audit phase (owned by the next executor, Antigravity) must itself stay read-only: no query that mutates data, no schema change, no server restart required beyond what is needed to read existing behavior.

## 7. Expected Output

- What this ticket must produce: a read-only discovery report — how "current-month cumulative, all-BCVH" would be computed against `fact_f13`/existing services, a reconciliation against the Product Owner's Excel file, and a proposed (not yet authorized) UI/data-contract addition to Operation Dashboard and BCVH Ranking.
- What must remain unchanged throughout discovery: all existing Dashboard/BCVH Ranking behavior, the F1.3 KPI/SSOT, the database, and F4.1.
- What must not be introduced: any inferred business rule, any guessed Excel structure, any implementation ahead of Product Owner approval of the discovery findings.

## 8. Next Step

Discovery/read-only audit to be performed by `Antigravity (Gemini)`. Findings return to the Product Owner for a design/implementation authorization decision — not self-activated by this ticket's opening.


## 9. Product Owner Locked Table Contract — 2026-09-16

The Product Owner locked the Operation Dashboard BCVH table presentation and comparison semantics. This is a business/UI requirement record only; it does not activate Design or implementation. The ticket remains blocked on the PO operating Excel reconciliation.

### 9.1 Exact column structure

The table must contain exactly these business columns, using a two-level grouped header:

| Order | Group | Column |
| ---: | --- | --- |
| 1 | Identity | STT |
| 2 | Identity | Mã bưu cục |
| 3 | Identity | Tên bưu cục |
| 4 | Lũy kế tháng | Sản lượng đo kiểm |
| 5 | Lũy kế tháng | Tỷ lệ đạt KPI 2026 |
| 6 | Lũy kế tháng | Tăng/giảm so với tháng trước |
| 7 | Điều hành ngày | Sản lượng đo kiểm |
| 8 | Điều hành ngày | Tỷ lệ đạt KPI 2026 |
| 9 | Điều hành ngày | Tăng/giảm so với ngày trước |

The existing Status, raw Passed/Failed, “So với HQ” and “So với CK” columns are not part of this locked target table unless the Product Owner later explicitly changes the contract.

### 9.2 Row and anchor rules

- The `TỔNG CỘNG` row is placed first for immediate operational visibility; its STT is `—`.
- The six canonical BCVH rows follow, numbered 1–6.
- Every row uses the same system-wide latest available fact date as the anchor; units do not independently select different latest dates.
- Current-month cumulative covers day 01 of the anchor month through the anchor date.

### 9.3 Locked comparison semantics

- **Month comparison:** current-month cumulative is compared with the **same elapsed period of the previous month**, for example 01–14/09 versus 01–14/08. If the previous month is shorter, cap at its last calendar day.
- **Daily comparison:** the anchor date is compared with the **previous available fact date**, not necessarily calendar D-1.
- Rate movements are displayed in **percentage points** (`điểm %`), not relative percent change.
- Missing comparison data displays `—`; no fabricated zero or fallback rate.

### 9.4 Readability dependency

The table must also comply with `UI-DATA-TABLE-READABILITY-01`: enlarge actual rendered text to the PO-approved target, reclaim unused spacing and rebalance columns first, prevent wrapping/overlap/clipping, and use horizontal scrolling only as an evidence-proven, explicitly approved last resort.


## 10. Product Owner Final Authorization — Excel Gate Waived / Implementation Authorized (2026-09-16)

The Product Owner explicitly decided:

- The table contract in Section 9 is final.
- No operating Excel reconciliation is required for this ticket.
- The total scope is the six canonical BCVH represented by the six table rows.
- Proceed directly to implementation, tests and UI validation.
- This authorization does not grant PO UI PASS; the Product Owner will inspect the completed UI.

### 10.1 Locked centered capture title

A centered two-line title must appear immediately above the table, inside the same capture-ready visual block:

**Line 1**

`BẢNG TỔNG HỢP SỐ LIỆU CHỈ SỐ F1.3 TẠI CÁC BCVH`

**Line 2**

`ĐẾN NGÀY DD/MM/YYYY (SỐ LIỆU GẦN NHẤT)`

Requirements:

- The date is dynamic and comes from the same system-wide latest available fact date anchoring the table.
- It must never use browser today when that differs from the latest fact date.
- Both lines are centered, prominent and readable in a screenshot.
- The title, table and Total row must fit in one coherent capture-ready card without unrelated controls breaking the visual.
- Vietnamese capitalization and wording above are exact; only `DD/MM/YYYY` is substituted at runtime.

### 10.2 Implementation gates

The executor must:

1. Implement the exact nine-column contract in Section 9.
2. Use the six canonical BCVH and a first-row `TỔNG CỘNG` calculated from those same six rows.
3. Implement current MTD through the shared latest-data anchor.
4. Compare MTD rate with the same elapsed period in the previous month.
5. Compare daily rate with the previous available fact date.
6. Display rate movement in percentage points and missing comparison as `—`.
7. Apply the active readability constraints: enlarge measured text, reclaim spacing and rebalance columns first, no wrapping/overlap/clipping, and no default horizontal scrolling.
8. Add/adjust backend only where existing contracts cannot supply the locked semantics; reuse current services wherever correct.
9. Add regression tests for data mapping, comparisons, Total scope, title date source and UI rendering.
10. Provide desktop and phone screenshot evidence for Product Owner UI Check.

### 10.3 Next state

`IMPLEMENTATION AUTHORIZED / READY FOR EXECUTOR`. Findings return through implementation report and technical validation, then Product Owner UI Check. No executor may self-award PO PASS.


## 11. CTO Implementation Review — BLOCKED (2026-09-16)

Reviewed implementation commit: `0ed36ebfe3018be8d9a26d85bed65503ccefe126`.

Positive findings: the exact title text, grouped nine-column structure, Total-first ordering, six canonical rows, percentage-point formatting and core aggregate mapper/tests are present. The API route `/f13/ranking/bcvh/overview` is valid on this branch.

Verdict: `BLOCKED / NOT READY FOR PO UI CHECK`.

### 11.1 Blocking findings

- **CTO-F13-BLOCK-01 — Horizontal scrolling implemented without the required proof/approval.**  
  `BcvhOperationTable.jsx` wraps the table in `overflow-x-auto`; the execution report explicitly says mobile uses horizontal scrolling. PO required spacing/column rebalancing first and prohibited default scroll unless measured evidence proves it unavoidable and PO approves the exception. No such evidence or approval exists.

- **CTO-F13-BLOCK-02 — The ≥2× rendered-font requirement is neither demonstrated nor met by contract.**  
  The implementation uses Tailwind sizes including `text-xs`, `text-sm`, `text-base`, `sm:text-sm` and `sm:text-base` (approximately 12–16 px, title up to 20 px) but supplies no computed before/after measurements. The report's assertion “font chữ tăng gấp đôi” is unsupported.

- **CTO-F13-BLOCK-03 — No-wrap requirement is not implemented.**  
  Table headers and cells lack a locked no-wrap rule. Long headers are allowed to wrap; the report's own table representation shows multi-line header wrapping. This contradicts the PO requirement to rebalance widths without wrapping, overlap or clipping.

- **CTO-F13-BLOCK-04 — The table anchor is still controlled by the Dashboard filter, not always the system-wide latest fact date.**  
  `BcvhOperationTable.jsx` derives `anchorFromFilter = globalFilter?.dateRange?.[1]` and sends it as `anchor_date`. Selecting an older Dashboard period therefore changes the capture title and table anchor, contrary to the locked “SỐ LIỆU GẦN NHẤT” contract. A modified test explicitly preserves this incorrect filter coupling.

- **CTO-F13-BLOCK-05 — Previous-available-date logic fails across a month boundary.**  
  `processBcvhOperationTableData()` searches only the overview response's `daily` array. `BcvhOverviewService` builds that array from day 01 of the anchor month through the anchor. When the anchor is the first available day of a month, the previous available fact date may be in the prior month and is absent from the payload, producing `—` despite available data. The test covers only 13→14 within one month.

- **CTO-F13-BLOCK-06 — Required screenshot evidence is missing.**  
  The report asserts desktop/mobile results and mentions a browser recording, but no accessible screenshots or artifact paths were delivered for review. PO UI Check cannot begin without actual desktop and phone evidence showing the whole table and typography.

### 11.2 Remediation gates

The executor must fix all six blockers, add boundary tests (including prior-month previous date), provide measured computed typography evidence, and return actual desktop/phone screenshots. No Governance edits and no PO PASS. After remediation, CTO re-review is required before PO UI Check.


## 12. Product Owner Table-Header and Ordering Amendment — 2026-09-16

The Product Owner added the following requirements while the implementation remains blocked in CTO review. This amendment is part of the same authorized remediation scope; it does not create extra business-data columns and does not grant PO PASS.

### 12.1 National rank and evaluation-period context in grouped headers

The table remains the exact nine-column table locked in Section 9. No separate rank column is added. Instead, the two grouped headers above their three child columns must show dynamic operating context:

- **LŨY KẾ THÁNG**: show a red, centered context line containing the evaluated month/year and Huế's current-month-to-anchor national rank, for example `THÁNG 09/2026 • VỊ THỨ TOÀN QUỐC: 12/34`.
- **ĐIỀU HÀNH NGÀY**: show a red, centered context line containing the shared anchor date and Huế's national rank for that exact day, for example `NGÀY 14/09/2026 • VỊ THỨ TOÀN QUỐC: 15/34`.
- These context lines sit inside the corresponding grouped header, above the three leaf-column titles, so leadership can identify the evaluated period and national standing directly from a captured image.
- The month rank covers day 01 of the anchor month through the shared anchor date. The daily rank covers the exact shared anchor date. Both must use the same national F1.3 source and ranking contract already present in `fact_f13_national` / `F13DashboardService`; no local-BCVH rank may be substituted.
- If national data for the exact period is unavailable, display `VỊ THỨ TOÀN QUỐC: —`; do not reuse a stale date, fabricate a rank, or silently fall back to local BCVH ranking.
- Rank format is `rank/total ranked units` (normally `x/34`, but the denominator must come from the actual ranked population returned by the data contract rather than being hard-coded).

### 12.2 Header alignment

- Every grouped header and every leaf-column title is horizontally and vertically centered.
- The red context lines, column titles and cell contents must remain legible and comply with the no-wrap/no-overlap/no-clipping and no-default-horizontal-scroll gates in Sections 9–11.

### 12.3 Locked row ordering

- `TỔNG CỘNG` remains pinned as the first row and is excluded from ranking/sorting.
- The six BCVH rows are ordered by **Điều hành ngày → Tỷ lệ đạt KPI 2026**, descending.
- Rows with a missing/null daily rate are placed after rows with a valid rate.
- Deterministic tie-breaks: daily measured volume descending, then `Mã bưu cục` ascending.
- STT is reassigned `1–6` after this ordering is applied.

### 12.4 Additional remediation validation

The executor must add regression tests proving: both national ranks use the correct MTD/day periods and actual denominators; missing national data renders `—`; all header titles are centered; Total remains first; daily-rate descending order, null-last behavior and deterministic ties are correct; and STT is recomputed after sorting. Desktop and phone screenshots must visibly include both red context lines and the sorted rows.


## 13. Final Remediation, CTO Validation and Product Owner Closure — 2026-09-17

### 13.1 Accepted implementation baseline

The final accepted product implementation is commit `03b925e8025f609c9d7fc92da4db57f81756f0a4` on branch `codex/da-impl-006`.

The remediation chain closed the Section 11 blockers and implemented the Section 12 amendment:

- `41b7c88`: latest-data anchor decoupled from Dashboard filters, previous available fact date crosses month boundaries, national month/day rank context added, Total-first and daily-rate ordering implemented.
- `0e64b5f`: mobile Fit mode made the default and missing rank-period/layout regressions added.
- `ddc0020`: symmetric grouped layout, shared F1.3 Heatmap rate tones and delta arrows added.
- `03b925e`: columns 4–9 locked to equal widths, delta headers split into the Product Owner-approved two-line wording, and header/data/rate typography locked at 16–18 px.

No F1.3 KPI definition, frozen SSOT, database schema or business data was changed.

### 13.2 CTO validation

Independent source review at `03b925e` confirmed the final scope and independently re-ran:

- `backend/src/services/bcvhOverviewService.test.js`: `8/8 PASS`.
- `frontend/src/features/dashboard/components/bcvhOperationTableData.test.js`: `14/14 PASS`.
- `frontend/src/features/dashboard/components/*.test.js`: `134/134 PASS`.

The final source satisfies the locked nine-column contract, six-canonical-BCVH Total scope, latest shared anchor, previous-month/day comparisons, national-rank header context, daily-rate ordering, equal widths for columns 4–9, shared Heatmap SSOT, delta arrows and 16–18 px typography. Verdict before PO inspection: `TECH PASS / READY FOR PO UI CHECK`.

### 13.3 Product Owner decision

Product Owner decision received in chat on 2026-09-17: **“ok pass bước tiếp theo nhé”**.

This is the explicit Product Owner UI acceptance for the completed table. Final state:

`IMPLEMENTED / PO UI PASS / CLOSED`.

No further work is authorized under this ticket. Any later change requires a new ticket or explicit reopening.
