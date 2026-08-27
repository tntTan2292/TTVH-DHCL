# AB-CALENDAR-01 — 4-Status PO Coverage Model — Design of Record

Status: **DESIGN OF RECORD / DOCUMENTATION-ONLY — NO CODE OR DATABASE CHANGED**
Author: Claude Code (Opus) → Claude/CTO → Product Owner
Branch: `codex/da-impl-006` · Baseline HEAD at authoring: `5d196ff0`
Supersedes: the 7-status proposal (cancelled by PO) and PO decisions 2 & 4 of
`AB-CALENDAR-01_HOLIDAY_CALENDAR_DESIGN.md`.

---

## 1. What changed and why

The Product Owner replaced the frozen 6-state technical coverage model with **exactly 4
PO-facing statuses**, then added a second rule: **"Được loại trừ" counts as operationally
finished.** This document is the single design of record for both.

| # | PO status | Vietnamese label | Meaning |
| --- | --- | --- | --- |
| 1 | `COMPLETED` | **Đã hoàn tất** | Import succeeded |
| 2 | `INCOMPLETE` | **Chưa hoàn tất** | Not imported yet |
| 3 | `EXCLUDED` | **Được loại trừ** | LỊCH NGHỈ, holiday, or a confirmed special exception |
| 4 | `DATA_ERROR` | **Lỗi dữ liệu** | Imported, but the data is wrong — PO must inspect |

### 1.1 The operational-completion delta (PO, this ticket)

`EXCLUDED` is **operationally finished work**, not an open gap:

| Group | Statuses | Meaning to PO |
| --- | --- | --- |
| **Đã xử lý** | `COMPLETED` + `EXCLUDED` | Nothing more to do |
| **Chưa xử lý xong** | `INCOMPLETE` + `DATA_ERROR` | Still needs action |

Consequences, all binding:

- "Chọn tất cả chưa hoàn tất" returns and selects **only** `INCOMPLETE` + `DATA_ERROR`.
- `COMPLETED` and `EXCLUDED` can **never** be selected, by any UI path.
- Every "chưa hoàn tất" total counts **only** `INCOMPLETE` + `DATA_ERROR`.
- `EXCLUDED` still gets its own visible count and badge so PO can see which days were
  excluded — it is shown, but never counted as missing.
- `DATA_ERROR` remains selectable so PO can bulk-reimport or record an exception.
- Real data always wins: a day with genuine committed data is `COMPLETED` regardless of any
  holiday or exception on it.

## 2. Mapping — every technical status into the 4 groups

The completion policy in `autoBackfillCompletionPolicies.js` already separates "imported but
wrong" from "never imported", so the hardest PO rule is guaranteed **structurally**, not by
convention:

| PO status | Source | Actual condition in the policy |
| --- | --- | --- |
| `COMPLETED` | raw `SUCCESS` | rows exist, count matches, `distinct == count` |
| `INCOMPLETE` | raw `MISSING`, no holiday/exception | **0 rows, 0 import_log, no artifact** — never imported |
| `EXCLUDED` | any ACTIVE holiday **or** any ACTIVE coverage exception, on a day that is not already `COMPLETED` | LỊCH NGHỈ / `PO_EXEMPTED` / `VERIFIED_NO_DATA` / `LEGACY_BASELINE` |
| `DATA_ERROR` | raw `MANUAL_REVIEW_REQUIRED` **or** raw `INCOMPLETE` | `rowCount > 0` but integrity invalid; **or** import evidence exists (log/artifact) but 0 rows landed |

**Why `DATA_ERROR` can never swallow a never-imported day:** the policy returns
`MANUAL_REVIEW_REQUIRED` only when `rowCount > 0`, and raw `INCOMPLETE` only when
`logs.length > 0 || artifactPresent`. A day nobody has touched always falls through to
`MISSING`. The branch order in the policy enforces this; no convention is required.

Old 6-state → new 4:

| Frozen 6-state | New PO status |
| --- | --- |
| `DATA_COMPLETE_WITH_EVIDENCE` | `COMPLETED` |
| `TRUE_MISSING` | `INCOMPLETE` |
| `MANUAL_REVIEW_REQUIRED` | `DATA_ERROR` |
| `PO_EXEMPTED` | `EXCLUDED` |
| `VERIFIED_NO_DATA` | `EXCLUDED` |
| `LEGACY_DATA_PRESENT_WITHOUT_EVIDENCE` | `EXCLUDED` (open decision D2) |

The `EXCLUDED` rule is deliberately one sentence with no sub-cases: **any ACTIVE holiday or
exception → `EXCLUDED`.** The specific reason stays visible as a secondary chip
(`LỊCH NGHỈ: <reason>`, `Dữ liệu cũ đã có`, …), so no information is lost — only badges are
consolidated.

## 3. Measured impact on live data

Read-only scan of the live coverage at authoring time (952 tuples, 4 lanes):

| Raw completion status | Days |
| --- | --- |
| `SUCCESS` | 490 |
| `MISSING` | 462 (20 of them carry an ACTIVE holiday) |
| `INCOMPLETE` | **0** |
| `MANUAL_REVIEW_REQUIRED` | **0** |

ACTIVE coverage exceptions: **0** (all 8 were migrated to holidays in Section 42).

Projected distribution after the change:

| PO status | Days | Group |
| --- | --- | --- |
| `COMPLETED` | 490 | Đã xử lý |
| `INCOMPLETE` | 442 | Chưa xử lý xong |
| `EXCLUDED` | 20 | Đã xử lý |
| `DATA_ERROR` | 0 | Chưa xử lý xong |

"Đã xử lý" = 510 · "Chưa xử lý xong" = 442 · total 952.

`DATA_ERROR` is empty today and no exception rows exist, so the riskiest mapping decisions
have **zero immediate blast radius**. This is the cheapest possible moment to change the model.

## 4. Queue and selection rules

| PO status | Auto queue | Checkbox / bulk select | Nhập lại | Xác nhận ngoại lệ | Counted as "chưa hoàn tất" |
| --- | --- | --- | --- | --- | --- |
| `COMPLETED` | No (`ALREADY_SUCCESS`) | **No** (change — see 4.1) | Yes (re-update) | No | No |
| `INCOMPLETE` | **Yes**, if indicator `ACTIVE` and lane `AUTOMATED` | Yes | Yes | Yes | **Yes** |
| `EXCLUDED` | **Never** | **No** | Yes (opt-in, decision D1) | **No** | No |
| `DATA_ERROR` | No (needs PO) | **Yes** | Yes | Yes | **Yes** |

### 4.1 Selection guard must be generalized

Today the row checkbox renders on the single condition `!item.holiday`
(`AutoBackfillOperatorPanel.jsx`, table view and accordion view). That means a `COMPLETED`
day and an exception-based `EXCLUDED` day **are both currently selectable** — which this
delta forbids.

Replace the special-case with one predicate:

```
isSelectable(item) === ['INCOMPLETE', 'DATA_ERROR'].includes(item.status)
```

This is a strict strengthening, not a reversal, of commit `5d196ff`: a holiday becomes
`EXCLUDED`, so it remains unselectable exactly as before, while `COMPLETED` and
exception-based `EXCLUDED` become unselectable too. All four behaviors locked by `5d196ff`
(no checkbox, immune to bulk-select, no repeat exception confirmation, keeps "Thu hồi LỊCH
NGHỈ" and "Nhập lại") are preserved.

### 4.2 Revoke returns the day to `INCOMPLETE` — already true, no code needed

The holiday/exception overlay is derived inside `scan()` and never persisted per tuple.
Revoking a holiday or exception makes the overlay resolve to `null` on the next scan, so a
day with no data falls straight back to `INCOMPLETE` and becomes queue-eligible again. This
needs a **test to lock it**, not an implementation.

### 4.3 Internal technical detail stays internal

`INCOMPLETE` keeps its auto-vs-manual nuance in existing **internal** fields —
`queue_eligible` and `queue_ineligible_reason` (`AUTOMATION_DISABLED`,
`PORTAL_ADAPTER_NOT_REGISTERED`, `INDICATOR_NOT_ACTIVE`). A missing day on a MANUAL_ONLY lane
is still plain `INCOMPLETE` to the PO. **No fifth PO-facing status is created.**

## 5. Field semantics

`counts_as_missing` is currently computed as
`completion.status !== SUCCESS && !exception && !holiday`, which already equals exactly
`INCOMPLETE + DATA_ERROR` — i.e. it already implements this delta correctly. Only its **name**
is now misleading, since `DATA_ERROR` is not "missing".

Recommendation: rename to `counts_as_unprocessed` and keep `counts_as_missing` as a
deprecated alias for one release. Optional; behavior is already correct either way.

The `selectable` API (`GET /coverage/selectable`) already filters on this field, so it
satisfies the delta with no logic change — only its `excluded_*` breakdown should be
extended to report `EXCLUDED` and `COMPLETED` separately.

## 6. Migration and API compatibility

- **No database migration. No schema change.** Every status is derived at scan time; no
  column stores a status anywhere. This is the strongest property of the design.
- `status` changes its value set (6 → 4). The only consumers are the operator panel and the
  test suites, all inside this repository, so a single coordinated commit is safe.
- **No technical information is lost.** `completion_status` (the raw 4-state policy result)
  is already emitted in the payload today, alongside `exception`, `holiday`, `queue_eligible`
  and `queue_ineligible_reason`. The change simply stops overloading `status` with 6 values.
- `coverage_statuses` in the payload becomes the 4 PO statuses, so the frontend filter
  dropdown can be driven from the API instead of hardcoding.
- Cheap insurance: keep the 6 old keys as backward-compatible aliases in
  `resolveNoCodeStatus`, so a mismatched backend/frontend pair degrades gracefully instead of
  rendering raw status codes.

## 7. File scope (for the implementing session)

**Backend** — `autoBackfillCoverageService.js` (replace `COVERAGE_STATUSES` with the 4;
`toPoStatus()` replaces `toCoverageStatus()`; `EXCLUDED` branch in `queueDisposition`;
`counts` derives 4 buckets automatically) · `autoBackfillQueueService.js` +
`autoBackfillQueueController.js` (explicit reimport opt-in, decision D1) · tests:
`test_autoBackfillHolidayCalendar.js`, `test_autoBackfillCoverageService.js`,
`test_autoBackfillCoverageExceptionService.js`, `test_autoBackfillQueueService.js`.

**Frontend** — `autoBackfillUiHelpers.js` (`resolveNoCodeStatus` → 4 labels + legacy aliases;
`groupItemsByIndicatorAndMonth` → 4 buckets plus a `processed`/`unprocessed` roll-up; missing
filters become `status === 'INCOMPLETE' || status === 'DATA_ERROR'`) ·
`AutoBackfillOperatorPanel.jsx` (4-option filter dropdown; `isSelectable()` predicate per 4.1;
reimport payload; `isActionableForExemption`; accordion "đã xử lý xong" condition becomes
`completed + excluded === total`) · `AutoBackfillOperatorPanel.test.js`.

**Docs** — `AUTO-BACKFILL-UI_PLAN.md` §4 (frozen delta, decision D3), this document, the
manifest, `PROJECT_SNAPSHOT.md`, `PROJECT_PROGRESS.md`.

**Not touched** — schema, migrations, completion policies, queue executor, Safety / Gate 5,
F1.3, KPI/SSOT, networkMap.

## 8. Replacing the frozen 6-state document

`AUTO-BACKFILL-UI_PLAN.md` §4 is a frozen document, so it requires an explicit
frozen-document delta approved by PO/CTO (decision D3). Proposed method: replace the 6-row
table with the 4-row PO-facing table plus the processed/unprocessed grouping, and **keep the
original 6-row table immediately below under a `SUPERSEDED (2026-08-27)` heading** with a
column mapping each old state to its new group. History stays auditable instead of being
deleted, and a later reader sees why it changed.

## 9. Test plan

**Backend** — each raw branch maps to exactly one PO status (4 cases); holiday + `MISSING` →
`EXCLUDED`; holiday + real `SUCCESS` → `COMPLETED` (holiday ignored); ACTIVE exception →
`EXCLUDED`; **revoke → `INCOMPLETE` and queue-eligible again**; `queue_eligible === false` for
`EXCLUDED` and `DATA_ERROR`; `POST /runs` without opt-in skips `EXCLUDED`, with opt-in accepts
it; the 4 `counts` buckets sum to `total_items`; **processed (`COMPLETED`+`EXCLUDED`) +
unprocessed (`INCOMPLETE`+`DATA_ERROR`) === `total_items`**; F1.3 and F4.1 behave identically;
`selectable` returns only `INCOMPLETE` + `DATA_ERROR`.

**Frontend** — the 4 badges render the correct Vietnamese labels; KPI, accordion and filter
show only 4 statuses; **`COMPLETED` and `EXCLUDED` have no checkbox and cannot enter
`selectedBulkKeys` through any path** (table view, accordion view, select-all, per-lane
modal); `DATA_ERROR` is selectable and offers "Nhập lại" and exception confirmation;
`EXCLUDED` shows its own count but contributes 0 to "chưa hoàn tất"; regression on `5d196ff`:
holiday keeps "Thu hồi LỊCH NGHỈ" and "Nhập lại" and never shows "Xác nhận Không phát sinh".

**Baselines to hold** — backend ≥189, frontend ≥21, **Gate 5 `test_autoBackfillSafety.js`
11/11, file not opened or modified.**

## 10. Acceptance criteria

1. UI, KPI counts, accordion, filters and reports show only the 4 statuses.
2. The 4 counts sum to `total_items`; processed + unprocessed also sums to `total_items`.
3. Live numbers match the Section 3 projection: 490 / 442 / 20 / 0.
4. "Chọn tất cả chưa hoàn tất" returns only `INCOMPLETE` + `DATA_ERROR`, across all pages.
5. `COMPLETED` and `EXCLUDED` cannot be selected through any UI path.
6. `EXCLUDED` is visible with its own count and contributes 0 to every "chưa hoàn tất" total.
7. `EXCLUDED` never produces an automatic queue job and never re-offers exception confirmation.
8. Revoking a holiday or exception returns a data-less day to `INCOMPLETE` and re-enables the
   automatic queue for it.
9. A day with real committed data is `COMPLETED` regardless of any holiday or exception.
10. `DATA_ERROR` contains only days that were actually imported; never a day never imported.
11. Gate 5 intact; Safety behavior unchanged.

## 11. Open decisions (NOT resolved by this delta)

| # | Decision | Recommendation | Status |
| --- | --- | --- | --- |
| D1 | `EXCLUDED` must not auto-queue, but "Nhập lại" must still work — and both go through `POST /runs`, filtered by the same `queue_eligible` ([autoBackfillQueueService.js:104](../../../backend/src/services/autoBackfillQueueService.js#L104)). Without an explicit opt-in, "Nhập lại" on an `EXCLUDED` day returns **409 `AUTO_BACKFILL_NO_EXECUTABLE_COVERAGE`**. | Add an explicit opt-in body field (`include_excluded: true`) passed **only** by the single-date "Nhập lại" handler, never by "Kích hoạt Bù". | **OPEN** |
| D2 | `LEGACY_BASELINE` → `EXCLUDED` or `COMPLETED`? | `EXCLUDED` — it is a confirmed exception, and legacy data was not "import thành công". 0 records exist today, so the decision is reversible at no cost. | **OPEN** |
| D3 | Approve the frozen-document delta to `AUTO-BACKFILL-UI_PLAN.md` §4 (6 → 4) using the method in Section 8. | Approve. | **OPEN** |
| D4 | Does `DATA_ERROR` keep its checkbox and exception-confirmation action? | Yes. | **ANSWERED by this delta** — "DATA_ERROR vẫn được chọn để PO nhập lại hoặc xử lý ngoại lệ". |

D1 in particular must be settled before implementation begins: it is the one item that can
silently break a PO-visible action that a previous PO decision explicitly required to keep.

## 12. Not done by this document

No code, schema, database, migration, API or frontend change. `AUTO-BACKFILL-UI_PLAN.md`
remains untouched pending decision D3. No Portal, queue, or business-data operation was
performed. No PO acceptance is claimed.
