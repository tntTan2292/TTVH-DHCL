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
| Next Ticket | `F13-UI-DASHBOARD-IMPL-PHASE1 (pending ChatGPT coordination dispatch prompt)` |
| Last PO Status | `Product Owner recorded PO APPROVE UI/UX AUDIT AND STANDARDIZATION PLAN for Operation Dashboard UI/UX plan. UI implementation is not yet dispatched until ChatGPT coordination issues a separately bounded prompt` |
| Current Branch | `codex/da-impl-006` |
| Current Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/F13-UI-AUDIT-PLAN_MANIFEST.md` |
| Current Checkpoint | `F13-UI-AUDIT-PLAN approved by Product Owner; ready for phased implementation dispatch` |
| Current State | `PO APPROVED PLAN / READY FOR PHASED DISPATCH` |
| Technical Status | `APPROVED PLAN - IMPLEMENTATION NOT YET DISPATCHED` |
| Runtime Status | `NOT RUN - PLANNING ONLY` |
| PO UI Check Required | `No - planning review approved` |
| PO Product Status | `APPROVED PLAN` |
| Last Closed Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/QIS-LAN-DEPLOY-001_MANIFEST.md` |
| Last Reviewed Phase | `F13-UI-AUDIT-PLAN PO PLAN APPROVAL` |
| Last Reviewed Commit | `99c865e92b840a587dc9a889294c535fecc68816` |
| Phase Review Status | `PO APPROVED PLAN / READY FOR PHASED DISPATCH` |
| Next Phase Authorization | `Product Owner recorded PO APPROVE UI/UX AUDIT AND STANDARDIZATION PLAN. Next step: ChatGPT coordination writes a separately bounded prompt for Phase 1 implementation. Do not start UI implementation or dispatch Phase 1 until that prompt is issued.` |
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

Current handoff: `F13-UI-AUDIT-PLAN` is `PO APPROVED PLAN / READY FOR PHASED DISPATCH`. Product Owner officially recorded `PO APPROVE UI/UX AUDIT AND STANDARDIZATION PLAN.` The approved scope governs Operation Dashboard (`/f13/dashboard`) only, inspired by CRM 3.0 interface surfaces and control states, while preserving semantic colors, KPI labels, thresholds, formulas, target lines, and the compact 9-column BCVH table contract. UI implementation is NOT started and implementation phases are NOT dispatched in this step. The next step is for ChatGPT coordination to issue a separately bounded prompt for Phase 1 implementation (Filter Bar & Executive Command Belt).

Historical note: `QIS-LAN-DEPLOY-001` is completed, accepted, and closed.

Fresh-chat onboarding chain for the current active ticket:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. `docs/10_TICKETS/F13-UI-AUDIT-PLAN_MANIFEST.md`
5. Required Reading from the current manifest

