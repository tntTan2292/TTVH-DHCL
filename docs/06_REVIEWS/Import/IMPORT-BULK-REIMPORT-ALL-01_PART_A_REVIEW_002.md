# IMPORT-BULK-REIMPORT-ALL-01 — Independent Review 002 of the N1/N2 remediation (Part A)

- Ticket: `IMPORT-BULK-REIMPORT-ALL-01`
- Reviewed commit: `a725c1b` (`fix(import-bulk-reimport-all-01): N1 stale-FAILED-log false failure; N2 add reviewer-verified tests`)
- Previous review: `72a09fd` (`IMPORT-BULK-REIMPORT-ALL-01_PART_A_REVIEW_001.md`)
- Reviewer: Claude Code (Opus 5), independent of the implementer
- Date: 2026-09-22
- Mode: read-only. Code reading; repository tests; reviewer scenarios on **isolated temporary databases and sandbox folders only** (not committed). No source, schema or operational-database change. No "Nhập lại" on real data. No Browser/Playwright.

## 1. Verdict — plain language

**Không có lỗi chặn (BLOCKER). N2: ĐẠT. N1: mới sửa được một nửa — vẫn mở, mức NON-BLOCKER.**

- **Phần đã sửa của N1:** dòng "thất bại" cũ trong lịch sử nhập không còn làm lần nhập mới bị báo lỗi sai. Lỗi thật của chính lần nhập hiện tại vẫn bị phát hiện.
- **Phần N1 còn sót:** khi một lần nhập thất bại, hệ thống để lại **hai** dấu vết — một dòng "thất bại" trong lịch sử, và file bị chuyển vào thư mục lỗi. Bản sửa chỉ xử lý dòng lịch sử, không xử lý file trong thư mục lỗi.
- **Tôi đã chạy lại đúng tình huống thực tế đó:** lần nhập sau ghi dữ liệu đúng (2/2 dòng), nhưng vẫn bị báo "thất bại". Dữ liệu vẫn luôn đúng — chỉ trạng thái báo sai, giống mức độ của N1 ban đầu.
- **N2 đạt:** các test mới khớp code thật và đều đạt. Chúng bao gồm dữ liệu cũ không có liên kết lần nhập, khôi phục khi lỗi giữa chừng ở cả 4 bảng, không ảnh hưởng ngày khác, job lỗi không báo thành công, LỊCH NGHỈ và chống trùng.

**Part A đủ điều kiện chuyển sang Part B (giao diện).** Phần còn lại của N1 chỉ nằm ở backend, không ảnh hưởng việc làm giao diện, nhưng phải đóng trước khi PO kiểm tra giao diện. Không cấp PO PASS.

## 2. N1 — what the fix does, and what it misses

**Change** (`backend/src/services/dkclHueF13SyncService.js`, the only product-code change in `a725c1b`):

- A watermark `COALESCE(MAX(id), 0)` of `import_log` is taken just before `executeImport()`.
- `verifyImport()` now filters `import_log` with `id > watermark`.

| Aspect | Result |
| --- | --- |
| Historical FAILED import_log row no longer fails a later correct attempt | **Fixed** — repo TEST 2H passes; reviewer re-ran it |
| A FAILED row written by the **current** attempt still fails it | **Kept** — repo TEST 2I passes |
| Side benefit | Success now requires **this attempt's own** SUCCESS row (previously an old SUCCESS row could satisfy the check) — stricter, no regression (suite 228/228) |
| **Stale file in `Error/HUE/<standardized filename>`** | **Not fixed.** `verifyImport()` still throws `IMPORT_FAILED` when `fs.existsSync(errorPath)`, with no scoping to the current attempt |

**Why the residual matters.** On any import failure, `importPipeline.executeImport()` writes the FAILED row **and** moves the file to `indicatorConfig.errorDir` → `Error/HUE/<standardized filename>` (`importPipeline.js` ~270–285). The standardized filename depends only on the date, so the next attempt for the same date computes the same `errorPath`. Nothing in the sync path removes or archives it.

**Reviewer reproduction (sandbox, real importPipeline, suite harness).** Seeded exactly what a real failure leaves behind — one FAILED `import_log` row plus the file in `Error/HUE/` — then ran a valid attempt:

```
RV-N1B RESULT status=FAILED | msg=Atomic importer returned FAILED for standardized DKCL file. | fact_rows=2
```

The data was written correctly, but the run is reported FAILED. Repo TEST 2H seeds only the database row, which is why it passes.

- **Severity:** unchanged from Review 001's N1 — data is never wrong; the status is wrong, and retries repeat portal downloads until the retry budget runs out.
- **Classification:** NON-BLOCKER; must be closed before the PO UI check.
- **Suggested direction** (not applied): scope the error-file check to this attempt as well — e.g. treat `errorPath` as a failure only if it was created or modified after the attempt started, or archive a pre-existing error file before the handoff. Extend TEST 2H to seed the error file too.

**Minor ordering note (NON-BLOCKER):** the watermark is taken after `handoffToIncoming()`. The import watcher waits about 2 s (`awaitWriteFinish`) before processing a new file, so there is no practical race. Taking the watermark before the handoff would make the ordering strictly safe.

## 3. N2 — new tests checked against the real code

| Required case (Review 001 N2) | New repository test | Checked |
| --- | --- | --- |
| Gate 6: force job whose executor throws is not reported as done | `test_autoBackfillQueueService.js` "…executor throws is never marked SKIPPED_ALREADY_SUCCESS…" | Matches `processNext()` catch branch (`forceReimport ? null : evaluateCompletion`); passes |
| Dedup of repeated Nhập lại | "…second confirm_replace_completed request … does not create a duplicate job" | Matches store active-identity dedup; passes |
| LỊCH NGHỈ + flag at `createRun` | "…never re-admits a LỊCH NGHỈ (holiday, no data) day" | Matches `isReadmissibleCompleted()` (status must be COMPLETED; no-data holiday is EXCLUDED); passes |
| Legacy rows with `import_log_id = NULL` replaced; other date untouched | `test_importProcessor.js` TEST 7 (`fact_f13`, `fact_f41`) | Exercises the real date-scoped DELETE plus post-delete check; passes |
| Mid-transaction rollback for `fact_f13_national`, `fact_f41`, `fact_f41_national` | TEST 8A/8B/8C | Uses a TEMP trigger aborting the `import_log` UPDATE — i.e. **after** DELETE+INSERT, before COMMIT (the meaningful point, same technique the reviewer used); old rows restored exactly; passes |

Residual N2 gaps (NON-BLOCKER, the reviewer's own scenarios cover them and still pass on `a725c1b`):

- no migration-idempotency test in the repo;
- other-date isolation is asserted in the repo only for `fact_f13`/`fact_f41`, not for the two national tables.

## 4. Validation reproduced at `a725c1b`

| Command | Reported | Reviewer |
| --- | --- | --- |
| `node --experimental-sqlite test_dkclHueF13SyncService.js` | 228/228 | **228/228** |
| `node --experimental-sqlite test_importProcessor.js` | 85/85 | **85/85** |
| 7 Auto-Backfill `test_*.js` suites | 153/153 | **153/153** (45+32+19+16+18+12+11) |
| Default sweep `node --experimental-sqlite --test` | 394/398 | **394/398**, same 4 pre-existing failures |
| Reviewer queue scenarios (Review 001) | — | **9/9** |
| Reviewer data-layer checks, 4 tables (Review 001) | — | **25/25** |

The 4 failures remain pre-existing:

- the 5 files involved are byte-identical at `e1132b6` and `a725c1b`;
- no `*.test.js` file changed;
- the only product-code file changed is `dkclHueF13SyncService.js`.

The manifest now states correctly that the default sweep does not run `test_*.js` (Review 001's N3 is resolved in wording).

## 5. Status of Review 001 findings

| Finding | Status |
| --- | --- |
| N1 | **PARTIALLY FIXED — still OPEN (NON-BLOCKER).** Database-history half closed; `Error/HUE` file half open (§2). Close before the PO UI check |
| N2 | **CLOSED** (small residual gaps in §3, covered by reviewer scenarios) |
| N3 | **CLOSED** (manifest wording) |
| N4 | Accepted as-is (fails loudly, safe in the real startup order) |
| N5 | Deployment note, unchanged: before the first real Nhập lại, take a verified backup, restart the backend so the migration runs, and get the PO go-ahead |

## 6. Next gate

- **Part A is eligible to move to Part B (UI, Antigravity)** per DoR v2 §3–§6.
- Before the PO UI check: close the remaining half of N1 (backend, Claude Code) and re-verify it with the realistic "FAILED row + Error file" scenario.
- No PO PASS, technical or UI, is claimed or implied.
