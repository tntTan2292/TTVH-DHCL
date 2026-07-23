# AUTO-IMPORT-006 CHECKPOINT 009

## Phase

- Ticket: `AUTO-IMPORT-006`
- Phase: `REMEDIATION-006 / READY FOR IMPLEMENTATION`
- Latest verified remote commit: `4c7df0180471724116c05e3278999abc31cd1108`
- Current state: `ACTIVE / READY FOR IMPLEMENTATION`
- Technical status: `PASS`
- PO product status: `NOT READY - AUTO-IMPORT-006 remains active`
- Next authorized defect: `Import date validation`
- Executor: `Codex`

## Dashboard PO PASS Set

Product Owner accepted the Dashboard follow-up remediation set as `PO PASS`:

- Dashboard date consistency.
- Startup date-state normalization.
- D-1/D-7 comparison contract shared by summary cards, BCVH table, and trend block.
- Vietnamese UTF-8 encoding for D-1/D-7 comparison labels.
- 30-day trend request/window contract.

Accepted commits:

- `7c166452...`
- `07d2a3a4...`
- `37dff2ee...`
- `378d22f4...`
- `4c7df018...`

## Next Authorized Defect

- Defect: `Import date validation`.
- Executor: `Codex`.
- Root cause: future artifact rows such as `2098` contaminated shared `fact_f13` date coverage.
- Required direction: fix the import/date-validation path without reopening completed Dashboard tickets or broad-auditing the repository.

## Import Date Validation Implementation

- Scoped writer path: `backend/src/services/importProcessor.js` -> `importParsedData()` -> `fact_f13`.
- Guard added before `BEGIN TRANSACTION`, before `DELETE FROM fact_f13`, before `import_log`, and before `INSERT OR IGNORE INTO fact_f13`.
- Rejected dates:
  - invalid calendar values, for example `2026-02-30`;
  - values greater than the local business current date.
- Rejection does not normalize or rewrite the bad date.
- Rejection error records:
  - rejected `ngay_do_kiem`;
  - rejection reason;
  - business current date;
  - related row evidence from the parsed data, including `row_number`, `ma_bg`, `ma_bcvh`, and `ten_bcvh`.
- Valid non-future imports continue through the existing idempotent `INSERT OR IGNORE` and `forceReimport` contracts.

Read-only database evidence found existing future `fact_f13` rows:

- `2098-02-16`: `2` rows, `2` distinct shipments.
- `2098-02-18`: `2` rows, `2` distinct shipments.

No production data was deleted or corrected. Cleanup of existing future rows requires separate authority.

Validation:

- `node test_importProcessor.js`: `PASS` (`56` passed, `0` failed).

## Controlled Future Data Cleanup

PO authorized cleanup for only the confirmed existing future `fact_f13` rows:

Before cleanup:

- `2098-02-16`: `2` rows, `2` distinct shipments.
- `2098-02-18`: `2` rows, `2` distinct shipments.
- Identifying keys deleted:
  - `id=650039`, `ngay_do_kiem=2098-02-16`, `ma_bg=AUTO002_0001`, `ma_bcvh=533140`, `import_log_id=617`.
  - `id=650040`, `ngay_do_kiem=2098-02-16`, `ma_bg=AUTO002_0002`, `ma_bcvh=533140`, `import_log_id=617`.
  - `id=650042`, `ngay_do_kiem=2098-02-18`, `ma_bg=AUTO002_0001`, `ma_bcvh=533140`, `import_log_id=619`.
  - `id=650043`, `ngay_do_kiem=2098-02-18`, `ma_bg=AUTO002_0002`, `ma_bcvh=533140`, `import_log_id=619`.
- Pre-cleanup check found no other `fact_f13` rows greater than business date `2026-07-23`.

Cleanup mechanism:

- `BEGIN TRANSACTION`.
- Precondition: `SELECT COUNT(*) FROM fact_f13 WHERE ngay_do_kiem IN ('2098-02-16', '2098-02-18')` must equal `4`.
- `DELETE FROM fact_f13 WHERE ngay_do_kiem IN ('2098-02-16', '2098-02-18')`.
- Confirm `DELETE` changes equals `4`.
- `COMMIT`.

After cleanup:

- `0` rows remain for `2098-02-16` and `2098-02-18`.
- No `fact_f13.ngay_do_kiem` remains greater than business date `2026-07-23`.
- `fact_f13` date coverage is `2026-01-01` to `2026-07-22` across `201` distinct dates.
- No other dates or tables were deleted.

## Deferred Runtime Validation

Native HUE/TCT window-hide runtime validation remains deferred until re-authentication is required.

Do not treat this deferred validation as a blocker for the next Codex import-date-validation remediation.

## Fresh-Chat Onboarding Chain

1. `README_AI.md`
2. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
3. `docs/10_TICKETS/AUTO-IMPORT-006_MANIFEST.md`
4. `docs/06_REVIEWS/Import/AUTO-IMPORT-006_CHECKPOINT_009.md`

## Guardrails

- Current ticket remains `AUTO-IMPORT-006`.
- Current phase is `REMEDIATION-006 / READY FOR IMPLEMENTATION`.
- Do not reopen completed Dashboard tickets.
- Do not broad-audit the repository.
- Do not perform portal login unless the next authorized prompt explicitly requires PO runtime validation.
