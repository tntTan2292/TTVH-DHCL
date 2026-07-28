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
| Current Phase | `F1.3 BCVH RANKING REDESIGN IMPLEMENTATION` |
| Current Ticket | `F13-BCVH-RANKING-REDESIGN-IMPL` |
| Next Ticket | `Pending implementation completion and PO review` |
| Last PO Status | `F13-BCVH-RANKING-REDESIGN-PLAN completed with Product Owner approval of the BCVH Ranking redesign scope; F13-INTERNAL-ROUTE-AUDIT completed with Product Owner PO PASS; approved Route Ranking outcome preserves exact labels Tuyen buu ta | Tat ca, default Tuyen buu ta, Hue-only route prefix 53, exclusion of 7 confirmed customer-pickup/internal post-office routes from postman route counts, Tat ca inclusion with classification Nhan tai buu cuc, and minimal runtime-backed Route Ranking table approval; F13-DATA-QUALITY-001 implementation deferred and manifest preserved; F13-SHIPMENT-001 implementation deferred and manifest preserved; DA-IMPL-008 completed with Product Owner PO PASS including Checkpoint 006; AUTO-IMPORT-009 completed with PO PASS at remote baseline 29e3a383a25c72a2dc9e5f2cc8667461803e78f6` |
| Current Branch | `codex/da-impl-006` |
| Current Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/F13-BCVH-RANKING-REDESIGN-IMPL_MANIFEST.md` |
| Current Checkpoint | `BCVH Ranking redesign planning approved and handed off to implementation` |
| Current State | `READY FOR IMPLEMENTATION` |
| Technical Status | `IMPLEMENTATION AUTHORIZED - NOT STARTED` |
| Runtime Status | `NOT RUN` |
| PO UI Check Required | `Yes - visible BCVH Ranking redesign` |
| PO Product Status | `F13-BCVH-RANKING-REDESIGN-PLAN COMPLETED / HANDOFF; F13-BCVH-RANKING-REDESIGN-IMPL IMPLEMENTATION COMPLETE / PO CHECK PENDING; F13-INTERNAL-ROUTE-AUDIT COMPLETED / PO PASS; F13-DATA-QUALITY-001 DEFERRED / PRESERVED; F13-SHIPMENT-001 DEFERRED / PRESERVED; DA-IMPL-008 COMPLETED / PO PASS; AUTO-IMPORT-009 COMPLETED / PO PASS` |
| Last Closed Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/F13-BCVH-RANKING-REDESIGN-PLAN_MANIFEST.md` |
| Last Reviewed Phase | `F1.3 BCVH RANKING REDESIGN PLANNING` |
| Last Reviewed Commit | `See latest verified remote branch HEAD` |
| Phase Review Status | `READY FOR IMPLEMENTATION` |
| Next Phase Authorization | `Implement the approved BCVH Ranking redesign within the new implementation manifest only` |
| Governance Version | `V2 Active` |
| Last Updated | `2026-07-28` |

## 3. Usage Rules

- Read this document immediately after `README_AI.md`.
- Treat this document as the single live project-state SSOT for Governance V2 Draft.
- Do not infer current state from chat history when this snapshot is available.
- Do not use this document to override SSOT, frozen docs, or PO decisions.
- Keep workflow behavior unchanged unless a dedicated governance change is approved.
- `Last Closed Manifest` must always be a concrete GitHub Blob URL pointing to the manifest of the most recently closed ticket when Current Ticket = None.
- `Last Closed Manifest` must not contain placeholder labels or descriptive text.
- `Last PO Status` represents the most recently recorded Product Owner status for the last closed ticket when Current Ticket = None.

## 4. Continuation Notes

This snapshot is intentionally narrow.

It exists to answer only the questions a fresh AI needs in order to continue:

- where the project is
- what ticket is active
- what comes next
- what branch is active
- what manifest governs the current reading scope

Current handoff: `F13-BCVH-RANKING-REDESIGN-PLAN` is `COMPLETED / HANDOFF` and the Product Owner approved the BCVH Ranking redesign scope. `F13-BCVH-RANKING-REDESIGN-IMPL` has completed both backend/runtime Wave 1 and frontend Wave 2, and is now `READY FOR PO CHECK`. Preserve the delivered grouped BCVH table, separate `D-1` and `D-7` blocks, delayed cash handover count, participating postman-route count, exact route quality distribution by Dashboard color bands including `pink`, Dashboard SSOT, semantic colors, existing business thresholds, and the `7` PO-confirmed non-postman/customer-pickup route exclusions from postman counts. `F13-INTERNAL-ROUTE-AUDIT` remains `COMPLETED / PO PASS`: Route Ranking uses exact filters `Tuyen buu ta | Tat ca`; default is `Tuyen buu ta`; the active page includes a minimal runtime-backed `Bang Tuyen Ranking`; confirmed non-postman/customer-pickup rows show `Nhan tai buu cuc`; Hue scope excludes route codes not starting with `53`. Product Owner deferred `F13-DATA-QUALITY-001` and `F13-SHIPMENT-001` implementation while preserving both manifests. Do not expand implementation beyond the active BCVH Ranking redesign manifest.

Historical note: `GOVERNANCE-PO-UI-SEPARATION` is completed and preserved for reference only.

Fresh-chat onboarding chain for the current proposed ticket:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. `docs/10_TICKETS/F13-BCVH-RANKING-REDESIGN-IMPL_MANIFEST.md`
5. Required Reading from the current manifest
