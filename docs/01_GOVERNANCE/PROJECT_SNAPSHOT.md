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
| Next Ticket | `None selected. Deferred items from F13-ROUTE-RANKING-REDESIGN-IMPL (bưu tá mapping, root cause, Shipment drill-down runtime, date-range/trend) each require a separate future PO/CTO decision before a next ticket is scoped. Remaining future sequence (shared navigation/filters, Login/system states, final consistency review) stays not authorized and not self-activated.` |
| Last PO Status | `F13-ROUTE-RANKING-REDESIGN-IMPL closed 2026-08-03 with PO PASS on all 12 items: default sort/columns/KPI/filter/layout (1, 3-9), BLACK=Chuyển hoàn naming (2), delayed-cash table/panel (10, numbers corrected via R5/R6 shared-engine sync), BG CHẬM NỘP TIỀN widget (11), and BCVH Ranking default-date fix (12). Final implementation commit 43819b9272910fcaddb9c058c97913648b10654d.` |
| Current Branch | `codex/da-impl-006` |
| Current Manifest | `None — no active ticket. See Last Closed Manifest.` |
| Current Checkpoint | `None — no active ticket.` |
| Current State | `NO ACTIVE TICKET / AWAITING PRODUCT OWNER DIRECTION` |
| Technical Status | `F13-ROUTE-RANKING-REDESIGN-IMPL COMPLETED — Route Ranking redesign, delayed-cash metrics (shared RuleF13302/RuleRegistry engine), and a BCVH Ranking default-date fix all implemented and PO PASS` |
| Runtime Status | `NOT APPLICABLE (no active ticket)` |
| PO UI Check Required | `No — no active ticket` |
| PO Product Status | `F13-ROUTE-RANKING-REDESIGN-IMPL PO PASS (ALL 12 ITEMS) / CLOSED` |
| Last Closed Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/F13-ROUTE-RANKING-REDESIGN-IMPL_MANIFEST.md` |
| Last Reviewed Phase | `F13-ROUTE-RANKING-REDESIGN-IMPL closure: Product Owner PO PASS on all 12 items` |
| Last Reviewed Commit | `43819b9272910fcaddb9c058c97913648b10654d` |
| Phase Review Status | `F13-ROUTE-RANKING-REDESIGN-IMPL CLOSED / PO PASS (ALL 12 ITEMS)` |
| Next Phase Authorization | `No ticket is authorized. Repository awaits explicit Product Owner direction before opening any next scope, including the Deferred items recorded in the closed manifest. Do not reopen F13-ROUTE-RANKING-REDESIGN-IMPL, F13-UI-AUDIT-PLAN, or AUTO-IMPORT-010 without explicit Product Owner authority.` |
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

Activation (`2026-08-03`): `F13-ROUTE-RANKING-REDESIGN-IMPL` is created and authorized for implementation, executor `Claude Code–Sonnet`, strictly within the checkpoint's locked scope and forbidden-inference list.

Closure (`2026-08-03`): `docs/10_TICKETS/F13-ROUTE-RANKING-REDESIGN-IMPL_MANIFEST.md` is `COMPLETED / PO PASS / CLOSED`. Product Owner confirmed final `PO PASS` on all 12 items: the Route Ranking redesign (default sort, full column set, 4-card KPI row, only-failed filter, two-column layout, no forbidden inference — Items 1, 3-9); the `BLACK` = `Chuyển hoàn` naming/meaning correction (Item 2); delayed-cash table columns and selected-route panel (Item 10), whose numbers were corrected twice as the eligible-denominator SSOT was first fixed locally then synced into the shared `RuleF13302`/`RuleRegistry` engine so BCVH Ranking and Route Ranking compute identically; the `BG CHẬM NỘP TIỀN` KPI widget bound to the backend aggregate (Item 11); and a BCVH Ranking default-date fix, so its date filter now resolves to the latest date with real data instead of a hardcoded stale date (Item 12, explicitly authorized as an in-scope BCVH Ranking fix for this ticket). Final implementation commit: `43819b9272910fcaddb9c058c97913648b10654d`. Deferred items (bưu tá mapping, root cause, Shipment drill-down runtime, date-range/trend) remain open, requiring separate future PO/CTO authorization; no next ticket was self-activated by this closure. Full detail: `docs/10_TICKETS/F13-ROUTE-RANKING-REDESIGN-IMPL_MANIFEST.md` Section 16 Closure and `docs/06_REVIEWS/Route/F13_ROUTE_RANKING_REDESIGN_PLAN_CHECKPOINT_001.md` Section 18.

Fresh-chat onboarding chain (no active ticket):

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. No Current Manifest — Current Ticket is `None`. Consult `Last Closed Manifest` (`F13-ROUTE-RANKING-REDESIGN-IMPL_MANIFEST.md`) for continuity only; do not treat it as active scope.
5. Await Product Owner direction before activating any next ticket.
