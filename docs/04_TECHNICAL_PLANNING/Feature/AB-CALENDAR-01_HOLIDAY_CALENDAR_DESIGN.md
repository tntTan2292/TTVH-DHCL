# AB-CALENDAR-01 — LỊCH NGHỈ (Holiday Calendar) — Design Proposal

Status: **IMPLEMENTED (manifest Sections 39-44) — PO DECISIONS 2 & 4 SUPERSEDED (2026-08-27)**

> [!IMPORTANT]
> **Partially superseded.** The Product Owner has since replaced the coverage status model
> with exactly 4 PO-facing statuses (`COMPLETED` / `INCOMPLETE` / `EXCLUDED` / `DATA_ERROR`)
> and ruled that `EXCLUDED` counts as operationally finished work. That supersedes
> **PO decision 2** (do not block the automatic queue — an excluded day is now never
> auto-queued) and **PO decision 4** (no distinct badge — an excluded day now shows
> **"Được loại trừ"**). PO decisions 1 and 3, and Sections 1-8 below, remain in force.
>
> Current design of record: `AB-CALENDAR-01_4_STATUS_MODEL_DESIGN.md`.

Author: Claude Code (executor) → Claude/CTO → Product Owner
Branch context: `codex/da-impl-006`
Scope class: cross-indicator behavior change → not eligible for self-pass under `CODEX_PROMPT_STANDARD` §13.2.

---

## 1. Problem

`auto_backfill_coverage_exception` excludes coverage **per `(indicator, source_lane, business_date)` tuple**. A day with no operations must therefore be exempted once per lane, per indicator — and PO has confirmed that an exemption recorded on F1.3 does not, and must not, silently transfer to F4.1 under the current model.

PO requirement: mark a **day** as LỊCH NGHỈ **once**, indicator-agnostic; every indicator then skips that day when the operator presses *"Chọn tất cả chưa hoàn tất"* — **but** the day must never be hidden or blocked if real data actually exists for some indicator on that day.

## 2. Core design principle

LỊCH NGHỈ is a **derived overlay over a shared calendar fact**, not a per-tuple exception record.

- It is **not** written into `auto_backfill_coverage_exception` and never satisfies a coverage-exception audit.
- It is evaluated **at scan time**, so it self-corrects: the moment real data lands for that day, the day reverts to its true state with no revoke needed.
- It is a **scheduling** fact ("no operations were expected"), not a **data-verification** fact ("we proved the source returned 0 rows" = `VERIFIED_NO_DATA`, which requires the 5-point adapter proof). These two must stay visibly distinct — see R3.

## 3. Schema — `auto_backfill_holiday_calendar`

Mirrors the `AUTO-BACKFILL-COVERAGE-EXCEPTION` persistence pattern (revoke-not-delete + append-only event log), minus indicator/lane.

```sql
CREATE TABLE IF NOT EXISTS auto_backfill_holiday_calendar (
    id            TEXT PRIMARY KEY,
    business_date TEXT NOT NULL,                 -- YYYY-MM-DD, no indicator, no lane
    reason        TEXT NOT NULL,
    status        TEXT NOT NULL CHECK (status IN ('ACTIVE','REVOKED')) DEFAULT 'ACTIVE',
    created_by    TEXT NOT NULL,
    created_at    TEXT NOT NULL,
    revoked_by    TEXT,
    revoked_at    TEXT,
    revoke_reason TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_auto_backfill_holiday_calendar_active
    ON auto_backfill_holiday_calendar(business_date) WHERE status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS auto_backfill_holiday_calendar_event (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    holiday_id    TEXT NOT NULL,
    event_type    TEXT NOT NULL CHECK (event_type IN ('CREATED','REVOKED')),
    business_date TEXT NOT NULL,
    reason        TEXT,
    actor         TEXT NOT NULL,
    created_at    TEXT NOT NULL,
    FOREIGN KEY(holiday_id) REFERENCES auto_backfill_holiday_calendar(id)
);
```

Plus the same no-DELETE / no-UPDATE-after-REVOKE / append-only triggers used by `migrate_auto_backfill_coverage_exception_schema.js`.

Delivery: new `backend/migrate_auto_backfill_holiday_calendar_schema.js`, wired in `backend/server.js` next to `applyAutoBackfillCoverageExceptionSchema`, and added to `backend/src/db/schema.sql`.

> PO asked for exactly `(business_date, reason, created_by, created_at)` and an "xoá" API. The proposal keeps those four as the meaningful payload but recommends **revoke instead of hard delete** — one holiday row changes what all four lanes report as missing, so the change must be attributable. The UI still shows a single "Xoá" button; it maps to REVOKE. → **PO decision 1**.

## 4. Overlay in `AutoBackfillCoverageService.scan()`

New `backend/src/services/autoBackfillHolidayCalendarService.js` exposing `loadActiveHolidayMap({ fromDate, toDate })`, deliberately modeled on `loadActiveExceptionMap()`: one batched query, returns an empty `Map` when the injected `db` has no `.all` (unit-test doubles), never throws.

In `scan()`, one extra load next to the existing `exceptionMap` load, then per item — **after** the existing exception resolution, never replacing it:

```
holiday =
   (!exception
    && completion.status === COMPLETION_STATUSES.MISSING
    && holidayMap.get(businessDate)) || null
```

Precedence, strictly: **real committed data (SUCCESS) > ACTIVE coverage exception > LỊCH NGHỈ**.
`completion.status !== MISSING` ⇒ the holiday is ignored entirely — this is what satisfies *"không chặn nhập nếu ngày đó thực ra có dữ liệu thật"*.

Emitted **additively**; `status` and the `counts` object are **not** changed:

| field | level | meaning |
| --- | --- | --- |
| `holiday` | item | `{ business_date, reason, created_by, created_at }` or `null` |
| `counts_as_missing` | item | `false` when SUCCESS, exception, or holiday; else `true` |
| `holiday_skipped_count` | lane group | how many days the calendar removed from "còn thiếu" |

`selectable` and row rendering are untouched: a LỊCH NGHỈ day stays visible and stays manually selectable ("Nhập lại" still works). Only the *default* selection set and the "còn thiếu" arithmetic change.

`queue_eligible` is **left unchanged** in this proposal — see R4, **PO decision 2**.

## 5. API surface

Routes in `backend/src/routes/importRoutes.js`, guards matching the exception routes (`requireAuth` for read, `adminOnly` for write):

| Method | Path | Body / Query |
| --- | --- | --- |
| `GET` | `/api/import/auto-backfill/holiday-calendar` | `?from=&to=&status=` |
| `POST` | `/api/import/auto-backfill/holiday-calendar` | `{ business_date, reason }` → 201 |
| `POST` | `/api/import/auto-backfill/holiday-calendar/:id/revoke` | `{ reason }` |

Validation: `normalizeBusinessDate()`; upper bound = yesterday in `Asia/Ho_Chi_Minh` (same clock rule as `resolveTuple`). **No lower bound tied to any indicator's `trackingStartDate`** — the calendar is indicator-agnostic and a holiday may legitimately predate one indicator while postdating another. This is an intentional divergence from `resolveTuple()` and must be stated in the ticket.

Authorization note: `AutoBackfillCoverageExceptionService` gates per-lane via `permissions.runControlRoles` from the registry. A holiday has no lane, so the **route-level admin guard is the only gate**. Accepted simplification, recorded here deliberately.

## 6. "Chọn tất cả chưa hoàn tất" — cross-page API

New: `GET /api/import/auto-backfill/coverage/selectable?indicator=&lane=&month=YYYY-MM`

```json
{ "indicator": "F41", "lane": "HUE", "month": "2026-07",
  "items": [{ "indicator": "F41", "source_lane": "HUE", "business_date": "2026-07-03" }],
  "total_candidates": 31,
  "excluded_holiday":   [{ "business_date": "2026-07-05", "reason": "Nghỉ lễ" }],
  "excluded_exception": [{ "business_date": "2026-07-11", "exception_type": "PO_EXEMPTED" }] }
```

A thin wrapper over `scan()` — filter by month, keep `counts_as_missing === true`. **No duplicated eligibility logic.** Keys use the same `indicator|source_lane|business_date` composite as the panel's `getItemKey`, so the frontend can seed `selectedBulkKeys` directly and selection becomes correct across pages. `excluded_*` is returned so the operator can see what was dropped rather than silently losing days.

Cost: `scan()` evaluates **every** date from `trackingStartDate` to yesterday for every lane, one completion-policy query per tuple. A month-scoped call therefore pays the full-history cost. Recommend adding optional `fromDate`/`toDate` narrowing to `scan()` in the same ticket (additive, default = current behavior).

## 7. Risk review

| # | Risk | Mitigation |
| --- | --- | --- |
| R1 | `COVERAGE_STATUSES` is the **frozen 6-state model** (`AUTO-BACKFILL-UI_PLAN.md` §4). A 7th status would break the freeze and every frontend badge/filter/switch. | Additive `holiday` field only; `status` stays `TRUE_MISSING`. Consequence: without a UI badge a LỊCH NGHỈ day still *looks* missing → **PO decision 4**. |
| R2 | **Blast radius.** One row instantly and retroactively changes what all four lanes report as missing. A mistyped date silently hides real gaps everywhere at once. | Append-only event log; revoke not delete; list API; `excluded_holiday` surfaced in the select-all response. |
| R3 | **Semantic collision with `VERIFIED_NO_DATA`**, which demands the 5-point adapter proof and `confirmedRowCount === 0`. LỊCH NGHỈ demands no proof — operators could use it to bypass that bar. | Never persist LỊCH NGHỈ as a coverage exception; never let it satisfy an exception audit; distinct label/badge; documented as a scheduling fact. |
| R4 | **Queue divergence.** `autoBackfillQueueService` enqueues from `coverage.items.filter(queue_eligible)`. Leave it unchanged → automation still creates jobs for a day marked nghỉ. Change it → holidays become permanently unreachable by automation even if data later appears at the source. | Recommend leaving `queue_eligible` unchanged (faithful to the literal ask, and preserves "không chặn"). **PO decision 2.** |
| R5 | **Two different "chưa hoàn tất" surfaces.** The button carrying that exact label today lives in `DataImportCenter.jsx`, fed by legacy `/import/dkcl/{hue,tct}/f13/missing-dates` (F1.3 only, window-scoped, no month pagination). The indicator × month paginated surface is `AutoBackfillOperatorPanel.jsx` (coverage scan). Patching only one leaves the two screens disagreeing about the same F1.3 date. | **PO decision 3.** Recommend: coverage panel first, then the same overlay on both legacy endpoints inside the same ticket. |
| R6 | **Date/timezone boundary.** | String-compare normalized ISO dates only; no `Date` arithmetic in the overlay; reject future dates at write time. |
| R7 | **Existing tests.** `scan()` is unit-tested with db doubles lacking `.all`. | New loader degrades to an empty map exactly like `loadActiveExceptionMap`; `test_autoBackfillCoverageService.js` and `test_autoBackfillCoverageExceptionService.js` must pass unmodified. |
| R8 | **Schema drift** between fresh DBs and the live DB. | Dedicated migration script + `server.js` wiring + `schema.sql`, mirroring the exception migration, with its own migration test. |

## 8. Validation plan (on approval)

- `migrate_auto_backfill_holiday_calendar_schema.test.js` — table, partial unique index, no-delete / append-only triggers.
- Holiday service unit tests — create, duplicate-active 409, revoke, revoked-immutable, future-date reject, empty-map degradation.
- Overlay tests in the coverage suite — 4 cases: holiday + MISSING ⇒ excluded; holiday + SUCCESS ⇒ untouched; holiday + MANUAL_REVIEW_REQUIRED ⇒ untouched; holiday + ACTIVE exception ⇒ exception wins.
- Select-all API test — cross-page, month-scoped, `excluded_holiday` populated.
- Regression: existing coverage, exception, queue and safety suites stay green (no change to `COVERAGE_STATUSES`, `counts`, or `queue_eligible`).

## 9. Câu hỏi cần Product Owner quyết (4)

1. **Xoá cứng hay thu hồi?** Đề xuất: nút "Xoá" trên giao diện, nhưng bên dưới là *thu hồi* + ghi nhật ký, để truy được ai đã bỏ ngày nghỉ đó.
2. **LỊCH NGHỈ có chặn hàng đợi tự động không**, hay chỉ ảnh hưởng nút "Chọn tất cả chưa hoàn tất"? Đề xuất: **chỉ ảnh hưởng nút chọn**, không chặn hàng đợi.
3. **Áp dụng cho màn hình nào?** Chỉ màn Coverage (chỉ tiêu × tháng), hay cả màn Nhập dữ liệu F1.3 cũ (Huế/TCT)? Đề xuất: cả hai, trong cùng một ticket.
4. **Ngày LỊCH NGHỈ hiển thị thế nào?** Vẫn hiện như "Thiếu" nhưng có nhãn "Lịch nghỉ", hay ẩn khỏi danh sách? Đề xuất: **vẫn hiện, có nhãn riêng** — ẩn đi sẽ che mất ngày thực sự có dữ liệu phát sinh.

## 10. Not done by this document

No code, no schema, no migration, no route, no snapshot/progress/index update. `PROJECT_SNAPSHOT.md`, `PROJECT_PROGRESS.md` and `DOCUMENT_INDEX.md` are deliberately untouched because AB-CALENDAR-01 is not yet an activated ticket; those updates belong to the implementation ticket once the PO approves.
