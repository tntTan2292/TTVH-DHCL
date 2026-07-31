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
| Current Phase | `F1.3 UI Phase 4 PO Review` |
| Current Ticket | `F13-UI-AUDIT-PLAN` |
| Next Ticket | `Product Owner review of Phase 4 (Observation Group Viewport Optimization); no new implementation authority until that review completes` |
| Last PO Status | `AUTO-IMPORT-010 closed with PO RUNTIME PASS on 2026-07-31: Dashboard, HUE, and TCT all confirmed working under the standard launcher, including successful HUE and TCT login/import for 2026-07-30. A known HUE first-click browser-open residual is recorded as KNOWN RESIDUAL / DEFERRED / NON-BLOCKING by explicit Product Owner decision. F13-UI-AUDIT-PLAN is reactivated as Current Ticket; Phase 4 is already implemented (Commit 235b69d0aa1a5b776b3398fde50c60172f7e4181) and awaits Product Owner review.` |
| Current Branch | `codex/da-impl-006` |
| Current Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/F13-UI-AUDIT-PLAN_MANIFEST.md` |
| Current Checkpoint | `F13_UI_AUDIT_PLAN_CHECKPOINT_001.md` |
| Current State | `F13-UI-AUDIT-PLAN / PHASE 4 COMPLETED / PENDING PO REVIEW / NO NEW IMPLEMENTATION` |
| Technical Status | `PHASE 1, 2, 3 & 4 IMPLEMENTED; PHASE 4 PENDING PO REVIEW` |
| Runtime Status | `PHASE 4 VERIFIED VIA PLAYWRIGHT VIEWPORT CHECK, NOT YET PO REVIEWED` |
| PO UI Check Required | `Yes - Phase 4 visible layout change awaits Product Owner review` |
| PO Product Status | `PHASE 1, 2 & 3 PO PASS / PHASE 4 PENDING PO REVIEW` |
| Last Closed Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/AUTO-IMPORT-010_MANIFEST.md` |
| Last Reviewed Phase | `AUTO-IMPORT-010 closure: Product Owner runtime acceptance covering Dashboard, HUE, and TCT` |
| Last Reviewed Commit | `4435d20161fb4ab35509a3a313587887bbccb591` (last code-affecting commit; this correction round is documentation only, baseline `14a4d5854e6dcb1dcc5678c274323d1220f46c8d`) |
| Phase Review Status | `AUTO-IMPORT-010 CLOSED / PO RUNTIME PASS; F13-UI-AUDIT-PLAN PHASE 4 PENDING PO REVIEW` |
| Next Phase Authorization | `Repository awaits Product Owner review of the already-implemented Phase 4 (docs/06_REVIEWS/UI/F13_UI_AUDIT_PLAN_CHECKPOINT_001.md Section 6). No new UI implementation is authorized until that review completes and ChatGPT coordination issues a separately bounded prompt for any next scope. Do not reopen AUTO-IMPORT-010, broker, coordinator, TCT expansion, or Node window hiding without explicit Product Owner authority.` |
| Governance Version | `V2 Active` |
| Last Updated | `2026-07-31` |

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

Current handoff: `AUTO-IMPORT-010` is `CLOSED / PO RUNTIME PASS` as of `2026-07-31`. Product Owner runtime acceptance confirmed Dashboard, HUE, and TCT all working under the standard launcher, including successful HUE and TCT login/import for `2026-07-30`. A known HUE first-click browser-open residual is recorded in `AUTO-IMPORT-010_MANIFEST.md` and `AUTO-IMPORT-010_CHECKPOINT_003.md` as `KNOWN RESIDUAL / DEFERRED / NON-BLOCKING` by explicit Product Owner decision; it is not an open defect and has no remediation ticket. Import authentication recovery is no longer active.

Historical Import guidance that previously marked earlier authentication rounds as completed is superseded by the closure record above. Internal unit tests, PID discovery, HWND enumeration, URL reachability, or `LOGIN_IN_PROGRESS` are not sufficient to claim Product Owner pass by themselves; this closure is based on direct Product Owner runtime acceptance.

Operation Dashboard history remains preserved. Phase 1 implementation `6ea7819`, Phase 1 remediation `cbe5bc2`, Phase 2 implementation `dd9cbf5`, Phase 3 implementation `32c10f5470bf1d3a530a767b42ab1948f7f3e61d`, Phase 3 PO PASS governance `5d29c0f0212fc59fac08131e42b5f1e2cfbacf73`, and Phase 4 implementation `235b69d0aa1a5b776b3398fde50c60172f7e4181` (Observation Group Viewport Optimization) remain accepted as implemented. Phase 4 documentation `5e1fa20` and cleanup `.gitignore` protection `f7df0b56e6ec43d97ff48c68dd6fbb2e5ed3f558` are also part of this history. `docs/10_TICKETS/F13-UI-AUDIT-PLAN_MANIFEST.md` is now the current ticket, state `PHASE 4 COMPLETED / PENDING PO REVIEW / NO NEW IMPLEMENTATION`.

Resolved inconsistency (previously flagged in this section, now closed): an earlier draft of this snapshot described Phase 4 as both "already implemented" and, via the manifest, `NOT YET DISPATCHED`. Verified technical evidence confirms `235b69d0aa1a5b776b3398fde50c60172f7e4181` is an ancestor of the current branch HEAD and is the real Phase 4 implementation commit; `docs/06_REVIEWS/UI/F13_UI_AUDIT_PLAN_CHECKPOINT_001.md` independently records Phase 4 as `COMPLETED / PENDING PO REVIEW`. The manifest's prior `NOT YET DISPATCHED` wording was the stale side and has been corrected. Phase 4 is implemented; it awaits Product Owner review, not new implementation.

Fresh-chat onboarding chain for the current active ticket:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. `docs/10_TICKETS/F13-UI-AUDIT-PLAN_MANIFEST.md`
5. Required Reading from the current manifest
