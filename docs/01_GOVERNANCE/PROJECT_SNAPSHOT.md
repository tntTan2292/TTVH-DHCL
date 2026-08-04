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
| Current Phase | `Discovery / Read-only Audit` |
| Current Ticket | `F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT-PLAN` |
| Next Ticket | `None selected. Depends on Product Owner direction from the database audit review; the audit proposes a five-wave sequence but opens no implementation scope.` |
| Last PO Status | `PO AUTHORIZED PLANNING for F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT-PLAN on 2026-08-04. Prior ticket F13-SHARED-NAV-FILTERS-IMPL closed 2026-08-04 with PO UI PASS (final implementation commit e4c57e0d).` |
| Current Branch | `codex/da-impl-006` |
| Current Manifest | `docs/10_TICKETS/F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT-PLAN_MANIFEST.md` |
| Current Checkpoint | `docs/06_REVIEWS/Shared/F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT_CHECKPOINT_001.md` |
| Current State | `READY FOR PO DATABASE AUDIT REVIEW` |
| Technical Status | `AUDIT COMPLETE — Read-only audit of database (5 tables, fact_f13 663,130 rows x 45 columns, 213 usable days), API surface (33 endpoints), and all 7 F1.3 screens. 18 opportunities ranked, 8 data-quality defects catalogued, 1 latent API defect found. No schema, data, or product code changed.` |
| Runtime Status | `NOT APPLICABLE — no runtime change and no browser session; audit is static analysis plus read-only database query.` |
| PO UI Check Required | `No — no UI change. Product Owner direction review required instead (see manifest Section 14).` |
| PO Product Status | `AWAITING PO DATABASE AUDIT REVIEW` |
| Last Closed Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/F13-SHARED-NAV-FILTERS-IMPL_MANIFEST.md` |
| Last Reviewed Phase | `F13-SHARED-NAV-FILTERS-IMPL closure: Product Owner PO UI PASS` |
| Last Reviewed Commit | `e4c57e0d` |
| Phase Review Status | `F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT-PLAN ACTIVE / READY FOR PO DATABASE AUDIT REVIEW` |
| Next Phase Authorization | `No implementation ticket is authorized. Three Product Owner decisions gate the proposed Wave 1: MERGE confirmation (Evidence into Shipment Ranking), HIDE confirmation (Message Center), and MD-01 (which of ket_qua_f13 / danh_gia_2026 is authoritative).` |
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

Current handoff: `F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT-PLAN` is `ACTIVE / READY FOR PO DATABASE AUDIT REVIEW` as of `2026-08-04`.

Audit activation (`2026-08-04`): Product Owner authorized planning for a read-only audit of the database, API capabilities, and all F1.3 product surfaces. The audit is complete and is recorded in `docs/06_REVIEWS/Shared/F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT_CHECKPOINT_001.md`. Headline findings: the product exposes only a small fraction of the 45 columns available per shipment; origin-handover-to-delivery latency separates passing from failing shipments by 10.97h vs 47.68h across 595,046 complete chains and is surfaced nowhere; 10 customer accounts carry 37.5% of all failures; 46 of 154 routes are chronically failing; and three F1.3 navigation entries (Pareto/RCA, Evidence, Message Center) are placeholder screens despite having working backend endpoints. Eight data-quality defects (`DQ-01`…`DQ-08`) and one latent API path defect (`API-01`) are catalogued. No schema, data, index, or product code was changed. No implementation ticket is opened by this audit; it awaits Product Owner direction.

Prior ticket: `F13-SHARED-NAV-FILTERS-IMPL` is `CLOSED / PO UI PASS` as of `2026-08-04`.

Implementation & Closure (`2026-08-04`): Product Owner awarded `PO UI PASS` to `F13-SHARED-NAV-FILTERS-IMPL`. Implemented parameter dual-read fallback (`bcvh_id || ma_bcvh`) across Dashboard, BCVH Ranking, and Route Ranking; updated Route Ranking title to `"Bảng xếp hạng Tuyến Bưu tá"`; replaced Route Ranking static BCVH list with dynamic metadata from `/f13/dashboard/meta`; updated `GlobalFilterBar` default prop `showKpiFilter = false`; preserved URL filter parameters (`from_date`, `to_date`, `bcvh_id`) across cross-module navigation via `urlPreservation.js`. Ticket closed. No active ticket. Repository awaits explicit Product Owner direction before opening any next scope.

Fresh-chat onboarding chain:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. Current Manifest: `docs/10_TICKETS/F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT-PLAN_MANIFEST.md`
5. Current Checkpoint: `docs/06_REVIEWS/Shared/F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT_CHECKPOINT_001.md`
