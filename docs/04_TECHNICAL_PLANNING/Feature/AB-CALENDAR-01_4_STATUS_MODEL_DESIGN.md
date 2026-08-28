# AB-CALENDAR-01 — 4-Status PO Coverage Model — Design of Record

Status: **DESIGN OF RECORD — ALL DECISIONS APPROVED, READY FOR IMPLEMENTATION**
(this document itself is documentation-only; no code or database changed by it)
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
| 3 | `EXCLUDED` | **Được loại trừ** | LỊCH NGHỈ / holiday, or a confirmed exception meaning no data is expected |
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
| `EXCLUDED` | an ACTIVE holiday, `PO_EXEMPTED` or `VERIFIED_NO_DATA`, on a day that is not already `COMPLETED` | no valid data, and PO has confirmed none is expected |
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
| `LEGACY_DATA_PRESENT_WITHOUT_EVIDENCE` | `COMPLETED` (decision D2) |

### 2.1 The `EXCLUDED` rule, and the one exception to it (decision D2)

The rule is: **an ACTIVE holiday, `PO_EXEMPTED`, or `VERIFIED_NO_DATA` → `EXCLUDED`.** All three
mean the same operational thing — no data exists, and PO has confirmed none is expected.

`LEGACY_BASELINE` is deliberately **not** in that list. It is only ever recorded when committed
rows already exist (`rowCount > 0`), and it is PO's own confirmation that this legacy data is
valid despite not passing the strict integrity gate. Per PO's rule — **valid data present = Đã
hoàn tất** — such a day maps to `COMPLETED`, not `EXCLUDED`.

**Implementation guard.** The mapping is conditional on data actually being there: apply
`LEGACY_BASELINE → COMPLETED` only while `evidence.row_count > 0`. If the data were ever removed
afterwards, the exception no longer asserts anything true, and the day must fall through to the
normal mapping for its raw status (`INCOMPLETE` or `DATA_ERROR`) rather than silently claiming
completion.

The specific reason stays visible as a secondary chip (`LỊCH NGHỈ: <reason>`, `Dữ liệu cũ đã
có`, …), so no information is lost — only badges are consolidated.

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
| `EXCLUDED` | **Never** | **No** | Yes, via the narrow opt-in in 4.2 | **No** | No |
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

### 4.2 Reimporting an `EXCLUDED` day — the narrow opt-in (decision D1, APPROVED)

`EXCLUDED` must never be picked up by the automatic sweep, yet "Nhập lại" must keep working on
an excluded day. Both go through `POST /import/auto-backfill/runs`, filtered by the same
`queue_eligible` ([autoBackfillQueueService.js:104](../../../backend/src/services/autoBackfillQueueService.js#L104)),
so without an opt-in a reimport of an excluded day would return
**409 `AUTO_BACKFILL_NO_EXECUTABLE_COVERAGE`**.

Approved rule:

- The request body may carry `include_excluded: true`.
- The backend accepts it **only** when the request resolves to **exactly one indicator, exactly
  one source lane, and exactly one business date** — i.e. `indicator`, `lane`, `from_date` and
  `to_date` are all present and `from_date === to_date`.
- Any broader request carrying `include_excluded` — missing indicator, missing lane, a date
  range spanning more than one day, or no date bounds at all — **must be rejected**, not
  silently narrowed. Reject with a dedicated error code (e.g.
  `AUTO_BACKFILL_INCLUDE_EXCLUDED_REQUIRES_SINGLE_TUPLE`), never a generic 409.
- The automatic sweep ("Kích hoạt Bù") **never** sends the flag.
- The flag re-admits an excluded day only if it is otherwise fully runnable; it never bypasses
  a genuine block such as `MANUAL_ONLY`, an unverified executor, or an inactive indicator.

This keeps the blast radius of the flag to a single tuple that an admin explicitly picked, which
is precisely the "Nhập lại" gesture.

### 4.3 Revoke returns the day to `INCOMPLETE` — already true, no code needed

The holiday/exception overlay is derived inside `scan()` and never persisted per tuple.
Revoking a holiday or exception makes the overlay resolve to `null` on the next scan, so a
day with no data falls straight back to `INCOMPLETE` and becomes queue-eligible again. This
needs a **test to lock it**, not an implementation.

### 4.4 Internal technical detail stays internal

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
`autoBackfillQueueController.js` (the narrow `include_excluded` opt-in and its single-tuple
validation, Section 4.2) · tests:
`test_autoBackfillHolidayCalendar.js`, `test_autoBackfillCoverageService.js`,
`test_autoBackfillCoverageExceptionService.js`, `test_autoBackfillQueueService.js`.

**Frontend** — `autoBackfillUiHelpers.js` (`resolveNoCodeStatus` → 4 labels + legacy aliases;
`groupItemsByIndicatorAndMonth` → 4 buckets plus a `processed`/`unprocessed` roll-up; missing
filters become `status === 'INCOMPLETE' || status === 'DATA_ERROR'`) ·
`AutoBackfillOperatorPanel.jsx` (4-option filter dropdown; `isSelectable()` predicate per 4.1;
reimport payload; `isActionableForExemption`; accordion "đã xử lý xong" condition becomes
`completed + excluded === total`) · `AutoBackfillOperatorPanel.test.js`.

**Docs** — `AUTO-BACKFILL-UI_PLAN.md` §4 (frozen delta, already applied — Section 8), this document, the
manifest, `PROJECT_SNAPSHOT.md`, `PROJECT_PROGRESS.md`.

**Not touched** — schema, migrations, completion policies, queue executor, Safety / Gate 5,
F1.3, KPI/SSOT, networkMap.

## 8. Replacing the frozen 6-state document

`AUTO-BACKFILL-UI_PLAN.md` §4 is a frozen document. The frozen-document delta was **approved
(decision D3) and has been applied**: §4 now carries the 4-row PO-facing table plus the
processed/unprocessed grouping, and the original 6-row table is preserved immediately below
under a `SUPERSEDED (2026-08-27)` heading with a column mapping each old state to its new PO
status. History stays auditable instead of being deleted, and a later reader sees why it
changed.

## 9. Test plan

**Backend** — each raw branch maps to exactly one PO status (4 cases); holiday + `MISSING` →
`EXCLUDED`; holiday + real `SUCCESS` → `COMPLETED` (holiday ignored); ACTIVE exception →
`EXCLUDED`; **`LEGACY_BASELINE` with rows present → `COMPLETED`**, and the same exception with
`row_count === 0` falls through to `INCOMPLETE`/`DATA_ERROR` instead of claiming completion;
**revoke → `INCOMPLETE` and queue-eligible again**; `queue_eligible === false` for `EXCLUDED`
and `DATA_ERROR`; the 4 `counts` buckets sum to `total_items`; **processed
(`COMPLETED`+`EXCLUDED`) + unprocessed (`INCOMPLETE`+`DATA_ERROR`) === `total_items`**; F1.3 and
F4.1 behave identically; `selectable` returns only `INCOMPLETE` + `DATA_ERROR`.

**`include_excluded` (Section 4.2)** — `POST /runs` without the flag skips `EXCLUDED`; with the
flag and exactly one indicator + lane + business date it accepts the excluded day; and it is
**rejected** for every broader shape: missing indicator, missing lane, `from_date !== to_date`,
or no date bounds. Also assert the flag never bypasses `MANUAL_ONLY`, an unverified executor, or
an inactive indicator.

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
3b. A `LEGACY_BASELINE` day with data present reads `COMPLETED`, never `EXCLUDED`.
3c. `include_excluded` is honoured for a single indicator+lane+date and rejected for anything
    broader; the automatic sweep never sends it.
4. "Chọn tất cả chưa hoàn tất" returns only `INCOMPLETE` + `DATA_ERROR`, across all pages.
5. `COMPLETED` and `EXCLUDED` cannot be selected through any UI path.
6. `EXCLUDED` is visible with its own count and contributes 0 to every "chưa hoàn tất" total.
7. `EXCLUDED` never produces an automatic queue job and never re-offers exception confirmation.
8. Revoking a holiday or exception returns a data-less day to `INCOMPLETE` and re-enables the
   automatic queue for it.
9. A day with real committed data is `COMPLETED` regardless of any holiday or exception.
10. `DATA_ERROR` contains only days that were actually imported; never a day never imported.
11. Gate 5 intact; Safety behavior unchanged.

## 11. Approved decisions

All four decisions are settled. Nothing in this design is awaiting CTO or PO input.

| # | Decision | Resolution | Where specified |
| --- | --- | --- | --- |
| D1 | How to keep "Nhập lại" working on an `EXCLUDED` day while the automatic sweep never touches it | **APPROVED** — `include_excluded: true`, accepted **only** for exactly one indicator + one lane + one business date; broader requests are rejected outright; the automatic sweep never sends it | Section 4.2 |
| D2 | `LEGACY_DATA_PRESENT_WITHOUT_EVIDENCE` → which PO status? | **APPROVED** — `COMPLETED`, whenever valid data exists. PO rule: valid data present = Đã hoàn tất | Section 2.1 |
| D3 | Amend the frozen `AUTO-BACKFILL-UI_PLAN.md` §4 from 6 to 4 PO-facing statuses | **APPROVED and applied** — old table preserved under `SUPERSEDED` for audit | Section 8 |
| D4 | Does `DATA_ERROR` keep its checkbox and exception action? | **APPROVED** — remains selectable; may be reimported or converted to `EXCLUDED` | Section 4 |

## 12. Not done by this document

No code, schema, database, migration, API or frontend change was made by this document or by
the ticket that approved these decisions. `AUTO-BACKFILL-UI_PLAN.md` §4 was amended as an
approved frozen-document delta (documentation only). No Portal, queue, or business-data
operation was performed. Implementation of the 4-status model has not started, and no PO
acceptance is claimed.
