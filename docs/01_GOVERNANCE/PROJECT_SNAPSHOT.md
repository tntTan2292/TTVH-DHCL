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
| Current Phase | `F1.3 Shared Navigation & Filters Implementation` |
| Current Ticket | `F13-SHARED-NAV-FILTERS-IMPL` |
| Next Ticket | `None selected. Pending PO UI check and ticket closure for F13-SHARED-NAV-FILTERS-IMPL.` |
| Last PO Status | `F13-SHARED-NAV-FILTERS-PLAN received PO PLAN PASS (2026-08-03). F13-SHARED-NAV-FILTERS-IMPL activated and implemented (parameter dual-read compatibility, Route Ranking dynamic BCVH meta, title update); ready for PO UI review.` |
| Current Branch | `codex/da-impl-006` |
| Current Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/F13-SHARED-NAV-FILTERS-IMPL_MANIFEST.md` |
| Current Checkpoint | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/06_REVIEWS/UI/F13_SHARED_NAV_FILTERS_PLAN_CHECKPOINT_001.md` |
| Current State | `ACTIVE / IMPLEMENTATION COMPLETED / READY FOR PO UI REVIEW` |
| Technical Status | `Implementation of F13-SHARED-NAV-FILTERS-IMPL completed. Parameter dual-read compatibility (bcvh_id || ma_bcvh), Route Ranking dynamic BCVH metadata, title update ("Bảng xếp hạng Tuyến Bưu tá"), and GlobalFilterBar default prop cleanup implemented.` |
| Runtime Status | `READY FOR PO UI VERIFICATION` |
| PO UI Check Required | `Yes — implementation ticket active` |
| PO Product Status | `IMPLEMENTATION COMPLETED — AWAITING PO UI REVIEW` |
| Last Closed Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/F13-SHARED-NAV-FILTERS-PLAN_MANIFEST.md` |
| Last Reviewed Phase | `F13-SHARED-NAV-FILTERS-PLAN closure: Product Owner PO PLAN PASS (2026-08-03)` |
| Last Reviewed Commit | `af42d370` |
| Phase Review Status | `F13-SHARED-NAV-FILTERS-IMPL ACTIVE / IMPLEMENTATION COMPLETED` |
| Next Phase Authorization | `F13-SHARED-NAV-FILTERS-IMPL is active for implementation under PO PLAN PASS. Await PO UI review before closing ticket.` |
| Governance Version | `V2 Active` |
| Last Updated | `2026-08-03` |

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

Current handoff: `AUTO-IMPORT-010` is `CLOSED / PO RUNTIME PASS` as of `2026-07-31`.

Activation & Implementation (`2026-08-03`): Product Owner explicitly awarded `PO PLAN PASS` to `F13-SHARED-NAV-FILTERS-PLAN` and authorized `F13-SHARED-NAV-FILTERS-IMPL`. Implemented parameter dual-read fallback (`bcvh_id || ma_bcvh`) across Dashboard, BCVH Ranking, and Route Ranking; updated Route Ranking title to `"Bảng xếp hạng Tuyến Bưu tá"`; replaced Route Ranking static BCVH list with dynamic metadata from `/f13/dashboard/meta`; updated `GlobalFilterBar` default prop `showKpiFilter = false`. Preserved all tables, KPI formulas, Import Center, and role boundaries. Ready for PO UI review.

Fresh-chat onboarding chain:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. Current Manifest: `docs/10_TICKETS/F13-SHARED-NAV-FILTERS-IMPL_MANIFEST.md`
5. Checkpoint: `docs/06_REVIEWS/UI/F13_SHARED_NAV_FILTERS_PLAN_CHECKPOINT_001.md`
