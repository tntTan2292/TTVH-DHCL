# IMPORT-BULK-REIMPORT-ALL-01 — Design of Record

- Ticket: `IMPORT-BULK-REIMPORT-ALL-01`
- Version: `DoR v2` (supersedes `DoR v1`'s §7.4/§7.5/§8 wherever they differ — see §0)
- Status: `DESIGN LOCKED / NOT ACTIVATED FOR IMPLEMENTATION`
- Authority: Product Owner decisions 1–4 received in chat `2026-09-21`, on top of `docs/06_REVIEWS/Import/IMPORT-BULK-REIMPORT-ALL-01_CHECKPOINT_001.md` (Discovery / Read-Only Audit, Sections 1–11) and `docs/10_TICKETS/IMPORT-BULK-REIMPORT-ALL-01_MANIFEST.md` (Sections 1–8). `DoR v2` remediates 2 blockers an independent review (Claude Opus) raised against `DoR v1` before implementation — Product Owner instruction received in chat `2026-09-21` to remediate design-only.
- Baseline: `codex/da-impl-006` @ `4004ee6`
- Author: Claude Code (Sonnet 5)
- This document is documentation only. No code, schema, migration, queue action, or database change is authorized by writing it. No implementation may begin without a further, separate Product Owner/CTO activation instruction.

## 0. DoR v2 — Blocker Remediation (2026-09-21)

An independent pre-implementation review (Claude Opus) found 2 blockers in `DoR v1`:

- **Blocker 1 — delete scoping.** `DoR v1` §8 scoped the forced delete via `import_log_id IN (SELECT id FROM import_log WHERE ... source_lane = ?)`. Re-reading the actual schema and completion-policy code for this remediation found that design **breaks on rows with no `import_log_id` linkage**: `fact_f13_national` has no `import_log_id` column at all (`backend/src/db/schema.sql:110-136`), and `LEGACY_BASELINE`-backed `COMPLETED` days (`autoBackfillCoverageService.js:59-71`; real, PO-confirmed pre-Import data, per `AB-CALENDAR-01` D2) can have committed `fact_f13`/`fact_f41` rows with `import_log_id IS NULL`. For either case, `DoR v1`'s join-based `WHERE` would match zero existing rows, delete nothing, and then `INSERT OR IGNORE` would silently drop every new row that collides with the untouched old `ma_bg` — a "Nhập lại" that reports success while the old data is still there. §8 below is rewritten to fix this.
- **Blocker 2 — incomplete gate propagation.** `DoR v1` §7.4 said the executor call sites must pass `forceReimport: Boolean(job.force_reimport)` but only named 2 of the real call sites. Re-tracing the full F4.1 chain for this remediation found 4 more concrete blocking points `DoR v1` never named: `f41HueAdapter.js`/`f41TctAdapter.js` each silently **drop** the incoming flag and re-hardcode `false`, and `f41HueSingleDateService.js`/`f41TctSingleDateService.js` each contain an **explicit, unconditional throw** (`F41_HUE_FORCE_REIMPORT_FORBIDDEN` / `F41_TCT_FORCE_REIMPORT_FORBIDDEN`) that forbids force-reimport outright, regardless of any flag. A third, previously-unnamed queue-layer gate (the executor-error recheck inside `processNext()`'s `catch` block) has the same "SUCCESS looks the same whether old or new" ambiguity `DoR v1` §7.5 already fixed for crash recovery, but was never fixed for the synchronous in-process error path. §7.4/§7.5 below are rewritten to enumerate and close all of these.

Both fixes are still design-only. No code was changed to produce this remediation — only further read-only tracing of already-referenced files (`backend/src/db/schema.sql`, `f41HueAdapter.js`, `f41TctAdapter.js`, `f41HueSingleDateService.js`, `f41TctSingleDateService.js`, `autoBackfillCoverageExceptionService.js`).

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

### 7.4 Job-level flag and every gate it must open (revised, DoR v2 — closes Blocker 2)

`auto_backfill_job` gains one new additive column, `force_reimport INTEGER NOT NULL DEFAULT 0` (idempotent migration, matching the pattern of every prior additive Auto-Backfill migration), set to `1` at job-creation time (`createRunWithJobs()`, `autoBackfillQueueStore.js:147-249`) for every job admitted via `isReadmissibleCompleted()`, and left `0` for every other job (normal "Chọn tất cả chưa hoàn tất" imports, holiday re-admission) — **this column, set only through that one admission path, is the single source of truth for "this is a confirmed Nhập lại job"; no gate below may open on anything else** (not a query param re-read mid-execution, not a heuristic, only `job.force_reimport`).

**Locked invariant:** every gate enumerated below must test `job.force_reimport` (or the `refreshRequested`/`forceReimport` value it is threaded into) and change behavior *only* when it is `true`. When it is `false` (every existing code path today), every gate's behavior is byte-for-byte unchanged.

Tracing the full call chain from `processNext()` down to `executeImport()` found **6 distinct gates** that currently assume force-reimport can never happen and must each be individually revisited — `DoR v1` named only the first 2:

1. **Pre-execution completion recheck**, `processNext()`, `autoBackfillQueueService.js:361-368`. Currently unconditionally treats any `SUCCESS` completion as "skip, don't execute" (`SKIPPED_ALREADY_SUCCESS`) — the exact mechanism that makes reimport impossible today (Checkpoint Section 9.2.B). Becomes:
   ```js
   const before = await this.evaluateCompletion(job);
   if (before.status === COMPLETION_STATUSES.SUCCESS && !job.force_reimport) {
       // unchanged SKIPPED_ALREADY_SUCCESS path
   }
   // otherwise (MISSING, or SUCCESS-with-force_reimport): proceed to executor
   ```
2. **F1.3 executor call site**, `autoBackfillF13Executors.js:117` (`this.adapter.runOneDate(request.businessDate, {queueId, refreshRequested: false, portalClient})`) — becomes `refreshRequested: Boolean(job.force_reimport)`. Shared by both the HUE and TCT F1.3 executor instances (one method body, injected adapter), so this single change is sufficient for both F1.3 lanes; `f13Adapters.js:36-64` (`HueF13Adapter`/`TctF13Adapter`) already forward `refreshRequested` through to `forceReimport`/`runOneDateImport` without re-hardcoding anything, and `dkclHueF13SyncService.js:154` / `tctF13BackfillService.js:815` already conditionally skip only `if (complete && !forceReimport)` — no forbid-throw exists on the F1.3 path, so no further F1.3 change is needed beyond this one line.
3. **F4.1 executor call site**, `autoBackfillF41Executors.js:62` (`this.adapter.runOneDate(request.businessDate, {jobId, refreshRequested: false, portalClient})`) — becomes `refreshRequested: Boolean(job.force_reimport)`. Shared by both F4.1 HUE and TCT executor instances the same way as item 2.
4. **F4.1 adapters silently drop the flag — new finding, `DoR v1` never named these.** `f41HueAdapter.js:9-14` and `f41TctAdapter.js:9-14` each call `this.service.runOneDate(businessDate, {portalClient: context.portalClient || null, refreshRequested: false})` — **`context.refreshRequested` is received but never read**; the literal `false` is always sent onward regardless of what item 3 passes in. Fixing item 3 alone has **no effect** without also changing these two files to `refreshRequested: Boolean(context.refreshRequested)`.
5. **F4.1 single-date services explicitly forbid it — new finding, a deliberate safety assertion, not a passive default.** `f41HueSingleDateService.js:60-64` and `f41TctSingleDateService.js:65-69` each open with:
   ```js
   if (refreshRequested) {
       throw serviceError('F41_HUE_FORCE_REIMPORT_FORBIDDEN', 'F4.1 HUE Auto Backfill never force-overwrites completed data.');
   }
   ```
   (TCT: `F41_TCT_FORCE_REIMPORT_FORBIDDEN`, same shape.) This must change from an unconditional forbid to: proceed normally when `refreshRequested` is `true` (do not throw), and pass that value on to `executeImport()` at the bottom of each function (currently also separately hard-coded — `f41HueSingleDateService.js:116`, `f41TctSingleDateService.js:129`, both `forceReimport: false` regardless of the parameter). Both the removed throw and the two hard-coded `executeImport()` calls must change together — changing one without the other either still blocks (throw remains) or silently reverts to additive-only (executeImport still forced `false`).
6. **Executor-error recheck inside `processNext()`'s `catch` block — new finding, same ambiguity as §7.5's recovery fix, previously unfixed here.** `autoBackfillQueueService.js:413-421`:
   ```js
   const completion = await this.evaluateCompletion(job).catch(() => null);
   if (completion?.status === COMPLETION_STATUSES.SUCCESS) {
       await this.store.completeLeasedJob(job.id, job.lease_token, {
           state: 'SKIPPED_ALREADY_SUCCESS',
           reasonCode: 'COMPLETION_CONFIRMED_AFTER_EXECUTOR_ERROR',
           evidence: completion.evidence,
       });
       return { jobId: job.id, state: 'SKIPPED_ALREADY_SUCCESS' };
   }
   ```
   If the executor throws mid-reimport (e.g. after the DELETE committed in an earlier attempt is somehow re-observed, or — see §8.3 — before any write in this attempt), this recheck reads `SUCCESS` and treats it as "good, already done," exactly the same ambiguity §7.5 identifies for crash recovery: `SUCCESS` here can mean either "the reimport actually finished" or "the old data is still sitting there untouched." **Fix:** this branch must not fire when `job.force_reimport` is true — a `force_reimport` job that errors always falls through to the normal failure/retry classification below it, never auto-resolved as `SKIPPED_ALREADY_SUCCESS` from this recheck. (It may still legitimately end as `SKIPPED_ALREADY_SUCCESS` later, but only via the recovery path in §7.5, which by then has independent evidence via §8.3's post-write verification — never from this same-attempt guess.)

Gates 4–6 are the concrete substance of Opus's Blocker 2. Gates 1–3 are `DoR v1`'s original design, confirmed still correct and restated here for one complete list.

### 7.5 Recovery and error-path interaction with `force_reimport` (revised, DoR v2 — extends the original crash-recovery fix to the synchronous error path)

`recoverInterruptedWork()` (`autoBackfillQueueService.js:456-479`) resolves an interrupted job by re-checking live completion: if it now reads `SUCCESS`, the job is marked recovered/complete without re-invoking the executor (`resolveRecovery`, `autoBackfillQueueStore.js:970`). For a normal job this is correct — `SUCCESS` after interruption can only mean the import actually finished. **For a `force_reimport` job this check is unsound**: if the job crashes *before* `importParsedData()`'s transaction commits (or the transaction rolls back), the *original, pre-reimport* data is still present and still reads as `SUCCESS` — the generic recovery check cannot distinguish "the reimport completed" from "the reimport never started and the stale data is still there," because both look identical (`SUCCESS`) from the outside. §7.4 gate 6 identifies the same ambiguity one layer earlier, inside `processNext()`'s own synchronous error handling, not only at process-restart recovery.

**Locked design resolution (applies to both layers):**
- `recoverInterruptedWork()` must never resolve a `job.force_reimport = 1` job via the generic completion-match path. Such a job is always unconditionally requeued back to `QUEUED` (not resolved as complete), regardless of what `evaluateCompletion()` currently reports.
- `processNext()`'s executor-error recheck (§7.4 gate 6) must likewise never resolve a `force_reimport` job as `SKIPPED_ALREADY_SUCCESS` from that recheck; it falls through to normal retry/failure classification instead.

Correctness is then re-established the normal way in both cases: the job re-enters `acquireNextJob()`'s queue, and on its next attempt `processNext()`'s (now force-reimport-aware) pre-execution check at §7.4 gate 1 runs again and drives a fresh, complete delete-then-insert cycle — starting from a database state that §8.3's transaction-boundary guarantee ensures is either fully the old data (untouched) or fully the new data (committed), never a partial mix. This trades a small amount of redundant re-work (at most one extra full reimport of that single date, after a crash or error that is already a rare event) for the correctness guarantee that a `force_reimport` job is never silently marked done based on stale pre-existing data.

## 8. Delete correctness — "thay dữ liệu đúng ngày và đúng luồng, không ảnh hưởng ngày khác hoặc luồng khác" (revised, DoR v2 — closes Blocker 1 / Checkpoint Gap 7)

### 8.1 Why `DoR v1`'s import_log_id join is wrong, and what actually provides lane isolation

`DoR v1` proposed scoping the forced delete through `import_log_id IN (SELECT id FROM import_log WHERE ... source_lane = ?)`, reasoning that the plain `DELETE FROM fact_f13 WHERE ngay_do_kiem = ?` (`importProcessor.js:196-198`, and equivalently for the other 3 fact tables) could delete another lane's rows for the same date. Re-checking the actual registry and schema for this remediation shows that reasoning was wrong on its own premise:

- `backend/src/services/importIndicatorRegistry.js:140-155` (F1.3) and `:187-202` (F4.1) register each lane against its **own dedicated `targetTable`**: F1.3/HUE → `fact_f13`, F1.3/TCT → `fact_f13_national`; F4.1/HUE → `fact_f41`, F4.1/TCT → `fact_f41_national`. No two lanes, and no two indicators, ever share a target table.
- `importPipeline.js:216-236` branches to the correct import function (and therefore the correct table) purely by `laneConfig.lane === 'TCT'` and `laneConfig.indicator` — table selection alone already fully determines both indicator and lane scope, before any `WHERE` clause is written.

So a plain `DELETE ... WHERE ngay_do_kiem = ?` **cannot** reach another lane's or another indicator's data — it physically cannot exist in that table. The cross-lane risk `DoR v1` was designed to close does not exist. What the `import_log_id` join actually did was introduce a *new*, real risk: **it silently fails to delete rows that have no `import_log_id` linkage**, which is a real, evidenced case in this system (Blocker 1, §0):

- `fact_f13_national` (schema.sql:110-136) has **no `import_log_id` column at all** — the join is not just unhelpful there, it is not expressible.
- `fact_f13`/`fact_f41` rows backing a `LEGACY_BASELINE` `COMPLETED` status (`autoBackfillCoverageService.js:59-71`; `autoBackfillCoverageExceptionService.js`) can have `import_log_id IS NULL` — real, PO-confirmed pre-Import data (`AB-CALENDAR-01` D2) that the join-based delete would leave untouched while `INSERT OR IGNORE` silently drops every colliding new row.

### 8.2 Locked design: table selection is the lane/indicator scope; the delete stays date-scoped

**No schema change and no `import_log_id`/`source_lane` join.** The forced delete keeps exactly the shape it has today — `DELETE FROM <target_table> WHERE ngay_do_kiem = ?` — because table selection (already fixed by the registry/`importPipeline.js` branching above) is what provides indicator+lane isolation, and a date-only `WHERE` has no dependency on `import_log_id` existing or being populated, so it correctly clears `LEGACY_BASELINE` and `fact_f13_national` rows alike. This resolves "xử lý rõ các bảng không có source_lane/import_log_id" by construction, not by special-casing: none of the four tables need one.

This correctness depends on one invariant: **exactly one `(indicator, lane)` pair ever writes to a given `targetTable`.** It already holds today and is asserted once at registry load (`validateIndicatorRegistration`, `importIndicatorRegistry.js:268` already asserts `targetTable` is a valid SQL identifier per lane). This design adds one more registry-load assertion: across every registered indicator/lane, no two entries may declare the same `targetTable` — a cheap, load-time guard that turns any future violation of this invariant into an immediate startup failure instead of a silent cross-lane data-deletion bug.

### 8.3 Post-delete verification, post-write verification, and restore-on-error (new in DoR v2 — "kiểm tra sau khi xóa và sau khi ghi; lỗi giữa chừng phải khôi phục dữ liệu cũ")

All of the following execute **inside** the existing single `BEGIN TRANSACTION` … `COMMIT` that already wraps each `importProcessor.js` write function (`importParsedData`/`importNationalParsedData`/`importF41ParsedData`/`importF41NationalParsedData`, Checkpoint Section 9.4) — this placement is what makes "restore old data on mid-process error" a property of the existing rollback mechanism, not new code:

1. **Post-delete check** (only when `forceReimport` is true, immediately after the `DELETE`, before any `INSERT`): `SELECT COUNT(*) AS n FROM <target_table> WHERE ngay_do_kiem = ?` must read `0`. If it does not, `throw` immediately (a new error code, e.g. `FORCE_REIMPORT_DELETE_INCOMPLETE`) — this hits the existing `catch` block below, which already `ROLLBACK`s and writes a `FAILED` `import_log` row (`importProcessor.js:280-304`). Because the `DELETE` was never committed, the rollback restores the original data exactly as it was — "khôi phục dữ liệu cũ" is delivered by the transaction, this check only decides *whether* to trigger it.
2. **Post-write check** (always, both forced and non-forced imports — extends the F1.3/HUE-only `verifyHueImportTransaction()` that exists today, `importProcessor.js:121-135`, to the other 3 write functions, which currently have no equivalent): after the `INSERT OR IGNORE` batch loop, verify the committed-so-far row count for that date matches `totalInserted`. Where the table has `import_log_id` (`fact_f13`, `fact_f41`, `fact_f41_national`), filter by the new `import_log_id` for precision (as today's `verifyHueImportTransaction` already does); for `fact_f13_national` (no `import_log_id`), use a plain `SELECT COUNT(*) WHERE ngay_do_kiem = ?` — sound here specifically because step 1 already proved the date was empty immediately before this insert, so every row counted now was written by this transaction. A mismatch throws (`IMPORT_COMMIT_VERIFICATION_FAILED`, existing code, or the table-appropriate equivalent), triggering the same rollback-and-restore path as step 1.
3. **Mid-process failure of any kind** (parse error, batch-insert SQL error, step 1 or step 2's own thrown error, a killed process): already handled — SQLite's transaction durability guarantees an uncommitted `BEGIN TRANSACTION` is never persisted, so a crash or an explicit `ROLLBACK` both leave the database exactly as it was before the `DELETE` ran. This is not new design, it is the existing guarantee (Checkpoint Section 9.4) that steps 1–2 are deliberately placed to rely on rather than duplicate. A failure *after* `COMMIT` (e.g. the subsequent file-move step in `importPipeline.js`) cannot roll back the already-committed new data by design — this is the existing, unchanged `FILE_MOVE_FAILED` recoverable state (`importPipeline.js:114-131`), orthogonal to §8's concern and already correct.

This closes the loop with §7.4 gate 6 and §7.5: because the database is now provably always in one of exactly two states (old data intact, or new data fully committed and verified — never partial), the "does `SUCCESS` mean finished or untouched" ambiguity those sections describe is resolved the same way in both: never infer it from a generic completion re-read, always let a fresh, provably-clean attempt run instead.

### 8.4 Scope note (unchanged from DoR v1)

This design is exercised whenever `forceReimport: true` reaches `importProcessor.js`, which after this design is possible both from the new Auto-Backfill path and from the pre-existing manual `POST /import/upload` path (out of this ticket's scope, §1). §8.2/§8.3 apply identically and safely to both callers — the fixes make the delete/write cycle more precise and more verified, never less, so the manual path's existing behavior is not regressed by reuse.

## 9. Safety, dedup, and history — reused unchanged unless stated otherwise

- **Active-identity dedup** (`createRunWithJobs()`, `autoBackfillQueueStore.js:147-249`): unchanged. A `force_reimport` job is dedup'd by the same `(indicator, source_lane, business_date)` tuple + `QUEUED/RUNNING/RECOVERY_CHECK` state check as any other job — two concurrent "Nhập lại" requests for the same date cannot both enqueue.
- **Request-key dedup**: unchanged, same scope (in-flight only). A "Nhập lại" submitted again after a prior one already finished is not blocked by this layer by design — the confirmation warning (§5) is the intended human safety gate against an accidental repeat, exactly as decision 4 authorizes intentional repeated reimport.
- **Global concurrency** (`acquireNextJob()`'s `GLOBAL_DKCL` lease + single-`RUNNING`-job guard, `autoBackfillQueueStore.js:360-437`), **per-lane `WAITING_AUTH`/`BLOCKED_INTEGRITY` blocking**, **circuit breaker**, **bounded retry**, **Resume's session re-validation**: all unchanged and apply identically to a `force_reimport` job as to any other job.
- **Cancellation**: unchanged — no cancel endpoint exists for any job today (Checkpoint Section 9.6); this design does not add one. An operator who wants to stop an in-flight "Nhập lại" has the same options as for any other running job (Pause at the run level), no more, no less.
- **Import log / evidence**: unchanged mechanism — `importProcessor.js` writes a fresh `import_log` row for every reimport exactly as it does for a first-time import (Checkpoint Section 9.4), so the full history of every reimport (including prior ones) remains queryable, never overwritten or deleted. Extended in DoR v2 (§8.3): every write function, not only F1.3/HUE, now verifies its own committed row count before `COMMIT`.
- **New audit distinction**: one new event `reasonCode`, e.g. `REPLACE_COMPLETED_CONFIRMED`, recorded alongside the existing `RUN_CREATED`/`JOB_CREATED` events (`autoBackfillQueueStore.js:138-145`) when a job is admitted via `isReadmissibleCompleted()` — so the append-only `auto_backfill_event` log can distinguish an intentional data-replacing run from a normal first-time-import run without inspecting job internals. Additive only; no existing event type changes meaning.
- **Registry load-time guard (new in DoR v2, §8.2)**: no two registered `(indicator, lane)` entries may declare the same `targetTable` — asserted once at registry load, turning any future violation of the "one lane per table" invariant §8's delete correctness depends on into an immediate startup failure rather than a silent data-deletion bug.

## 10. Explicitly open items (technical, to be finalized at implementation time, not business rules)

- Exact naming of `confirm_replace_completed`, the `force_reimport` column/event reason code, and DoR v2's new error codes (`FORCE_REIMPORT_DELETE_INCOMPLETE` and the per-table post-write verification failure code) — proposed here, confirmable/renameable by the implementing executor without a new PO decision (pure technical naming).
- Exact UI copy for the confirmation warning (§5) — structure is locked, wording is not.
- Whether the new "Nhập lại" per-row button also needs a distinct icon/color from "Nhập mới" for operator clarity — a UI/UX call for Antigravity, not fixed here.
- `PO_EXEMPTED`/`VERIFIED_NO_DATA` `EXCLUDED` days remain out of both new selection states per §2's boundary note; if the Product Owner later wants them included, that is a new, separate decision requiring its own DoR delta.

## 11. Explicitly not authorized by this document

- No frontend or backend code, test, schema, or migration is written or changed by this DoR.
- No selection, enqueue, reimport, Resume, Retry, cancellation, or business-data write is performed.
- No PO PASS, technical or UI, is claimed or awarded.
- Implementation requires a further, separate, explicit Product Owner/CTO activation instruction, and per `CLAUDE.md` role split, executor assignment (Claude Code: backend/data/tests; Antigravity: UI/UX) at that time.
