# F13-DATA-2098-CLEANUP-IMPL — MANIFEST

## Table of Contents

- [1. Ticket Information](#1-ticket-information)
- [2. Objective](#2-objective)
- [3. Current Status](#3-current-status)
- [4. Required Reading](#4-required-reading)
- [5. Business Context](#5-business-context)
- [6. Technical Context](#6-technical-context)
- [7. Runtime Context](#7-runtime-context)
- [8. Related Review](#8-related-review)
- [9. Related PO Findings](#9-related-po-findings)
- [10. Documents To Update](#10-documents-to-update)
- [11. Validation](#11-validation)
- [12. Expected Output](#12-expected-output)
- [13. Next Ticket](#13-next-ticket)
- [14. PO Acceptance Checklist](#14-po-acceptance-checklist)
- [15. Authority Escalation](#15-authority-escalation)
- [16. Closure](#16-closure)

## 1. Ticket Information

- Ticket ID: `F13-DATA-2098-CLEANUP-IMPL`
- Ticket Name: Permanent removal of year-2098 test/future data from the operational database
- Phase: Bounded implementation (destructive data cleanup)
- Owner: Claude Code (implementation, data, documentation, Git per DEC-020)
- Governance Version: `V2 Active`
- Authorization: Product Owner, `2026-08-04`

## 2. Objective

Permanently remove all year-2098 test/future data from the operational system under a bounded, evidence-backed, reversible-by-backup procedure, without touching 2026 production data or any product code.

## 3. Current Status

- Current state: `READY FOR PO DATA CLEANUP RECHECK`
- PO UI Check Required: `No` — no UI change. Product Owner **data recheck** is required instead.
- PO Product Status: `AWAITING PO DATA CLEANUP RECHECK`

## 4. Required Reading

- `docs/06_REVIEWS/Shared/F13-DATA-2098-CLEANUP-IMPL_CHECKPOINT_001.md` — full execution evidence; self-contained
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md` — live state

## 5. Business Context

- Business problem: four test rows dated `2098-02` had reached the operational database. They inflated `MAX(ngay_do_kiem)` to `2098-02-18`, so any "latest date with data" logic that trusts `MAX()` would resolve to a date 72 years in the future and return an empty screen. They also caused the `DQ-03` BCVH code/name collision.
- Business impact: removal restores a truthful date range (`2026-01-01`–`2026-08-03`), eliminates a latent empty-screen failure mode, and closes `DQ-01` and `DQ-03`.
- Approved business rule constraints: the Product Owner authorized permanent removal of year-2098 data on `2026-08-04`. No other data may be deleted. `BCVH TEST` rows may be deleted **only** where they also match the confirmed year-2098 predicate — a condition satisfied for all four rows, with no `BCVH TEST` row existing outside 2098.

## 6. Technical Context

- Database: `backend/src/db/database.sqlite`
- Backup: `backend/src/db/backups/database.pre-2098-cleanup.2026-08-04.sqlite` (543,047,680 bytes, `integrity_check = ok`)
- Affected tables: `fact_f13` (4 rows), `import_log` (4 rows)
- Untouched tables: `fact_f13_national`, `sys_kpi_thresholds`, `system_config`
- Exact predicate: `ngay_do_kiem LIKE '2098%'`, applied to both affected tables
- Product code changed: **none**
- Relevant code read (not modified): `backend/src/services/importProcessor.js` (import replacement key), `backend/src/services/ruleEngineService.js`, `backend/src/controllers/kpiController.js`

## 7. Runtime Context

- Backend was running during execution; a `VACUUM INTO` snapshot was used rather than a file copy to guarantee a transactionally consistent backup.
- Deletion ran in a single `BEGIN IMMEDIATE` transaction with pre-commit guards and an automatic rollback path.
- No browser session was run and no runtime endpoint was invoked; runtime evidence remains Antigravity's ownership per DEC-020.

## 8. Related Review

- Review document: `docs/06_REVIEWS/Shared/F13-DATA-2098-CLEANUP-IMPL_CHECKPOINT_001.md`
- Review status: `COMPLETE — READY FOR PO DATA CLEANUP RECHECK`
- Key evidence: 8 rows deleted (4 + 4), transaction `COMMITTED`, zero 2098 rows remaining anywhere, 2026 row count / day count / per-month distribution all unchanged, authoritative KPI `danh_gia_2026` unchanged at `58.6233%`, `integrity_check = ok`, zero orphaned rows, zero duplicates on the business key.

## 9. Related PO Findings

- PO finding IDs: none. Originates from Product Owner decisions issued on the `F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT-PLAN` review.
- Status: authorization granted `2026-08-04`.
- Closure requirement: Product Owner data recheck.

## 10. Documents To Update

- `docs/06_REVIEWS/Shared/F13-DATA-2098-CLEANUP-IMPL_CHECKPOINT_001.md` — created
- `docs/10_TICKETS/F13-DATA-2098-CLEANUP-IMPL_MANIFEST.md` — created (this document)
- `docs/06_REVIEWS/Shared/F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT_CHECKPOINT_001.md` — updated with PO decisions, `DQ-07` retraction, `MD-01/05/06` closure
- `docs/10_TICKETS/F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT-PLAN_MANIFEST.md` — closed
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`, `PROJECT_PROGRESS.md`, `docs/01_GOVERNANCE/DOCUMENT_INDEX.md` — synchronized

## 11. Validation

Full evidence in checkpoint Sections 3–8. Summary:

- **Identification:** all six date-bearing fields scanned. Zero 2098 values in any of the five event timestamps, so the date-only predicate is provably complete and precise (0 rows would be missed).
- **Backup:** `VACUUM INTO` snapshot verified for row counts and `integrity_check` before any write; execution aborts if the backup does not match live state.
- **Deletion:** single transaction, 4 + 4 rows, two pre-commit guards (zero 2098 remaining; 2026 count unchanged), `COMMITTED`.
- **Post-delete:** 0 rows for year 2098 in `fact_f13`, `import_log`, and `fact_f13_national`; 0 `BCVH TEST` rows; date range `2026-01-01`–`2026-08-03`; 2026 rows 663,126 and 213 days both unchanged; every month's row count identical to the audit baseline; `integrity_check = ok`; 0 orphaned fact rows; 0 duplicates on `(ngay_do_kiem, ma_bg)`.
- **Authoritative field:** `danh_gia_2026` KPI identical pre and post (`58.6233%`, 637,445 evaluated, 373,691 Đạt). Representative BCVH ranking intact. No code changed, so the authoritative field was not altered.
- **Duplicate revalidation:** original query keyed on `ma_bg` alone was invalid; the real key `UNIQUE(ngay_do_kiem, ma_bg)` yields zero duplicates and zero exact full-row duplicates; the 9,348 repeated `ma_bg` are shipments evaluated across 2–3 dates. `DQ-07` retracted.
- **Side effect:** `DQ-03` (BCVH code/name collision) closed — distinct names dropped from 10 to 9, matching the 9 distinct codes.
- Build or lint validation: not applicable — no product code was modified.

## 12. Expected Output

- What the ticket must achieve: permanent removal of year-2098 data with full evidence and a recoverable backup. **Achieved.**
- What must remain unchanged: all 2026 data, `fact_f13_national`, all product code, all frontend surfaces, the authoritative F1.3 field. **All unchanged and verified.**
- What must not be introduced: deduplication of other records, changes to the authoritative field, or modification of unrelated data. **None introduced.**

## 13. Next Ticket

- Next ticket ID: none authorized.
- Next ticket name: not selected.
- Handoff notes: two residuals are reported for Product Owner/CTO consideration but are **not** in scope and were not acted on:
  1. **`RESIDUAL-01` (high):** `ruleEngineService.js` computes live recommendation KPIs on `ket_qua_f13`, the non-authoritative field, making `GET /f13/recommendations` systematically optimistic by up to **5.58 points** per BCVH (province-wide `63.4988%` vs authoritative `58.6233%`). The divergence pre-existed the Product Owner decision; aligning it requires a separate authorized ticket.
  2. **`RESIDUAL-02` (low):** `FactBuuGuiRepository.js` inserts columns (`session_id`, `extended_data`) that do not exist in the `fact_f13` schema.

  Also still outstanding from the audit and unchanged: MERGE confirmation (Evidence → Shipment Ranking) and HIDE confirmation (Message Center).

## 14. PO Acceptance Checklist

`PO UI Check Required = No`. A **data recheck** is required.

- Review document: `docs/06_REVIEWS/Shared/F13-DATA-2098-CLEANUP-IMPL_CHECKPOINT_001.md`
- PO purpose: confirm year-2098 data is gone and 2026 production data is intact
- Checks:
  1. Date range now reads `2026-01-01`–`2026-08-03` on any date-driven screen; no 2098 date appears in any picker or "latest date" control
  2. Total row count is 663,126 and 2026 day coverage is 213 days
  3. Authoritative KPI (`danh_gia_2026`) still reports `58.6233%` province-wide
  4. BCVH list shows 9 units with no `BCVH TEST` entry
- PASS criteria: all four confirmed → ticket closes, backup may be retired
- WARNING criteria: cosmetic or unrelated discrepancy → record and close with a follow-up note
- FAIL criteria: missing or altered 2026 data → restore from `backend/src/db/backups/database.pre-2098-cleanup.2026-08-04.sqlite` by file replace, then re-scope
- Follow-up after PASS: Product Owner decides whether to authorize a ticket for `RESIDUAL-01`
- Documents to update per result: `PROJECT_SNAPSHOT.md`, `PROJECT_PROGRESS.md`, and Section 16 of this manifest

## 15. Authority Escalation

No escalation required. The deletion was explicitly Product Owner-authorized, bounded by a predicate verified as complete and precise, and executed with a verified backup and in-transaction guards.

Where findings fell outside the authorized scope (`RESIDUAL-01`, `RESIDUAL-02`), they were reported rather than fixed. No business rule was inferred.

## 16. Closure

- Status: `READY FOR PO DATA CLEANUP RECHECK`
- Closure conditions: Product Owner completes the four data rechecks in Section 14 and confirms PASS. The backup is retained until that confirmation.
- Not claimed: this ticket does not award itself PO acceptance and opens no further scope.
