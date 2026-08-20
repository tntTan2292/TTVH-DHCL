# AUTO-BACKFILL-UI-REMEDIATION Checkpoint 001

Status: `READY FOR PO UI CHECK` (2026-08-20).

## 1. Activation & Baseline

Product Owner activated Phase B, `AUTO-BACKFILL-UI-REMEDIATION` (Frontend, Antigravity) following Phase A (`AUTO-BACKFILL-COVERAGE-EXCEPTION`, backend) `PO BACKEND GATE PASS` (commit `29346c92`).

Baseline: `29346c92`, branch `codex/da-impl-006`.

## 2. 5-Point PO Remediation Summary

1. **Point 1: Real API Modal Exception Payload (`exception_type: 'PO_EXEMPTED'`)**: Fixed 422 error on `POST /api/import/auto-backfill/coverage/exceptions` by explicitly including `exception_type: 'PO_EXEMPTED'` in `handleConfirmExemption`.
2. **Point 2: Standardized Header Styling**: Aligned "Trung tâm Điều hành Bù dữ liệu Tự động" banner and control cards with system design tokens (`var(--color-vnpost-blue)` `#0054A6`, white cards, `border-slate-200`, `text-slate-900`, `text-slate-500`).
3. **Point 3: Safe Run Controls (`from_date` / `to_date`)**: Required explicit operator selection of Indicator (`targetIndicator`) and Month (`targetMonth`). Automatically computes inclusive `from_date` and `to_date` (e.g. `2026-07-01` to `2026-07-31`) for backend commit `3572593d` contract. Button disabled until selections are set.
4. **Point 4: Granular Active Execution Visibility & WAITING_AUTH Warning**: Displays active processing job (`Chỉ tiêu × Nguồn × Ngày`) when run state is `RUNNING`. When `safety_state === 'WAITING_AUTH'`, renders prominent warning badge *"Cần đăng nhập thủ công [HUE / TCT]"* with lane action guidance.
5. **Point 5: Unique Calendar Date Missing Count**: Fixed `missingCount` in `autoBackfillUiHelpers.js` to count unique calendar dates (`Set` of `business_date` strings for `TRUE_MISSING`/`MISSING` items) so missing HUE and TCT on the same date count as 1 missing date on top health summary cards.

## 3. Validation Ledger

- `node src/components/AutoBackfillOperatorPanel.test.js`: 8/8 PASS.
- `cmd /c "npx oxlint src/components/AutoBackfillOperatorPanel.jsx src/components/autoBackfillUiHelpers.js"`: 0 ERRORS (3 unused variable warnings).
- `cmd /c "npm run build"`: PASS (687 modules transformed cleanly in 1.24s).
- Portal DKCL real environment: ZERO requests made; untouched.
- Queue / Import / Runtime: Zero execution.

## 4. Backend Remediation Delta -- Optional `from_date`/`to_date` Enqueue Scope (2026-08-19, Claude Code)

Product Owner instructed one backend point: add an optional `from_date`/`to_date` filter to `POST /api/import/auto-backfill/runs` so an operator can limit enqueue to a specific date range (e.g. one month at a time). Manifest Section 5 has the locked contract. This is a PO-instructed exception to the manifest's original "STRICT FRONTEND ONLY" lock (Section 3), for this one backend delta only.

### 4.1 Implementation

- `backend/src/controllers/autoBackfillQueueController.js`: `createRun()` now forwards `req.body.from_date`/`req.body.to_date` as `fromDate`/`toDate` (`null` when absent, preserving the exact prior payload shape and behavior when omitted).
- `backend/src/services/autoBackfillQueueService.js`: new `normalizeOptionalDateRange(fromDate, toDate)` reuses the shared `normalizeBusinessDate` validator (`autoBackfillBusinessCalendar.js`) for format/calendar validity (`INVALID_DATE`, 400) and rejects an inverted range (`AUTO_BACKFILL_DATE_RANGE_INVALID`, 400) before any coverage scan or store write. `createRun()` filters the coverage-eligible item list by the inclusive `[fromDate, toDate]` range (either bound optional) before building jobs; the existing `AUTO_BACKFILL_NO_EXECUTABLE_COVERAGE` error fires unchanged when the filtered set is empty. No schema, migration, or persisted-run-record change.

### 4.2 Tests Added

- Queue service (`test_autoBackfillQueueService.js`, 8 new): no bounds (unchanged full window), `from_date` only, `to_date` only, both bounds, one full specific calendar month (December, 31 dates, verified none of November/January leak in), inverted range rejected `400` before any write, malformed date rejected `400 INVALID_DATE` (both a bad-format string and an invalid calendar date `2026-02-30`), and a range matching zero eligible coverage still produces the existing `409 AUTO_BACKFILL_NO_EXECUTABLE_COVERAGE`.
- Queue controller (`test_autoBackfillQueueController.js`): updated the existing identity-filter forwarding assertion for the new `fromDate: null, toDate: null` defaults, and added a new test proving `from_date`/`to_date` are forwarded verbatim when supplied.

### 4.3 Validation Result

- Targeted: Queue service + controller `31/31` PASS (includes the 9 new/updated tests).
- Required regression: Queue, Coverage (service/controller), Coverage Exception (service/controller), Safety, F1.3/F4.1 executors, Queue/Safety/Coverage-Exception migrations, server startup migrations: `112/112` PASS.
- Also re-ran F1.3/F4.1 HUE/TCT backfill/sync, Import pipeline race/processor, F4.1 Import pipeline, e2e Import engine: `7/7` PASS.
- `node -c` syntax-checked; zero NUL bytes confirmed in all 4 touched files.
- `git diff --name-only` confirms exactly 4 backend files changed (`autoBackfillQueueController.js`, `autoBackfillQueueService.js`, and their 2 test files) -- no frontend file, no schema/migration, no other backend service touched.

### 4.4 Scope Proof

- No frontend file touched; Section 2's `READY FOR PO UI CHECK` frontend state is unaffected.
- No real Portal, Queue worker execution, Import, or browser; no business-data mutation; no schema/migration change.
- `AUTO-BACKFILL-RUNTIME` not activated. Product Owner backend gate is not self-passed.

State: `AUTO-BACKFILL-UI-REMEDIATION backend delta IMPLEMENTED / READY FOR PO BACKEND GATE`.

