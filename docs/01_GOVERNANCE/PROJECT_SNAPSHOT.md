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
| Current Phase | `F13-ROUTE-RANKING-REDESIGN-IMPL — Implementation` |
| Current Ticket | `F13-ROUTE-RANKING-REDESIGN-IMPL` |
| Next Ticket | `None selected beyond this implementation ticket. Deferred items (bưu tá mapping, root cause, Shipment drill-down runtime, date-range/trend) each require a separate future PO/CTO decision before a next ticket is scoped. Remaining future sequence (BCVH Ranking, shared navigation/filters, Login/system states, final consistency review) stays not authorized and not self-activated.` |
| Last PO Status | `F13-UI-AUDIT-PLAN closed 2026-08-03 with PO PASS on all phases (unchanged). F13-ROUTE-RANKING-REDESIGN-PLAN closed 2026-08-03: Product Owner approved the design plan and ChatGPT/CTO finalized the implementation scope in F13_ROUTE_RANKING_REDESIGN_PLAN_CHECKPOINT_001.md, cancelling all inferred priority-tier/threshold logic (no sys_kpi_thresholds usage, no color tiers, no intervention threshold, no unevaluated-exclusion rule). F13-ROUTE-RANKING-REDESIGN-IMPL activated 2026-08-03 with implementation authorized for executor Claude Code-Sonnet.` |
| Current Branch | `codex/da-impl-006` |
| Current Manifest | `docs/10_TICKETS/F13-ROUTE-RANKING-REDESIGN-IMPL_MANIFEST.md` |
| Current Checkpoint | `docs/06_REVIEWS/Route/F13_ROUTE_RANKING_REDESIGN_PLAN_CHECKPOINT_001.md` (binding locked scope for implementation) |
| Current State | `ACTIVE / IMPLEMENTATION AUTHORIZED / NOT STARTED` |
| Technical Status | `GOVERNANCE ONLY — design plan finalized and implementation ticket activated; no product code changed yet` |
| Runtime Status | `NOT APPLICABLE (implementation not started)` |
| PO UI Check Required | `Yes — required before F13-ROUTE-RANKING-REDESIGN-IMPL can close` |
| PO Product Status | `NOT STARTED` |
| Last Closed Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/F13-ROUTE-RANKING-REDESIGN-PLAN_MANIFEST.md` |
| Last Reviewed Phase | `F13-ROUTE-RANKING-REDESIGN-PLAN closure: PO approved design plan, CTO finalized implementation scope` |
| Last Reviewed Commit | `bf0cfc605530b0f3e989ed50639a9316173f5a05` |
| Phase Review Status | `F13-ROUTE-RANKING-REDESIGN-PLAN CLOSED / PO APPROVED / CTO FINALIZED; F13-ROUTE-RANKING-REDESIGN-IMPL ACTIVE / NOT STARTED` |
| Next Phase Authorization | `F13-ROUTE-RANKING-REDESIGN-IMPL is authorized for implementation strictly within the scope locked in the checkpoint (Section 3) and manifest Section 12 forbidden list. No other ticket (Dashboard, BCVH Ranking, Import, or any closed ticket) is authorized to be reopened or modified.` |
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

Current handoff: `AUTO-IMPORT-010` is `CLOSED / PO RUNTIME PASS` as of `2026-07-31`. Product Owner runtime acceptance confirmed Dashboard, HUE, and TCT all working under the standard launcher, including successful HUE and TCT login/import for `2026-07-30`. A known HUE first-click browser-open residual is recorded in `AUTO-IMPORT-010_MANIFEST.md` and `AUTO-IMPORT-010_CHECKPOINT_003.md` as `KNOWN RESIDUAL / DEFERRED / NON-BLOCKING` by explicit Product Owner decision; it is not an open defect and has no remediation ticket. Import authentication recovery is no longer active.

Historical Import guidance that previously marked earlier authentication rounds as completed is superseded by the closure record above. Internal unit tests, PID discovery, HWND enumeration, URL reachability, or `LOGIN_IN_PROGRESS` are not sufficient to claim Product Owner pass by themselves; this closure is based on direct Product Owner runtime acceptance.

Operation Dashboard history remains preserved. Phase 1 implementation `6ea7819`, Phase 1 remediation `cbe5bc2`, Phase 2 implementation `dd9cbf5`, Phase 3 implementation `32c10f5470bf1d3a530a767b42ab1948f7f3e61d`, Phase 3 PO PASS governance `5d29c0f0212fc59fac08131e42b5f1e2cfbacf73`, and Phase 4 implementation `235b69d0aa1a5b776b3398fde50c60172f7e4181` (Observation Group Viewport Optimization) plus follow-on fixes `32ccdb06`, `525339c2`, `77efbcde`, and `cdb9eab2` (layout density, duplicate legend removal, and month-cumulative-rank display in the heatmap) remain accepted as implemented and PO PASS.

Closure (`2026-08-03`): `docs/10_TICKETS/F13-UI-AUDIT-PLAN_MANIFEST.md` is `COMPLETED / PO PASS (PHASE 1-4) / CLOSED`. Product Owner confirmed Phase 4 - Operation Dashboard: the heatmap shows month-cumulative rank inside the `TB THÁNG` cell, backend was restarted to load the fix, and the runtime result was confirmed correct after restart. No ticket from that manifest's recorded future sequence was self-activated by this closure.

Activation (`2026-08-03`): Product Owner explicitly authorized `F13-ROUTE-RANKING-REDESIGN-PLAN` for `DISCOVERY AND PLANNING ONLY / NO IMPLEMENTATION`, using delta-only discovery against baseline commit `7fd33ce130227a0c2b24d3b36aa0980bf8fc9ad3`. Discovery covered only the minimum templates/rules needed to activate the ticket and Route Ranking source files with direct dependencies; Dashboard, BCVH Ranking, Import, and other closed tickets were not reopened or inspected. No product code was modified.

Closure (`2026-08-03`): `docs/10_TICKETS/F13-ROUTE-RANKING-REDESIGN-PLAN_MANIFEST.md` is `COMPLETED / CLOSED / PO APPROVED / CTO FINALIZED`. Product Owner confirmed the redesign business objective, then approved a design plan built on static-code inspection (Antigravity, `docs/F13_ROUTE_RANKING_EVIDENCE_HANDOFF.md`) and targeted read-only data discovery (Claude Code–Opus, against `backend/src/db/database.sqlite`). ChatGPT/CTO finalized the implementation scope, explicitly cancelling all inferred priority-tier/threshold logic from the draft (no `sys_kpi_thresholds` usage, no color tiers, no `<60%` intervention threshold, no unevaluated-exclusion rule). The binding locked scope is recorded in `docs/06_REVIEWS/Route/F13_ROUTE_RANKING_REDESIGN_PLAN_CHECKPOINT_001.md`. No product code was modified by the planning ticket.

Activation (`2026-08-03`): `F13-ROUTE-RANKING-REDESIGN-IMPL` is created and authorized for implementation, executor `Claude Code–Sonnet`, strictly within the checkpoint's locked scope and forbidden-inference list. See `docs/10_TICKETS/F13-ROUTE-RANKING-REDESIGN-IMPL_MANIFEST.md`.

Fresh-chat onboarding chain (active implementation ticket):

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. `docs/10_TICKETS/F13-ROUTE-RANKING-REDESIGN-IMPL_MANIFEST.md`
5. Required Reading from that manifest, including `docs/06_REVIEWS/Route/F13_ROUTE_RANKING_REDESIGN_PLAN_CHECKPOINT_001.md` (binding scope).
6. Proceed into implementation per the manifest's Section 12 scope and forbidden list; escalate per manifest Section 15 instead of inferring anything outside it.
