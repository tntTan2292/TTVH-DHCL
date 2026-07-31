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
| Current Phase | `F1.3 UI Phase 4 Discovery/Planning` |
| Current Ticket | `F13-UI-AUDIT-PLAN` |
| Next Ticket | `Bounded ChatGPT-issued Phase 4 UI discovery/planning prompt for Antigravity (no implementation authority yet)` |
| Last PO Status | `AUTO-IMPORT-010 closed with PO RUNTIME PASS on 2026-07-31: Dashboard, HUE, and TCT all confirmed working under the standard launcher, including successful HUE and TCT login/import for 2026-07-30. A known HUE first-click browser-open residual is recorded as KNOWN RESIDUAL / DEFERRED / NON-BLOCKING by explicit Product Owner decision. F13-UI-AUDIT-PLAN is reactivated as Current Ticket; discovery/planning only, no implementation authorized.` |
| Current Branch | `codex/da-impl-006` |
| Current Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/F13-UI-AUDIT-PLAN_MANIFEST.md` |
| Current Checkpoint | `F13_UI_AUDIT_PLAN_CHECKPOINT_001.md` |
| Current State | `F13-UI-AUDIT-PLAN / READY FOR DISCOVERY/PLANNING / NO IMPLEMENTATION` |
| Technical Status | `PHASE 1, 2 & 3 IMPLEMENTED AND PO PASS; PHASE 4 NOT DISPATCHED` |
| Runtime Status | `NOT APPLICABLE (PLANNING ONLY)` |
| PO UI Check Required | `No - no visible product change at this planning step` |
| PO Product Status | `PHASE 1, 2 & 3 PO PASS / PHASE 4 NOT STARTED` |
| Last Closed Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/AUTO-IMPORT-010_MANIFEST.md` |
| Last Reviewed Phase | `AUTO-IMPORT-010 closure: Product Owner runtime acceptance covering Dashboard, HUE, and TCT` |
| Last Reviewed Commit | `f10cbe823af454997def0897c4a3f92425d4da63` |
| Phase Review Status | `AUTO-IMPORT-010 CLOSED / PO RUNTIME PASS` |
| Next Phase Authorization | `Repository awaits a separately bounded ChatGPT coordination prompt to dispatch Phase 4 UI discovery/planning for Antigravity. No implementation authorized yet. Do not reopen AUTO-IMPORT-010, broker, coordinator, TCT expansion, or Node window hiding without explicit Product Owner authority.` |
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

Operation Dashboard history remains preserved. Phase 1 implementation `6ea7819`, Phase 1 remediation `cbe5bc2`, Phase 2 implementation `dd9cbf5`, Phase 3 implementation `32c10f5470bf1d3a530a767b42ab1948f7f3e61d`, and Phase 3 PO PASS governance `5d29c0f0212fc59fac08131e42b5f1e2cfbacf73` remain accepted. `docs/10_TICKETS/F13-UI-AUDIT-PLAN_MANIFEST.md` is now the current ticket, reactivated `READY FOR DISCOVERY/PLANNING / NO IMPLEMENTATION`.

Note on an unresolved inconsistency (not resolved in this closure round): this section previously referenced a "Phase 4" already carrying implementation commit `235b69d0aa1a5b776b3398fde50c60172f7e4181`, documentation `5e1fa20`, and `.gitignore` protection `f7df0b56e6ec43d97ff48c68dd6fbb2e5ed3f558`, described as paused pending Import authentication. This conflicts with `F13-UI-AUDIT-PLAN_MANIFEST.md`, which states Phase 4 is `NOT YET DISPATCHED` with no implementation commits recorded. The manifest is treated as authoritative for current Phase 4 status per its `L2 Active Onboarding` authority. This conflict is preserved here for visibility and requires ChatGPT/Product Owner clarification before Phase 4 UI implementation begins; it does not block the current discovery/planning-only state.

Fresh-chat onboarding chain for the current active ticket:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. `docs/10_TICKETS/F13-UI-AUDIT-PLAN_MANIFEST.md`
5. Required Reading from the current manifest
