# AUTO-BACKFILL-UI-REMEDIATION Checkpoint 001

Status: `Frontend READY FOR PO UI CHECK (2026-08-20); Backend deltas (Sections 4-5) IMPLEMENTED / READY FOR PO BACKEND GATE`.

## 1. Activation & Baseline

Product Owner activated Phase B, `AUTO-BACKFILL-UI-REMEDIATION` (Frontend, Antigravity) following Phase A (`AUTO-BACKFILL-COVERAGE-EXCEPTION`, backend) `PO BACKEND GATE PASS` (commit `29346c92`).

Baseline: `29346c92`, branch `codex/da-impl-006`.

## 2. PO Remediation Round 1 & Round 2 Summary

### Round 1 Remediations:
1. **Real API Modal Exception Payload (`exception_type: 'PO_EXEMPTED'`)**: Fixed 422 error on `POST /api/import/auto-backfill/coverage/exceptions` by explicitly including `exception_type: 'PO_EXEMPTED'` in `handleConfirmExemption`.
2. **Standardized Header Styling**: Aligned "Trung tâm Điều hành Bù dữ liệu Tự động" banner and control cards with system design tokens (`var(--color-vnpost-blue)` `#0054A6`, white cards, `border-slate-200`, `text-slate-900`, `text-slate-500`).
3. **Safe Run Controls (`from_date` / `to_date`)**: Required explicit operator selection of Indicator (`targetIndicator`) and Month (`targetMonth`). Automatically computes inclusive `from_date` and `to_date` (e.g. `2026-07-01` to `2026-07-31`) for backend commit `3572593d` contract. Button disabled until selections are set.
4. **Granular Active Execution Visibility & WAITING_AUTH Warning**: Displays active processing job (`Chỉ tiêu × Nguồn × Ngày`) when run state is `RUNNING`. When `safety_state === 'WAITING_AUTH'`, renders prominent warning badge *"Cần đăng nhập thủ công [HUE / TCT]"* with lane action guidance.
5. **Unique Calendar Date Missing Count**: Fixed `missingCount` in `autoBackfillUiHelpers.js` to count unique calendar dates (`Set` of `business_date` strings for `TRUE_MISSING`/`MISSING` items) so missing HUE and TCT on the same date count as 1 missing date on top health summary cards.

### Round 3 Remediations (2026-08-20, UX Improvements):
1. **Point 1: Default Closed Accordions & Internal Pagination**:
   - Set default accordion state to **CLOSED** (`isOpen = false` by default) for all months in `MonthlyAccordionGroup`, regardless of missing item count.
   - Added internal pagination inside expanded month accordions using `paginateItems` bounded to 10 rows/page (with selectable 10/20/50 rows/page options and page navigation), preventing page scrolling overflow when a month has 60+ missing items.
2. **Point 2: Bulk Selection & Bulk Exemption Confirmation**:
   - Added item checkboxes (`CheckSquare` / `Square`) and "Select All" / "Chọn tất cả" controls for both `MonthlyAccordionGroup` and `TABLE` view.
   - Displays a floating action bar when ≥1 actionable item is selected: *"Xác nhận Không phát sinh cho N ngày đã chọn"*.
   - Opens a single bulk confirmation modal `<ModalPOBulkExceptionConfirm />` with a single mandatory reason textarea.
   - Executes individual `POST /api/import/auto-backfill/coverage/exceptions` REST calls sequentially/in parallel per selected item to preserve fine-grained REST contracts and audit logs.
   - Reports exact success/failure breakdown per item if any error occurs without rolling back already successful items.

5. **Point 5: Strict "100% Hoàn tất" Badge Condition Bugfix**:
   - Fixed condition in `MonthlyAccordionGroup` and per-lane cards in `AutoBackfillOperatorPanel.jsx` (~line 1600). Previously checked only `group.counts.missing > 0`, erroneously rendering "100% Hoàn tất" when a month had 62 items needing PO review (`reviewReq = 62, missing = 0, complete = 0`).
   - Updated condition: badge ONLY displays **"100% Hoàn tất"** when `group.counts.complete === group.counts.total` (100% of items are fully completed).
   - If unresolved items exist (`missing > 0` or `reviewReq > 0`), renders prominent warning badge *"Còn thiếu N · Cần kiểm tra M bản ghi"* or *"Cần PO kiểm tra N bản ghi"*.

## 3. Validation Ledger

- `node src/components/AutoBackfillOperatorPanel.test.js`: **13 / 13 PASS** (Including Section 13 reproducing the PO bug with 62 `MANUAL_REVIEW_REQUIRED` items).
- `cmd /c "npx oxlint src/components/AutoBackfillOperatorPanel.jsx src/components/autoBackfillUiHelpers.js src/pages/DataImportCenter.jsx"`: **0 ERRORS**.
- `cmd /c "npm run build"`: **PASS** (689 modules transformed cleanly in 1.50s).
- Direct data verification node script: **100% PASS**.
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

## 5. Backend Remediation Delta -- "Đã hoàn tất" (SUCCESS) Policy Simplified To Data-Presence-Only (2026-08-19, Claude Code)

Product Owner instructed a policy change: committed target-table data alone is sufficient for the `SUCCESS` ("Đã hoàn tất") completion status -- the import source (a completed Import run vs. legacy/direct data) is no longer relevant. Manifest Section 6 has the locked contract. This is a second PO-instructed exception to Section 3's "STRICT FRONTEND ONLY" lock, backend-only.

### 5.1 Implementation

`backend/src/services/autoBackfillCompletionPolicies.js`, `createSqliteImportCompletionPolicy().evaluate()`: the `SUCCESS` gate changed from `integrityValid && successLogCount > 0 && artifactRequirementMet` to `integrityValid` alone (`rowCount > 0`, matching a declared `expectedRowCount`, and `distinctCount === rowCount`). The `MANUAL_REVIEW_REQUIRED`/`INCOMPLETE`/`MISSING` branches and their reason cascade are byte-for-byte unchanged, now reached under the narrower "not `SUCCESS`" condition. The `evidence` object's shape and content (`success_log_count`, `processed_artifact_present`, etc.) is unchanged -- only the status-decision condition changed, no internal information was dropped.

### 5.2 Downstream Ripple Found And Fixed

Loosening the `SUCCESS` gate changed the raw completion result for the specific scenario of "committed data present, integrity valid, but no `SUCCESS` import-log row and/or no Processed artifact" -- that now correctly resolves `SUCCESS` instead of `MANUAL_REVIEW_REQUIRED`. Two existing Coverage tests asserting the old outcome for exactly that scenario were updated to assert `SUCCESS`/`DATA_COMPLETE_WITH_EVIDENCE`, with the preserved internal `evidence` fields asserted directly to prove nothing was silently dropped. The Coverage-Exception `LEGACY_BASELINE`-acceptance test's fixture (a single committed row, no log, no artifact) relied on the now-superseded `MANUAL_REVIEW_REQUIRED` outcome as its precondition; its setup was changed to a genuine integrity-invalid scenario (`rowCount` diverging from the lane's `expectedRowCount`) so it still exercises `LEGACY_BASELINE`'s real, current precondition.

### 5.3 Tests Added/Updated

- Coverage (`test_autoBackfillCoverageService.js`): updated 2 existing tests (FILE_MOVE_FAILED log present, missing Processed artifact) to assert the new `SUCCESS` outcome with internal-evidence assertions; added the explicitly requested case (`rowCount > 0` + valid integrity, **no** `import_log` row, **no** Processed artifact -> `SUCCESS`); added a genuine-integrity-violation case (rowCount mismatch vs. `expectedRowCount`) proving `MANUAL_REVIEW_REQUIRED` still fires correctly.
- Coverage Exception (`test_autoBackfillCoverageExceptionService.js`): updated the `LEGACY_BASELINE` acceptance test's fixture to a genuine integrity-invalid scenario so its `MANUAL_REVIEW_REQUIRED` precondition still holds.

### 5.4 Validation Result

- Coverage + Coverage Exception (service/controller): `38/38` PASS.
- Required regression: Coverage, Coverage Exception, Safety, Queue (service/controller), F1.3/F4.1 executors, Queue/Safety/Coverage-Exception migrations, server startup migrations: `114/114` PASS.
- Also re-ran F1.3/F4.1 HUE/TCT backfill/sync, Import pipeline race/processor, F4.1 Import pipeline, e2e Import engine: `7/7` PASS.
- `node -c` syntax-checked; zero NUL bytes confirmed in all 3 touched files.
- `git diff --name-only` confirms exactly 3 backend files changed (`autoBackfillCompletionPolicies.js` and its 2 downstream test files) -- no frontend file, no schema/migration, no other backend service touched.

### 5.5 Scope Proof

- No frontend file touched; frontend `READY FOR PO UI CHECK` state (Sections 1-3) is unaffected.
- No real Portal, Queue worker execution, Import, or browser; no business-data mutation; no schema/migration change.
- `AUTO-BACKFILL-RUNTIME` not activated. Product Owner backend gate is not self-passed.

State: `AUTO-BACKFILL-UI-REMEDIATION backend delta (Section 5) IMPLEMENTED / READY FOR PO BACKEND GATE`.

