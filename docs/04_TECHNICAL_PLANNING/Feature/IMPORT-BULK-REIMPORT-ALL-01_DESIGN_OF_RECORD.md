# IMPORT-BULK-REIMPORT-ALL-01 — Design of Record

- Ticket: `IMPORT-BULK-REIMPORT-ALL-01`
- Version: `DoR v1`
- Status: `DESIGN LOCKED / NOT ACTIVATED FOR IMPLEMENTATION`
- Authority: Product Owner decisions 1–4 received in chat `2026-09-21`, on top of `docs/06_REVIEWS/Import/IMPORT-BULK-REIMPORT-ALL-01_CHECKPOINT_001.md` (Discovery / Read-Only Audit, Sections 1–11) and `docs/10_TICKETS/IMPORT-BULK-REIMPORT-ALL-01_MANIFEST.md` (Sections 1–7)
- Baseline: `codex/da-impl-006` @ `d073427`
- Author: Claude Code (Sonnet 5)
- This document is documentation only. No code, schema, migration, queue action, or database change is authorized by writing it. No implementation may begin without a further, separate Product Owner/CTO activation instruction.

## 1. Scope

In scope: `frontend/src/components/AutoBackfillOperatorPanel.jsx` (the Import tự động / Auto-Backfill operator panel) and its backing `/import/auto-backfill/*` API, queue/store, executors, and `importProcessor.js` write path — the exact chain audited in the checkpoint.

Not in scope / unchanged: `DataImportCenter.jsx` (manual import, its own separately-named "Chọn tất cả" button and its own `forceReimport`/`POST /import/upload` path); KPI definitions and frozen SSOT; RBAC/user administration; `F13-ROUTE-POSTMAN-IDENTITY-01`, `F13-BCVH-MONTHLY-CUMULATIVE-01`, `F41-DASHBOARD-MINIMUM-01`; the existing bulk "Cập nhật dữ liệu - Loại bỏ phát sinh" (PO exemption) action, which is reused unchanged.

## 2. Product Owner decisions (locked, 2026-09-21)

1. **Giữ nguyên "Chọn tất cả chưa hoàn tất".** No change to its button, its backend endpoint, or its scope (`INCOMPLETE` + `DATA_ERROR`, holiday/exception always excluded).
2. **Đổi tên thao tác hiện tại "Nhập lại" thành "Nhập mới" cho các ngày chưa hoàn tất.** Label-only change on every place the current action addresses an `INCOMPLETE`/`DATA_ERROR` (and holiday-override `EXCLUDED`, see §4.3) date — no backend behavior changes for this action, since it already only ever performs a first-time additive import (`forceReimport:false`, `importPipeline.js:183-212`; Checkpoint Section 9.2.A).
3. **Bổ sung "Chọn tất cả" để chọn cả ngày đã hoàn tất; ngày LỊCH NGHỈ luôn bị bỏ qua.** A new button, separate from item 1, whose scope includes `COMPLETED` in addition to `INCOMPLETE`/`DATA_ERROR`, while `EXCLUDED` (holiday) stays permanently excluded from it.
4. **Thêm thao tác "Nhập lại" cho ngày đã hoàn tất: ngày nào được chọn thì thay dữ liệu cũ của đúng ngày đó bằng dữ liệu mới, không ảnh hưởng ngày khác.** A real, working "Nhập lại" capability for `COMPLETED` dates (today's "Nhập lại" button silently 409s on every `COMPLETED` row — Checkpoint Section 3), scoped so that only the exact selected day's data is replaced.

**Explicit interpretation boundary (not a new business rule, a literal reading of the four decisions above):** decision 3 names only `COMPLETED` and `LỊCH NGHỈ`; it does not mention PO-exception-`EXCLUDED` days (`PO_EXEMPTED`/`VERIFIED_NO_DATA`). The new "Chọn tất cả" therefore selects exactly `COMPLETED + INCOMPLETE + DATA_ERROR`, and continues to exclude every `EXCLUDED` day (holiday and PO-exception alike) exactly as the existing `scan()`/`selectable()` machinery already does. If the Product Owner intends PO-exception days to also become selectable, that is a fifth decision, not yet made.

## 3. Two buttons, two selection states

| | Existing (unchanged) | New |
|---|---|---|
| Button | "Chọn tất cả chưa hoàn tất" (per indicator×month accordion, `AutoBackfillOperatorPanel.jsx:2495-2510`) | "Chọn tất cả" (new, placed alongside the existing button in the same accordion header) |
| Selection state | `selectedBulkKeys` (existing `Set`, `AutoBackfillOperatorPanel.jsx:159`) — **unchanged** | `selectedReimportKeys` (new, separate `Set`) |
| Backend source | `GET /import/auto-backfill/coverage/selectable` — **unchanged** | `GET /import/auto-backfill/coverage/selectable?include_completed=true` (same endpoint, one new optional query param — see §7.1) |
| Scope | `INCOMPLETE` + `DATA_ERROR` only | `COMPLETED` + `INCOMPLETE` + `DATA_ERROR`; `EXCLUDED` (holiday and exception) always omitted |
| Feeds bulk action | "Nhập mới N ngày đã chọn" (renamed from "Nhập lại", §4.1) + the existing, untouched "Cập nhật dữ liệu - Loại bỏ phát sinh" | "Nhập lại N ngày đã chọn" (new capability, §4.2) |
| Per-row checkbox gate | `isSelectable(item)` — **unchanged**, still `INCOMPLETE`/`DATA_ERROR` only | New per-row gate `isReimportSelectable(item)` = `status !== 'EXCLUDED'` (i.e. `COMPLETED`/`INCOMPLETE`/`DATA_ERROR`) |

**Why a separate state, not one shared set (technical decision, made by Claude Code per role split — CLAUDE.md §2):** `selectedBulkKeys` already backs the existing "Cập nhật dữ liệu - Loại bỏ phát sinh" bulk-exemption action (`AutoBackfillOperatorPanel.jsx:760-804`), a feature already `PO UI CHECK PASS`'d under `AUTO-BACKFILL-UI-REMEDIATION`. Widening what can enter that same set to include `COMPLETED` days would make the exemption button clickable against already-completed data, a scope neither this ticket nor that one authorized. A second, independent selection state keeps the new capability's blast radius contained to itself and leaves the existing, accepted feature's contract untouched.

Both selection states use the panel's existing key format `indicator::source_lane::business_date` (`getItemKey()`, `AutoBackfillOperatorPanel.jsx:57`) — no new key scheme.

## 4. Two actions: "Nhập mới" and "Nhập lại"

### 4.1 "Nhập mới" (rename only, decision 2)

Applies wherever the current UI shows "Nhập lại" for a target that is `INCOMPLETE`/`DATA_ERROR`, or a holiday-`EXCLUDED` day being explicitly re-admitted via the existing single-tuple `include_excluded` opt-in (`AutoBackfillOperatorPanel.jsx:683-686`) — all of these already only ever perform a first-time additive import server-side (`forceReimport` stays `false` end-to-end; Checkpoint Section 9.2.A). Renamed surfaces:
- Per-row button (`AutoBackfillOperatorPanel.jsx:1598-1608`, `2560-2570`) — text "Nhập mới", **and** its click handler must now branch by the row's status (§4.3) instead of always opening the one shared modal.
- Bulk floating-bar button (`AutoBackfillOperatorPanel.jsx:1731-1741`, "Nhập lại {N} ngày đã chọn") — text "Nhập mới {N} ngày đã chọn", wired to `selectedBulkKeys` exactly as today.
- Their confirmation modals (`AutoBackfillOperatorPanel.jsx:1834-1881` single-row, `1765-1831` bulk) — title/body text updated to "Nhập mới" wording; no new warning content required (no existing data is at risk — Checkpoint Section 4 already notes this modal has never needed a replace-warning because it structurally can't reach `COMPLETED`).

No backend contract change for this item: `POST /import/auto-backfill/runs` payload shape and `createRun()` behavior are identical to today.

### 4.2 "Nhập lại" (new capability, decisions 3–4)

A new action, reachable two ways:
- **Per row**, on any row whose current status is `COMPLETED` (button only rendered for `COMPLETED`; `INCOMPLETE`/`DATA_ERROR` rows keep the existing "Nhập mới" per §4.1).
- **In bulk**, via the floating bar's new "Nhập lại {N} ngày đã chọn" button, wired to `selectedReimportKeys`, enabled only when at least one selected item's current status is `COMPLETED` (if the selection is entirely `INCOMPLETE`/`DATA_ERROR`, the bulk action from `selectedReimportKeys` behaves identically to "Nhập mới" for those items — see §7.2 for why this is safe to route through the same new endpoint call without a separate code path).

### 4.3 Per-row action routing (single source of truth: current status)

| Row status | Button shown | Label | Request flag |
|---|---|---|---|
| `INCOMPLETE` / `DATA_ERROR` | Nhập mới | "Nhập mới" | none (unchanged) |
| `EXCLUDED` (holiday) | Nhập mới | "Nhập mới" | `include_excluded: true` (unchanged, `AutoBackfillOperatorPanel.jsx:683-686`) |
| `EXCLUDED` (PO exception) | *(unchanged — no reimport action offered today; out of this ticket's scope per §2 boundary note)* | — | — |
| `COMPLETED` | Nhập lại | "Nhập lại" | `confirm_replace_completed: true` (new, §7.2) |

## 5. Confirmation warning before "Nhập lại" (decision 4's "thay dữ liệu cũ… không ảnh hưởng ngày khác")

Both the single-row and bulk "Nhập lại" modals must, at minimum:
- State explicitly, per selected item, that it is `COMPLETED` today and that its existing data **will be deleted and replaced**, scoped to exactly that `indicator × source_lane × business_date` (never another date, never another lane on the same date — the technical guarantee behind this wording is §8's delete-scope fix).
- Show, where available from the coverage scan already fetched (`item.evidence`, `autoBackfillCoverageService.js:256`), the current committed row count for that date so the operator sees the concrete scale of what will be removed.
- Require a second, explicit acknowledgment (a distinct checkbox, e.g. "Tôi hiểu dữ liệu ngày này sẽ bị xóa và thay thế") before the primary confirm button becomes enabled — the button must not be clickable on modal open.
- For the bulk modal: show the same per-item list already used today (`AutoBackfillOperatorPanel.jsx:1786-1797`), with each `COMPLETED` item visually flagged (e.g. a status chip) so a mixed batch (some `COMPLETED`, some `INCOMPLETE`) is legible at a glance, plus a summary count split by status ("X ngày sẽ nhập mới, Y ngày ĐÃ HOÀN TẤT sẽ bị thay thế").

Exact copy wording is a UI-content decision for implementation (Antigravity, per CLAUDE.md §2 role split), not fixed verbatim by this DoR; the structural requirements above are locked.

## 6. LỊCH NGHỈ exclusion rule (decision 3)

No new logic required — reuse the existing, already-audited server-side chain unchanged (Checkpoint Section 5):
- `resolveHoliday()` / `toPoStatus()` (`autoBackfillCoverageService.js:59-126`) already force any holiday-marked day to PO status `EXCLUDED`.
- `scan()`/`selectable()` (`autoBackfillCoverageService.js:160-399`) already omit `EXCLUDED` items from every "selectable" candidate list.
- The new `include_completed=true` query parameter (§7.1) only widens the status filter from `{INCOMPLETE, DATA_ERROR}` to `{COMPLETED, INCOMPLETE, DATA_ERROR}` — it does not touch the `EXCLUDED` exclusion, which stays absolute.

This is the one item in the ticket's four decisions that requires **zero** backend change.

## 7. Frontend → backend flow

### 7.1 Selection ("Chọn tất cả")

`handleSelectAllReimport(indicator, month)` (new, parallel to the existing `handleSelectAllUnfinished()`, `AutoBackfillOperatorPanel.jsx:247-292`) calls `GET /import/auto-backfill/coverage/selectable` with the same `indicator`/`month`/`lane` params plus a new `include_completed=true`. `AutoBackfillCoverageService.selectable()` (`autoBackfillCoverageService.js:351-399`) gains one new optional parameter:

```js
async selectable({ indicator = null, lane = null, month = null, roles = null, includeCompleted = false } = {}) {
    ...
    const isCandidate = (item) => item.counts_as_unprocessed || (includeCompleted && item.status === 'COMPLETED');
    return {
        ...
        items: scoped.filter(isCandidate).map(...),
        excluded_holiday: ...,      // unchanged
        excluded_exception: ...,    // unchanged
        excluded_complete: includeCompleted ? 0 : scoped.filter((item) => item.status === 'COMPLETED').length,
    };
}
```

Reusing the one existing endpoint/method (versus a new endpoint) is a technical choice: the underlying `scan()` result and every exclusion rule are identical; only the status filter widens. `excluded_complete` becomes `0` when `includeCompleted` is true, so the toast/summary logic (`AutoBackfillOperatorPanel.jsx:272-286`) naturally stops reporting "N ngày hoàn tất" as excluded once they are actually included — no separate reporting path needed.

### 7.2 Execution ("Nhập lại")

Both the per-row and bulk "Nhập lại" handlers call the same `POST /import/auto-backfill/runs` endpoint already used today, adding one new optional field:

```json
{ "indicator": "...", "lane": "...", "from_date": "YYYY-MM-DD", "to_date": "YYYY-MM-DD", "confirm_replace_completed": true }
```

Bulk "Nhập lại" keeps the existing client-side per-item-loop pattern (`handleExecuteBulkReimport`, `AutoBackfillOperatorPanel.jsx:807-856`): one `createRun` call per selected `(indicator, lane, date)` tuple, `from_date === to_date`, catching and reporting per-item success/failure exactly as today. This is a deliberate reuse of the existing, already-`PO UI CHECK PASS`'d partial-failure reporting pattern (Checkpoint Section 3), not a new batch endpoint. `confirm_replace_completed` is sent unconditionally by the "Nhập lại" action for every item in its loop; for an item that turns out to already be `INCOMPLETE`/`DATA_ERROR` at request time, the flag is simply inert (§7.3's eligibility check only branches on it when the item is `COMPLETED`), so no separate code path is needed to handle a mixed `selectedReimportKeys` batch.

`confirm_replace_completed` is accepted only for a single-tuple request (`indicator` + `lane` + `from_date === to_date`), mirroring the existing `include_excluded` constraint (`autoBackfillQueueService.js:103-114`) and enforced the same way (`400 AUTO_BACKFILL_CONFIRM_REPLACE_REQUIRES_SINGLE_TUPLE` on violation).

### 7.3 Backend eligibility (`createRun`)

`AutoBackfillQueueService.createRun()` (`autoBackfillQueueService.js:100-192`) gains a new admission function parallel to `isReadmissibleExcluded()`:

```js
const isReadmissibleCompleted = (item) => {
    if (!confirmReplaceCompleted || item.status !== 'COMPLETED') return false;
    const { indicator: registeredIndicator, lane: registeredLane } = this.findRegistration(item.indicator, item.source_lane);
    return registeredIndicator.status === 'ACTIVE' && registeredLane.automationMode === 'AUTOMATED';
};
const eligible = coverage.items
    .filter(inRange)
    .filter((item) => item.queue_eligible || isReadmissibleExcluded(item) || isReadmissibleCompleted(item));
```

Same preconditions `isReadmissibleExcluded` already requires (active indicator, automated lane, verified executor) — a `COMPLETED` day for a `PAUSED` indicator or a `MANUAL_ONLY` lane must not become reimportable through this flag, exactly as a holiday day can't today. No completion-status precondition is applied here (unlike `isReadmissibleExcluded`, which requires the raw status to still be `MISSING`) — the whole point of this admission path is that the raw status is `SUCCESS`.

### 7.4 Job-level flag and the safety-critical pre-execution recheck

`auto_backfill_job` gains one new additive column, `force_reimport INTEGER NOT NULL DEFAULT 0` (idempotent migration, matching the pattern of every prior additive Auto-Backfill migration), set to `1` at job-creation time (`createRunWithJobs()`, `autoBackfillQueueStore.js:147-249`) for every job admitted via `isReadmissibleCompleted()`.

**This is the single safety-critical change in the whole design.** `processNext()`'s pre-execution completion recheck (`autoBackfillQueueService.js:361-368`) currently *unconditionally* treats a `SUCCESS` completion as "skip, don't execute" (`SKIPPED_ALREADY_SUCCESS`) — this is the exact mechanism that today makes reimporting a `COMPLETED` date impossible even if a job for it were somehow created (Checkpoint Section 9.2.B). It must become:

```js
const before = await this.evaluateCompletion(job);
if (before.status === COMPLETION_STATUSES.SUCCESS && !job.force_reimport) {
    // unchanged SKIPPED_ALREADY_SUCCESS path
}
// otherwise (MISSING, or SUCCESS-with-force_reimport): proceed to executor
```

The executor call itself must then pass `forceReimport: Boolean(job.force_reimport)` instead of the current hard-coded literal `false` at every executor call site (`autoBackfillF13Executors.js:117`, `autoBackfillF41Executors.js:62`, and the adapters/single-date services they call into — Checkpoint Section 9.3's full citation list). This is the only place in the entire executor chain where the literal `false` changes to a value that can be `true`; every other Auto-Backfill code path (normal "Chọn tất cả chưa hoàn tất" imports, holiday re-admission) keeps `forceReimport: false` exactly as today.

### 7.5 Recovery interaction with `force_reimport` (new design element, not present in the original audit because `force_reimport` did not exist on the Auto-Backfill path before)

`recoverInterruptedWork()` (`autoBackfillQueueService.js:456-479`) resolves an interrupted job by re-checking live completion: if it now reads `SUCCESS`, the job is marked recovered/complete without re-invoking the executor (`resolveRecovery`, `autoBackfillQueueStore.js:970`). For a normal job this is correct — `SUCCESS` after interruption can only mean the import actually finished. **For a `force_reimport` job this check is unsound**: if the job crashes *before* `importParsedData()`'s transaction commits (or the transaction rolls back), the *original, pre-reimport* data is still present and still reads as `SUCCESS` — the generic recovery check cannot distinguish "the reimport completed" from "the reimport never started and the stale data is still there," because both look identical (`SUCCESS`) from the outside.

**Locked design resolution:** `recoverInterruptedWork()` must never resolve a `job.force_reimport = 1` job via the generic completion-match path. Such a job is always unconditionally requeued back to `QUEUED` (not resolved as complete), regardless of what `evaluateCompletion()` currently reports. Correctness is then re-established the normal way: the job re-enters `acquireNextJob()`'s queue, and on its next attempt `processNext()`'s (now force-reimport-aware) pre-execution check at §7.4 runs again and drives a fresh, complete delete-then-insert cycle. This trades a small amount of redundant re-work (at most one extra full reimport of that single date, after a crash that is already a rare event) for the correctness guarantee that a `force_reimport` job is never silently marked done based on stale pre-existing data.

## 8. Delete-scope fix — "thay dữ liệu đúng ngày được chọn, không ảnh hưởng ngày khác" (decision 4, closing Checkpoint Gap 7)

Today, `importProcessor.js`'s forced-reimport delete is scoped by `ngay_do_kiem` alone (`DELETE FROM fact_f13 WHERE ngay_do_kiem = ?`, `importProcessor.js:196-198`, and the equivalent lines for `fact_f13_national`/`fact_f41`/`fact_f41_national`) — table-wide for that date, not scoped to the lane that produced the reimport request. Decision 4's requirement ("thay dữ liệu cũ của đúng ngày đó… không ảnh hưởng ngày khác") is read together with how every existing selection/coverage concept in this panel already works: a "ngày" the operator selects is never a bare calendar date, it is always one `(indicator, source_lane, business_date)` tuple (`getItemKey()`, the coverage `items[]` shape, the `auto_backfill_job` row shape). Applying decision 4 at that same granularity is the correct technical reading, not an invented rule: reimporting one lane's selected day must not delete another lane's committed rows for that same calendar date.

**Locked design:** the forced delete becomes scoped through `import_log`, not the fact table's own columns (the fact tables do not carry a `source_lane` column directly, and adding one is a larger migration against a 800K+-row table that this design avoids):

```sql
DELETE FROM fact_f13
WHERE ngay_do_kiem = ?
  AND import_log_id IN (
    SELECT id FROM import_log
    WHERE ngay_do_kiem = ? AND COALESCE(indicator, 'F1.3') = ? AND source_lane = ?
  )
```

Applied identically (parameterized by the correct fact table / indicator / lane) to all four `importProcessor.js` write functions' forced-delete branches (`importParsedData`, `importNationalParsedData`, `importF41ParsedData`, `importF41NationalParsedData`). This is a query-only change — no schema/migration is required for this fix specifically (only for `auto_backfill_job.force_reimport`, §7.4).

This fix is scoped to the new Auto-Backfill "Nhập lại" contract only (i.e., it is exercised whenever `forceReimport:true` is passed, which after this design is possible both from the new Auto-Backfill path and from the pre-existing manual `POST /import/upload` path). Because the manual path's own reimport semantics are out of this ticket's scope (§1), this DoR does not change *when* the manual path sets `forceReimport:true` — only *what the delete does* once it is set, which benefits both callers identically and does not regress the manual path's existing behavior (it only makes the delete more precise, never less).

## 9. Safety, dedup, and history — reused unchanged unless stated otherwise

- **Active-identity dedup** (`createRunWithJobs()`, `autoBackfillQueueStore.js:147-249`): unchanged. A `force_reimport` job is dedup'd by the same `(indicator, source_lane, business_date)` tuple + `QUEUED/RUNNING/RECOVERY_CHECK` state check as any other job — two concurrent "Nhập lại" requests for the same date cannot both enqueue.
- **Request-key dedup**: unchanged, same scope (in-flight only). A "Nhập lại" submitted again after a prior one already finished is not blocked by this layer by design — the confirmation warning (§5) is the intended human safety gate against an accidental repeat, exactly as decision 4 authorizes intentional repeated reimport.
- **Global concurrency** (`acquireNextJob()`'s `GLOBAL_DKCL` lease + single-`RUNNING`-job guard, `autoBackfillQueueStore.js:360-437`), **per-lane `WAITING_AUTH`/`BLOCKED_INTEGRITY` blocking**, **circuit breaker**, **bounded retry**, **Resume's session re-validation**: all unchanged and apply identically to a `force_reimport` job as to any other job.
- **Cancellation**: unchanged — no cancel endpoint exists for any job today (Checkpoint Section 9.6); this design does not add one. An operator who wants to stop an in-flight "Nhập lại" has the same options as for any other running job (Pause at the run level), no more, no less.
- **Import log / evidence**: unchanged mechanism — `importProcessor.js` writes a fresh `import_log` row for every reimport exactly as it does for a first-time import (Checkpoint Section 9.4), so the full history of every reimport (including prior ones) remains queryable, never overwritten or deleted.
- **New audit distinction**: one new event `reasonCode`, e.g. `REPLACE_COMPLETED_CONFIRMED`, recorded alongside the existing `RUN_CREATED`/`JOB_CREATED` events (`autoBackfillQueueStore.js:138-145`) when a job is admitted via `isReadmissibleCompleted()` — so the append-only `auto_backfill_event` log can distinguish an intentional data-replacing run from a normal first-time-import run without inspecting job internals. Additive only; no existing event type changes meaning.

## 10. Explicitly open items (technical, to be finalized at implementation time, not business rules)

- Exact naming of `confirm_replace_completed` and the new `force_reimport` column/event reason code — proposed here, confirmable/renameable by the implementing executor without a new PO decision (pure technical naming).
- Exact UI copy for the confirmation warning (§5) — structure is locked, wording is not.
- Whether the new "Nhập lại" per-row button also needs a distinct icon/color from "Nhập mới" for operator clarity — a UI/UX call for Antigravity, not fixed here.
- `PO_EXEMPTED`/`VERIFIED_NO_DATA` `EXCLUDED` days remain out of both new selection states per §2's boundary note; if the Product Owner later wants them included, that is a new, separate decision requiring its own DoR delta.

## 11. Explicitly not authorized by this document

- No frontend or backend code, test, schema, or migration is written or changed by this DoR.
- No selection, enqueue, reimport, Resume, Retry, cancellation, or business-data write is performed.
- No PO PASS, technical or UI, is claimed or awarded.
- Implementation requires a further, separate, explicit Product Owner/CTO activation instruction, and per `CLAUDE.md` role split, executor assignment (Claude Code: backend/data/tests; Antigravity: UI/UX) at that time.
