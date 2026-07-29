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
| Current Phase | `F1.3 UI AUDIT AND STANDARDIZATION PLANNING` |
| Current Ticket | `F13-UI-AUDIT-PLAN` |
| Next Ticket | `F13-UI-DASHBOARD-IMPL-PHASE3 (pending ChatGPT coordination dispatch prompt)` |
| Last PO Status | `Product Owner officially recorded PO PASS PHASE 1 REMEDIATION and PO PASS PHASE 2 – COMPACT BCVH TABLE UI/UX. Deferred finding recorded: Executive Insight Content Quality Review — DEFERRED / NOT AUTHORIZED under current UI/UX phases. Phase 3 implementation is not yet dispatched until ChatGPT coordination issues a separately bounded prompt` |
| Current Branch | `codex/da-impl-006` |
| Current Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/F13-UI-AUDIT-PLAN_MANIFEST.md` |
| Current Checkpoint | `F13-UI-AUDIT-PLAN Phase 1 Remediation & Phase 2 PO PASS recorded; ready for Phase 3 implementation dispatch` |
| Current State | `PHASE 1 & PHASE 2 PO PASS / READY FOR PHASE 3 DISPATCH` |
| Technical Status | `PHASE 1 & 2 IMPLEMENTED / PHASE 3 NOT YET DISPATCHED` |
| Runtime Status | `PHASE 1 & 2 VERIFIED PASS` |
| PO UI Check Required | `Yes - Phase 1 Remediation & Phase 2 PO PASS recorded` |
| PO Product Status | `PHASE 1 & PHASE 2 PO PASS` |
| Last Closed Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/QIS-LAN-DEPLOY-001_MANIFEST.md` |
| Last Reviewed Phase | `F13-UI-AUDIT-PLAN PHASE 1 REMEDIATION & PHASE 2 PO PASS` |
| Last Reviewed Commit | `cbe5bc2` |
| Phase Review Status | `PHASE 1 & PHASE 2 PO PASS / READY FOR PHASE 3 DISPATCH` |
| Next Phase Authorization | `Product Owner officially recorded PO PASS PHASE 1 REMEDIATION and PO PASS PHASE 2 – COMPACT BCVH TABLE UI/UX. Next step: ChatGPT coordination writes a separately bounded prompt for Phase 3 implementation (Charts, Patterns & Action Center Polish). Do not start UI implementation or dispatch Phase 3 until that prompt is issued.` |
| Governance Version | `V2 Active` |
| Last Updated | `2026-07-29` |

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

Current handoff: `F13-UI-AUDIT-PLAN` is `PHASE 1 & PHASE 2 PO PASS / READY FOR PHASE 3 DISPATCH`. Product Owner officially recorded `PO PASS PHASE 1 REMEDIATION` and `PO PASS PHASE 2 – COMPACT BCVH TABLE UI/UX.` Phase 1 Remediation (commit `cbe5bc2`) and Phase 2 (commit `dd9cbf5`) are verified PASS and accepted. Deferred finding recorded: Executive Insight Content Quality Review is DEFERRED / NOT AUTHORIZED under current UI/UX phases; visual presentation is accepted, while content generation/business logic remains preserved. Protected findings are maintained: 1) shared visual component styling (`GlobalFilterBar`) on BCVH Ranking is accepted for current visual treatment; future changes must validate both routes; 2) Operation Dashboard continues rendering compact 9-column `BcvhOperationTable`, while BCVH Ranking continues rendering detailed `UnifiedBcvhAnalysisTable`; tables must not be reconnected or replaced. Phase 3 and Phase 4 UI implementation is NOT started and implementation phases are NOT dispatched in this step. The next step is for ChatGPT coordination to issue a separately bounded prompt for Phase 3 implementation (Charts, Patterns & Action Center Polish).

Historical note: `QIS-LAN-DEPLOY-001` is completed, accepted, and closed.

Fresh-chat onboarding chain for the current active ticket:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. `docs/10_TICKETS/F13-UI-AUDIT-PLAN_MANIFEST.md`
5. Required Reading from the current manifest

