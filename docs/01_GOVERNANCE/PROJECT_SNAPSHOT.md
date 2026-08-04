# PROJECT SNAPSHOT

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. Current Snapshot](#2-current-snapshot)
- [3. Usage Rules](#3-usage-rules)
- [4. Continuation Notes](#4-continuation-notes)

## 1. Purpose

This document is the Governance V2 current-state snapshot for AI onboarding.

It is designed to be the shortest safe entry point for a new AI session while preserving continuity with the existing Governance V1 workflow.

## 2. Current Snapshot

| Field | Value |
| --- | --- |
| Current Phase | `Awaiting Product Owner Direction` |
| Current Ticket | `None` |
| Next Ticket | `None. Candidates only, not authorized: (1) remediate RESIDUAL-01; (2) F13-SURFACE-CLEANUP-PLAN; (3) Pareto product design. Evidence MERGE and Message Center HIDE remain pending explicit Product Owner confirmation and must not be inferred.` |
| Last PO Status | `PO DECISIONS ISSUED 2026-08-04: (1) danh_gia_2026 is the authoritative F1.3 result field, FINAL, not to be reopened; (2) the duplicate overwrite/upsert rule on the authoritative business key is already decided and not reopened; (3) permanent removal of year-2098 test/future data is authorized; (4) the duplicate count is a technical validation item, not a PO decision. F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT-PLAN closed on this basis.` |
| Current Branch | `codex/da-impl-006` |
| Current Manifest | `None — no active ticket` |
| Current Checkpoint | `None — no active ticket` |
| Current State | `NO ACTIVE TICKET / AWAITING PRODUCT OWNER DIRECTION` |
| Technical Status | `F13-DATA-2098-CLEANUP-IMPL COMPLETED / TECHNICAL PASS / CLOSED — 8 rows permanently deleted (4 fact_f13 + 4 import_log) under predicate ngay_do_kiem LIKE '2098%' in a single committed transaction, after a verified VACUUM INTO backup. Zero 2098 rows and zero BCVH TEST rows remain. 2026 data unchanged: 663,126 rows, 213 days, authoritative KPI danh_gia_2026 identical at 58.6233%. integrity_check ok. Backup retained and must not be deleted. DQ-01 and DQ-03 CLOSED; DQ-04 RESOLVED by PO decision; DQ-07 RETRACTED. Confirmed open defect count is FOUR: DQ-02, DQ-05, DQ-06, DQ-08. No product code changed.` |
| Runtime Status | `NOT APPLICABLE — no product code or runtime change. Backend was live during cleanup, so a transactionally consistent VACUUM INTO snapshot was used instead of a file copy.` |
| PO UI Check Required | `No` |
| PO Product Status | `Cleanup technically completed and closed.` |
| Last Closed Ticket | `F13-DATA-2098-CLEANUP-IMPL` |
| Last Closed Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/F13-DATA-2098-CLEANUP-IMPL_MANIFEST.md` |
| Last Reviewed Phase | `F13-DATA-2098-CLEANUP-IMPL closure: CTO TECHNICAL PASS` |
| Last Reviewed Implementation Commit | `3b605beb7ed2deeae239dbb050cf9b03fbad9c43` |
| Phase Review Status | `COMPLETED / TECHNICAL PASS / CLOSED` |
| Next Phase Authorization | `None` |
| Governance Version | `V2 Active` |
| Last Updated | `2026-08-04` |

## 3. Usage Rules

- Read this document immediately after `README_AI.md`.
- Treat this document as the single live project-state snapshot for AI onboarding.
- Do not infer current state from chat history when this snapshot is available.
- Do not use this document to override SSOT, frozen docs, or Product Owner decisions.
- Keep workflow behavior unchanged unless a dedicated governance change is approved.
- `Last Closed Manifest` must always be a concrete GitHub Blob URL pointing to the manifest of the most recently closed ticket when Current Ticket = None.
- `Last Closed Manifest` must not contain placeholder labels or descriptive text.
- `Last PO Status` must reflect the latest authoritative Product Owner visible outcome, including explicit failure states when a ticket remains active.
- `Claude Code` reads this document as its single live-state source instead of re-reading the full `README_AI.md` chain every session; see `CLAUDE.md` for the condensed Claude Code onboarding equivalent.
- Whenever `Current Ticket` changes (a ticket closes or a new ticket activates), append exactly one new line to `PROJECT_PROGRESS.md`'s ticket history in the same update; never edit or delete prior lines. This snapshot does not itself keep historical entries.

## 4. Continuation Notes

This snapshot is intentionally narrow.

It exists to answer only the questions a fresh AI needs in order to continue:

- where the project is
- what ticket is active
- what comes next
- what branch is active
- what manifest governs the current reading scope

Current handoff: no active ticket. `F13-DATA-2098-CLEANUP-IMPL` is `COMPLETED / TECHNICAL PASS / CLOSED` as of `2026-08-04` (CTO review, implementation commit `3b605beb7ed2deeae239dbb050cf9b03fbad9c43`). The repository awaits explicit Product Owner direction before opening any next scope.

Cleanup execution (`2026-08-04`): Product Owner authorized permanent removal of year-2098 test/future data. All six date-bearing fields were scanned; zero 2098 values existed in any event timestamp, so the predicate `ngay_do_kiem LIKE '2098%'` was verified complete and precise. After a verified `VACUUM INTO` backup (`backend/src/db/backups/database.pre-2098-cleanup.2026-08-04.sqlite`, `integrity_check = ok`), 4 `fact_f13` rows and 4 `import_log` rows were deleted in a single guarded transaction. Zero 2098 rows remain; date range is now `2026-01-01`-`2026-08-03`. 2026 production data is unchanged (663,126 rows, 213 days, per-month counts identical) and the authoritative KPI `danh_gia_2026` is unchanged at `58.6233%`. `DQ-01` and `DQ-03` are closed; `DQ-07` is retracted. Evidence: `docs/06_REVIEWS/Shared/F13-DATA-2098-CLEANUP-IMPL_CHECKPOINT_001.md`.

Prior ticket: `F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT-PLAN` is `CLOSED — PO DECISIONS RECORDED` as of `2026-08-04`. The read-only audit found the product exposes only a small fraction of the 45 columns per shipment; origin-handover-to-delivery latency separates passing from failing shipments by 10.97h vs 47.68h across 595,046 complete chains and is surfaced nowhere; 10 customer accounts carry 37.5% of all failures; 46 of 154 routes are chronically failing; and three F1.3 navigation entries (Pareto/RCA, Evidence, Message Center) are placeholder screens whose backend endpoints are implemented by static inspection, with runtime behavior not verified. Evidence: `docs/06_REVIEWS/Shared/F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT_CHECKPOINT_001.md`.

Prior ticket: `F13-SHARED-NAV-FILTERS-IMPL` is `CLOSED / PO UI PASS` as of `2026-08-04`.

Implementation & Closure (`2026-08-04`): Product Owner awarded `PO UI PASS` to `F13-SHARED-NAV-FILTERS-IMPL`. Implemented parameter dual-read fallback (`bcvh_id || ma_bcvh`) across Dashboard, BCVH Ranking, and Route Ranking; updated Route Ranking title to `"Bảng xếp hạng Tuyến Bưu tá"`; replaced Route Ranking static BCVH list with dynamic metadata from `/f13/dashboard/meta`; updated `GlobalFilterBar` default prop `showKpiFilter = false`; preserved URL filter parameters (`from_date`, `to_date`, `bcvh_id`) across cross-module navigation via `urlPreservation.js`. Ticket closed. No active ticket. Repository awaits explicit Product Owner direction before opening any next scope.

Next-direction candidates — recorded as candidates only, **not authorized tickets**:

1. **Recommended first decision:** remediate `RESIDUAL-01`, because the live recommendations path (`ruleEngineService.js` → `GET /f13/recommendations`) uses the non-authoritative `ket_qua_f13` and may display KPI values inconsistent with `danh_gia_2026` (divergence up to 5.58 points per BCVH).
2. **Subsequent candidate:** `F13-SURFACE-CLEANUP-PLAN` — Evidence merge, Message Center hide, Vietnamese Shipment Ranking naming, redirect behavior, and verified orphan-page removal.
3. **Later:** Pareto product design, which must distinguish Pareto analysis from true RCA.

Evidence MERGE and Message Center HIDE remain **pending Product Owner confirmation**. No repository authority records an explicit Product Owner decision on either; approval must not be inferred.

Fresh-chat onboarding chain:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. No Current Manifest — `Current Ticket = None`. The onboarding chain ends at this document.
5. No Current Checkpoint — `Current Ticket = None`.

Await explicit Product Owner direction before activating any next ticket.
