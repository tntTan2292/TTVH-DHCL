# IMPORT-BULK-REIMPORT-ALL-01 — Independent Review 001 of Part A (backend/data/tests)

- Ticket: `IMPORT-BULK-REIMPORT-ALL-01`
- Reviewed commit: `0e16c99` (`feat(import-bulk-reimport-all-01): implement Part A backend for confirmed COMPLETED-date reimport`)
- Baseline: `e1132b6` (DoR v2); reference DoR: `docs/04_TECHNICAL_PLANNING/Feature/IMPORT-BULK-REIMPORT-ALL-01_DESIGN_OF_RECORD.md` v2
- Reviewer: Claude Code (Opus 5) — a different model from the implementer (Claude Code / Sonnet 5), per `CLAUDE.md` §2
- Date: 2026-09-22
- Mode: read-only. Code reading; the repository's own tests; independent scenarios on **isolated temporary SQLite databases only** (a queue-layer suite of 9 scenarios and a data-layer script of 25 checks, both kept in the reviewer's scratchpad, not committed). No source, schema or operational-database change. No "Nhập lại" or any import was run against real data. No Browser/Playwright. Part B (UI) is not reviewed.

## 1. Verdict — plain language

**PASS (kỹ thuật) — không có lỗi chặn. Có 1 điểm nên sửa trước khi PO nghiệm thu giao diện, và vài điểm nhỏ.**

- Các chốt kiểm soát việc nhập lại ngày đã hoàn tất đều hoạt động: chỉ ngày đã hoàn tất được yêu cầu rõ ràng mới bị thay, và chỉ trong đúng chỉ tiêu, đúng luồng, đúng ngày.
- Kiểm tra độc lập trên cả 4 bảng dữ liệu (F1.3 HUE, F1.3 TCT, F4.1 HUE, F4.1 TCT):
  - Dữ liệu cũ của ngày được chọn bị thay hết, kể cả dữ liệu cũ không có liên kết lần nhập.
  - Các ngày khác và các bảng khác giữ nguyên từng dòng.
  - Lịch sử các lần nhập trước không mất.
- Khi có lỗi giữa chừng, dữ liệu cũ được khôi phục nguyên vẹn ở cả 4 bảng.
- LỊCH NGHỈ không thể bị nhập lại. "Chọn tất cả chưa hoàn tất" không đổi.
- Điểm nên sửa (N1) chỉ ở luồng F1.3 HUE, không làm sai dữ liệu. Nếu một lần nhập lại từng thất bại ở bước ghi dữ liệu, thì các lần thử lại sau của đúng ngày đó vẫn thay dữ liệu đúng nhưng bị báo "thất bại".

Không cấp PO PASS. Part B (giao diện) có thể bắt đầu.

## 2. The six gates (DoR v2 §7.4) plus recovery (§7.5)

| # | Gate | Code at `0e16c99` | Independent evidence |
| --- | --- | --- | --- |
| 1 | Pre-execution recheck: SUCCESS skips only when not force | `processNext()` reads `forceReimport = Boolean(job.force_reimport)` once; skip only when `SUCCESS && !forceReimport`; any other non-`MISSING` status still → manual review | Repo test (executes, `forceReimport:true`); RV-2 regression: normal job still `SKIPPED_ALREADY_SUCCESS` |
| 2 | F1.3 executor | `refreshRequested: Boolean(request.forceReimport)` → `f13Adapters` → HUE sync `forceReimport` / TCT `forceReimport: incomplete \|\| refreshRequested` | RV-6: executor receives `forceReimport:true` only for the confirmed tuple; RV-7: an INCOMPLETE day sent with the flag gets `force_reimport=0` and `forceReimport:false` |
| 3 | F4.1 executor | same pattern | repo F4.1 suite 32/32 |
| 4 | F4.1 adapters no longer drop the flag | `refreshRequested: Boolean(context.refreshRequested)` in both adapters | repo F4.1 suite |
| 5 | F4.1 single-date services | unconditional `*_FORCE_REIMPORT_FORBIDDEN` throw removed; `executeImport({ forceReimport: Boolean(refreshRequested) })`. Only reachable with `true` from a `force_reimport` job | repo tests replaced the old forbid assertions with real replace proofs |
| 6 | Executor-error recheck | for a force job the completion re-read is skipped → normal failure/retry classification | **RV-1**: executor throws on a force job while old data still reads SUCCESS → `FAILED_TERMINAL`, never `SKIPPED_ALREADY_SUCCESS`. (Not covered by the repo's own tests.) |
| §7.5 | Crash recovery | force job always requeued (`RECOVERY_FORCE_REIMPORT_ALWAYS_REQUEUED`) | repo test |

The flag is set in exactly one place (`createRun()` → `isReadmissibleCompleted()`), which requires: `confirm_replace_completed`, PO status `COMPLETED`, `ACTIVE` indicator, `AUTOMATED` lane, and a single-tuple request (else 400 `AUTO_BACKFILL_CONFIRM_REPLACE_REQUIRES_SINGLE_TUPLE`). The `JOB_CREATED` event carries `REPLACE_COMPLETED_CONFIRMED` (RV-6 confirms the event log).

## 3. Replacement correctness — independent data-layer check (25/25)

Sandbox built from `schema.sql`; every table seeded with 3 dates via normal imports, plus **legacy rows with `import_log_id = NULL`** on the target date in `fact_f13` and `fact_f41` (the exact DoR v1 Blocker-1 case). Then a forced reimport of the middle date in each of the 4 tables.

| Check | Result |
| --- | --- |
| Target date holds exactly the new rows; old rows **and legacy unlinked rows** gone — `fact_f13`, `fact_f13_national`, `fact_f41`, `fact_f41_national` | 4/4 PASS |
| Every other (table × date) cell byte-identical before/after | 8/8 PASS |
| `import_log` history: all old rows kept, one new row per reimport | PASS |
| Mid-transaction failure, `fact_f13` (built-in test hook) | old rows restored exactly |
| Mid-transaction failure injected **after DELETE + INSERT, before COMMIT** (trigger aborting the `import_log` update) for `fact_f13_national`, `fact_f41`, `fact_f41_national` | 3/3 raised, 3/3 old rows restored exactly; a `FAILED` import_log row is written for each attempt |

Lane isolation rests on the one-lane-per-table invariant, now enforced at registry load (`assertUniqueTargetTables`, with accept/reject tests). The post-delete check (`FORCE_REIMPORT_DELETE_INCOMPLETE`) and the post-write count checks run inside the existing transaction, as DoR v2 §8.3 requires.

## 4. Other lanes, other days, LỊCH NGHỈ, dedup, "Chọn tất cả chưa hoàn tất"

- **Other lane / other day (queue layer, RV-6):** Nhập lại of HUE 2026-01-04 with HUE and TCT both COMPLETED on three days → exactly one job, one executor call, for that tuple only.
- **LỊCH NGHỈ (RV-3):** a true holiday (no data, PO status `EXCLUDED`) cannot be enqueued even with `confirm_replace_completed` (409 `AUTO_BACKFILL_NO_EXECUTABLE_COVERAGE`, 0 jobs) and is absent from `selectable({ includeCompleted: true })`, listed under `excluded_holiday`.
- **Observation for the PO (RV-9, not a defect):** under the already-locked AB-CALENDAR-01 precedence ("dữ liệu thật thắng lịch nghỉ"), a holiday-marked day that actually has committed data is shown as **COMPLETED**, not LỊCH NGHỈ, so it *can* be Nhập lại. Only days without data count as LỊCH NGHỈ. This is consistent with existing rules, but UI copy for Part B should not imply that every holiday-marked day is untouchable.
- **Dedup (RV-5):** a second Nhập lại for the same tuple while the first is queued creates no second job (the existing active job is returned; one row in `auto_backfill_job`).
- **"Chọn tất cả chưa hoàn tất" (RV-4):** default `selectable()` still returns only INCOMPLETE/DATA_ERROR and reports COMPLETED under `excluded_complete`. The frontend is untouched by this commit.

## 5. Migration and tests

- `migrate_import_bulk_reimport_all_01_schema.js`: additive `force_reimport INTEGER NOT NULL DEFAULT 0`, column-existence-guarded, placed after the queue schema in `server.js`'s startup chain, and present in `schema.sql`. Verified (RV-8): a second run is a no-op. On a database without `auto_backfill_job` it fails **loudly**, not silently.
- The live operational database does **not** have the column yet (the backend has not been restarted on this code); it is added automatically at the next startup.
- Tests at `0e16c99`, run by the reviewer:

| Suite | Result |
| --- | --- |
| `node --experimental-sqlite --test` (default discovery) | **394/398** — same 4 pre-existing failures |
| `test_autoBackfillQueueService.js` | 42/42 |
| `test_autoBackfillF41Executors.js` | 32/32 |
| `test_autoBackfillF13Executors.js` | 19/19 |
| `test_autoBackfillCoverageService.js` | 16/16 |
| `test_autoBackfillHolidayCalendar.js` | 18/18 |
| `test_autoBackfillQueueController.js` | 12/12 |
| `test_autoBackfillSafety.js` | 11/11 |
| `test_importProcessor.js` (custom runner) | 71/71 |

All match the implementer's report.

- **About "394/398":** Node's default test discovery does not pick up files named `test_*.js`, so that sweep runs **none** of the suites Part A changed. It is the same 398 tests as before the ticket. The figure is true and correctly shows that nothing else regressed, but the evidence for Part A itself is the per-suite results above (which the manifest does report).
- **The 4 failures are pre-existing:**
  - The 5 files involved (`timelineService.js`, `timelineService.recovery.test.js`, `DashboardController.js`, `DashboardController.r6.integration.test.js`, `DashboardController.recovery.test.js`) are byte-identical at `e1132b6` and `0e16c99`.
  - No `*.test.js` file changed in this commit.
  - Failure reasons are unchanged: 2 × `fetch failed` (need a running server), 1 × mocked call count, 1 × registered `F13-DASHBOARD-RECOVERY-DEFECTS-01`.
- **No new failure** anywhere.

## 6. Findings

**No BLOCKER.**

### N1 — NON-BLOCKER, recommended before PO UI acceptance: F1.3/HUE verification treats any historical FAILED log as failure

`dkclHueF13SyncService.verifyImport()` reads every `import_log` row with `ngay_do_kiem = ? OR file_name = ?` — the whole history, not just this run — and throws `IMPORT_FAILED` if **any** row is `FAILED`. Every failed forced attempt writes such a row (§3). So after one import-level failure of a Nhập lại on an F1.3/HUE date:

- every retry, and every later Nhập lại of that date, deletes and replaces the data correctly (committed and verified inside `importProcessor`);
- but it is then reported as failed and retried until the retry budget is exhausted, repeating portal downloads.

Data is never wrong. But the DoR v2 §7.5 promise that "a fresh attempt re-establishes correctness" does not hold for the F1.3/HUE status. The logic is pre-existing (it also affects INCOMPLETE dates with a past FAILED log); Part A makes it reachable on COMPLETED dates. The live DB currently has 0 FAILED import_log rows, so no date is affected today.

Suggested direction: scope that check to log rows created by the current run. Also add a regression test.

### N2 — NON-BLOCKER: test gaps against the activation prompt

The repository has no test for:

- gate 6;
- multi-date / other-table isolation for the F4.1 and national tables;
- replacement of legacy rows with `import_log_id = NULL`;
- mid-transaction rollback for `fact_f13_national` / `fact_f41` / `fact_f41_national`;
- force-job dedup;
- LỊCH NGHỈ + flag at `createRun`;
- migration idempotency.

The reviewer's independent scenarios cover all of them and pass, so behaviour is verified. They should still be added to the repo (can travel with the N1 fix or Part B) so future changes stay guarded.

### N3 — NON-BLOCKER: report wording

See Section 5. Stating that the default sweep excludes `test_*.js` would avoid the "394/398" figure being read as Part A evidence.

### N4 — NON-BLOCKER: migration not standalone on an empty database

It fails loudly (not silently) without `auto_backfill_job`. That is safe in the real startup order and in `schema.sql`. Same class as a finding already accepted elsewhere.

### N5 — deployment note, not a defect

Before the first real Nhập lại:

- restart the backend so the startup migration adds `force_reimport`;
- take a verified backup first;
- the first real use needs its own PO go-ahead.

## 7. Next gate

- Part B (UI, Antigravity) may start per DoR v2 §3–§6. When writing the confirmation copy, apply the §4 observation about holiday-marked days that have data.
- Recommended: fix N1 and add N2's tests before the PO UI check.
- No PO PASS, technical or UI, is claimed or implied by this review.
