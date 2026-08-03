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
| Current Phase | `F1.3 Shared Navigation & Filters Audit & Planning` |
| Current Ticket | `F13-SHARED-NAV-FILTERS-PLAN` |
| Next Ticket | `F13-SHARED-NAV-FILTERS-IMPL (pending PO approval of planning checkpoint)` |
| Last PO Status | `F13-SHARED-NAV-FILTERS-PLAN activated by PO authority for DISCOVERY AND PLANNING ONLY / NO IMPLEMENTATION. Audit and planning checkpoint completed; awaiting PO plan review.` |
| Current Branch | `codex/da-impl-006` |
| Current Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/F13-SHARED-NAV-FILTERS-PLAN_MANIFEST.md` |
| Current Checkpoint | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/06_REVIEWS/UI/F13_SHARED_NAV_FILTERS_PLAN_CHECKPOINT_001.md` |
| Current State | `ACTIVE / PLANNING ONLY / DISCOVERY & AUDIT COMPLETED / READY FOR PO PLAN REVIEW` |
| Technical Status | `Audit of shared navigation, application frame, and GlobalFilterBar completed across Dashboard, BCVH Ranking, and Route Ranking. Planning checkpoint docs/06_REVIEWS/UI/F13_SHARED_NAV_FILTERS_PLAN_CHECKPOINT_001.md created.` |
| Runtime Status | `NOT APPLICABLE (planning ticket only, no code modified)` |
| PO UI Check Required | `No — planning ticket only` |
| PO Product Status | `DISCOVERY & PLANNING COMPLETED — AWAITING PO REVIEW` |
| Last Closed Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/F13-ROUTE-RANKING-REDESIGN-IMPL_MANIFEST.md` |
| Last Reviewed Phase | `F13-ROUTE-RANKING-REDESIGN-IMPL closure: Product Owner PO PASS on all 12 items` |
| Last Reviewed Commit | `db142a065ff1aa7f8471ff0ee5d57bbaefea67be` |
| Phase Review Status | `F13-SHARED-NAV-FILTERS-PLAN ACTIVE / READY FOR PO PLAN REVIEW` |
| Next Phase Authorization | `F13-SHARED-NAV-FILTERS-PLAN is authorized for DISCOVERY AND PLANNING ONLY. No implementation authorized until PO reviews and approves F13_SHARED_NAV_FILTERS_PLAN_CHECKPOINT_001.md.` |
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

Activation (`2026-08-03`): Product Owner explicitly authorized `F13-SHARED-NAV-FILTERS-PLAN` for `DISCOVERY AND PLANNING ONLY / NO IMPLEMENTATION`. Audit of shared navigation (`SidebarNavigation`, `Topbar`, `Breadcrumb`, `appNavigation.jsx`), application frame (`SharedLayout`, `MainLayout`), and shared filter bar (`GlobalFilterBar`) across Operation Dashboard (`/f13/dashboard`), BCVH Ranking (`/f13/ranking/bcvh`), and Route Ranking (`/f13/ranking/route`) completed without modifying product code or business rules. Checkpoint `docs/06_REVIEWS/UI/F13_SHARED_NAV_FILTERS_PLAN_CHECKPOINT_001.md` created. Ready for PO Plan Review.

Fresh-chat onboarding chain:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. Current Manifest: `docs/10_TICKETS/F13-SHARED-NAV-FILTERS-PLAN_MANIFEST.md`
5. Checkpoint: `docs/06_REVIEWS/UI/F13_SHARED_NAV_FILTERS_PLAN_CHECKPOINT_001.md`
