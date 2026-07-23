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
